const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkAll() {
  // 1. Check all cards with 'zoro' in name
  const { data: zoroCards, error: err1 } = await supabase
    .from('cards')
    .select('id, card_number, name, set_name, image_url')
    .ilike('name', '%zoro%');

  console.log('Total Zoro cards:', zoroCards?.length);
  const suspiciousZoro = zoroCards?.filter(c => 
    c.card_number?.includes('004') || 
    c.image_url?.includes('004') ||
    c.name.toLowerCase().includes('sanji')
  );
  console.log('Suspicious Zoro cards:', suspiciousZoro);

  // 2. Check all cards with 'sanji' in name
  const { data: sanjiCards, error: err2 } = await supabase
    .from('cards')
    .select('id, card_number, name, set_name, image_url')
    .ilike('name', '%sanji%');

  console.log('Total Sanji cards:', sanjiCards?.length);
  const suspiciousSanji = sanjiCards?.filter(c =>
    c.card_number === 'ST01-013' ||
    c.image_url?.includes('013')
  );
  console.log('Suspicious Sanji cards:', suspiciousSanji);

  // 3. Check ST01 cards
  const { data: st01Cards } = await supabase
    .from('cards')
    .select('id, card_number, name, image_url')
    .ilike('card_number', 'ST01%');
  console.log('ST01 cards count:', st01Cards?.length);
  st01Cards?.forEach(c => {
    if (c.card_number === 'ST01-004' || c.card_number === 'ST01-013') {
      console.log(`ST01: ${c.card_number} | ${c.name} | ${c.image_url}`);
    }
  });
}
checkAll();
