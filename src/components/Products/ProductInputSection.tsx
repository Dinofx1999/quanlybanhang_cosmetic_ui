// src/components/Products/ProductInputSection.tsx
import React, { useEffect, useMemo, useState } from "react";
import { Package, Tag, Plus, RefreshCw, Image as ImageIcon, X, Pencil, BadgePercent } from "lucide-react";
import api from "../../services/api";
import { message, Modal } from "antd";

// ===============================
// Types
// ===============================
type ProductImage = {
  url: string;
  isPrimary?: boolean;
  order?: number;
};

type PriceTierRow = {
  tierId: string; // ObjectId (TierAgency)
  price: number;
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

// ===============================
// Utils
// ===============================
const money = (n: any) => Number(n || 0).toLocaleString("vi-VN");

// "160.000 đ" input helpers
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

// map {tierId: "120000"} -> [{tierId, price}]
function normalizePriceTierFromMap(priceTierMap: Record<string, string>) {
  return Object.entries(priceTierMap || {})
    .map(([tierId, v]) => ({
      tierId,
      price: parseVndInputToNumber(v),
    }))
    .filter((x) => x.tierId && Number.isFinite(x.price) && x.price >= 0);
}

function mapFromPriceTier(arr?: PriceTierRow[]) {
  const out: Record<string, string> = {};
  (Array.isArray(arr) ? arr : []).forEach((x: any) => {
    const id = String(x?.tierId?._id || x?.tierId || "");
    if (!id) return;
    out[id] = formatVndInput(String(x?.price ?? 0));
  });
  return out;
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

// ===============================
// API helpers
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
    // ✅ new
    price_tier: normalizePriceTierFromMap(data.priceTierMap || {}),
  });
  return res.data;
};

