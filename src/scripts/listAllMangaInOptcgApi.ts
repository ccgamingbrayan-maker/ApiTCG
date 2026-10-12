async function listAllMangaInOptcgApi() {
  const endpoints = [
    { name: 'Sets', url: 'https://www.optcgapi.com/api/allSetCards/' },
    { name: 'Starter Decks', url: 'https://www.optcgapi.com/api/allSTCards/' },
    { name: 'Promos', url: 'https://www.optcgapi.com/api/allPromos/' },
    { name: 'DON!!', url: 'https://www.optcgapi.com/api/allDonCards/' }
  ];

  const allCards = [];
  for (const ep of endpoints) {
    const res = await fetch(ep.url);
    const data = await res.json();
    allCards.push(...data);
  }

  const mangaCards = allCards.filter(c => 
    /\bmanga\b/i.test(c.card_name) || 
    /_manga/i.test(c.card_set_id || '') || 
    /_manga/i.test(c.card_image_id || '') ||
    /_sec-sp/i.test(c.card_image_id || '')
  );

  console.log(`Found ${mangaCards.length} Manga cards in OPTCGAPI:`);
  mangaCards.forEach((c, idx) => {
    console.log(`${idx + 1}. [${c.set_id}] ${c.card_set_id} (${c.card_image_id}) - "${c.card_name}"`);
    console.log(`   Image: ${c.card_image}`);
  });
}

listAllMangaInOptcgApi();
