import { supabase } from '../config/supabase';

export function classifyCardRarity(
  card: { name?: string; card_number?: string; set_code?: string; rarity?: string; image_url?: string },
  baseCard?: { rarity?: string; name?: string }
): string {
  const name = (card.name || '').trim();
  const num = (card.card_number || '').trim();
  const setCode = (card.set_code || '').trim().toUpperCase();
  const img = (card.image_url || '').toLowerCase();
  const rawRarity = (card.rarity || '').trim();

  // 1. DON!! cards
  if (
    setCode === 'DON' ||
    num.toLowerCase().startsWith('don') ||
    name.toLowerCase().includes('don!!') ||
    name.toLowerCase().includes('don!')
  ) {
    return 'DON';
  }

  // 2. MANGA Rare (Super Parallel)
  if (
    /\bmanga\b|\(manga\)|super parallel/i.test(name) ||
    /_manga/i.test(num) ||
    /_manga/i.test(img)
  ) {
    return 'MANGA';
  }

  // 3. SP (Special Rare / SPR)
  if (
    /\(sp\)|\(spr\)|sp card|special card|\(wanted\)/i.test(name) ||
    /_sp\b|_sp_|_sp\./i.test(num) ||
    /_sp\./i.test(img) ||
    rawRarity === 'SP' ||
    rawRarity === 'SPR'
  ) {
    return 'SP';
  }

  // 4. TR (Treasure Rare)
  if (rawRarity === 'TR' || /\(tr\)/i.test(name)) {
    return 'TR';
  }

  // Determine if it's Parallel / Alternate Art
  const isParallel =
    /parallel|alternate art|\(aa\)/i.test(name) ||
    /_p\d*(_|\.|$)/i.test(num) ||
    /_p\d*\./i.test(img);

  // Determine base rarity
  let baseRarity = '';
  if (baseCard && baseCard.rarity && baseCard.rarity !== 'N/A' && baseCard.rarity !== 'NULL') {
    baseRarity = baseCard.rarity.toUpperCase();
  } else if (rawRarity && rawRarity !== 'N/A' && rawRarity !== 'NULL') {
    baseRarity = rawRarity.toUpperCase();
  }

  // Determine if card is a Leader
  const isLeader =
    baseRarity === 'L' ||
    rawRarity === 'L' ||
    /\bleader\b/i.test(name) ||
    (baseCard && /\bleader\b/i.test(baseCard.name || ''));

  // 5. Líderes AA (Leader Alternate Art / Parallel)
  if (isLeader && isParallel) {
    return 'L-AA';
  }

  // 6. Regular Leader
  if (isLeader && !isParallel) {
    return 'L';
  }

  // 7. Alternate Art depending on base rarity
  if (isParallel) {
    if (baseRarity === 'SEC' || baseRarity.startsWith('SEC')) return 'SEC-AA';
    if (baseRarity === 'SR' || baseRarity.startsWith('SR')) return 'SR-AA';
    if (baseRarity === 'R' || baseRarity.startsWith('R')) return 'R-AA';
    return 'AA';
  }

  // 8. Base card rarity fallback
  if (baseRarity && baseRarity !== 'N/A') {
    return baseRarity;
  }

  // 9. Promo fallback
  if (setCode === 'PROMO' || num.toUpperCase().startsWith('P-')) {
    return 'P';
  }

  if (rawRarity && rawRarity !== 'N/A' && rawRarity !== 'NULL') {
    return rawRarity;
  }

  return 'C'; // Default common if completely unknown
}

async function run() {
  console.log('--- Testing classifyCardRarity on all cards ---');
  let allCards: any[] = [];
  let page = 0;
  while (true) {
    const { data } = await supabase
      .from('cards')
      .select('id, card_number, name, rarity, set_code, image_url')
      .range(page * 1000, (page + 1) * 1000 - 1);
    if (!data || data.length === 0) break;
    allCards = allCards.concat(data);
    page++;
  }

  console.log(`Fetched ${allCards.length} cards.`);

  // Build clean baseCardMap
  const baseCardMap = new Map<string, any>();
  for (const c of allCards) {
    const num = (c.card_number || '').trim();
    if (!num) continue;
    const isSpecial = /parallel|alternate|\(sp\)|\(spr\)|manga/i.test(c.name);
    const hasValidRarity = c.rarity && c.rarity !== 'N/A' && c.rarity !== 'NULL';

    if (!baseCardMap.has(num)) {
      baseCardMap.set(num, c);
    } else {
      const existing = baseCardMap.get(num);
      const existingIsSpecial = /parallel|alternate|\(sp\)|\(spr\)|manga/i.test(existing.name);
      const existingHasValidRarity = existing.rarity && existing.rarity !== 'N/A' && existing.rarity !== 'NULL';

      if ((!isSpecial && existingIsSpecial) || (!existingHasValidRarity && hasValidRarity)) {
        baseCardMap.set(num, c);
      }
    }
  }

  const counts: Record<string, number> = {};
  const changedList: { num: string; name: string; oldR: string; newR: string }[] = [];

  for (const c of allCards) {
    const baseCard = baseCardMap.get(c.card_number);
    const newRarity = classifyCardRarity(c, baseCard);
    counts[newRarity] = (counts[newRarity] || 0) + 1;

    if (newRarity !== c.rarity) {
      changedList.push({
        num: c.card_number,
        name: c.name.substring(0, 35),
        oldR: c.rarity,
        newR: newRarity
      });
    }
  }

  console.log('\n--- NEW RARITY DISTRIBUTION ---');
  console.table(counts);

  console.log(`\nCards whose rarity will be updated: ${changedList.length}`);
  console.log('Sample updates:');
  console.table(changedList.slice(0, 25));
}

run();
