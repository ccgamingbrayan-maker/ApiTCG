import * as dotenv from 'dotenv';
dotenv.config();

import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import cors from 'cors';
import { cardsRouter } from './routes/cards';
import { aiRouter } from './routes/ai';
import { inventoryRouter } from './routes/inventory';
import { decksRouter } from './routes/decks';
import { resolveCardImageUrl } from './services/cardService';
import { getPromoStorageUrl } from './utils/promoMap';

const app = express();
const PORT = parseInt(process.env.PORT ?? '3000', 10);

// ─── Middleware ──────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Request logger
app.use((req: Request, _res: Response, next: NextFunction) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// ─── Routes ─────────────────────────────────────────────────────────────────
// Dynamic fallback for card images: if local file is present on disk, serve it;
// otherwise, redirect directly to guaranteed public CDN (vital for production deployments)
app.get('/images/cards/:filename', (req: Request, res: Response) => {
  const filename = req.params.filename;
  const localPath = path.resolve(process.cwd(), 'public/images/cards', filename);
  if (fs.existsSync(localPath)) {
    return res.sendFile(localPath);
  }

  // Extraer código base de la carta (ej: OP07-113_pr2 -> OP07-113, ST02-007_r1 -> ST02-007, P-085_pr1 -> P-085)
  const cleanName = filename.replace(/\.(jpg|jpeg|png|webp)$/i, '');
  const baseCodeMatch = cleanName.match(/^([A-Z0-9]+-[A-Z0-9]+)/i);
  const baseCode = baseCodeMatch ? baseCodeMatch[1].toUpperCase() : cleanName.split('_')[0].toUpperCase();

  // Si es promocional P-xxx, redirigir a Supabase Storage público con su extensión correcta (.png o .jpg o nombre de variante)
  if (baseCode.startsWith('P-')) {
    const promoUrl = getPromoStorageUrl(cleanName);
    return res.redirect(302, promoUrl);
  }

  // Si es carta de set (OP, ST, EB, PRB), redirigir a la imagen base correspondiente a su propio código
  if (baseCode.includes('-')) {
    return res.redirect(302, `https://www.optcgapi.com/media/static/Card_Images/${baseCode}.jpg`);
  }

  const resolved = resolveCardImageUrl(`/images/cards/${filename}`);
  if (resolved && resolved.startsWith('http')) {
    return res.redirect(302, resolved);
  }

  return res.status(404).send('Card image not found');
});

// Serve static frontend
app.use(express.static(path.join(__dirname, '../public')));

// ─── Documentation Routes (AI & Developers) ──────────────────────────────────
app.get('/docs', (_req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, '../public/docs.html'));
});

app.get('/llms.txt', (_req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.sendFile(path.join(__dirname, '../public/llms.txt'));
});

