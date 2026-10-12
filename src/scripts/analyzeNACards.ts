import { supabase } from '../config/supabase';

async function run() {
  const { data, error } = await supabase
    .from('cards')
    .select('id, card_number, name, rarity, set_code, image_url')
    .eq('rarity', 'N/A')
    .limit(30);

  if (error) {
    console.error(error);
    return;
  }

  console.log(`Found ${data.length} sample N/A cards:`);
  for (const c of data) {
    console.log(`- ${c.card_number} | ${c.name} | set: ${c.set_code} | img: ${c.image_url?.substring(0, 60)}...`);
  }

  // Count pattern types among all N/A
  let allNA: any[] = [];
  let page = 0;
  while (true) {
    const { data: batch } = await supabase
      .from('cards')
      .select('id, card_number, name, rarity, set_code')
      .eq('rarity', 'N/A')
      .range(page * 1000, (page + 1) * 1000 - 1);
    if (!batch || batch.length === 0) break;
    allNA = allNA.concat(batch);
    page++;
  }

  console.log(`\nTotal N/A cards: ${allNA.length}`);
  const hasP = allNA.filter(c => /_p/i.test(c.card_number));
  const hasSP = allNA.filter(c => /_sp/i.test(c.card_number));
  const hasManga = allNA.filter(c => /_manga/i.test(c.card_number));
  const hasParallelInName = allNA.filter(c => /parallel|alternate/i.test(c.name));
  const hasMissingInName = allNA.filter(c => /missing card/i.test(c.name));

  console.log(`With _p in number: ${hasP.length}`);
  console.log(`With _sp in number: ${hasSP.length}`);
  console.log(`With _manga in number: ${hasManga.length}`);
  console.log(`With Parallel/Alternate in name: ${hasParallelInName.length}`);
  console.log(`With 'Missing Card' in name: ${hasMissingInName.length}`);
}

run();
