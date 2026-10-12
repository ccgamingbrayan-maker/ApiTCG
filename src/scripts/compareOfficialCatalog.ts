import { supabase } from '../config/supabase';
import fs from 'fs';
import path from 'path';

const ENDPOINTS = [
  { name: 'Booster Sets', url: 'https://www.optcgapi.com/api/allSetCards/' },
  { name: 'Starter Decks', url: 'https://www.optcgapi.com/api/allSTCards/' },
  { name: 'Promos', url: 'https://www.optcgapi.com/api/allPromos/' },
  { name: 'DON!! Cards', url: 'https://www.optcgapi.com/api/allDonCards/' }
];

interface ApiCard {
  card_name?: string;
  card_set_id?: string; // e.g. OP01-001
  card_image_id?: string;
  set_id?: string;
  set_name?: string;
  rarity?: string;
  card_type?: string;
  card_image?: string;
}

interface DbCard {
  id: string;
  card_number: string;
  name: string;
  set_code: string;
  set_name?: string;
  rarity?: string;
  image_url?: string;
}

async function fetchAllDbCards(): Promise<DbCard[]> {
  console.log('📦 Extrayendo todas las cartas de Supabase con paginación...');
  const allRows: DbCard[] = [];
  const pageSize = 1000;
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from('cards')
      .select('id, card_number, name, set_code, set_name, rarity, image_url')
      .range(from, from + pageSize - 1);

    if (error) {
      console.error('Error fetching cards range:', error);
      break;
    }

    if (!data || data.length === 0) break;
    allRows.push(...data);
    from += pageSize;
    if (data.length < pageSize) break;
  }

  console.log(`✅ Total de registros en tu Base de Datos: ${allRows.length}`);
  return allRows;
}

async function runComparison() {
  console.log('🔍 INICIANDO COMPARACIÓN CON CATÁLOGO OFICIAL DE ONE PIECE TCG...\n');

  // 1. Obtener todas las cartas de la DB
  const dbCards = await fetchAllDbCards();
  const dbCardCodes = new Set<string>();
  const dbCardsByCode = new Map<string, DbCard[]>();

  dbCards.forEach(c => {
    if (c.card_number) {
      const normalized = c.card_number.trim().toUpperCase();
      dbCardCodes.add(normalized);
      if (!dbCardsByCode.has(normalized)) {
        dbCardsByCode.set(normalized, []);
      }
      dbCardsByCode.get(normalized)!.push(c);
    }
  });

  console.log(`🔹 Códigos únicos en tu BD: ${dbCardCodes.size}`);

  // 2. Descargar catálogo oficial de la API
  const officialCards: ApiCard[] = [];
  const officialCardCodes = new Set<string>();
  const officialCardsBySet = new Map<string, ApiCard[]>();

  for (const ep of ENDPOINTS) {
    console.log(`🌐 Descargando lista oficial: ${ep.name}...`);
    try {
      const res = await fetch(ep.url);
      if (!res.ok) {
        console.error(`  ❌ Error ${res.status} al descargar ${ep.name}`);
        continue;
      }
      const data: ApiCard[] = await res.json();
      console.log(`  -> ${data.length} cartas descargadas de ${ep.name}`);
      officialCards.push(...data);

      data.forEach(c => {
        const code = (c.card_set_id || c.card_image_id || '').trim().toUpperCase();
        if (code) {
          officialCardCodes.add(code);
          const setId = c.set_id || code.split('-')[0] || 'OTROS';
          if (!officialCardsBySet.has(setId)) {
            officialCardsBySet.set(setId, []);
          }
          officialCardsBySet.get(setId)!.push(c);
        }
      });
    } catch (err: any) {
      console.error(`  ❌ Excepción descargando ${ep.name}:`, err.message);
    }
  }

  console.log(`\n📊 RESUMEN GENERAL:`);
  console.log(`- Total cartas oficiales en API (con variantes): ${officialCards.length}`);
  console.log(`- Códigos base únicos oficiales: ${officialCardCodes.size}`);
  console.log(`- Total registros en tu base de datos: ${dbCards.length}`);
  console.log(`- Códigos base únicos en tu base de datos: ${dbCardCodes.size}`);

  // 3. Comparar: ¿Qué códigos oficiales NO están en tu base de datos?
  const missingFromDb: { code: string; name: string; set: string; rarity: string }[] = [];
  officialCardCodes.forEach(code => {
    if (!dbCardCodes.has(code)) {
      const sample = officialCards.find(c => (c.card_set_id || c.card_image_id || '').trim().toUpperCase() === code);
      missingFromDb.push({
        code,
        name: sample?.card_name || 'Desconocido',
        set: sample?.set_id || sample?.set_name || 'N/A',
        rarity: sample?.rarity || 'N/A'
      });
    }
  });

  // 4. Comparar: ¿Qué cartas en tu BD están marcadas como incompletas o sin imagen?
  const dbWithoutImage = dbCards.filter(c => !c.image_url || c.image_url.includes('missing') || c.image_url === 'N/A');
  const dbMissingCardName = dbCards.filter(c => c.name.toLowerCase().includes('missing card'));

  // 5. Agrupación de faltantes por Set/Expansión
  const missingBySet: Record<string, typeof missingFromDb> = {};
  missingFromDb.forEach(m => {
    missingBySet[m.set] = missingBySet[m.set] || [];
    missingBySet[m.set].push(m);
  });

  console.log(`\n======================================================`);
  console.log(`🚨 RESULTADO DE LA COMPARACIÓN:`);
  console.log(`======================================================`);
  console.log(`Total de cartas oficiales que FALTAN en tu base de datos: ${missingFromDb.length}`);
  console.log(`Total de cartas en tu BD sin imagen o con placeholder: ${dbWithoutImage.length}`);
  console.log(`Total de cartas en tu BD marcadas como "missing card": ${dbMissingCardName.length}`);

  if (missingFromDb.length > 0) {
    console.log(`\n📋 Desglose de cartas faltantes por Set:`);
    Object.entries(missingBySet).forEach(([setName, list]) => {
      console.log(`\n🔹 Set: ${setName} (${list.length} faltantes):`);
      list.slice(0, 10).forEach(c => console.log(`   - ${c.code}: ${c.name} [${c.rarity}]`));
      if (list.length > 10) console.log(`   ... y ${list.length - 10} más.`);
    });
  } else {
    console.log(`\n🎉 ¡TIENES EL 100% DE LAS CARTAS OFICIALES REGISTRADAS!`);
  }

  // Guardar reporte completo en archivo JSON para análisis detallado
  const report = {
    timestamp: new Date().toISOString(),
    totalDbRecords: dbCards.length,
    totalDbUniqueCodes: dbCardCodes.size,
    totalOfficialRecords: officialCards.length,
    totalOfficialUniqueCodes: officialCardCodes.size,
    missingCount: missingFromDb.length,
    missingCards: missingFromDb,
    dbWithoutImageCount: dbWithoutImage.length,
    dbMissingCardNameCount: dbMissingCardName.length
  };

  fs.writeFileSync('comparison_report.json', JSON.stringify(report, null, 2), 'utf8');
  console.log(`\n📄 Reporte detallado guardado en: comparison_report.json`);
}

runComparison();