const updateProduct = async (id: string, data: any) => {
  const res = await api.put(`/products/${id}`, {
    sku: String(data.sku || "").trim().toUpperCase(),
    name: String(data.name || "").trim(),
    price: parseVndInputToNumber(data.price),
    cost: data.cost !== undefined && data.cost !== "" ? parseVndInputToNumber(data.cost) : 0,
    categoryId: data.categoryId || null,
    categoryName: String(data.categoryName || "").trim(),
    brand: String(data.brand || "").trim(),
    barcode: String(data.barcode || "").trim(),
    isActive: data.isActive === undefined ? true : Boolean(data.isActive),
    // ✅ new
    price_tier: normalizePriceTierFromMap(data.priceTierMap || {}),
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
  // router của bạn đang dùng PUT, nên dùng PUT cho đúng
  const res = await api.put(`/products/${productId}/images/primary`, { url });
  return res.data;
};

// Delete ảnh theo URL
const deleteProductImageByUrl = async (productId: string, url: string) => {
  const res = await api.delete(`/products/${productId}/images`, { data: { url } });
  return res.data;
};

// ===============================
// Small UI helpers (stable components)
// ===============================
const Field = React.memo(function Field(props: {
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">
        {props.label} {props.required ? <span className="text-pink-600">*</span> : null}
      </label>
      {props.children}
      {props.hint ? <div className="text-xs text-gray-500 mt-1">{props.hint}</div> : null}
    </div>
  );
});

const MoneyInput = React.memo(function MoneyInput(props: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  disabled?: boolean;
  min?: number;
}) {
  return (
    <input
      inputMode="numeric"
      value={props.value}
      onChange={(e) => props.onChange(formatVndInput(e.target.value))}
      className="w-full px-3 py-2.5 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-pink-400 focus:border-transparent"
      placeholder={props.placeholder || "0 đ"}
      disabled={props.disabled}
    />
  );
});

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

  const [mode, setMode] = useState<"SET_ALL" | "DELTA_PLUS" | "DELTA_MINUS" | "PERCENT_PLUS" | "PERCENT_MINUS">("SET_ALL");
  const [amount, setAmount] = useState<string>("");

  useEffect(() => {
    if (!open) {
      setMode("SET_ALL");
      setAmount("");
    }
  }, [open]);

  const apply = () => {
    const next = { ...(value || {}) };
    const amtNum = parseVndInputToNumber(amount);

    const getBase = (id: string) => parseVndInputToNumber(next[id] || "");

    tiers.forEach((t) => {
      const id = String(t._id);
      const base = getBase(id);

      let out = base;
      switch (mode) {
        case "SET_ALL":
          out = amtNum;
          break;
        case "DELTA_PLUS":
          out = base + amtNum;
          break;
        case "DELTA_MINUS":
          out = Math.max(0, base - amtNum);
          break;
        case "PERCENT_PLUS":
          out = Math.round(base * (1 + amtNum / 100));
          break;
        case "PERCENT_MINUS":
          out = Math.round(base * (1 - amtNum / 100));
          if (out < 0) out = 0;
          break;
      }

      // nếu set = 0 thì vẫn cho phép (tuỳ bạn), ở đây vẫn set
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
          <MoneyInput
            value={amount}
            onChange={(v) => setAmount(v)}
            placeholder={mode.includes("PERCENT") ? "Ví dụ 10" : "Ví dụ 150.000 đ"}
          />
          {mode.includes("PERCENT") ? (
            <div className="text-xs text-gray-500 mt-1">Nhập số %, ví dụ: 10 = 10%.</div>
          ) : null}
        </div>

        <div className="text-xs text-gray-500">
          Lưu ý: Sẽ ghi đè toàn bộ giá sỉ theo tier trong form hiện tại.
        </div>
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

  const [activeTab, setActiveTab] = useState<"product" | "category">("product");

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
  const [bulkTarget, setBulkTarget] = useState<"create" | "edit">("create");

  const openBulk = (target: "create" | "edit") => {
    setBulkTarget(target);
    setBulkOpen(true);
  };

  const applyBulk = (next: Record<string, string>) => {
    if (bulkTarget === "create") {
      setProductForm((prev: any) => ({ ...prev, priceTierMap: next }));
    } else {
      setEditProduct((prev: any) => ({ ...prev, priceTierMap: next }));
    }
    toast.success("Đã áp dụng đồng bộ giá sỉ");
  };

  // ===============================
  // ✅ Barcode Scan state (kept simple)
  // ===============================
  const [scanOpen, setScanOpen] = useState(false);
  const [scanTarget, setScanTarget] = useState<"create" | "edit">("create");
  const [scanError, setScanError] = useState<string>("");
  const [scanning, setScanning] = useState(false);

  const openScan = (target: "create" | "edit") => {
    setScanTarget(target);
    setScanError("");
    setScanOpen(true);
  };

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
  const editImagePreviews = useMemo(() => editImageFiles.map((f) => ({ name: f.name, url: URL.createObjectURL(f) })), [editImageFiles]);

  useEffect(() => {
    return () => editImagePreviews.forEach((p) => URL.revokeObjectURL(p.url));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editImageFiles]);

  // ===============================
  // Fetch
  // ===============================
  const getCategories = async () => {
    const res = await api.get("/categories");
    setCategories((res.data.items || []) as CategoryItem[]);
  };

  const getTiers = async () => {
    const endpoints = ["/tier-agencies", "/tierAgencies"];
    for (const ep of endpoints) {
      try {
        const res = await api.get(ep);
        const items = (res.data.items || res.data.tiers || res.data.data || []) as TierAgencyItem[];
        if (Array.isArray(items)) {
          setTiers(items.filter((t) => t?.isActive !== false));
          return;
        }
      } catch {}
    }
    setTiers([]);
  };

  const getProducts = async () => {
    setLoadingProducts(true);
    try {
      const res = await api.get("/products");
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

  useEffect(() => {
    getCategories().catch(console.error);
    getTiers().catch(console.error);
  }, []);

  useEffect(() => {
    if (activeTab !== "product") return;
    getProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  // ===============================
  // Barcode Scanner Modal (kept here but stable enough; if bạn vẫn bị blur, mình sẽ tách riêng nốt)
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
      else setEditProduct((prev: any) => ({ ...prev, barcode: value }));

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
        value={bulkTarget === "create" ? productForm.priceTierMap : editProduct.priceTierMap}
        onApply={applyBulk}
      />

      {/* Header */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5">
        <h2 className="text-xl font-bold text-gray-900">Quản Lý Sản Phẩm</h2>
        <p className="text-sm text-gray-600 mt-1">Thêm / sửa sản phẩm, danh mục và giá sỉ theo tier</p>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-2xl border border-gray-200 p-2">
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
        </div>
      </div>

      {/* ===============================
          Product
      =============================== */}
      {activeTab === "product" && (
        <div className="space-y-4">
          {/* Create Form */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="text-lg font-bold text-gray-900">Thêm sản phẩm</div>
                <div className="text-sm text-gray-500">Nhập thông tin + giá sỉ theo tier</div>
              </div>
            </div>

            <form onSubmit={handleProductSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="SKU" required hint="VD: SON-DO-002">
                  <input
                    type="text"
                    value={productForm.sku}
                    onChange={(e) => setProductForm({ ...productForm, sku: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-pink-400 focus:border-transparent"
                    placeholder="SON-DO-002"
                    required
                  />
                </Field>

                <Field label="Tên sản phẩm" required>
                  <input
                    type="text"
                    value={productForm.name}
                    onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-pink-400 focus:border-transparent"
                    placeholder="VD: Son Hồng Cánh Sen"
                    required
                  />
                </Field>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Field label="Danh mục" required>
                  <select
                    value={productForm.categoryId}
                    onChange={(e) => {
                      const id = e.target.value;
                      const cat = categories.find((x) => String(x._id) === String(id));
                      setProductForm({ ...productForm, categoryId: id, categoryName: cat?.name || "" });
                    }}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-pink-400 focus:border-transparent"
                    required
                  >
                    <option value="">-- Chọn danh mục --</option>
                    {categories?.map((cat) => (
                      <option key={cat._id} value={cat._id}>
                        {cat.code} - {cat.name}
                      </option>
                    ))}
                  </select>
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
                    placeholder="VD: 3CE"
                  />
                </Field>
              </div>

              <TierPriceEditor
                title="Giá sỉ theo cấp (TierAgency)"
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

              {/* Images picker */}
              <div className="border-t pt-4">
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
          </div>

          {/* Products List */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <div className="flex items-center justify-between gap-3 mb-4">
              <h3 className="font-bold text-gray-900">Danh Sách Sản Phẩm ({products.length})</h3>

              <button
                type="button"
                onClick={getProducts}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-200 hover:bg-gray-50 text-sm font-semibold"
              >
                <RefreshCw className={`w-4 h-4 ${loadingProducts ? "animate-spin" : ""}`} />
                Tải lại
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left bg-gray-50 border-y border-gray-200">
                    <th className="px-3 py-2.5 font-semibold text-gray-700">Ảnh</th>
                    <th className="px-3 py-2.5 font-semibold text-gray-700">SKU</th>
                    <th className="px-3 py-2.5 font-semibold text-gray-700">Tên</th>
                    <th className="px-3 py-2.5 font-semibold text-gray-700">Danh mục</th>
                    <th className="px-3 py-2.5 font-semibold text-gray-700">Giá</th>
                    <th className="px-3 py-2.5 font-semibold text-gray-700">Giá sỉ</th>
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
                      const tierCount = Array.isArray((p as any).price_tier) ? (p as any).price_tier.length : 0;
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
                          <td className="px-3 py-2.5 text-gray-700 whitespace-nowrap">{tierCount > 0 ? `${tierCount} tier` : "-"}</td>
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
            width={800}
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
                <Field label="Danh mục">
                  <select
                    value={editProduct.categoryId}
                    onChange={(e) => {
                      const id = e.target.value;
                      const cat = categories.find((x) => String(x._id) === String(id));
                      setEditProduct({ ...editProduct, categoryId: id, categoryName: cat?.name || "" });
                    }}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-xl outline-none"
                  >
                    <option value="">-- Chọn --</option>
                    {categories?.map((cat) => (
                      <option key={cat._id} value={cat._id}>
                        {cat.code} - {cat.name}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Giá" required>
                  <MoneyInput value={editProduct.price} onChange={(v) => setEditProduct({ ...editProduct, price: v })} />
                </Field>

                <Field label="Giá vốn">
                  <MoneyInput value={editProduct.cost} onChange={(v) => setEditProduct({ ...editProduct, cost: v })} />
                </Field>
              </div>

              {/* ✅ Giá sỉ theo TierAgency (EDIT) */}
              <TierPriceEditor
                title="Giá sỉ theo cấp (TierAgency)"
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

              {/* EDIT IMAGES */}
              <div className="mt-4 border-t pt-4">
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
        </div>
      )}

      {/* ===============================
          Category
      =============================== */}
      {activeTab === "category" && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <div className="text-lg font-bold text-gray-900 mb-4">Thêm danh mục</div>

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
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <h3 className="font-bold text-gray-900 mb-4">Danh Sách ({categories.length})</h3>

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
          </div>

          {/* Edit Category */}
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
        </div>
      )}
    </div>
  );
};

export default ProductInputSection;
