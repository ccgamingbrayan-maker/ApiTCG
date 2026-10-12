const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await browser.newPage();
  await page.goto('https://www.tcgplayer.com/search/one-piece-card-game/product?q=imu&view=grid', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(4000);
  
  const results = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('.search-result')).map(card => {
      const img = card.querySelector('img');
      return {
        name: card.querySelector('.product-card__title')?.innerText,
        imgSrc: img ? img.getAttribute('src') : 'no img'
      };
    });
  });
  
  console.log("RESULTS:", results);
  await browser.close();
})();
