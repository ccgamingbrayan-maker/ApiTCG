/**
 * Utility functions for One Piece TCG rarity classification and styling.
 */

export function classifyCardRarity(
  card: { name?: string; card_number?: string; set_code?: string; rarity?: string; image_url?: string },
  baseCard?: { rarity?: string; name?: string }
): string {
  const name = (card.name || '').trim();
  const num = (card.card_number || '').trim();
  const setCode = (card.set_code || '').trim().toUpperCase();
  const img = (card.image_url || '').toLowerCase();
  const rawRarity = (card.rarity || '').trim();

  // 1. Cartas DON!!
  if (
    setCode === 'DON' ||
    num.toLowerCase().startsWith('don') ||
    name.toLowerCase().includes('don!!') ||
    name.toLowerCase().includes('don!')
  ) {
    return 'DON';
  }

  // 2. MANGA Rare (Super Parallel / Manga)
  if (
    /\bmanga\b|\(manga\)|super parallel/i.test(name) ||
    /_manga/i.test(num) ||
    /_manga/i.test(img)
  ) {
    return 'MANGA';
  }

  // 3. SP (Special Rare / SPR / Wanted Poster)
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

  // Detectar si es versión Alternate Art / Parallel
  const isParallel =
    /parallel|alternate art|\(aa\)/i.test(name) ||
    /_p\d*(_|\.|$)/i.test(num) ||
    /_p\d*\./i.test(img);

  // Determinar rareza base del diseño original
  let baseRarity = '';
  if (baseCard && baseCard.rarity && baseCard.rarity !== 'N/A' && baseCard.rarity !== 'NULL') {
    baseRarity = baseCard.rarity.toUpperCase();
  } else if (rawRarity && rawRarity !== 'N/A' && rawRarity !== 'NULL') {
    baseRarity = rawRarity.toUpperCase();
  }

  // Detectar si la carta es un Líder
  const isLeader =
    baseRarity === 'L' ||
    rawRarity === 'L' ||
    /\bleader\b/i.test(name) ||
    (baseCard && /\bleader\b/i.test(baseCard.name || ''));

  // 5. Líderes Alternate Art (L-AA)
  if (isLeader && isParallel) {
    return 'L-AA';
  }

  // 6. Líder Estándar
  if (isLeader && !isParallel) {
    return 'L';
  }

  // 7. Alternate Art diferenciado por su rareza base
  if (isParallel) {
    if (baseRarity === 'SEC' || baseRarity.startsWith('SEC')) return 'SEC-AA';
    if (baseRarity === 'SR' || baseRarity.startsWith('SR')) return 'SR-AA';
    if (baseRarity === 'R' || baseRarity.startsWith('R')) return 'R-AA';
    return 'AA';
  }

  // 8. Si no es parallel, usar rareza base si está disponible
  if (baseRarity && baseRarity !== 'N/A') {
    return baseRarity;
  }

  // 9. Promocionales
  if (setCode === 'PROMO' || num.toUpperCase().startsWith('P-')) {
    return 'P';
  }

  if (rawRarity && rawRarity !== 'N/A' && rawRarity !== 'NULL') {
    return rawRarity;
  }

  return 'C';
}