app.get('/api/docs', (req: Request, res: Response) => {
  const baseUrl = `${req.protocol}://${req.get('host')}`;
  res.json({
    name: 'One Piece TCG API',
    version: '1.0.0',
    description: 'API for One Piece TCG price tracking, market analysis, card OCR with Gemini AI, inventory management, and deck building.',
    base_url: baseUrl,
    production_url: 'https://www.basecc.cyou',
    documentation_url: '/docs',
    llms_txt_url: '/llms.txt',
    endpoints: {
      cards: [
        { method: 'GET', path: '/api/cards/sets', description: 'List all official card sets with card counts' },
        { method: 'GET', path: '/api/cards/saved', query: { set: 'optional string', rarity: 'optional string' }, description: 'Get saved cards in DB' },
        { method: 'GET', path: '/api/cards/search', query: { q: 'required string (min 2 chars)', limit: 'optional number' }, description: 'Fast DB card search' },
        { method: 'GET', path: '/api/cards/tcg-search', query: { q: 'required string', count: 'optional number' }, description: 'Live TCGPlayer search scrape' },
        { method: 'GET', path: '/api/cards/:id', description: 'Complete price summary, 7d/30d/90d metrics, sales history' },
        { method: 'GET', path: '/api/cards/:id/prices', query: { days: 'optional number (default 30)' }, description: 'Price snapshots history' },
        { method: 'GET', path: '/api/cards/:id/sales', query: { days: 'optional number (default 30)' }, description: 'Sales history' },
        { method: 'POST', path: '/api/cards/scrape', body: { card_number: 'string', card_name: 'string', url: 'string', tcgplayer_id: 'number' }, description: 'Live scrape from TCGPlayer and store in DB' },
        { method: 'POST', path: '/api/cards/:id/refresh', description: 'Re-scrape current market price for existing card' }
      ],
      ai: [
        { method: 'POST', path: '/api/ai/identify', body: { imageBase64: 'string (base64 image)' }, description: 'Recognize card number or DON!! variant from camera photo using Gemini Vision OCR' }
      ],
      inventory: [
        { method: 'GET', path: '/api/inventory', description: 'Get all user inventory items with total value metrics' },
        { method: 'GET', path: '/api/inventory/card/:cardId', description: 'Get copies of specific card in inventory' },
        { method: 'POST', path: '/api/inventory', body: { card_id: 'string', quantity: 'number', purchase_price: 'number', condition: 'string', notes: 'string', url: 'optional auto-scrape url' }, description: 'Add card copies to inventory' },
        { method: 'PUT', path: '/api/inventory/:id', body: { quantity: 'number', purchase_price: 'number', condition: 'string', notes: 'string' }, description: 'Update inventory record' },
        { method: 'DELETE', path: '/api/inventory/:id', description: 'Delete inventory record' }
      ],
      decks: [
        { method: 'POST', path: '/api/decks/analyze', body: { text: 'string (OPTCGSim card list)', name: 'optional string' }, description: 'Analyze deck list against user inventory and compute missing cards' },
        { method: 'GET', path: '/api/decks', description: 'List saved deck projects' },
        { method: 'POST', path: '/api/decks', body: 'DeckAnalysisResult object', description: 'Save or update deck project' },
        { method: 'DELETE', path: '/api/decks/:id', description: 'Delete deck project' }
      ],
      utilities: [
        { method: 'GET', path: '/images/cards/:filename', description: 'Card image fallback resolver' },
        { method: 'GET', path: '/api/proxy-image', query: { url: 'required string' }, description: 'Image proxy for canvas deck export' }
      ]
    }
  });
});

app.use('/api/cards', cardsRouter);
app.use('/api/ai', aiRouter);
app.use('/api/inventory', inventoryRouter);
app.use('/api/decks', decksRouter);

// Proxy image endpoint to prevent canvas CORS taints when rendering deck images
app.get('/api/proxy-image', async (req: Request, res: Response) => {
  try {
    const rawUrl = req.query.url as string;
    if (!rawUrl) return res.status(400).send('Missing url parameter');

    if (rawUrl.startsWith('/') && !rawUrl.startsWith('//')) {
      const localFile = path.join(__dirname, '../public', rawUrl);
      if (fs.existsSync(localFile)) {
        return res.sendFile(localFile);
      }
      const resolved = resolveCardImageUrl(rawUrl);
      if (resolved && resolved.startsWith('http')) {
        const response = await fetch(resolved);
        if (!response.ok) return res.status(response.status).send('Failed to fetch image');
        const contentType = response.headers.get('content-type') || 'image/jpeg';
        res.setHeader('Content-Type', contentType);
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Cache-Control', 'public, max-age=86400');
        const arrayBuffer = await response.arrayBuffer();
        return res.send(Buffer.from(arrayBuffer));
      }
      return res.status(404).send('Image not found');
    }

    const response = await fetch(rawUrl);
    if (!response.ok) return res.status(response.status).send('Failed to fetch image');

    const contentType = response.headers.get('content-type') || 'image/jpeg';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    const arrayBuffer = await response.arrayBuffer();
    return res.send(Buffer.from(arrayBuffer));
  } catch (err) {
    return res.status(500).send('Proxy image error');
  }
});

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({ success: false, error: 'Route not found' });
});

// Error handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[Server Error]', err.stack ?? err.message);
  res.status(500).json({ success: false, error: err.message });
});

// ─── Start ───────────────────────────────────────────────────────────────────
const server = app.listen(PORT, () => {
  console.log(`\n🚀 One Piece TCG Price API`);
  console.log(`   Running at: http://localhost:${PORT}`);
  console.log(`   Environment: ${process.env.NODE_ENV ?? 'development'}\n`);
});

server.on('error', (err: NodeJS.ErrnoException) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n❌ Port ${PORT} already in use! Kill existing node processes first:\n   npx kill-port ${PORT}\n`);
  } else {
    console.error('❌ Server error:', err);
  }
  process.exit(1);
});

export default app;
