import { chromium, Browser, Page } from 'playwright';
import { execSync } from 'child_process';
import { ScrapedCardData, CardContext } from '../types';

const TCGPLAYER_BASE_URL = 'https://www.tcgplayer.com';
const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:125.0) Gecko/20100101 Firefox/125.0',
];

function randomUserAgent(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function createBrowser(): Promise<Browser> {
  const commonArgs = [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-blink-features=AutomationControlled',
    '--disable-infobars',
    '--disable-dev-shm-usage',
    '--disable-gpu',
  ];

  const isWin = process.platform === 'win32';
  // En Windows preferimos 'msedge' para no forzar descarga extra en local.
  // En Linux/servidores preferimos el chromium estándar de Playwright o el navegador del sistema.
  const candidates: ({ channel?: string } | undefined)[] = isWin
    ? [{ channel: 'msedge' }, { channel: 'chrome' }, {}]
    : [{}, { channel: 'chrome' }, { channel: 'chromium' }, { channel: 'msedge' }];

  let lastError: any = null;

  for (const candidate of candidates) {
    try {
      return await chromium.launch({
        ...candidate,
        headless: true,
        args: commonArgs,
      });
    } catch (err: any) {
      lastError = err;
    }
  }

  // Si falló porque no hay navegador instalado en el servidor, intentar auto-instalar chromium de Playwright
  const errStr = (lastError?.message || String(lastError)).toLowerCase();
  if (errStr.includes("executable doesn't exist") || errStr.includes('playwright install') || errStr.includes('not found')) {
    console.log('[Scraper] 🌐 Navegador no encontrado. Intentando instalar Chromium de Playwright en el servidor...');
    try {
      execSync('npx playwright install chromium', { stdio: 'inherit' });
      return await chromium.launch({
        headless: true,
        args: commonArgs,
      });
    } catch (installErr: any) {
      console.error('[Scraper] Error al auto-instalar Chromium:', installErr.message);
    }
  }

  throw new Error(`Error al iniciar navegador en el servidor: ${lastError?.message || lastError}`);
}

async function createStealthPage(browser: Browser): Promise<Page> {
  const context = await browser.newContext({
    userAgent: randomUserAgent(),
    viewport: { width: 1366, height: 768 },
    locale: 'en-US',
    timezoneId: 'America/New_York',
    extraHTTPHeaders: {
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    },
  });

  const page = await context.newPage();

  // Remove webdriver fingerprint
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
    Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
  });

  return page;
}

/**
 * Parses a price string like "$12.34" or "12.34" to a number
 */
function parsePrice(priceStr: string | null | undefined): number | null {
  if (!priceStr) return null;
  const cleaned = priceStr.replace(/[^0-9.]/g, '');
  const num = parseFloat(cleaned);
  if (isNaN(num) || num <= 0) return null;
  return num;
}

/**
 * Scrapes a single card page from TCGPlayer using the product ID URL
 * e.g. https://www.tcgplayer.com/product/12345/one-piece-card-game-...
 */
