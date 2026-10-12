import { chromium } from 'playwright';
import { supabase } from '../config/supabase';
import fs from 'fs';
import path from 'path';

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function run() {
  console.log('🌟 Iniciando la Extracción de la Base de Datos Oficial (One Piece Card Game)');
  
  const browser = await chromium.launch({ 
    headless: true,
    channel: 'msedge' // Usar Edge nativo de Windows
  });
  const page = await browser.newPage();
  
  try {
    console.log('Navegando a la página oficial...');
    await page.goto('https://en.onepiece-cardgame.com/cardlist/', { waitUntil: 'networkidle', timeout: 60000 });
    
    // Obtener todas las series (expansiones, starters, promos)
    const seriesOptions = await page.locator('select#series option').all();
    const seriesList = [];
    
    for (const opt of seriesOptions) {
      const val = await opt.getAttribute('value');
      const text = await opt.innerText();
      if (val && val.length > 0) {
        seriesList.push({ id: val, name: text.trim() });
      }
    }
    
    console.log(`¡Encontradas ${seriesList.length} expansiones/sets oficiales!`);
    
    for (const series of seriesList) {
      console.log(`\n======================================================`);
      console.log(`📥 Extrayendo Set: ${series.name} (ID: ${series.id})`);
      console.log(`======================================================`);
      
      await page.goto(`https://en.onepiece-cardgame.com/cardlist/?series=${series.id}`, { waitUntil: 'networkidle' });
      
      // Esperar a que carguen las cartas (clase resultCol)
      await page.waitForSelector('.resultCol', { timeout: 10000 }).catch(() => {});
      
      const cards = await page.locator('.resultCol > .resultCol__list > div > dl').all();
      console.log(`Cartas en este set: ${cards.length}`);
      
      for (let i = 0; i < cards.length; i++) {
        const cardLoc = cards[i];
        
        try {
          const number = await cardLoc.locator('.infoCol > span').first().innerText();
          const name = await cardLoc.locator('.nameCol').first().innerText();
          
          let rarity = 'N/A';
          try {
             rarity = await cardLoc.locator('.infoCol > span').nth(1).innerText();
          } catch(e) {}
          
          const imgSrc = await cardLoc.locator('.imgCol img').first().getAttribute('front');
          const finalImgUrl = imgSrc ? (imgSrc.startsWith('http') ? imgSrc : `https://en.onepiece-cardgame.com${imgSrc}`) : null;
          
          // Fix URL from `..`
          let fixedImgUrl = finalImgUrl;
          if (fixedImgUrl && fixedImgUrl.includes('../')) {
             fixedImgUrl = fixedImgUrl.replace('../', 'https://en.onepiece-cardgame.com/');
          }
          
          let localImageUrl = null;
          if (fixedImgUrl) {
             const ext = fixedImgUrl.split('.').pop() || 'png';
             const filename = `${number.replace(/[^a-zA-Z0-9-]/g, '')}.${ext}`;
             const cardsDir = path.join(__dirname, '../../public/images/cards');
             if (!fs.existsSync(cardsDir)) fs.mkdirSync(cardsDir, { recursive: true });
             
             const imgPath = path.join(cardsDir, filename);
             if (!fs.existsSync(imgPath)) {
               const res = await fetch(fixedImgUrl);
               if (res.ok) {
                 fs.writeFileSync(imgPath, Buffer.from(await res.arrayBuffer()));
                 localImageUrl = `/images/cards/${filename}`;
               }
             } else {
               localImageUrl = `/images/cards/${filename}`;
             }
          }
          
          const set_code = number.split('-')[0] || '';
          
          console.log(`  -> Guardando: ${number} - ${name}`);
          
          // Check if card exists by card_number
          const { data: existing } = await supabase.from('cards').select('id, tcgplayer_id').eq('card_number', number).limit(1).single();
          
          const cardData = {
            name: name,
            set_name: series.name,
            set_code: set_code,
            card_number: number,
            rarity: rarity.replace(/[^a-zA-Z]/g, ''),
            image_url: localImageUrl || fixedImgUrl,
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
          
        } catch(e) {
          console.error(`Error extrayendo carta ${i}:`, e);
        }
      }
      
      await sleep(2000);
    }
    
    console.log('\n🎉 ¡MIGRACIÓN COMPLETADA CON ÉXITO! 🎉');
  } catch (err) {
    console.error(err);
  } finally {
    await browser.close();
  }
}

run().catch((err) => {
  console.error("Error fatal en el script:", err);
  process.exit(1);
});
