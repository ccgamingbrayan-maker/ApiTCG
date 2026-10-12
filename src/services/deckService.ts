import { supabase } from '../config/supabase';
import { getAllInventory } from './inventoryService';
import { resolveCardImageUrl } from './cardService';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export interface DeckCardItem {
  card_number: string;
  name: string;
  rarity: string;
  image_url: string;
  set_code: string;
  needed: number;
  owned: number;
  missing: number;
  is_complete: boolean;
  status: 'complete' | 'partial' | 'missing';
}

export interface DeckAnalysisResult {
  id?: string;
  name?: string;
  raw_list: string;
  total_cards_needed: number;
  total_cards_owned: number;
  total_cards_missing: number;
  completion_percent: number;
  unique_cards_count: number;
  unique_complete_count: number;
  unique_missing_count: number;
  leader?: {
    card_number: string;
    name: string;
    image_url: string;
  };
  cards: DeckCardItem[];
  missing_cards_text: string;
  created_at?: string;
  updated_at?: string;
}

const LOCAL_DECKS_FILE = path.join(__dirname, '../../data/decks.json');

function ensureDecksFile() {
  const dir = path.dirname(LOCAL_DECKS_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(LOCAL_DECKS_FILE)) {
    fs.writeFileSync(LOCAL_DECKS_FILE, JSON.stringify([], null, 2), 'utf8');
  }
}

