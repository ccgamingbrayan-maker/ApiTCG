import { searchCardsByName } from './src/scraper/tcgplayer';
(async () => {
  const results = await searchCardsByName("Imu OP08-052");
  console.log(results);
})();
