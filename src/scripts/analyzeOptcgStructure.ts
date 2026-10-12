async function analyzeOptcgStructure() {
  const res = await fetch('https://www.optcgapi.com/api/allSetCards/');
  const cards = await res.json();
  console.log('Total cards in allSetCards:', cards.length);

  // Group by card_set_id
  const bySetId = new Map<string, any[]>();
  for (const c of cards) {
    const setId = c.card_set_id;
    if (!bySetId.has(setId)) bySetId.set(setId, []);
    bySetId.get(setId)!.push(c);
  }

  console.log('Unique base card numbers (card_set_id):', bySetId.size);
  let multiVersionCount = 0;
  for (const [id, list] of bySetId.entries()) {
    if (list.length > 1) {
      multiVersionCount++;
    }
  }
  console.log(`Cards that have multiple versions (Base, Parallel, Manga, etc.): ${multiVersionCount}`);

  // Show examples with 3+ versions
  const topMulti = Array.from(bySetId.entries())
    .filter(([_, list]) => list.length >= 3)
    .slice(0, 5);

  for (const [id, list] of topMulti) {
    console.log(`\nCard: ${id} (${list.length} versions):`);
    list.forEach(c => {
      console.log(`  - name: "${c.card_name}" | img_id: "${c.card_image_id}" | img_url: "${c.card_image}"`);
    });
  }
}

analyzeOptcgStructure();
