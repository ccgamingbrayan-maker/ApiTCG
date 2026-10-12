import { supabase } from '../config/supabase';
import { resolveCardImageUrl } from './cardService';
import fs from 'fs';
import path from 'path';

export interface InventoryItem {
  id: string;
  card_id: string;
  card_number: string;
  card_name: string;
  set_code: string;
  rarity: string;
  image_url: string | null;
  tcgplayer_url: string;
  quantity: number;
  purchase_price: number;
  condition: string;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface InventorySummary {
  items: InventoryItem[];
  total_cards: number;
  total_investment: number;
  unique_cards: number;
}

const LOCAL_INVENTORY_FILE = path.join(__dirname, '../../data/inventory.json');

// Asegurar directorio local de datos
function ensureLocalDir() {
  const dir = path.dirname(LOCAL_INVENTORY_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  if (!fs.existsSync(LOCAL_INVENTORY_FILE)) {
    fs.writeFileSync(LOCAL_INVENTORY_FILE, JSON.stringify([], null, 2));
  }
}

function readLocalInventory(): InventoryItem[] {
  ensureLocalDir();
  try {
    const raw = fs.readFileSync(LOCAL_INVENTORY_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function writeLocalInventory(items: InventoryItem[]) {
  ensureLocalDir();
  fs.writeFileSync(LOCAL_INVENTORY_FILE, JSON.stringify(items, null, 2));
}

// Intentar consultar Supabase; si la tabla no existe aún, usar almacenamiento local
let useSupabaseForInventory = true;
// Resolver inteligente de número de carta y set
function resolveCardNumberAndSet(card: any): { card_number: string; set_code: string; rarity: string } {
  let num = (card?.card_number || '').trim();
  let set = (card?.set_code || '').trim();
  let rarity = card?.rarity || '';
  const name = card?.name || '';
  const url = card?.tcgplayer_url || '';

  // DON cards
  if (rarity === 'DON' || name.includes('DON!!') || num.toLowerCase().startsWith('don')) {
    if (!num || num === 'N/A') num = 'DON!!';
    if (!set) set = 'DON';
    if (!rarity) rarity = 'DON';
    return { card_number: num, set_code: set, rarity };
  }

  // Extract from name
  if (!num || num === 'N/A') {
    const mNum = name.match(/\b([A-Z]{2,3}\d{2}[-_]\d{3})\b/i);
    if (mNum) num = mNum[1].toUpperCase();
    else {
      const mP = name.match(/\b(P[-_]\d{3})\b/i);
      if (mP) num = mP[1].toUpperCase();
    }
  }

  // Extract from url
  if (!num || num === 'N/A') {
    const mUrl = url.match(/q=([A-Z]{2,3}\d{2}[-_]\d{3})/i);
    if (mUrl) num = mUrl[1].toUpperCase();
  }

  // Set from num
  if (!set && num && num !== 'N/A') {
    const mSet = num.match(/^([A-Z]{2,3})\s*(\d{1,2})/i);
    if (mSet) set = `${mSet[1].toUpperCase()}-${mSet[2].padStart(2, '0')}`;
  }

  // Set from name
  if (!set) {
    const mSet = name.match(/\b(OP|EB|ST|PRB)\s*(\d{1,2})\b/i);
    if (mSet) set = `${mSet[1].toUpperCase()}-${mSet[2].padStart(2, '0')}`;
  }

  return {
    card_number: num || 'N/A',
    set_code: set || '',
    rarity
  };
}

/**
 * Obtener todo el inventario con estadísticas agrupadas
 */
export async function getAllInventory(): Promise<InventorySummary> {
  let items: InventoryItem[] = [];

  if (useSupabaseForInventory) {
    try {
      const { data, error } = await supabase
        .from('user_inventory')
        .select(`
          id,
          card_id,
          quantity,
          purchase_price,
          condition,
          notes,
          created_at,
          updated_at,
          cards (
            id,
            card_number,
            name,
            set_code,
            rarity,
            image_url,
            tcgplayer_url
          )
        `)
        .order('created_at', { ascending: false });

      if (error) {
        // Si no existe la tabla en Supabase, cambiar a almacenamiento local
        if (error.code === 'PGRST205' || error.message.includes('schema cache')) {
          useSupabaseForInventory = false;
          items = readLocalInventory();
        } else {
          console.error('[Inventory] Error en Supabase:', error.message);
          items = readLocalInventory();
        }
      } else if (data) {
        items = data.map((d: any) => {
          const resolved = resolveCardNumberAndSet(d.cards);
          return {
            id: d.id,
            card_id: d.card_id,
            card_number: resolved.card_number,
            card_name: d.cards?.name || 'Desconocida',
            set_code: resolved.set_code,
            rarity: resolved.rarity,
            image_url: resolveCardImageUrl(d.cards?.image_url, d.cards?.card_number || resolved.card_number, resolved.set_code),
            tcgplayer_url: d.cards?.tcgplayer_url || '',
            quantity: Number(d.quantity) || 1,
            purchase_price: Number(d.purchase_price) || 0,
            condition: d.condition || 'Near Mint',
            notes: d.notes || '',
            created_at: d.created_at,
            updated_at: d.updated_at
          };
        });
      }
    } catch {
      useSupabaseForInventory = false;
      items = readLocalInventory();
    }
  } else {
    items = readLocalInventory();
  }

  const total_cards = items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
  const total_investment = items.reduce((sum, item) => sum + ((Number(item.purchase_price) || 0) * (Number(item.quantity) || 1)), 0);
  const unique_cards = new Set(items.map(i => i.card_id)).size;

  return {
    items,
    total_cards,
    total_investment: Math.round(total_investment * 100) / 100,
    unique_cards
  };
}

/**
 * Consultar cuántas copias se tienen de una carta específica
 */
export async function getCardCopies(cardId: string): Promise<{ total_copies: number; records: InventoryItem[] }> {
  const summary = await getAllInventory();
  const records = summary.items.filter(i => i.card_id === cardId);
  const total_copies = records.reduce((sum, r) => sum + (Number(r.quantity) || 0), 0);
  return { total_copies, records };
}

/**
 * Agregar un nuevo registro de compra al inventario
 */
export async function addInventoryRecord(data: {
  card_id: string;
  quantity: number;
  purchase_price: number;
  condition?: string;
  notes?: string;
}): Promise<InventoryItem> {
  const now = new Date().toISOString();
  const quantity = Math.max(1, Number(data.quantity) || 1);
  const purchase_price = Math.max(0, Number(data.purchase_price) || 0);
  const condition = data.condition || 'Near Mint';
  const notes = data.notes || '';

  // Buscar datos de la carta
  const { data: card } = await supabase
    .from('cards')
    .select('*')
    .eq('id', data.card_id)
    .single();

  if (!card) {
    throw new Error(`La carta con ID "${data.card_id}" no existe en la base de datos`);
  }

  if (useSupabaseForInventory) {
    try {
      const { data: inserted, error } = await supabase
        .from('user_inventory')
        .insert({
          card_id: data.card_id,
          quantity,
          purchase_price,
          condition,
          notes,
          created_at: now,
          updated_at: now
        })
        .select('*')
        .single();

      if (error) {
        if (error.code === 'PGRST205' || error.message.includes('schema cache')) {
          useSupabaseForInventory = false;
        } else {
          throw new Error(`[Inventory] Error en Supabase: ${error.message}`);
        }
      } else if (inserted) {
        return {
          id: inserted.id,
          card_id: data.card_id,
          card_number: card.card_number || 'N/A',
          card_name: card.name || 'Carta',
          set_code: card.set_code || '',
          rarity: card.rarity || '',
          image_url: card.image_url || null,
          tcgplayer_url: card.tcgplayer_url || '',
          quantity,
          purchase_price,
          condition,
          notes,
          created_at: now,
          updated_at: now
        };
      }
    } catch (err) {
      if (useSupabaseForInventory) {
        throw err;
      }
    }
  }

  // Fallback local
  const localItems = readLocalInventory();
  const newItem: InventoryItem = {
    id: 'inv_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
    card_id: data.card_id,
    card_number: card?.card_number || 'N/A',
    card_name: card?.name || 'Carta',
    set_code: card?.set_code || '',
    rarity: card?.rarity || '',
    image_url: card?.image_url || null,
    tcgplayer_url: card?.tcgplayer_url || '',
    quantity,
    purchase_price,
    condition,
    notes,
    created_at: now,
    updated_at: now
  };

  localItems.unshift(newItem);
  writeLocalInventory(localItems);
  return newItem;
}

/**
 * Actualizar cantidad o precio de una entrada
 */
export async function updateInventoryRecord(id: string, updates: {
  quantity?: number;
  purchase_price?: number;
  condition?: string;
  notes?: string;
}): Promise<boolean> {
  const now = new Date().toISOString();

  if (useSupabaseForInventory) {
    try {
      const { error } = await supabase
        .from('user_inventory')
        .update({ ...updates, updated_at: now })
        .eq('id', id);
      if (!error) return true;
    } catch {}
  }

  const items = readLocalInventory();
  const idx = items.findIndex(i => i.id === id);
  if (idx !== -1) {
    items[idx] = {
      ...items[idx],
      ...updates,
      updated_at: now
    };
    writeLocalInventory(items);
    return true;
  }
  return false;
}

/**
 * Eliminar una entrada del inventario
 */
export async function deleteInventoryRecord(id: string): Promise<boolean> {
  if (useSupabaseForInventory) {
    try {
      const { error } = await supabase
        .from('user_inventory')
        .delete()
        .eq('id', id);
      if (!error) return true;
    } catch {}
  }

  let items = readLocalInventory();
  const lenBefore = items.length;
  items = items.filter(i => i.id !== id);
  if (items.length !== lenBefore) {
    writeLocalInventory(items);
    return true;
  }
  return false;
}
