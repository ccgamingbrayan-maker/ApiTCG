import { supabase } from '../config/supabase';
import { classifyCardRarity } from '../utils/rarityUtils';
import fs from 'fs';
import path from 'path';

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const ENDPOINTS = [
  { name: 'Sets', url: 'https://www.optcgapi.com/api/allSetCards/' },
  { name: 'Starter Decks', url: 'https://www.optcgapi.com/api/allSTCards/' },
  { name: 'Promos', url: 'https://www.optcgapi.com/api/allPromos/' },
  { name: 'DON!!', url: 'https://www.optcgapi.com/api/allDonCards/' }
];

async function run() {
  console.log('🌟 Iniciando la Extracción de la Base de Datos desde OPTCGAPI');
  
  try {
    for (const endpoint of ENDPOINTS) {
      console.log(`\n======================================================`);
      console.log(`📥 Descargando catálogo: ${endpoint.name}`);
      console.log(`======================================================`);
      
      const res = await fetch(endpoint.url);
      if (!res.ok) {
        console.error(`Error al conectar con ${endpoint.url}: ${res.status}`);
        continue;
      }
      
      const cards = await res.json();
      console.log(`¡Encontradas ${cards.length} cartas en la categoría ${endpoint.name}!`);
      
      for (let i = 0; i < cards.length; i++) {
        const card = cards[i];
        try {
          const number = card.card_set_id || card.card_image_id; // e.g. OP01-077
          const imageId = card.card_image_id || card.card_set_id || number;
          if (!number) continue;
          
          const name = card.card_name || '';
          const rarity = card.rarity || 'N/A';
          
          const isDon = number.toLowerCase().startsWith('don') || name.toLowerCase().includes('don!') || (card.set_id || '').toLowerCase().startsWith('don');
          let set_code = isDon ? 'DON' : (card.set_id || number.split('-')[0]);
          let set_name = isDon ? 'Cartas DON!!' : (card.set_name || 'Desconocido');

          if (!isDon) {
            const m = set_code.match(/^([A-Za-z]+)-?([0-9]+)/);
            if (m) set_code = `${m[1].toUpperCase()}-${m[2].padStart(2, '0')}`;
          }
          if (set_code.toUpperCase().startsWith('P') && !set_code.startsWith('PRB')) {
            set_code = 'PROMO';
          }
          
          const externalImageUrl = card.card_image;
          let localImageUrl = null;
          
          // Descargar la imagen usando el ID único de la variante
          if (externalImageUrl) {
             const ext = externalImageUrl.split('.').pop() || 'jpg';
             const cleanExt = ext.split('?')[0];
             const filename = `${imageId.replace(/[^a-zA-Z0-9-_]/g, '')}.${cleanExt}`;
             const cardsDir = path.join(__dirname, '../../public/images/cards');
             
             if (!fs.existsSync(cardsDir)) fs.mkdirSync(cardsDir, { recursive: true });
             
             const imgPath = path.join(cardsDir, filename);
             if (!fs.existsSync(imgPath)) {
               await sleep(50); 
               const imgRes = await fetch(externalImageUrl);
               if (imgRes.ok) {
                 fs.writeFileSync(imgPath, Buffer.from(await imgRes.arrayBuffer()));
                 localImageUrl = `/images/cards/${filename}`;
               }
             } else {
               localImageUrl = `/images/cards/${filename}`;
             }
          }
          
          // Upsert en Supabase
          const { data: existing } = await supabase
            .from('cards')
            .select('id, tcgplayer_id')
            .eq('card_number', number)
            .eq('image_url', localImageUrl || externalImageUrl)
            .limit(1)
            .single();
          
          const computedRarity = classifyCardRarity({
            name,
            card_number: number,
            set_code,
            rarity: rarity.replace(/[^a-zA-Z]/g, ''),
            image_url: localImageUrl || externalImageUrl
          });

          const cardData = {
            name: name,
            set_name: set_name,
            set_code: set_code,
            card_number: number,
            rarity: computedRarity,
            image_url: localImageUrl || externalImageUrl,
            tcgplayer_url: `https://www.tcgplayer.com/search/one-piece-card-game/product?q=${number}`,
            updated_at: new Date().toISOString()
          };

          if (existing) {
             await supabase.from('cards').update(cardData).eq('id', existing.id);
          } else {
             await supabase.from('cards').insert({
                ...cardData,
                tcgplayer_id: Math.floor(Math.random() * 1000000000) * -1
             });
          }
          
          if (i % 50 === 0) {
             console.log(`  -> Progreso: ${i}/${cards.length} guardadas... (Última: ${number} - ${name})`);
          }
          
        } catch(e) {
          console.error(`Error guardando carta ${i}:`, e);
        }
      }
      
      console.log(`✅ Categoría ${endpoint.name} completada.`);
    }
    
    console.log('\n🎉 ¡MIGRACIÓN COMPLETADA CON ÉXITO! 🎉');
  } catch (err) {
    console.error(err);
  }
}

run().catch((err) => {
  console.error("Error fatal en el script:", err);
  process.exit(1);
});
