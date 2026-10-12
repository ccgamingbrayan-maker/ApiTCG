import { createBrowser, createStealthPage } from './src/scraper/tcgplayer';

(async () => {
  const browser = await createBrowser();
  const page = await createStealthPage(browser);
  const searchUrl = `https://www.tcgplayer.com/search/one-piece-card-game/product?q=${encodeURIComponent('Gloriosa OP10-046')}&view=grid`;
  console.log("Navigating to:", searchUrl);
  await page.goto(searchUrl, { waitUntil: 'domcontentloaded' });
  console.log("Final URL:", page.url());
  
  const cards = page.locator('.search-result');
  const count = await cards.count();
  console.log("Found cards:", count);
  
  await browser.close();
})();
