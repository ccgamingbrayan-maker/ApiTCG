require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
(async () => {
  const { data } = await supabase.from('cards').select('image_url').eq('tcgplayer_id', 657345).single();
  console.log("DB IMAGE URL:", data.image_url);
})();
