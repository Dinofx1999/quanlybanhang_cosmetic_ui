import React, { useEffect, useMemo, useState } from "react";
import { Drawer, Spin, Button, Tag, Select, Divider, message, Empty } from "antd";
import { X, ShoppingCart, Package, Hash, Layers3, Image as ImageIcon } from "lucide-react";
import api from "../../../../services/api";

type ApiImage = { url: string; isPrimary?: boolean; order?: number };

type ApiProductDetail = {
  ok: boolean;
  product: {
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
    createdAt?: string;
    updatedAt?: string;
  };
  variants?: Array<{
    _id: string;
    sku?: string;
    name?: string;
    attributes?: { k: string; v: string }[];
    attributesObj?: Record<string, string>;
    price?: number;
    displayPrice?: number;
    thumbnail?: string;
    images?: ApiImage[];
    isDefault?: boolean;
  }>;
  defaultVariant?: any;
  options?: Array<{ key: string; label: string; values: string[] }>;
  breadcrumb?: Array<{ name: string; url: string }>;
};

function money(n: number) {
  return Number(n || 0).toLocaleString("vi-VN") + "đ";
}

function pickImage(p?: { thumbnail?: string; images?: ApiImage[] }) {
  if (!p) return "";
  if (p.thumbnail) return p.thumbnail;
  const imgs = Array.isArray(p.images) ? p.images : [];
  const primary = imgs.find((x) => x?.isPrimary && x?.url);
  return primary?.url || imgs[0]?.url || "";
}

// tìm variant theo selections (attributesObj)
function findVariantBySelection(
  variants: ApiProductDetail["variants"] = [],
  selection: Record<string, string>
) {
  const entries = Object.entries(selection).filter(([_, v]) => String(v || "").length > 0);
  if (!entries.length) return undefined;

  return variants.find((v) => {
    const obj = v.attributesObj || {};
    return entries.every(([k, val]) => String(obj[k] || "") === String(val));
  });
}

type Props = {
  open: boolean;
  productId?: string; // _id product
  onClose: () => void;
};

