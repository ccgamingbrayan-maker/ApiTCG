import { supabase } from '../config/supabase';
import fs from 'fs';
import path from 'path';

async function main() {
  console.log('🌟 Iniciando subida de cartas SP / Especiales a Supabase Storage y BD...');

  const endpoints = [
    { name: 'Sets', url: 'https://www.optcgapi.com/api/allSetCards/' },
    { name: 'Starter Decks', url: 'https://www.optcgapi.com/api/allSTCards/' },
    { name: 'Promos', url: 'https://www.optcgapi.com/api/allPromos/' },
    { name: 'DON!!', url: 'https://www.optcgapi.com/api/allDonCards/' }
  ];

  const allApiCards: any[] = [];
  for (const ep of endpoints) {
    try {
      const res = await fetch(ep.url);
      if (res.ok) {
        const data = await res.json();
        allApiCards.push(...data);
      }
    } catch (e: any) {
      console.error(`Error en ${ep.name}:`, e.message);
    }
  }

  // Filtrar cartas SP / Special / SPR (excluyendo Manga)
  const spCards = allApiCards.filter(c => {
    const isManga = JSON.stringify(c).toLowerCase().includes('manga');
    if (isManga) return false;
    const r = (c.rarity || '').toUpperCase();
    const name = (c.card_name || '').toUpperCase();
    return r === 'SP' || r === 'SPR' || r.includes('SPECIAL') || /\bSP\b/.test(name) || /_SP/i.test(c.card_image_id || '');
  });

  console.log(`📋 Encontradas ${spCards.length} cartas SP en OPTCGAPI.`);

  const localDir = path.join(__dirname, '../../public/images/cards');
  if (!fs.existsSync(localDir)) fs.mkdirSync(localDir, { recursive: true });

  let uploaded = 0;
  let updated = 0;

  // Procesar con concurrencia
  const concurrency = 10;
  let idx = 0;

  async function worker() {
    while (idx < spCards.length) {
      const card = spCards[idx++];
      if (!card || !card.card_image) continue;

      const externalImageUrl = card.card_image;
      const filename = path.basename(externalImageUrl).split('?')[0];
      const localFilePath = path.join(localDir, filename);
      const imageId = card.card_image_id || card.card_set_id;

      let buffer: Buffer;
      if (fs.existsSync(localFilePath) && fs.statSync(localFilePath).size > 10000) {
        buffer = fs.readFileSync(localFilePath);
      } else {
        try {
          const r = await fetch(externalImageUrl);
          if (!r.ok) continue;
          buffer = Buffer.from(await r.arrayBuffer());
          fs.writeFileSync(localFilePath, buffer);
        } catch (e) {
          continue;
        }
      }

      // Subir a Supabase Storage
      const { error: upErr } = await supabase.storage
        .from('cards')
        .upload(filename, buffer, {
          upsert: true,
          contentType: filename.endsWith('.png') ? 'image/png' : 'image/jpeg'
        });

      if (!upErr) uploaded++;

      const { data: pubData } = supabase.storage.from('cards').getPublicUrl(filename);
      const supabaseUrl = pubData.publicUrl;

      // Actualizar en BD
      const { data: rows } = await supabase
        .from('cards')
        .select('id')
        .or(`image_url.like.%${imageId}%,image_url.like.%${filename}%`);

      if (rows && rows.length > 0) {
        for (const row of rows) {
          const { error: upDbErr } = await supabase
            .from('cards')
            .update({
              image_url: supabaseUrl,
              rarity: 'SP'
            })
            .eq('id', row.id);

          if (!upDbErr) updated++;
        }
      }
    }
  }

  const workers = Array.from({ length: concurrency }, () => worker());
  await Promise.all(workers);

  console.log(`🎉 Finalizado: ${uploaded} subidas a Storage, ${updated} filas actualizadas en BD.`);
}

main().catch(console.error);
