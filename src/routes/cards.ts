import { Router, Request, Response } from 'express';
import { scrapeCardByUrl, searchCardsByName } from '../scraper/tcgplayer';
import {
  upsertCard,
  savePriceSnapshot,
  saveSalesHistory,
  buildPriceSummary,
  searchCards,
  getAllSavedCards,
  getCardSets,
  getSavedCardsBySet,
  getCardById,
  getCardByTcgplayerId,
  getPriceHistory,
  getSaleHistory,
} from '../services/cardService';
import { ApiResponse } from '../types';

export const cardsRouter = Router();

// ─── POST /api/cards/scrape ──────────────────────────────────────────────────
// Scrape a card from TCGPlayer by URL, save to DB and return full price summary
cardsRouter.post('/scrape', async (req: Request, res: Response) => {
  const { url, tcgplayer_id, card_id, card_name, rarity, card_number, set_code, set_name } = req.body as {
    url?: string;
    tcgplayer_id?: number;
    card_id?: string;
    card_name?: string;
    rarity?: string;
    card_number?: string;
    set_code?: string;
    set_name?: string;
  };

  if (!url && !tcgplayer_id && !card_id && !card_number) {
    return res.status(400).json({ success: false, error: 'Provide either "url", "tcgplayer_id", or card identifiers' } as ApiResponse<null>);
  }

  let targetUrl = url;
  if (targetUrl) {
    targetUrl = targetUrl.replace(/_small(\.[a-z0-9]+)?/gi, '');
  }
  if (!targetUrl && tcgplayer_id) {
    targetUrl = `https://www.tcgplayer.com/product/${tcgplayer_id}`;
  }
  if (!targetUrl && card_number) {
    targetUrl = `https://www.tcgplayer.com/search/one-piece-card-game/product?q=${encodeURIComponent(card_number)}`;
  }

  const isDon = rarity === 'DON' || set_code === 'DON' || (card_number && card_number.toLowerCase().startsWith('don')) || (card_name && card_name.includes('DON!!'));
  if (isDon) {
    const isSearchUrl = !targetUrl || targetUrl.includes('/search/') || targetUrl.includes('?q=');
    if (isSearchUrl && card_name) {
      const cleanSearchName = card_name
        .replace(/Missing Card \(Don\)/i, 'DON!! Card')
        .replace(/[()[\]]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      targetUrl = `https://www.tcgplayer.com/search/one-piece-card-game/product?q=${encodeURIComponent(cleanSearchName)}&view=grid`;
    }
  }

  try {
    console.log(`[Route] Scraping: ${targetUrl} (Variant: "${card_name ?? ''}" [${rarity ?? ''}])`);
    const scraped = await scrapeCardByUrl(targetUrl!, {
      card_id,
      name: card_name,
      rarity,
      card_number,
      set_code,
      set_name
    });

    if (!scraped) {
      if (card_id) {
        const existing = await buildPriceSummary(card_id);
        if (existing) {
          console.log(`[Route] Scrape retornó null, devolviendo datos existentes de DB para: ${card_id}`);
          return res.json({ success: true, data: existing } as ApiResponse<typeof existing>);
        }
      }
      return res.status(404).json({ success: false, error: 'Card not found or page structure changed' } as ApiResponse<null>);
    }

    if (card_id) {
      scraped.card_id = card_id;
    }

    // Persist everything
    const card = await upsertCard(scraped);
    const snapshot = await savePriceSnapshot(card.id, scraped.prices);
    await saveSalesHistory(card.id, scraped.recent_sales);

    // Build full summary
    const summary = await buildPriceSummary(card.id);

    return res.json({ success: true, data: summary } as ApiResponse<typeof summary>);
  } catch (err: unknown) {
    if (card_id) {
      try {
        const existing = await buildPriceSummary(card_id);
        if (existing) {
          console.log(`[Route] Scrape falló por error de entorno, devolviendo datos existentes de DB para: ${card_id}`);
          return res.json({ success: true, data: existing } as ApiResponse<typeof existing>);
        }
      } catch {}
    }
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[Route] Scrape error: ${message}`);
    return res.status(500).json({ success: false, error: message } as ApiResponse<null>);
  }
});

// ─── GET /api/cards/sets ───────────────────────────────────────────────────
// Get all sets / folders summary with card count and sample image
cardsRouter.get('/sets', async (req: Request, res: Response) => {
  try {
    const sets = await getCardSets();
    return res.json({ success: true, data: sets } as ApiResponse<typeof sets>);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ success: false, error: message } as ApiResponse<null>);
  }
});

// ─── GET /api/cards/saved ───────────────────────────────────────────────────
// Get cards currently saved in the local DB (optionally filtered by ?set=DON)
cardsRouter.get('/saved', async (req: Request, res: Response) => {
  try {
    const setCode = req.query.set as string | undefined;
    const rarity = req.query.rarity as string | undefined;
    const cards = await getSavedCardsBySet(setCode, rarity);
    return res.json({ success: true, data: cards } as ApiResponse<typeof cards>);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ success: false, error: message } as ApiResponse<null>);
  }
});

// ─── GET /api/cards/search?q=<name>&limit=<n> ───────────────────────────────
// Search cards already in DB
cardsRouter.get('/search', async (req: Request, res: Response) => {
  const query = (req.query.q as string) ?? '';
  if (!query || query.length < 2) {
    return res.status(400).json({ success: false, error: 'Query must be at least 2 characters' } as ApiResponse<null>);
  }

  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 500;
    const cards = await searchCards(query, isNaN(limit) ? 500 : limit);
    return res.json({ success: true, data: cards } as ApiResponse<typeof cards>);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ success: false, error: message } as ApiResponse<null>);
  }
});

// ─── GET /api/cards/tcg-search?q=<name>&count=<n> ───────────────────────────
// Search TCGPlayer directly (live scrape of search results)
cardsRouter.get('/tcg-search', async (req: Request, res: Response) => {
  let query = ((req.query.q as string) ?? '').trim();
  query = query.replace(/_small(\.[a-z0-9]+)?/gi, '').trim();
  if (!query || query.length < 2) {
    return res.status(400).json({ success: false, error: 'Query must be at least 2 characters' } as ApiResponse<null>);
  }

  try {
    const count = req.query.count ? parseInt(req.query.count as string, 10) : 60;
    const results = await searchCardsByName(query, isNaN(count) ? 60 : count);
    return res.json({ success: true, data: results } as ApiResponse<typeof results>);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ success: false, error: message } as ApiResponse<null>);
  }
});

// ─── GET /api/cards/:id ──────────────────────────────────────────────────────
// Get full price summary for a card already in DB
cardsRouter.get('/:id', async (req: Request, res: Response) => {
  const id = req.params['id'] as string;

  try {
    const summary = await buildPriceSummary(id);
    if (!summary) {
      return res.status(404).json({ success: false, error: 'Card not found' } as ApiResponse<null>);
    }
    return res.json({ success: true, data: summary } as ApiResponse<typeof summary>);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ success: false, error: message } as ApiResponse<null>);
  }
});

// ─── GET /api/cards/:id/prices ───────────────────────────────────────────────
// Get only price history
cardsRouter.get('/:id/prices', async (req: Request, res: Response) => {
  const id = req.params['id'] as string;
  const days = parseInt((req.query.days as string) ?? '30');

  try {
    const history = await getPriceHistory(id, isNaN(days) ? 30 : days);
    return res.json({ success: true, data: history } as ApiResponse<typeof history>);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ success: false, error: message } as ApiResponse<null>);
  }
});

// ─── GET /api/cards/:id/sales ────────────────────────────────────────────────
// Get raw sales history
cardsRouter.get('/:id/sales', async (req: Request, res: Response) => {
  const id = req.params['id'] as string;
  const days = parseInt((req.query.days as string) ?? '30');

  try {
    const sales = await getSaleHistory(id, isNaN(days) ? 30 : days);
    return res.json({ success: true, data: sales } as ApiResponse<typeof sales>);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ success: false, error: message } as ApiResponse<null>);
  }
});

// ─── POST /api/cards/:id/refresh ─────────────────────────────────────────────
// Re-scrape a card already in DB (refresh its price)
cardsRouter.post('/:id/refresh', async (req: Request, res: Response) => {
  const id = req.params['id'] as string;

  try {
    const card = await getCardById(id);
    if (!card) {
      return res.status(404).json({ success: false, error: 'Card not found in DB' } as ApiResponse<null>);
    }

    console.log(`[Route] Refreshing card: ${card.name}`);
    const scraped = await scrapeCardByUrl(card.tcgplayer_url);

    if (!scraped) {
      return res.status(502).json({ success: false, error: 'Failed to scrape card from TCGPlayer' } as ApiResponse<null>);
    }

    await upsertCard(scraped);
    await savePriceSnapshot(card.id, scraped.prices);
    await saveSalesHistory(card.id, scraped.recent_sales);

    const summary = await buildPriceSummary(card.id);
    return res.json({ success: true, data: summary, message: 'Card refreshed successfully' } as ApiResponse<typeof summary>);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ success: false, error: message } as ApiResponse<null>);
  }
});
