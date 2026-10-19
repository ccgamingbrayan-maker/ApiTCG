const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function searchSmart(query) {
  const cleanQ = query.trim();
  const words = cleanQ.split(/\s+/).filter(w => w.length > 0);
  if (words.length === 0) return [];

  // Step 1: Search by name / card_number
  let queryBuilder = supabase.from('cards').select('*');
  for (const w of words) {
    const lower = w.toLowerCase();
    if (lower === 'manga') {
      queryBuilder = queryBuilder.eq('rarity', 'MANGA');
    } else if (lower === 'sp' || lower === 'spr') {
      queryBuilder = queryBuilder.eq('rarity', 'SP');
    } else if (lower === 'lider' || lower === 'leader') {
      queryBuilder = queryBuilder.or('rarity.eq.L,rarity.eq.L-AA,name.ilike.%leader%');
    } else if (lower === 'aa' || lower === 'parallel') {
      queryBuilder = queryBuilder.or('rarity.ilike.%AA%,name.ilike.%parallel%,name.ilike.%alternate art%');
    } else if (/^(OP|ST|EB|PRB)\d{2}/i.test(w)) {
      queryBuilder = queryBuilder.or(`card_number.ilike.%${w}%,set_code.ilike.%${w}%`);
    } else {
      queryBuilder = queryBuilder.or(`name.ilike.%${w}%,card_number.ilike.%${w}%`);
    }
  }

  const { data: nameCards, error: err1 } = await queryBuilder.limit(200);
  if (!err1 && nameCards && nameCards.length > 0) {
    return nameCards;
  }

  // Step 2: Fallback to set_name search if no name/number matched (e.g. "Romance Dawn", "Two Legends")
  let setQueryBuilder = supabase.from('cards').select('*');
  for (const w of words) {
    const lower = w.toLowerCase();
    if (lower === 'manga') {
      setQueryBuilder = setQueryBuilder.eq('rarity', 'MANGA');
    } else if (lower === 'sp' || lower === 'spr') {
      setQueryBuilder = setQueryBuilder.eq('rarity', 'SP');
    } else {
      setQueryBuilder = setQueryBuilder.or(`set_name.ilike.%${w}%,set_code.ilike.%${w}%`);
    }
  }

  const { data: setCards } = await setQueryBuilder.limit(200);
  return setCards || [];
}

async function test() {
  console.log('Testing "zoro":');
  const zoroResults = await searchSmart('zoro');
  console.log('Found:', zoroResults.length, 'cards');
  const nonZoro = zoroResults.filter(c => !c.name.toLowerCase().includes('zoro') && !c.card_number.toLowerCase().includes('zoro'));
  console.log('Non-Zoro cards in results:', nonZoro.length);
  if (nonZoro.length > 0) console.log('Sample non-Zoro:', nonZoro.slice(0, 3));

  console.log('\nTesting "Romance Dawn":');
  const rdResults = await searchSmart('Romance Dawn');
  console.log('Found:', rdResults.length, 'cards for Romance Dawn');

  console.log('\nTesting "zoro st12":');
  const st12Zoro = await searchSmart('zoro st12');
  console.log('Found:', st12Zoro.length, 'cards for zoro st12:', st12Zoro.map(c => `${c.card_number}: ${c.name}`));
}

test();
