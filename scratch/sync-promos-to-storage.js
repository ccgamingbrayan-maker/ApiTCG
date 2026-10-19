const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function syncPromoImages() {
  const dir = path.join(process.cwd(), 'public/images/cards');
  const files = fs.readdirSync(dir).filter(f => f.startsWith('P-'));
  console.log(`Found ${files.length} local promo files to upload...`);

  let uploaded = 0;
  let errors = 0;

  // Upload in concurrent batches of 10
  const BATCH_SIZE = 10;
  for (let i = 0; i < files.length; i += BATCH_SIZE) {
    const batch = files.slice(i, i + BATCH_SIZE);
    await Promise.all(batch.map(async (filename) => {
      try {
        const filePath = path.join(dir, filename);
        const buffer = fs.readFileSync(filePath);
        const ext = path.extname(filename).toLowerCase();
        const contentType = ext === '.png' ? 'image/png' : 'image/jpeg';

        const { error } = await supabase.storage.from('cards').upload(filename, buffer, {
          contentType,
          upsert: true
        });

        if (error) {
          console.error(`Error uploading ${filename}:`, error.message);
          errors++;
        } else {
          uploaded++;
        }
      } catch (e) {
        console.error(`Exception uploading ${filename}:`, e.message);
        errors++;
      }
    }));
    if ((i + BATCH_SIZE) % 50 === 0 || i + BATCH_SIZE >= files.length) {
      console.log(`Progress: ${Math.min(i + BATCH_SIZE, files.length)} / ${files.length} (uploaded: ${uploaded}, errors: ${errors})`);
    }
  }

  console.log(`\nUpload complete! Uploaded: ${uploaded}, Errors: ${errors}`);

  // Now, update cards table where image_url is /images/cards/P-xxx
  console.log('\nUpdating cards table in Supabase...');
  const { data: cards, error: fetchErr } = await supabase
    .from('cards')
    .select('id, card_number, image_url')
    .ilike('card_number', 'P-%');

  if (fetchErr) {
    console.error('Error fetching promo cards:', fetchErr);
    return;
  }

  let dbUpdated = 0;
  for (const card of cards) {
    if (card.image_url && card.image_url.startsWith('/images/cards/')) {
      const filename = card.image_url.replace('/images/cards/', '');
      // Check if file exists locally or in uploaded set
      if (files.includes(filename)) {
        const publicUrl = `https://epuskceyfpbdljmwvcca.supabase.co/storage/v1/object/public/cards/${filename}`;
        const { error: upErr } = await supabase
          .from('cards')
          .update({ image_url: publicUrl, updated_at: new Date().toISOString() })
          .eq('id', card.id);
        if (!upErr) dbUpdated++;
      }
    }
  }

  console.log(`Database updated for ${dbUpdated} promo cards!`);
}

syncPromoImages();
