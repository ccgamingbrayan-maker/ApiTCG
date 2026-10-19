const fs = require('fs');
const map = require('./promo-storage-map.json');

const content = `// Auto-generated promo storage mapping for One Piece TCG promos
export const PROMO_STORAGE_MAP: Record<string, string> = ${JSON.stringify(map, null, 2)};

export function getPromoStorageUrl(code: string): string {
  const clean = (code || '').trim().toUpperCase();
  const baseCodeMatch = clean.match(/^([A-Z0-9]+-[A-Z0-9]+)/i);
  const baseCode = baseCodeMatch ? baseCodeMatch[1].toUpperCase() : clean.split('_')[0].toUpperCase();

  // 1. Direct file in map
  if (PROMO_STORAGE_MAP[clean]) {
    return \`https://epuskceyfpbdljmwvcca.supabase.co/storage/v1/object/public/cards/\${PROMO_STORAGE_MAP[clean]}\`;
  }

  // 2. Base code in map
  if (PROMO_STORAGE_MAP[baseCode]) {
    return \`https://epuskceyfpbdljmwvcca.supabase.co/storage/v1/object/public/cards/\${PROMO_STORAGE_MAP[baseCode]}\`;
  }

  // 3. Number-based heuristic: P-001 through P-080 are .png in Supabase storage, P-081+ are .jpg
  const numMatch = baseCode.match(/^P-(\\d+)/i);
  if (numMatch) {
    const num = parseInt(numMatch[1], 10);
    const ext = num <= 80 ? 'png' : 'jpg';
    return \`https://epuskceyfpbdljmwvcca.supabase.co/storage/v1/object/public/cards/\${baseCode}.\${ext}\`;
  }

  return \`https://epuskceyfpbdljmwvcca.supabase.co/storage/v1/object/public/cards/\${baseCode}.png\`;
}
`;

fs.writeFileSync('src/utils/promoMap.ts', content, 'utf-8');
console.log('Successfully generated src/utils/promoMap.ts');
