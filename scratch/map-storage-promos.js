const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function listAllStoragePromos() {
  let allFiles = [];
  let page = 0;
  const pageSize = 100;
  
  while (true) {
    const { data, error } = await supabase.storage.from('cards').list('', {
      limit: pageSize,
      offset: page * pageSize,
      sortBy: { column: 'name', order: 'asc' }
    });
    if (error || !data || data.length === 0) break;
    allFiles.push(...data);
    if (data.length < pageSize) break;
    page++;
  }

  const pFiles = allFiles.filter(f => f.name.toUpperCase().startsWith('P-') && !f.name.includes('_small'));
  console.log('Total full-size P- files in Supabase storage:', pFiles.length);

  const promoMap = new Map();
  pFiles.forEach(f => {
    const code = f.name.split('.')[0].toUpperCase();
    promoMap.set(code, f.name);
  });

  console.log('Total unique P- codes in storage:', promoMap.size);
  console.log('Sample mappings:');
  Array.from(promoMap.entries()).slice(0, 15).forEach(([code, filename]) => {
    console.log(`  ${code} => ${filename}`);
  });

  return promoMap;
}
listAllStoragePromos();
