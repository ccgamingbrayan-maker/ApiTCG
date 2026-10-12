async function checkOptcgApi() {
  const res = await fetch('https://www.optcgapi.com/api/allSetCards/');
  const all = await res.json();
  console.log('Total cards in allSetCards:', all.length);

  const shanks = all.filter((c: any) => (c.card_set_id || c.card_image_id || '').includes('OP01-120'));
  console.log('\n--- SHANKS OP01-120 in optcgapi ---');
  shanks.forEach((c: any) => {
    console.log({
      set_id: c.set_id,
      card_name: c.card_name,
      card_set_id: c.card_set_id,
      card_image_id: c.card_image_id,
      rarity: c.rarity,
      card_image: c.card_image
    });
  });

  const zoro001 = all.filter((c: any) => (c.card_set_id || c.card_image_id || '').includes('OP01-001'));
  console.log('\n--- ZORO OP01-001 in optcgapi ---');
  zoro001.forEach((c: any) => {
    console.log({
      set_id: c.set_id,
      card_name: c.card_name,
      card_set_id: c.card_set_id,
      card_image_id: c.card_image_id,
      rarity: c.rarity,
      card_image: c.card_image
    });
  });

  const luffy060 = all.filter((c: any) => (c.card_set_id || c.card_image_id || '').includes('OP05-060'));
  console.log('\n--- LUFFY OP05-060 in optcgapi ---');
  luffy060.forEach((c: any) => {
    console.log({
      set_id: c.set_id,
      card_name: c.card_name,
      card_set_id: c.card_set_id,
      card_image_id: c.card_image_id,
      rarity: c.rarity,
      card_image: c.card_image
    });
  });
}

checkOptcgApi();
