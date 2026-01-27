// src/utils/cart.ts

export type CartItem = {
  id: string;
  name: string;
  price: number;
  qty: number;
  image?: string;

  // optional metadata (không bắt buộc)
  sku?: string;
  productId?: string;
  variantId?: string;
  variantName?: string;
  attrsText?: string;

  // optional: nếu bạn muốn giữ giá gốc để show gạch ngang
  originalPrice?: number;
};

const KEY = "baoan_cart_v1";

type Listener = () => void;
const listeners = new Set<Listener>();

function emit() {
  listeners.forEach((fn) => {
    try {
      fn();
    } catch {}
  });
}

export function subscribeCart(fn: Listener) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Read cart from localStorage */
export function getCart(): CartItem[] {
  try {
    const raw = localStorage.getItem(KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? (arr as CartItem[]) : [];
  } catch {
    return [];
  }
}

/** Save cart to localStorage */
function saveCart(items: CartItem[]) {
  localStorage.setItem(KEY, JSON.stringify(items));
  emit();
}

/** Total quantity in cart */
export function getCartCount(): number {
  return getCart().reduce((s, it) => s + Number(it.qty || 0), 0);
}

/** Total money (sum price * qty) */
export function getCartTotal(): number {
  return getCart().reduce((s, it) => s + Number(it.price || 0) * Number(it.qty || 0), 0);
}

/**
 * Add item to cart.
 * - If exists (same id) => increase qty
 * - qty default = 1
 *
 * IMPORTANT: dùng `qty` (không phải `quantity`)
 */
export function addItem(input: Omit<CartItem, "qty"> & { qty?: number }) {
  const qty = Math.max(1, Number(input.qty ?? 1));

  const items = getCart();
  const idx = items.findIndex((x) => x.id === String(input.id));

  if (idx >= 0) {
    items[idx].qty = Number(items[idx].qty || 0) + qty;
    saveCart(items);
    return;
  }

  items.unshift({
    id: String(input.id),
    name: String(input.name || ""),
    price: Number(input.price || 0),
    qty,
    image: input.image,

    sku: input.sku,
    productId: input.productId,
    variantId: input.variantId,
    variantName: input.variantName,
    attrsText: input.attrsText,
    originalPrice: input.originalPrice,
  });

  saveCart(items);
}

/** Set qty (min 1). If not found => ignore */
export function setQty(id: string, qty: number) {
  const n = Math.max(1, Number(qty || 1));
  const items = getCart();
  const idx = items.findIndex((x) => x.id === String(id));
  if (idx < 0) return;
  items[idx].qty = n;
  saveCart(items);
}

/** Increase qty by 1 */
export function incQty(id: string) {
  const items = getCart();
  const idx = items.findIndex((x) => x.id === String(id));
  if (idx < 0) return;
  items[idx].qty = Number(items[idx].qty || 0) + 1;
  saveCart(items);
}

/** Decrease qty by 1 (min 1) */
export function decQty(id: string) {
  const items = getCart();
  const idx = items.findIndex((x) => x.id === String(id));
  if (idx < 0) return;
  items[idx].qty = Math.max(1, Number(items[idx].qty || 1) - 1);
  saveCart(items);
}

/** Remove item by id */
export function removeItem(id: string) {
  const items = getCart().filter((x) => x.id !== String(id));
  saveCart(items);
}

/** Clear cart */
export function clearCart() {
  saveCart([]);
}

/** Find item (optional helper) */
export function findCartItem(id: string): CartItem | undefined {
  return getCart().find((x) => x.id === String(id));
}
