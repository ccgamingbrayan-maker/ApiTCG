require('dotenv').config();
const { searchCards } = require('../dist/services/cardService');

async function verifyAll() {
  console.log('--- 1. Testing Search "zoro" ---');
  const zoroCards = await searchCards('zoro');
  console.log(`Found ${zoroCards.length} Zoro cards.`);
  const nonZoro = zoroCards.filter(c => 
    !c.name.toLowerCase().includes('zoro') && 
    !c.card_number.toLowerCase().includes('zoro')
  );
  console.log(`Non-Zoro cards found: ${nonZoro.length}`);
  if (nonZoro.length > 0) {
    console.error('FAIL: Found non-Zoro cards:', nonZoro.map(c => `${c.card_number}: ${c.name}`));
  } else {
    console.log('PASS: 100% of cards returned are genuine Zoro cards!');
  }

  console.log('\n--- 2. Checking Zoro Promo Images ---');
  const promoZoros = zoroCards.filter(c => c.card_number?.startsWith('P-'));
  console.log(`Found ${promoZoros.length} Zoro promo cards.`);
  let failedImages = 0;
  for (const card of promoZoros) {
    try {
      const res = await fetch(card.image_url);
      if (res.status === 200) {
        console.log(` [200 OK] ${card.card_number} -> ${card.name.slice(0, 45)}...`);
      } else {
        console.error(` [${res.status} FAIL] ${card.card_number} -> ${card.image_url}`);
        failedImages++;
      }
    } catch (e) {
      console.error(` [ERROR] ${card.card_number}: ${e.message}`);
      failedImages++;
    }
  }

  if (failedImages === 0) {
    console.log('\nPASS: All Zoro promo images returned HTTP 200 OK!');
  } else {
    console.error(`\nFAIL: ${failedImages} Zoro promo images failed!`);
  }

  console.log('\n--- 3. Testing Search "sanji" ---');
  const sanjiCards = await searchCards('sanji');
  console.log(`Found ${sanjiCards.length} Sanji cards.`);
  const nonSanji = sanjiCards.filter(c => 
    !c.name.toLowerCase().includes('sanji') && 
    !c.card_number.toLowerCase().includes('sanji')
  );
  console.log(`Non-Sanji cards found: ${nonSanji.length}`);

  console.log('\n--- 4. Testing Search "bonney" ---');
  const bonneyCards = await searchCards('bonney');
  console.log(`Found ${bonneyCards.length} Bonney cards.`);
}

verifyAll();
