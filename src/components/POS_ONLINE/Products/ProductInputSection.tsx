// src/components/Products/ProductInputSection.tsx
import React, { useEffect, useMemo, useState } from "react";
import {
  Package,
  Tag,
  Plus,
  RefreshCw,
  Image as ImageIcon,
  X,
  Pencil,
  BadgePercent,
  Layers,
  Boxes,
  ArrowRightLeft,
} from "lucide-react";
import api from "../../../services/api";
import { message, Modal, AutoComplete } from "antd";
import { getCurrentUser } from "../../../services/authService";
import { getActiveBranchRaw, setActiveBranchId } from "../../../services/branchContext";


// ===============================
// Types
// ===============================
type ProductImage = { url: string; isPrimary?: boolean; order?: number };

type PriceTierRow = { tierId: string; price: number };

type ProductOption = {
  key: string; // normalized lowercase in backend
  label?: string;
  values?: string[];
  order?: number;
};

type ProductItem = {
  _id: string;
  sku: string;
  name: string;
  brand?: string;
  categoryId?: string | null;
  categoryName?: string;
  barcode?: string;
  cost?: number;
  price?: number;
  thumbnail?: string;
  images?: ProductImage[];
  price_tier?: PriceTierRow[];

  // ✅ variants config
  hasVariants?: boolean;
  options?: ProductOption[];
  basePrice?: number;
  baseTier?: PriceTierRow[];

  isActive?: boolean;
};

type CategoryItem = {
  _id: string;
  code: string;
  name: string;
  order?: number;
  isActive?: boolean;
};

type TierAgencyItem = {
  _id: string;
  code?: string;
  name?: string;
  level?: number;
  isActive?: boolean;
};

type BranchItem = {
  _id: string;
  code?: string;
  name?: string;
  isActive?: boolean;
};

type VariantAttr = { k: string; v: string };

type VariantItem = {
  _id: string;
  productId: string;
  sku: string;
  barcode?: string;
  name?: string;
  attributes?: VariantAttr[];

  price?: number;
  cost?: number;
  price_tier?: PriceTierRow[];

  isActive?: boolean;

  stockQty?: number;
  stockReserved?: number;
};

// ===============================
// Utils
// ===============================
const money = (n: any) => Number(n || 0).toLocaleString("vi-VN");

function formatVndInput(raw: string): string {
  const digits = String(raw || "").replace(/[^\d]/g, "");
  if (!digits) return "";
  const n = Number(digits);
  if (!Number.isFinite(n)) return "";
  return `${n.toLocaleString("vi-VN")} đ`;
}
function parseVndInputToNumber(raw: string): number {
  const digits = String(raw || "").replace(/[^\d]/g, "");
  if (!digits) return 0;
  const n = Number(digits);
  return Number.isFinite(n) ? n : 0;
}

// map {tierId: "120.000 đ"} -> [{tierId, price}]
function normalizePriceTierFromMap(priceTierMap: Record<string, string>) {
  return Object.entries(priceTierMap || {})
    .map(([tierId, v]) => ({ tierId, price: parseVndInputToNumber(v) }))
    .filter((x) => x.tierId && Number.isFinite(x.price) && x.price >= 0);
}

function mapFromPriceTier(arr?: any[]) {
  const out: Record<string, string> = {};
  (Array.isArray(arr) ? arr : []).forEach((x: any) => {
    const id = String(x?.tierId?._id || x?.tierId || "");
    if (!id) return;
    out[id] = formatVndInput(String(x?.price ?? 0));
  });
  return out;
}

function attrsToRecord(attrs?: VariantAttr[]) {
  const out: Record<string, string> = {};
  (Array.isArray(attrs) ? attrs : []).forEach((a) => {
    const k = String(a?.k || "").trim();
    const v = String(a?.v || "").trim();
    if (k && v) out[k] = v;
  });
  return out;
}

function recordToAttrs(rec?: Record<string, string>): VariantAttr[] {
  const out: VariantAttr[] = [];
  const obj = rec || {};
  Object.keys(obj).forEach((k) => {
    const v = String(obj[k] || "").trim();
    const kk = String(k || "").trim();
    if (kk && v) out.push({ k: kk, v });
  });
  return out;
}

function normalizeKey(s: string) {
  return String(s || "").toLowerCase().trim();
}

function extractCreatedProductId(created: any): string {
  return String(
    created?.product?._id ||
      created?.item?._id ||
      created?.data?.product?._id ||
      created?.data?.item?._id ||
      created?.productId ||
      created?.id ||
      created?._id ||
      ""
  );
}

function extractCreatedVariantId(created: any): string {
  return String(created?.variant?._id || created?.item?._id || created?._id || "");
}

// ===============================
// API helpers (categories/products/tiers/branches)
// ===============================
const createCategory = async (data: any) => {
  const res = await api.post("/categories", {
    code: String(data.code || "").trim().toUpperCase(),
    name: String(data.name || "").trim(),
    order: Number(data.order) || 1,
  });
  return res.data;
};

const updateCategory = async (id: string, data: any) => {
  const res = await api.put(`/categories/${id}`, {
    code: String(data.code || "").trim().toUpperCase(),
    name: String(data.name || "").trim(),
    order: Number(data.order) || 1,
    isActive: data.isActive === undefined ? true : Boolean(data.isActive),
  });
  return res.data;
};

const createProduct = async (data: any) => {
  const res = await api.post("/products", {
    sku: String(data.sku || "").trim().toUpperCase(),
    name: String(data.name || "").trim(),
    price: parseVndInputToNumber(data.price),
    cost: data.cost ? parseVndInputToNumber(data.cost) : undefined,
    categoryId: data.categoryId || null,
    categoryName: String(data.categoryName || "").trim(),
    brand: String(data.brand || "").trim(),
    barcode: String(data.barcode || "").trim(),
    price_tier: normalizePriceTierFromMap(data.priceTierMap || {}),

    // ✅ variants config (optional)
    options: Array.isArray(data.options) ? data.options : undefined,
    basePrice: data.basePrice !== undefined ? Number(data.basePrice) : undefined,
    baseTier: data.baseTierMap ? normalizePriceTierFromMap(data.baseTierMap) : undefined,
  });
  return res.data;
};

const updateProduct = async (id: string, data: any) => {
  const res = await api.put(`/products/${id}`, {
    sku: String(data.sku || "").trim().toUpperCase(),
    name: String(data.name || "").trim(),
    price: data.price !== undefined ? parseVndInputToNumber(data.price) : undefined,
    cost: data.cost !== undefined && data.cost !== "" ? parseVndInputToNumber(data.cost) : 0,
    categoryId: data.categoryId || null,
    categoryName: String(data.categoryName || "").trim(),
    brand: String(data.brand || "").trim(),
    barcode: String(data.barcode || "").trim(),
    isActive: data.isActive === undefined ? true : Boolean(data.isActive),
    price_tier: data.priceTierMap ? normalizePriceTierFromMap(data.priceTierMap || {}) : undefined,

    // ✅ variants config
    options: data.options !== undefined ? data.options : undefined,
    hasVariants: data.hasVariants !== undefined ? !!data.hasVariants : undefined,
    basePrice: data.basePrice !== undefined ? Math.round(Number(data.basePrice || 0)) : undefined,
    baseTier: data.baseTierMap ? normalizePriceTierFromMap(data.baseTierMap || {}) : undefined,
  });
  return res.data;
};

// Upload nhiều ảnh cho productId
const uploadProductImages = async (productId: string, files: File[], primaryIndex = 0) => {
  const fd = new FormData();
  files.forEach((f) => fd.append("files", f));
  const res = await api.post(`/products/${productId}/images?primaryIndex=${primaryIndex}`, fd, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
};

// Set primary theo URL
const setPrimaryProductImage = async (productId: string, url: string) => {
  const res = await api.put(`/products/${productId}/images/primary`, { url });
  return res.data;
};

// Delete ảnh theo URL
const deleteProductImageByUrl = async (productId: string, url: string) => {
  const res = await api.delete(`/products/${productId}/images`, { data: { url } });
  return res.data;
};

const getTierAgencies = async () => {
  const endpoints = ["/tier-agencies", "/tierAgencies"];
  for (const ep of endpoints) {
    try {
      const res = await api.get(ep);
      const items = (res.data.items || res.data.tiers || res.data.data || []) as TierAgencyItem[];
      if (Array.isArray(items)) return items.filter((t) => t?.isActive !== false);
    } catch {}
  }
  return [];
};

const getBranches = async () => {
  try {
    const res = await api.get("/branches");
    const items = (res.data.items || res.data.branches || []) as BranchItem[];
    return Array.isArray(items) ? items.filter((b) => b?.isActive !== false) : [];
  } catch {
    return [];
  }
};

// ===============================
// API helpers (variants + variant stocks)
// ===============================
const listVariants = async (params: { productId?: string; q?: string; isActive?: boolean; branchId?: string }) => {
  const res = await api.get("/product-variants", { params });
  return res.data as { ok: boolean; items: VariantItem[]; branchId: string };
};

const createVariant = async (data: any) => {
  const res = await api.post("/product-variants", data);
  return res.data;
};

const updateVariant = async (id: string, data: any) => {
  const res = await api.put(`/product-variants/${id}`, data);
  return res.data;
};

const generateVariants = async (productId: string, overwrite: boolean) => {
  const res = await api.post(`/products/${productId}/variants/generate`, { overwrite });
  return res.data;
};

const adjustVariantStock = async (payload: {
  variantId: string;
  branchId: string;
  op: "IN" | "OUT" | "SET";
  qty: number;
  note?: string;
}) => {
  const res = await api.post("/variant-stocks/adjust", payload);
  return res.data;
};

const transferVariantStock = async (payload: {
  variantId: string;
  fromBranchId: string;
  toBranchId: string;
  qty: number;
  note?: string;
}) => {
  const res = await api.post("/variant-stocks/transfer", payload);
  return res.data;
};

// ===============================
// Small UI helpers
// ===============================
const Card = React.memo(function Card(props: {
  title?: string;
  desc?: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
      {(props.title || props.desc || props.right) && (
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="min-w-0">
            {props.title ? <div className="text-lg font-bold text-gray-900">{props.title}</div> : null}
            {props.desc ? <div className="text-sm text-gray-500 mt-0.5">{props.desc}</div> : null}
          </div>
          {props.right ? <div className="shrink-0">{props.right}</div> : null}
        </div>
      )}
      {props.children}
    </div>
  );
});

const DividerLine = () => <div className="border-t border-gray-100 my-4" />;

const Field = React.memo(function Field(props: {
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-semibold text-gray-800 mb-1.5">
        {props.label} {props.required ? <span className="text-pink-600">*</span> : null}
      </label>
      {props.children}
      {props.hint ? <div className="text-xs text-gray-500 mt-1 leading-relaxed">{props.hint}</div> : null}
    </div>
  );
});

const MoneyInput = React.memo(function MoneyInput(props: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  disabled?: boolean;
}) {
  return (
    <input
      inputMode="numeric"
      value={props.value}
      onChange={(e) => props.onChange(formatVndInput(e.target.value))}
      className="w-full px-3 py-2.5 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-pink-400 focus:border-transparent disabled:bg-gray-50"
      placeholder={props.placeholder || "0 đ"}
      disabled={props.disabled}
    />
  );
});

function acFilter(input: string, option?: any) {
  const t = String(option?.search || option?.label || option?.value || "").toLowerCase();
  return t.includes(String(input || "").toLowerCase());
}

