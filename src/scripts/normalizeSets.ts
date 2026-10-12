import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// Nombres oficiales y descriptivos para cada expansión / conjunto
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
  'OP-13': 'Carrying On His Will',
  'OP-14': "The Azure Sea's Seven",
  'OP-15': "Adventure on Kami's Island",
  'OP-16': 'The Azure Blue',
  'OP-17': "The World's Strongest Warriors",
  'OP-18': 'Booster Pack 18',
  'EB-01': 'Memorial Collection',
  'EB-02': 'Anime 25th Collection',
  'EB-03': 'Extra Booster 03',
  'EB-04': 'Extra Booster 04',
  'EB-05': 'Extra Booster 05',
  'PRB-01': 'The Best (Premium Booster)',
  'PRB-02': 'The Best Vol. 2',
  'PROMO': 'Cartas Promocionales',
  'ST-01': 'Straw Hat Crew',
  'ST-02': 'Worst Generation',
  'ST-03': 'The Seven Warlords of the Sea',
  'ST-04': 'Animal Kingdom Pirates',
  'ST-05': 'ONE PIECE FILM edition',
  'ST-06': 'Absolute Justice',
  'ST-07': 'Big Mom Pirates',
  'ST-08': 'Monkey D. Luffy',
  'ST-09': 'Yamato',
  'ST-10': 'The Three Captains',
  'ST-11': 'Uta',
  'ST-12': 'Zoro & Sanji',
  'ST-13': 'The Three Brothers',
  'ST-14': '3D2Y',
  'ST-15': 'Red Edward.Newgate',
  'ST-16': 'Green Uta',
  'ST-17': 'Blue Donquixote Doflamingo',
  'ST-18': 'Purple Monkey.D.Luffy',
  'ST-19': 'Black Smoker',
  'ST-20': 'Yellow Charlotte Katakuri',
  'ST-21': 'Starter Deck 21',
  'ST-22': 'Starter Deck 22',
  'ST-23': 'Starter Deck 23',
  'ST-24': 'Starter Deck 24',
  'ST-25': 'Starter Deck 25',
  'ST-26': 'Starter Deck 26',
  'ST-27': 'Starter Deck 27',
  'ST-28': 'Starter Deck 28',
  'ST-29': 'Starter Deck 29',
  'ST-30': 'Starter Deck 30',
  'ST-31': 'Starter Deck 31',
  'ST-32': 'Starter Deck 32',
  'ST-33': 'Starter Deck 33',
  'ST-34': 'Starter Deck 34',
  'ST-35': 'Starter Deck 35',
  'ST-36': 'Starter Deck 36',
};

async function main() {
  console.log('🔄 Iniciando normalización de conjuntos y carpetas...');

  // 1. Unificar TODOS los DON en set_code = 'DON'
  console.log('📦 Unificando todas las cartas DON!!...');
  
  // Buscar todas las que tengan DON en set_code, card_number o name
  let allCards: any[] = [];
  let page = 0;
  while (true) {
    const { data } = await supabase
      .from('cards')
      .select('id, card_number, set_code, set_name, name')
      .range(page * 1000, (page + 1) * 1000 - 1);
    if (!data || data.length === 0) break;
    allCards = allCards.concat(data);
    page++;
  }

  console.log(`Leídas ${allCards.length} cartas de la base de datos.`);

  // Identificar cartas DON
  const donCards = allCards.filter(c => {
    const s = (c.set_code || '').toLowerCase();
    const num = (c.card_number || '').toLowerCase();
    const n = (c.name || '').toLowerCase();
    return s.startsWith('don') || num.startsWith('don') || n.startsWith('don!') || n.includes('don!!');
  });

  console.log(`Encontradas ${donCards.length} cartas DON!!`);

  // Actualizar todas las cartas DON en batches
  const donIds = donCards.map(c => c.id);
  const CHUNK_SIZE = 100;
  for (let i = 0; i < donIds.length; i += CHUNK_SIZE) {
    const chunk = donIds.slice(i, i + CHUNK_SIZE);
    const { error } = await supabase
      .from('cards')
      .update({
        set_code: 'DON',
        set_name: 'Cartas DON!!'
      })
      .in('id', chunk);
    if (error) console.error('Error actualizando chunk DON:', error.message);
  }
  console.log(`✅ ¡${donCards.length} cartas DON unificadas exitosamente en set_code = "DON"!`);

  // 2. Normalizar las demás expansiones (eliminar inconsistencias como OP01 vs OP-01)
  console.log('📦 Normalizando el resto de expansiones y carpetas...');
  
  // Agrupar por el set normalizado que les corresponde
  const setUpdates: Map<string, string[]> = new Map(); // targetSetCode -> array of card ids
  const nameUpdates: Map<string, string> = new Map();   // targetSetCode -> official name

  for (const c of allCards) {
    // Si ya es DON, saltar
    if (donCards.some(d => d.id === c.id)) continue;

    const s = (c.set_code || '').trim();
    const num = (c.card_number || '').trim();
    const name = (c.name || '').trim();

    let targetSet = '';
    const match = (s || num).match(/^([A-Za-z]+)-?([0-9]+)/);
    if (match) {
      targetSet = `${match[1].toUpperCase()}-${match[2].padStart(2, '0')}`;
    } else if (s.toUpperCase() === 'P' || s.toUpperCase().startsWith('P-') || num.toUpperCase().startsWith('P-')) {
      targetSet = 'PROMO';
    } else {
      // Intentar extraer de name si contiene (OP17), etc.
      const nameMatch = name.match(/\(([A-Za-z]+)-?([0-9]+)\)/);
      if (nameMatch) {
        targetSet = `${nameMatch[1].toUpperCase()}-${nameMatch[2].padStart(2, '0')}`;
      } else {
        targetSet = s.toUpperCase() || 'OTROS';
      }
    }

    const officialName = SET_NAMES[targetSet] || c.set_name || `Expansión ${targetSet}`;

    // Si necesita cambio de set_code o tiene nombre genérico
    const needsSetUpdate = c.set_code !== targetSet;
    const needsNameUpdate = !c.set_name || c.set_name.includes('OPTCGSim Set') || c.set_name === 'Desconocido';

    if (needsSetUpdate || (needsNameUpdate && SET_NAMES[targetSet])) {
      if (!setUpdates.has(targetSet)) {
        setUpdates.set(targetSet, []);
        nameUpdates.set(targetSet, officialName);
      }
      setUpdates.get(targetSet)!.push(c.id);
    }
  }

  // Ejecutar actualizaciones agrupadas
  for (const [targetSet, ids] of setUpdates.entries()) {
    const officialName = nameUpdates.get(targetSet) || `Expansión ${targetSet}`;
    for (let i = 0; i < ids.length; i += CHUNK_SIZE) {
      const chunk = ids.slice(i, i + CHUNK_SIZE);
      const { error } = await supabase
        .from('cards')
        .update({
          set_code: targetSet,
          set_name: officialName
        })
        .in('id', chunk);
      if (error) console.error(`Error actualizando ${targetSet}:`, error.message);
    }
    console.log(`  -> ${targetSet} (${officialName}): ${ids.length} cartas actualizadas`);
  }

  console.log('\n🎉 ¡Normalización completada! Todas las cartas están ahora en conjuntos limpios.');
}

main().catch(console.error);
