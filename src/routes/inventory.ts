import { Router, Request, Response } from 'express';
import {
  getAllInventory,
  getCardCopies,
  addInventoryRecord,
  updateInventoryRecord,
  deleteInventoryRecord
} from '../services/inventoryService';
import { scrapeCardByUrl } from '../scraper/tcgplayer';
import { upsertCard } from '../services/cardService';

export const inventoryRouter = Router();

// GET /api/inventory
inventoryRouter.get('/', async (req: Request, res: Response) => {
  try {
    const summary = await getAllInventory();
    return res.json({ success: true, data: summary });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ success: false, error: message });
  }
});

// GET /api/inventory/card/:cardId
inventoryRouter.get('/card/:cardId', async (req: Request, res: Response) => {
  try {
    const cardId = req.params.cardId;
    const copies = await getCardCopies(cardId);
    return res.json({ success: true, data: copies });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ success: false, error: message });
  }
});

// POST /api/inventory
inventoryRouter.post('/', async (req: Request, res: Response) => {
  try {
    let { card_id, quantity, purchase_price, condition, notes, url } = req.body;

    // Si no tenemos card_id pero viene la URL de la carta, rasparla y registrarla primero
    if ((!card_id || card_id === 'undefined') && url) {
      try {
        console.log(`[Inventory] Auto-scraping card from URL: ${url}`);
        const scraped = await scrapeCardByUrl(url);
        if (scraped) {
          const card = await upsertCard(scraped);
          card_id = card.id;
        }
      } catch (scrapeErr) {
        console.error('[Inventory] Error auto-scraping card:', scrapeErr);
      }
    }

    if (!card_id || card_id === 'undefined') {
      return res.status(400).json({ success: false, error: 'card_id no válido o la carta no existe en la base de datos' });
    }

    const item = await addInventoryRecord({
      card_id,
      quantity: Number(quantity) || 1,
      purchase_price: Number(purchase_price) || 0,
      condition,
      notes
    });

    return res.status(201).json({ success: true, data: item });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ success: false, error: message });
  }
});

// PUT /api/inventory/:id
inventoryRouter.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { quantity, purchase_price, condition, notes } = req.body;

    const ok = await updateInventoryRecord(id, {
      quantity: quantity !== undefined ? Number(quantity) : undefined,
      purchase_price: purchase_price !== undefined ? Number(purchase_price) : undefined,
      condition,
      notes
    });

    if (!ok) {
      return res.status(404).json({ success: false, error: 'Registro no encontrado' });
    }

    return res.json({ success: true, message: 'Registro actualizado' });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ success: false, error: message });
  }
});

// DELETE /api/inventory/:id
inventoryRouter.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const ok = await deleteInventoryRecord(id);
    if (!ok) {
      return res.status(404).json({ success: false, error: 'Registro no encontrado' });
    }
    return res.json({ success: true, message: 'Registro eliminado' });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ success: false, error: message });
  }
});
