import { supabase } from '../config/supabase';
import { Card, PriceSnapshot, SaleHistory, PriceSummary, ScrapedCardData, SetSummary } from '../types';
import { classifyCardRarity } from '../utils/rarityUtils';

import fs from 'fs';
import path from 'path';

// ─── UPSERT CARD ────────────────────────────────────────────────────────────

/**
 * Descarga la imagen de la carta en la mayor resolución posible (hasta 1000x1000 px)
 * evitando miniaturas comprimidas o pixeladas.
 */
export async function downloadHighQualityImage(
  imageUrl: string | null | undefined,
  tcgplayerId?: number,
  cardNumber?: string
): Promise<string | null> {
  const cardsDir = path.join(__dirname, '../../public/images/cards');
  if (!fs.existsSync(cardsDir)) {
    fs.mkdirSync(cardsDir, { recursive: true });
  }

  const filename = (tcgplayerId && tcgplayerId > 0)
    ? `${tcgplayerId}.jpg`
    : (cardNumber ? `${cardNumber}.jpg` : `${Date.now()}.jpg`);
  const filepath = path.join(cardsDir, filename);

  const candidateUrls: string[] = [];

  // 1. TCGPlayer CDN en resoluciones altas (1000x1000, 800x800, 600x600, 400w)
  if (tcgplayerId && tcgplayerId > 0) {
    candidateUrls.push(`https://tcgplayer-cdn.tcgplayer.com/product/${tcgplayerId}_in_1000x1000.jpg`);
    candidateUrls.push(`https://tcgplayer-cdn.tcgplayer.com/product/${tcgplayerId}_in_800x800.jpg`);
    candidateUrls.push(`https://tcgplayer-cdn.tcgplayer.com/product/${tcgplayerId}_in_600x600.jpg`);
    candidateUrls.push(`https://tcgplayer-cdn.tcgplayer.com/product/${tcgplayerId}_400w.jpg`);
    candidateUrls.push(`https://tcgplayer-cdn.tcgplayer.com/product/${tcgplayerId}_in_400x400.jpg`);
  }

  // 2. URLs alternativas derivadas de la URL actual
  if (imageUrl && imageUrl.startsWith('http')) {
    const hiRes = imageUrl
      .replace(/_in_\d+x\d+/i, '_in_1000x1000')
      .replace(/_\d+w\./i, '_400w.')
      .replace(/_small\./i, '.');
    if (!candidateUrls.includes(hiRes)) candidateUrls.push(hiRes);
    if (!candidateUrls.includes(imageUrl)) candidateUrls.push(imageUrl);
  }

  // 3. Fallback a la API de One Piece TCG si hay card_number
  if (cardNumber && /^[A-Z0-9]+-[0-9]+/i.test(cardNumber)) {
    candidateUrls.push(`https://www.optcgapi.com/media/static/Card_Images/${cardNumber}.jpg`);
  }

  for (const url of candidateUrls) {
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8'
        }
      });
      if (res.ok) {
        const ct = res.headers.get('content-type') || '';
        if (ct.includes('image') || ct.includes('octet-stream')) {
          const arrayBuf = await res.arrayBuffer();
          const buf = Buffer.from(arrayBuf);
          if (buf.length > 3000) {
            fs.writeFileSync(filepath, buf);
            return `/images/cards/${filename}`;
          }
        }
      }
    } catch {}
  }

  return null;
}

export function resolveCardImageUrl(imageUrl: string | null | undefined, cardNumber?: string | null, setCode?: string | null): string {
  if (!imageUrl) {
    if (cardNumber && /^[A-Z]{1,3}\d{2}-\d{3}/i.test(cardNumber)) {
      return `https://www.optcgapi.com/media/static/Card_Images/${cardNumber}.jpg`;
    }
    return '';
  }

  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
    if (imageUrl.includes('OP05-060_p4.jpg')) {
      return 'https://epuskceyfpbdljmwvcca.supabase.co/storage/v1/object/public/cards/OP01-121_p2.jpg';
    }
    return imageUrl.replace(/_in_\d+x\d+/i, '_in_1000x1000').replace(/_\d+w\./i, '_400w.');
  }

  if (imageUrl.startsWith('/images/cards/')) {
    const filename = imageUrl.replace(/^\/images\/cards\//, '');
    const cleanName = filename.replace(/\.(jpg|jpeg|png|webp)$/i, '');

    const tcgMatch = cleanName.match(/^(\d+)/);
    if (tcgMatch) {
      return `https://tcgplayer-cdn.tcgplayer.com/product/${tcgMatch[1]}_in_1000x1000.jpg`;
    }

    if (/don/i.test(cleanName) || setCode === 'DON') {
      return 'https://tcgplayer-cdn.tcgplayer.com/product/655914_in_1000x1000.jpg';
    }

    const num = cardNumber || cleanName;
    const opMatch = num.match(/^([A-Z]{1,3})-?(\d{2})-?(\d{3})/i);
    if (opMatch) {
      const formatted = `${opMatch[1].toUpperCase()}${opMatch[2]}-${opMatch[3]}`;
      return `https://www.optcgapi.com/media/static/Card_Images/${formatted}.jpg`;
    }

    return `https://www.optcgapi.com/media/static/Card_Images/${cleanName}.jpg`;
  }

  return imageUrl;
}

