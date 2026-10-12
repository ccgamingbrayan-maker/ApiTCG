import { supabase } from '../config/supabase';

async function testResolution() {
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

  console.log(`Loaded ${allCards.length} total cards from DB.`);

  // Build a base card map: clean card_number -> base card
  // For base cards, we prefer cards that are NOT marked as Parallel / Alternate Art / SP / Manga
  const baseCardMap = new Map<string, any>();
  
  // Sort so standard/base cards come first
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

      // Replace if current card is more "base" than existing
      if ((!isSpecial && existingIsSpecial) || (!existingHasValidRarity && hasValidRarity)) {
        baseCardMap.set(num, c);
      }
    }
  }

  console.log(`Base card map created with ${baseCardMap.size} unique card numbers.`);

  // Now classify all cards!
  let mangaCount = 0;
  let spCount = 0;
  let leaderAACount = 0;
  let secAACount = 0;
  let srAACount = 0;
  let rAACount = 0;
  let genericAACount = 0;
  let standardLeaders = 0;
  let standardOther = 0;
  let donCount = 0;

  const sampleClassifications: any[] = [];

  for (const c of allCards) {
    const name = c.name || '';
    const num = c.card_number || '';
    const setCode = c.set_code || '';
    const isDon = setCode === 'DON' || num.toLowerCase().startsWith('don') || name.toLowerCase().includes('don!');

    if (isDon) {
      donCount++;
      continue;
    }

    const isManga = /manga/i.test(name) || /_manga|_sec-sp/i.test(num) || /manga/i.test(c.image_url || '');
    const isSP = /\(sp\)|\(spr\)|sp card|special card/i.test(name) || /_sp/i.test(num) || /_sp/i.test(c.image_url || '');
    const isParallel = /parallel|alternate/i.test(name) || /_p\d*$/i.test(num) || /_p\d*\.png/i.test(c.image_url || '');

    // Check base card info
    const baseCard = baseCardMap.get(num);
    const baseRarity = (baseCard && baseCard.rarity && baseCard.rarity !== 'N/A') ? baseCard.rarity : (c.rarity !== 'N/A' ? c.rarity : '');
    const isLeader = baseRarity === 'L' || /leader/i.test(name) || (baseCard && /leader/i.test(baseCard.name));

    let newRarity = c.rarity;

    if (isManga) {
      newRarity = 'MANGA';
      mangaCount++;
    } else if (isSP) {
      newRarity = 'SP';
      spCount++;
    } else if (isLeader && isParallel) {
      newRarity = 'L-AA';
      leaderAACount++;
    } else if (isParallel) {
      if (baseRarity === 'SEC') {
        newRarity = 'SEC-AA';
        secAACount++;
      } else if (baseRarity === 'SR') {
        newRarity = 'SR-AA';
        srAACount++;
      } else if (baseRarity === 'R') {
        newRarity = 'R-AA';
        rAACount++;
      } else {
        newRarity = 'AA';
        genericAACount++;
      }
    } else if (isLeader) {
      newRarity = 'L';
      standardLeaders++;
    } else {
      standardOther++;
    }

    if (sampleClassifications.length < 15 && (isManga || isSP || (isLeader && isParallel))) {
      sampleClassifications.push({
        num,
        name: name.substring(0, 40),
        oldRarity: c.rarity,
        baseRarity,
        newRarity
      });
    }
  }

  console.log('\n--- CLASSIFICATION RESULTS ---');
  console.log('MANGA:', mangaCount);
  console.log('SP (Special Rare):', spCount);
  console.log('L-AA (Líderes AA):', leaderAACount);
  console.log('SEC-AA:', secAACount);
  console.log('SR-AA:', srAACount);
  console.log('R-AA:', rAACount);
  console.log('AA (Other Alternate Art):', genericAACount);
  console.log('Standard Leaders (L):', standardLeaders);
  console.log('Standard Regular cards:', standardOther);
  console.log('DON cards:', donCount);
  console.log('\nSamples:');
  console.table(sampleClassifications);
}

testResolution();