const TierPriceEditor = React.memo(function TierPriceEditor(props: {
  title: string;
  tiers: TierAgencyItem[];
  value: Record<string, string>;
  onChange: (next: Record<string, string>) => void;
  disabled?: boolean;
  onReloadTiers: () => void;
  onOpenBulk: () => void;
}) {
  const { title, tiers, value, onChange, disabled, onReloadTiers, onOpenBulk } = props;

  return (
    <div className="rounded-2xl border border-gray-200 bg-gray-50/50 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="font-semibold text-gray-900 flex items-center gap-2">
            <BadgePercent className="w-4 h-4 text-pink-600" />
            {title}
          </div>
          <div className="text-xs text-gray-500 mt-0.5">Nhập giá theo từng cấp (để trống nếu không áp dụng).</div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            className="px-3 py-2 rounded-xl border border-gray-200 hover:bg-white text-sm font-semibold"
            onClick={onReloadTiers}
            disabled={disabled}
            title="Tải lại danh sách tier"
          >
            <RefreshCw className="w-4 h-4 inline-block mr-2" />
            Tải tier
          </button>

          <button
            type="button"
            className="px-3 py-2 rounded-xl border border-gray-200 hover:bg-white text-sm font-semibold"
            onClick={onOpenBulk}
            disabled={disabled || tiers.length === 0}
            title="Chỉnh giá hàng loạt / đồng bộ"
          >
            Đồng bộ giá
          </button>
        </div>
      </div>

      {tiers.length === 0 ? (
        <div className="mt-3 text-sm text-gray-600">
          Chưa có danh sách TierAgency. Kiểm tra API: <b>/tier-agencies</b> hoặc <b>/tierAgencies</b>.
        </div>
      ) : (
        <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
          {tiers.map((t) => {
            const id = String(t._id);
            const label = `${t.code ? t.code + " - " : ""}${t.name || "Tier"}`;
            return (
              <div key={id} className="rounded-xl border border-gray-200 bg-white p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-gray-800 truncate">{label}</div>
                    <div className="text-[11px] text-gray-400 truncate">tierId: {id}</div>
                  </div>

                  <div className="w-44">
                    <MoneyInput
                      value={value?.[id] ?? ""}
                      onChange={(v) => {
                        const next = { ...(value || {}) };
                        if (!String(v || "").trim()) delete next[id];
                        else next[id] = v;
                        onChange(next);
                      }}
                      placeholder="Giá sỉ"
                      disabled={disabled}
                    />
                  </div>
                </div>

                {!!value?.[id] && (
                  <div className="mt-2 text-xs text-gray-500">
                    Preview: <span className="font-semibold text-gray-800">{value[id]}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
});

const BulkTierPriceModal = React.memo(function BulkTierPriceModal(props: {
  open: boolean;
  onClose: () => void;
  tiers: TierAgencyItem[];
  value: Record<string, string>;
  onApply: (next: Record<string, string>) => void;
}) {
  const { open, onClose, tiers, value, onApply } = props;

  const [mode, setMode] = useState<
    "SET_ALL" | "DELTA_PLUS" | "DELTA_MINUS" | "PERCENT_PLUS" | "PERCENT_MINUS"
  >("SET_ALL");
  const [amount, setAmount] = useState<string>("");

  useEffect(() => {
    if (!open) {
      setMode("SET_ALL");
      setAmount("");
    }
  }, [open]);

  const apply = () => {
    const next = { ...(value || {}) };

    const amtNum = mode.includes("PERCENT")
      ? Number(String(amount || "").replace(/[^\d.]/g, ""))
      : parseVndInputToNumber(amount);
    const safeAmt = Number.isFinite(amtNum) ? amtNum : 0;

    const getBase = (id: string) => parseVndInputToNumber(next[id] || "");

    tiers.forEach((t) => {
      const id = String(t._id);
      const base = getBase(id);

      let out = base;
      switch (mode) {
        case "SET_ALL":
          out = safeAmt;
          break;
        case "DELTA_PLUS":
          out = base + safeAmt;
          break;
        case "DELTA_MINUS":
          out = Math.max(0, base - safeAmt);
          break;
        case "PERCENT_PLUS":
          out = Math.round(base * (1 + safeAmt / 100));
          break;
        case "PERCENT_MINUS":
          out = Math.round(base * (1 - safeAmt / 100));
          if (out < 0) out = 0;
          break;
      }

      next[id] = formatVndInput(String(out));
    });

    onApply(next);
    onClose();
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      onOk={apply}
      okText="Áp dụng"
      cancelText="Đóng"
      title="Đồng bộ / Chỉnh giá sỉ hàng loạt"
      destroyOnClose
    >
      <div className="space-y-3">
        <div className="text-sm text-gray-600">
          Áp dụng cho <b>{tiers.length}</b> tier.
        </div>

        <div>
          <div className="text-sm font-medium text-gray-700 mb-1.5">Chế độ</div>
          <select
            value={mode}
            onChange={(e) => setMode(e.target.value as any)}
            className="w-full px-3 py-2.5 border border-gray-300 rounded-xl outline-none"
          >
            <option value="SET_ALL">Set tất cả = X</option>
            <option value="DELTA_PLUS">Tăng mỗi tier + X</option>
            <option value="DELTA_MINUS">Giảm mỗi tier - X</option>
            <option value="PERCENT_PLUS">Tăng %: +X%</option>
            <option value="PERCENT_MINUS">Giảm %: -X%</option>
          </select>
        </div>

        <div>
          <div className="text-sm font-medium text-gray-700 mb-1.5">
            Giá trị {mode.includes("PERCENT") ? "(%)" : "(đ)"}
          </div>

          {mode.includes("PERCENT") ? (
            <input
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-xl outline-none"
              placeholder="Ví dụ 10"
              inputMode="decimal"
            />
          ) : (
            <MoneyInput value={amount} onChange={(v) => setAmount(v)} placeholder="Ví dụ 150.000 đ" />
          )}

          {mode.includes("PERCENT") ? (
            <div className="text-xs text-gray-500 mt-1">Nhập số %, ví dụ: 10 = 10%.</div>
          ) : null}
        </div>

        <div className="text-xs text-gray-500">Lưu ý: Sẽ ghi đè toàn bộ giá sỉ theo tier trong form hiện tại.</div>
      </div>
    </Modal>
  );
});

// ===============================
// Component
// ===============================
const ProductInputSection: React.FC = () => {
  const [messageApi, contextHolder] = message.useMessage();
  const toast = {
    success: (mess: string) => messageApi.open({ type: "success", content: mess }),
    error: (mess: string) => messageApi.open({ type: "error", content: mess }),
    warning: (mess: string) => messageApi.open({ type: "warning", content: mess }),
  };

  const [user, setUser] = useState<any>(null);

  const [activeTab, setActiveTab] = useState<"product" | "category" | "variant">("product");

  // ✅ Product form
  const [productForm, setProductForm] = useState<any>({
    sku: "",
    name: "",
    price: "",
    cost: "",
    categoryId: "",
    categoryName: "",
    brand: "",
    barcode: "",
    priceTierMap: {} as Record<string, string>,
  });

  // ✅ Category form
  const [categoryForm, setCategoryForm] = useState({ name: "", code: "", order: "" });

  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [tiers, setTiers] = useState<TierAgencyItem[]>([]);
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);

  // ✅ Images (select BEFORE create)
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [primaryIndex, setPrimaryIndex] = useState<number>(0);

  // ✅ Creating state
  const [creating, setCreating] = useState(false);

  // ===============================
  // EDIT MODALS state
  // ===============================
  const [editProductOpen, setEditProductOpen] = useState(false);
  const [editCategoryOpen, setEditCategoryOpen] = useState(false);

  const [editProduct, setEditProduct] = useState<any>({
    _id: "",
    sku: "",
    name: "",
    price: "",
    cost: "",
    categoryId: "",
    categoryName: "",
    brand: "",
    barcode: "",
    isActive: true,

    thumbnail: "",
    images: [] as ProductImage[],

    priceTierMap: {} as Record<string, string>,
  });

  const [editCategory, setEditCategory] = useState<any>({
    _id: "",
    code: "",
    name: "",
    order: 1,
    isActive: true,
  });

  const [savingEdit, setSavingEdit] = useState(false);

  // ===============================
  // EDIT IMAGES state
  // ===============================
  const [editImageFiles, setEditImageFiles] = useState<File[]>([]);
  const [editImagePrimaryIndex, setEditImagePrimaryIndex] = useState<number>(0);
  const [uploadingEditImages, setUploadingEditImages] = useState(false);

  // ===============================
  // Bulk Tier modal
  // ===============================
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkTarget, setBulkTarget] = useState<"create" | "edit" | "variantCreate" | "variantEdit">("create");
  const openBulk = (target: typeof bulkTarget) => {
    setBulkTarget(target);
    setBulkOpen(true);
  };

  // ===============================
  // ✅ Barcode Scan (simple)
  // ===============================
  const [scanOpen, setScanOpen] = useState(false);
  const [scanTarget, setScanTarget] = useState<"create" | "edit" | "variantCreate" | "variantEdit">("create");
  const [scanError, setScanError] = useState<string>("");
  const [scanning, setScanning] = useState(false);

  const openScan = (target: typeof scanTarget) => {
    setScanTarget(target);
    setScanError("");
    setScanOpen(true);
  };

  // ===============================
  // ✅ Variant UI states
  // ===============================
  const [branches, setBranches] = useState<BranchItem[]>([]);
  const [variantBranchRaw, setVariantBranchRaw] = useState<string>("all");
  const variantBranchIdForQuery = useMemo(() => {
    const v = String(variantBranchRaw || "all");
    return v;
  }, [variantBranchRaw]);

  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const selectedProduct = useMemo(
    () => products.find((p) => String(p._id) === String(selectedProductId)) || null,
    [products, selectedProductId]
  );

  const [variantSearch] = useState("");
  const [variants, setVariants] = useState<VariantItem[]>([]);
  const [loadingVariants, setLoadingVariants] = useState(false);

  // Product options editor (for generate)
  const [productOptionsDraft, setProductOptionsDraft] = useState<ProductOption[]>([]);
  const [savingOptions, setSavingOptions] = useState(false);

  const [genOverwrite, setGenOverwrite] = useState(false);
  const [generating, setGenerating] = useState(false);

  // Variant create/edit modals
  const [variantCreateOpen, setVariantCreateOpen] = useState(false);
  const [variantEditOpen, setVariantEditOpen] = useState(false);
  const [savingVariant, setSavingVariant] = useState(false);

  const emptyVariantForm = {
    _id: "",
    productId: "",
    sku: "",
    barcode: "",
    name: "",
    isActive: true,
    attributesRecord: {} as Record<string, string>,
    overridePrice: false,
    overrideCost: false,
    price: "",
    cost: "",
    priceTierMap: {} as Record<string, string>,
  };

  const [variantCreate, setVariantCreate] = useState<any>({ ...emptyVariantForm });
  const [variantEdit, setVariantEdit] = useState<any>({ ...emptyVariantForm });

  // Stock modals
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [stockTargetVariant, setStockTargetVariant] = useState<VariantItem | null>(null);

  const [adjustForm, setAdjustForm] = useState<{ op: "IN" | "OUT" | "SET"; qty: string; note: string }>({
    op: "IN",
    qty: "",
    note: "",
  });

  const [transferForm, setTransferForm] = useState<{ fromBranchId: string; toBranchId: string; qty: string; note: string }>(
    { fromBranchId: "", toBranchId: "", qty: "", note: "" }
  );

  // ===============================
  // Previews (create)
  // ===============================
  const previews = useMemo(() => selectedFiles.map((f) => ({ name: f.name, url: URL.createObjectURL(f) })), [selectedFiles]);
  useEffect(() => {
    return () => previews.forEach((p) => URL.revokeObjectURL(p.url));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedFiles]);

  // ===============================
  // Previews (edit modal)
  // ===============================
  const editImagePreviews = useMemo(
    () => editImageFiles.map((f) => ({ name: f.name, url: URL.createObjectURL(f) })),
    [editImageFiles]
  );
  useEffect(() => {
    return () => editImagePreviews.forEach((p) => URL.revokeObjectURL(p.url));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editImageFiles]);

  // ===============================
  // AutoComplete options
  // ===============================
  const categoryOptions = useMemo(() => {
    return (categories || [])
      .filter((c) => c?.isActive !== false)
      .map((c) => {
        const label = `${c.code} - ${c.name}`;
        return {
          value: String(c._id),
          label,
          search: `${c.code} ${c.name} ${c._id}`.toLowerCase(),
        };
      });
  }, [categories]);

  const productOptions = useMemo(() => {
    return (products || []).map((p) => {
      const label = `${p.sku || ""} - ${p.name || ""}`;
      return {
        value: String(p._id),
        label,
        search: `${p.sku} ${p.name} ${p._id}`.toLowerCase(),
      };
    });
  }, [products]);

  const branchOptions = useMemo(() => {
    const active = (branches || []).filter((b) => b?.isActive !== false);
    const opts = active.map((b) => {
      const label = `${b.code ? `${b.code} - ` : ""}${b.name || b._id}`;
      return {
        value: String(b._id),
        label,
        search: `${b.code || ""} ${b.name || ""} ${b._id}`.toLowerCase(),
      };
    });
    return [
      { value: "all", label: "Tất cả (không attach stock trong list)", search: "all tat ca" },
      ...opts,
    ];
  }, [branches]);

  // ===============================
  // Fetch
  // ===============================
  const getCategories = async () => {
    const res = await api.get("/categories");
    setCategories((res.data.items || []) as CategoryItem[]);
  };

  const getTiers = async () => {
    const items = await getTierAgencies();
    setTiers(items);
  };

  const getProducts = async () => {
    setLoadingProducts(true);
    try {
      const res = await api.get("/products", { params: { mode: "product", limit: 500 } });
      const items = (res.data.items || res.data.products || []) as ProductItem[];
      setProducts(items);
    } catch (e: any) {
      console.error("Get products error:", e.response?.data || e.message);
      setProducts([]);
      toast.error(e?.response?.data?.message || "Không tải được danh sách sản phẩm");
    } finally {
      setLoadingProducts(false);
    }
  };

  const getVariants = async () => {
    if (!selectedProductId) {
      setVariants([]);
      return;
    }
    setLoadingVariants(true);
    try {
      const branchRaw = variantBranchIdForQuery;
      const res = await listVariants({
        productId: selectedProductId,
        q: variantSearch.trim() ? variantSearch.trim() : undefined,
        branchId: branchRaw || "all",
      });
      setVariants(Array.isArray(res.items) ? res.items : []);
    } catch (e: any) {
      console.error("Get variants error:", e?.response?.data || e?.message);
      setVariants([]);
      toast.error(e?.response?.data?.message || "Không tải được danh sách biến thể");
    } finally {
      setLoadingVariants(false);
    }
  };

  // ===============================
  // Init
  // ===============================
  useEffect(() => {
    const u = getCurrentUser?.();
    setUser(u || null);

    getCategories().catch(console.error);
    getTiers().catch(console.error);
    getProducts().catch(console.error);
    getBranches().then(setBranches).catch(() => setBranches([]));
  }, []);

  useEffect(() => {
  if (!user) return;

  // ✅ auto lấy branch theo role + localStorage
  const raw = getActiveBranchRaw(user); // STAFF => user.branchId, ADMIN/MANAGER => localStorage hoặc "all"
  const next = raw && raw.length ? raw : "all";

  setVariantBranchRaw(next);

  // ✅ nếu ADMIN/MANAGER chưa có key thì set luôn để đồng bộ UI
  const role = String(user?.role || "").toUpperCase();
  if (role !== "STAFF") {
    try {
      setActiveBranchId(next); // "all" hoặc id thật
    } catch {}
  }
}, [user]);


  useEffect(() => {
    if (activeTab !== "product") return;
    getProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  useEffect(() => {
    if (activeTab !== "variant") return;
    if (products.length === 0) getProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  useEffect(() => {
    if (!selectedProduct) {
      setProductOptionsDraft([]);
      setVariants([]);
      return;
    }
    const opts = Array.isArray(selectedProduct.options) ? selectedProduct.options : [];
    setProductOptionsDraft(
      opts
        .slice()
        .sort((a, b) => Number(a.order || 0) - Number(b.order || 0))
        .map((o) => ({
          key: normalizeKey(o.key),
          label: o.label || "",
          values: Array.isArray(o.values) ? o.values : [],
          order: Number(o.order || 0),
        }))
    );

    getVariants();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProductId]);

  useEffect(() => {
    if (activeTab !== "variant") return;
    getVariants();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [variantBranchIdForQuery, activeTab]);

  // ===============================
  // Barcode Scanner Modal
  // ===============================
  const BarcodeScannerModal = () => {
    const videoRef = React.useRef<HTMLVideoElement | null>(null);
    const streamRef = React.useRef<MediaStream | null>(null);
    const rafRef = React.useRef<number | null>(null);
    const detectorRef = React.useRef<any>(null);
    const lastCodeRef = React.useRef<string>("");

    const stopAll = () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
      if (videoRef.current) videoRef.current.srcObject = null;
      setScanning(false);
    };

    const applyBarcode = (code: string) => {
      const value = String(code || "").trim();
      if (!value) return;

      if (scanTarget === "create") setProductForm((prev: any) => ({ ...prev, barcode: value }));
      else if (scanTarget === "edit") setEditProduct((prev: any) => ({ ...prev, barcode: value }));
      else if (scanTarget === "variantCreate") setVariantCreate((prev: any) => ({ ...prev, barcode: value }));
      else if (scanTarget === "variantEdit") setVariantEdit((prev: any) => ({ ...prev, barcode: value }));

      toast.success(`Đã quét: ${value}`);
      setScanOpen(false);
      stopAll();
    };

    const tick = async () => {
      try {
        const video = videoRef.current;
        if (!video) return;

        if (video.readyState < 2) {
          rafRef.current = requestAnimationFrame(tick);
          return;
        }

        const detector = detectorRef.current;
        if (!detector) {
          rafRef.current = requestAnimationFrame(tick);
          return;
        }

        const barcodes = await detector.detect(video);
        if (barcodes && barcodes.length > 0) {
          const raw = barcodes[0]?.rawValue || "";
          const code = String(raw).trim();

          if (code && code !== lastCodeRef.current) {
            lastCodeRef.current = code;
            applyBarcode(code);
            return;
          }
        }

        rafRef.current = requestAnimationFrame(tick);
      } catch {
        rafRef.current = requestAnimationFrame(tick);
      }
    };

    const startScan = async () => {
      setScanError("");

      const BD = (window as any).BarcodeDetector;
      if (!BD) {
        setScanError("Trình duyệt chưa hỗ trợ BarcodeDetector. Hãy dùng Chrome trên Android hoặc cập nhật Chrome.");
        return;
      }

      try {
        setScanning(true);
        detectorRef.current = new BD({
          formats: ["ean_13", "ean_8", "code_128", "code_39", "upc_a", "upc_e", "itf", "qr_code"],
        });

        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false,
        });

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }

        rafRef.current = requestAnimationFrame(tick);
      } catch (err: any) {
        console.error(err);
        setScanError(err?.message || "Không mở được camera. Hãy cấp quyền camera cho website.");
        setScanning(false);
        stopAll();
      }
    };

    useEffect(() => {
      if (!scanOpen) return;
      startScan();
      return () => stopAll();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [scanOpen]);

    return (
      <Modal
        open={scanOpen}
        onCancel={() => {
          setScanOpen(false);
          stopAll();
        }}
        footer={null}
        title="Quét mã vạch"
        destroyOnClose
      >
        <div className="space-y-3">
          <div className="rounded-xl overflow-hidden border border-gray-200 bg-black">
            <video ref={videoRef} className="w-full h-64 object-cover" playsInline muted />
          </div>

          {scanError ? (
            <div className="text-sm text-red-600">{scanError}</div>
          ) : (
            <div className="text-sm text-gray-600">Đưa mã vạch vào giữa khung hình để tự nhận diện.</div>
          )}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                stopAll();
                startScan();
              }}
              className="flex-1 py-2.5 rounded-xl font-semibold border border-gray-200 hover:bg-gray-50"
              disabled={!!scanError}
            >
              {scanning ? "Đang quét..." : "Quét lại"}
            </button>

            <button
              type="button"
              onClick={() => {
                setScanOpen(false);
                stopAll();
              }}
              className="flex-1 py-2.5 rounded-xl font-semibold bg-pink-500 hover:bg-pink-600 text-white"
            >
              Đóng
            </button>
          </div>
        </div>
      </Modal>
    );
  };

  // ===============================
  // Bulk apply (all places)
  // ===============================
  const applyBulk = (next: Record<string, string>) => {
    if (bulkTarget === "create") setProductForm((prev: any) => ({ ...prev, priceTierMap: next }));
    else if (bulkTarget === "edit") setEditProduct((prev: any) => ({ ...prev, priceTierMap: next }));
    else if (bulkTarget === "variantCreate") setVariantCreate((prev: any) => ({ ...prev, priceTierMap: next }));
    else if (bulkTarget === "variantEdit") setVariantEdit((prev: any) => ({ ...prev, priceTierMap: next }));
    toast.success("Đã áp dụng đồng bộ giá sỉ");
  };

  // ===============================
  // Create handlers
  // ===============================
  const handleProductSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!productForm.sku.trim()) return void toast.warning("Thiếu SKU");
    if (!productForm.name.trim()) return void toast.warning("Thiếu tên sản phẩm");
    if (!productForm.categoryId) return void toast.warning("Chọn danh mục");
    if (!String(productForm.price || "").trim()) return void toast.warning("Nhập giá bán");

    setCreating(true);
    try {
      const created = await createProduct(productForm);
      const productId = extractCreatedProductId(created);

      if (!productId) {
        console.log("CREATE PRODUCT RESPONSE:", created);
        throw new Error("Không lấy được productId từ response create product");
      }

      if (selectedFiles.length > 0) await uploadProductImages(productId, selectedFiles, primaryIndex);

      setProductForm({
        sku: "",
        name: "",
        price: "",
        cost: "",
        categoryId: "",
        categoryName: "",
        brand: "",
        barcode: "",
        priceTierMap: {},
      });

      setSelectedFiles([]);
      setPrimaryIndex(0);

      await getProducts();
      toast.success("Tạo sản phẩm thành công");
    } catch (err: any) {
      console.error("Create product error:", err?.response?.data || err?.message);
      toast.error(err?.response?.data?.message || err?.message || "Có lỗi khi tạo sản phẩm");
    } finally {
      setCreating(false);
    }
  };

  const handleCategorySubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!categoryForm.name.trim()) return void toast.warning("Thiếu tên danh mục");
    if (!categoryForm.code.trim()) return void toast.warning("Thiếu CODE");

    setCreating(true);
    try {
      await createCategory(categoryForm);
      await getCategories();
      setCategoryForm({ name: "", code: "", order: "" });
      toast.success("Thêm mới danh mục thành công");
    } catch (err: any) {
      console.error("Create category error:", err?.response?.data || err?.message);
      toast.error(err?.response?.data?.message || "Có lỗi khi thêm danh mục");
    } finally {
      setCreating(false);
    }
  };

  // ===============================
  // OPEN EDIT
  // ===============================
  const openEditProduct = (p: ProductItem) => {
    setEditProduct({
      _id: p._id,
      sku: p.sku || "",
      name: p.name || "",
      price: formatVndInput(String(p.price ?? "")),
      cost: formatVndInput(String(p.cost ?? "")),
      categoryId: p.categoryId ? String(p.categoryId) : "",
      categoryName: p.categoryName || "",
      brand: p.brand || "",
      barcode: p.barcode || "",
      isActive: p.isActive !== false,

      thumbnail: p.thumbnail || "",
      images: Array.isArray(p.images) ? p.images : [],

      priceTierMap: mapFromPriceTier((p as any).price_tier),
    });

    setEditImageFiles([]);
    setEditImagePrimaryIndex(0);
    setEditProductOpen(true);
  };

  const openEditCategory = (c: CategoryItem) => {
    setEditCategory({
      _id: c._id,
      code: c.code || "",
      name: c.name || "",
      order: Number(c.order ?? 1),
      isActive: c.isActive !== false,
    });
    setEditCategoryOpen(true);
  };

  // ===============================
  // SAVE EDIT
  // ===============================
  const saveEditProduct = async () => {
    if (!editProduct._id) return;
    if (!String(editProduct.sku || "").trim()) return void toast.warning("Thiếu SKU");
    if (!String(editProduct.name || "").trim()) return void toast.warning("Thiếu tên sản phẩm");
    if (!String(editProduct.price || "").trim()) return void toast.warning("Thiếu giá bán");

    setSavingEdit(true);
    try {
      let catName = editProduct.categoryName || "";
      if (editProduct.categoryId) {
        const cat = categories.find((x) => String(x._id) === String(editProduct.categoryId));
        if (cat?.name) catName = cat.name;
      }

      await updateProduct(editProduct._id, { ...editProduct, categoryName: catName });
      setEditProductOpen(false);
      await getProducts();
      toast.success("Cập nhật sản phẩm thành công");
    } catch (err: any) {
      console.error("Update product error:", err?.response?.data || err?.message);
      toast.error(err?.response?.data?.message || "Có lỗi khi cập nhật sản phẩm");
    } finally {
      setSavingEdit(false);
    }
  };

  const saveEditCategory = async () => {
    if (!editCategory._id) return;
    if (!String(editCategory.name || "").trim()) return void toast.warning("Thiếu tên danh mục");
    if (!String(editCategory.code || "").trim()) return void toast.warning("Thiếu CODE");

    setSavingEdit(true);
    try {
      await updateCategory(editCategory._id, editCategory);
      setEditCategoryOpen(false);
      await getCategories();
      await getProducts().catch(() => {});
      toast.success("Cập nhật danh mục thành công");
    } catch (err: any) {
      console.error("Update category error:", err?.response?.data || err?.message);
      toast.error(err?.response?.data?.message || "Có lỗi khi cập nhật danh mục");
    } finally {
      setSavingEdit(false);
    }
  };

  // ===============================
  // EDIT IMAGES handlers
  // ===============================
  const uploadImagesInEditModal = async () => {
    if (!editProduct?._id) return;
    if (editImageFiles.length === 0) return void toast.warning("Chưa chọn ảnh");

    setUploadingEditImages(true);
    try {
      const rs = await uploadProductImages(editProduct._id, editImageFiles, editImagePrimaryIndex);

      setEditProduct((prev: any) => ({
        ...prev,
        thumbnail: rs?.thumbnail || prev.thumbnail,
        images: rs?.images || prev.images,
      }));

      setEditImageFiles([]);
      setEditImagePrimaryIndex(0);

      await getProducts();
      toast.success("Upload ảnh thành công");
    } catch (err: any) {
      console.error(err);
      toast.error(err?.response?.data?.message || "Upload ảnh thất bại");
    } finally {
      setUploadingEditImages(false);
    }
  };

  const setPrimaryInEditModal = async (url: string) => {
    if (!editProduct?._id) return;

    try {
      const rs = await setPrimaryProductImage(editProduct._id, url);
      setEditProduct((prev: any) => ({
        ...prev,
        thumbnail: rs?.thumbnail || url,
        images: rs?.images || prev.images,
      }));
      await getProducts();
      toast.success("Đã đặt ảnh chính");
    } catch (err: any) {
      console.error(err);
      toast.error(err?.response?.data?.message || "Không đặt được ảnh chính");
    }
  };

  const deleteImageInEditModal = async (url: string) => {
    if (!editProduct?._id) return;

    Modal.confirm({
      title: "Xoá ảnh?",
      content: "Ảnh sẽ bị xoá khỏi sản phẩm (và xoá file trên server).",
      okText: "Xoá",
      okButtonProps: { danger: true },
      cancelText: "Huỷ",
      onOk: async () => {
        try {
          const rs = await deleteProductImageByUrl(editProduct._id, url);
          setEditProduct((prev: any) => ({
            ...prev,
            thumbnail: rs?.thumbnail || "",
            images: rs?.images || [],
          }));
          await getProducts();
          toast.success("Đã xoá ảnh");
        } catch (err: any) {
          console.error(err);
          toast.error(err?.response?.data?.message || "Xoá ảnh thất bại");
        }
      },
    });
  };

  // ===============================
  // Variant: branch selector save (ADMIN/MANAGER)
  // ===============================
  const onChangeVariantBranch = (raw: string) => {
  const v = String(raw || "all");
  setVariantBranchRaw(v);

  const role = String(user?.role || "").toUpperCase();
  if (role !== "STAFF") {
    try {
      setActiveBranchId(v);
    } catch {}
  }
};


  // ===============================
  // Variant: save product options (to enable generate)
  // ===============================
  const saveProductOptions = async () => {
    if (!selectedProduct) return;

    const cleaned = (productOptionsDraft || [])
      .map((o) => ({
        key: normalizeKey(o.key),
        label: String(o.label || ""),
        values: Array.isArray(o.values) ? o.values.map((x) => String(x || "").trim()).filter(Boolean) : [],
        order: Number(o.order || 0),
      }))
      .filter((o) => o.key && o.values.length > 0);

    setSavingOptions(true);
    try {
      await updateProduct(selectedProduct._id, {
        sku: selectedProduct.sku,
        name: selectedProduct.name,
        price: formatVndInput(String(selectedProduct.price ?? 0)),
        cost: formatVndInput(String(selectedProduct.cost ?? 0)),
        categoryId: selectedProduct.categoryId || null,
        categoryName: selectedProduct.categoryName || "",
        brand: selectedProduct.brand || "",
        barcode: selectedProduct.barcode || "",
        isActive: selectedProduct.isActive !== false,
        options: cleaned,
        hasVariants: cleaned.length > 0,
      });

      toast.success("Đã lưu options cho sản phẩm");
      await getProducts();
    } catch (e: any) {
      console.error(e);
      toast.error(e?.response?.data?.message || "Lưu options thất bại");
    } finally {
      setSavingOptions(false);
    }
  };

  const doGenerateVariants = async () => {
    if (!selectedProductId) return;
    setGenerating(true);
    try {
      const rs = await generateVariants(selectedProductId, genOverwrite);
      toast.success(`Generate xong: tạo ${rs?.created ?? rs?.createdCount ?? rs?.created ?? 0} variants`);
      await getVariants();
      await getProducts();
    } catch (e: any) {
      console.error(e);
      toast.error(e?.response?.data?.message || "Generate variants thất bại");
    } finally {
      setGenerating(false);
    }
  };

  // ===============================
  // Variant CRUD
  // ===============================
  const openCreateVariant = () => {
    if (!selectedProductId) return void toast.warning("Chọn sản phẩm trước");
    const baseSku = selectedProduct?.sku || "";
    const keys = (selectedProduct?.options || []).map((o) => normalizeKey(o.key)).filter(Boolean);

    const attrsRec: Record<string, string> = {};
    keys.forEach((k) => (attrsRec[k] = ""));

    setVariantCreate({
      ...emptyVariantForm,
      productId: selectedProductId,
      sku: baseSku ? `${String(baseSku).toUpperCase()}-` : "",
      attributesRecord: attrsRec,
      isActive: true,
      overridePrice: false,
      overrideCost: false,
      price: "",
      cost: "",
      priceTierMap: {},
    });
    setVariantCreateOpen(true);
  };

  const openEditVariant = (v: VariantItem) => {
    const attrsRec = attrsToRecord(v.attributes);
    setVariantEdit({
      ...emptyVariantForm,
      _id: v._id,
      productId: String(v.productId),
      sku: v.sku || "",
      barcode: v.barcode || "",
      name: v.name || "",
      isActive: v.isActive !== false,
      attributesRecord: attrsRec,

      overridePrice: typeof v.price === "number",
      overrideCost: typeof v.cost === "number",
      price: typeof v.price === "number" ? formatVndInput(String(v.price)) : "",
      cost: typeof v.cost === "number" ? formatVndInput(String(v.cost)) : "",

      priceTierMap: mapFromPriceTier(v.price_tier as any),
    });
    setVariantEditOpen(true);
  };

  const submitCreateVariant = async () => {
    if (!variantCreate.productId) return;
    if (!String(variantCreate.sku || "").trim()) return void toast.warning("Thiếu SKU");
    setSavingVariant(true);
    try {
      const payload: any = {
        productId: variantCreate.productId,
        sku: String(variantCreate.sku || "").trim().toUpperCase(),
        barcode: String(variantCreate.barcode || "").trim(),
        name: String(variantCreate.name || "").trim(),
        attributes: recordToAttrs(variantCreate.attributesRecord),

        price: variantCreate.overridePrice ? parseVndInputToNumber(variantCreate.price) : undefined,
        cost: variantCreate.overrideCost ? parseVndInputToNumber(variantCreate.cost) : undefined,

        price_tier: normalizePriceTierFromMap(variantCreate.priceTierMap || {}),
        isActive: variantCreate.isActive === undefined ? true : !!variantCreate.isActive,
      };

      const created = await createVariant(payload);
      const vid = extractCreatedVariantId(created);
      if (!vid) console.log("CREATE VARIANT RESPONSE:", created);

      toast.success("Tạo variant thành công");
      setVariantCreateOpen(false);
      await getVariants();
    } catch (e: any) {
      console.error(e);
      toast.error(e?.response?.data?.message || e?.message || "Tạo variant thất bại");
    } finally {
      setSavingVariant(false);
    }
  };

  const submitEditVariant = async () => {
    if (!variantEdit._id) return;
    if (!String(variantEdit.sku || "").trim()) return void toast.warning("Thiếu SKU");
    setSavingVariant(true);
    try {
      const payload: any = {
        sku: String(variantEdit.sku || "").trim().toUpperCase(),
        barcode: String(variantEdit.barcode || "").trim(),
        name: String(variantEdit.name || "").trim(),
        attributes: recordToAttrs(variantEdit.attributesRecord),

        price: variantEdit.overridePrice ? parseVndInputToNumber(variantEdit.price) : null,
        cost: variantEdit.overrideCost ? parseVndInputToNumber(variantEdit.cost) : null,

        price_tier: normalizePriceTierFromMap(variantEdit.priceTierMap || {}),
        isActive: variantEdit.isActive === undefined ? true : !!variantEdit.isActive,
      };

      await updateVariant(variantEdit._id, payload);
      toast.success("Cập nhật variant thành công");
      setVariantEditOpen(false);
      await getVariants();
    } catch (e: any) {
      console.error(e);
      toast.error(e?.response?.data?.message || "Cập nhật variant thất bại");
    } finally {
      setSavingVariant(false);
    }
  };

  // ===============================
  // Stock actions
  // ===============================
  const openAdjust = (v: VariantItem) => {
    if (!variantBranchRaw || variantBranchRaw === "all") return void toast.warning("Chọn 1 chi nhánh để chỉnh tồn kho");
    setStockTargetVariant(v);
    setAdjustForm({ op: "IN", qty: "", note: "" });
    setAdjustOpen(true);
  };

  const submitAdjust = async () => {
    if (!stockTargetVariant) return;
    if (!variantBranchRaw || variantBranchRaw === "all") return void toast.warning("Chọn 1 chi nhánh");
    const q = Number(String(adjustForm.qty || "").replace(/[^\d.]/g, ""));
    if (!Number.isFinite(q) || q < 0) return void toast.warning("Qty không hợp lệ");

    try {
      await adjustVariantStock({
        variantId: stockTargetVariant._id,
        branchId: variantBranchRaw,
        op: adjustForm.op,
        qty: q,
        note: adjustForm.note || "",
      });
      toast.success("Đã cập nhật tồn kho");
      setAdjustOpen(false);
      await getVariants();
    } catch (e: any) {
      console.error(e);
      toast.error(e?.response?.data?.message || "Chỉnh tồn kho thất bại");
    }
  };

  const openTransfer = (v: VariantItem) => {
    setStockTargetVariant(v);

    const fromDefault =
      variantBranchRaw && variantBranchRaw !== "all"
        ? variantBranchRaw
        : branches[0]?._id
          ? String(branches[0]._id)
          : "";
    const toDefault = branches.find((b) => String(b._id) !== String(fromDefault))?._id
      ? String(branches.find((b) => String(b._id) !== String(fromDefault))?._id)
      : "";

    setTransferForm({ fromBranchId: fromDefault, toBranchId: toDefault, qty: "", note: "" });
    setTransferOpen(true);
  };

  const submitTransfer = async () => {
    if (!stockTargetVariant) return;
    const qty = Number(String(transferForm.qty || "").replace(/[^\d.]/g, ""));
    if (!Number.isFinite(qty) || qty <= 0) return void toast.warning("Qty phải > 0");
    if (!transferForm.fromBranchId || !transferForm.toBranchId) return void toast.warning("Chọn đủ 2 chi nhánh");
    if (transferForm.fromBranchId === transferForm.toBranchId) return void toast.warning("2 chi nhánh phải khác nhau");

    try {
      await transferVariantStock({
        variantId: stockTargetVariant._id,
        fromBranchId: transferForm.fromBranchId,
        toBranchId: transferForm.toBranchId,
        qty,
        note: transferForm.note || "",
      });
      toast.success("Đã chuyển tồn kho");
      setTransferOpen(false);
      await getVariants();
    } catch (e: any) {
      console.error(e);
      toast.error(e?.response?.data?.message || "Chuyển kho thất bại");
    }
  };

  // ===============================
  // UI
  // ===============================
  return (
    <div className="max-w-6xl mx-auto space-y-4">
      {contextHolder}
      <BarcodeScannerModal />

      <BulkTierPriceModal
        open={bulkOpen}
        onClose={() => setBulkOpen(false)}
        tiers={tiers}
        value={
          bulkTarget === "create"
            ? productForm.priceTierMap
            : bulkTarget === "edit"
              ? editProduct.priceTierMap
              : bulkTarget === "variantCreate"
                ? variantCreate.priceTierMap
                : variantEdit.priceTierMap
        }
        onApply={applyBulk}
      />

      {/* Header */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="text-xl font-extrabold text-gray-900">Quản Lý Sản Phẩm</h2>
        <p className="text-sm text-gray-600 mt-1">Sản phẩm / Danh mục / Variant + Tồn kho Variant</p>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-2xl border border-gray-200 p-2 shadow-sm">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab("product")}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-semibold transition-all ${
              activeTab === "product" ? "bg-pink-500 text-white" : "text-gray-700 hover:bg-gray-50"
            }`}
          >
            <Package className="w-5 h-5" />
            Sản Phẩm
          </button>

          <button
            onClick={() => setActiveTab("category")}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-semibold transition-all ${
              activeTab === "category" ? "bg-pink-500 text-white" : "text-gray-700 hover:bg-gray-50"
            }`}
          >
            <Tag className="w-5 h-5" />
            Danh Mục
          </button>

          <button
            onClick={() => setActiveTab("variant")}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-semibold transition-all ${
              activeTab === "variant" ? "bg-pink-500 text-white" : "text-gray-700 hover:bg-gray-50"
            }`}
          >
            <Layers className="w-5 h-5" />
            Variant
          </button>
        </div>
      </div>

      {/* ===============================
          PRODUCT TAB
      =============================== */}
      {activeTab === "product" && (
        <div className="space-y-4">
          <Card title="Thêm sản phẩm" desc="Nhập thông tin + giá sỉ theo tier (product)">
            <form onSubmit={handleProductSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="SKU" required hint="VD: KAKI">
                  <input
                    type="text"
                    value={productForm.sku}
                    onChange={(e) => setProductForm({ ...productForm, sku: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-pink-400 focus:border-transparent"
                    placeholder="KAKI"
                    required
                  />
                </Field>

                <Field label="Tên sản phẩm" required>
                  <input
                    type="text"
                    value={productForm.name}
                    onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-pink-400 focus:border-transparent"
                    placeholder="VD: Quần Kaki"
                    required
                  />
                </Field>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Field label="Danh mục" required hint="Gõ để tìm theo CODE / Tên">
                  <AutoComplete
                    className="w-full"
                    options={categoryOptions}
                    filterOption={acFilter}
                    value={productForm.categoryId || undefined}
                    onChange={(val) => {
                      const id = String(val || "");
                      const cat = categories.find((x) => String(x._id) === id);
                      setProductForm((p: any) => ({
                        ...p,
                        categoryId: id,
                        categoryName: cat?.name || "",
                      }));
                    }}
                    onSelect={(val) => {
                      const id = String(val || "");
                      const cat = categories.find((x) => String(x._id) === id);
                      setProductForm((p: any) => ({
                        ...p,
                        categoryId: id,
                        categoryName: cat?.name || "",
                      }));
                    }}
                    allowClear
                    placeholder="Chọn danh mục..."
                  />
                </Field>

                <Field label="Giá bán" required hint='Hiển thị dạng "160.000 đ"'>
                  <MoneyInput value={productForm.price} onChange={(v) => setProductForm({ ...productForm, price: v })} />
                </Field>

                <Field label="Brand">
                  <input
                    type="text"
                    value={productForm.brand}
                    onChange={(e) => setProductForm({ ...productForm, brand: e.target.value })}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-pink-400 focus:border-transparent"
                    placeholder="VD: Local"
                  />
                </Field>
              </div>

              <TierPriceEditor
                title="Giá sỉ theo cấp (TierAgency) - PRODUCT"
                tiers={tiers}
                value={productForm.priceTierMap}
                onChange={(next) => setProductForm((prev: any) => ({ ...prev, priceTierMap: next }))}
                disabled={creating}
                onReloadTiers={getTiers}
                onOpenBulk={() => openBulk("create")}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="Barcode">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={productForm.barcode}
                      onChange={(e) => setProductForm({ ...productForm, barcode: e.target.value })}
                      className="flex-1 px-3 py-2.5 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-pink-400 focus:border-transparent"
                      placeholder="8938501234567"
                    />
                    <button
                      type="button"
                      onClick={() => openScan("create")}
                      className="px-3 py-2.5 rounded-xl border border-gray-200 hover:bg-gray-50 font-semibold text-sm whitespace-nowrap"
                      disabled={creating}
                    >
                      Quét mã
                    </button>
                  </div>
                </Field>

                <Field label="Giá vốn (tuỳ chọn)" hint="Nếu không nhập sẽ mặc định 0">
                  <MoneyInput value={productForm.cost} onChange={(v) => setProductForm({ ...productForm, cost: v })} />
                </Field>
              </div>

              <DividerLine />

              {/* Images picker */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <ImageIcon className="w-5 h-5 text-gray-600" />
                  <h4 className="font-semibold text-gray-800">Hình ảnh sản phẩm</h4>
                  <span className="text-xs text-gray-500">(chọn ảnh trước, tạo xong sẽ upload tự động)</span>
                </div>

                <label className="block w-full cursor-pointer">
                  <div className="w-full px-3 py-3 border border-gray-300 rounded-xl hover:bg-gray-50 font-semibold text-gray-700">
                    Bấm để chọn ảnh (tối đa 8 ảnh)
                  </div>
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={(e) => {
                      const files = Array.from(e.target.files || []).slice(0, 8);
                      setSelectedFiles(files);
                      setPrimaryIndex(0);
                      e.currentTarget.value = "";
                    }}
                    className="hidden"
                    disabled={creating}
                  />
                </label>

                {selectedFiles.length > 0 && (
                  <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-3">
                    {previews.map((p, idx) => (
                      <div
                        key={p.url}
                        className={`relative border rounded-xl overflow-hidden ${
                          idx === primaryIndex ? "border-pink-500 ring-2 ring-pink-200" : "border-gray-200"
                        }`}
                      >
                        <img src={p.url} alt={p.name} className="w-full h-24 object-cover" />
                        <div className="p-2 text-xs text-gray-600 truncate">{p.name}</div>

                        <button
                          type="button"
                          onClick={() => setPrimaryIndex(idx)}
                          className="absolute top-2 left-2 text-[11px] px-2 py-1 rounded-lg bg-white/95 border border-gray-200 hover:border-pink-300"
                        >
                          {idx === primaryIndex ? "Ảnh chính" : "Chọn chính"}
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            const next = selectedFiles.filter((_, i) => i !== idx);
                            setSelectedFiles(next);
                            setPrimaryIndex((pi) => {
                              if (idx === pi) return 0;
                              if (idx < pi) return Math.max(0, pi - 1);
                              return pi;
                            });
                          }}
                          className="absolute top-2 right-2 p-1 rounded-lg bg-white/95 border border-gray-200 hover:border-red-300"
                          title="Xoá ảnh"
                        >
                          <X className="w-4 h-4 text-gray-700" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={creating}
                className={`w-full py-3 rounded-xl font-bold transition-colors flex items-center justify-center gap-2 ${
                  creating ? "bg-gray-200 text-gray-500 cursor-not-allowed" : "bg-pink-500 hover:bg-pink-600 text-white"
                }`}
              >
                <Plus className="w-5 h-5" />
                {creating ? "Đang tạo..." : "Thêm Sản Phẩm"}
              </button>
            </form>
          </Card>

          <Card
            title={`Danh Sách Sản Phẩm (${products.length})`}
            right={
              <button
                type="button"
                onClick={getProducts}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-200 hover:bg-gray-50 text-sm font-semibold"
              >
                <RefreshCw className={`w-4 h-4 ${loadingProducts ? "animate-spin" : ""}`} />
                Tải lại
              </button>
            }
          >
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left bg-gray-50 border-y border-gray-200">
                    <th className="px-3 py-2.5 font-semibold text-gray-700">Ảnh</th>
                    <th className="px-3 py-2.5 font-semibold text-gray-700">SKU</th>
                    <th className="px-3 py-2.5 font-semibold text-gray-700">Tên</th>
                    <th className="px-3 py-2.5 font-semibold text-gray-700">Danh mục</th>
                    <th className="px-3 py-2.5 font-semibold text-gray-700">Giá</th>
                    <th className="px-3 py-2.5 font-semibold text-gray-700">Variants</th>
                    <th className="px-3 py-2.5 font-semibold text-gray-700">Brand</th>
                    <th className="px-3 py-2.5 font-semibold text-gray-700">Barcode</th>
                    <th className="px-3 py-2.5 font-semibold text-gray-700 text-right">Action</th>
                  </tr>
                </thead>

                <tbody>
                  {loadingProducts && (
                    <tr>
                      <td colSpan={9} className="px-3 py-6 text-center text-gray-500">
                        Đang tải sản phẩm...
                      </td>
                    </tr>
                  )}

                  {!loadingProducts && products.length === 0 && (
                    <tr>
                      <td colSpan={9} className="px-3 py-6 text-center text-gray-500">
                        Chưa có sản phẩm nào.
                      </td>
                    </tr>
                  )}

                  {!loadingProducts &&
                    products.map((p) => {
                      const hasVariants = !!p.hasVariants || (Array.isArray(p.options) && p.options.length > 0);
                      return (
                        <tr key={p._id} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="px-3 py-2.5">
                            {p.thumbnail ? (
                              <img
                                src={p.thumbnail}
                                alt={p.name}
                                className="w-10 h-10 rounded-xl object-cover border border-gray-200"
                                onError={(e) => {
                                  (e.currentTarget as HTMLImageElement).style.display = "none";
                                }}
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-xl bg-gray-100 border border-gray-200 flex items-center justify-center text-gray-400">
                                <ImageIcon className="w-5 h-5" />
                              </div>
                            )}
                          </td>
                          <td className="px-3 py-2.5 font-bold text-gray-900 whitespace-nowrap">{p.sku || "-"}</td>
                          <td className="px-3 py-2.5 text-gray-900">{p.name || "-"}</td>
                          <td className="px-3 py-2.5 text-gray-700 whitespace-nowrap">{p.categoryName || "-"}</td>
                          <td className="px-3 py-2.5 text-gray-900 whitespace-nowrap">{money(p.price)}đ</td>
                          <td className="px-3 py-2.5 text-gray-700 whitespace-nowrap">
                            {hasVariants ? (
                              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-pink-50 text-pink-700 border border-pink-200 text-xs font-semibold">
                                <Layers className="w-4 h-4" /> Có
                              </span>
                            ) : (
                              "-"
                            )}
                          </td>
                          <td className="px-3 py-2.5 text-gray-700 whitespace-nowrap">{p.brand || "-"}</td>
                          <td className="px-3 py-2.5 text-gray-700 whitespace-nowrap">{p.barcode || "-"}</td>
                          <td className="px-3 py-2.5 text-right">
                            <button
                              type="button"
                              onClick={() => openEditProduct(p)}
                              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-200 hover:bg-gray-50 text-sm font-semibold"
                            >
                              <Pencil className="w-4 h-4" />
                              Sửa
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>

            {/* ✅ Edit Product Modal */}
            <Modal
              open={editProductOpen}
              onCancel={() => setEditProductOpen(false)}
              onOk={saveEditProduct}
              okText={savingEdit ? "Đang lưu..." : "Lưu"}
              cancelText="Đóng"
              confirmLoading={savingEdit}
              title="Sửa sản phẩm"
              width={860}
              destroyOnClose
            >
              <div className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Field label="SKU" required>
                    <input
                      value={editProduct.sku}
                      onChange={(e) => setEditProduct({ ...editProduct, sku: e.target.value.toUpperCase() })}
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-xl outline-none"
                    />
                  </Field>
                  <Field label="Tên" required>
                    <input
                      value={editProduct.name}
                      onChange={(e) => setEditProduct({ ...editProduct, name: e.target.value })}
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-xl outline-none"
                    />
                  </Field>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <Field label="Danh mục" hint="Gõ để tìm">
                    <AutoComplete
                      className="w-full"
                      options={categoryOptions}
                      filterOption={acFilter}
                      value={editProduct.categoryId || undefined}
                      onChange={(val) => {
                        const id = String(val || "");
                        const cat = categories.find((x) => String(x._id) === id);
                        setEditProduct((p: any) => ({
                          ...p,
                          categoryId: id,
                          categoryName: cat?.name || "",
                        }));
                      }}
                      onSelect={(val) => {
                        const id = String(val || "");
                        const cat = categories.find((x) => String(x._id) === id);
                        setEditProduct((p: any) => ({
                          ...p,
                          categoryId: id,
                          categoryName: cat?.name || "",
                        }));
                      }}
                      allowClear
                      placeholder="Chọn danh mục..."
                    />
                  </Field>

                  <Field label="Giá" required>
                    <MoneyInput value={editProduct.price} onChange={(v) => setEditProduct({ ...editProduct, price: v })} />
                  </Field>

                  <Field label="Giá vốn">
                    <MoneyInput value={editProduct.cost} onChange={(v) => setEditProduct({ ...editProduct, cost: v })} />
                  </Field>
                </div>

                <TierPriceEditor
                  title="Giá sỉ theo cấp (TierAgency) - PRODUCT"
                  tiers={tiers}
                  value={editProduct.priceTierMap}
                  onChange={(next) => setEditProduct((prev: any) => ({ ...prev, priceTierMap: next }))}
                  disabled={savingEdit}
                  onReloadTiers={getTiers}
                  onOpenBulk={() => openBulk("edit")}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Field label="Brand">
                    <input
                      value={editProduct.brand}
                      onChange={(e) => setEditProduct({ ...editProduct, brand: e.target.value })}
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-xl outline-none"
                    />
                  </Field>

                  <Field label="Barcode">
                    <div className="flex gap-2">
                      <input
                        value={editProduct.barcode}
                        onChange={(e) => setEditProduct({ ...editProduct, barcode: e.target.value })}
                        className="flex-1 px-3 py-2.5 border border-gray-300 rounded-xl outline-none"
                      />

                      <button
                        type="button"
                        onClick={() => openScan("edit")}
                        className="px-3 py-2.5 rounded-xl border border-gray-200 hover:bg-gray-50 font-semibold text-sm whitespace-nowrap"
                        disabled={savingEdit}
                      >
                        Quét mã
                      </button>
                    </div>
                  </Field>
                </div>

                <label className="inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={!!editProduct.isActive}
                    onChange={(e) => setEditProduct({ ...editProduct, isActive: e.target.checked })}
                  />
                  <span className="text-sm text-gray-700">Đang bán (isActive)</span>
                </label>

                <DividerLine />

                {/* EDIT IMAGES */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <ImageIcon className="w-5 h-5 text-gray-600" />
                    <h4 className="font-semibold text-gray-800">Ảnh sản phẩm</h4>
                    <span className="text-xs text-gray-500">(chọn ảnh chính / xoá / upload thêm)</span>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {(editProduct.images || []).length === 0 && <div className="text-sm text-gray-500">Chưa có ảnh.</div>}

                    {(editProduct.images || []).map((img: ProductImage) => {
                      const isPrimary = !!img.isPrimary || img.url === editProduct.thumbnail;
                      return (
                        <div
                          key={img.url}
                          className={`relative border rounded-xl overflow-hidden ${
                            isPrimary ? "border-pink-500 ring-2 ring-pink-200" : "border-gray-200"
                          }`}
                        >
                          <img src={img.url} alt="product" className="w-full h-24 object-cover" />

                          <div className="p-2 flex items-center justify-between gap-2">
                            <button
                              type="button"
                              onClick={() => setPrimaryInEditModal(img.url)}
                              className="text-[11px] px-2 py-1 rounded-lg bg-white border border-gray-200 hover:border-pink-300"
                            >
                              {isPrimary ? "Ảnh chính" : "Chọn chính"}
                            </button>

                            <button
                              type="button"
                              onClick={() => deleteImageInEditModal(img.url)}
                              className="text-[11px] px-2 py-1 rounded-lg bg-white border border-gray-200 hover:border-red-300"
                            >
                              Xoá
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="mt-4">
                    <div className="text-sm font-medium text-gray-700 mb-2">Upload thêm ảnh</div>

                    <label className="block w-full cursor-pointer">
                      <div className="w-full px-3 py-3 border border-gray-300 rounded-xl hover:bg-gray-50 font-semibold text-gray-700">
                        Bấm để chọn ảnh (tối đa 8)
                      </div>
                      <input
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={(e) => {
                          const files = Array.from(e.target.files || []).slice(0, 8);
                          setEditImageFiles(files);
                          setEditImagePrimaryIndex(0);
                          e.currentTarget.value = "";
                        }}
                        className="hidden"
                        disabled={uploadingEditImages || savingEdit}
                      />
                    </label>

                    {editImageFiles.length > 0 && (
                      <div className="mt-3">
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                          {editImagePreviews.map((p, idx) => (
                            <div
                              key={p.url}
                              className={`relative border rounded-xl overflow-hidden ${
                                idx === editImagePrimaryIndex ? "border-pink-500 ring-2 ring-pink-200" : "border-gray-200"
                              }`}
                            >
                              <img src={p.url} alt={p.name} className="w-full h-24 object-cover" />
                              <div className="p-2 text-xs text-gray-600 truncate">{p.name}</div>

                              <button
                                type="button"
                                onClick={() => setEditImagePrimaryIndex(idx)}
                                className="absolute top-2 left-2 text-[11px] px-2 py-1 rounded-lg bg-white/95 border border-gray-200 hover:border-pink-300"
                              >
                                {idx === editImagePrimaryIndex ? "Ảnh chính" : "Chọn chính"}
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  const next = editImageFiles.filter((_, i) => i !== idx);
                                  setEditImageFiles(next);
                                  setEditImagePrimaryIndex((pi) => {
                                    if (idx === pi) return 0;
                                    if (idx < pi) return Math.max(0, pi - 1);
                                    return pi;
                                  });
                                }}
                                className="absolute top-2 right-2 p-1 rounded-lg bg-white/95 border border-gray-200 hover:border-red-300"
                                title="Xoá ảnh"
                              >
                                <X className="w-4 h-4 text-gray-700" />
                              </button>
                            </div>
                          ))}
                        </div>

                        <button
                          type="button"
                          onClick={uploadImagesInEditModal}
                          disabled={uploadingEditImages}
                          className={`mt-3 w-full py-2.5 rounded-xl font-bold transition-colors ${
                            uploadingEditImages ? "bg-gray-200 text-gray-500 cursor-not-allowed" : "bg-pink-500 hover:bg-pink-600 text-white"
                          }`}
                        >
                          {uploadingEditImages ? "Đang upload..." : "Upload ảnh"}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </Modal>
          </Card>
        </div>
      )}

      {/* ===============================
          CATEGORY TAB
      =============================== */}
      {activeTab === "category" && (
        <div className="space-y-4">
          <Card title="Thêm danh mục" desc="Tạo mới danh mục để nhóm sản phẩm">
            <form onSubmit={handleCategorySubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Field label="Tên danh mục" required>
                  <input
                    type="text"
                    value={categoryForm.name}
                    onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-pink-400 focus:border-transparent"
                    placeholder="VD: Kem dưỡng da"
                    required
                  />
                </Field>

                <Field label="CODE" required>
                  <input
                    type="text"
                    value={categoryForm.code}
                    onChange={(e) => setCategoryForm({ ...categoryForm, code: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-pink-400 focus:border-transparent"
                    placeholder="VD: SON"
                    required
                  />
                </Field>

                <Field label="Order">
                  <input
                    type="number"
                    value={categoryForm.order}
                    onChange={(e) => setCategoryForm({ ...categoryForm, order: e.target.value })}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-pink-400 focus:border-transparent"
                    placeholder="1"
                    min={1}
                  />
                </Field>
              </div>

              <button
                type="submit"
                disabled={creating}
                className={`w-full py-3 rounded-xl font-bold transition-colors flex items-center justify-center gap-2 ${
                  creating ? "bg-gray-200 text-gray-500 cursor-not-allowed" : "bg-pink-500 hover:bg-pink-600 text-white"
                }`}
              >
                <Plus className="w-5 h-5" />
                {creating ? "Đang tạo..." : "Thêm Danh Mục"}
              </button>
            </form>
          </Card>

          <Card title={`Danh Sách (${categories.length})`} desc="Bấm sửa để cập nhật">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {categories?.map((cat) => (
                <div key={cat._id} className="bg-gray-50 border border-gray-200 rounded-2xl p-4 hover:border-pink-300 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="text-xl font-extrabold text-pink-600">{cat.code}</div>
                    <div className="flex-1">
                      <h4 className="font-bold text-gray-900">{cat.name}</h4>
                      <p className="text-sm text-gray-600">Order: {cat.order ?? "-"}</p>
                    </div>

                    <button
                      type="button"
                      onClick={() => openEditCategory(cat)}
                      className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-200 hover:bg-white text-sm font-semibold"
                    >
                      <Pencil className="w-4 h-4" />
                      Sửa
                    </button>
                  </div>
                </div>
              ))}

              {categories.length === 0 && <div className="text-sm text-gray-500">Chưa có danh mục nào.</div>}
            </div>

            <Modal
              open={editCategoryOpen}
              onCancel={() => setEditCategoryOpen(false)}
              onOk={saveEditCategory}
              okText={savingEdit ? "Đang lưu..." : "Lưu"}
              cancelText="Đóng"
              confirmLoading={savingEdit}
              title="Sửa danh mục"
              destroyOnClose
            >
              <div className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Field label="CODE" required>
                    <input
                      value={editCategory.code}
                      onChange={(e) => setEditCategory({ ...editCategory, code: e.target.value.toUpperCase() })}
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-xl outline-none"
                    />
                  </Field>
                  <Field label="Tên" required>
                    <input
                      value={editCategory.name}
                      onChange={(e) => setEditCategory({ ...editCategory, name: e.target.value })}
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-xl outline-none"
                    />
                  </Field>
                </div>

                <Field label="Order">
                  <input
                    type="number"
                    value={editCategory.order}
                    onChange={(e) => setEditCategory({ ...editCategory, order: Number(e.target.value || 1) })}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-xl outline-none"
                  />
                </Field>

                <label className="inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={!!editCategory.isActive}
                    onChange={(e) => setEditCategory({ ...editCategory, isActive: e.target.checked })}
                  />
                  <span className="text-sm text-gray-700">Đang dùng (isActive)</span>
                </label>
              </div>
            </Modal>
          </Card>
        </div>
      )}

      {/* ===============================
          VARIANT TAB
      =============================== */}
      {activeTab === "variant" && (
        <div className="space-y-4">
          <Card
            title="Chọn sản phẩm & chi nhánh"
            desc="Variant được quản lý theo từng sản phẩm cha. Chi nhánh dùng để xem/chỉnh tồn kho."
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Chọn sản phẩm (Product master)" required hint="Gõ để tìm theo SKU / Tên">
                <AutoComplete
                  className="w-full"
                  options={productOptions}
                  filterOption={acFilter}
                  value={selectedProductId || undefined}
                  onChange={(val) => setSelectedProductId(String(val || ""))}
                  onSelect={(val) => setSelectedProductId(String(val || ""))}
                  allowClear
                  placeholder="Chọn sản phẩm..."
                />
              </Field>

              <Field label="Chi nhánh" hint='ADMIN/MANAGER chọn "all" hoặc 1 chi nhánh. STAFF bị khóa theo branch token.'>
                <AutoComplete
                  className="w-full"
                  options={branchOptions}
                  filterOption={acFilter}
                  value={variantBranchRaw || "all"}
                  onChange={(val) => onChangeVariantBranch(String(val || "all"))}
                  onSelect={(val) => onChangeVariantBranch(String(val || "all"))}
                  allowClear={false}
                  placeholder="Chọn chi nhánh..."
                />
              </Field>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
              <div className="text-xs text-gray-500">
                {variantBranchRaw === "all" ? "Đang xem: All (không kèm stock trong list)" : `Đang xem: ${variantBranchRaw} (có stockQty)`}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => getVariants()}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-200 hover:bg-gray-50 text-sm font-semibold"
                  disabled={!selectedProductId}
                >
                  <RefreshCw className={`w-4 h-4 ${loadingVariants ? "animate-spin" : ""}`} />
                  Tải variants
                </button>

                <button
                  type="button"
                  onClick={openCreateVariant}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-pink-500 hover:bg-pink-600 text-white text-sm font-semibold"
                  disabled={!selectedProductId}
                >
                  <Plus className="w-4 h-4" />
                  Thêm variant
                </button>
              </div>
            </div>
          </Card>

          <Card
            title="Options → Generate Variants"
            // desc={
            //   <span>
            //     Nhập options (VD: color, size) rồi bấm Generate để tạo variants. (Backend: <b>/products/:id/variants/generate</b>)
            //   </span>
            // }
            right={
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={saveProductOptions}
                  className="px-3 py-2 rounded-xl border border-gray-200 hover:bg-gray-50 text-sm font-semibold"
                  disabled={!selectedProductId || savingOptions}
                >
                  {savingOptions ? "Đang lưu..." : "Lưu options"}
                </button>

                <button
                  type="button"
                  onClick={doGenerateVariants}
                  className="px-3 py-2 rounded-xl bg-pink-500 hover:bg-pink-600 text-white text-sm font-semibold"
                  disabled={!selectedProductId || generating}
                >
                  {generating ? "Đang generate..." : "Generate"}
                </button>
              </div>
            }
          >
            {!selectedProductId ? (
              <div className="text-sm text-gray-500">Chọn sản phẩm trước để cấu hình options.</div>
            ) : (
              <div className="space-y-3">
                <label className="inline-flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={genOverwrite} onChange={(e) => setGenOverwrite(e.target.checked)} />
                  <span className="text-gray-700">Overwrite (xoá toàn bộ variants cũ rồi tạo lại)</span>
                </label>

                <div className="space-y-3">
                  {productOptionsDraft.length === 0 && (
                    <div className="text-sm text-gray-500">Chưa có options. Bấm <b>+ Thêm option</b> để tạo.</div>
                  )}

                  {productOptionsDraft.map((opt, idx) => (
                    <div key={`${opt.key}_${idx}`} className="rounded-2xl border border-gray-200 p-4 bg-gray-50/50">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <Field label="Key" required hint="VD: color, size (lowercase)">
                          <input
                            value={opt.key}
                            onChange={(e) => {
                              const next = productOptionsDraft.slice();
                              next[idx] = { ...next[idx], key: normalizeKey(e.target.value) };
                              setProductOptionsDraft(next);
                            }}
                            className="w-full px-3 py-2.5 border border-gray-300 rounded-xl outline-none"
                            placeholder="color"
                          />
                        </Field>

                        <Field label="Label" hint="VD: Màu, Size">
                          <input
                            value={opt.label || ""}
                            onChange={(e) => {
                              const next = productOptionsDraft.slice();
                              next[idx] = { ...next[idx], label: e.target.value };
                              setProductOptionsDraft(next);
                            }}
                            className="w-full px-3 py-2.5 border border-gray-300 rounded-xl outline-none"
                            placeholder="Màu"
                          />
                        </Field>

                        <Field label="Order">
                          <input
                            type="number"
                            value={Number(opt.order || 0)}
                            onChange={(e) => {
                              const next = productOptionsDraft.slice();
                              next[idx] = { ...next[idx], order: Number(e.target.value || 0) };
                              setProductOptionsDraft(next);
                            }}
                            className="w-full px-3 py-2.5 border border-gray-300 rounded-xl outline-none"
                          />
                        </Field>
                      </div>

                      <div className="mt-3">
                        <Field label="Values" required hint='Nhập danh sách, phân cách bằng dấu phẩy. VD: "Xanh, Đen, Trắng"'>
                          <input
                            value={(opt.values || []).join(", ")}
                            onChange={(e) => {
                              const values = String(e.target.value || "")
                                .split(",")
                                .map((x) => x.trim())
                                .filter(Boolean);
                              const next = productOptionsDraft.slice();
                              next[idx] = { ...next[idx], values };
                              setProductOptionsDraft(next);
                            }}
                            className="w-full px-3 py-2.5 border border-gray-300 rounded-xl outline-none"
                            placeholder="Xanh, Đen, Trắng"
                          />
                        </Field>
                      </div>

                      <div className="mt-3 flex justify-end">
                        <button
                          type="button"
                          onClick={() => {
                            const next = productOptionsDraft.filter((_, i) => i !== idx);
                            setProductOptionsDraft(next);
                          }}
                          className="px-3 py-2 rounded-xl border border-red-200 hover:bg-red-50 text-sm font-semibold text-red-700"
                        >
                          Xoá option
                        </button>
                      </div>
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={() => setProductOptionsDraft((prev) => [...prev, { key: "", label: "", values: [], order: prev.length }])}
                    className="w-full py-2.5 rounded-xl border border-gray-200 hover:bg-gray-50 font-semibold"
                    disabled={!selectedProductId}
                  >
                    + Thêm option
                  </button>
                </div>
              </div>
            )}
          </Card>

          <Card
            title={`Danh sách biến thể (${variants.length})`}
            desc={variantBranchRaw === "all" ? "branch=all: không kèm stock" : `branch=${variantBranchRaw}: có stockQty`}
            right={
              <button
                type="button"
                onClick={getVariants}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-200 hover:bg-gray-50 text-sm font-semibold"
                disabled={!selectedProductId}
              >
                <RefreshCw className={`w-4 h-4 ${loadingVariants ? "animate-spin" : ""}`} />
                Tải lại
              </button>
            }
          >
            {!selectedProductId ? (
              <div className="text-sm text-gray-500">Chọn sản phẩm để xem variants.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left bg-gray-50 border-y border-gray-200">
                      <th className="px-3 py-2.5 font-semibold text-gray-700">SKU</th>
                      <th className="px-3 py-2.5 font-semibold text-gray-700">Tên</th>
                      <th className="px-3 py-2.5 font-semibold text-gray-700">Attributes</th>
                      <th className="px-3 py-2.5 font-semibold text-gray-700">Barcode</th>
                      <th className="px-3 py-2.5 font-semibold text-gray-700">Giá</th>
                      <th className="px-3 py-2.5 font-semibold text-gray-700">Giá sỉ</th>
                      <th className="px-3 py-2.5 font-semibold text-gray-700">Tồn</th>
                      <th className="px-3 py-2.5 font-semibold text-gray-700 text-right">Action</th>
                    </tr>
                  </thead>

                  <tbody>
                    {loadingVariants && (
                      <tr>
                        <td colSpan={8} className="px-3 py-6 text-center text-gray-500">
                          Đang tải variants...
                        </td>
                      </tr>
                    )}

                    {!loadingVariants && variants.length === 0 && (
                      <tr>
                        <td colSpan={8} className="px-3 py-6 text-center text-gray-500">
                          Chưa có biến thể nào.
                        </td>
                      </tr>
                    )}

                    {!loadingVariants &&
                      variants.map((v) => {
                        const tierCount = Array.isArray(v.price_tier) ? v.price_tier.length : 0;
                        const attrs = (v.attributes || []).map((a) => `${a.k}:${a.v}`).join(", ");
                        const qty = typeof v.stockQty === "number" ? v.stockQty : null;

                        return (
                          <tr key={v._id} className="border-b border-gray-100 hover:bg-gray-50">
                            <td className="px-3 py-2.5 font-bold text-gray-900 whitespace-nowrap">{v.sku}</td>
                            <td className="px-3 py-2.5 text-gray-900">{v.name || "-"}</td>
                            <td className="px-3 py-2.5 text-gray-700">{attrs || "-"}</td>
                            <td className="px-3 py-2.5 text-gray-700 whitespace-nowrap">{v.barcode || "-"}</td>
                            <td className="px-3 py-2.5 text-gray-900 whitespace-nowrap">
                              {typeof v.price === "number" ? `${money(v.price)}đ` : <span className="text-xs text-gray-500">inherit</span>}
                            </td>
                            <td className="px-3 py-2.5 text-gray-700 whitespace-nowrap">{tierCount > 0 ? `${tierCount} Giá Sỉ` : "-"}</td>
                            <td className="px-3 py-2.5 text-gray-900 whitespace-nowrap">
                              {qty === null ? <span className="text-xs text-gray-500">—</span> : qty}
                            </td>
                            <td className="px-3 py-2.5 text-right">
                              <div className="inline-flex gap-2">
                                <button
                                  type="button"
                                  onClick={() => openEditVariant(v)}
                                  className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-200 hover:bg-gray-50 text-sm font-semibold"
                                >
                                  <Pencil className="w-4 h-4" />
                                  Sửa
                                </button>

                                <button
                                  type="button"
                                  onClick={() => openAdjust(v)}
                                  className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-200 hover:bg-gray-50 text-sm font-semibold"
                                  title="Chỉnh tồn kho (branch đang chọn)"
                                  disabled={!variantBranchRaw || variantBranchRaw === "all"}
                                >
                                  <Boxes className="w-4 h-4" />
                                  Tồn
                                </button>

                                <button
                                  type="button"
                                  onClick={() => openTransfer(v)}
                                  className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-200 hover:bg-gray-50 text-sm font-semibold"
                                  title="Chuyển kho giữa 2 chi nhánh"
                                  disabled={branches.length < 2}
                                >
                                  <ArrowRightLeft className="w-4 h-4" />
                                  Chuyển
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          {/* Create Variant Modal */}
          <Modal
            open={variantCreateOpen}
            onCancel={() => setVariantCreateOpen(false)}
            onOk={submitCreateVariant}
            okText={savingVariant ? "Đang lưu..." : "Tạo"}
            cancelText="Đóng"
            confirmLoading={savingVariant}
            title="Thêm Variant"
            width={900}
            destroyOnClose
          >
            <div className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Field label="SKU" required hint="SKU riêng cho variant (VD: KAKI-XANH-S)">
                  <input
                    value={variantCreate.sku}
                    onChange={(e) => setVariantCreate((p: any) => ({ ...p, sku: e.target.value.toUpperCase() }))}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-xl outline-none"
                  />
                </Field>

                <Field label="Tên hiển thị" hint='VD: "Quần Kaki - color:Xanh / size:S"'>
                  <input
                    value={variantCreate.name}
                    onChange={(e) => setVariantCreate((p: any) => ({ ...p, name: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-xl outline-none"
                  />
                </Field>
              </div>

              <Field label="Barcode">
                <div className="flex gap-2">
                  <input
                    value={variantCreate.barcode}
                    onChange={(e) => setVariantCreate((p: any) => ({ ...p, barcode: e.target.value }))}
                    className="flex-1 px-3 py-2.5 border border-gray-300 rounded-xl outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => openScan("variantCreate")}
                    className="px-3 py-2.5 rounded-xl border border-gray-200 hover:bg-gray-50 font-semibold text-sm whitespace-nowrap"
                  >
                    Quét mã
                  </button>
                </div>
              </Field>

              {/* Attributes */}
              <div className="rounded-2xl border border-gray-200 bg-gray-50/50 p-4">
                <div className="font-semibold text-gray-900 mb-2">Attributes</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {(selectedProduct?.options || []).map((o) => {
                    const k = normalizeKey(o.key);
                    return (
                      <Field key={k} label={o.label || k} required>
                        <input
                          value={variantCreate.attributesRecord?.[k] || ""}
                          onChange={(e) => {
                            const next = { ...(variantCreate.attributesRecord || {}) };
                            next[k] = e.target.value;
                            setVariantCreate((p: any) => ({ ...p, attributesRecord: next }));
                          }}
                          className="w-full px-3 py-2.5 border border-gray-300 rounded-xl outline-none"
                          placeholder={(o.values || []).join(" / ") || "Giá trị"}
                        />
                      </Field>
                    );
                  })}
                </div>

                {(!selectedProduct?.options || selectedProduct.options.length === 0) && (
                  <div className="text-sm text-gray-500">
                    Sản phẩm này chưa có options. Bạn vẫn có thể tạo variant thủ công bằng cách tạo options trước rồi generate.
                  </div>
                )}
              </div>

              {/* Overrides */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="rounded-2xl border border-gray-200 p-4">
                  <label className="inline-flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={!!variantCreate.overridePrice}
                      onChange={(e) => setVariantCreate((p: any) => ({ ...p, overridePrice: e.target.checked }))}
                    />
                    <span className="text-sm font-semibold text-gray-800">Override giá bán</span>
                  </label>
                  <div className="mt-2">
                    <MoneyInput
                      value={variantCreate.price}
                      onChange={(v) => setVariantCreate((p: any) => ({ ...p, price: v }))}
                      disabled={!variantCreate.overridePrice}
                      placeholder="Giá bán riêng"
                    />
                    {!variantCreate.overridePrice && <div className="text-xs text-gray-500 mt-1">Tắt override = dùng giá của Product.</div>}
                  </div>
                </div>

                <div className="rounded-2xl border border-gray-200 p-4">
                  <label className="inline-flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={!!variantCreate.overrideCost}
                      onChange={(e) => setVariantCreate((p: any) => ({ ...p, overrideCost: e.target.checked }))}
                    />
                    <span className="text-sm font-semibold text-gray-800">Override giá vốn</span>
                  </label>
                  <div className="mt-2">
                    <MoneyInput
                      value={variantCreate.cost}
                      onChange={(v) => setVariantCreate((p: any) => ({ ...p, cost: v }))}
                      disabled={!variantCreate.overrideCost}
                      placeholder="Giá vốn riêng"
                    />
                    {!variantCreate.overrideCost && <div className="text-xs text-gray-500 mt-1">Tắt override = dùng cost của Product.</div>}
                  </div>
                </div>
              </div>

              <TierPriceEditor
                title="Giá sỉ theo cấp (TierAgency) - VARIANT (override nếu có)"
                tiers={tiers}
                value={variantCreate.priceTierMap}
                onChange={(next) => setVariantCreate((p: any) => ({ ...p, priceTierMap: next }))}
                disabled={savingVariant}
                onReloadTiers={getTiers}
                onOpenBulk={() => openBulk("variantCreate")}
              />

              <label className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={!!variantCreate.isActive}
                  onChange={(e) => setVariantCreate((p: any) => ({ ...p, isActive: e.target.checked }))}
                />
                <span className="text-sm text-gray-700">Đang bán (isActive)</span>
              </label>
            </div>
          </Modal>

          {/* Edit Variant Modal */}
          <Modal
            open={variantEditOpen}
            onCancel={() => setVariantEditOpen(false)}
            onOk={submitEditVariant}
            okText={savingVariant ? "Đang lưu..." : "Lưu"}
            cancelText="Đóng"
            confirmLoading={savingVariant}
            title="Sửa Variant"
            width={900}
            destroyOnClose
          >
            <div className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Field label="SKU" required>
                  <input
                    value={variantEdit.sku}
                    onChange={(e) => setVariantEdit((p: any) => ({ ...p, sku: e.target.value.toUpperCase() }))}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-xl outline-none"
                  />
                </Field>

                <Field label="Tên hiển thị">
                  <input
                    value={variantEdit.name}
                    onChange={(e) => setVariantEdit((p: any) => ({ ...p, name: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-xl outline-none"
                  />
                </Field>
              </div>

              <Field label="Barcode">
                <div className="flex gap-2">
                  <input
                    value={variantEdit.barcode}
                    onChange={(e) => setVariantEdit((p: any) => ({ ...p, barcode: e.target.value }))}
                    className="flex-1 px-3 py-2.5 border border-gray-300 rounded-xl outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => openScan("variantEdit")}
                    className="px-3 py-2.5 rounded-xl border border-gray-200 hover:bg-gray-50 font-semibold text-sm whitespace-nowrap"
                  >
                    Quét mã
                  </button>
                </div>
              </Field>

              {/* Attributes editor */}
              <div className="rounded-2xl border border-gray-200 bg-gray-50/50 p-4">
                <div className="font-semibold text-gray-900 mb-2">Attributes</div>

                {Object.keys(variantEdit.attributesRecord || {}).length === 0 ? (
                  <div className="text-sm text-gray-500">Variant này chưa có attributes. (Bạn vẫn có thể nhập thủ công bằng cách thêm key/value)</div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {Object.keys(variantEdit.attributesRecord || {}).map((k) => (
                      <Field key={k} label={k}>
                        <input
                          value={variantEdit.attributesRecord?.[k] || ""}
                          onChange={(e) => {
                            const next = { ...(variantEdit.attributesRecord || {}) };
                            next[k] = e.target.value;
                            setVariantEdit((p: any) => ({ ...p, attributesRecord: next }));
                          }}
                          className="w-full px-3 py-2.5 border border-gray-300 rounded-xl outline-none"
                        />
                      </Field>
                    ))}
                  </div>
                )}

                <div className="mt-3 flex items-center gap-2">
                  <input
                    placeholder="thêm key (vd: color)"
                    className="flex-1 px-3 py-2.5 border border-gray-300 rounded-xl outline-none"
                    onKeyDown={(e) => {
                      if (e.key !== "Enter") return;
                      e.preventDefault();
                      const key = normalizeKey((e.currentTarget as HTMLInputElement).value);
                      if (!key) return;
                      const next = { ...(variantEdit.attributesRecord || {}) };
                      if (next[key] === undefined) next[key] = "";
                      setVariantEdit((p: any) => ({ ...p, attributesRecord: next }));
                      (e.currentTarget as HTMLInputElement).value = "";
                    }}
                  />
                  <span className="text-xs text-gray-500">Enter để thêm key</span>
                </div>
              </div>

              {/* Overrides */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="rounded-2xl border border-gray-200 p-4">
                  <label className="inline-flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={!!variantEdit.overridePrice}
                      onChange={(e) => setVariantEdit((p: any) => ({ ...p, overridePrice: e.target.checked }))}
                    />
                    <span className="text-sm font-semibold text-gray-800">Override giá bán</span>
                  </label>
                  <div className="mt-2">
                    <MoneyInput
                      value={variantEdit.price}
                      onChange={(v) => setVariantEdit((p: any) => ({ ...p, price: v }))}
                      disabled={!variantEdit.overridePrice}
                      placeholder="Giá bán riêng"
                    />
                    {!variantEdit.overridePrice && <div className="text-xs text-gray-500 mt-1">Tắt override = backend gửi null để unset.</div>}
                  </div>
                </div>

                <div className="rounded-2xl border border-gray-200 p-4">
                  <label className="inline-flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={!!variantEdit.overrideCost}
                      onChange={(e) => setVariantEdit((p: any) => ({ ...p, overrideCost: e.target.checked }))}
                    />
                    <span className="text-sm font-semibold text-gray-800">Override giá vốn</span>
                  </label>
                  <div className="mt-2">
                    <MoneyInput
                      value={variantEdit.cost}
                      onChange={(v) => setVariantEdit((p: any) => ({ ...p, cost: v }))}
                      disabled={!variantEdit.overrideCost}
                      placeholder="Giá vốn riêng"
                    />
                    {!variantEdit.overrideCost && <div className="text-xs text-gray-500 mt-1">Tắt override = backend gửi null để unset.</div>}
                  </div>
                </div>
              </div>

              <TierPriceEditor
                title="Giá sỉ theo cấp (TierAgency) - VARIANT (override nếu có)"
                tiers={tiers}
                value={variantEdit.priceTierMap}
                onChange={(next) => setVariantEdit((p: any) => ({ ...p, priceTierMap: next }))}
                disabled={savingVariant}
                onReloadTiers={getTiers}
                onOpenBulk={() => openBulk("variantEdit")}
              />

              <label className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={!!variantEdit.isActive}
                  onChange={(e) => setVariantEdit((p: any) => ({ ...p, isActive: e.target.checked }))}
                />
                <span className="text-sm text-gray-700">Đang bán (isActive)</span>
              </label>
            </div>
          </Modal>

          {/* Adjust Stock Modal */}
          <Modal
            open={adjustOpen}
            onCancel={() => setAdjustOpen(false)}
            onOk={submitAdjust}
            okText="Lưu"
            cancelText="Đóng"
            title={`Chỉnh tồn kho (branch=${variantBranchRaw})`}
            destroyOnClose
          >
            <div className="space-y-3">
              <div className="text-sm text-gray-700">
                Variant: <b>{stockTargetVariant?.sku}</b>
              </div>

              <Field label="Thao tác">
                <select
                  value={adjustForm.op}
                  onChange={(e) => setAdjustForm((p) => ({ ...p, op: e.target.value as any }))}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-xl outline-none"
                >
                  <option value="IN">IN (Nhập)</option>
                  <option value="OUT">OUT (Xuất)</option>
                  <option value="SET">SET (Đặt =)</option>
                </select>
              </Field>

              <Field label="Số lượng">
                <input
                  value={adjustForm.qty}
                  onChange={(e) => setAdjustForm((p) => ({ ...p, qty: e.target.value.replace(/[^\d]/g, "") }))}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-xl outline-none"
                  inputMode="numeric"
                  placeholder="0"
                />
              </Field>

              <Field label="Ghi chú">
                <input
                  value={adjustForm.note}
                  onChange={(e) => setAdjustForm((p) => ({ ...p, note: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-xl outline-none"
                  placeholder="VD: nhập hàng"
                />
              </Field>
            </div>
          </Modal>

          {/* Transfer Stock Modal */}
          <Modal
            open={transferOpen}
            onCancel={() => setTransferOpen(false)}
            onOk={submitTransfer}
            okText="Chuyển"
            cancelText="Đóng"
            title="Chuyển kho Variant"
            destroyOnClose
          >
            <div className="space-y-3">
              <div className="text-sm text-gray-700">
                Variant: <b>{stockTargetVariant?.sku}</b>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Field label="Từ chi nhánh" required hint="Gõ để tìm">
                  <AutoComplete
                    className="w-full"
                    options={branchOptions.filter((x) => x.value !== "all")}
                    filterOption={acFilter}
                    value={transferForm.fromBranchId || undefined}
                    onChange={(val) => setTransferForm((p) => ({ ...p, fromBranchId: String(val || "") }))}
                    onSelect={(val) => setTransferForm((p) => ({ ...p, fromBranchId: String(val || "") }))}
                    allowClear
                    placeholder="Chọn chi nhánh nguồn..."
                  />
                </Field>

                <Field label="Đến chi nhánh" required hint="Gõ để tìm">
                  <AutoComplete
                    className="w-full"
                    options={branchOptions.filter((x) => x.value !== "all")}
                    filterOption={acFilter}
                    value={transferForm.toBranchId || undefined}
                    onChange={(val) => setTransferForm((p) => ({ ...p, toBranchId: String(val || "") }))}
                    onSelect={(val) => setTransferForm((p) => ({ ...p, toBranchId: String(val || "") }))}
                    allowClear
                    placeholder="Chọn chi nhánh đích..."
                  />
                </Field>
              </div>

              <Field label="Số lượng chuyển" required>
                <input
                  value={transferForm.qty}
                  onChange={(e) => setTransferForm((p) => ({ ...p, qty: e.target.value.replace(/[^\d]/g, "") }))}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-xl outline-none"
                  inputMode="numeric"
                  placeholder="1"
                />
              </Field>

              <Field label="Ghi chú">
                <input
                  value={transferForm.note}
                  onChange={(e) => setTransferForm((p) => ({ ...p, note: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-xl outline-none"
                  placeholder="VD: chuyển hàng sang chi nhánh 2"
                />
              </Field>

              <div className="text-xs text-gray-500">
                <ArrowRightLeft className="w-4 h-4 inline-block mr-1" />
                Backend sẽ tự “chuyển tối đa” nếu chi nhánh nguồn thiếu tồn.
              </div>
            </div>
          </Modal>
        </div>
      )}
    </div>
  );
};

export default ProductInputSection;
