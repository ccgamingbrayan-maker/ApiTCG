async function testRealImageUrls() {
  const res = await fetch('https://www.optcgapi.com/api/allSetCards/');
  const cards = await res.json();

  const testList = [
    'OP01-120', // Shanks (Base, Parallel, Manga)
    'OP01-035', // Okiku (Base, SP)
    'OP06-001', // Uta (Base, SPR)
    'OP05-069', // Law (Base, Parallel, Manga)
    'OP02-013', // Ace (Base, Parallel, Manga)
    'OP01-001', // Zoro Leader (Base, Leader AA)
    'OP01-016', // Nami (Base, Parallel, SP, Manga)
  ];

  for (const code of testList) {
    const matches = cards.filter((c: any) => c.card_set_id === code);
    console.log(`\n================= ${code} =================`);
    for (const m of matches) {
      console.log(`- name: "${m.card_name}"`);
      console.log(`  img_id: "${m.card_image_id}"`);
      console.log(`  img_url: "${m.card_image}"`);
      // Check if image URL returns 200
      try {
        const head = await fetch(m.card_image, { method: 'HEAD' });
        console.log(`  status: ${head.status}`);
      } catch (err: any) {
        console.log(`  fetch error: ${err.message}`);
      }
    }
  }
}

testRealImageUrls();
