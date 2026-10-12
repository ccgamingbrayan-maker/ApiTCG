require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

(async () => {
  // Ver lo que hay guardado
  const { data } = await supabase.from('sale_history').select('*');
  console.log("VENTAS GUARDADAS:", data);
  
  // Borrar los encabezados malos que se guardaron por error
  const { error } = await supabase.from('sale_history')
    .delete()
    .not('sale_date', 'like', '%/%'); // Borrar todo lo que no tenga un slash de fecha
    
  if (error) console.log("ERROR BORRANDO:", error);
  else console.log("Datos malos borrados correctamente.");
})();