export async function upsertCard(data: ScrapedCardData): Promise<Card> {
  // 1. Download and save the image locally in high resolution
  let localImageUrl = data.image_url;
  try {
    const downloaded = await downloadHighQualityImage(data.image_url, data.tcgplayer_id, data.card_number);
    if (downloaded) {
      localImageUrl = downloaded;
    }
  } catch (e) {
    console.error(`[DB] Error downloading high-res image for ${data.tcgplayer_id}:`, e);
  }

  const computedRarity = classifyCardRarity({
    name: data.name,
    card_number: data.card_number,
    set_code: data.set_code,
    rarity: data.rarity,
    image_url: localImageUrl || data.image_url || undefined,
  });

  // Si ya tenemos un ID específico de carta en la base de datos local, actualizar esa carta preservando su imagen
  if (data.card_id) {
    const { data: existingCard } = await supabase
      .from('cards')
      .select('*')
      .eq('id', data.card_id)
      .single();

    if (existingCard) {
      const preservedImage = localImageUrl || existingCard.image_url;
      const preservedRarity = existingCard.rarity && existingCard.rarity !== 'N/A' ? existingCard.rarity : computedRarity;
      const preservedName = existingCard.name || data.name;

      const { data: updatedCard, error: updateErr } = await supabase
        .from('cards')
        .update({
          tcgplayer_id: data.tcgplayer_id,
          tcgplayer_url: data.tcgplayer_url,
          image_url: preservedImage,
          rarity: preservedRarity,
          name: preservedName,
          updated_at: new Date().toISOString(),
        })
        .eq('id', data.card_id)
        .select()
        .single();

      if (!updateErr && updatedCard) {
        return updatedCard as Card;
      }
    }
  }

  const { data: card, error } = await supabase
    .from('cards')
    .upsert(
      {
        tcgplayer_id: data.tcgplayer_id,
        name: data.name,
        set_name: data.set_name,
        set_code: data.set_code,
        card_number: data.card_number,
        rarity: computedRarity,
        image_url: localImageUrl,
        tcgplayer_url: data.tcgplayer_url,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'tcgplayer_id' }
    )
    .select()
    .single();

  if (error) throw new Error(`[DB] upsertCard error: ${error.message}`);
  return card as Card;
}

// ─── SAVE PRICE SNAPSHOT ────────────────────────────────────────────────────

