
import { ApiProduct, UIProduct } from "../helpers/format";

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


export function normalizeProductsFromApi(apiItems: ApiProduct[]): UIProduct[] {
  const arr = Array.isArray(apiItems) ? apiItems : [];

  return arr
    .filter((p) => p && p._id && p.name)
    .map((p) => {
      const price = Number(p.price ?? p.basePrice ?? 0);

      // tags: bạn có thể tự quy ước theo stock/isActive/hasVariants...
      const tags: string[] = [];
      if (p.isActive) tags.push("Active");
      if ((p.stock ?? 0) <= 0) tags.push("OutOfStock");

      // Nếu bạn muốn tự gán Flash theo điều kiện nào đó:
      // Ví dụ: stock lớn + đang active => flash
      const flashSale = false; // hoặc tự set theo API/logic của bạn

      return {
        id: String(p._id),
        name: String(p.name || ""),
        brand: p.brand ? String(p.brand) : undefined,
        categoryId: p.categoryId ? String(p.categoryId) : undefined,

        price: price,
        originalPrice: price > 0 ? calcOriginalPrice(price, p.basePrice) : undefined,

        image: pickImage(p),

        // các field này API chưa có -> để mặc định / hoặc bạn gán theo rule
        sold: 100,
        soldCount: 200,
        rating: 5,
        reviews: 30,
        location: "HCM",

        flashSale,
        tags,
      } as UIProduct;
    });
}
