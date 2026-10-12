import { supabase } from '../config/supabase';
import fs from 'fs';
import path from 'path';

const SET_NAMES: Record<string, string> = {
  'DON': 'Cartas DON!!',
  'OP-01': 'Romance Dawn',
  'OP-02': 'Paramount War',
  'OP-03': 'Pillars of Strength',
  'OP-04': 'Kingdoms of Intrigue',
  'OP-05': 'Awakening of the New Era',
  'OP-06': 'Wings of the Captain',
  'OP-07': '500 Years in the Future',
  'OP-08': 'Two Legends',
  'OP-09': 'The Four Emperors',
  'OP-10': 'Royal Bloodline',
  'OP-11': 'A New Chapter',
  'OP-12': 'Legacy of the Master',
  'OP-14': "The Azure Sea's Seven",
  'OP-15': "Adventure on Kami's Island",
  'OP-16': 'The Azure Blue',
  'OP-17': "The World's Strongest Warriors",
  'EB-01': 'Memorial Collection',
  'EB-02': 'Anime 25th Collection',
  'EB-03': 'Extra Booster 03',
  'EB-04': 'Extra Booster 04',
  'PRB-01': 'The Best (Premium Booster)',
  'PRB-02': 'The Best Vol. 2',
  'PROMO': 'Cartas Promocionales',
};

