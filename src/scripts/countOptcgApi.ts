const ENDPOINTS = [
  { name: 'Sets', url: 'https://www.optcgapi.com/api/allSetCards/' },
  { name: 'Starter Decks', url: 'https://www.optcgapi.com/api/allSTCards/' },
  { name: 'Promos', url: 'https://www.optcgapi.com/api/allPromoCards/' },
  { name: 'DON!!', url: 'https://www.optcgapi.com/api/allDonCards/' }
];

async function countOptcgApi() {
  let totalCards = 0;
  for (const ep of ENDPOINTS) {
    const res = await fetch(ep.url);
    const data = await res.json();
    console.log(`${ep.name}: ${data.length} cards`);
    totalCards += data.length;

    // Check unique card_image_id
    const imageIds = new Set(data.map((c: any) => c.card_image_id));
    console.log(`  Unique card_image_id: ${imageIds.size}`);
  }
  console.log(`Total across all endpoints: ${totalCards}`);
}

countOptcgApi();
