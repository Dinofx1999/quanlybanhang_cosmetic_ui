import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Breadcrumb, Button, Divider, Modal, Spin, Tag, message, Empty, InputNumber } from "antd";
import { 
  ArrowLeft, 
  ShoppingCart, 
  Heart,
  Share2,
  Truck,
  Shield,
  RotateCcw,
  Star,
  MessageCircle,
  Package,
  ChevronRight,
  Minus,
  Plus
} from "lucide-react";
import api from "../../../services/api";

// =======================
// Types
// =======================
type ApiImage = { url: string; isPrimary?: boolean; order?: number };

type BreadcrumbItem = { name: string; url?: string };

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
  flashSale?: any;
  isDefault?: boolean;
  stock?: number;
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
  description?: string;
  shortDescription?: string;
};

type ApiProductDetail = {
  ok: boolean;
  product: ApiProduct;
  variants?: ApiVariant[];
  defaultVariant?: ApiVariant | null;
  options?: ApiOption[];
  breadcrumb?: BreadcrumbItem[];
};

// =======================
// Helpers
// =======================
function money(n: number) {
  return Number(n || 0).toLocaleString("vi-VN") + "đ";
}

function pickImages(product?: ApiProduct, variant?: ApiVariant) {
  const list: string[] = [];

  if (variant?.thumbnail) list.push(variant.thumbnail);
  (variant?.images || []).forEach((i) => i?.url && list.push(i.url));

  if (list.length === 0) {
    if (product?.thumbnail) list.push(product.thumbnail);
    (product?.images || []).forEach((i) => i?.url && list.push(i.url));
  }

  const uniqueList = Array.from(new Set(list.filter(url => url && url.trim())));

  if (uniqueList.length === 0) {
    uniqueList.push("https://via.placeholder.com/600x600.png?text=No+Image");
  }

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

// =======================
// UI Components
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
        "px-4 py-2.5 rounded-xl border-2 text-sm font-semibold transition-all min-w-[80px]",
        disabled 
          ? "opacity-40 cursor-not-allowed bg-gray-50 border-gray-200 text-gray-400" 
          : "hover:border-pink-400",
        active 
          ? "bg-pink-500 border-pink-500 text-white shadow-md" 
          : "bg-white border-gray-200 text-gray-700",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function InfoCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="flex items-start gap-2 p-3 rounded-xl bg-gray-50 border border-gray-100">
      <div className="text-pink-600 mt-0.5 flex-shrink-0">{icon}</div>
      <div className="min-w-0 flex-1">
        <div className="font-semibold text-gray-900 text-xs leading-tight">{title}</div>
        <div className="text-[11px] text-gray-600 mt-0.5 leading-tight">{description}</div>
      </div>
    </div>
  );
}

