import { supabase } from '../config/supabase';
import { classifyCardRarity } from '../utils/rarityUtils';
import fs from 'fs';
import path from 'path';

// SIM Folder path
const SIM_CARDS_DIR = 'C:\\Users\\Brare\\Desktop\\1.32a_Windows\\Builds_Windows\\OPTCGSim_Data\\StreamingAssets\\Cards';

async function run() {
  console.log('🌟 Iniciando Sincronización desde OPTCGSim...');

  if (!fs.existsSync(SIM_CARDS_DIR)) {
    console.error(`Error: La carpeta no existe -> ${SIM_CARDS_DIR}`);
    return;
  }

  const getFilesRecursively = (dir: string): string[] => {
    let results: string[] = [];
    const list = fs.readdirSync(dir);
    list.forEach((file) => {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      if (stat && stat.isDirectory()) {
        results = results.concat(getFilesRecursively(filePath));
      } else {
        results.push(filePath);
      }
    });
    return results;
  };

  const files = getFilesRecursively(SIM_CARDS_DIR);
  console.log(`¡Encontradas ${files.length} imágenes en el simulador!`);

  // Extraer los códigos de carta (ej. OP01-001 de OP01-001.png)
  // OPTCGSim naming convention: sometimes it has extra suffixes like OP01-001_p1.png
  // We'll map them carefully.
  
  // Get all existing cards from Supabase to compare
  const { data: existingCards, error } = await supabase.from('cards').select('card_number');
  if (error) {
    console.error('Error fetching existing cards:', error);
    return;
  }
  
  const existingSet = new Set(existingCards.map(c => c.card_number));
  console.log(`Cartas actuales en Supabase: ${existingSet.size}`);
  
  // List files already uploaded to the bucket to avoid re-uploading
  let uploadedImages = new Set<string>();
  try {
    const { data: storageFiles } = await supabase.storage.from('cards').list('', { limit: 10000 });
    if (storageFiles) {
      uploadedImages = new Set(storageFiles.map(f => f.name));
    }
  } catch (e) {
    console.log("No se pudo listar el bucket, continuaremos igual.");
  }
  
  let missingCards = [];

  for (const filePath of files) {
    const file = path.basename(filePath);
    if (!file.endsWith('.png') && !file.endsWith('.jpg')) continue;
    if (file.toLowerCase().includes('_small')) continue; // Ignorar miniaturas de OPTCGSim
    
    // El nombre del archivo completo sin extensión será el card_number único
    const uniqueCardNumber = file.replace(/\.(png|jpg|jpeg)$/i, '');
    
    // Para buscar la carta base (ej: OP01-001_p1 -> OP01-001)
    const cardNumberMatch = file.match(/^([a-zA-Z0-9]+-[0-9]+)/);
    const baseCardNumber = cardNumberMatch ? cardNumberMatch[1] : uniqueCardNumber;
    
    if (!existingSet.has(uniqueCardNumber)) {
      missingCards.push({ filename: file, filePath, uniqueCardNumber, baseCardNumber });
    }
  }

  console.log(`\n==============================================`);
  console.log(`Faltan ${missingCards.length} cartas en la Base de Datos.`);
  console.log(`==============================================\n`);

  for (let i = 0; i < missingCards.length; i++) {
    const { filename, filePath, uniqueCardNumber, baseCardNumber } = missingCards[i];
    console.log(`[${i+1}/${missingCards.length}] Procesando carta faltante: ${uniqueCardNumber}`);
    
    try {
      let publicUrl = '';
      
      // Solo subimos la foto si no está ya en el bucket
      if (!uploadedImages.has(filename)) {
        const fileBuffer = fs.readFileSync(filePath);
        const { data: uploadData, error: uploadErr } = await supabase.storage
          .from('cards')
          .upload(`${filename}`, fileBuffer, {
            contentType: 'image/png',
            upsert: true
          });
          
        if (uploadErr) {
          console.error(`  -> Error subiendo imagen:`, uploadErr.message);
          continue;
        }
      }
      
      const { data: publicUrlData } = supabase.storage.from('cards').getPublicUrl(filename);
      publicUrl = publicUrlData.publicUrl;
      
      const isDon = uniqueCardNumber.toLowerCase().startsWith('don') || filename.toLowerCase().startsWith('don');
      let set_code = isDon ? 'DON' : (uniqueCardNumber.split('-')[0] || 'Desconocido');
      let set_name = isDon ? 'Cartas DON!!' : `OPTCGSim Set ${set_code}`;

      if (!isDon) {
        const m = set_code.match(/^([A-Za-z]+)-?([0-9]+)/);
        if (m) set_code = `${m[1].toUpperCase()}-${m[2].padStart(2, '0')}`;
      }
      
      let finalName = isDon ? `DON!! Card (${uniqueCardNumber})` : `Missing Card (${uniqueCardNumber})`;
      // Intentar buscar el nombre y rareza de la carta base
      const { data: baseCard } = await supabase.from('cards').select('name, rarity').eq('card_number', baseCardNumber).limit(1).single();
      
      if (baseCard) {
        finalName = `${baseCard.name} (Alternate Art / Parallel)`;
      }

      const computedRarity = classifyCardRarity(
        {
          name: finalName,
          card_number: uniqueCardNumber,
          set_code: set_code,
          image_url: publicUrl,
        },
        baseCard ? { rarity: baseCard.rarity, name: baseCard.name } : undefined
      );
      
      // Insert to Database
      await supabase.from('cards').insert({
        card_number: uniqueCardNumber,
        name: finalName,
        set_code: set_code,
        set_name: set_name,
        rarity: computedRarity,
        image_url: publicUrl,
        tcgplayer_url: `https://www.tcgplayer.com/search/one-piece-card-game/product?q=${uniqueCardNumber}`,
        tcgplayer_id: Math.floor(Math.random() * 1000000000) * -1
      });
      
      console.log(`  -> ¡Insertada en la base de datos!`);
    } catch (e) {
       console.error(`  -> Error fatal:`, e);
    }
  }

  console.log('\n✅ Proceso completado.');
}

run().catch(console.error);
