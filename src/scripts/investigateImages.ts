import { supabase } from '../config/supabase';

async function investigate() {
  const testNumbers = ['OP01-120', 'OP01-001', 'OP01-025', 'OP01-121', 'OP05-060', 'OP05-069', 'OP05-119'];

  for (const num of testNumbers) {
    const { data } = await supabase
      .from('cards')
      .select('id, card_number, name, rarity, image_url, set_code')
      .eq('card_number', num);

    console.log(`\n=================== ${num} (Total en DB: ${data?.length || 0}) ===================`);
    data?.forEach(c => {
      console.log(`  ID: ${c.id}`);
      console.log(`  Nombre: ${c.name}`);
      console.log(`  Rareza: ${c.rarity}`);
      console.log(`  Imagen: ${c.image_url}`);
    });
  }
}

investigate();
