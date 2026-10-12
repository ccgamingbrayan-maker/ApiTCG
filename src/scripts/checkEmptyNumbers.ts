import { supabase } from '../config/supabase';

async function checkEmptyNumbers() {
  const { data } = await supabase.from('cards').select('id, card_number, name, set_code, rarity').or('card_number.is.null,card_number.eq.');
  console.log(`Cards with empty/null card_number: ${data?.length || 0}`);
  data?.slice(0, 15).forEach(c => console.log(`${c.id} | "${c.card_number}" | ${c.name} | ${c.set_code}`));
}

checkEmptyNumbers();
