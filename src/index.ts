import * as dotenv from 'dotenv';
dotenv.config();

import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import cors from 'cors';
import { cardsRouter } from './routes/cards';
import { aiRouter } from './routes/ai';
import { inventoryRouter } from './routes/inventory';
import { decksRouter } from './routes/decks';

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
// Serve static frontend
app.use(express.static(path.join(__dirname, '../public')));

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
      return res.sendFile(path.join(__dirname, '../public', rawUrl));
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
