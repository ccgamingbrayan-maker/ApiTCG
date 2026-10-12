import { Router, Request, Response } from 'express';
import {
  analyzeDeckList,
  readSavedDecks,
  saveDeckProject,
  deleteDeckProject
} from '../services/deckService';

export const decksRouter = Router();

// POST /api/decks/analyze
decksRouter.post('/analyze', async (req: Request, res: Response) => {
  try {
    const { text, name } = req.body as { text?: string; name?: string };

    if (!text || text.trim().length === 0) {
      return res.status(400).json({ success: false, error: 'Por favor ingresa o pega una lista de cartas' });
    }

    const analysis = await analyzeDeckList(text, name || 'Nuevo Proyecto de Deck');
    return res.json({ success: true, data: analysis });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[Decks] Error analizando deck:', message);
    return res.status(500).json({ success: false, error: message });
  }
});

// GET /api/decks
decksRouter.get('/', async (_req: Request, res: Response) => {
  try {
    const decks = readSavedDecks();
    return res.json({ success: true, data: decks });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ success: false, error: message });
  }
});

// POST /api/decks (Guardar / Actualizar proyecto)
decksRouter.post('/', async (req: Request, res: Response) => {
  try {
    const deckData = req.body;
    if (!deckData || !deckData.cards || !deckData.raw_list) {
      return res.status(400).json({ success: false, error: 'Datos de deck incompletos' });
    }

    const saved = await saveDeckProject(deckData);
    return res.status(201).json({ success: true, data: saved });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ success: false, error: message });
  }
});

// DELETE /api/decks/:id
decksRouter.delete('/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    const deleted = deleteDeckProject(id);
    if (!deleted) {
      return res.status(404).json({ success: false, error: 'Deck no encontrado' });
    }
    return res.json({ success: true, message: 'Deck eliminado correctamente' });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ success: false, error: message });
  }
});
