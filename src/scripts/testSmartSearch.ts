import { supabase } from '../config/supabase';

async function search(q: string) {
  const parts = q.toLowerCase().split(/\s+/).filter(Boolean);
  let query = supabase.from('cards').select('id, card_number, name, rarity, set_code, image_url, tcgplayer_url');
  
  for (const p of parts) {
    if (p === 'manga') query = query.eq('rarity', 'MANGA');
    else if (p === 'sp') query = query.eq('rarity', 'SP');
    else if (p === 'lider' || p === 'leader') query = query.ilike('rarity', 'L%');
    else if (p === 'aa') query = query.ilike('rarity', '%AA%');
    else query = query.or(`name.ilike.%${p}%,card_number.ilike.%${p}%,set_name.ilike.%${p}%`);
  }
  
  const { data } = await query.limit(5);
  return data;
}

async function test() {
  console.log('--- uta manga ---');
  console.log(await search('uta manga'));

  console.log('\n--- zoro lider ---');
  console.log(await search('zoro lider'));

  console.log('\n--- lucci sp ---');
  console.log(await search('lucci sp'));

  console.log('\n--- shanks manga ---');
  console.log(await search('shanks manga'));
}

test();