export async function scrapeCardByUrl(tcgplayerUrl: string, context?: CardContext): Promise<ScrapedCardData | null> {
  const browser = await createBrowser();
  try {
    const page = await createStealthPage(browser);

    let targetUrl = tcgplayerUrl.replace(/_small/gi, '');

    // Si es una URL de búsqueda de TCGPlayer, navegar primero para obtener el producto real
    if (targetUrl.includes('/search/')) {
      console.log(`[Scraper] 🔍 Detectada URL de búsqueda: ${targetUrl}`);
      if (context) {
        console.log(`[Scraper] 🎯 Buscando variante específica: "${context.name}" | Rareza: [${context.rarity}] | #${context.card_number} | Set: ${context.set_code}`);
      }

      await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(e => console.log('Goto search timeout/error:', e));
      await page.waitForSelector('.search-result', { timeout: 10000 }).catch(() => console.log('Timeout waiting for search-result on search URL'));
      
      // Extraer todos los candidatos con sus títulos y enlaces
      const candidates = await page.evaluate(() => {
        const results = Array.from(document.querySelectorAll('.search-result'));
        return results.map(r => {
          const a = r.querySelector('a[href*="/product/"]');
          const title = r.querySelector('.product-card__title, h2, h3, a[href*="/product/"]')?.textContent?.trim() || '';
          const setName = r.querySelector('.product-card__set-name')?.textContent?.trim() || '';
          const price = r.querySelector('.product-card__market-price--value')?.textContent?.trim() || '';
          return {
            href: a ? a.getAttribute('href') : null,
            title,
            setName,
            price
          };
        }).filter(c => c.href);
      });

      console.log(`[Scraper] Se encontraron ${candidates.length} productos en la página de búsqueda:`);
      candidates.forEach((c, idx) => {
        console.log(`   [${idx}] "${c.title}" (${c.setName}) - ${c.price}`);
      });

      let chosenProductHref: string | null = null;

      if (context && candidates.length > 0) {
        const reqRarity = (context.rarity || '').toUpperCase();
        const reqName = (context.name || '').toLowerCase();
        const reqSetCode = (context.set_code || '').toUpperCase();
        const reqSetName = (context.set_name || '').toLowerCase();

        const isReqDon = reqRarity === 'DON' || reqSetCode === 'DON' || reqName.includes('don!') || (context.card_number && context.card_number.toLowerCase().startsWith('don'));

        // Extraer palabras clave del nombre (personajes, variantes) para desempate exacto
        const cleanReqWords = reqName
          .replace(/[()[\]//_,-]/g, ' ')
          .split(/\s+/)
          .map(w => w.trim().toLowerCase())
          .filter(w => w.length > 2 && w !== 'card' && w !== 'don' && w !== 'the' && w !== 'and' && w !== 'missing');

        let bestScore = -9999;
        let bestCandidate = candidates[0];

        for (const c of candidates) {
          const t = c.title.toLowerCase();
          const s = c.setName.toLowerCase();
          let score = 0;

          const isCandidateManga = t.includes('manga') || t.includes('super parallel');
          const isCandidateSP = t.includes('(sp)') || t.includes('(spr)') || t.includes('special rare') || t.includes('special card') || t.includes('(wanted)');
          const isCandidateParallel = t.includes('parallel') || t.includes('alternate art') || t.includes('(aa)');
          const isCandidateDon = t.includes('don!!') || t.includes('don card') || t.includes('don !') || t.startsWith('don');

          if (isReqDon) {
            // Reglas específicas para cartas DON!!
            if (isCandidateDon) {
              score += 400;
            } else {
              score -= 600;
            }

            if (cleanReqWords.length > 0) {
              for (const w of cleanReqWords) {
                if (t.includes(w)) score += 250;
                else score -= 150;
              }
            } else {
              // DON!! genérica estándar
              if (t.includes('(') || t.includes('[')) score -= 150;
              else score += 200;
            }
          } else if (reqRarity === 'MANGA' || reqName.includes('manga')) {
            if (isCandidateManga) score += 300;
            else score -= 300;
          } else if (reqRarity === 'SP' || reqName.includes('(sp)') || reqName.includes('(spr)')) {
            if (isCandidateSP) score += 300;
            else score -= 300;
          } else if (reqRarity === 'L-AA') {
            // Líder Alternate Art
            if (isCandidateParallel && !isCandidateManga && !isCandidateSP) score += 200;
            else if (!isCandidateParallel) score -= 150;
          } else if (reqRarity.includes('AA') || reqRarity === 'AA') {
            // Alternate Art (SEC-AA, SR-AA, R-AA)
            if (isCandidateParallel && !isCandidateManga && !isCandidateSP) score += 200;
            else if (isCandidateManga || isCandidateSP) score -= 300;
            else score -= 100;
          } else {
            // Carta básica / normal (C, UC, R, SR, SEC, L)
            if (!isCandidateParallel && !isCandidateManga && !isCandidateSP) score += 200;
            else score -= 150;
          }

          // Bonificación si coincide el personaje en cartas normales
          if (!isReqDon && cleanReqWords.length > 0) {
            for (const w of cleanReqWords) {
              if (t.includes(w)) score += 60;
            }
          }

          // Desempate por nombre de Set o Set Code
          if (reqSetCode && (s.includes(reqSetCode.toLowerCase()) || (reqSetName && s.includes(reqSetName)))) {
            score += 50;
          }

          if (score > bestScore) {
            bestScore = score;
            bestCandidate = c;
          }
        }

        console.log(`[Scraper] 🎯 Mejor candidato seleccionado: "${bestCandidate.title}" (Score: ${bestScore})`);
        chosenProductHref = bestCandidate.href;
      } else if (candidates.length > 0) {
        chosenProductHref = candidates[0].href;
      }

      if (chosenProductHref) {
        targetUrl = chosenProductHref.startsWith('http') ? chosenProductHref : `${TCGPLAYER_BASE_URL}${chosenProductHref}`;
        console.log(`[Scraper] Redirigiendo a producto específico: ${targetUrl}`);
      }
    }

    console.log(`[Scraper] Navigating to: ${targetUrl}`);
    await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(e => console.log('Goto timeout/error, continuing anyway...'));
    
    // Esperar explícitamente a que cargue el nombre del producto en el DOM
    await page.waitForSelector('h1.product-details__name, .product-details__name, h1', { timeout: 15000 }).catch(() => console.log('Timeout waiting for card name'));

    // Esperar dinámicamente a que aparezca la guía de precios (Market Price o Most Recent Sale)
    // Se resuelve inmediatamente en cuanto esté lista (sin demorarse de más), o da hasta 3.5s si la API tarda 1-2s
    await page.waitForFunction(() => {
      const guide = document.querySelector('.price-guide__points, .price-points, section.product-card__market-price');
      const txt = guide?.textContent || '';
      return txt.includes('$') || txt.includes('Market Price') || txt.includes('Most Recent Sale');
    }, { timeout: 3500 }).catch(() => {});

    // Extract TCGPlayer product ID from URL
    const urlMatch = targetUrl.match(/\/product\/(\d+)/);
    const tcgplayer_id = urlMatch ? parseInt(urlMatch[1]) : 0;

    // --- Card metadata and prices using instantaneous page.evaluate ---
    const rawData = await page.evaluate(() => {
      const priceGuideTxt = document.querySelector('.price-guide__points')?.textContent || '';
      const marketMatch = priceGuideTxt.match(/Market Price\s*\$?([0-9,.]+)/);
      const saleMatch = priceGuideTxt.match(/Most Recent Sale\s*\$?([0-9,.]+)/);

      const imgEl = document.querySelector('.product-view__image img, .lazy-image__wrapper img, .product-details__image img, img.product-image');
      let rawImg = imgEl?.getAttribute('src') || imgEl?.getAttribute('data-src') || null;
      if (rawImg && rawImg.startsWith('//')) rawImg = 'https:' + rawImg;

      return {
        name: document.querySelector('h1')?.textContent?.trim() || null,
        setName: document.querySelector('.product-details__set-name a, .product-details__set-name')?.textContent?.trim() || null,
        cardNumber: document.querySelector('.product-details__number, .product-details__description')?.textContent?.trim() || null,
        rarity: document.querySelector('.product-details__rarity')?.textContent?.trim() || null,
        imageUrl: rawImg,
        
        marketPrice: marketMatch ? marketMatch[1] : (document.querySelector('.price-point--market .price-point__data, section.product-card__market-price span.product-card__market-price--value')?.textContent?.trim() || null),
        lowPrice: document.querySelector('.price-guide__low .price-point__data')?.textContent?.trim() || null,
        midPrice: document.querySelector('.price-guide__mid .price-point__data')?.textContent?.trim() || null,
        highPrice: document.querySelector('.price-guide__high .price-point__data')?.textContent?.trim() || null,
        directLow: document.querySelector('.price-guide__direct-low .price-point__data')?.textContent?.trim() || null,
        lastSale: saleMatch ? saleMatch[1] : (document.querySelector('.price-point--last-sale .price-point__data')?.textContent?.trim() || null)
      };
    });

    const setCodeMatch = (rawData.setName ?? '').match(/\[([A-Z0-9-]+)\]/);
    const setCode = setCodeMatch ? setCodeMatch[1] : '';

    const recentSales: ScrapedCardData['recent_sales'] = [];
    try {
      // Desplazarse ligeramente hacia la guía de precios para asegurar que el botón esté renderizado
      await page.evaluate(() => {
        const el = document.querySelector('.price-guide__points, .product-details__price-guide, section.product-card__market-price');
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        else window.scrollBy(0, 350);
      }).catch(() => {});

      // 1. Hacer click en "View More Data"
      let modalOpened = false;
      try {
        const viewMoreBtn = page.getByText('View More Data').first();
        if (await viewMoreBtn.isVisible({ timeout: 2500 }).catch(() => false)) {
          await viewMoreBtn.click({ force: true });
          modalOpened = true;
        } else {
          const altBtn = page.locator('button:has-text("View More"), .price-guide__points button, .price-points button').first();
          if (await altBtn.isVisible({ timeout: 1500 }).catch(() => false)) {
            await altBtn.click({ force: true });
            modalOpened = true;
          }
        }
      } catch (e) {
        // Ignorar si el botón no está disponible
      }
      
      if (modalOpened) {
        // 2. Espera DINÁMICA a que aparezcan las filas reales de ventas en el modal
        // Si cargan en 300ms, avanza inmediatamente (sin demoras innecesarias).
        // Si la red de TCGPlayer tarda 1 o 2 segundos, espera de forma reactiva hasta 4s max.
        await page.waitForFunction(() => {
          const rows = Array.from(document.querySelectorAll('.modal__content tr, dialog tr, .latest-sales__row, .sales-history-snapshot li, .modal__content li'));
          return rows.some(r => {
            const txt = r.textContent || '';
            return txt.includes('$') && /\d{1,2}\/\d{1,2}\/\d{2}/.test(txt) && !txt.includes('12/12/12') && !txt.includes('$0.00');
          });
        }, { timeout: 4000 }).catch(() => {
          console.log('[Scraper] Polling de ventas terminado o sin ventas registradas en modal');
        });

        // Micro-pausa de 150ms para que se completen de pintar todas las celdas
        await sleep(150);

        // 3. Extraer las últimas 3 ventas de la ventana flotante
        const sales = await page.evaluate(() => {
          const rows = Array.from(document.querySelectorAll('.modal__content tr, dialog tr, .latest-sales__row, .sales-history-snapshot li, .modal__content li')).filter(r => {
            const txt = r.textContent || '';
            // Descartar fechas dummy y ventas de $0.00
            if (txt.includes('12/12/12') || txt.includes('$0.00') || txt.includes('$0 ')) return false;
            // Debe ser visible dentro del modal
            if ((r as HTMLElement).offsetParent === null && !(r as HTMLElement).closest('dialog[open], .modal__content')) return false;
            return txt.includes('$') && /\d{1,2}\/\d{1,2}\/\d{2}/.test(txt);
          });
          
          return rows.slice(0, 3).map(function(r) {
            const cells = Array.from(r.querySelectorAll('td, span, div.cell'));
            if (cells.length > 0) {
              const date = cells[0]?.textContent?.trim() || '';
              const priceCell = cells.find(c => c.textContent?.includes('$'));
              const price = priceCell ? priceCell.textContent?.trim() : '';
              const condition = cells[1] ? cells[1].textContent?.replace(/\n/g, ' ').trim() : 'Near Mint';
              
              if (date && price && date !== '12/12/12' && !price.includes('$0.00')) {
                 return { date, condition, price };
              }
            }
            return null;
          }).filter(Boolean);
        });
        
        for (const s of sales) {
          if (s && s.price && s.date) {
             const salePrice = parsePrice(s.price);
             if (salePrice !== null && salePrice > 0 && s.date !== '12/12/12') {
               recentSales.push({
                 sale_price: salePrice,
                 sale_date: s.date,
                 condition: s.condition || 'Near Mint'
               });
             }
          }
        }
      }
    } catch (e) {
      console.warn('[Scraper] Could not extract sales history:', e);
    }

    // Si lastSale no se capturó en la primera lectura, re-verificar si la cabecera ya se actualizó
    if (!rawData.lastSale) {
      const updatedLastSale = await page.evaluate(() => {
        const priceGuideTxt = document.querySelector('.price-guide__points')?.textContent || '';
        const saleMatch = priceGuideTxt.match(/Most Recent Sale\s*\$?([0-9,.]+)/);
        if (saleMatch) return saleMatch[1];
        return document.querySelector('.price-point--last-sale .price-point__data')?.textContent?.trim() || null;
      }).catch(() => null);
      if (updatedLastSale) {
        rawData.lastSale = updatedLastSale;
      }
    }

    if (!rawData.name) {
      console.warn('[Scraper] Could not extract card name — page may have changed or card not found');
      return null;
    }

    const cleanNumber = (rawData.cardNumber ?? '').replace(/[^A-Z0-9-]/gi, '') || context?.card_number || '';
    const cleanSetCode = setCode || context?.set_code || '';
    const cleanRarity = context?.rarity || rawData.rarity || '';
    const cleanName = context?.name && context.name.length > 3 ? context.name : (rawData.name || '');

    // Construir imagen en máxima resolución desde el CDN de TCGPlayer
    let bestImageUrl = rawData.imageUrl;
    if (tcgplayer_id && tcgplayer_id > 0) {
      bestImageUrl = `https://tcgplayer-cdn.tcgplayer.com/product/${tcgplayer_id}_in_1000x1000.jpg`;
    } else if (bestImageUrl) {
      bestImageUrl = bestImageUrl
        .replace(/_in_\d+x\d+/i, '_in_1000x1000')
        .replace(/_\d+w\./i, '_400w.')
        .replace(/_small\./i, '.');
    }

    // Si la cabecera no tenía lastSale pero el modal sí capturó ventas, la primera venta es el Last Sale más reciente
    const parsedLastSale = parsePrice(rawData.lastSale);
    const fallbackLastSale = (recentSales.length > 0 && recentSales[0].sale_price) ? recentSales[0].sale_price : null;
    const finalLastSalePrice = parsedLastSale ?? fallbackLastSale;

    return {
      card_id: context?.card_id,
      tcgplayer_id,
      name: cleanName,
      set_name: rawData.setName ?? context?.set_name ?? '',
      set_code: cleanSetCode,
      card_number: cleanNumber,
      rarity: cleanRarity,
      image_url: bestImageUrl,
      tcgplayer_url: targetUrl,
      prices: {
        market_price: parsePrice(rawData.marketPrice),
        low_price: parsePrice(rawData.lowPrice),
        mid_price: parsePrice(rawData.midPrice),
        high_price: parsePrice(rawData.highPrice),
        direct_low_price: parsePrice(rawData.directLow),
        last_sale_price: finalLastSalePrice,
      },
      recent_sales: recentSales,
    };
  } finally {
    await browser.close();
  }
}

/**
 * Searches TCGPlayer for One Piece cards by name
 * Returns an array of product URLs found in the search results
 */
export async function searchCardsByName(cardName: string): Promise<Array<{ name: string; url: string; price: string | null }>> {
  const browser = await createBrowser();
  try {
    const page = await createStealthPage(browser);
    let cleanName = cardName.replace(/_small(\.[a-z0-9]+)?/gi, '').replace(/_p\d+/gi, '').trim();
    if (cleanName.toLowerCase() === 'don' || cleanName.toLowerCase() === 'don!' || cleanName.toLowerCase() === 'don!!') {
      cleanName = 'DON!! Card';
    } else if (cleanName.toLowerCase().startsWith('don ') || cleanName.toLowerCase().startsWith('don! ') || cleanName.toLowerCase().startsWith('don!! ')) {
      const rest = cleanName.replace(/^don!* /i, '').trim();
      cleanName = `DON!! Card ${rest}`;
    }
    const searchUrl = `${TCGPLAYER_BASE_URL}/search/one-piece-card-game/product?q=${encodeURIComponent(cleanName)}&view=grid`;

    console.log(`[Scraper] Searching for "${cleanName}": ${searchUrl}`);
    await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(e => console.log('Goto timeout/error, continuing anyway...'));
    
    // Esperar explícitamente a que las cartas de resultado aparezcan en pantalla
    await page.waitForSelector('.search-result', { timeout: 15000 }).catch(() => console.log('Timeout waiting for search results'));
    await sleep(1000 + Math.random() * 1000);

    const results: Array<{ name: string; url: string; price: string | null; image_url?: string | null }> = [];

    const cards = page.locator('.search-result');
    const count = await cards.count();
    console.log(`[Scraper] Encontradas ${count} cartas en los resultados.`);

    for (let i = 0; i < Math.min(count, 10); i++) {
      try {
        const card = cards.nth(i);
        const a = card.locator('a').first();
        if (await a.count() === 0) continue;
        
        const linkEl = await a.getAttribute('href');
        if (!linkEl) continue;

        const titleLoc = card.locator('.product-card__title');
        const nameEl = await titleLoc.count() > 0 ? await titleLoc.innerText() : 'Sin Nombre';

        const priceLoc = card.locator('.product-card__market-price--value');
        const priceEl = await priceLoc.count() > 0 ? await priceLoc.innerText() : null;

        const imgLoc = card.locator('img');
        let imgEl = await imgLoc.count() > 0 ? await imgLoc.first().getAttribute('src') : null;

        // Si el enlace tiene el ID de producto de TCGPlayer, garantizar imagen en alta resolución (1000x1000)
        const pidMatch = linkEl.match(/\/product\/(\d+)/);
        if (pidMatch) {
          imgEl = `https://tcgplayer-cdn.tcgplayer.com/product/${pidMatch[1]}_in_1000x1000.jpg`;
        } else if (imgEl) {
          imgEl = imgEl.replace(/_in_\d+x\d+/i, '_in_1000x1000').replace(/_\d+w\./i, '_400w.');
        }

        results.push({
          name: nameEl.trim(),
          url: linkEl.startsWith('http') ? linkEl : `${TCGPLAYER_BASE_URL}${linkEl}`,
          price: priceEl?.trim() ?? null,
          image_url: imgEl,
        });
      } catch (e) {
        console.error("Error extrayendo carta:", e);
      }
    }

    return results;
  } finally {
    await browser.close();
  }
}
