// Types for cards and pricing data

export interface Card {
  id: string;
  tcgplayer_id: number;
  name: string;
  set_name: string;
  set_code: string;
  card_number: string;
  rarity: string;
  image_url?: string;
  tcgplayer_url: string;
  created_at: string;
  updated_at: string;
}

export interface SetSummary {
  set_code: string;
  set_name: string;
  count: number;
  sample_image: string | null;
}

export interface PriceSnapshot {
  id: string;
  card_id: string;
  market_price: number | null;
  low_price: number | null;
  mid_price: number | null;
  high_price: number | null;
  direct_low_price: number | null;
  last_sale_price: number | null;
  scraped_at: string;
}

export interface SaleHistory {
  id: string;
  card_id: string;
  sale_price: number;
  sale_date: string;
  condition: string;
  scraped_at: string;
}

export interface PriceSummary {
  card: Card;
  latest_prices: PriceSnapshot | null;
  price_analysis: {
    average_7d: number | null;
    average_30d: number | null;
    average_90d: number | null;
    lowest_7d: number | null;
    highest_7d: number | null;
    trend: 'up' | 'down' | 'stable' | 'unknown';
    trend_percentage: number | null;
    suggested_price: number | null;
    confidence: 'high' | 'medium' | 'low';
  };
  recent_sales: SaleHistory[];
  price_history: PriceSnapshot[];
}

export interface CardContext {
  card_id?: string;
  name?: string;
  rarity?: string;
  card_number?: string;
  set_code?: string;
  set_name?: string;
}

export interface ScrapedCardData {
  card_id?: string;
  tcgplayer_id: number;
  name: string;
  set_name: string;
  set_code: string;
  card_number: string;
  rarity: string;
  image_url: string | null;
  tcgplayer_url: string;
  prices: {
    market_price: number | null;
    low_price: number | null;
    mid_price: number | null;
    high_price: number | null;
    direct_low_price: number | null;
    last_sale_price: number | null;
  };
  recent_sales: Array<{
    sale_price: number;
    sale_date: string;
    condition: string;
  }>;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}
