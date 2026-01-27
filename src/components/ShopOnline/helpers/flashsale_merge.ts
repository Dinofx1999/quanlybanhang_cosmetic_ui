// src/helpers/flashsale_merge.ts
import type { ShopProduct } from "../../../types/shop";

/**
 * map shape from /public/flashsales/apply:
 * map[productId] = {
 *   isFlashSale,
 *   flashSaleId,
 *   flashSalePrice,
 *   flashSaleEndDate,
 *   maxDiscount,
 *   badge
 * }
 */
export function applyFlashSaleMapToProducts(products: ShopProduct[], map: Record<string, any>): ShopProduct[] {
  return (products || []).map((p) => {
    const pid = String(p._id || p.id || "");
    const f = map?.[pid];
    if (!f || !f.isFlashSale || !f.flashSalePrice) return p;

    const original = Number(p.basePrice ?? p.originalPrice ?? p.price ?? 0);
    const flashPrice = Number(f.flashSalePrice);

    const endAt =
      f.flashSaleEndDate ? new Date(f.flashSaleEndDate).getTime() : null;

    return {
      ...p,
      originalPrice: original,
      price: flashPrice,

      flashSale: {
        flashSaleId: String(f.flashSaleId || ""),
        endAt,
        price: flashPrice,
        badge: String(f.badge || ""),        // ✅ badge cho Grid
        maxDiscount: Number(f.maxDiscount || 0),
      },
    };
  });
}
