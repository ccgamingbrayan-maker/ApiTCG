import fs from 'fs';

async function testFetch() {
  try {
    const res = await fetch('https://raw.githubusercontent.com/buhbbl/punk-records/main/en/index/cards_by_id.json');
    if (!res.ok) throw new Error(res.statusText);
    const data = await res.json();
    console.log(Object.keys(data).slice(0, 5));
    console.log(data['OP01-001']);
  } catch(e: any) {
    console.error(e.message);
  }
}
testFetch();
