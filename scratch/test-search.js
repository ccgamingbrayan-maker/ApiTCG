const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function test() {
  const query = 'zoro';
  const { data: cards, error } = await supabase
    .from('cards')
    .select('id, card_number, name, set_name, image_url')
    .or(`name.ilike.%${query}%,card_number.ilike.%${query}%,set_name.ilike.%${query}%`)
    .limit(200);

  if (error) {
    console.error('Error:', error);
    return;
  }
  console.log('Results count:', cards.length);
  const sanjis = cards.filter(c => c.name.toLowerCase().includes('sanji') || c.card_number === 'ST01-004');
  console.log('Sanjis or ST01-004 returned for query "zoro":', sanjis.length);
  sanjis.forEach(s => console.log(' - ID:', s.id, 'Num:', s.card_number, 'Name:', s.name, 'Set:', s.set_name));
}
test();
