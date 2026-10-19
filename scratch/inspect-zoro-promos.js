const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function inspectPromoZoros() {
  const { data: cards, error } = await supabase
    .from('cards')
    .select('id, card_number, name, set_name, image_url')
    .ilike('name', '%Roronoa Zoro%')
    .limit(100);

  if (error) { console.error('Error:', error); return; }

  const promos = cards.filter(c => 
    c.card_number?.startsWith('P-') ||
    c.name.includes('Release Event') ||
    c.name.includes('Pre-Release') ||
    c.name.includes('Sealed Battle') ||
    c.name.includes('Live Action')
  );

  console.log(`Found ${promos.length} Zoro promo cards:`);
  promos.forEach(c => {
    console.log(`- CardNum: [${c.card_number}] | Name: [${c.name}] | URL: [${c.image_url}]`);
  });
}
inspectPromoZoros();