// =======================
// Page
// =======================
export default function ProductDetailPage() {
  const nav = useNavigate();
  const { id } = useParams();

  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<ApiProductDetail | null>(null);

  const [selection, setSelection] = useState<Record<string, string>>({});
  const [activeImg, setActiveImg] = useState<string>("");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [isFavorite, setIsFavorite] = useState(false);

  useEffect(() => {
    if (!id) return;

    const ctrl = new AbortController();

    (async () => {
      setLoading(true);
      setData(null);
      setSelection({});
      setActiveImg("");
      setQuantity(1);

      try {
        const res = await api.get(`/public/products/${id}`, { signal: ctrl.signal });
        const payload = res.data as ApiProductDetail;

        if (!payload?.ok || !payload?.product?._id) throw new Error("INVALID_PAYLOAD");

        setData(payload);

        const init: Record<string, string> = {};
        if (payload.defaultVariant?.attributesObj) {
          Object.assign(init, payload.defaultVariant.attributesObj);
        } else {
          (payload.options || []).forEach((o) => {
            if (o?.key && o?.values?.length) init[o.key] = o.values[0];
          });
        }
        setSelection(init);
      } catch (e: any) {
        if (e?.name !== "CanceledError") message.error("Không tải được chi tiết sản phẩm.");
      } finally {
        setLoading(false);
      }
    })();

    return () => ctrl.abort();
  }, [id]);

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

  const images = useMemo(() => {
    return pickImages(product, chosenVariant);
  }, [product, chosenVariant]);

  useEffect(() => {
    if (!activeImg || !images.includes(activeImg)) {
      if (images.length > 0) {
        setActiveImg(images[0]);
      }
    }
  }, [images]);

  const displayPrice = useMemo(() => {
    const vPrice = Number(chosenVariant?.displayPrice ?? chosenVariant?.price ?? 0);
    if (vPrice > 0) return vPrice;

    const pr = product?.priceRange;
    if (pr?.min != null && pr?.max != null) return pr.min;

    return Number(product?.basePrice ?? 0);
  }, [chosenVariant, product]);

  const originalPrice = useMemo(() => {
    if (chosenVariant?.isFlashSale && chosenVariant?.price) {
      return chosenVariant.price * 1.2;
    }
    return null;
  }, [chosenVariant]);

  const discountPercent = useMemo(() => {
    if (!originalPrice || !displayPrice) return null;
    return Math.round(((originalPrice - displayPrice) / originalPrice) * 100);
  }, [originalPrice, displayPrice]);

  const stock = chosenVariant?.stock ?? 999;
  const isOutOfStock = stock <= 0;

  const addToCart = () => {
    if (options.length && !chosenVariant?._id) {
      return message.warning("Vui lòng chọn đầy đủ thuộc tính sản phẩm");
    }
    if (isOutOfStock) {
      return message.error("Sản phẩm hiện đang hết hàng");
    }
    message.success(`Đã thêm ${quantity} sản phẩm vào giỏ hàng`);
  };

  const buyNow = () => {
    if (options.length && !chosenVariant?._id) {
      return message.warning("Vui lòng chọn đầy đủ thuộc tính sản phẩm");
    }
    if (isOutOfStock) {
      return message.error("Sản phẩm hiện đang hết hàng");
    }
    message.success("Chuyển đến trang thanh toán...");
  };

  const toggleSelection = (key: string, value: string) => {
    setSelection((prev) => {
      const cur = String(prev[key] || "");
      if (cur === value) return { ...prev, [key]: "" };
      return { ...prev, [key]: value };
    });
  };

  const toggleFavorite = () => {
    setIsFavorite(!isFavorite);
    message.success(isFavorite ? "Đã bỏ yêu thích" : "Đã thêm vào yêu thích");
  };

  const shareProduct = () => {
    if (navigator.share) {
      navigator.share({
        title: product?.name,
        text: product?.shortDescription || product?.name,
        url: window.location.href,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      message.success("Đã sao chép link sản phẩm");
    }
  };

  // =======================
  // Render
  // =======================
  if (loading) {
    return (
      <div className="min-h-screen w-full bg-gray-50 flex items-center justify-center">
        <Spin size="large" />
      </div>
    );
  }

  if (!data || !product) {
    return (
      <div className="min-h-screen w-full bg-gray-50 p-4">
        <Button onClick={() => nav(-1)} icon={<ArrowLeft size={16} />} className="rounded-xl mb-4">
          Quay lại
        </Button>
        <Empty description="Không tìm thấy sản phẩm" />
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-gray-50 pb-24 md:pb-6">
      {/* Mobile Header - Sticky */}
      <div className="sticky top-0 z-50 bg-white border-b border-gray-200 md:relative">
        <div className="flex items-center justify-between px-4 py-3">
          <button 
            onClick={() => nav(-1)}
            className="p-2 -ml-2 rounded-xl hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft size={20} className="text-gray-700" />
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={toggleFavorite}
              className="p-2 rounded-xl hover:bg-gray-100 transition-colors"
            >
              <Heart 
                size={20} 
                className={isFavorite ? "fill-pink-500 text-pink-500" : "text-gray-700"}
              />
            </button>
            <button
              onClick={shareProduct}
              className="p-2 rounded-xl hover:bg-gray-100 transition-colors"
            >
              <Share2 size={20} className="text-gray-700" />
            </button>
          </div>
        </div>

        {/* Desktop Breadcrumb - Hidden on mobile */}
        <div className="hidden md:block px-4 pb-3">
          <Breadcrumb
            separator={<ChevronRight size={14} className="text-gray-400" />}
            items={breadcrumb.map((b) => ({
              title: <span className="text-sm">{String(b.name || "")}</span>,
            }))}
          />
        </div>
      </div>

      {/* Content */}
      <div className="md:max-w-7xl md:mx-auto md:px-4 lg:px-8">
        <div className="md:grid md:grid-cols-12 md:gap-6 md:mt-6">
          {/* Gallery Section */}
          <div className="md:col-span-5 bg-white md:rounded-2xl md:border md:border-gray-200 md:shadow-sm md:sticky md:top-24">
            {/* Main Image */}
            <div className="relative aspect-square bg-white">
              <img 
                src={activeImg} 
                alt={product.name} 
                className="w-full h-full object-contain"
                onClick={() => setPreviewOpen(true)}
              />

              {/* Badges - Mobile Optimized */}
              <div className="absolute top-3 left-3 flex flex-col gap-2">
                {discountPercent && (
                  <div className="bg-red-500 text-white px-2.5 py-1 rounded-lg font-bold text-xs shadow-lg">
                    -{discountPercent}%
                  </div>
                )}
                {product.categoryName && (
                  <div className="bg-white/95 backdrop-blur-sm text-gray-900 px-2.5 py-1 rounded-lg font-semibold text-[10px] border border-gray-200">
                    {product.categoryName}
                  </div>
                )}
              </div>

              {/* Image Counter - Mobile */}
              <div className="md:hidden absolute bottom-3 right-3 px-2.5 py-1 rounded-lg bg-black/60 backdrop-blur-sm text-white text-xs font-semibold">
                {images.indexOf(activeImg) + 1}/{images.length}
              </div>
            </div>

            {/* Thumbnails - Horizontal Scroll */}
            <div className="flex gap-2 overflow-x-auto px-4 py-3 bg-white md:bg-transparent scrollbar-hide">
              {images.map((url, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveImg(url)}
                  className={[
                    "flex-shrink-0 w-16 h-16 md:w-20 md:h-20 rounded-lg overflow-hidden border-2 transition-all",
                    url === activeImg 
                      ? "border-pink-500 shadow-md" 
                      : "border-gray-200"
                  ].join(" ")}
                >
                  <img src={url} alt={`thumb-${idx}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </div>

          {/* Info Section */}
          <div className="md:col-span-7">
            <div className="bg-white px-4 py-4 md:rounded-2xl md:border md:border-gray-200 md:shadow-sm">
              {/* Brand - Mobile */}
              {product.brand && (
                <div className="mb-2">
                  <span className="text-xs text-gray-500">Thương hiệu: </span>
                  <span className="text-xs font-semibold text-pink-600">{product.brand}</span>
                </div>
              )}

              {/* Title - Mobile Optimized */}
              <h1 className="text-xl md:text-3xl font-bold text-gray-900 mb-3 leading-tight">
                {product.name}
              </h1>

              {/* Rating & Reviews - Mobile Compact */}
              <div className="flex items-center gap-3 mb-3 text-xs md:text-sm">
                <div className="flex items-center gap-1">
                  {[1,2,3,4,5].map(i => (
                    <Star key={i} size={12} className="fill-yellow-400 text-yellow-400 md:w-4 md:h-4" />
                  ))}
                  <span className="font-semibold text-gray-700 ml-1">4.8</span>
                </div>
                <span className="text-gray-300">|</span>
                <span className="text-gray-600">128 đánh giá</span>
                <span className="text-gray-300">|</span>
                <span className="text-gray-600">Đã bán 1.2k+</span>
              </div>

              {/* Price - Mobile Optimized */}
              <div className="bg-gradient-to-r from-pink-50 to-purple-50 rounded-xl p-4 mb-4">
                <div className="flex items-baseline gap-2 mb-1">
                  <div className="text-3xl md:text-4xl font-extrabold text-pink-600">
                    {money(displayPrice)}
                  </div>
                  {originalPrice && (
                    <div className="text-base md:text-xl text-gray-400 line-through">
                      {money(originalPrice)}
                    </div>
                  )}
                </div>
                {discountPercent && (
                  <div className="text-xs md:text-sm text-gray-600">
                    Tiết kiệm {money(originalPrice! - displayPrice)}
                  </div>
                )}
              </div>

              {/* Stock Status - Mobile */}
              <div className="mb-4">
                {isOutOfStock ? (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 text-red-600 border border-red-200">
                    <Package size={14} />
                    <span className="font-semibold text-xs">Hết hàng</span>
                  </div>
                ) : (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-50 text-green-600 border border-green-200">
                    <Package size={14} />
                    <span className="font-semibold text-xs">Còn {stock} sản phẩm</span>
                  </div>
                )}
              </div>

              {/* Options - Mobile Optimized */}
              {options.length > 0 && (
                <div className="mb-4 space-y-4">
                  {options.map((opt) => {
                    const cur = String(selection[opt.key] || "");
                    const availForKey = availableMap[opt.key] || {};

                    return (
                      <div key={opt.key}>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-sm font-semibold text-gray-900">
                            {opt.label || opt.key}:
                          </span>
                          {cur && (
                            <span className="text-sm font-bold text-pink-600">
                              {cur}
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {(opt.values || []).map((v) => {
                            const active = cur === v;
                            const disabled = !availForKey[v];

                            return (
                              <Chip
                                key={v}
                                active={active}
                                disabled={disabled}
                                onClick={() => !disabled && toggleSelection(opt.key, v)}
                              >
                                {v}
                              </Chip>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Quantity - Mobile Custom */}
              <div className="mb-4">
                <div className="text-sm font-semibold text-gray-900 mb-2">Số lượng:</div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center border-2 border-gray-200 rounded-xl overflow-hidden">
                    <button
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      disabled={quantity <= 1 || isOutOfStock}
                      className="p-3 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      <Minus size={16} className="text-gray-700" />
                    </button>
                    <div className="px-6 py-2 min-w-[60px] text-center font-bold text-gray-900">
                      {quantity}
                    </div>
                    <button
                      onClick={() => setQuantity(Math.min(stock, quantity + 1))}
                      disabled={quantity >= stock || isOutOfStock}
                      className="p-3 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      <Plus size={16} className="text-gray-700" />
                    </button>
                  </div>
                  <span className="text-xs text-gray-500">Còn lại: {stock}</span>
                </div>
              </div>

              {/* Info Cards - Mobile Compact */}
              <div className="grid grid-cols-3 gap-2 mb-4">
                <InfoCard
                  icon={<Truck size={16} />}
                  title="Freeship"
                  description="Từ 300K"
                />
                <InfoCard
                  icon={<Shield size={16} />}
                  title="Chính hãng"
                  description="100%"
                />
                <InfoCard
                  icon={<RotateCcw size={16} />}
                  title="Đổi trả"
                  description="7 ngày"
                />
              </div>
            </div>

            {/* Product Details - Mobile */}
            <div className="mt-3 bg-white px-4 py-4 md:rounded-2xl md:border md:border-gray-200 md:shadow-sm md:mt-6">
              <h2 className="text-lg font-bold text-gray-900 mb-3">Thông tin sản phẩm</h2>
              
              <div className="space-y-2 text-sm mb-4">
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-600">SKU:</span>
                  <span className="font-mono font-semibold text-gray-900 text-xs">{chosenVariant?.sku || product.sku || "—"}</span>
                </div>
                
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-600">Thương hiệu:</span>
                  <span className="font-semibold text-gray-900">{product.brand || "—"}</span>
                </div>
                
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-600">Danh mục:</span>
                  <span className="font-semibold text-gray-900">{product.categoryName || "—"}</span>
                </div>
              </div>

              {product.description && (
                <>
                  <h3 className="text-base font-bold text-gray-900 mb-2 mt-4">Mô tả chi tiết</h3>
                  <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                    {product.description}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Fixed Bottom Bar - Mobile Only */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-3 z-40 shadow-lg">
        <div className="flex gap-2">
          <Button
            size="large"
            icon={<ShoppingCart size={18} />}
            onClick={addToCart}
            disabled={isOutOfStock}
            className="flex-1 rounded-xl border-2 border-pink-500 text-pink-600 hover:!bg-pink-50 font-bold h-12"
          >
            Thêm giỏ
          </Button>
          <Button
            type="primary"
            size="large"
            onClick={buyNow}
            disabled={isOutOfStock}
            className="flex-1 rounded-xl !bg-pink-500 hover:!bg-pink-600 font-bold h-12"
          >
            Mua ngay
          </Button>
        </div>
      </div>

      {/* Desktop Buttons - Hidden on mobile */}
      <div className="hidden md:block mt-6 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 gap-4">
            <Button
              size="large"
              icon={<ShoppingCart size={20} />}
              onClick={addToCart}
              disabled={isOutOfStock}
              className="rounded-xl border-2 border-pink-500 text-pink-600 hover:!bg-pink-50 font-bold h-12"
            >
              Thêm vào giỏ hàng
            </Button>
            <Button
              type="primary"
              size="large"
              onClick={buyNow}
              disabled={isOutOfStock}
              className="rounded-xl !bg-pink-500 hover:!bg-pink-600 font-bold h-12"
            >
              Mua ngay
            </Button>
          </div>
        </div>
      </div>

      {/* Image Preview Modal */}
      <Modal
        open={previewOpen}
        onCancel={() => setPreviewOpen(false)}
        footer={null}
        width="100%"
        className="mobile-image-modal"
        styles={{
          body: { padding: 0 },
        }}
        centered
      >
        <div className="p-2 md:p-4">
          <img 
            src={activeImg} 
            alt="preview" 
            className="w-full rounded-xl"
          />
          <div className="grid grid-cols-4 md:grid-cols-8 gap-2 mt-3">
            {images.map((url, idx) => (
              <button
                key={idx}
                onClick={() => setActiveImg(url)}
                className={[
                  "aspect-square rounded-lg overflow-hidden border-2 transition-all",
                  url === activeImg 
                    ? "border-pink-500 shadow-lg" 
                    : "border-gray-200"
                ].join(" ")}
              >
                <img src={url} alt={`preview-${idx}`} className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        </div>
      </Modal>

      <style>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .mobile-image-modal .ant-modal {
          max-width: 100vw !important;
          margin: 0 !important;
          top: 0 !important;
          padding: 0 !important;
        }
        @media (min-width: 768px) {
          .mobile-image-modal .ant-modal {
            max-width: 1000px !important;
            margin: 0 auto !important;
            top: 50px !important;
            padding: 24px !important;
          }
        }
      `}</style>
    </div>
  );
}