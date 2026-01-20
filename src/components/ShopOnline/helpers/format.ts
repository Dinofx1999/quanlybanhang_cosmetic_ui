export function getLastId(path?: string): string {
  if (!path) return "";
  const parts = path.split("/").filter(Boolean);
  return parts[parts.length - 1] || "";
}

// UI Product (giống mock của bạn)
export type UIProduct = {
  id: string;
  name: string;
  brand?: string;
  categoryId?: string;
  price: number;
  originalPrice?: number;
  image: string;
  sold?: number;
  soldCount?: number;
  rating?: number;
  reviews?: number;
  location?: string;
  flashSale?: boolean;
  tags?: string[];
};

// API Product (theo data bạn gửi)
export type ApiProduct = {
  _id: string;
  sku?: string;
  name: string;
  brand?: string;
  barcode?: string;

  categoryId?: string;
  categoryName?: string;

  price?: number;
  basePrice?: number;

  thumbnail?: string;
  images?: { url: string; isPrimary?: boolean; order?: number }[];

  stock?: number;
  isActive?: boolean;

  createdAt?: string;
  updatedAt?: string;
};
