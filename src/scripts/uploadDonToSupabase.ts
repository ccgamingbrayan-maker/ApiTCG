import { supabase } from '../config/supabase';
import fs from 'fs';
import path from 'path';

async function main() {
  console.log('🌟 Iniciando subida de cartas DON!! a Supabase Storage y BD...');

  const localDir = path.join(__dirname, '../../public/images/cards');
  if (!fs.existsSync(localDir)) {
    console.error('No existe el directorio de imágenes locales');
    return;
  }

  const files = fs.readdirSync(localDir).filter(f => /^don_\d+\.(jpg|jpeg|png)$/i.test(f));
  console.log(`Encontrados ${files.length} archivos don_*.jpg para subir.`);

  let uploaded = 0;
  let updatedInDb = 0;

  // Subir archivos con concurrencia de 5
  const concurrency = 5;
  let idx = 0;

  async function worker() {
    while (idx < files.length) {
      const file = files[idx++];
      const filePath = path.join(localDir, file);
      const buffer = fs.readFileSync(filePath);
      const code = file.replace(/\.(jpg|jpeg|png)$/i, '');

      // 1. Subir al bucket
      const { error: upErr } = await supabase.storage
        .from('cards')
        .upload(file, buffer, {
          upsert: true,
          contentType: file.endsWith('.png') ? 'image/png' : 'image/jpeg'
        });

      if (!upErr) {
        uploaded++;
      } else {
        console.warn(`Error subiendo ${file}:`, upErr.message);
      }

      const { data: pubData } = supabase.storage.from('cards').getPublicUrl(file);
      const publicUrl = pubData.publicUrl;

      // 2. Actualizar en la base de datos cards
      const { data: matchedCards, error: findErr } = await supabase
        .from('cards')
        .select('id, card_number, name')
        .or(`card_number.eq.${code},image_url.like.%${file}%`);

      if (matchedCards && matchedCards.length > 0) {
        for (const c of matchedCards) {
          const { error: upDbErr } = await supabase
            .from('cards')
            .update({ image_url: publicUrl })
            .eq('id', c.id);
          
          if (!upDbErr) updatedInDb++;
        }
      }
    }
  }

  const workers = Array.from({ length: concurrency }, () => worker());
  await Promise.all(workers);

  console.log(`✅ Finalizado con éxito:`);
  console.log(`- Archivos DON subidos a Storage: ${uploaded}/${files.length}`);
  console.log(`- Registros de BD actualizados con URL pública: ${updatedInDb}`);
}

main().catch(console.error);
