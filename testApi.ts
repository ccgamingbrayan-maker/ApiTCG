async function testApi() {
  try {
    const res = await fetch('https://api.onepiececardgame.dev/v1/cards?limit=10');
    console.log('dev API status:', res.status);
    const data = await res.json();
    console.log('dev API:', data[0] || data.data?.[0]);
  } catch(e) {
    console.error('dev API error:', e.message);
  }

  try {
    const res = await fetch('https://optcgapi.com/api/cards');
    console.log('optcgapi API status:', res.status);
    const data = await res.json();
    console.log('optcgapi API:', data[0] || data.data?.[0]);
  } catch(e) {
    console.error('optcgapi API error:', e.message);
  }
}

testApi();
