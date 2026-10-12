import { supabase } from '../config/supabase';
import fs from 'fs';
import path from 'path';

async function check() {
  const { data: mangaCards, error } = await supabase
    .from('cards')
    .select('id, card_number, name, rarity, image_url, set_code')
    .eq('rarity', 'MANGA');

  if (error) {
    console.error('Error fetching cards:', error);
    return;
  }

  console.log(`Found ${mangaCards?.length} MANGA cards in Supabase:`);

  let existsLocally = 0;
  let missingLocally = 0;
  let supabaseStorage = 0;
  let externalUrl = 0;

  for (const c of mangaCards || []) {
    const img = c.image_url || '';
    let status = '';

    if (img.startsWith('/images/cards/')) {
      const filename = path.basename(img);
      const localPath = path.join(__dirname, '../../public/images/cards', filename);
      const exists = fs.existsSync(localPath);
      if (exists) {
        existsLocally++;
        const stats = fs.statSync(localPath);
        status = `LOCAL EXISTS (${stats.size} bytes)`;
      } else {
        missingLocally++;
        status = `LOCAL MISSING FILE: ${localPath}`;
      }
    } else if (img.includes('supabase.co')) {
      supabaseStorage++;
      status = `SUPABASE STORAGE`;
    } else {
      externalUrl++;
      status = `EXTERNAL URL`;
    }

    console.log(`- [${c.set_code}] ${c.card_number} | ${c.name}`);
    console.log(`    img: ${img} -> ${status}`);
  }

  console.log('\n--- Summary ---');
  console.log(`Total: ${mangaCards?.length}`);
  console.log(`Local exists: ${existsLocally}`);
  console.log(`Local missing: ${missingLocally}`);
  console.log(`Supabase storage: ${supabaseStorage}`);
  console.log(`External URL: ${externalUrl}`);
}

check();