async function main() {
  console.log('🚀 Iniciando descarga y sincronización de cartas Manga desde https://optcgapi.com/ a Supabase...');

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
      console.error(`Error consultando ${ep.name}:`, e.message);
    }
  }

  // Filtrar todas las 48 cartas Manga oficiales
  const mangaCards = allApiCards.filter(c => 
    /\bmanga\b/i.test(c.card_name || '') || 
    /_manga/i.test(c.card_set_id || '') || 
    /_manga/i.test(c.card_image_id || '') ||
    /_sec-sp/i.test(c.card_image_id || '') ||
    JSON.stringify(c).toLowerCase().includes('manga')
  );

  console.log(`📋 Encontradas ${mangaCards.length} cartas Manga en OPTCGAPI.`);

  const localDir = path.join(__dirname, '../../public/images/cards');
  if (!fs.existsSync(localDir)) {
    fs.mkdirSync(localDir, { recursive: true });
  }

  // Corregir las 11 cartas antiguas que tenían imagen estándar de Sim y estaban marcadas como Manga
  const corruptedSimImages = [
    'OP12-118.jpg', 'OP17-022.jpg', 'OP17-112.jpg', 'OP11-118.jpg',
    'OP15-118.jpg', 'EB01-006.png', 'EB04-044.jpg', 'OP06-119.png',
    'OP05-119.png', 'OP16-073.jpg', 'OP16-063.jpg'
  ];

  for (const imgName of corruptedSimImages) {
    const { data: corruptedCards } = await supabase
      .from('cards')
      .select('id, name, card_number, image_url')
      .like('image_url', `%${imgName}`);

    if (corruptedCards && corruptedCards.length > 0) {
      for (const card of corruptedCards) {
        // Restaurar rareza base o eliminar el tag fake de Manga
        const cleanName = card.name
          .replace(/\(Manga\)/gi, '')
          .replace(/\(Alternate Art \/ Parallel\)/gi, '')
          .trim();
        
        let restoredRarity = 'SEC';
        if (card.card_number.startsWith('EB01-006')) restoredRarity = 'SR';
        if (card.card_number.startsWith('OP06-119')) restoredRarity = 'SEC';
        if (card.card_number.startsWith('OP05-119')) restoredRarity = 'SEC';

        await supabase
          .from('cards')
          .update({
            name: cleanName,
            rarity: restoredRarity
          })
          .eq('id', card.id);
      }
    }
  }

  console.log('✅ Cartas con imágenes base de Sim restauradas a su rareza estándar.');

  let uploadedCount = 0;
  let updatedDbCount = 0;

  for (let i = 0; i < mangaCards.length; i++) {
    const card = mangaCards[i];
    const imageId = card.card_image_id || card.card_set_id || `manga_${i}`;
    const rawNumber = card.card_set_id || (card.set_id ? `${card.set_id}-${card.card_image_id}` : `DON-${imageId}`);
    const name = card.card_name || 'Carta Manga';
    const externalImageUrl = card.card_image;

    if (!externalImageUrl) {
      console.warn(`[${i + 1}/${mangaCards.length}] ⚠️ Sin imagen externa: ${name}`);
      continue;
    }

    const filename = path.basename(externalImageUrl).split('?')[0];
    const localFilePath = path.join(localDir, filename);

    console.log(`[${i + 1}/${mangaCards.length}] Procesando Manga: ${name} (${filename})...`);

    // 1. Descargar imagen
    let buffer: Buffer;
    if (fs.existsSync(localFilePath) && fs.statSync(localFilePath).size > 10000) {
      buffer = fs.readFileSync(localFilePath);
    } else {
      try {
        const imgRes = await fetch(externalImageUrl);
        if (!imgRes.ok) throw new Error(`HTTP ${imgRes.status}`);
        buffer = Buffer.from(await imgRes.arrayBuffer());
        fs.writeFileSync(localFilePath, buffer);
      } catch (err: any) {
        console.error(`  ❌ Error descargando ${externalImageUrl}:`, err.message);
        continue;
      }
    }

    // 2. Subir a Supabase Storage bucket 'cards'
    const { error: uploadError } = await supabase.storage
      .from('cards')
      .upload(filename, buffer, {
        upsert: true,
        contentType: filename.endsWith('.png') ? 'image/png' : 'image/jpeg'
      });

    if (uploadError) {
      console.error(`  ❌ Error subiendo a Supabase Storage:`, uploadError.message);
    } else {
      uploadedCount++;
    }

    // 3. Obtener URL pública permanente de Supabase
    const { data: pubData } = supabase.storage.from('cards').getPublicUrl(filename);
    const supabaseImageUrl = pubData.publicUrl;

    // Normalizar set_code
    const isDon = name.toLowerCase().includes('don') || (card.set_id || '').toLowerCase().includes('don');
    let set_code = isDon ? 'DON' : (card.set_id || rawNumber.split('-')[0] || 'OTROS');
    if (!isDon) {
      const m = set_code.match(/^([A-Za-z]+)-?([0-9]+)/);
      if (m) set_code = `${m[1].toUpperCase()}-${m[2].padStart(2, '0')}`;
    }
    const set_name = SET_NAMES[set_code] || card.set_name || (isDon ? 'Cartas DON!!' : set_code);
    const cleanCardNumber = isDon ? 'DON!!' : rawNumber;

    // 4. Actualizar o insertar en la tabla 'cards' de Supabase
    // Buscar si ya existe una fila con este número o imagen
    const { data: existingRows } = await supabase
      .from('cards')
      .select('id, name, image_url')
      .or(`image_url.like.%${imageId}%,image_url.like.%${filename}%,name.ilike.%${card.card_name}%`);

    if (existingRows && existingRows.length > 0) {
      // Actualizar todas las filas coincidentes con la URL de Supabase Storage
      for (const row of existingRows) {
        const { error: updateErr } = await supabase
          .from('cards')
          .update({
            image_url: supabaseImageUrl,
            rarity: 'MANGA',
            set_code: set_code,
            set_name: set_name,
            updated_at: new Date().toISOString()
          })
          .eq('id', row.id);

        if (!updateErr) updatedDbCount++;
      }
      console.log(`  ✅ Actualizada fila en Supabase BD -> ${supabaseImageUrl}`);
    } else {
      // Insertar nueva carta en Supabase
      const { error: insertErr } = await supabase
        .from('cards')
        .insert({
          card_number: cleanCardNumber,
          name: name,
          set_code: set_code,
          set_name: set_name,
          rarity: 'MANGA',
          image_url: supabaseImageUrl,
          tcgplayer_url: `https://www.tcgplayer.com/search/one-piece-card-game/product?q=${cleanCardNumber}`
        });

      if (!insertErr) {
        updatedDbCount++;
        console.log(`  ✨ Insertada nueva carta Manga en Supabase BD -> ${supabaseImageUrl}`);
      } else {
        console.error(`  ❌ Error insertando:`, insertErr.message);
      }
    }
  }

  console.log('\n=============================================');
  console.log(`🎉 Sincronización Manga Completada!`);
  console.log(`📦 Imágenes subidas a Supabase Storage: ${uploadedCount}`);
  console.log(`📝 Filas actualizadas/insertadas en BD: ${updatedDbCount}`);
  console.log('=============================================');
}

main().catch(console.error);
