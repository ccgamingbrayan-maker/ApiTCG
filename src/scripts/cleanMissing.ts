import { supabase } from '../config/supabase';

async function run() {
  console.log('🧹 Limpiando cartas "Missing Card"...');
  
  const { data, error } = await supabase
    .from('cards')
    .delete()
    .like('name', 'Missing Card%');
    
  if (error) {
    console.error('Error al limpiar:', error);
  } else {
    console.log('✅ Todas las cartas "Missing Card" han sido eliminadas.');
  }
}

run();
