const fetch = require('node-fetch');

async function testApi() {
  try {
    const res = await fetch('https://optcgapi.com/api/cards?page=1');
    console.log(res.status);
    const data = await res.json();
    console.log(data.length ? data[0] : (data.data ? data.data[0] : data));
  } catch (e) {
    console.error(e);
  }
}

testApi();