export default function ProductQuickView({ open, productId, onClose }: Props) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<ApiProductDetail | null>(null);

  // selections theo options (size/color/...)
  const [selection, setSelection] = useState<Record<string, string>>({});

  // load detail
  useEffect(() => {
    if (!open || !productId) return;

    const ctrl = new AbortController();

    (async () => {
      setLoading(true);
      setData(null);
      setSelection({});

      try {
        // ✅ bạn chỉnh endpoint cho đúng API của bạn:
        // ví dụ: /products/:id/detail hoặc /products/:id
        const res = await api.get(`/products/${productId}`, { signal: ctrl.signal });
        const payload: ApiProductDetail = res.data;

        setData(payload);

        // init selection theo defaultVariant hoặc option đầu tiên
        const opts = payload.options || [];
        const init: Record<string, string> = {};

        if (payload.defaultVariant?.attributesObj) {
          Object.assign(init, payload.defaultVariant.attributesObj);
        } else {
          // nếu không có defaultVariant thì chọn giá trị đầu tiên mỗi option (nếu muốn)
          opts.forEach((o) => {
            if (o.values?.length) init[o.key] = o.values[0];
          });
        }

        setSelection(init);
      } catch (e: any) {
        if (e?.name !== "CanceledError") {
          message.error("Không tải được chi tiết sản phẩm.");
        }
      } finally {
        setLoading(false);
      }
    })();

    return () => ctrl.abort();
  }, [open, productId]);

  const product = data?.product;
  const options = data?.options || [];
  const variants = data?.variants || [];

  const chosenVariant = useMemo(() => {
    if (!data) return undefined;

    // nếu có selection đầy đủ -> match variant
    const v = findVariantBySelection(variants, selection);
    if (v) return v;

    // fallback: defaultVariant nếu có
    if (data.defaultVariant?._id) return data.defaultVariant;

    // fallback: variant isDefault
    const d = variants.find((x) => x.isDefault);
    return d;
  }, [data, variants, selection]);

  const displayPrice = useMemo(() => {
    // ưu tiên variant price/displayPrice
    const vPrice = Number(chosenVariant?.displayPrice ?? chosenVariant?.price ?? 0);
    if (vPrice > 0) return vPrice;

    // fallback priceRange / basePrice
    const pr = product?.priceRange;
    if (pr?.min != null && pr?.max != null) {
      if (pr.min === pr.max) return pr.min;
      // nếu range: chọn min để hiển thị
      return pr.min;
    }
    return Number(product?.basePrice ?? 0);
  }, [chosenVariant, product]);

  const heroImage = useMemo(() => {
    return (
      pickImage(chosenVariant) ||
      pickImage(product) ||
      "https://via.placeholder.com/900x900.png?text=No+Image"
    );
  }, [product, chosenVariant]);

  const addToCart = () => {
    if (options.length && !chosenVariant?._id) {
      return message.warning("Vui lòng chọn đầy đủ thuộc tính (Size/Màu/...).");
    }
    message.success("Đã thêm vào giỏ (demo).");
  };

  return (
    <Drawer
      open={open}
      onClose={onClose}
      placement="right"
      width={520}
      closeIcon={false}
      styles={{ body: { padding: 0 } }}
    >
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-pink-100 px-4 py-3 flex items-center justify-between">
        <div className="font-extrabold text-gray-900">Chi tiết sản phẩm</div>
        <button
          onClick={onClose}
          className="h-10 w-10 rounded-2xl border border-pink-100 hover:bg-pink-50 flex items-center justify-center"
        >
          <X size={18} className="text-pink-600" />
        </button>
      </div>

      {loading ? (
        <div className="p-8 flex items-center justify-center">
          <Spin />
        </div>
      ) : !data || !product ? (
        <div className="p-8">
          <Empty description="Không có dữ liệu sản phẩm" />
        </div>
      ) : (
        <div className="p-4 space-y-4">
          {/* Image + basic info */}
          <div className="rounded-[22px] overflow-hidden border border-pink-100 bg-white shadow-sm">
            <div className="relative aspect-square bg-pink-50 overflow-hidden">
              <img src={heroImage} alt={product.name} className="w-full h-full object-cover" />
              <div className="absolute top-3 left-3 flex gap-2">
                {product.categoryName ? (
                  <Tag className="!m-0 rounded-lg border-0 bg-pink-500 text-white">
                    {product.categoryName}
                  </Tag>
                ) : null}
                {product.hasVariants ? (
                  <Tag className="!m-0 rounded-lg border-0 bg-gray-900/70 text-white">
                    {product.totalVariants || variants.length} biến thể
                  </Tag>
                ) : null}
              </div>
            </div>

            <div className="p-4">
              <div className="text-lg font-extrabold text-gray-900">{product.name}</div>
              <div className="mt-1 text-sm text-gray-600">
                {product.brand ? <span className="font-semibold">{product.brand}</span> : null}
                {product.brand && product.sku ? <span className="mx-2 text-gray-300">•</span> : null}
                {product.sku ? <span className="font-mono text-xs">SKU: {product.sku}</span> : null}
              </div>

              <div className="mt-3 flex items-end justify-between">
                <div>
                  <div className="text-pink-600 text-2xl font-extrabold">{money(displayPrice)}</div>
                  {product.priceRange?.min != null && product.priceRange?.max != null && product.priceRange.min !== product.priceRange.max ? (
                    <div className="text-xs text-gray-500">
                      Khoảng giá: {money(product.priceRange.min)} - {money(product.priceRange.max)}
                    </div>
                  ) : null}
                </div>

                <Button
                  type="primary"
                  onClick={addToCart}
                  className="rounded-2xl !bg-pink-500 hover:!bg-pink-600 !border-pink-500"
                >
                  <ShoppingCart size={18} />
                  <span className="ml-1">Thêm giỏ</span>
                </Button>
              </div>
            </div>
          </div>

          {/* Attributes / Options */}
          <div className="rounded-[22px] border border-pink-100 bg-white shadow-sm p-4">
            <div className="flex items-center gap-2 mb-3">
              <Layers3 size={18} className="text-pink-600" />
              <div className="font-extrabold text-gray-900">Thuộc tính</div>
            </div>

            {options.length === 0 ? (
              <div className="text-sm text-gray-500">Sản phẩm không có thuộc tính.</div>
            ) : (
              <div className="space-y-3">
                {options.map((opt) => (
                  <div key={opt.key}>
                    <div className="text-xs text-gray-500 mb-1">
                      {opt.label || opt.key}
                    </div>
                    <Select
                      value={selection[opt.key]}
                      onChange={(v) => setSelection((prev) => ({ ...prev, [opt.key]: String(v) }))}
                      className="w-full"
                      size="large"
                      options={(opt.values || []).map((v) => ({ value: v, label: v }))}
                      placeholder={`Chọn ${opt.label || opt.key}`}
                    />
                  </div>
                ))}
              </div>
            )}

            <Divider className="!my-4" />

            {/* Chosen variant info */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Hash size={16} className="text-pink-600" />
                <span className="text-gray-500">Variant:</span>
                <span className="font-semibold text-gray-900">
                  {chosenVariant?._id ? chosenVariant._id : "—"}
                </span>
              </div>

              <div className="flex items-center gap-2 text-sm">
                <Package size={16} className="text-pink-600" />
                <span className="text-gray-500">SKU:</span>
                <span className="font-mono text-xs text-gray-900">
                  {chosenVariant?.sku || product.sku || "—"}
                </span>
              </div>

              {chosenVariant?.attributesObj ? (
                <div className="flex flex-wrap gap-2 pt-1">
                  {Object.entries(chosenVariant.attributesObj).map(([k, v]) => (
                    <span
                      key={k}
                      className="px-2 py-1 rounded-full bg-pink-50 border border-pink-100 text-xs font-semibold text-pink-700"
                    >
                      {k}: {String(v)}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
          </div>

          {/* Variant list (optional: dạng bảng nhanh) */}
          <div className="rounded-[22px] border border-pink-100 bg-white shadow-sm p-4">
            <div className="flex items-center gap-2 mb-3">
              <ImageIcon size={18} className="text-pink-600" />
              <div className="font-extrabold text-gray-900">Danh sách biến thể</div>
              <div className="text-xs text-gray-500">({variants.length})</div>
            </div>

            {variants.length === 0 ? (
              <div className="text-sm text-gray-500">Chưa có biến thể.</div>
            ) : (
              <div className="space-y-2 max-h-[260px] overflow-auto pr-1">
                {variants.slice(0, 50).map((v) => {
                  const active = chosenVariant?._id === v._id;
                  const attrs = v.attributesObj || {};
                  return (
                    <button
                      key={v._id}
                      onClick={() => {
                        // click variant -> set selection theo attributesObj
                        if (v.attributesObj) setSelection(v.attributesObj);
                      }}
                      className={[
                        "w-full text-left rounded-2xl border px-3 py-2 transition",
                        active
                          ? "border-pink-400 bg-pink-50"
                          : "border-pink-100 hover:border-pink-200 hover:bg-pink-50/40",
                      ].join(" ")}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="text-sm font-bold text-gray-900 line-clamp-1">
                          {v.name || v.sku || v._id}
                        </div>
                        <div className="text-sm font-extrabold text-pink-600">
                          {money(Number(v.displayPrice ?? v.price ?? displayPrice))}
                        </div>
                      </div>

                      <div className="mt-1 flex flex-wrap gap-2">
                        {Object.keys(attrs).length ? (
                          Object.entries(attrs).map(([k, val]) => (
                            <span
                              key={k}
                              className="px-2 py-0.5 rounded-full bg-white border border-pink-100 text-[11px] font-semibold text-gray-700"
                            >
                              {k}: {String(val)}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-gray-500">—</span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </Drawer>
  );
}