export async function savePriceSnapshot(cardId: string, prices: ScrapedCardData['prices']): Promise<PriceSnapshot | null> {
  const hasValidPrice = [
    prices.market_price,
    prices.low_price,
    prices.mid_price,
    prices.high_price,
    prices.direct_low_price,
    prices.last_sale_price,
  ].some((p) => p !== null && p !== undefined && p > 0);

  if (!hasValidPrice) {
    return null;
  }

  const { data: snapshot, error } = await supabase
    .from('price_snapshots')
    .insert({
      card_id: cardId,
      market_price: prices.market_price && prices.market_price > 0 ? prices.market_price : null,
      low_price: prices.low_price && prices.low_price > 0 ? prices.low_price : null,
      mid_price: prices.mid_price && prices.mid_price > 0 ? prices.mid_price : null,
      high_price: prices.high_price && prices.high_price > 0 ? prices.high_price : null,
      direct_low_price: prices.direct_low_price && prices.direct_low_price > 0 ? prices.direct_low_price : null,
      last_sale_price: prices.last_sale_price && prices.last_sale_price > 0 ? prices.last_sale_price : null,
      scraped_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) throw new Error(`[DB] savePriceSnapshot error: ${error.message}`);
  return snapshot as PriceSnapshot;
}

// ─── SAVE SALE HISTORY ──────────────────────────────────────────────────────

export async function saveSalesHistory(cardId: string, sales: ScrapedCardData['recent_sales']): Promise<void> {
  if (!sales.length) return;

  const validSales = sales.filter((s) => s.sale_price !== null && s.sale_price > 0 && s.sale_date !== '12/12/12');
  if (!validSales.length) return;

  // Avoid duplicating sales already in DB (match by card_id + sale_date + sale_price)
  const rows = validSales.map((s) => ({
    card_id: cardId,
    sale_price: s.sale_price,
    sale_date: s.sale_date,
    condition: s.condition,
    scraped_at: new Date().toISOString(),
  }));

  const { error } = await supabase.from('sale_history').upsert(rows, {
    onConflict: 'card_id,sale_date,sale_price',
    ignoreDuplicates: true,
  });

  if (error) {
    console.warn(`[DB] saveSalesHistory warning: ${error.message}`);
  }
}

// ─── GET CARD BY ID ─────────────────────────────────────────────────────────

export async function getCardById(cardId: string): Promise<Card | null> {
  const { data, error } = await supabase
    .from('cards')
    .select('*')
    .eq('id', cardId)
    .single();

  if (error || !data) return null;
  const c = data as Card;
  c.image_url = resolveCardImageUrl(c.image_url, c.card_number, c.set_code);
  return c;
}

export async function getCardByTcgplayerId(tcgplayerId: number): Promise<Card | null> {
  const { data, error } = await supabase
    .from('cards')
    .select('*')
    .eq('tcgplayer_id', tcgplayerId)
    .single();

  if (error || !data) return null;
  const c = data as Card;
  c.image_url = resolveCardImageUrl(c.image_url, c.card_number, c.set_code);
  return c;
}

// ─── SEARCH CARDS ───────────────────────────────────────────────────────────

export async function searchCards(query: string): Promise<Card[]> {
  const cleanQ = query.trim();
  const words = cleanQ.split(/\s+/).filter(w => w.length > 0);
  if (words.length === 0) return [];

  // Si la consulta es directamente un ID de TCGPlayer o URL con ID de producto
  const productUrlMatch = cleanQ.match(/\/product\/(\d+)/);
  const numericId = productUrlMatch ? parseInt(productUrlMatch[1], 10) : (/^\d{4,8}$/.test(cleanQ) ? parseInt(cleanQ, 10) : null);
  if (numericId) {
    const { data, error } = await supabase
      .from('cards')
      .select('*')
      .eq('tcgplayer_id', numericId)
      .limit(10);
    if (!error && data && data.length > 0) {
      return (data as Card[]).map(c => ({
        ...c,
        image_url: resolveCardImageUrl(c.image_url, c.card_number, c.set_code)
      }));
    }
  }

  const lowerQ = cleanQ.toLowerCase();
  const isOnlyDon = lowerQ === 'don' || lowerQ === 'don!' || lowerQ === 'don!!';

  if (isOnlyDon) {
    const { data, error } = await supabase
      .from('cards')
      .select('*')
      .or('set_code.eq.DON,rarity.eq.DON')
      .not('name', 'ilike', 'Missing Card%')
      .order('name', { ascending: true })
      .limit(100);

    if (error) throw new Error(`[DB] searchCards error: ${error.message}`);
    return ((data ?? []) as Card[]).map(c => ({
      ...c,
      image_url: resolveCardImageUrl(c.image_url, c.card_number, c.set_code)
    }));
  }

  const hasDonWord = words.some(w => {
    const l = w.toLowerCase();
    return l === 'don' || l === 'don!' || l === 'don!!';
  });

  if (hasDonWord) {
    const nonDonWords = words.filter(w => {
      const l = w.toLowerCase();
      return l !== 'don' && l !== 'don!' && l !== 'don!!';
    });

    let queryBuilder = supabase
      .from('cards')
      .select('*')
      .or('set_code.eq.DON,rarity.eq.DON')
      .not('name', 'ilike', 'Missing Card%');

    for (const w of nonDonWords) {
      queryBuilder = queryBuilder.ilike('name', `%${w}%`);
    }

    const { data, error } = await queryBuilder
      .order('name', { ascending: true })
      .limit(50);

    if (error) throw new Error(`[DB] searchCards error: ${error.message}`);
    return ((data ?? []) as Card[]).map(c => ({
      ...c,
      image_url: resolveCardImageUrl(c.image_url, c.card_number, c.set_code)
    }));
  }

  let reqQuery = supabase
    .from('cards')
    .select('*')
    .not('name', 'ilike', '%(Alternate Art / Parallel)%');

  for (const w of words) {
    const lower = w.toLowerCase();
    if (lower === 'manga') {
      reqQuery = reqQuery.eq('rarity', 'MANGA');
    } else if (lower === 'sp' || lower === 'spr') {
      reqQuery = reqQuery.eq('rarity', 'SP');
    } else if (lower === 'lider' || lower === 'leader') {
      reqQuery = reqQuery.or('rarity.eq.L,rarity.eq.L-AA,name.ilike.%leader%');
    } else if (lower === 'aa' || lower === 'parallel') {
      reqQuery = reqQuery.or('rarity.ilike.%AA%,name.ilike.%parallel%,name.ilike.%alternate art%');
    } else {
      reqQuery = reqQuery.or(`name.ilike.%${w}%,card_number.ilike.%${w}%,set_name.ilike.%${w}%,set_code.ilike.%${w}%`);
    }
  }

  const { data, error } = await reqQuery
    .order('rarity', { ascending: true })
    .order('card_number', { ascending: true })
    .limit(30);

  if (error) throw new Error(`[DB] searchCards error: ${error.message}`);
  return ((data ?? []) as Card[]).map(c => ({
    ...c,
    image_url: resolveCardImageUrl(c.image_url, c.card_number, c.set_code)
  }));
}

let cachedSets: SetSummary[] | null = null;
let lastSetsFetchTime = 0;
const SETS_CACHE_TTL = 60 * 1000; // 60 segundos

export async function getCardSets(): Promise<SetSummary[]> {
  const now = Date.now();
  if (cachedSets && now - lastSetsFetchTime < SETS_CACHE_TTL) {
    return cachedSets;
  }

  let allCards: { set_code: string; set_name: string; image_url: string | null }[] = [];
  let page = 0;
  while (true) {
    const { data, error } = await supabase
      .from('cards')
      .select('set_code, set_name, image_url')
      .not('name', 'ilike', '%(Alternate Art / Parallel)%')
      .range(page * 1000, (page + 1) * 1000 - 1);

    if (error) throw new Error(`[DB] getCardSets error: ${error.message}`);
    if (!data || data.length === 0) break;
    allCards = allCards.concat(data);
    if (data.length < 1000) break;
    page++;
  }

  const map = new Map<string, { set_name: string; count: number; sample_image: string | null }>();
  for (const c of allCards) {
    const code = c.set_code || 'OTROS';
    const name = c.set_name || code;
    if (!map.has(code)) {
      map.set(code, { set_name: name, count: 0, sample_image: null });
    }
    const item = map.get(code)!;
    item.count++;

    // Priorizar imágenes que ya son URLs públicas online (https://)
    if (c.image_url && c.image_url.startsWith('https://') && !item.sample_image?.startsWith('https://')) {
      item.sample_image = c.image_url;
    } else if (!item.sample_image && c.image_url) {
      item.sample_image = c.image_url;
    }
  }

  const result: SetSummary[] = Array.from(map.entries()).map(([set_code, val]) => {
    let resolvedImage = val.sample_image;
    // Si la imagen es local o no existe, resolver a un CDN público garantizado
    if (!resolvedImage || resolvedImage.startsWith('/images/cards/')) {
      if (set_code === 'DON') {
        resolvedImage = 'https://tcgplayer-cdn.tcgplayer.com/product/655914_in_1000x1000.jpg';
      } else if (set_code === 'PROMO') {
        resolvedImage = 'https://tcgplayer-cdn.tcgplayer.com/product/566953_in_1000x1000.jpg';
      } else if (set_code === 'OTROS') {
        resolvedImage = 'https://tcgplayer-cdn.tcgplayer.com/product/454664_in_1000x1000.jpg';
      } else if (/^[A-Z]{1,4}-\d+$/i.test(set_code)) {
        const clean = set_code.replace('-', '');
        resolvedImage = `https://www.optcgapi.com/media/static/Card_Images/${clean}-001.jpg`;
      }
    }
    if (!resolvedImage) {
      resolvedImage = 'https://www.optcgapi.com/media/static/Card_Images/OP01-013.jpg';
    }
    return {
      set_code,
      set_name: val.set_name,
      count: val.count,
      sample_image: resolvedImage
    };
  });

  // Ordenar: DON primero, luego OP, EB, ST, PRB, PROMO, etc.
  result.sort((a, b) => {
    if (a.set_code === 'DON') return -1;
    if (b.set_code === 'DON') return 1;
    return a.set_code.localeCompare(b.set_code, undefined, { numeric: true });
  });

  cachedSets = result;
  lastSetsFetchTime = now;
  return result;
}

export async function getSavedCardsBySet(setCode?: string, rarity?: string): Promise<Card[]> {
  let query = supabase
    .from('cards')
    .select('*')
    .not('name', 'ilike', '%(Alternate Art / Parallel)%');

  // Filtrado por set
  if (setCode && setCode !== 'all') {
    if (setCode === 'ST') {
      // Todos los starter decks (ST-01 hasta ST-36)
      query = query.ilike('set_code', 'ST-%');
    } else if (setCode === 'DON') {
      query = query.or('set_code.eq.DON,rarity.eq.DON');
    } else {
      query = query.eq('set_code', setCode);
    }
  }

  // Filtrado por rareza
  if (rarity && rarity !== 'all') {
    if (rarity === 'AA') {
      query = query.ilike('rarity', '%AA%');
    } else if (rarity === 'DON') {
      query = query.or('rarity.eq.DON,set_code.eq.DON');
    } else {
      query = query.eq('rarity', rarity);
    }
  }

  let all: Card[] = [];
  let page = 0;
  while (true) {
    const { data, error } = await query
      .order('set_code', { ascending: true })
      .order('card_number', { ascending: true })
      .range(page * 1000, (page + 1) * 1000 - 1);

    if (error) throw new Error(`[DB] getSavedCardsBySet error: ${error.message}`);
    if (!data || data.length === 0) break;
    all = all.concat(data as Card[]);
    if (data.length < 1000) break;
    page++;
  }

  return all.map(c => ({
    ...c,
    image_url: resolveCardImageUrl(c.image_url, c.card_number, c.set_code)
  }));
}

export async function getAllSavedCards(): Promise<Card[]> {
  let all: Card[] = [];
  let page = 0;
  while (true) {
    const { data, error } = await supabase
      .from('cards')
      .select('*')
      .not('name', 'ilike', '%(Alternate Art / Parallel)%')
      .order('set_code', { ascending: true })
      .order('card_number', { ascending: true })
      .range(page * 1000, (page + 1) * 1000 - 1);

    if (error) throw new Error(`[DB] getAllSavedCards error: ${error.message}`);
    if (!data || data.length === 0) break;
    all = all.concat(data as Card[]);
    if (data.length < 1000) break;
    page++;
  }
  return all.map(c => ({
    ...c,
    image_url: resolveCardImageUrl(c.image_url, c.card_number, c.set_code)
  }));
}

// ─── GET PRICE HISTORY ──────────────────────────────────────────────────────

export async function getPriceHistory(cardId: string, days: number = 30): Promise<PriceSnapshot[]> {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const { data, error } = await supabase
    .from('price_snapshots')
    .select('*')
    .eq('card_id', cardId)
    .gte('scraped_at', since.toISOString())
    .order('scraped_at', { ascending: false });

  if (error) throw new Error(`[DB] getPriceHistory error: ${error.message}`);
  return (data ?? []) as PriceSnapshot[];
}

// ─── GET LATEST PRICE ───────────────────────────────────────────────────────

export async function getLatestPrice(cardId: string): Promise<PriceSnapshot | null> {
  const { data, error } = await supabase
    .from('price_snapshots')
    .select('*')
    .eq('card_id', cardId)
    .not('market_price', 'is', null)
    .gt('market_price', 0)
    .order('scraped_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!error && data) return data as PriceSnapshot;

  const { data: fallback } = await supabase
    .from('price_snapshots')
    .select('*')
    .eq('card_id', cardId)
    .order('scraped_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return (fallback ?? null) as PriceSnapshot | null;
}

// ─── GET SALE HISTORY ───────────────────────────────────────────────────────

export async function getSaleHistory(cardId: string, days: number = 30): Promise<SaleHistory[]> {
  // Ignoramos el filtro de "days" porque TCGPlayer usa fechas MM/DD/YY (ej. 10/3/26) que fallan al compararse alfabéticamente con ISO (2026-09-03)
  const { data, error } = await supabase
    .from('sale_history')
    .select('*')
    .eq('card_id', cardId)
    .gt('sale_price', 0)
    .neq('sale_date', '12/12/12')
    .order('scraped_at', { ascending: false })
    .limit(15);

  if (error) throw new Error(`[DB] getSaleHistory error: ${error.message}`);
  return (data ?? []) as SaleHistory[];
}

// ─── PRICE ANALYSIS ─────────────────────────────────────────────────────────

function average(nums: number[]): number | null {
  if (!nums.length) return null;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

export async function buildPriceSummary(cardId: string): Promise<PriceSummary | null> {
  const card = await getCardById(cardId);
  if (!card) return null;

  const [latestPrice, history90d, sales30d] = await Promise.all([
    getLatestPrice(cardId),
    getPriceHistory(cardId, 90),
    getSaleHistory(cardId, 30),
  ]);

  // Helper to filter snapshots by days
  const snapshotsWithinDays = (days: number) => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    return history90d.filter((s) => new Date(s.scraped_at) >= cutoff);
  };

  const snapshots7d = snapshotsWithinDays(7);
  const snapshots30d = snapshotsWithinDays(30);

  // Use market_price as primary, fall back to mid_price
  const priceOf = (s: PriceSnapshot) => s.market_price ?? s.mid_price ?? null;
  const prices7d = snapshots7d.map(priceOf).filter((p): p is number => p !== null);
  const prices30d = snapshots30d.map(priceOf).filter((p): p is number => p !== null);
  const prices90d = history90d.map(priceOf).filter((p): p is number => p !== null);

  const avg7d = average(prices7d);
  const avg30d = average(prices30d);
  const avg90d = average(prices90d);

  // Trend: compare last 7d avg vs previous 7-14d avg
  const snapshots14d = snapshotsWithinDays(14);
  const snapshots8_14d = snapshots14d.filter((s) => {
    const d = new Date(s.scraped_at);
    const cutoff7 = new Date();
    cutoff7.setDate(cutoff7.getDate() - 7);
    return d < cutoff7;
  });
  const pricesPrev7d = snapshots8_14d.map(priceOf).filter((p): p is number => p !== null);
  const avgPrev7d = average(pricesPrev7d);

  let trend: PriceSummary['price_analysis']['trend'] = 'unknown';
  let trendPct: number | null = null;

  if (avg7d !== null && avgPrev7d !== null && avgPrev7d > 0) {
    trendPct = ((avg7d - avgPrev7d) / avgPrev7d) * 100;
    if (trendPct > 3) trend = 'up';
    else if (trendPct < -3) trend = 'down';
    else trend = 'stable';
  }

  // Suggested price: 66% del valor real (promedio de ventas o market price)
  let realValue: number | null = null;
  const salePrices = sales30d.map(s => s.sale_price).filter((p): p is number => p !== null && p > 0);
  
  if (salePrices.length > 0) {
    realValue = average(salePrices);
  } else {
    realValue = latestPrice?.market_price ?? latestPrice?.mid_price ?? avg7d;
  }

  let suggested: number | null = null;
  if (realValue !== null) {
    suggested = Math.round(realValue * 0.66 * 100) / 100;
  }

  // Confidence based on data availability
  let confidence: PriceSummary['price_analysis']['confidence'] = 'low';
  if (prices7d.length >= 5 && sales30d.length >= 5) confidence = 'high';
  else if (prices7d.length >= 2 || sales30d.length >= 2) confidence = 'medium';

  return {
    card,
    latest_prices: latestPrice,
    price_analysis: {
      average_7d: avg7d !== null ? Math.round(avg7d * 100) / 100 : null,
      average_30d: avg30d !== null ? Math.round(avg30d * 100) / 100 : null,
      average_90d: avg90d !== null ? Math.round(avg90d * 100) / 100 : null,
      lowest_7d: prices7d.length ? Math.min(...prices7d) : null,
      highest_7d: prices7d.length ? Math.max(...prices7d) : null,
      trend,
      trend_percentage: trendPct !== null ? Math.round(trendPct * 10) / 10 : null,
      suggested_price: suggested,
      confidence,
    },
    recent_sales: sales30d,
    price_history: history90d,
  };
}
