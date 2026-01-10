import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
  Eye,
  RefreshCw,
  Search,
  ArrowUpDown,
  X,
  CreditCard,
  Banknote,
  ShoppingBag,
  Calendar,
  User,
  Package,
  Store,
  ChevronLeft,
  ChevronRight,
  Printer, // ✅ Thêm icon Printer
} from "lucide-react";

import api from "../../services/api";
import apiWrite from "../../services/apiWrite";
import { getCurrentUser } from "../../services/authService";
import { getActiveBranchId, setActiveBranchId } from "../../services/branchContext";

// ===============================
// Types
// ===============================
type OrderStatus =
  | "PENDING"
  | "CONFIRM"
  | "CANCEL"
  | "CANCELLED"
  | "REFUND"
  | "SHIPPING"
  | string;
type PaymentMethod = "CASH" | "BANK";

interface OrderItem {
  productId: string;
  sku?: string;
  name?: string;
  qty: number;
  price?: number;
  total?: number;
}

interface OrderPayment {
  method: PaymentMethod | string;
  amount: number;
}

interface DeliveryInfo {
  method?: string;
  address?: string;
  receiverName?: string;
  receiverPhone?: string;
  note?: string;
}

interface StockAllocation {
  branchId: string;
  productId: string;
  qty: number;
}

interface OrderRow {
  _id: string;
  code: string;
  channel?: string;
  status: OrderStatus;
  branchId?: string | null;

  customerId?: string;

  subtotal?: number;
  discount?: number;
  total?: number;

  items: OrderItem[];
  payments?: OrderPayment[];
  delivery?: DeliveryInfo;

  createdById?: string;
  confirmedAt?: string | null;
  confirmedById?: string | null;
  shippedAt?: string | null;
  refundedAt?: string | null;
  refundNote?: string;

  stockAllocations?: StockAllocation[];

  version?: number;

  createdAt?: string;
  updatedAt?: string;
}

interface Branch {
  _id: string;
  code?: string;
  name: string;
  address?: string;
  phone?: string;
  isActive?: boolean;
}

interface UserRow {
  _id: string;
  username?: string;
  name?: string;
  role?: string;
  branchId?: string | null;
  isActive?: boolean;
}

// ===============================
// Helpers
// ===============================
const money = (n: any) => Number(n || 0).toLocaleString("vi-VN");

const fmtDateTime = (s?: string | null) => {
  if (!s) return "—";
  try {
    return new Date(s).toLocaleString("vi-VN");
  } catch {
    return String(s);
  }
};

const statusConfig = (status: string) => {
  const s = String(status || "").toUpperCase();
  const map: Record<string, { bg: string; text: string; label: string }> = {
    PENDING: { bg: "bg-yellow-50", text: "text-yellow-700", label: "⏳ PENDING" },
    CONFIRM: { bg: "bg-green-50", text: "text-green-700", label: "✓ CONFIRM" },
    SHIPPING: { bg: "bg-blue-50", text: "text-blue-700", label: "🚚 SHIPPING" },
    CANCEL: { bg: "bg-red-50", text: "text-red-700", label: "✕ CANCEL" },
    CANCELLED: { bg: "bg-red-50", text: "text-red-700", label: "✕ CANCELLED" },
    REFUND: { bg: "bg-purple-50", text: "text-purple-700", label: "↩ REFUND" },
  };
  return (
    map[s] || {
      bg: "bg-gray-100",
      text: "text-gray-700",
      label: s || "UNKNOWN",
    }
  );
};

type SortKey = "code" | "createdAt" | "status" | "itemsQty" | "total";
type SortDir = "asc" | "desc";

const compare = (a: any, b: any) => {
  if (a == null && b == null) return 0;
  if (a == null) return -1;
  if (b == null) return 1;
  if (typeof a === "number" && typeof b === "number") return a - b;
  return String(a).localeCompare(String(b));
};

const sumQty = (items?: OrderItem[]) => (items || []).reduce((s, it) => s + Number(it.qty || 0), 0);

const sumPaid = (payments?: OrderPayment[]) =>
  (payments || []).reduce((s, p) => s + Number(p.amount || 0), 0);

const payMethodLabel = (m?: string) => {
  const x = String(m || "").toUpperCase();
  if (x === "CASH") return "Tiền mặt";
  if (x === "BANK") return "Chuyển khoản";
  return x || "—";
};

