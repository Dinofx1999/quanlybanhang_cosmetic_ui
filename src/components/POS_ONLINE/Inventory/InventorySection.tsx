import React from "react";
import axios from "axios";
import {
  Package,
  AlertTriangle,
  TrendingUp,
  Plus,
  CheckCircle2,
  ClipboardList,
  ListChecks,
  Search,
  RefreshCw,
  X,
  ArrowUpDown,
} from "lucide-react";

import api from "../../../services/api"; // (3000) dùng create/confirm nếu bạn đang để baseURL 3000
import { getCurrentUser } from "../../../services/authService";
import { getEffectiveBranchId, getActiveBranchRaw } from "../../../services/branchContext";

// ===============================
// CONFIG (9009 endpoints for listing/detail)
// ===============================
const api9009 = axios.create({
  baseURL: process.env.REACT_APP_API_URL || "http://localhost:9009/api",
});

// Nếu API 9009 cần Bearer token, mở đoạn này:
api9009.interceptors.request.use((config) => {
  const token = localStorage.getItem("token"); // đổi key đúng của bạn nếu khác
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ===============================
// Types
// ===============================
interface ProductImage {
  url: string;
  isPrimary?: boolean;
  order?: number;
}

export interface Product {
  _id: string;
  sku?: string;
  name: string;
  categoryId?: string | null;
  categoryName: string;
  price: number;
  cost?: number;
  brand?: string;
  barcode: string;
  stock: number;
  thumbnail?: string;
  images?: ProductImage[];
  isActive?: boolean;
}

type TabKey = "stock" | "inbound" | "inbound_list";

type InboundItem = {
  productId: string;
  sku?: string;
  name?: string;
  qty: number;
  cost: number;
  total?: number;
};

type InboundListItem = {
  _id: string;
  code: string;
  branchId: string;
  supplier: string;
  note: string;
  status: string; // DRAFT | CONFIRMED
  subtotal: number;
  items: InboundItem[];
  createdAt?: string;
  updatedAt?: string;
  confirmedAt?: string | null;
};

type InboundDetail = InboundListItem;

// ===============================
// Helpers
// ===============================
const money = (n: any) => Number(n || 0).toLocaleString("vi-VN");

const getPrimaryImage = (p: Product): string | undefined => {
  if (p.thumbnail) return p.thumbnail;
  const primary = p.images?.find((x) => x.isPrimary)?.url;
  if (primary) return primary;
  return p.images?.[0]?.url;
};

const fmtDateTime = (iso?: string | null) => {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleString("vi-VN");
};

const sumQty = (items?: Array<{ qty: number }>) => (items || []).reduce((s, it) => s + Number(it.qty || 0), 0);

const statusBadge = (status?: string) => {
  const s = String(status || "").toUpperCase();
  if (s === "CONFIRMED") return { bg: "bg-green-50", text: "text-green-700", label: "Đã xác nhận" };
  if (s === "DRAFT") return { bg: "bg-yellow-50", text: "text-yellow-700", label: "Nháp" };
  return { bg: "bg-gray-100", text: "text-gray-700", label: s || "-" };
};

// ✅ sort helpers
type ProductSortKey = "name" | "categoryName" | "barcode" | "price" | "stock";
type SortDir = "asc" | "desc";
const cmp = (a: any, b: any) => {
  if (a == null && b == null) return 0;
  if (a == null) return -1;
  if (b == null) return 1;
  if (typeof a === "number" && typeof b === "number") return a - b;
  return String(a).localeCompare(String(b), "vi");
};

// ===============================
// Component
// ===============================
const InventorySection: React.FC = () => {
  const [tab, setTab] = React.useState<TabKey>("stock");

  // ===============================
  // Branch
  // ===============================
  const user = getCurrentUser();
  const branchId = getEffectiveBranchId(user); // string | null (null = all)
  const branchRaw = getActiveBranchRaw(user); // "all" | "<id>" | "<staff id>"

  const canCreateInbound = !!branchId; // admin must choose a specific branch (not all)

  // ===============================
  // PRODUCTS (✅ self fetch - no props)
  // ===============================
  const [products, setProducts] = React.useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = React.useState(false);
  const [productsError, setProductsError] = React.useState<string>("");

  // ✅ Search + Sort
  const [pSearch, setPSearch] = React.useState("");
  const [sortKey, setSortKey] = React.useState<ProductSortKey>("stock");
  const [sortDir, setSortDir] = React.useState<SortDir>("asc");

  const toggleSort = (k: ProductSortKey) => {
    if (sortKey === k) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(k);
      setSortDir("asc");
    }
  };

  const fetchProducts = React.useCallback(async () => {
    setProductsError("");
    setProductsLoading(true);
    try {
      const params: any = {};
      if (branchId) params.branchId = branchId; // staff or admin selected
      // branchId null => all -> do not send param

      const res = await api.get("/products", { params });

      const items = res.data?.items || [];
      const mapped: Product[] = items.map((p: any) => ({
        _id: String(p._id),
        sku: p.sku || "",
        name: p.name || "",
        categoryId: p.categoryId ? String(p.categoryId) : null,
        categoryName: p.categoryName || "",
        price: Number(p.price || 0),
        cost: Number(p.cost || 0),
        brand: p.brand || "",
        barcode: p.barcode || "",
        stock: Number(p.stock || 0),
        thumbnail: p.thumbnail || "",
        images: Array.isArray(p.images) ? p.images : [],
        isActive: p.isActive !== false,
      }));

      setProducts(mapped);
    } catch (e: any) {
      setProducts([]);
      setProductsError(e?.response?.data?.message || e?.message || "Lỗi tải sản phẩm.");
    } finally {
      setProductsLoading(false);
    }
  }, [branchId]);

  // load products when tab stock OR inbound (vì inbound cần danh sách sản phẩm)
  React.useEffect(() => {
    if (tab !== "stock" && tab !== "inbound") return;
    fetchProducts();
  }, [tab, fetchProducts]);

  // reload products when branch changed
  React.useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  React.useEffect(() => {
    const onBranchChanged = () => fetchProducts();
    window.addEventListener("branch_changed", onBranchChanged);
    return () => window.removeEventListener("branch_changed", onBranchChanged);
  }, [fetchProducts]);

  // ===============================
  // Stock stats
  // ===============================
  // ✅ rule mới: 0<stock<10 sắp hết; stock==0 hết hàng; stock<0 âm kho
  const lowStockProducts = React.useMemo(
    () => products.filter((p) => {
      const s = Number(p.stock || 0);
      return s > 0 && s < 10;
    }),
    [products]
  );

  const totalValue = React.useMemo(
    () => products.reduce((sum, p) => sum + Number(p.price || 0) * Number(p.stock || 0), 0),
    [products]
  );
  const totalItems = React.useMemo(() => products.reduce((sum, p) => sum + Number(p.stock || 0), 0), [products]);

  const getStockStatus = (stock: number) => {
    const s = Number(stock || 0);

    // ✅ Âm kho
    if (s < 0) return { color: "text-purple-700", bg: "bg-purple-50", label: "Âm kho", icon: "🟣" };

    // ✅ Hết hàng
    if (s === 0) return { color: "text-red-700", bg: "bg-red-50", label: "Hết hàng", icon: "🔴" };

    // ✅ Sắp hết: 0 < tồn < 10
    if (s > 0 && s < 10) return { color: "text-yellow-700", bg: "bg-yellow-50", label: "Sắp hết", icon: "🟡" };

    // ✅ Tốt
    return { color: "text-green-700", bg: "bg-green-50", label: "Tốt", icon: "🟢" };
  };

  // ✅ filter + sort products for stock tab
  const shownProducts = React.useMemo(() => {
    const q = pSearch.trim().toLowerCase();
    let arr = products;

    if (q) {
      arr = arr.filter((p) => {
        const text = [
          p.name,
          p.sku,
          p.barcode,
          p.categoryName,
          p.brand,
          p._id,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return text.includes(q);
      });
    }

    const getV = (p: Product) => {
      switch (sortKey) {
        case "name":
          return p.name || "";
        case "categoryName":
          return p.categoryName || "";
        case "barcode":
          return p.barcode || "";
        case "price":
          return Number(p.price || 0);
        case "stock":
          return Number(p.stock || 0);
        default:
          return "";
      }
    };

    const sorted = [...arr].sort((a, b) => {
      const c = cmp(getV(a), getV(b));
      return sortDir === "asc" ? c : -c;
    });

    return sorted;
  }, [products, pSearch, sortKey, sortDir]);

  // ===============================
  // Inbound form (Create + Confirm)
  // ===============================
  const [supplier, setSupplier] = React.useState<string>("NPP A");
  const [note, setNote] = React.useState<string>("Nhập hàng");
  const [items, setItems] = React.useState<Array<{ productId: string; qty: number; cost: number }>>([
    { productId: "", qty: 1, cost: 0 },
  ]);

  const [creating, setCreating] = React.useState(false);
  const [createdInboundId, setCreatedInboundId] = React.useState<string>("");
  const [confirming, setConfirming] = React.useState(false);
  const [toast, setToast] = React.useState<{ type: "ok" | "err"; text: string } | null>(null);

  const addRow = () => setItems((prev) => [...prev, { productId: "", qty: 1, cost: 0 }]);
  const removeRow = (idx: number) => setItems((prev) => prev.filter((_, i) => i !== idx));
  const updateRow = (idx: number, patch: Partial<{ productId: string; qty: number; cost: number }>) => {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  };

  const triggerToast = (type: "ok" | "err", text: string) => setToast({ type, text });

  const triggerReloadList = () => setReloadNonce((n) => n + 1);

  const createInbound = async () => {
    setToast(null);

    if (!canCreateInbound) {
      triggerToast("err", "ADMIN/MANAGER: hãy chọn 1 chi nhánh cụ thể (không chọn 'Tất cả').");
      return;
    }

    const cleanItems = items
      .map((it) => ({
        productId: String(it.productId || "").trim(),
        qty: Number(it.qty || 0),
        cost: Number(it.cost || 0),
      }))
      .filter((it) => it.productId && it.qty > 0);

    if (!String(supplier || "").trim()) return triggerToast("err", "Thiếu supplier.");
    if (cleanItems.length === 0) return triggerToast("err", "Chưa có item hợp lệ.");

    setCreating(true);
    try {
      const body = { branchId, supplier: supplier.trim(), note: note.trim(), items: cleanItems };
      const res = await api.post("/inbounds", body);

      const id =
        res.data?._id ||
        res.data?.id ||
        res.data?.receipt?._id ||
        res.data?.receiptId ||
        res.data?.inboundId ||
        "";

      if (!id) {
        triggerToast("ok", "Tạo phiếu thành công (nhưng response không trả id). Hãy vào tab Quản lý phiếu nhập để xem.");
      } else {
        setCreatedInboundId(String(id));
        triggerToast("ok", "Tạo phiếu nhập kho thành công.");
      }

      setTab("inbound_list");
      triggerReloadList();
    } catch (e: any) {
      triggerToast("err", e?.response?.data?.message || e?.message || "Lỗi tạo phiếu.");
    } finally {
      setCreating(false);
    }
  };

  const [reloadNonce, setReloadNonce] = React.useState(0);

  const [detailOpen, setDetailOpen] = React.useState(false);
  const [selectedInboundId, setSelectedInboundId] = React.useState("");
  const [detailLoading, setDetailLoading] = React.useState(false);
  const [detail, setDetail] = React.useState<InboundDetail | null>(null);
  const [detailErr, setDetailErr] = React.useState("");

  const fetchInboundDetail = async (id: string) => {
    setDetailErr("");
    setDetailLoading(true);
    try {
      const res = await api9009.get(`/inbounds/${id}`);

      // ✅ response: { ok: true, receipt: {...} }
      const r = res.data?.receipt;
      if (!r) throw new Error("Không có receipt trong response.");

      const mapped: InboundDetail = {
        _id: String(r._id),
        code: String(r.code || r._id?.slice(-6) || ""),
        branchId: String(r.branchId || ""),
        supplier: String(r.supplier || ""),
        note: String(r.note || ""),
        status: String(r.status || ""),
        subtotal: Number(r.subtotal || 0),
        items: (r.items || []).map((it: any) => ({
          productId: String(it.productId),
          sku: it.sku,
          name: it.name,
          qty: Number(it.qty || 0),
          cost: Number(it.cost || 0),
          total: Number(it.total || 0),
        })),
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
        confirmedAt: r.confirmedAt,
      };

      setDetail(mapped);
    } catch (e: any) {
      setDetail(null);
      setDetailErr(e?.response?.data?.message || e?.message || "Lỗi tải chi tiết phiếu.");
    } finally {
      setDetailLoading(false);
    }
  };

  const confirmInbound = async (id: string) => {
    setToast(null);
    const inboundId = String(id || "").trim();
    if (!inboundId) return triggerToast("err", "Thiếu inboundId.");

    setConfirming(true);
    try {
      await api.post(`/inbounds/${inboundId}/confirm`, {});
      triggerToast("ok", "✅ Xác nhận phiếu thành công.");

      triggerReloadList();
      if (detailOpen && selectedInboundId === inboundId) await fetchInboundDetail(inboundId);

      // ✅ sau confirm: reload products để tồn cập nhật
      await fetchProducts();
    } catch (e: any) {
      triggerToast("err", e?.response?.data?.message || e?.message || "Lỗi xác nhận phiếu.");
    } finally {
      setConfirming(false);
    }
  };

  // ===============================
  // Inbounds list (manage all)
  // ===============================
  const [listLoading, setListLoading] = React.useState(false);
  const [listError, setListError] = React.useState<string>("");
  const [inbounds, setInbounds] = React.useState<InboundListItem[]>([]);
  const [page, setPage] = React.useState(1);
  const [limit] = React.useState(50);
  const [totalPages, setTotalPages] = React.useState(1);

  const [q, setQ] = React.useState("");

  const fetchInbounds = React.useCallback(async () => {
    setListError("");
    setListLoading(true);
    try {
      const params: any = { page, limit };
      if (branchId) params.branchId = branchId;
      if (q.trim()) params.q = q.trim();

      const res = await api9009.get("/inbounds", { params });
      const items = (res.data?.items || []) as any[];

      const mapped: InboundListItem[] = items.map((x) => ({
        _id: String(x._id),
        code: String(x.code || x._id?.slice(-6) || ""),
        branchId: String(x.branchId || ""),
        supplier: String(x.supplier || ""),
        note: String(x.note || ""),
        status: String(x.status || ""),
        subtotal: Number(x.subtotal || 0),
        items: (x.items || []).map((it: any) => ({
          productId: String(it.productId),
          sku: it.sku,
          name: it.name,
          qty: Number(it.qty || 0),
          cost: Number(it.cost || 0),
          total: Number(it.total || 0),
        })),
        createdAt: x.createdAt,
        updatedAt: x.updatedAt,
        confirmedAt: x.confirmedAt,
      }));

      setInbounds(mapped);
      setTotalPages(Number(res.data?.totalPages || 1));
    } catch (e: any) {
      setInbounds([]);
      setTotalPages(1);
      setListError(e?.response?.data?.message || e?.message || "Lỗi tải danh sách phiếu.");
    } finally {
      setListLoading(false);
    }
  }, [page, limit, branchId, q]);

  React.useEffect(() => {
    if (tab !== "inbound_list") return;
    fetchInbounds();
  }, [tab, fetchInbounds, reloadNonce]);

  React.useEffect(() => {
    setPage(1);
    if (tab === "inbound_list") triggerReloadList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branchId]);

  // ===============================
  // Inbound detail modal
  // ===============================
  const openDetail = async (id: string) => {
    setDetailOpen(true);
    setSelectedInboundId(id);
    await fetchInboundDetail(id);
  };

  const closeDetail = () => {
    setDetailOpen(false);
    setSelectedInboundId("");
    setDetail(null);
    setDetailErr("");
  };

  // ===============================
  // UI
  // ===============================
  const StockSortHeader: React.FC<{ k: ProductSortKey; label: string; align?: string }> = ({ k, label, align }) => (
    <button
      type="button"
      onClick={() => toggleSort(k)}
      className={`inline-flex items-center gap-1 hover:text-gray-900 ${align || ""}`}
      title="Sắp xếp"
    >
      {label}
      <ArrowUpDown className="w-4 h-4 opacity-70" />
    </button>
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-gray-800">Kiểm Tra Kho</h2>
        <p className="text-sm text-gray-600 mt-1">
          Theo dõi tồn kho, tạo phiếu nhập và quản lý lịch sử.{" "}
          <span className="font-semibold">
            Chi nhánh: {branchId ? branchId : branchRaw === "all" ? "Tất cả" : String(branchRaw || "all")}
          </span>
        </p>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg border border-gray-200 p-2">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <button
            onClick={() => setTab("stock")}
            className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-all ${
              tab === "stock" ? "bg-pink-500 text-white" : "text-gray-600 hover:bg-gray-50"
            }`}
          >
            <Package className="w-5 h-5" />
            Tồn Kho
          </button>

          <button
            onClick={() => setTab("inbound")}
            className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-all ${
              tab === "inbound" ? "bg-pink-500 text-white" : "text-gray-600 hover:bg-gray-50"
            }`}
          >
            <ClipboardList className="w-5 h-5" />
            Nhập Kho (Tạo Phiếu)
          </button>

          <button
            onClick={() => setTab("inbound_list")}
            className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-all ${
              tab === "inbound_list" ? "bg-pink-500 text-white" : "text-gray-600 hover:bg-gray-50"
            }`}
          >
            <ListChecks className="w-5 h-5" />
            Quản Lý Phiếu Nhập
          </button>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div
          className={`rounded-lg border p-4 ${
            toast.type === "ok" ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"
          }`}
        >
          <div className="flex items-start gap-2">
            {toast.type === "ok" ? (
              <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
            )}
            <div className="text-sm text-gray-800">{toast.text}</div>
          </div>
        </div>
      )}

      {/* TAB: STOCK */}
      {tab === "stock" && (
        <>
          {/* Toolbar + Search */}
          <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-3">
            <div className="flex flex-col md:flex-row md:items-center gap-3">
              <div className="text-sm text-gray-600 flex-1">
                {productsLoading ? "Đang tải sản phẩm..." : `Sản phẩm: ${shownProducts.length}/${products.length}`}
              </div>

              <button
                type="button"
                onClick={fetchProducts}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 font-semibold"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh tồn kho
              </button>
            </div>

            {/* ✅ Search products */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                value={pSearch}
                onChange={(e) => setPSearch(e.target.value)}
                placeholder="Tìm sản phẩm: tên / SKU / barcode / danh mục / brand..."
                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg outline-none"
              />
            </div>

            {productsError && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
                {productsError}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-blue-50 rounded-lg">
                  <Package className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-800">{shownProducts.length}</div>
                  <div className="text-sm text-gray-600">Loại SP (đang hiển thị)</div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-green-50 rounded-lg">
                  <TrendingUp className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-800">{totalItems}</div>
                  <div className="text-sm text-gray-600">Tổng SL</div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-yellow-50 rounded-lg">
                  <AlertTriangle className="w-6 h-6 text-yellow-700" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-800">{lowStockProducts.length}</div>
                  <div className="text-sm text-gray-600">Sắp hết (1-9)</div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-pink-50 rounded-lg">
                  <span className="text-pink-600 font-bold">₫</span>
                </div>
                <div>
                  <div className="text-lg font-bold text-gray-800">{money(totalValue)}đ</div>
                  <div className="text-sm text-gray-600">Giá trị kho</div>
                </div>
              </div>
            </div>
          </div>

          {lowStockProducts.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-yellow-700 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-gray-800 mb-1">Cảnh báo sắp hết</h3>
                  <p className="text-sm text-gray-700">{lowStockProducts.length} sản phẩm tồn 1-9 cần nhập thêm</p>
                </div>
              </div>
            </div>
          )}

          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                      <StockSortHeader k="name" label="Sản phẩm" />
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                      <StockSortHeader k="categoryName" label="Danh mục" />
                    </th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">
                      <StockSortHeader k="barcode" label="Barcode" />
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">
                      <StockSortHeader k="price" label="Giá" />
                    </th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">
                      <StockSortHeader k="stock" label="Tồn" />
                    </th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Trạng thái</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-200">
                  {productsLoading ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-10 text-center text-gray-500">
                        Đang tải danh sách...
                      </td>
                    </tr>
                  ) : shownProducts.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-10 text-center text-gray-500">
                        Không có sản phẩm phù hợp.
                      </td>
                    </tr>
                  ) : (
                    shownProducts.map((p) => {
                      const status = getStockStatus(Number(p.stock || 0));
                      const img = getPrimaryImage(p);

                      return (
                        <tr key={p._id} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-lg overflow-hidden border border-gray-200 bg-white flex-shrink-0">
                                {img ? (
                                  <img src={img} alt={p.name} className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-gray-400">🧴</div>
                                )}
                              </div>
                              <div className="min-w-0">
                                <div className="font-semibold text-gray-800 truncate">{p.name}</div>
                                <div className="text-xs text-gray-500 truncate">
                                  {p.sku ? `SKU: ${p.sku}` : ""} {p.brand ? `• ${p.brand}` : ""}
                                </div>
                              </div>
                            </div>
                          </td>

                          <td className="px-4 py-3 text-gray-600">{p.categoryName || "-"}</td>

                          <td className="px-4 py-3 text-center">
                            <code className="px-2 py-1 bg-gray-100 rounded text-sm">{p.barcode || "-"}</code>
                          </td>

                          <td className="px-4 py-3 text-right font-semibold text-gray-800">{money(p.price)}đ</td>

                          <td className="px-4 py-3 text-center">
                            <span className="font-bold text-lg text-gray-800">{Number(p.stock || 0)}</span>
                          </td>

                          <td className="px-4 py-3">
                            <div className="flex justify-center">
                              <span
                                className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${status.bg} ${status.color}`}
                              >
                                <span>{status.icon}</span>
                                {status.label}
                              </span>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile */}
            <div className="md:hidden divide-y divide-gray-200">
              {productsLoading ? (
                <div className="p-8 text-center text-gray-500">Đang tải...</div>
              ) : shownProducts.length === 0 ? (
                <div className="p-8 text-center text-gray-500">Không có sản phẩm phù hợp.</div>
              ) : (
                shownProducts.map((p) => {
                  const status = getStockStatus(Number(p.stock || 0));
                  const img = getPrimaryImage(p);

                  return (
                    <div key={p._id} className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-12 h-12 rounded-lg overflow-hidden border border-gray-200 bg-white flex-shrink-0">
                            {img ? (
                              <img src={img} alt={p.name} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-gray-400">🧴</div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="font-semibold text-gray-800 truncate">{p.name}</div>
                            <div className="text-sm text-gray-600 truncate">{p.categoryName || "-"}</div>
                          </div>
                        </div>

                        <span
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${status.bg} ${status.color}`}
                        >
                          <span>{status.icon}</span>
                          {status.label}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <span className="text-gray-600">Tồn:</span>
                          <span className="ml-2 font-bold text-gray-800">{Number(p.stock || 0)}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Giá:</span>
                          <span className="ml-2 font-semibold text-gray-800">{money(p.price)}đ</span>
                        </div>
                        <div className="col-span-2">
                          <span className="text-gray-600">Barcode:</span>
                          <code className="ml-2 px-1.5 py-0.5 bg-gray-100 rounded text-xs">{p.barcode || "-"}</code>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </>
      )}

      {/* TAB: INBOUND (CREATE) */}
      {tab === "inbound" && (
        <div className="space-y-4">
          {!canCreateInbound && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-gray-800 mb-1">Chưa chọn chi nhánh</h3>
                  <p className="text-sm text-gray-600">
                    ADMIN/MANAGER cần chọn 1 chi nhánh cụ thể ở dropdown (không chọn “Tất cả”).
                  </p>
                </div>
              </div>
            </div>
          )}

          {productsError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">
              {productsError}
            </div>
          )}

          <div className="bg-white rounded-lg border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-800">Phiếu Nhập Kho (Tạo Phiếu)</h3>
              <div className="text-xs text-gray-500">POST /api/inbounds</div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-gray-700">Nhà cung cấp</label>
                <input
                  value={supplier}
                  onChange={(e) => setSupplier(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">Ghi chú</label>
                <input
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none"
                />
              </div>
            </div>

            <div className="mt-4 space-y-3">
              <div className="text-sm font-semibold text-gray-800">Items</div>

              {items.map((it, idx) => (
                <div
                  key={idx}
                  className="grid grid-cols-1 md:grid-cols-12 gap-2 bg-gray-50 border border-gray-200 rounded-lg p-3"
                >
                  <div className="md:col-span-6">
                    <label className="text-xs font-medium text-gray-600">Sản phẩm</label>
                    <select
                      value={it.productId}
                      onChange={(e) => updateRow(idx, { productId: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none bg-white"
                      disabled={productsLoading}
                    >
                      <option value="">{productsLoading ? "Đang tải..." : "-- chọn sản phẩm --"}</option>
                      {products.map((p) => (
                        <option key={p._id} value={p._id}>
                          {p.sku ? `${p.sku} - ` : ""}
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <label className="text-xs font-medium text-gray-600">Qty</label>
                    <input
                      type="number"
                      value={it.qty}
                      min={1}
                      onChange={(e) => updateRow(idx, { qty: Number(e.target.value || 1) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none bg-white"
                    />
                  </div>

                  <div className="md:col-span-3">
                    <label className="text-xs font-medium text-gray-600">Cost</label>
                    <input
                      type="number"
                      value={it.cost}
                      min={0}
                      onChange={(e) => updateRow(idx, { cost: Number(e.target.value || 0) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none bg-white"
                    />
                  </div>

                  <div className="md:col-span-1 flex md:items-end">
                    <button
                      type="button"
                      onClick={() => removeRow(idx)}
                      className="w-full md:w-auto px-3 py-2 rounded-lg border border-gray-300 hover:bg-gray-100 text-sm font-semibold"
                      disabled={items.length <= 1}
                    >
                      Xoá
                    </button>
                  </div>
                </div>
              ))}

              <button
                type="button"
                onClick={addRow}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 text-sm font-semibold"
              >
                <Plus className="w-4 h-4" />
                Thêm dòng
              </button>
            </div>

            <div className="mt-4 flex flex-col md:flex-row gap-2">
              <button
                type="button"
                onClick={createInbound}
                disabled={creating || !canCreateInbound}
                className={`px-4 py-2.5 rounded-lg font-semibold text-white ${
                  creating || !canCreateInbound ? "bg-gray-300 cursor-not-allowed" : "bg-pink-500 hover:bg-pink-600"
                }`}
              >
                {creating ? "Đang tạo..." : "Tạo Phiếu Nhập"}
              </button>

              {createdInboundId && (
                <button
                  type="button"
                  onClick={() => confirmInbound(createdInboundId)}
                  disabled={confirming}
                  className={`px-4 py-2.5 rounded-lg font-semibold text-white ${
                    confirming ? "bg-gray-300" : "bg-green-600 hover:bg-green-700"
                  }`}
                >
                  {confirming ? "Đang xác nhận..." : "Xác nhận phiếu vừa tạo"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB: INBOUND LIST */}
      {tab === "inbound_list" && (
        <div className="space-y-4">
          {/* Toolbar */}
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex flex-col md:flex-row md:items-center gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Tìm (nếu backend hỗ trợ q)..."
                  className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg outline-none"
                />
              </div>

              <button
                type="button"
                onClick={() => {
                  setPage(1);
                  triggerReloadList();
                }}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 font-semibold"
              >
                <RefreshCw className="w-4 h-4" />
                Tải lại
              </button>

              <button
                type="button"
                onClick={() => setTab("inbound")}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-pink-500 hover:bg-pink-600 text-white font-semibold"
              >
                <Plus className="w-4 h-4" />
                Tạo phiếu
              </button>
            </div>

            {listError && (
              <div className="mt-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
                {listError}
              </div>
            )}
          </div>

          {/* Table */}
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Mã phiếu</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Supplier</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Ghi chú</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">SL</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Subtotal</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Trạng thái</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Ngày tạo</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-200">
                  {listLoading ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-10 text-center text-gray-500">
                        Đang tải danh sách...
                      </td>
                    </tr>
                  ) : inbounds.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-10 text-center text-gray-500">
                        Chưa có phiếu nhập.
                      </td>
                    </tr>
                  ) : (
                    inbounds.map((it) => {
                      const badge = statusBadge(it.status);
                      return (
                        <tr
                          key={it._id}
                          className="hover:bg-gray-50 cursor-pointer"
                          onClick={() => openDetail(it._id)}
                          title="Click để xem chi tiết"
                        >
                          <td className="px-4 py-3 font-semibold text-gray-800">
                            {it.code}
                            <div className="text-xs text-gray-500">{it._id}</div>
                          </td>

                          <td className="px-4 py-3 text-gray-700">{it.supplier || "-"}</td>
                          <td className="px-4 py-3 text-gray-600 max-w-[360px] truncate">{it.note || "-"}</td>

                          <td className="px-4 py-3 text-center font-bold">{sumQty(it.items)}</td>

                          <td className="px-4 py-3 text-right font-semibold">{money(it.subtotal)}đ</td>

                          <td className="px-4 py-3 text-center">
                            <span className={`px-2 py-1 rounded text-xs font-semibold ${badge.bg} ${badge.text}`}>
                              {badge.label}
                            </span>
                          </td>

                          <td className="px-4 py-3 text-right text-gray-600">{fmtDateTime(it.createdAt)}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile */}
            <div className="md:hidden divide-y divide-gray-200">
              {listLoading ? (
                <div className="p-8 text-center text-gray-500">Đang tải...</div>
              ) : inbounds.length === 0 ? (
                <div className="p-8 text-center text-gray-500">Chưa có phiếu nhập.</div>
              ) : (
                inbounds.map((it) => {
                  const badge = statusBadge(it.status);
                  return (
                    <button
                      key={it._id}
                      onClick={() => openDetail(it._id)}
                      className="w-full text-left p-4 hover:bg-gray-50"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="font-semibold text-gray-800 truncate">{it.code}</div>
                          <div className="text-sm text-gray-600 truncate">{it.supplier || "-"}</div>
                          <div className="text-xs text-gray-500 truncate">{it.note || "-"}</div>

                          <div className="mt-2">
                            <span className={`px-2 py-1 rounded text-xs font-semibold ${badge.bg} ${badge.text}`}>
                              {badge.label}
                            </span>
                          </div>
                        </div>

                        <div className="text-right flex-shrink-0">
                          <div className="text-sm font-bold text-gray-800">SL {sumQty(it.items)}</div>
                          <div className="text-sm font-semibold text-gray-800">{money(it.subtotal)}đ</div>
                          <div className="text-xs text-gray-600">{fmtDateTime(it.createdAt)}</div>
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Trang <b>{page}</b> / {totalPages}
            </div>

            <div className="flex gap-2">
              <button
                className="px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 font-semibold disabled:opacity-50"
                disabled={page <= 1}
                onClick={() => {
                  setPage((p) => Math.max(1, p - 1));
                  triggerReloadList();
                }}
              >
                Trước
              </button>

              <button
                className="px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 font-semibold disabled:opacity-50"
                disabled={page >= totalPages}
                onClick={() => {
                  setPage((p) => p + 1);
                  triggerReloadList();
                }}
              >
                Sau
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DETAIL MODAL */}
      {detailOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-3xl bg-white rounded-xl shadow-xl overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <div className="min-w-0">
                <div className="font-bold text-gray-800 truncate">
                  Chi tiết phiếu: <span className="text-pink-600">{detail?.code || selectedInboundId}</span>
                </div>
                <div className="text-xs text-gray-500 truncate">{selectedInboundId}</div>
              </div>

              <button
                onClick={closeDetail}
                className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50"
                title="Đóng"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 space-y-3">
              {detailLoading ? (
                <div className="py-10 text-center text-gray-500">Đang tải chi tiết...</div>
              ) : detailErr ? (
                <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">{detailErr}</div>
              ) : detail ? (
                <>
                  {/* Info cards */}
                  {(() => {
                    const badge = statusBadge(detail.status);
                    return (
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                          <div className="text-xs text-gray-500">Supplier</div>
                          <div className="font-semibold text-gray-800">{detail.supplier || "-"}</div>
                        </div>

                        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                          <div className="text-xs text-gray-500">Trạng thái</div>
                          <div className={`font-semibold ${badge.text}`}>{badge.label}</div>
                        </div>

                        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                          <div className="text-xs text-gray-500">Tổng SL</div>
                          <div className="font-semibold text-gray-800">{sumQty(detail.items)}</div>
                        </div>

                        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                          <div className="text-xs text-gray-500">Subtotal</div>
                          <div className="font-semibold text-gray-800">{money(detail.subtotal)}đ</div>
                        </div>
                      </div>
                    );
                  })()}

                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                    <div className="text-xs text-gray-500">Ghi chú</div>
                    <div className="text-sm text-gray-800">{detail.note || "-"}</div>
                  </div>

                  {/* Items */}
                  <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                    <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 font-semibold text-gray-800">
                      Items
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-white border-b border-gray-200">
                          <tr>
                            <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">Sản phẩm</th>
                            <th className="px-4 py-2 text-center text-sm font-semibold text-gray-700">Qty</th>
                            <th className="px-4 py-2 text-right text-sm font-semibold text-gray-700">Cost</th>
                            <th className="px-4 py-2 text-right text-sm font-semibold text-gray-700">Total</th>
                          </tr>
                        </thead>

                        <tbody className="divide-y divide-gray-200">
                          {detail.items.map((it, idx) => (
                            <tr key={idx}>
                              <td className="px-4 py-2">
                                <div className="font-semibold text-gray-800">
                                  {it.name || "-"}{" "}
                                  {it.sku ? <span className="text-xs text-gray-500">({it.sku})</span> : null}
                                </div>
                                <div className="text-xs text-gray-500 font-mono">productId: {it.productId}</div>
                              </td>
                              <td className="px-4 py-2 text-center font-bold">{it.qty}</td>
                              <td className="px-4 py-2 text-right font-semibold">{money(it.cost)}đ</td>
                              <td className="px-4 py-2 text-right font-bold">{money(it.total ?? it.qty * it.cost)}đ</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col md:flex-row gap-2 pt-2">
                    <button
                      onClick={() => fetchInboundDetail(selectedInboundId)}
                      className="px-4 py-2.5 rounded-lg border border-gray-200 hover:bg-gray-50 font-semibold"
                    >
                      Tải lại chi tiết
                    </button>

                    {String(detail.status || "").toUpperCase() === "DRAFT" && (
                      <button
                        onClick={() => confirmInbound(selectedInboundId)}
                        disabled={confirming}
                        className={`px-4 py-2.5 rounded-lg font-semibold text-white ${
                          confirming ? "bg-gray-300" : "bg-green-600 hover:bg-green-700"
                        }`}
                      >
                        {confirming ? "Đang xác nhận..." : "Xác nhận phiếu"}
                      </button>
                    )}
                  </div>

                  <div className="text-xs text-gray-500">
                    Tạo: {fmtDateTime(detail.createdAt)} • Cập nhật: {fmtDateTime(detail.updatedAt)} • Xác nhận:{" "}
                    {fmtDateTime(detail.confirmedAt || null)}
                  </div>
                </>
              ) : (
                <div className="py-8 text-center text-gray-500">Không có dữ liệu.</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InventorySection;
