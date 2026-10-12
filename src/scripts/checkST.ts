import { supabase } from '../config/supabase';

async function checkST() {
  const { data } = await supabase.from('cards').select('id, card_number, name').ilike('card_number', 'ST21-%');
  console.log(`ST21 cards in DB: ${data?.length || 0}`);
  data?.slice(0, 10).forEach(c => console.log(`${c.card_number} | ${c.name}`));
}

checkST();
