import { supabase } from '../config/supabase';

async function check() {
  const { count, error } = await supabase.from('cards').select('*', { count: 'exact', head: true });
  console.log('Total cards in DB:', count);
  if (error) {
    console.error('Error:', error);
    return;
  }

  // Get distinct card_number and sets
  const { data: allCards, error: errCards } = await supabase
    .from('cards')
    .select('card_number, set_code, rarity, name');
  
  if (errCards) {
    console.error('Error fetching cards:', errCards);
    return;
  }

  console.log('Total card rows fetched:', allCards?.length);

  const setCounts: Record<string, number> = {};
  const uniqueCardNumbers = new Set<string>();

  allCards?.forEach(c => {
    const sc = c.set_code || 'SIN_SET';
    setCounts[sc] = (setCounts[sc] || 0) + 1;
    if (c.card_number) {
      uniqueCardNumbers.add(c.card_number.trim().toUpperCase());
    }
  });

  console.log('Total unique card codes (OP01-001, etc.):', uniqueCardNumbers.size);
  console.log('Total sets:', Object.keys(setCounts).length);
  const sortedSets = Object.entries(setCounts).sort((a, b) => b[1] - a[1]);
  console.log('Sets distribution:', sortedSets);
}

check();
