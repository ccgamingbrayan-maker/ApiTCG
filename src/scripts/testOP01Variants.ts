import { classifyCardRarity } from '../utils/rarityUtils';

async function testOP01Variants() {
  const res = await fetch('https://www.optcgapi.com/api/allSetCards/');
  const allCards = await res.json();

  const op01 = allCards.filter((c: any) => c.set_id === 'OP-01' || (c.card_set_id && c.card_set_id.startsWith('OP01-')));
  console.log('Total cards in OP-01 on OPTCGAPI:', op01.length);

  // Group by card_set_id
  const byCode = new Map<string, any[]>();
  for (const c of op01) {
    const code = c.card_set_id;
    if (!byCode.has(code)) byCode.set(code, []);
    byCode.get(code)!.push(c);
  }

  console.log('Unique card numbers in OP-01:', byCode.size);

  let variantCount = 0;
  byCode.forEach((list, code) => {
    if (list.length > 1) {
      variantCount += list.length;
    }
  });
  console.log(`Variants across OP-01: ${variantCount} cards in ${Array.from(byCode.values()).filter(l => l.length > 1).length} multi-version cards`);

  // Show Shanks and Zoro
  console.log('\nShanks in OP-01:');
  byCode.get('OP01-120')?.forEach(c => {
    const r = classifyCardRarity({ name: c.card_name, card_number: c.card_set_id, set_code: 'OP-01', rarity: c.rarity, image_url: c.card_image });
    console.log(` - ${c.card_image_id} | ${c.card_name} | rarity: ${r} | ${c.card_image}`);
  });

  console.log('\nZoro Leader in OP-01:');
  byCode.get('OP01-001')?.forEach(c => {
    const r = classifyCardRarity({ name: c.card_name, card_number: c.card_set_id, set_code: 'OP-01', rarity: c.rarity, image_url: c.card_image });
    console.log(` - ${c.card_image_id} | ${c.card_name} | rarity: ${r} | ${c.card_image}`);
  });

  console.log('\nNami in OP-01:');
  byCode.get('OP01-016')?.forEach(c => {
    const r = classifyCardRarity({ name: c.card_name, card_number: c.card_set_id, set_code: 'OP-01', rarity: c.rarity, image_url: c.card_image });
    console.log(` - ${c.card_image_id} | ${c.card_name} | rarity: ${r} | ${c.card_image}`);
  });
}

testOP01Variants();
