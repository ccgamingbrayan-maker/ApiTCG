import { supabase } from '../config/supabase';

async function checkSpecialCases() {
  const { data: trCards } = await supabase
    .from('cards')
    .select('id, card_number, name, rarity, set_code')
    .or('rarity.eq.TR,name.ilike.%treasure%,name.ilike.%gold%,name.ilike.%oda%,name.ilike.%anniversary%');

  console.log(`Special/Treasure/Oda cards: ${trCards?.length || 0}`);
  trCards?.forEach(c => console.log(`${c.card_number} | ${c.name} | rarity: ${c.rarity}`));
}

checkSpecialCases();
