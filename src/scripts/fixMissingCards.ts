import { supabase } from '../config/supabase';

const ENDPOINTS = [
  'https://www.optcgapi.com/api/allSetCards/',
  'https://www.optcgapi.com/api/allSTCards/',
  'https://www.optcgapi.com/api/allPromos/',
  'https://www.optcgapi.com/api/allDonCards/'
];

async function run() {
  console.log('🔄 Iniciando actualización y corrección de cartas oficiales...');

  // 1. Descargar catálogo oficial completo
  const officialMap = new Map<string, any>();
  for (const url of ENDPOINTS) {
    const res = await fetch(url);
    if (!res.ok) continue;
    const cards = await res.json();
    cards.forEach((c: any) => {
      const code = (c.card_set_id || c.card_image_id || '').toUpperCase();
      if (code && !officialMap.has(code)) {
        officialMap.set(code, c);
      }
    });
  }
  console.log(`✅ Catálogo oficial cargado: ${officialMap.size} códigos.`);

  // 2. Insertar P-700 si no existe
  const { data: p700Exists } = await supabase.from('cards').select('id').eq('card_number', 'P-700').maybeSingle();
  if (!p700Exists) {
    const officialP700 = officialMap.get('P-700');
    if (officialP700) {
      console.log('➕ Insertando carta faltante P-700 en Supabase...');
      const { error: insErr } = await supabase.from('cards').insert({
        id: 'P-700',
        card_number: 'P-700',
        name: officialP700.card_name || 'Monkey.D.Luffy (Release Event Leader)',
        set_code: 'PROMO',
        set_name: 'Cartas Promocionales (Release Event Leader)',
        rarity: 'P',
        image_url: 'https://images.limitlesstcg.com/one-piece/P/P-700.webp'
      });
      if (insErr) {
        console.error('Error insertando P-700:', insErr);
      } else {
        console.log('🎉 P-700 insertada con éxito.');
      }
    }
  } else {
    console.log('ℹ️ P-700 ya existe en la base de datos.');
  }

  // 3. Corregir las 69 cartas con nombre "Missing Card (...)"
  const { data: missingCards, error: missErr } = await supabase
    .from('cards')
    .select('id, card_number, name')
    .ilike('name', '%missing card%');

  if (missErr || !missingCards) {
    console.error('Error obteniendo cartas placeholder:', missErr);
    return;
  }

  console.log(`📋 Analizando ${missingCards.length} cartas con nombre provisional...`);
  let updatedCount = 0;

  for (const card of missingCards) {
    const code = (card.card_number || '').toUpperCase();
    const official = officialMap.get(code);

    if (official && official.card_name && !official.card_name.toLowerCase().includes('missing')) {
      const { error: updateErr } = await supabase
        .from('cards')
        .update({
          name: official.card_name,
          rarity: official.rarity || 'P',
          set_name: official.set_name || 'Cartas Promocionales'
        })
        .eq('id', card.id);

      if (!updateErr) {
        updatedCount++;
        console.log(`   ✔️ Actualizado ${code}: "${card.name}" -> "${official.card_name}"`);
      }
    }
  }

  console.log(`\n🎉 Finalizado: ${updatedCount} cartas corregidas con sus nombres y datos oficiales.`);
}

run();
