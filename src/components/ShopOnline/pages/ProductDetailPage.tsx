// src/pages/shop/ProductDetailPage.tsx
import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams , useSearchParams } from "react-router-dom";
import {
  Breadcrumb,
  Button,
  Divider,
  Modal,
  Spin,
  Tag,
  message,
  Empty,
  Collapse,
  Drawer,
  InputNumber,
  Popconfirm,
} from "antd";
import {
  ArrowLeft,
  ShoppingCart,
  Sparkles,
  CheckCircle2,
  Hash,
  Package,
  Image as ImageIcon,
  Zap,
  ShieldCheck,
  Truck,
  Trash2,
  Flame,
} from "lucide-react";

import ProductCard from "../components/shop/ProductCard";
import ShopHeader from "../components/shop/ShopHeader";
import api from "../../../services/api";

// ✅ CART (localStorage)
import {
  addItem,
  getCart,
  getCartTotal,
  subscribeCart,
  setQty,
  removeItem,
  clearCart,
} from "../../../utils/cart";

// =======================
// Types
// =======================
type ApiImage = { url: string; isPrimary?: boolean; order?: number };
type BreadcrumbItem = { name: string; url?: string };

type FlashSaleInfo = {
  flashSaleId: string;
  flashSaleName: string;
  flashSaleCode: string;
  startDate: string;
  endDate: string;
  originalPrice: number;
  flashPrice: number;
  discountPercent: number;
  discountAmount: number;
  badge: string;
  limitedQuantity: number | null;
  soldQuantity: number;
  remainingQuantity: number | null;
  maxPerCustomer: number | null;
};

type ApiVariant = {
  _id: string;
  sku?: string;
  barcode?: string;
  name?: string;
  attributes?: { k: string; v: string }[];
  attributesObj?: Record<string, string>;
  price?: number;
  displayPrice?: number;
  thumbnail?: string;
  images?: ApiImage[];
  isFlashSale?: boolean;
  flashSale?: FlashSaleInfo | null;
  isDefault?: boolean;
};

type ApiOption = { key: string; label: string; values: string[] };

type ApiProduct = {
  _id: string;
  sku?: string;
  name: string;
  brand?: string;
  categoryId?: string;
  categoryName?: string;
  thumbnail?: string;
  images?: ApiImage[];
  basePrice?: number;
  priceRange?: { min: number; max: number };
  hasVariants?: boolean;
  totalVariants?: number;

  shortDescription?: string;
  description?: string;
  descriptionHtml?: string;
  origin?: string;
  weight?: string;
  volume?: string;
};

type ApiProductDetail = {
  ok: boolean;
  product: ApiProduct;
  variants?: ApiVariant[];
  defaultVariant?: ApiVariant | null;
  options?: ApiOption[];
  breadcrumb?: BreadcrumbItem[];
};

type ApiCategoryItem = {
  _id: string;
  sku?: string;
  name: string;
  brand?: string;
  categoryId?: string;
  categoryName?: string;

  price?: number;
  minPrice?: number;
  maxPrice?: number;
  displayPrice?: number;

  thumbnail?: string;
  images?: ApiImage[];

  isFlashSale?: boolean;
  flashSalePrice?: number | null;
  maxDiscount?: number;
};

type ApiCategoryProductsRes = {
  ok: boolean;
  items: ApiCategoryItem[];
  total?: number;
  page?: number;
  limit?: number;
  totalPages?: number;
};

// =======================
// Helpers
// =======================



function money(n: number) {
  return Number(n || 0).toLocaleString("vi-VN") + "đ";
}

function safeText(s?: string) {
  return String(s || "").trim();
}

function pickImages(product?: ApiProduct, variant?: ApiVariant) {
  const list: string[] = [];
  if (variant?.thumbnail) list.push(variant.thumbnail);
  (variant?.images || []).forEach((i) => i?.url && list.push(i.url));

  if (list.length === 0) {
    if (product?.thumbnail) list.push(product.thumbnail);
    (product?.images || []).forEach((i) => i?.url && list.push(i.url));
  }

  const uniqueList = Array.from(new Set(list.filter((url) => url && url.trim())));
  if (uniqueList.length === 0) uniqueList.push("https://via.placeholder.com/900x900.png?text=No+Image");
  return uniqueList;
}

function findVariantBySelection(variants: ApiVariant[] = [], selection: Record<string, string>) {
  const entries = Object.entries(selection).filter(([_, v]) => String(v || "").length > 0);
  if (!entries.length) return undefined;

  return variants.find((v) => {
    const obj = v.attributesObj || {};
    return entries.every(([k, val]) => String(obj[k] || "") === String(val));
  });
}

