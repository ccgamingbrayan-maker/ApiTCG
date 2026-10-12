import { supabase } from '../config/supabase';

async function checkMissingCards() {
  const { data } = await supabase
    .from('cards')
    .select('id, card_number, name, set_code, rarity, image_url')
    .ilike('name', '%missing card%')
    .limit(30);

  console.log(`Found missing card samples: ${data?.length}`);
  data?.forEach(c => console.log(`${c.card_number} | ${c.name} | set: ${c.set_code} | img: ${c.image_url?.substring(0, 70)}`));
}

checkMissingCards();
