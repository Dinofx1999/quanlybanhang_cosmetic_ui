import React from "react";
import { Button, Rate, message , Space } from "antd";
import { ShoppingCart } from "lucide-react";
import type { Product } from "../../data/shopMock";
import { useNavigate } from "react-router-dom";
import { addItem } from "../../../../utils/cart";

function money(n: number) {
  return Number(n || 0).toLocaleString("vi-VN");
}

/* ================= CART LOCAL STORAGE ================= */

const CART_KEY = "cart_v1";

type CartItem = {
  id: string; // productId (hoặc variantId nếu bạn muốn)
  name: string;
  price: number;
  originalPrice?: number;
  image?: string;
  qty: number;
  // optional meta
  sku?: string;
  productId?: string;
  variantId?: string;
  attributes?: any[];
  createdAt: string;
  updatedAt: string;
};

function safeParse<T>(raw: string | null, fallback: T): T {
  try {
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function getCart(): CartItem[] {
  return safeParse<CartItem[]>(localStorage.getItem(CART_KEY), []);
}

function setCart(items: CartItem[]) {
  localStorage.setItem(CART_KEY, JSON.stringify(items));
  // bắn event để header/badge giỏ hàng update nếu bạn muốn
  window.dispatchEvent(new Event("cart:changed"));
}

function addToCart(input: {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  image?: string;
  qty?: number;
  sku?: string;
  productId?: string;
  variantId?: string;
  attributes?: any[];
}) {
  const qty = Math.max(1, Number(input.qty || 1));
  const now = new Date().toISOString();

  const cart = getCart();
  const idx = cart.findIndex((x) => x.id === input.id);

  if (idx >= 0) {
    cart[idx] = {
      ...cart[idx],
      qty: cart[idx].qty + qty,
      updatedAt: now,
    };
  } else {
    cart.unshift({
      id: String(input.id),
      name: String(input.name || ""),
      price: Number(input.price || 0),
      originalPrice: input.originalPrice != null ? Number(input.originalPrice) : undefined,
      image: input.image || "",
      qty,
      sku: input.sku,
      productId: input.productId,
      variantId: input.variantId,
      attributes: input.attributes,
      createdAt: now,
      updatedAt: now,
    });
  }

  setCart(cart);
  return cart;
}

/* ================= UI TYPES ================= */

type BadgeItem = { text: string; variant?: "dark" | "pink" | "white" };

type Props = {
  p: Product;
  onOpen?: (id: string) => void;

  hideCta?: boolean;
  badges?: BadgeItem[];
  topRightBadge?: string;
};

function BadgeChip({
  text,
  variant = "dark",
}: {
  text: string;
  variant?: BadgeItem["variant"];
}) {
  const cls =
    variant === "pink"
      ? "bg-pink-600 text-white"
      : variant === "white"
      ? "bg-white/90 text-gray-800 border border-pink-100"
      : "bg-gray-900/80 text-white";

  return (
    <span
      className={[
        "px-1.5 py-[2px] rounded-md text-[9px] font-bold leading-none shadow-sm",
        cls,
      ].join(" ")}
    >
      {text}
    </span>
  );
}

const FALLBACK_IMAGE =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(`
  <svg xmlns="http://www.w3.org/2000/svg" width="600" height="600">
    <rect width="600" height="600" fill="#FCE7F3"/>
    <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle"
      font-family="Arial" font-size="24" fill="#DB2777" font-weight="700">
      NO IMAGE
    </text>
  </svg>
`);

export default function ProductCard({
  p,
  onOpen,
  hideCta = false,
  badges = [],
  topRightBadge,
}: Props) {
  const navigate = useNavigate();

  const discount =
    p.originalPrice && p.originalPrice > p.price
      ? Math.round(((p.originalPrice - p.price) / p.originalPrice) * 100)
      : 0;

  const rightBadge = topRightBadge || (discount > 0 ? `-${discount}%` : "");

  const add = (e: React.MouseEvent) => {
    e.stopPropagation();

    addItem({
  id: p.id,
  name: p.name,
  price: p.price,
  qty: 1,          // ✅ qty (không phải quantity)
  image: p.image,
});
  message.success(`Đã thêm vào giỏ: ${p.name}`);
  };

  const open = () => {
    onOpen?.(p.id);
    console.log('Product clicked:', p.id);
    navigate(`/product/${p.id}`);
  };

  return (
    <div
      onClick={open}
      className={[
        "group cursor-pointer rounded-[14px] bg-white border border-pink-100",
        "hover:shadow-[0_8px_24px_rgba(236,72,153,0.12)] transition overflow-hidden",
        "active:scale-[0.99]",
      ].join(" ")}
    >
      {/* IMAGE */}
      <div className="relative aspect-square bg-pink-50 overflow-hidden">
        <img
          src={p.image}
          alt={p.name}
          loading="lazy"
          decoding="async"
          className="w-full h-full object-cover group-hover:scale-[1.03] transition duration-300"
          onError={(e) => ((e.target as HTMLImageElement).src = FALLBACK_IMAGE)}
        />

        {(badges.length > 0 || rightBadge) && (
          <div className="absolute top-1.5 left-1.5 right-1.5 flex items-start justify-between gap-1 pointer-events-none">
            <div className="flex flex-wrap gap-1 max-w-[75%]">
              {badges.map((b, idx) => (
                <BadgeChip key={`${b.text}-${idx}`} text={b.text} variant={b.variant} />
              ))}
            </div>

            {rightBadge && (
              <span className="shrink-0 px-1.5 py-[2px] rounded-md bg-yellow-300 text-gray-900 text-[9px] font-bold leading-none shadow-sm">
                {rightBadge}
              </span>
            )}
          </div>
        )}
      </div>

      {/* CONTENT */}
      <div className="p-2">
        <div className="text-[12px] font-semibold text-gray-900 line-clamp-2 min-h-[32px]">
          {p.name}
        </div>

        <div className="mt-0.5 flex items-center justify-between gap-1">
          <div className="text-pink-600 font-bold text-[13px]">{money(p.price)}đ</div>
          {p.originalPrice && <div className="text-[10px] text-gray-400 line-through">{money(p.originalPrice)}đ</div>}
        </div>

        <div className="mt-0.5 flex items-center gap-1">
          <Rate allowHalf disabled value={p.rating || 0} style={{ fontSize: 12 }} />
          <span className="text-[10px] text-gray-500">({p.reviews || 0})</span>
        </div>

        <div className="mt-0.5 flex items-center justify-between text-[10px] text-gray-500">
          <span>Đã bán {p.soldCount ? money(p.soldCount) : "—"}</span>
          <span>{p.location || "VN"}</span>
        </div>
        <Space>
         {!hideCta && (
          <Button
            size="small"
            onClick={add}
            className="mt-2 w-full h-8 rounded-xl !bg-pink-500 hover:!bg-pink-600 !border-pink-500 text-[11px]"
          >
            <ShoppingCart size={14} className="mr-1" />
          </Button>
        )}
        {!hideCta && (
          <Button
            size="small"
            onClick={() => navigate(`/product/${p.id}`)}
            className="mt-2 w-full h-8 rounded-xl !bg-pink-500 hover:!bg-pink-600 !border-pink-500 text-[11px]"
          >
            <ShoppingCart size={14} className="mr-1" />
            Mua Ngay
          </Button>
        )}
        </Space>
      </div>
    </div>
  );
}