const customerName = (o?: OrderRow | null) => o?.delivery?.receiverName || "Khách lẻ";
const customerPhone = (o?: OrderRow | null) => o?.delivery?.receiverPhone || "—";
const deliveryAddress = (o?: OrderRow | null) => o?.delivery?.address || "—";
const orderNote = (o?: OrderRow | null) => o?.delivery?.note || "—";

const calcSubtotal = (o?: OrderRow | null) =>
  o?.subtotal != null
    ? Number(o.subtotal || 0)
    : (o?.items || []).reduce((s, it) => s + Number(it.price || 0) * Number(it.qty || 0), 0);

const calcDiscount = (o?: OrderRow | null) => Number(o?.discount || 0);

const calcTotal = (o?: OrderRow | null) =>
  o?.total != null ? Number(o.total || 0) : Math.max(0, calcSubtotal(o) - calcDiscount(o));

const isObjectId = (s?: any) => /^[0-9a-fA-F]{24}$/.test(String(s || ""));

// ===============================
// Component
// ===============================
const OrdersSection: React.FC = () => {
  const user = getCurrentUser();
  const role = String(user?.role || "").toUpperCase();
  const isStaff = role === "STAFF";
  const staffBranch = user?.branchId ? String(user.branchId) : "";

  const [branches, setBranches] = useState<Branch[]>([]);

  const [branchId, setBranchId] = useState<string>(() => {
    return isStaff ? staffBranch : getActiveBranchId(user);
  });

  const [loading, setLoading] = useState(false);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [search, setSearch] = useState("");

  const [sortKey, setSortKey] = useState<SortKey>("createdAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const [detailOpen, setDetailOpen] = useState(false);
  const [selected, setSelected] = useState<OrderRow | null>(null);

  const [updating, setUpdating] = useState(false);

  const [payOpen, setPayOpen] = useState(false);
  const [payMethod, setPayMethod] = useState<PaymentMethod>("CASH");
  const [payAmount, setPayAmount] = useState<number>(0);
  const [paying, setPaying] = useState(false);

  const [userById, setUserById] = useState<Map<string, UserRow>>(() => new Map());
  const [usersLoading, setUsersLoading] = useState(false);

  // ✅ Print base URL từ env
  const PRINT_BASE = (process.env.REACT_APP_PRINT_BASE as string) || "http://localhost:9009";

  // ✅ Helper in bill
  const printBill = (orderId: string) => {
    const id = String(orderId || "").trim();
    if (!id) {
      alert("Không có ID đơn hàng để in.");
      return;
    }
    const url = `${PRINT_BASE}/print/receipt/${encodeURIComponent(id)}?paper=80&autoprint=1`;
    const w = window.open(url, "_blank", "noopener,noreferrer,width=420,height=720");
    if (!w) {
      alert("Trình duyệt đang chặn popup. Vui lòng cho phép popup để in bill.");
    }
  };

  const userLabel = useCallback(
    (id?: string | null) => {
      if (!id) return "—";
      const key = String(id);
      const u = userById.get(key);
      if (!u) return key;
      const name = u.name?.trim() || "";
      const uname = u.username?.trim() || "";
      const main = name || uname || key;
      const r = u.role ? String(u.role).toUpperCase() : "";
      return r ? `${main} (${r})` : main;
    },
    [userById]
  );

  const fetchUsersByIds = useCallback(async (ids: (string | null | undefined)[]) => {
    const clean = Array.from(
      new Set(
        (ids || [])
          .map((x) => String(x || "").trim())
          .filter((x) => isObjectId(x))
      )
    );

    if (clean.length === 0) return;

    const missing = clean.filter((id) => !userById.has(id));
    if (missing.length === 0) return;

    setUsersLoading(true);
    try {
      const res = await api.post("/auth/by-ids", { ids: missing });
      const items: UserRow[] = res.data?.items || [];

      if (items && items.length) {
        setUserById((prev) => {
          const next = new Map(prev);
          for (const u of items) next.set(String(u._id), u);
          return next;
        });
      }
    } catch (e: any) {
      console.error("POST /auth/by-ids error:", e?.response?.data || e?.message);
    } finally {
      setUsersLoading(false);
    }
  }, [userById]);

  const fetchBranches = useCallback(async () => {
    try {
      const res = await api.get("/branches");
      const items: Branch[] = res.data?.items || [];
      setBranches(items.filter((b) => b?.isActive !== false));
    } catch (e: any) {
      console.error("GET /branches error:", e?.response?.data || e?.message);
      setBranches([]);
    }
  }, []);

  const fetchOrders = useCallback(
    async (bId: string) => {
      setLoading(true);
      try {
        const url = bId && bId !== "all" ? `/orders?branchId=${encodeURIComponent(bId)}` : `/orders`;
        const res = await api.get(url);
        const items: OrderRow[] = res.data?.items || [];
        setOrders(items);

        const ids: (string | null | undefined)[] = [];
        for (const o of items) {
          ids.push(o.createdById);
          ids.push(o.confirmedById);
        }
        fetchUsersByIds(ids);
        
        setPage(1);
      } catch (e: any) {
        console.error("GET /orders error:", e?.response?.data || e?.message);
        setOrders([]);
        alert(e?.response?.data?.message || "Không tải được danh sách đơn hàng");
      } finally {
        setLoading(false);
      }
    },
    [fetchUsersByIds]
  );

  useEffect(() => {
    fetchBranches();

    if (isStaff) {
      setBranchId(staffBranch);
      fetchOrders(staffBranch);
      return;
    }

    const current = getActiveBranchId(user);
    setBranchId(current);
    fetchOrders(current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (isStaff) return;

    const onBranchChanged = () => {
      const next = getActiveBranchId(user);
      setBranchId(next);
      fetchOrders(next);
    };

    window.addEventListener("branch_changed", onBranchChanged);
    return () => window.removeEventListener("branch_changed", onBranchChanged);
  }, [isStaff, fetchOrders, user]);

  const onChangeBranch = (id: string) => {
    if (isStaff) return;
    setBranchId(id);
    setActiveBranchId(id);
    window.dispatchEvent(new Event("branch_changed"));
    fetchOrders(id);
  };

  const filteredSorted = useMemo(() => {
    const s = search.trim().toLowerCase();

    const byBranch =
      branchId === "all" ? orders : (orders || []).filter((o) => String(o.branchId || "") === branchId);

    const filtered = byBranch.filter((o) => {
      if (!s) return true;
      const code = String(o.code || "").toLowerCase();
      const status = String(o.status || "").toLowerCase();
      const b = String(o.branchId || "").toLowerCase();
      const channel = String(o.channel || "").toLowerCase();
      const receiver = String(o.delivery?.receiverName || "").toLowerCase();
      const phone = String(o.delivery?.receiverPhone || "").toLowerCase();
      return (
        code.includes(s) ||
        status.includes(s) ||
        b.includes(s) ||
        channel.includes(s) ||
        receiver.includes(s) ||
        phone.includes(s)
      );
    });

    const getValue = (o: OrderRow) => {
      switch (sortKey) {
        case "code":
          return o.code;
        case "createdAt":
          return o.createdAt ? new Date(o.createdAt).getTime() : 0;
        case "status":
          return String(o.status || "");
        case "itemsQty":
          return sumQty(o.items);
        case "total":
          return Number(o.total ?? o.subtotal ?? 0);
        default:
          return "";
      }
    };

    return [...filtered].sort((a, b) => {
      const av = getValue(a);
      const bv = getValue(b);
      const c = compare(av, bv);
      return sortDir === "asc" ? c : -c;
    });
  }, [orders, search, sortKey, sortDir, branchId]);

  const totalItems = filteredSorted.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const currentPage = Math.min(page, totalPages);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);
  const paginatedData = filteredSorted.slice(startIndex, endIndex);

  useEffect(() => {
    setPage(1);
  }, [search]);

  const toggleSort = (k: SortKey) => {
    if (sortKey === k) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(k);
      setSortDir("asc");
    }
  };

  const openDetail = (o: OrderRow) => {
    setSelected(o);
    setDetailOpen(true);
    fetchUsersByIds([o.createdById, o.confirmedById]);
  };

  const closeDetail = () => {
    setDetailOpen(false);
    setSelected(null);
  };

  const changeStatus = async (order: OrderRow, nextStatus: OrderStatus) => {
    const from = String(order.status || "").toUpperCase();
    const to = String(nextStatus || "").toUpperCase();

    if (to === "CONFIRM" && from === "PENDING") {
      setSelected(order);
      setPayAmount(calcTotal(order));
      setPayMethod("CASH");
      setPayOpen(true);
      fetchUsersByIds([order.createdById, order.confirmedById]);
      return;
    }

    setUpdating(true);

    const toBackendStatus = (s: string) => {
      const x = String(s || "").toUpperCase();
      if (x === "SHIPPING") return "SHIPPED";
      if (x === "CANCEL") return "CANCELLED";
      return x;
    };

    try {
      await apiWrite.patch(`/orders/${order._id}/status`, { status: toBackendStatus(to) });
      await fetchOrders(branchId);
      setSelected((prev) => (prev && prev._id === order._id ? { ...prev, status: to } : prev));
    } catch (e: any) {
      console.error("PATCH /orders/:id/status error:", e?.response?.data || e?.message);
      alert(e?.response?.data?.message || "Không cập nhật được trạng thái");
    } finally {
      setUpdating(false);
    }
  };

  const confirmWithPayment = async () => {
    if (!selected?._id) return;

    setPaying(true);
    try {
      await apiWrite.post(`/orders/${selected._id}/confirm`, {
        payment: { method: payMethod, amount: Number(payAmount || 0) },
      });

      setPayOpen(false);
      await fetchOrders(branchId);
      setSelected((prev) => (prev ? { ...prev, status: "CONFIRM" } : prev));
    } catch (e: any) {
      console.error("POST /orders/:id/confirm error:", e?.response?.data || e?.message);
      alert(e?.response?.data?.message || "Không xác nhận thanh toán được");
    } finally {
      setPaying(false);
    }
  };

  const branchName = (id?: string | null) => {
    if (!id) return "—";
    const b = branches.find((x) => x._id === id);
    return b ? b.name : id;
  };

  const SortHeader: React.FC<{ k: SortKey; label: string; align?: string }> = ({ k, label, align }) => (
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

  useEffect(() => {
    if (detailOpen || payOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [detailOpen, payOpen]);

  const PaginationControls = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible + 2) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      
      if (currentPage <= 3) {
        for (let i = 2; i <= Math.min(maxVisible, totalPages - 1); i++) pages.push(i);
        pages.push("...");
      } else if (currentPage >= totalPages - 2) {
        pages.push("...");
        for (let i = Math.max(2, totalPages - maxVisible + 1); i < totalPages; i++) pages.push(i);
      } else {
        pages.push("...");
        for (let i = currentPage - 1; i <= currentPage + 1; i++) pages.push(i);
        pages.push("...");
      }
      
      pages.push(totalPages);
    }

    return (
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-4 py-3 bg-gray-50 border-t">
        <div className="text-sm text-gray-600">
          Hiển thị <b>{startIndex + 1}</b> - <b>{endIndex}</b> trong tổng số <b>{totalItems}</b> đơn
        </div>

        <div className="flex items-center gap-2">
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setPage(1);
            }}
            className="px-2 py-1 border border-gray-300 rounded text-sm outline-none focus:ring-2 focus:ring-pink-500"
          >
            <option value={10}>10/trang</option>
            <option value={20}>20/trang</option>
            <option value={50}>50/trang</option>
            <option value={100}>100/trang</option>
          </select>

          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="p-2 rounded border border-gray-300 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Trang trước"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-1">
            {pages.map((p, idx) => {
              if (p === "...") {
                return (
                  <span key={`dot-${idx}`} className="px-2 text-gray-500">
                    ...
                  </span>
                );
              }

              const pageNum = p as number;
              const isActive = pageNum === currentPage;

              return (
                <button
                  key={pageNum}
                  onClick={() => setPage(pageNum)}
                  className={`min-w-[36px] px-3 py-1 rounded text-sm font-semibold transition-colors ${
                    isActive
                      ? "bg-pink-500 text-white"
                      : "bg-white border border-gray-300 hover:bg-gray-100 text-gray-700"
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
          </div>

          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="p-2 rounded border border-gray-300 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Trang sau"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Header + Branch Filter */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Quản lý đơn hàng</h2>
          <p className="text-sm text-gray-600 mt-1">
            Tổng: <b>{totalItems}</b> đơn
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
          <button
            type="button"
            onClick={() => fetchOrders(branchId)}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 text-sm font-semibold"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Tải lại
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo mã đơn / status / branch / khách / SĐT..."
            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent outline-none"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr className="text-left">
                <th className="px-4 py-3 font-semibold text-gray-700">
                  <SortHeader k="code" label="Mã đơn" />
                </th>
                <th className="px-4 py-3 font-semibold text-gray-700">
                  <SortHeader k="createdAt" label="Ngày tạo" />
                </th>
                <th className="px-4 py-3 font-semibold text-gray-700">Cửa hàng</th>
                <th className="px-4 py-3 text-center font-semibold text-gray-700">
                  <SortHeader k="itemsQty" label="SL" />
                </th>
                <th className="px-4 py-3 text-right font-semibold text-gray-700">
                  <SortHeader k="total" label="Tổng tiền" />
                </th>
                <th className="px-4 py-3 text-center font-semibold text-gray-700">
                  <SortHeader k="status" label="Trạng thái" />
                </th>
                <th className="px-4 py-3 text-center font-semibold text-gray-700">Thao tác</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100">
              {loading && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                    Đang tải...
                  </td>
                </tr>
              )}

              {!loading && paginatedData.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                    Không có đơn hàng.
                  </td>
                </tr>
              )}

              {!loading &&
                paginatedData.map((o) => {
                  const cfg = statusConfig(o.status);
                  const qty = sumQty(o.items);
                  const total = calcTotal(o);

                  return (
                    <tr key={o._id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-gray-800">{o.code}</div>
                        <div className="text-xs text-gray-500 truncate">
                          {o.delivery?.receiverName ? `KH: ${o.delivery.receiverName}` : ""}{" "}
                          {o.delivery?.receiverPhone ? `• ${o.delivery.receiverPhone}` : ""}
                        </div>
                        <div className="text-xs text-gray-400">#{o._id}</div>
                      </td>

                      <td className="px-4 py-3 text-gray-600">{fmtDateTime(o.createdAt)}</td>

                      <td className="px-4 py-3 text-gray-700">
                        <div className="font-semibold">{branchName(o.branchId)}</div>
                        <div className="text-xs text-gray-500 font-mono">{o.branchId || "—"}</div>
                      </td>

                      <td className="px-4 py-3 text-center">
                        <span className="px-2 py-1 bg-pink-50 text-pink-700 rounded text-xs font-semibold">
                          {qty}
                        </span>
                      </td>

                      <td className="px-4 py-3 text-right font-bold text-gray-800">{money(total)}đ</td>

                      <td className="px-4 py-3">
                        <div className="flex justify-center">
                          <span className={`px-2 py-1 rounded text-xs font-semibold ${cfg.bg} ${cfg.text}`}>
                            {cfg.label}
                          </span>
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            className="p-2 rounded hover:bg-blue-50 text-blue-700"
                            onClick={() => openDetail(o)}
                            title="Xem"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {String(o.status).toUpperCase() === "PENDING" ? (
                            <>
                              <button
                                disabled={updating}
                                onClick={() => changeStatus(o, "CONFIRM")}
                                className="px-3 py-2 rounded-lg bg-pink-500 hover:bg-pink-600 text-white font-semibold text-xs"
                                title="PENDING -> CONFIRM (cần thanh toán)"
                              >
                                Xác nhận
                              </button>

                              <button
                                disabled={updating}
                                onClick={() => changeStatus(o, "CANCEL")}
                                className="px-3 py-2 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 font-semibold text-xs"
                                title="Hủy đơn"
                              >
                                Hủy
                              </button>
                            </>
                          ) : (
                            <button
                              disabled
                              className="px-3 py-2 rounded-lg bg-gray-100 text-gray-500 font-semibold text-xs cursor-not-allowed"
                              title="Đơn đã xử lý"
                            >
                              Đã xử lý
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>

        {/* Mobile list */}
        <div className="md:hidden divide-y divide-gray-200">
          {paginatedData.map((o) => {
            const cfg = statusConfig(o.status);
            return (
              <div key={o._id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-semibold text-gray-800 truncate">{o.code}</div>
                    <div className="text-xs text-gray-500">{fmtDateTime(o.createdAt)}</div>
                    <div className="text-xs text-gray-500 mt-1 truncate">{branchName(o.branchId)}</div>
                    <div className="text-xs text-gray-500 mt-1 truncate">
                      {o.delivery?.receiverName ? `KH: ${o.delivery.receiverName}` : ""}{" "}
                      {o.delivery?.receiverPhone ? `• ${o.delivery.receiverPhone}` : ""}
                    </div>
                  </div>

                  <span className={`px-2 py-1 rounded text-xs font-semibold ${cfg.bg} ${cfg.text}`}>{cfg.label}</span>
                </div>

                <div className="mt-3 flex items-center justify-between">
                  <div className="text-sm text-gray-700">
                    SL: <b>{sumQty(o.items)}</b> • Tổng: <b>{money(calcTotal(o))}đ</b>
                  </div>

                  <button className="p-2 rounded hover:bg-blue-50 text-blue-700" onClick={() => openDetail(o)} title="Xem">
                    <Eye className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}

          {loading && <div className="p-6 text-center text-gray-500">Đang tải...</div>}
          {!loading && paginatedData.length === 0 && <div className="p-6 text-center text-gray-500">Không có đơn.</div>}
        </div>

        {!loading && totalItems > 0 && <PaginationControls />}
      </div>

      {/* Detail Modal */}
      {detailOpen && selected && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden">
            {/* Header */}
           <div className="flex items-center justify-between gap-3 px-4 py-3 border-b">
  {/* Left: Title */}
  <div className="min-w-0 flex-1">
    <div className="font-bold text-gray-800 truncate">Chi tiết đơn: {selected.code}</div>
    <div className="text-xs text-gray-500">#{selected._id}</div>
  </div>

  {/* Right: Actions */}
  <div className="flex items-center gap-2 flex-shrink-0">
    {/* Print button */}
    <button
      onClick={() => printBill(selected._id)}
      className="px-3 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-white font-semibold flex items-center gap-2 transition-colors"
      title="In hoá đơn 80mm"
    >
      <Printer className="w-4 h-4" />
      <span className="hidden sm:inline">In Bill</span>
    </button>

    {/* Close button */}
    <button 
      onClick={() => { setDetailOpen(false); setSelected(null); }} 
      className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
      title="Đóng"
    >
      <X className="w-5 h-5 text-gray-600" />
    </button>
  </div>
</div>

            <div className="p-4 space-y-4 overflow-y-auto">
              {/* Summary */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                    <Calendar className="w-4 h-4" /> Ngày tạo
                  </div>
                  <div className="font-semibold text-gray-800">{fmtDateTime(selected.createdAt)}</div>
                  <div className="text-xs text-gray-500 mt-1">Cập nhật: {fmtDateTime(selected.updatedAt)}</div>
                </div>

                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                    <Package className="w-4 h-4" /> Số lượng
                  </div>
                  <div className="font-semibold text-gray-800">{sumQty(selected.items)} SP</div>
                  <div className="text-xs text-gray-500 mt-1">Kênh: {selected.channel || "—"}</div>
                </div>

                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                    <Store className="w-4 h-4" /> Cửa hàng
                  </div>
                  <div className="font-semibold text-gray-800">{branchName(selected.branchId)}</div>
                  <div className="text-xs text-gray-500 font-mono mt-1">{selected.branchId || "—"}</div>
                </div>

                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-xs text-gray-500 mb-1">Trạng thái</div>
                  {(() => {
                    const cfg = statusConfig(selected.status);
                    return (
                      <span className={`inline-flex px-2 py-1 rounded text-xs font-semibold ${cfg.bg} ${cfg.text}`}>
                        {cfg.label}
                      </span>
                    );
                  })()}
                  <div className="text-xs text-gray-500 mt-2">
                    Confirmed: {selected.confirmedAt ? fmtDateTime(selected.confirmedAt) : "—"}
                  </div>
                </div>
              </div>

              {/* Customer + Delivery */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="border rounded-lg p-3">
                  <div className="text-sm font-bold text-gray-800 mb-2 flex items-center gap-2">
                    <User className="w-4 h-4 text-gray-500" />
                    Khách hàng
                  </div>

                  <div className="text-sm text-gray-700 space-y-2">
                    <div className="flex justify-between gap-3">
                      <span className="text-gray-500">Tên</span>
                      <span className="font-semibold text-right">{customerName(selected)}</span>
                    </div>

                    <div className="flex justify-between gap-3">
                      <span className="text-gray-500">SĐT</span>
                      <span className="font-semibold text-right">{customerPhone(selected)}</span>
                    </div>

                    <div className="flex justify-between gap-3">
                      <span className="text-gray-500">CustomerId</span>
                      <span className="font-mono text-xs text-right">{selected.customerId || "—"}</span>
                    </div>

                    <div className="flex justify-between gap-3">
                      <span className="text-gray-500">Người Tạo</span>
                      <div className="text-right">
                        <div className="font-semibold">
                          {usersLoading && isObjectId(selected.createdById) && !userById.has(String(selected.createdById))
                            ? "Đang tải..."
                            : userLabel(selected.createdById)}
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-between gap-3">
                      <span className="text-gray-500">Người Xác Nhận</span>
                      <div className="text-right">
                        <div className="font-semibold">
                          {usersLoading && isObjectId(selected.confirmedById) && !userById.has(String(selected.confirmedById))
                            ? "Đang tải..."
                            : userLabel(selected.confirmedById)}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="border rounded-lg p-3">
                  <div className="text-sm font-bold text-gray-800 mb-2 flex items-center gap-2">
                    <ShoppingBag className="w-4 h-4 text-gray-500" />
                    Nhận / giao
                  </div>

                  <div className="text-sm text-gray-700 space-y-2">
                    <div className="flex justify-between gap-3">
                      <span className="text-gray-500">Hình thức</span>
                      <span className="font-semibold text-right">{selected.delivery?.method || "—"}</span>
                    </div>

                    <div>
                      <div className="text-xs text-gray-500 mb-1">Địa chỉ</div>
                      <div className="font-semibold">{deliveryAddress(selected)}</div>
                    </div>

                    <div>
                      <div className="text-xs text-gray-500 mb-1">Ghi chú</div>
                      <div className="font-semibold">{orderNote(selected)}</div>
                    </div>

                    {selected.refundNote ? (
                      <div>
                        <div className="text-xs text-gray-500 mb-1">Refund note</div>
                        <div className="font-semibold text-red-700">{selected.refundNote}</div>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>

              {/* Payments + Totals */}
              {(() => {
                const subtotal = calcSubtotal(selected);
                const discount = calcDiscount(selected);
                const total = calcTotal(selected);
                const paid = sumPaid(selected.payments);
                const due = Math.max(0, total - paid);

                return (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="border rounded-lg p-3">
                      <div className="text-sm font-bold text-gray-800 mb-2 flex items-center gap-2">
                        <CreditCard className="w-4 h-4 text-gray-500" />
                        Thanh toán
                      </div>

                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">Đã trả</span>
                        <span className="font-bold text-green-700">{money(paid)}đ</span>
                      </div>
                      <div className="flex items-center justify-between text-sm mt-1">
                        <span className="text-gray-500">Còn thiếu</span>
                        <span className={`font-bold ${due > 0 ? "text-red-600" : "text-gray-800"}`}>
                          {money(due)}đ
                        </span>
                      </div>

                      <div className="mt-3 border-t pt-3">
                        <div className="text-xs text-gray-500 mb-2">Danh sách payments</div>
                        {selected.payments && selected.payments.length > 0 ? (
                          <div className="space-y-2">
                            {selected.payments.map((p, idx) => (
                              <div
                                key={idx}
                                className="flex items-center justify-between text-sm bg-gray-50 border border-gray-200 rounded-lg px-3 py-2"
                              >
                                <span className="font-semibold text-gray-700">{payMethodLabel(p.method)}</span>
                                <span className="font-bold text-gray-900">{money(p.amount)}đ</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-sm text-gray-500">Chưa có thanh toán.</div>
                        )}
                      </div>
                    </div>

                    <div className="border rounded-lg p-3">
                      <div className="text-sm font-bold text-gray-800 mb-2">Tổng tiền</div>

                      <div className="space-y-2 text-sm">
                        <div className="flex items-center justify-between">
                          <span className="text-gray-500">Tạm tính</span>
                          <span className="font-semibold">{money(subtotal)}đ</span>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-gray-500">Giảm giá</span>
                          <span className={`font-semibold ${discount > 0 ? "text-red-600" : ""}`}>
                            -{money(discount)}đ
                          </span>
                        </div>

                        <div className="border-t pt-2 flex items-center justify-between">
                          <span className="text-gray-700 font-bold">Tổng cộng</span>
                          <span className="text-gray-900 font-extrabold text-lg">{money(total)}đ</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Items */}
              <div className="border rounded-lg overflow-hidden">
                <div className="px-3 py-2 bg-gray-50 border-b text-sm font-semibold text-gray-700">
                  Sản phẩm ({sumQty(selected.items)} món)
                </div>
                <div className="max-h-72 overflow-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-white sticky top-0">
                      <tr className="text-left border-b">
                        <th className="px-3 py-2">Tên</th>
                        <th className="px-3 py-2 text-center">Qty</th>
                        <th className="px-3 py-2 text-right">Giá</th>
                        <th className="px-3 py-2 text-right">Tổng</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {selected.items.map((it, idx) => {
                        const lineTotal =
                          it.total != null ? Number(it.total || 0) : Number(it.price || 0) * Number(it.qty || 0);
                        return (
                          <tr key={it.productId || idx}>
                            <td className="px-3 py-2">
                              <div className="font-medium text-gray-800">{it.name || "—"}</div>
                              <div className="text-xs text-gray-500">
                                SKU: {it.sku || "—"} • {it.productId}
                              </div>
                            </td>
                            <td className="px-3 py-2 text-center font-semibold">{it.qty}</td>
                            <td className="px-3 py-2 text-right">{money(it.price)}đ</td>
                            <td className="px-3 py-2 text-right font-semibold">{money(lineTotal)}đ</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* ✅ Actions - Thêm nút In bill */}
              <div className="space-y-2">
                {/* Nút In bill (luôn hiển thị) */}
                

                {/* Actions theo status */}
                {String(selected.status).toUpperCase() === "PENDING" ? (
                  <div className="flex gap-2">
                    <button
                      disabled={updating}
                      onClick={() => changeStatus(selected, "CONFIRM")}
                      className="flex-1 px-4 py-2 rounded-lg bg-pink-500 hover:bg-pink-600 text-white font-bold"
                      title="Xác nhận & thanh toán"
                    >
                      Xác nhận (Pay)
                    </button>
                    <button
                      disabled={updating}
                      onClick={() => changeStatus(selected, "CANCEL")}
                      className="flex-1 px-4 py-2 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 font-bold"
                    >
                      Hủy
                    </button>
                  </div>
                ) : (
                  <div className="text-sm text-gray-500 text-center bg-gray-50 rounded-lg p-3">
                    Đơn đang ở trạng thái <b>{String(selected.status)}</b>. <br />
                    Shipped: {selected.shippedAt ? fmtDateTime(selected.shippedAt) : "—"} • Refunded:{" "}
                    {selected.refundedAt ? fmtDateTime(selected.refundedAt) : "—"}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {payOpen && selected && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <div className="font-bold text-gray-800">Thanh toán & xác nhận đơn</div>
              <button onClick={() => setPayOpen(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            <div className="p-4 space-y-4 overflow-y-auto">
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="text-xs text-gray-500">Đơn</div>
                <div className="font-semibold text-gray-800">{selected.code}</div>
                <div className="text-xs text-gray-500 mt-1">
                  Tổng: <b>{money(calcTotal(selected))}đ</b>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setPayMethod("CASH")}
                  className={`px-3 py-2 rounded-lg border text-sm font-bold flex items-center justify-center gap-2 ${
                    payMethod === "CASH"
                      ? "bg-pink-500 text-white border-pink-500"
                      : "bg-white hover:bg-gray-50 border-gray-200"
                  }`}
                >
                  <Banknote className="w-4 h-4" />
                  Tiền mặt
                </button>

                <button
                  onClick={() => setPayMethod("BANK")}
                  className={`px-3 py-2 rounded-lg border text-sm font-bold flex items-center justify-center gap-2 ${
                    payMethod === "BANK"
                      ? "bg-pink-500 text-white border-pink-500"
                      : "bg-white hover:bg-gray-50 border-gray-200"
                  }`}
                >
                  <CreditCard className="w-4 h-4" />
                  Chuyển khoản
                </button>
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-700">Số tiền</label>
                <input
                  type="number"
                  value={payAmount}
                  onChange={(e) => setPayAmount(Number(e.target.value || 0))}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-pink-500"
                />
                <div className="text-xs text-gray-500 mt-1">Gợi ý: {money(calcTotal(selected))}đ</div>
              </div>

              <button
                onClick={confirmWithPayment}
                disabled={paying}
                className="w-full bg-pink-500 hover:bg-pink-600 text-white py-3 rounded-lg font-extrabold disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                {paying ? "Đang xử lý..." : "THANH TOÁN"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrdersSection;