import { supabase } from '../config/supabase';

async function check() {
  let allCards: any[] = [];
  let page = 0;
  while (true) {
    const { data, error } = await supabase
      .from('cards')
      .select('id, name, card_number, rarity, set_code, image_url')
      .range(page * 1000, (page + 1) * 1000 - 1);
    if (error) {
      console.error(error);
      break;
    }
    if (!data || data.length === 0) break;
    allCards = allCards.concat(data);
    page++;
  }

  console.log('Total cards fetched:', allCards.length);

  const rarityCounts: Record<string, number> = {};
  for (const c of allCards) {
    const r = c.rarity || 'NULL';
    rarityCounts[r] = (rarityCounts[r] || 0) + 1;
  }
  console.log('Current Rarities in DB:', rarityCounts);

  const mangaCards = allCards.filter(c => /manga/i.test(c.name) || /_manga|_sec-sp/i.test(c.card_number));
  const spCards = allCards.filter(c => /\(sp\)|\(spr\)|special/i.test(c.name) || /_sp/i.test(c.card_number));
  const leaderCards = allCards.filter(c => 
    (c.rarity === 'L' || /leader/i.test(c.name)) && 
    (/parallel|alternate/i.test(c.name) || /_p\d*$/i.test(c.card_number))
  );
  const aaCards = allCards.filter(c => 
    (/parallel|alternate/i.test(c.name) || /_p\d*$/i.test(c.card_number)) &&
    !mangaCards.includes(c) && !spCards.includes(c) && !leaderCards.includes(c)
  );

  console.log('Manga cards:', mangaCards.length);
  console.log('SP cards:', spCards.length);
  console.log('Leader AA cards:', leaderCards.length);
  console.log('Other AA/Parallel cards:', aaCards.length);

  console.log('\nSamples:');
  console.log('Manga sample:', mangaCards.slice(0, 3).map(c => ({ id: c.id, num: c.card_number, name: c.name, current_rarity: c.rarity })));
  console.log('SP sample:', spCards.slice(0, 3).map(c => ({ id: c.id, num: c.card_number, name: c.name, current_rarity: c.rarity })));
  console.log('Leader AA sample:', leaderCards.slice(0, 3).map(c => ({ id: c.id, num: c.card_number, name: c.name, current_rarity: c.rarity })));
  console.log('AA sample:', aaCards.slice(0, 3).map(c => ({ id: c.id, num: c.card_number, name: c.name, current_rarity: c.rarity })));
}

check();
