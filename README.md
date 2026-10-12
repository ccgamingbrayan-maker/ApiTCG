# 🃏 One Piece TCG Price API

API propia para consultar y analizar precios de cartas del One Piece Card Game usando datos reales de TCGPlayer (historial de precios + last sale).

## Stack

| Capa | Tecnología |
|------|-----------|
| Runtime | Node.js + TypeScript |
| Framework | Express 5 |
| Scraping | Playwright (Chromium headless) |
| Base de datos | Supabase (PostgreSQL) |

---

## Setup

### 1. Clonar y instalar dependencias

```bash
npm install
npx playwright install chromium
```

### 2. Configurar Supabase

1. Crea un proyecto en [supabase.com](https://supabase.com)
2. Ve a **SQL Editor** y ejecuta el contenido de [`supabase/schema.sql`](./supabase/schema.sql)
3. Ve a **Settings → API** y copia tu `Project URL` y `anon public key`

### 3. Configurar variables de entorno

```bash
cp .env.example .env
```

Edita `.env`:
```env
SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5c...
PORT=3000
NODE_ENV=development
```

### 4. Levantar el servidor

```bash
npm run dev
```

---

## Endpoints

### `GET /`
Muestra el índice de endpoints disponibles.

---

### `POST /api/cards/scrape`
Scrapeá una carta de TCGPlayer por URL o ID y guarda todos sus precios e historial de ventas en la BD.

**Body:**
```json
{ "url": "https://www.tcgplayer.com/product/521438/..." }
// ó
{ "tcgplayer_id": 521438 }
```

**Respuesta:**
```json
{
  "success": true,
  "data": {
    "card": { "id": "uuid", "name": "Monkey D. Luffy", "set_name": "Romance Dawn [OP-01]", ... },
    "latest_prices": { "market_price": 12.50, "last_sale_price": 11.99, ... },
    "price_analysis": {
      "average_7d": 12.10,
      "average_30d": 11.80,
      "average_90d": 10.50,
      "trend": "up",
      "trend_percentage": 2.5,
      "suggested_price": 12.20,
      "confidence": "high"
    },
    "recent_sales": [...],
    "price_history": [...]
  }
}
```

---

### `GET /api/cards/search?q=luffy`
Busca cartas ya guardadas en la base de datos local.

---

### `GET /api/cards/tcg-search?q=luffy`
Busca cartas directamente en TCGPlayer (live scrape de resultados de búsqueda).

---

### `GET /api/cards/:id`
Devuelve el resumen completo de precios para una carta (por UUID interno).

---

### `GET /api/cards/:id/prices?days=30`
Devuelve el historial de snapshots de precios para los últimos N días.

---

### `GET /api/cards/:id/sales?days=30`
Devuelve el historial de ventas individuales para los últimos N días.

---

### `POST /api/cards/:id/refresh`
Re-scrapea una carta ya en la BD para actualizar sus precios.

---

## Lógica de Precio Sugerido

El `suggested_price` se calcula con un promedio ponderado:

| Fuente | Peso |
|--------|------|
| Last Sale (última venta) | 40% |
| Promedio de mercado (7 días) | 40% |
| Mid Price actual | 20% |

El **confidence** level es:
- `high` → ≥5 snapshots en 7d **y** ≥5 ventas en 30d
- `medium` → ≥2 snapshots o ≥2 ventas
- `low` → datos insuficientes

---

## Estructura del Proyecto

```
src/
├── config/
│   └── supabase.ts       # Cliente de Supabase
├── routes/
│   └── cards.ts          # Todos los endpoints
├── scraper/
│   └── tcgplayer.ts      # Playwright scraper
├── services/
│   └── cardService.ts    # Lógica de BD y análisis de precios
├── types/
│   └── index.ts          # Interfaces TypeScript
└── index.ts              # App entry point
supabase/
└── schema.sql            # Schema de BD (ejecutar en Supabase)
```

---

## Scripts

```bash
npm run dev        # Desarrollo con hot reload (tsx watch)
npm run build      # Compilar TypeScript → dist/
npm run start      # Producción (requiere build previo)
npm run typecheck  # Verificar tipos sin compilar
```
