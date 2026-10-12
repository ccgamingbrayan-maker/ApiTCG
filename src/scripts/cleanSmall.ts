import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log('🧹 Limpiando registros corruptos con _small y 0 results...');

  // 1. Eliminar cartas con nombre "0 results for..."
  const { data: badNames, error: errBadNames } = await supabase
    .from('cards')
    .delete()
    .ilike('name', '%0 results%')
    .select('id');
  console.log(`Eliminadas cartas con "0 results": ${badNames?.length || 0}`);

  // 2. Eliminar cartas con card_number que termina en _small
  const { data: badSmall, error: errBadSmall } = await supabase
    .from('cards')
    .delete()
    .ilike('card_number', '%_small%')
    .select('id');
  console.log(`Eliminadas cartas con _small en card_number: ${badSmall?.length || 0}`);

  // 3. Eliminar cartas restantes con _small en el tcgplayer_url
  const { data: badUrls, error: errBadUrls } = await supabase
    .from('cards')
    .delete()
    .ilike('tcgplayer_url', '%_small%')
    .select('id');
  console.log(`Eliminadas cartas con _small en tcgplayer_url: ${badUrls?.length || 0}`);

  // 4. Limpiar tcgplayer_url de las cartas válidas si alguna todavía tiene _small
  // Verificar conteo total restante
  const { count } = await supabase.from('cards').select('*', { count: 'exact', head: true });
  console.log(`\n✅ Limpieza completada. Cartas limpias restantes en la base de datos: ${count}`);
}

main().catch(console.error);
