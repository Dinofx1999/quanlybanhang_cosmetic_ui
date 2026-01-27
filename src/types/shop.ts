// src/types/shop.ts
export type FlashSaleInfo = {
  flashSaleId?: string;
  endAt?: number | null; // timestamp ms
  price?: number;
  badge?: string;
  maxDiscount?: number;
};

export type ShopProduct = {
  // identity
  id: string; // UI id
  _id?: string; // raw Mongo id (optional)
  name: string;
  brand?: string;

  // category
  categoryId?: string;

  // media
  image: string;
  thumbnail?: string;
  images?: { url: string; isPrimary?: boolean; order?: number }[];

  // pricing
  price: number; // price used to display (after apply)
  originalPrice?: number | null; // price before flash sale (for discount)
  basePrice?: number;

  // ui metrics
  sold?: number; // percent 0-100 (or you can map from soldQuantity)
  soldCount?: number;
  rating?: number;

  tags?: string[];

  // flash sale
  flashSale?: FlashSaleInfo | null;
};
