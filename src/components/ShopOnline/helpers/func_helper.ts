
import { ApiProduct, UIProduct } from "../helpers/format";
import type { ShopProduct } from "../../../types/shop";
function pickImage(p: ApiProduct): string {
  // ưu tiên thumbnail → ảnh primary → ảnh đầu tiên → placeholder
  if (p.thumbnail) return p.thumbnail;

  const imgs = Array.isArray(p.images) ? p.images : [];
  const primary = imgs.find((x) => x?.isPrimary && x?.url);
  if (primary?.url) return primary.url;

  if (imgs[0]?.url) return imgs[0].url;

  // fallback
  return "https://via.placeholder.com/900x900.png?text=No+Image";
}

function calcOriginalPrice(price: number, basePrice?: number): number {
  // Nếu API có basePrice khác price, dùng basePrice làm originalPrice (hoặc ngược lại tuỳ logic bạn)
  // Thường: originalPrice >= price
  const bp = Number(basePrice || 0);
  if (bp > 0 && bp >= price) return bp;

  // Nếu không có, tạo “giá gốc” giả lập +20% (tuỳ bạn)
  return Math.round(price * 1.2);
}


export const normalizeProductsFromApi = (items: any[]) => {
  return items.map((item: any) => ({
    id: item._id,
    name: item.name,
    brand: item.brand || "",
    categoryName: item.categoryName || "",
    categoryId: item.categoryId || "",
    image: item.thumbnail || "",
    images: item.images || [],
    
    // Price
    originalPrice: item.price,
    price: item.isFlashSale ? item.flashSalePrice : (item.minPrice || item.price),
    
    // Flash sale
    flashSale: item.isFlashSale ? {
      price: item.flashSalePrice,
      discount: item.maxDiscount || 0,
      endsAt: item.flashSaleEndDate,
      badge: "FLASH SALE"
    } : null,
    
    // Additional
    sku: item.sku,
    soldCount: 0,
    rating: 0,
    reviews: 0,
    tags: item.isFlashSale ? ["Flash Sale"] : [],
    location: "VN"
  }));
};