function buildAvailableMap(variants: ApiVariant[] = []) {
  const available: Record<string, Record<string, number>> = {};
  for (const v of variants) {
    const obj = v.attributesObj || {};
    for (const [k, val] of Object.entries(obj)) {
      if (!available[k]) available[k] = {};
      available[k][val] = (available[k][val] || 0) + 1;
    }
  }
  return available;
}

function attrsTextFromSelection(selection: Record<string, string>) {
  const parts = Object.entries(selection)
    .filter(([_, v]) => String(v || "").trim().length > 0)
    .map(([k, v]) => `${k}: ${v}`);
  return parts.join(" • ");
}

// =======================
// UI components
// =======================
function Chip({
  active,
  disabled,
  children,
  onClick,
}: {
  active?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className={[
        "px-3 py-2 rounded-2xl border text-sm font-semibold transition",
        "focus:outline-none focus:ring-2 focus:ring-pink-200",
        disabled ? "opacity-40 cursor-not-allowed bg-gray-50 border-gray-200 text-gray-400" : "hover:bg-pink-50",
        active
          ? "bg-pink-50 border-pink-500 text-pink-700 shadow-sm"
          : "bg-white border-pink-200 text-gray-700 hover:border-pink-300",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function SectionTitle({ title, right }: { title: string; right?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="text-[15px] md:text-base font-extrabold text-gray-900">{title}</div>
      {right}
    </div>
  );
}

function Pill({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="rounded-2xl border border-pink-100 bg-white px-3 py-2 text-xs font-semibold text-gray-700 flex items-center gap-2">
      <span className="text-pink-600">{icon}</span>
      <span>{text}</span>
    </div>
  );
}

export default function ProductDetailPage() {
  const nav = useNavigate();
  const location = useLocation();
  const { id } = useParams();
  const [searchParams] = useSearchParams(); // ✅ Add this

  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<ApiProductDetail | null>(null);

  const [selection, setSelection] = useState<Record<string, string>>({});
  const [activeImg, setActiveImg] = useState<string>("");
  const [previewOpen, setPreviewOpen] = useState(false);

  const [relatedLoading, setRelatedLoading] = useState(false);
  const [related, setRelated] = useState<ApiCategoryItem[]>([]);

  const [buyNowOpen, setBuyNowOpen] = useState(false);

  // ✅ CART DRAWER
  const [cartOpen, setCartOpen] = useState(false);
  const [cartItems, setCartItems] = useState(() => getCart());
  const cartTotal = useMemo(() => getCartTotal(), [cartItems]);

   const initDefaultSelection = (payload: ApiProductDetail) => {
    const init: Record<string, string> = {};
    if (payload.defaultVariant?.attributesObj) {
      Object.assign(init, payload.defaultVariant.attributesObj);
    } else {
      (payload.options || []).forEach((o) => {
        if (o?.key && o?.values?.length) init[o.key] = o.values[0];
      });
    }
    setSelection(init);
  };

  useEffect(() => {
    setCartItems(getCart());
    const unsub = subscribeCart(() => setCartItems(getCart()));
    return () => {
      if (typeof unsub === "function") unsub();
    };
  }, []);

    useEffect(() => {
    if (!id) return;

    const ctrl = new AbortController();

    (async () => {
      setLoading(true);
      setData(null);
      setSelection({});
      setActiveImg("");
      setRelated([]);

      try {
        const res = await api.get(`/public/products/${id}`, { signal: ctrl.signal });
        const payload = res.data as ApiProductDetail;
        if (!payload?.ok || !payload?.product?._id) throw new Error("INVALID_PAYLOAD");

        setData(payload);

        // ✅ Check if variantId is in URL query params
        const variantIdFromUrl = searchParams.get('variantId');
        
        if (variantIdFromUrl) {
          // Find the variant from URL
          const targetVariant = payload.variants?.find(v => v._id === variantIdFromUrl);
          
          if (targetVariant?.attributesObj) {
            // Set selection from that variant
            setSelection(targetVariant.attributesObj);
          } else {
            // Fallback to default behavior
            initDefaultSelection(payload);
          }
        } else {
          // Normal behavior - use default variant
          initDefaultSelection(payload);
        }
      } catch (e: any) {
        if (e?.name !== "CanceledError") message.error("Không tải được chi tiết sản phẩm.");
      } finally {
        setLoading(false);
      }
    })();

    return () => ctrl.abort();
  }, [id, searchParams]); // ✅ Add searchParams dependency

  const product = data?.product;
  const options = data?.options || [];
  const variants = data?.variants || [];
  const breadcrumb = (data?.breadcrumb || []) as BreadcrumbItem[];

  const availableMap = useMemo(() => buildAvailableMap(variants), [variants]);

  const chosenVariant = useMemo(() => {
    if (!data) return undefined;

    const v = findVariantBySelection(variants, selection);
    if (v) return v;

    if (data.defaultVariant?._id) return data.defaultVariant;
    return variants.find((x) => x.isDefault);
  }, [data, variants, selection]);

  const images = useMemo(() => pickImages(product, chosenVariant), [product, chosenVariant]);

  useEffect(() => {
    if (!activeImg || !images.includes(activeImg)) {
      if (images.length > 0) setActiveImg(images[0]);
    }
  }, [images, activeImg]);

  const displayPrice = useMemo(() => {
    const vPrice = Number(chosenVariant?.displayPrice ?? chosenVariant?.price ?? 0);
    if (vPrice > 0) return vPrice;

    const pr = product?.priceRange;
    if (pr?.min != null && pr?.max != null) return pr.min;

    return Number(product?.basePrice ?? 0);
  }, [chosenVariant, product]);

  const priceRangeText = useMemo(() => {
    const pr = product?.priceRange;
    if (!pr?.min && !pr?.max) return "";
    if (pr?.min === pr?.max) return "";
    return `${money(pr.min)} - ${money(pr.max)}`;
  }, [product]);

  const isSelectionComplete = useMemo(() => {
    if (!options.length) return true;
    return options.every((o) => String(selection[o.key] || "").trim().length > 0);
  }, [options, selection]);

  const toggleSelection = (key: string, value: string) => {
    setSelection((prev) => {
      const cur = String(prev[key] || "");
      if (cur === value) return { ...prev, [key]: "" };
      return { ...prev, [key]: value };
    });
  };

  // ✅ Flash Sale Info
  const flashSaleInfo = useMemo(() => {
    return chosenVariant?.flashSale || null;
  }, [chosenVariant]);

  const isFlashSale = !!flashSaleInfo;

  const addToCart = () => {
    if (options.length && !chosenVariant?._id) return message.warning("Vui lòng chọn đầy đủ thuộc tính.");
    if (!product?._id) return;

    const cartId = chosenVariant?._id || product._id;
    const attrsText = attrsTextFromSelection(selection);

    addItem({
      id: cartId,
      name: product.name,
      price: displayPrice,
      qty: 1,
      image: activeImg || product.thumbnail || images?.[0],
      productId: product._id,
      variantId: chosenVariant?._id,
      sku: chosenVariant?.sku || product.sku,
      variantName: chosenVariant?.name,
      attrsText,
    });

    message.success("Đã thêm vào giỏ hàng");
  };

  const buyNow = () => {
    if (options.length && !chosenVariant?._id) return message.warning("Vui lòng chọn đầy đủ thuộc tính.");
    setBuyNowOpen(true);
  };

  const confirmBuyNow = () => {
    if (options.length && !chosenVariant?._id) return message.warning("Vui lòng chọn đầy đủ thuộc tính.");

    const buyNowItem = {
      id: chosenVariant?._id || product?._id,
      productId: product?._id,
      variantId: chosenVariant?._id,
      sku: chosenVariant?.sku || product?.sku || "",
      name: product?.name || "",
      price: displayPrice,
      qty: 1,
      image: images?.[0] || product?.thumbnail || "",
      attrsText: Object.entries(selection || {})
        .filter(([_, v]) => String(v || "").trim())
        .map(([k, v]) => `${k}: ${v}`)
        .join(" • "),
    };

    nav("/checkout", { state: { mode: "buyNow", buyNowItem } });
  };

  // Fetch related products
  useEffect(() => {
    if (!product?._id) return;

    const ctrl = new AbortController();

    const extractCategoryIdFromBreadcrumb = () => {
      const url = breadcrumb?.map((b) => b?.url).find((u) => typeof u === "string" && u.includes("/category/"));
      if (!url) return undefined;
      return url.split("/").filter(Boolean).pop();
    };

    const fetchRelated = async () => {
      const categoryId = extractCategoryIdFromBreadcrumb() || product.categoryId;
      if (!categoryId) return;

      setRelatedLoading(true);
      try {
        const res = await api.get(`/public/categories/${categoryId}/products`, {
          signal: ctrl.signal,
          params: { includeSubcategories: true, limit: 12 },
        });

        const payload = res.data as ApiCategoryProductsRes | any;
        const items: ApiProduct[] = Array.isArray(payload?.items) ? payload.items : [];

        const filtered = items.filter((x) => x?._id && x._id !== product._id).slice(0, 8);
        setRelated(filtered);
      } catch (e: any) {
        // silent
      } finally {
        setRelatedLoading(false);
      }
    };

    fetchRelated();
    return () => ctrl.abort();
  }, [product?._id, product?.categoryId, breadcrumb]);

  if (loading) {
    return (
      <div className="min-h-screen w-full bg-gradient-to-b from-pink-50/60 to-white px-5 md:px-8 lg:px-10 py-10 flex justify-center">
        <Spin />
      </div>
    );
  }

  if (!data || !product) {
    return (
      <div className="min-h-screen w-full bg-gradient-to-b from-pink-50/60 to-white px-5 md:px-8 lg:px-10 py-10">
        <Button onClick={() => nav("/shop")} className="rounded-2xl border-pink-200 text-pink-700">
          <ArrowLeft size={16} className="mr-1" /> Quay lại
        </Button>
        <div className="mt-6">
          <Empty description="Không có dữ liệu sản phẩm" />
        </div>
      </div>
    );
  }

  const shortDesc = safeText(product.shortDescription) || safeText(product.description);
  const hasHtml = safeText(product.descriptionHtml).length > 0;

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-pink-50/60 to-white">
      <ShopHeader
        {...({
          onSearch: (v: string) => {},
          onOpenVoucher: () => window.scrollTo({ top: 450, behavior: "smooth" }),
          onOpenCart: () => setCartOpen(true),
        } as any)}
      />

      <div className="mx-auto w-full max-w-[1180px] px-4 md:px-8 py-5 pb-28 lg:pb-8">
        {/* Top bar */}
        <div className="flex items-center justify-between gap-3">
          <Button onClick={() => nav(-1)} className="rounded-2xl border-pink-200 text-pink-700">
            <ArrowLeft size={16} className="mr-1" /> Quay lại
          </Button>

          <Breadcrumb items={breadcrumb.map((b) => ({ title: String(b.name || "") }))} />
        </div>

        {/* Main layout */}
        <div className="mt-4 grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Gallery */}
          <div className="lg:col-span-6">
            <div className="rounded-[26px] border border-pink-100 bg-white shadow-sm overflow-hidden">
              <div className="relative aspect-square bg-pink-50">
                <div className="absolute inset-0 bg-gradient-to-tr from-pink-200/20 via-transparent to-white/10 pointer-events-none" />
                <img
                  src={activeImg}
                  alt={product.name}
                  className="w-full h-full object-cover"
                  onError={(e) =>
                    ((e.target as HTMLImageElement).src = "https://via.placeholder.com/900x900.png?text=Image+Error")
                  }
                />

                <div className="absolute top-3 left-3 flex flex-wrap gap-2">
                  {product.categoryName ? (
                    <Tag className="!m-0 rounded-full border-0 bg-pink-600 text-white font-bold">{product.categoryName}</Tag>
                  ) : null}
                  
                  {/* ✅ Flash Sale Badge */}
                  {isFlashSale && flashSaleInfo && (
                    <Tag className="!m-0 rounded-full border-0 bg-red-500 text-white font-bold animate-pulse">
                      <Flame size={12} className="inline mr-1" />
                      {flashSaleInfo.badge || "FLASH SALE"}
                    </Tag>
                  )}

                  {product.hasVariants ? (
                    <Tag className="!m-0 rounded-full border-0 bg-gray-900/70 text-white font-bold">
                      {product.totalVariants || variants.length} biến thể
                    </Tag>
                  ) : null}
                </div>

                <button
                  onClick={() => setPreviewOpen(true)}
                  className="absolute bottom-3 right-3 px-3 py-2 rounded-2xl bg-white/90 border border-pink-100 hover:bg-pink-50 text-sm font-extrabold text-pink-700 shadow-sm"
                >
                  <span className="inline-flex items-center gap-2">
                    <ImageIcon size={16} /> Xem ảnh
                  </span>
                </button>
              </div>

              <div className="p-3 border-t border-pink-100">
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {images.map((u) => {
                    const active = u === activeImg;
                    return (
                      <button
                        key={u}
                        onClick={() => setActiveImg(u)}
                        className={[
                          "h-16 w-16 rounded-2xl overflow-hidden border shrink-0 bg-pink-50 transition",
                          active ? "border-pink-500 ring-2 ring-pink-200" : "border-pink-100 hover:border-pink-300",
                        ].join(" ")}
                      >
                        <img src={u} alt="thumb" className="w-full h-full object-cover" loading="lazy" />
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-3 gap-2">
              <Pill icon={<ShieldCheck size={16} />} text="Chính hãng" />
              <Pill icon={<Truck size={16} />} text="Giao nhanh" />
              <Pill icon={<CheckCircle2 size={16} />} text="Đổi trả" />
            </div>
          </div>

          {/* Info */}
          <div className="lg:col-span-6">
            <div className="rounded-[26px] border border-pink-100 bg-white shadow-sm p-5">
              <div className="text-[22px] md:text-[28px] leading-tight font-extrabold text-gray-900">{product.name}</div>

              <div className="mt-2 text-sm text-gray-600">
                {product.brand ? <span className="font-semibold">{product.brand}</span> : null}
                {product.brand && product.sku ? <span className="mx-2 text-gray-300">•</span> : null}
                {product.sku ? <span className="font-mono text-xs">SKU: {product.sku}</span> : null}
              </div>

              {shortDesc ? (
                <div className="mt-3 text-sm text-gray-700 leading-relaxed">
                  {shortDesc.length > 160 ? shortDesc.slice(0, 160) + "…" : shortDesc}
                </div>
              ) : null}

              {/* ✅ Flash Sale Info Banner */}
              {isFlashSale && flashSaleInfo && (
                <div className="mt-4 rounded-2xl border-2 border-red-500 bg-gradient-to-r from-red-50 to-pink-50 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <div className="h-10 w-10 rounded-full bg-red-500 flex items-center justify-center">
                        <Flame size={20} className="text-white" />
                      </div>
                      <div>
                        <div className="font-extrabold text-red-700">FLASH SALE</div>
                        <div className="text-xs text-red-600">
                          Kết thúc: {new Date(flashSaleInfo.endDate).toLocaleString("vi-VN")}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-extrabold text-red-600">-{flashSaleInfo.discountPercent}%</div>
                      {flashSaleInfo.remainingQuantity !== null && (
                        <div className="text-xs text-gray-600">
                          Còn: <span className="font-bold">{flashSaleInfo.remainingQuantity}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div className="mt-4 rounded-2xl border border-pink-100 bg-gradient-to-r from-pink-50 to-white p-4">
                <div className="flex items-end justify-between gap-3">
                  <div>
                    {/* ✅ Show both flash price and original if flash sale */}
                    {isFlashSale && flashSaleInfo ? (
                      <div>
                        <div className="text-pink-600 text-3xl font-extrabold">{money(displayPrice)}</div>
                        <div className="text-lg text-gray-400 line-through mt-1">
                          {money(flashSaleInfo.originalPrice)}
                        </div>
                        <div className="text-xs text-green-700 font-bold mt-1">
                          Tiết kiệm: {money(flashSaleInfo.discountAmount)}
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div className="text-pink-600 text-3xl font-extrabold">{money(displayPrice)}</div>
                        {priceRangeText ? <div className="text-xs text-gray-500 mt-1">Khoảng giá: {priceRangeText}</div> : null}
                      </div>
                    )}
                    
                    {!isSelectionComplete ? (
                      <div className="mt-2 text-xs font-semibold text-amber-700">Vui lòng chọn đủ thuộc tính để mua.</div>
                    ) : null}
                  </div>

                  <div className="hidden sm:flex flex-col gap-2 min-w-[180px]">
                    <Button
                      type="primary"
                      onClick={buyNow}
                      disabled={!isSelectionComplete}
                      className="rounded-2xl !bg-pink-600 hover:!bg-pink-700 !border-pink-600 h-11 font-extrabold"
                    >
                      <Zap size={18} />
                      <span className="ml-2">Mua ngay</span>
                    </Button>

                    <Button
                      onClick={addToCart}
                      disabled={!isSelectionComplete}
                      className="rounded-2xl border-pink-200 text-pink-700 h-11 font-extrabold"
                    >
                      <ShoppingCart size={18} />
                      <span className="ml-2">Thêm giỏ</span>
                    </Button>
                  </div>
                </div>

                <div className="sm:hidden mt-3 grid grid-cols-2 gap-2">
                  <Button
                    type="primary"
                    onClick={buyNow}
                    disabled={!isSelectionComplete}
                    className="rounded-2xl !bg-pink-600 hover:!bg-pink-700 !border-pink-600 h-11 font-extrabold"
                  >
                    <Zap size={18} />
                    <span className="ml-2">Mua ngay</span>
                  </Button>
                  <Button
                    onClick={addToCart}
                    disabled={!isSelectionComplete}
                    className="rounded-2xl border-pink-200 text-pink-700 h-11 font-extrabold"
                  >
                    <ShoppingCart size={18} />
                    <span className="ml-2">Giỏ hàng</span>
                  </Button>
                </div>
              </div>

              <Divider className="!my-4" />

              {/* Options */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-pink-600">
                      <Sparkles size={18} />
                    </span>
                    <div className="font-extrabold text-gray-900">Chọn thuộc tính</div>
                  </div>
                  {chosenVariant?._id ? (
                    <span className="text-xs font-bold text-green-700 inline-flex items-center gap-1">
                      <CheckCircle2 size={14} /> Đã chọn biến thể
                    </span>
                  ) : (
                    <span className="text-xs text-gray-500">Chọn để xem đúng SKU/giá</span>
                  )}
                </div>

                {options.length ? (
                  options.map((opt) => {
                    const cur = String(selection[opt.key] || "");
                    const availForKey = availableMap[opt.key] || {};

                    return (
                      <div key={opt.key}>
                        <div className="text-xs text-gray-500 mb-2">{opt.label || opt.key}</div>
                        <div className="flex flex-wrap gap-2">
                          {(opt.values || []).map((v) => {
                            const active = cur === v;
                            const disabled = !availForKey[v];

                            return (
                              <Chip key={v} active={active} disabled={disabled} onClick={() => !disabled && toggleSelection(opt.key, v)}>
                                {v}
                              </Chip>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-sm text-gray-500">Sản phẩm không có thuộc tính.</div>
                )}
              </div>

              <Divider className="!my-4" />

              {/* Variant info (compact) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="rounded-2xl border border-pink-100 bg-pink-50/40 p-3">
                  <div className="flex items-center gap-2 text-sm">
                    <Hash size={16} className="text-pink-600" />
                    <span className="text-gray-500">Variant ID</span>
                  </div>
                  <div className="mt-1 font-semibold text-gray-900 break-all text-xs">{chosenVariant?._id || "—"}</div>
                </div>

                <div className="rounded-2xl border border-pink-100 bg-pink-50/40 p-3">
                  <div className="flex items-center gap-2 text-sm">
                    <Package size={16} className="text-pink-600" />
                    <span className="text-gray-500">SKU</span>
                  </div>
                  <div className="mt-1 font-mono text-xs text-gray-900 break-all">{chosenVariant?.sku || product.sku || "—"}</div>
                </div>
              </div>
            </div>

            {/* Product details */}
            <div className="mt-4 rounded-[26px] border border-pink-100 bg-white shadow-sm p-5">
              <SectionTitle title="Chi tiết sản phẩm" />
              <div className="mt-3">
                <Collapse
                  accordion
                  bordered={false}
                  expandIconPosition="end"
                  className="!bg-transparent"
                  items={[
                    {
                      key: "desc",
                      label: <span className="font-extrabold text-gray-900">Mô tả</span>,
                      children: (
                        <div className="text-sm text-gray-700 leading-relaxed">
                          {hasHtml ? (
                            <div
                              className="prose max-w-none prose-p:my-2 prose-ul:my-2 prose-ol:my-2"
                              dangerouslySetInnerHTML={{ __html: product.descriptionHtml || "" }}
                            />
                          ) : (
                            <div className="whitespace-pre-line">{safeText(product.description) || "Chưa có mô tả."}</div>
                          )}
                        </div>
                      ),
                    },
                    {
                      key: "info",
                      label: <span className="font-extrabold text-gray-900">Thông tin</span>,
                      children: (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                          <div className="rounded-2xl border border-pink-100 bg-pink-50/40 p-3">
                            <div className="text-xs text-gray-500">Thương hiệu</div>
                            <div className="font-bold text-gray-900">{product.brand || "—"}</div>
                          </div>
                          <div className="rounded-2xl border border-pink-100 bg-pink-50/40 p-3">
                            <div className="text-xs text-gray-500">Xuất xứ</div>
                            <div className="font-bold text-gray-900">{product.origin || "—"}</div>
                          </div>
                          <div className="rounded-2xl border border-pink-100 bg-pink-50/40 p-3">
                            <div className="text-xs text-gray-500">Khối lượng</div>
                            <div className="font-bold text-gray-900">{product.weight || "—"}</div>
                          </div>
                          <div className="rounded-2xl border border-pink-100 bg-pink-50/40 p-3">
                            <div className="text-xs text-gray-500">Dung tích</div>
                            <div className="font-bold text-gray-900">{product.volume || "—"}</div>
                          </div>
                        </div>
                      ),
                    },
                    {
                      key: "policy",
                      label: <span className="font-extrabold text-gray-900">Chính sách</span>,
                      children: (
                        <div className="text-sm text-gray-700 leading-relaxed space-y-2">
                          <div>• Đổi trả theo chính sách cửa hàng (nếu sản phẩm lỗi do nhà sản xuất).</div>
                          <div>• Giao hàng nội thành 1-2 ngày, ngoại thành 2-5 ngày.</div>
                          <div>• Hỗ trợ kiểm hàng (tuỳ khu vực).</div>
                        </div>
                      ),
                    },
                  ]}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Related products */}
        <div className="mt-6 rounded-[26px] border border-pink-100 bg-white shadow-sm p-5">
          <SectionTitle title="Gợi ý cho bạn" />

          {relatedLoading ? (
            <div className="py-8 flex justify-center">
              <Spin />
            </div>
          ) : related.length === 0 ? (
            <div className="mt-3 text-sm text-gray-500">Chưa có sản phẩm gợi ý trong danh mục này.</div>
          ) : (
            <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {related.map((rp) => {
                const image =
                  rp.thumbnail ||
                  rp.images?.find((x) => x?.isPrimary)?.url ||
                  rp.images?.[0]?.url ||
                  "https://via.placeholder.com/600x600.png?text=No+Image";

                const price = Number(rp.displayPrice ?? rp.minPrice ?? rp.price ?? 0) || 0;

                const originalPrice =
                  rp.maxDiscount && rp.maxDiscount > 0 ? Math.round(price / (1 - rp.maxDiscount / 100)) : undefined;

                const cardProduct = {
                  id: rp._id,
                  name: rp.name,
                  brand: rp.brand,
                  categoryId: rp.categoryId,
                  price,
                  originalPrice,
                  image,
                  flashSale: !!rp.isFlashSale,
                  tags: rp.isFlashSale ? ["Flash"] : [],
                  location: "VN",
                };

                return (
                  <div key={rp._id} onClick={() => nav(`/product/${rp._id}`)}>
                    <ProductCard p={cardProduct as any} />
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Preview modal */}
        <Modal
          open={previewOpen}
          onCancel={() => setPreviewOpen(false)}
          footer={null}
          width={980}
          centered
          className="[&_.ant-modal-content]:rounded-[22px] [&_.ant-modal-content]:overflow-hidden"
        >
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            <div className="md:col-span-8">
              <div className="rounded-[18px] overflow-hidden border border-pink-100 bg-pink-50">
                <img
                  src={activeImg}
                  alt="preview"
                  className="w-full h-[520px] object-cover"
                  onError={(e) =>
                    ((e.target as HTMLImageElement).src = "https://via.placeholder.com/900x900.png?text=Image+Error")
                  }
                />
              </div>
            </div>
            <div className="md:col-span-4">
              <div className="font-extrabold text-gray-900 mb-2">Ảnh sản phẩm</div>
              <div className="grid grid-cols-4 md:grid-cols-3 gap-2 max-h-[520px] overflow-auto pr-1">
                {images.map((u) => {
                  const active = u === activeImg;
                  return (
                    <button
                      key={u}
                      onClick={() => setActiveImg(u)}
                      className={[
                        "aspect-square rounded-2xl overflow-hidden border bg-pink-50 transition",
                        active ? "border-pink-500 ring-2 ring-pink-200" : "border-pink-100 hover:border-pink-300",
                      ].join(" ")}
                    >
                      <img src={u} alt="thumb2" className="w-full h-full object-cover" loading="lazy" />
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </Modal>

        {/* Buy now confirm modal */}
        <Modal
          open={buyNowOpen}
          onCancel={() => setBuyNowOpen(false)}
          onOk={() => confirmBuyNow()}
          okText="Thanh toán"
          cancelText="Để sau"
          centered
          className="[&_.ant-modal-content]:rounded-[22px]"
          okButtonProps={{ className: "!bg-pink-600 !border-pink-600 hover:!bg-pink-700" }}
        >
          <div className="flex items-start gap-3">
            <div className="mt-1 text-pink-600">
              <Zap size={20} />
            </div>
            <div className="flex-1">
              <div className="text-lg font-extrabold text-gray-900">Mua ngay</div>
              <div className="mt-1 text-sm text-gray-600">Bạn muốn thanh toán ngay với cấu hình đã chọn?</div>
              <div className="mt-3 rounded-2xl border border-pink-100 bg-pink-50/40 p-3">
                <div className="font-extrabold text-gray-900 line-clamp-1">{product.name}</div>
                <div className="mt-1 text-sm text-pink-600 font-extrabold">{money(displayPrice)}</div>
              </div>
            </div>
          </div>
        </Modal>
      </div>

      {/* ✅ CART DRAWER */}
      <Drawer
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        width={420}
        title={<div className="font-extrabold text-gray-900">Giỏ hàng</div>}
        destroyOnClose
      >
        {cartItems.length === 0 ? (
          <div className="py-10">
            <Empty description="Giỏ hàng đang trống" />
          </div>
        ) : (
          <div className="flex flex-col h-full">
            <div className="flex-1 space-y-3 overflow-auto pr-1">
              {cartItems.map((it) => (
                <div key={it.id} className="rounded-2xl border border-pink-100 bg-white p-3 flex gap-3">
                  <img
                    src={it.image || "https://via.placeholder.com/120x120.png?text=No+Image"}
                    alt={it.name}
                    className="w-16 h-16 rounded-xl object-cover border border-pink-100"
                    onError={(e) =>
                      ((e.currentTarget as HTMLImageElement).src = "https://via.placeholder.com/120x120.png?text=No+Image")
                    }
                  />

                  <div className="flex-1 min-w-0">
                    <div className="font-extrabold text-gray-900 text-sm line-clamp-2">{it.name}</div>

                    <div className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                      {it.sku ? `SKU: ${it.sku}` : ""}
                      {it.attrsText ? (it.sku ? ` • ${it.attrsText}` : it.attrsText) : ""}
                    </div>

                    <div className="mt-2 flex items-center justify-between gap-2">
                      <div className="text-pink-600 font-extrabold">{money(it.price)}</div>

                      <div className="flex items-center gap-2">
                        <InputNumber
                          min={1}
                          value={it.qty}
                          onChange={(v) => setQty(it.id, Number(v || 1))}
                          className="w-[90px]"
                        />

                        <Popconfirm
                          title="Xoá sản phẩm khỏi giỏ?"
                          okText="Xoá"
                          cancelText="Huỷ"
                          okButtonProps={{ danger: true }}
                          onConfirm={() => removeItem(it.id)}
                        >
                          <Button danger className="rounded-xl" icon={<Trash2 size={16} />} />
                        </Popconfirm>
                      </div>
                    </div>

                    <div className="mt-1 text-xs text-gray-500">
                      Tạm tính: <span className="font-bold">{money(it.price * it.qty)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <Divider className="!my-4" />

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-600">Tổng cộng</div>
                <div className="text-lg font-extrabold text-pink-600">{money(cartTotal)}</div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Popconfirm
                  title="Xoá toàn bộ giỏ hàng?"
                  okText="Xoá"
                  cancelText="Huỷ"
                  okButtonProps={{ danger: true }}
                  onConfirm={() => clearCart()}
                >
                  <Button className="rounded-2xl border-pink-200 text-pink-700">Xoá hết</Button>
                </Popconfirm>

                <Button
                  type="primary"
                  className="rounded-2xl !bg-pink-600 !border-pink-600 hover:!bg-pink-700"
                  onClick={() => {
                    setCartOpen(false);
                    nav("/checkout", { state: { cart: getCart() } });
                  }}
                >
                  Thanh toán
                </Button>
              </div>
            </div>
          </div>
        )}
      </Drawer>

      {/* Sticky bottom bar (Mobile) */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40">
        <div className="mx-auto max-w-[1180px] px-4 pb-4">
          <div className="rounded-[22px] border border-pink-100 bg-white/95 backdrop-blur shadow-lg p-3 flex items-center gap-2">
            <div className="flex-1 min-w-0">
              <div className="text-[11px] text-gray-500">Giá</div>
              <div className="text-pink-600 font-extrabold truncate">{money(displayPrice)}</div>
            </div>
            <Button
              type="primary"
              onClick={buyNow}
              disabled={!isSelectionComplete}
              className="rounded-2xl !bg-pink-600 hover:!bg-pink-700 !border-pink-600 h-11 font-extrabold"
            >
              <Zap size={18} />
              <span className="ml-2">Mua ngay</span>
            </Button>
            <Button
              onClick={addToCart}
              disabled={!isSelectionComplete}
              className="rounded-2xl border-pink-200 text-pink-700 h-11 font-extrabold"
            >
              <ShoppingCart size={18} />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}