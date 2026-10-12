import { supabase } from '../config/supabase';
import { classifyCardRarity } from '../utils/rarityUtils';

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function main() {
  console.log('🌟 Iniciando actualización de Altas Rarezas (AA, SP, LÍDERES AA, MANGA) en Supabase...');

  // 1. Obtener todas las cartas de la base de datos
  let allCards: any[] = [];
  let page = 0;
  while (true) {
    const { data, error } = await supabase
      .from('cards')
      .select('id, card_number, name, rarity, set_code, image_url')
      .range(page * 1000, (page + 1) * 1000 - 1);

    if (error) {
      console.error('Error al consultar cartas:', error);
      process.exit(1);
    }
    if (!data || data.length === 0) break;
    allCards = allCards.concat(data);
    page++;
  }

  console.log(`✅ ${allCards.length} cartas leídas de la base de datos.`);

  // 2. Construir mapa de cartas base
  const baseCardMap = new Map<string, any>();
  for (const c of allCards) {
    const num = (c.card_number || '').trim();
    if (!num) continue;
    const isSpecial = /parallel|alternate|\(sp\)|\(spr\)|manga/i.test(c.name);
    const hasValidRarity = c.rarity && c.rarity !== 'N/A' && c.rarity !== 'NULL';

    if (!baseCardMap.has(num)) {
      baseCardMap.set(num, c);
    } else {
      const existing = baseCardMap.get(num);
      const existingIsSpecial = /parallel|alternate|\(sp\)|\(spr\)|manga/i.test(existing.name);
      const existingHasValidRarity = existing.rarity && existing.rarity !== 'N/A' && existing.rarity !== 'NULL';

      if ((!isSpecial && existingIsSpecial) || (!existingHasValidRarity && hasValidRarity)) {
        baseCardMap.set(num, c);
      }
    }
  }

  console.log(`✅ Mapa de cartas base generado con ${baseCardMap.size} códigos.`);

  // 3. Identificar cartas a actualizar
  const updates: { id: string; rarity: string; card_number?: string }[] = [];
  const rarityStats: Record<string, number> = {};

  for (const c of allCards) {
    let num = (c.card_number || '').trim();
    let numUpdated = false;

    // Si card_number estaba vacío, intentar extraerlo del nombre
    if (!num) {
      const match = c.name.match(/\b([A-Z]{2,4}[0-9]{2}-[0-9]{3})\b/i) || c.name.match(/\(([0-9]{3})\)/);
      if (match) {
        if (match[1].includes('-')) {
          num = match[1].toUpperCase();
          numUpdated = true;
        } else if (c.set_code && match[1]) {
          const prefix = c.set_code.replace('-', '');
          num = `${prefix}-${match[1]}`;
          numUpdated = true;
        }
      }
    }

    const baseCard = baseCardMap.get(num);
    const newRarity = classifyCardRarity({ ...c, card_number: num }, baseCard);
    rarityStats[newRarity] = (rarityStats[newRarity] || 0) + 1;

    if (newRarity !== c.rarity || numUpdated) {
      updates.push({
        id: c.id,
        rarity: newRarity,
        ...(numUpdated ? { card_number: num } : {})
      });
    }
  }

  console.log('\n📊 Distribución final calculada para la base de datos:');
  console.table(rarityStats);

  console.log(`\n🔄 Total de cartas a actualizar en Supabase: ${updates.length}`);

  // 4. Ejecutar actualizaciones en lotes
  const BATCH_SIZE = 50;
  let updatedCount = 0;

  for (let i = 0; i < updates.length; i += BATCH_SIZE) {
    const chunk = updates.slice(i, i + BATCH_SIZE);
    
    await Promise.all(
      chunk.map(item => {
        const payload: any = {
          rarity: item.rarity,
          updated_at: new Date().toISOString()
        };
        if (item.card_number) {
          payload.card_number = item.card_number;
        }
        return supabase.from('cards').update(payload).eq('id', item.id);
      })
    );

    updatedCount += chunk.length;
    if (updatedCount % 200 === 0 || updatedCount === updates.length) {
      console.log(`  -> Progreso: ${updatedCount}/${updates.length} cartas actualizadas...`);
    }
    // Pequeño reposo para no saturar la conexión
    await sleep(50);
  }

  console.log('\n🎉 ¡TODAS LAS ALTAS RAREZAS HAN SIDO ACTUALIZADAS EXITOSAMENTE EN SUPABASE! 🎉');
}

main().catch(err => {
  console.error('Error fatal:', err);
  process.exit(1);
});
