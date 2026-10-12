async function checkPromos() {
  const res = await fetch('https://www.optcgapi.com/api/allPromoCards/');
  if (!res.ok) return;
  const cards = await res.json();
  console.log('Total promo cards from optcgapi:', cards.length);
  const p004 = cards.find((c: any) => c.card_set_id === 'P-004' || c.card_image_id === 'P-004');
  console.log('P-004 in optcgapi:', p004);
}
checkPromos();