export function readSavedDecks(): DeckAnalysisResult[] {
  ensureDecksFile();
  try {
    const raw = fs.readFileSync(LOCAL_DECKS_FILE, 'utf8');
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function writeSavedDecks(decks: DeckAnalysisResult[]) {
  ensureDecksFile();
  fs.writeFileSync(LOCAL_DECKS_FILE, JSON.stringify(decks, null, 2), 'utf8');
}

/**
 * Parsea el texto del deck:
 * Formatos admitidos:
 * 1xOP09-062
 * 4x OP17-113
 * 4 OP17-113
 * OP17-113 x4
 * OP17-113
 */
export function parseDeckListText(rawText: string): Map<string, number> {
  const parsedMap = new Map<string, number>();
  const lines = rawText.split(/\r?\n/);

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#') || line.startsWith('//')) continue;

    let qty = 1;
    let code = '';

    // Patrón 1: 4xOP01-025 o 4x OP01-025 o 4 OP01-025
    const matchPrefix = line.match(/^(\d+)\s*[xX*]?\s*([A-Za-z0-9\-]+)/);
    // Patrón 2: OP01-025 x4 o OP01-025 4
    const matchSuffix = line.match(/^([A-Za-z0-9\-]+)\s*[xX*]?\s*(\d+)$/);

    if (matchPrefix) {
      qty = parseInt(matchPrefix[1], 10) || 1;
      code = matchPrefix[2].toUpperCase().trim();
    } else if (matchSuffix) {
      code = matchSuffix[1].toUpperCase().trim();
      qty = parseInt(matchSuffix[2], 10) || 1;
    } else {
      // Patrón 3: solo código (asume 1)
      const matchSolo = line.match(/([A-Za-z0-9\-]+)/);
      if (matchSolo) {
        code = matchSolo[1].toUpperCase().trim();
        qty = 1;
      }
    }

    // Normalizar formato de código (ej. OP09062 -> OP09-062 si le falta guión)
    if (code) {
      const matchNoHyphen = code.match(/^([A-Z]{2,3})(\d{2})(\d{3})$/);
      if (matchNoHyphen) {
        code = `${matchNoHyphen[1]}${matchNoHyphen[2]}-${matchNoHyphen[3]}`;
      }

      parsedMap.set(code, (parsedMap.get(code) || 0) + qty);
    }
  }

  return parsedMap;
}

/**
 * Analiza una lista de deck contra el inventario físico y la base de datos oficial
 */
export async function analyzeDeckList(rawText: string, deckName = 'Nuevo Deck'): Promise<DeckAnalysisResult> {
  const parsedMap = parseDeckListText(rawText);
  const codes = Array.from(parsedMap.keys());

  // 1. Obtener datos de las cartas desde Supabase
  let dbCardsMap = new Map<string, any>();
  if (codes.length > 0) {
    const { data: dbCards } = await supabase
      .from('cards')
      .select('id, card_number, name, rarity, image_url, set_code, set_name')
      .in('card_number', codes);

    dbCards?.forEach(c => {
      const normalized = (c.card_number || '').toUpperCase();
      // Si hay variantes, priorizamos la que tenga imagen local o oficial válida
      if (!dbCardsMap.has(normalized) || (!dbCardsMap.get(normalized).image_url && c.image_url)) {
        dbCardsMap.set(normalized, c);
      }
    });
  }

  // 2. Obtener inventario físico de cartas
  const inventorySummary = await getAllInventory();
  const ownedCountMap = new Map<string, number>();

  inventorySummary.items.forEach(item => {
    const normalized = (item.card_number || '').toUpperCase();
    ownedCountMap.set(normalized, (ownedCountMap.get(normalized) || 0) + (item.quantity || 1));
  });

  // 3. Procesar cada carta de la lista
  const cardItems: DeckCardItem[] = [];
  let totalNeeded = 0;
  let totalOwnedInDeck = 0;
  let totalMissing = 0;
  let leaderInfo: { card_number: string; name: string; image_url: string } | undefined = undefined;

  for (const [code, neededQty] of parsedMap.entries()) {
    const dbCard = dbCardsMap.get(code);
    const ownedQty = ownedCountMap.get(code) || 0;
    const missingQty = Math.max(0, neededQty - ownedQty);
    const ownedForThisDeck = Math.min(neededQty, ownedQty);

    totalNeeded += neededQty;
    totalOwnedInDeck += ownedForThisDeck;
    totalMissing += missingQty;

    let status: 'complete' | 'partial' | 'missing' = 'missing';
    if (ownedQty >= neededQty) {
      status = 'complete';
    } else if (ownedQty > 0) {
      status = 'partial';
    }

    const rarity = dbCard?.rarity || 'C';
    const cardName = dbCard?.name || `Carta ${code}`;
    const cardImg = resolveCardImageUrl(dbCard?.image_url, code, dbCard?.set_code) || `https://www.optcgapi.com/media/static/Card_Images/${code}.jpg`;

    // Identificar líder (raridad L, L-AA, o 1x al inicio con rareza Leader)
    if (!leaderInfo && (rarity === 'L' || rarity === 'L-AA' || cardName.toLowerCase().includes('leader'))) {
      leaderInfo = {
        card_number: code,
        name: cardName,
        image_url: cardImg
      };
    }

    cardItems.push({
      card_number: code,
      name: cardName,
      rarity: rarity,
      image_url: cardImg,
      set_code: dbCard?.set_code || code.split('-')[0] || 'OP',
      needed: neededQty,
      owned: ownedQty,
      missing: missingQty,
      is_complete: ownedQty >= neededQty,
      status
    });
  }

  // Si no se detectó líder por rareza, y la primera carta es 1x, tomarla como líder candidato
  if (!leaderInfo && cardItems.length > 0 && cardItems[0].needed === 1) {
    leaderInfo = {
      card_number: cardItems[0].card_number,
      name: cardItems[0].name,
      image_url: cardItems[0].image_url
    };
  }

  // Generar texto exportable de faltantes
  const missingTextLines = cardItems
    .filter(c => c.missing > 0)
    .map(c => `${c.missing}x${c.card_number}`);
  const missingCardsText = missingTextLines.join('\n');

  const completionPercent = totalNeeded > 0 ? Math.round((totalOwnedInDeck / totalNeeded) * 100) : 0;
  const uniqueComplete = cardItems.filter(c => c.is_complete).length;
  const uniqueMissing = cardItems.filter(c => !c.is_complete).length;

  return {
    id: crypto.randomUUID(),
    name: deckName,
    raw_list: rawText,
    total_cards_needed: totalNeeded,
    total_cards_owned: totalOwnedInDeck,
    total_cards_missing: totalMissing,
    completion_percent: completionPercent,
    unique_cards_count: cardItems.length,
    unique_complete_count: uniqueComplete,
    unique_missing_count: uniqueMissing,
    leader: leaderInfo,
    cards: cardItems,
    missing_cards_text: missingCardsText,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
}

/**
 * Guarda o actualiza un proyecto de deck
 */
export async function saveDeckProject(deck: DeckAnalysisResult): Promise<DeckAnalysisResult> {
  const existing = readSavedDecks();
  const index = existing.findIndex(d => d.id === deck.id);

  if (index >= 0) {
    deck.updated_at = new Date().toISOString();
    existing[index] = deck;
  } else {
    deck.id = deck.id || crypto.randomUUID();
    deck.created_at = new Date().toISOString();
    deck.updated_at = new Date().toISOString();
    existing.unshift(deck);
  }

  writeSavedDecks(existing);
  return deck;
}

export function deleteDeckProject(id: string): boolean {
  const existing = readSavedDecks();
  const filtered = existing.filter(d => d.id !== id);
  if (filtered.length !== existing.length) {
    writeSavedDecks(filtered);
    return true;
  }
  return false;
}
