// src/components/Orders/OrdersSection.tsx
import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
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
  Printer,
  Gift,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Plus,
  Wallet,
  Flame,
} from "lucide-react";

import { Checkbox, message } from "antd";

import api from "../../../services/api";
import apiWrite from "../../../services/apiWrite";
import { getCurrentUser } from "../../../services/authService";
import { getActiveBranchId, setActiveBranchId } from "../../../services/branchContext";

// ===============================
// Types
// ===============================
type OrderStatus =
  | "PENDING"
  | "CONFIRM"
  | "DEBT"
  | "CANCEL"
  | "CANCELLED"
  | "REFUND"
  | "SHIPPING"
  | string;

type PaymentMethodUI = "CASH" | "BANK" | "CARD" | "WALLET";

interface OrderItem {
  productId: string;
  isFlashSale?: boolean;
  flashSaleId?: string;
  variantId?: string;
  sku?: string;
  name?: string;
  qty: number;
  price?: number;
  total?: number;
  originalPrice?: number;
  discountPercent?: number;

  // optional attributes (e.g. variant key/value pairs)
  attributes?: { k: string; v: string }[];
}

interface OrderPayment {
  method: PaymentMethodUI | string;
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
  pointsEarned?: number;

  customerId?: string;

  subtotal?: number;
  discount?: number;
  extraFee?: number;
  total?: number;
  pricingNote?: string;

  pointsRedeemed?: number;
  pointsRedeemAmount?: number;
  pointsRedeemedAt?: string | null;
  pointsRedeemRevertedAt?: string | null;

  pointsAppliedAt?: string | null;
  pointsRevertedAt?: string | null;
  loyaltyAppliedAt?: string | null;

  debtAmount?: number;

  items: OrderItem[];
  payments?: OrderPayment[];
  delivery?: DeliveryInfo;
  note?: string;
  flashSaleId?: string;
  isFlashSale?: boolean;
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

type CustomerTierInfo = {
  code?: string;
  startsAt?: string | null;
  expiresAt?: string | null;
  locked?: boolean;
  permanent?: boolean;
};

type CustomerDTO = {
  _id: string;
  name?: string;
  phone?: string;
  points?: number;

  tier?: CustomerTierInfo;

  tierProgress?: {
    resetAt?: string | null;
    spendForTier?: number;
  };
};

type PaymentRow = {
  id: string;
  method: PaymentMethodUI;
  amountText: string;
};

type RedeemPolicy = {
  enabled: boolean;
  maxPoints: number;
  redeemAmount: number;
};

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
    DEBT: { bg: "bg-amber-50", text: "text-amber-700", label: "💳 DEBT" },
    SHIPPING: { bg: "bg-blue-50", text: "text-blue-700", label: "🚚 SHIPPING" },
    SHIPPED: { bg: "bg-blue-50", text: "text-blue-700", label: "🚚 SHIPPED" },
    CANCEL: { bg: "bg-red-50", text: "text-red-700", label: "✕ CANCEL" },
    CANCELLED: { bg: "bg-red-50", text: "text-red-700", label: "✕ CANCELLED" },
    REFUND: { bg: "bg-purple-50", text: "text-purple-700", label: "↩ REFUND" },
    REFUNDED: { bg: "bg-purple-50", text: "text-purple-700", label: "↩ REFUNDED" },
  };
  return map[s] || { bg: "bg-gray-100", text: "text-gray-700", label: s || "UNKNOWN" };
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
const sumPaid = (payments?: OrderPayment[]) => (payments || []).reduce((s, p) => s + Number(p.amount || 0), 0);

const payMethodLabel = (m?: string) => {
  const x = String(m || "").toUpperCase();
  if (x === "CASH") return "Tiền mặt";
  if (x === "BANK") return "Chuyển khoản";
  if (x === "CARD") return "Thẻ";
  if (x === "WALLET") return "Ví điện tử";
  if (x === "COD") return "COD";
  if (x === "PENDING") return "Chưa thu";
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
const calcExtraFee = (o?: OrderRow | null) => Number(o?.extraFee || 0);
const calcRedeemAmount = (o?: OrderRow | null) => Number(o?.pointsRedeemAmount || 0);

// Total on UI should match server: base = subtotal - discount + extraFee, then minus redeem
const calcBaseAmount = (o?: OrderRow | null) => Math.max(0, calcSubtotal(o) - calcDiscount(o) + calcExtraFee(o));

const calcTotal = (o?: OrderRow | null) => {
  const base = calcBaseAmount(o);
  const redeem = Math.max(0, calcRedeemAmount(o));
  const t = o?.total != null ? Number(o.total || 0) : Math.max(0, base - redeem);
  return Math.max(0, t);
};

const calcDue = (o?: OrderRow | null) => {
  const total = calcTotal(o);
  const paid = sumPaid(o?.payments);
  return Math.max(0, total - paid);
};

const isDebtOrder = (o?: OrderRow | null) => {
  const st = String(o?.status || "").toUpperCase();
  if (st === "DEBT") return true;
  if (st === "CONFIRM") return calcDue(o) > 0;
  return false;
};

const isObjectId = (s?: any) => /^[0-9a-fA-F]{24}$/.test(String(s || ""));

const clamp0 = (n: number) => (n < 0 ? 0 : n);
const toNumberSafe = (v: any) => {
  const n = Number(String(v ?? "").replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? n : 0;
};
const uid = () => `${Date.now()}_${Math.random().toString(16).slice(2)}`;

// ===============================
// Payment "smooth" engine (NO useEffect)
// ===============================
const METHODS: PaymentMethodUI[] = ["CASH", "BANK", "CARD", "WALLET"];

const normMethod = (m: any): PaymentMethodUI => {
  const x = String(m || "").toUpperCase();
  return (METHODS as string[]).includes(x) ? (x as PaymentMethodUI) : "CASH";
};

const toAmountInt = (v: any) => Math.round(clamp0(toNumberSafe(v)));

const pickNextMethod = (rows: PaymentRow[], preferred?: PaymentMethodUI): PaymentMethodUI => {
  const used = new Set(rows.map((r) => normMethod(r.method)));
  if (preferred && !used.has(preferred)) return preferred;
  for (const m of METHODS) if (!used.has(m)) return m;
  // dùng hết rồi thì cho trùng (hiếm)
  return preferred || "BANK";
};

const ensureUniqueMethods = (rows: PaymentRow[]) => {
  const used = new Set<string>();
  const next = rows.map((r) => {
    let m = normMethod(r.method);
    if (!used.has(m)) {
      used.add(m);
      return { ...r, method: m };
    }
    // trùng -> gán method khác chưa dùng
    const newM = pickNextMethod(
      rows
        .filter((x) => x.id !== r.id)
        .map((x) => ({ ...x, method: normMethod(x.method) })),
      m
    );
    used.add(newM);
    return { ...r, method: newM };
  });
  return next;
};

// autoRow = dòng “nhận phần còn lại”
const rebalanceRows = (rowsIn: PaymentRow[], target: number, autoId?: string) => {
  const rows0 = ensureUniqueMethods(rowsIn.map((r) => ({ ...r, method: normMethod(r.method) })));
  if (rows0.length === 0) return rows0;

  const targetTotal = Math.max(0, Math.round(target || 0));
  const auto = autoId && rows0.some((r) => r.id === autoId) ? autoId : rows0[rows0.length - 1].id;

  const amounts = rows0.map((r) => toAmountInt(r.amountText));
  const idxAuto = rows0.findIndex((r) => r.id === auto);

  const sumOthers = amounts.reduce((s, n, i) => (i === idxAuto ? s : s + n), 0);
  const remain = Math.max(0, targetTotal - sumOthers);

  return rows0.map((r, i) => (i === idxAuto ? { ...r, amountText: String(remain) } : r));
};

// ===============================
// Component
// ===============================
const OrdersSection: React.FC = () => {
  const [messageApi, contextHolder] = message.useMessage();
  const user = getCurrentUser();
  const role = String(user?.role || "").toUpperCase();
  const isStaff = role === "STAFF";
  const staffBranch = user?.branchId ? String(user.branchId) : "";

  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchId, setBranchId] = useState<string>(() => (isStaff ? staffBranch : getActiveBranchId(user)));

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
  const [payMode, setPayMode] = useState<"CONFIRM" | "DEBT">("CONFIRM");
  const [paying, setPaying] = useState(false);

  const [payRows, setPayRows] = useState<PaymentRow[]>([{ id: uid(), method: "CASH", amountText: "" }]);
  const [activePayRowId, setActivePayRowId] = useState<string>("");

  const [autoRowId, setAutoRowId] = useState<string>("");
  const autoRowIdRef = useRef<string>("");
  useEffect(() => {
    autoRowIdRef.current = autoRowId;
  }, [autoRowId]);

  const [userById, setUserById] = useState<Map<string, UserRow>>(() => new Map());
  const [usersLoading, setUsersLoading] = useState(false);

  const [customerLoading, setCustomerLoading] = useState(false);
  const [customer, setCustomer] = useState<CustomerDTO | null>(null);

  const [useRedeem, setUseRedeem] = useState(false);
  const [redeemPolicy, setRedeemPolicy] = useState<RedeemPolicy | null>(null);
  const [redeemLoading, setRedeemLoading] = useState(false);

  const PRINT_BASE = (process.env.REACT_APP_PRINT_BASE as string) || "http://localhost:9009";

  const success = (mes: string) => {
    messageApi.open({ type: "success", content: mes });
  };
  const error = (mes: string) => {
    messageApi.open({ type: "error", content: mes });
  };

  const printBill = (orderId: string) => {
    const id = String(orderId || "").trim();
    if (!id) {
      error("Không có ID đơn hàng để in.");
      return;
    }
    const url = `${PRINT_BASE}/print/receipt/${encodeURIComponent(id)}?paper=80&autoprint=1`;
    const w = window.open(url, "_blank", "noopener,noreferrer,width=420,height=720");
    // if (!w) error("Trình duyệt đang chặn popup. Vui lòng cho phép popup để in bill.");
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

  const fetchUsersByIds = useCallback(
    async (ids: (string | null | undefined)[]) => {
      const clean = Array.from(new Set((ids || []).map((x) => String(x || "").trim()).filter((x) => isObjectId(x))));
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
    },
    [userById]
  );

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
        error(e?.response?.data?.message || "Không tải được danh sách đơn hàng");
      } finally {
        setLoading(false);
      }
    },
    [fetchUsersByIds]
  );

  const fetchCustomer = useCallback(async (customerId?: string | null, bId?: string) => {
    const cid = String(customerId || "").trim();
    const bid = String(bId || "").trim();

    if (!cid || !isObjectId(cid) || !bid || bid === "all") {
      setCustomer(null);
      return null;
    }

    setCustomerLoading(true);
    try {
      const res = await api.get(`/customers/${encodeURIComponent(cid)}?branchId=${encodeURIComponent(bid)}`);
      const c: CustomerDTO | null = res.data?.customer || null;
      setCustomer(c);
      return c;
    } catch (e: any) {
      console.error("GET /customers/:id error:", e?.response?.data || e?.message);
      setCustomer(null);
      return null;
    } finally {
      setCustomerLoading(false);
    }
  }, []);

  /**
   * ✅ Fix 404: Server của bạn có POST /api/loyalty-settings/calc-redeem (không có GET /loyalty/calc-redeem)
   * - Body: { branchId, customerId, baseAmount, points }
   * - Để lấy "maxPoints" + "amount", gửi points = số rất lớn (server tự clamp theo policy + customerPoints)
   */
  const fetchRedeemPolicy = useCallback(
    async (order: OrderRow, customerPoints?: number | null) => {
      const cid = order.customerId;
      const bid = order.branchId;
      const baseAmount = calcBaseAmount(order);

      if (!cid || !isObjectId(cid) || !bid || bid === "all" || baseAmount <= 0) {
        setRedeemPolicy(null);
        return;
      }

      setRedeemLoading(true);
      try {
        const pts = Math.max(0, Number(customerPoints ?? customer?.points ?? 0));
        const reqPts = pts > 0 ? pts : 999999999; // fallback lấy max theo policy
        const res = await api.post(`/loyalty-settings/calc-redeem`, {
          branchId: bid,
          customerId: cid,
          baseAmount,
          points: reqPts,
        });

        const data = res.data || {};
        const maxPoints = Number(data.maxPoints || 0);
        const amount = Number(data.amount || 0);
        const redeemEnable = !!data.redeemEnable;

        setRedeemPolicy({
          enabled: redeemEnable && maxPoints > 0 && amount > 0,
          maxPoints,
          redeemAmount: amount,
        });
      } catch (e: any) {
        console.error("POST /loyalty-settings/calc-redeem error:", e?.response?.data || e?.message);
        setRedeemPolicy(null);
      } finally {
        setRedeemLoading(false);
      }
    },
    [customer?.points]
  );

  useEffect(() => {
    fetchBranches();

    if (isStaff) {
      setBranchId(staffBranch);
      if (staffBranch) fetchOrders(staffBranch);
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

    const byBranch = branchId === "all" ? orders : (orders || []).filter((o) => String(o.branchId || "") === branchId);

    const filtered = byBranch.filter((o) => {
      if (!s) return true;
      const code = String(o.code || "").toLowerCase();
      const status = String(o.status || "").toLowerCase();
      const b = String(o.branchId || "").toLowerCase();
      const channel = String(o.channel || "").toLowerCase();
      const receiver = String(o.delivery?.receiverName || "").toLowerCase();
      const phone = String(o.delivery?.receiverPhone || "").toLowerCase();
      return code.includes(s) || status.includes(s) || b.includes(s) || channel.includes(s) || receiver.includes(s) || phone.includes(s);
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
          return calcTotal(o);
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

  useEffect(() => setPage(1), [search]);

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
    fetchCustomer(o.customerId, branchId);
  };

  const closeDetail = () => {
    setDetailOpen(false);
    setSelected(null);
    setCustomer(null);
  };

  useEffect(() => {
    if (detailOpen && selected?.customerId) fetchCustomer(selected.customerId, branchId);
  }, [detailOpen, selected?.customerId, branchId, fetchCustomer]);

  const toBackendStatus = (s: string) => {
    const x = String(s || "").toUpperCase();
    if (x === "SHIPPING") return "SHIPPED";
    if (x === "CANCEL") return "CANCELLED";
    if (x === "REFUND") return "REFUNDED";
    return x;
  };

  // ===== Payments smooth funcs =====
  const addPayMethodRow = (targetTotal: number) => {
    setPayRows((prev) => {
      const rows = Array.isArray(prev) ? prev : [];
      const method = pickNextMethod(rows, "BANK");
      const row: PaymentRow = { id: uid(), method, amountText: "0" };
      const next = [...rows, row];

      setAutoRowId(row.id);
      setActivePayRowId(row.id);

      return rebalanceRows(next, targetTotal, row.id);
    });
  };

  const removePayRow = (id: string, targetTotal: number) => {
    setPayRows((prev) => {
      let rows = (Array.isArray(prev) ? prev : []).filter((x) => x.id !== id);

      if (rows.length === 0) {
        const first: PaymentRow = { id: uid(), method: "CASH", amountText: String(targetTotal) };
        setAutoRowId(first.id);
        setActivePayRowId(first.id);
        return [first];
      }

      const nextAuto = autoRowIdRef.current === id ? rows[rows.length - 1].id : autoRowIdRef.current;
      setAutoRowId(nextAuto || rows[rows.length - 1].id);

      if (activePayRowId === id) setActivePayRowId(rows[0].id);

      return rebalanceRows(rows, targetTotal, nextAuto || rows[rows.length - 1].id);
    });
  };

  const updatePayRow = (id: string, patch: Partial<PaymentRow>, targetTotal: number) => {
    setPayRows((prev) => {
      let rows = Array.isArray(prev) ? prev : [];
      rows = rows.map((x) => (x.id === id ? { ...x, ...patch } : x));
      rows = ensureUniqueMethods(rows);

      // CONFIRM: nếu mới có 1 dòng và user nhập amount => tự thêm dòng 2 để nhận phần còn lại
      if (payMode === "CONFIRM" && rows.length === 1 && patch.amountText != null) {
        const a0 = toAmountInt(rows[0].amountText);
        if (a0 > 0 && a0 < Math.round(targetTotal)) {
          const second: PaymentRow = { id: uid(), method: pickNextMethod(rows, "BANK"), amountText: "0" };
          rows = [...rows, second];
          setAutoRowId(second.id);
        }
      }

      if (patch.method) setActivePayRowId(id);

      const autoId = autoRowIdRef.current || rows[rows.length - 1].id;
      return rebalanceRows(rows, targetTotal, autoId);
    });
  };

  const changeStatus = async (order: OrderRow, nextStatus: OrderStatus) => {
    const from = String(order.status || "").toUpperCase();
    const to = String(nextStatus || "").toUpperCase();

    if (to === "CONFIRM" && from === "PENDING") {
      setSelected(order);
      setPayMode("CONFIRM");

      // reset redeem UI
      setUseRedeem(false);
      setRedeemPolicy(null);

      // load customer + policy
      let c: CustomerDTO | null = null;
      if (order.customerId) c = await fetchCustomer(order.customerId, branchId);
      if (order.customerId) await fetchRedeemPolicy(order, c?.points ?? null);

      // init payments: 1 dòng CASH = (baseAmount) (chưa trừ redeem vì chưa tick)
      const initialTarget = calcBaseAmount(order);
      const first: PaymentRow = { id: uid(), method: "CASH", amountText: String(initialTarget) };
      setPayRows([first]);
      setActivePayRowId(first.id);
      setAutoRowId(first.id);

      setPayOpen(true);
      fetchUsersByIds([order.createdById, order.confirmedById]);
      return;
    }

    setUpdating(true);
    try {
      await apiWrite.patch(`/orders/${order._id}/status`, { status: toBackendStatus(to) });
      await fetchOrders(branchId);
      setSelected((prev) => (prev && prev._id === order._id ? { ...prev, status: to } : prev));
    } catch (e: any) {
      console.error("PATCH /orders/:id/status error:", e?.response?.data || e?.message);
      error(e?.response?.data?.message || "Không cập nhật được trạng thái");
    } finally {
      setUpdating(false);
    }
  };

  const confirmWithPayment = async () => {
    if (!selected?._id) return;

    const rows = Array.isArray(payRows) ? payRows : [];
    const payments = rows
      .map((r) => ({
        method: normMethod(r.method),
        amount: Math.round(clamp0(toNumberSafe(r.amountText))),
      }))
      .filter((x) => x.amount > 0);

    if (!payments.length) {
      error("Cần nhập ít nhất 1 khoản thanh toán.");
      return;
    }

    // targetTotal = base - redeem (nếu tick)
    const base = calcBaseAmount(selected);
    const redeemAmt = useRedeem && redeemPolicy?.enabled ? redeemPolicy.redeemAmount : 0;
    const target = Math.max(0, Math.round(base - redeemAmt));
    const sum = payments.reduce((s, p) => s + p.amount, 0);

    // POS backend bắt buộc sum(payments) == order.total khi confirm
    if (sum !== target) {
      error(`Tổng thanh toán phải đúng ${money(target)}đ. Hiện tại: ${money(sum)}đ`);
      return;
    }

    setPaying(true);
    try {
      const payload: any = { payments };

      // ✅ gửi redeem dạng mới (server vẫn tự tính lại)
      if (useRedeem && redeemPolicy && redeemPolicy.enabled) {
        payload.pointsRedeemed = redeemPolicy.maxPoints;
        payload.pointsRedeemAmount = redeemPolicy.redeemAmount;
      }

      await apiWrite.post(`/orders/${selected._id}/confirm`, payload);

      setPayOpen(false);
      await fetchOrders(branchId);

      // giữ detail không mất: cập nhật selected sơ bộ, nhưng openDetail sẽ show theo orders mới nếu mở lại
      setSelected((prev) =>
        prev
          ? {
              ...prev,
              status: "CONFIRM",
            }
          : prev
      );

      success("✅ Đã xác nhận & thanh toán đơn hàng!");
    } catch (e: any) {
      console.error("POST /orders/:id/confirm error:", e?.response?.data || e?.message);
      error(e?.response?.data?.message || "Không xác nhận thanh toán được");
    } finally {
      setPaying(false);
    }
  };

  const openPayDebt = (order: OrderRow) => {
    setSelected(order);
    setPayMode("DEBT");
    setUseRedeem(false);
    setRedeemPolicy(null);

    const due = calcDue(order);
    const first: PaymentRow = { id: uid(), method: "CASH", amountText: String(due) };
    setPayRows([first]);
    setActivePayRowId(first.id);
    setAutoRowId(first.id);

    setPayOpen(true);
  };

  const payDebt = async () => {
    if (!selected?._id) return;

    const rows = Array.isArray(payRows) ? payRows : [];
    const payments = rows
      .map((r) => ({
        method: normMethod(r.method),
        amount: Math.round(clamp0(toNumberSafe(r.amountText))),
      }))
      .filter((x) => x.amount > 0);

    if (!payments.length) {
      error("Cần nhập ít nhất 1 khoản thanh toán.");
      return;
    }

    const totalPaying = payments.reduce((s, p) => s + p.amount, 0);
    const due = calcDue(selected);

    if (totalPaying > due) {
      error(`Số tiền vượt quá còn thiếu (${money(due)}đ)`);
      return;
    }

    setPaying(true);
    try {
      await apiWrite.post(`/orders/${selected._id}/payments`, { payments });

      setPayOpen(false);
      await fetchOrders(branchId);

      if (totalPaying === due) success("✅ Đã trả đủ nợ. Đơn chuyển sang CONFIRM.");
      else success(`💰 Đã trả ${money(totalPaying)}đ. Còn thiếu ${money(due - totalPaying)}đ.`);
    } catch (e: any) {
      console.error("Pay debt error:", e?.response?.data || e?.message);
      error(e?.response?.data?.message || "Không trả nợ được");
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

  // ===== computed totals for pay modal =====
  const debtTotal = selected ? calcDue(selected) : 0;

  const confirmBase = selected ? calcBaseAmount(selected) : 0;
  const redeemAmount = useRedeem && redeemPolicy?.enabled ? redeemPolicy.redeemAmount : 0;
  const confirmTarget = Math.max(0, confirmBase - redeemAmount);

  const targetTotal = payMode === "DEBT" ? debtTotal : confirmTarget;

  // keep paidSum display
  const paidSum = useMemo(() => payRows.reduce((s, r) => s + toAmountInt(r.amountText), 0), [payRows]);

  // when toggle redeem -> rebalance immediately (mượt + không giật)
  useEffect(() => {
    if (!payOpen) return;
    if (payMode !== "CONFIRM") return;

    setPayRows((prev) => {
      const rows = Array.isArray(prev) ? prev : [];
      const autoId = autoRowIdRef.current || (rows.length ? rows[rows.length - 1].id : "");
      return rebalanceRows(rows, confirmTarget, autoId || (rows[0]?.id ?? ""));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [useRedeem, redeemPolicy?.redeemAmount, payOpen, payMode]);

  return (
    <div className="space-y-4">
      {contextHolder}

      {/* Header + Actions */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Quản lý đơn hàng</h2>
          <p className="text-sm text-gray-600 mt-1">
            Tổng: <b>{totalItems}</b> đơn
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
          {!isStaff && (
            <select
              value={branchId}
              onChange={(e) => onChangeBranch(e.target.value)}
              className="px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm font-semibold outline-none focus:ring-2 focus:ring-pink-500"
              title="Chọn cửa hàng"
            >
              <option value="all">Tất cả cửa hàng</option>
              {branches.map((b) => (
                <option key={b._id} value={b._id}>
                  {b.name}
                </option>
              ))}
            </select>
          )}

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
                        <span className="px-2 py-1 bg-pink-50 text-pink-700 rounded text-xs font-semibold">{qty}</span>
                      </td>

                      <td className="px-4 py-3 text-right font-bold text-gray-800">{money(total)}đ</td>

                      <td className="px-4 py-3">
                        <div className="flex justify-center">
                          <span className={`px-2 py-1 rounded text-xs font-semibold ${cfg.bg} ${cfg.text}`}>{cfg.label}</span>
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-2">
                          <button className="p-2 rounded hover:bg-blue-50 text-blue-700" onClick={() => openDetail(o)} title="Xem">
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

        {!loading && totalItems > 0 && (
          <div className="border-t">
            {(() => {
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
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-4 py-3 bg-gray-50">
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
                        if (p === "...") return <span key={`dot-${idx}`} className="px-2 text-gray-500">...</span>;
                        const pageNum = p as number;
                        const isActive = pageNum === currentPage;
                        return (
                          <button
                            key={pageNum}
                            onClick={() => setPage(pageNum)}
                            className={`min-w-[36px] px-3 py-1 rounded text-sm font-semibold transition-colors ${
                              isActive ? "bg-pink-500 text-white" : "bg-white border border-gray-300 hover:bg-gray-100 text-gray-700"
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
            })()}
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {detailOpen && selected && (
  <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
    <div className="bg-white rounded-xl shadow-xl max-w-5xl w-full max-h-[90vh] flex flex-col overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-4 py-3 border-b">
        <div className="min-w-0 flex-1">
          <div className="font-bold text-gray-800 truncate">Chi tiết đơn: {selected.code}</div>
          <div className="text-xs text-gray-500">#{selected._id}</div>
          {/* ✅ Flash Sale Indicator */}
          {selected.items?.some(it => it.isFlashSale) && (
            <div className="flex items-center gap-1 mt-1">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gradient-to-r from-red-500 to-pink-500 text-white rounded-full text-xs font-bold animate-pulse">
                <Flame className="w-3 h-3" />
                Flash Sale
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {isDebtOrder(selected) && (
            <button
              onClick={() => openPayDebt(selected)}
              className="px-3 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-semibold flex items-center gap-2 transition-colors"
              title="Trả nợ"
            >
              <CreditCard className="w-4 h-4" />
              <span className="hidden sm:inline">Trả nợ</span>
            </button>
          )}

          <button
            onClick={() => printBill(selected._id)}
            className="px-3 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-white font-semibold flex items-center gap-2 transition-colors"
            title="In hoá đơn 80mm"
          >
            <Printer className="w-4 h-4" />
            <span className="hidden sm:inline">In Bill</span>
          </button>

          <button onClick={closeDetail} className="p-2 hover:bg-gray-100 rounded-lg transition-colors" title="Đóng">
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
            <div className="text-xs text-gray-500 mt-2">Confirmed: {selected.confirmedAt ? fmtDateTime(selected.confirmedAt) : "—"}</div>
          </div>
        </div>

        {/* ✅ Flash Sale Summary Card (NEW) */}
        {selected.items?.some(it => it.isFlashSale) && (
          <div className="bg-gradient-to-br from-red-50 via-pink-50 to-orange-50 border-2 border-red-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-2 bg-gradient-to-br from-red-500 to-pink-500 rounded-lg">
                <Flame className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="font-bold text-red-900 text-lg">Flash Sale</div>
                <div className="text-xs text-red-700">Đơn hàng có sản phẩm flash sale</div>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
              {(() => {
                const flashItems = selected.items.filter(it => it.isFlashSale);
                const totalSavings = flashItems.reduce((sum, it) => {
                  const discount = (it.originalPrice || 0) - (it.price || 0);
                  return sum + (discount * it.qty);
                }, 0);
                const avgDiscount = flashItems.length > 0 
                  ? Math.round(flashItems.reduce((sum, it) => sum + (it.discountPercent || 0), 0) / flashItems.length)
                  : 0;

                return (
                  <>
                    <div className="bg-white/80 rounded-lg p-2 border border-red-200">
                      <div className="text-xs text-red-600 mb-1">Sản phẩm FS</div>
                      <div className="text-lg font-bold text-red-900">{flashItems.length}</div>
                    </div>

                    <div className="bg-white/80 rounded-lg p-2 border border-red-200">
                      <div className="text-xs text-red-600 mb-1">Số lượng</div>
                      <div className="text-lg font-bold text-red-900">
                        {flashItems.reduce((sum, it) => sum + it.qty, 0)}
                      </div>
                    </div>

                    <div className="bg-white/80 rounded-lg p-2 border border-red-200">
                      <div className="text-xs text-red-600 mb-1">Giảm TB</div>
                      <div className="text-lg font-bold text-red-900">{avgDiscount}%</div>
                    </div>

                    <div className="bg-white/80 rounded-lg p-2 border border-red-200">
                      <div className="text-xs text-red-600 mb-1">Tiết kiệm</div>
                      <div className="text-lg font-bold text-green-700">{money(totalSavings)}đ</div>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        )}

              {/* Loyalty Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-lg p-3">
                  <div className="flex items-center gap-2 text-xs text-green-600 mb-2">
                    <TrendingUp className="w-4 h-4" />
                    <span className="font-semibold">Điểm Tích Lũy</span>
                  </div>

                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold text-green-700">
                      {selected.pointsEarned ? `+${money(selected.pointsEarned)}` : "0"}
                    </span>
                    <span className="text-xs text-green-600">điểm</span>
                  </div>

                  <div className="mt-2 space-y-1 text-xs text-gray-600">
                    {selected.pointsAppliedAt ? (
                      <div className="flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-green-600" />
                        <span>Đã cộng: {fmtDateTime(selected.pointsAppliedAt)}</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 text-gray-400">
                        <AlertCircle className="w-3 h-3" />
                        <span>Chưa áp dụng</span>
                      </div>
                    )}

                    {selected.pointsRevertedAt && (
                      <div className="flex items-center gap-1 text-red-600">
                        <AlertCircle className="w-3 h-3" />
                        <span>Đã hoàn: {fmtDateTime(selected.pointsRevertedAt)}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-200 rounded-lg p-3">
                  <div className="flex items-center gap-2 text-xs text-purple-600 mb-2">
                    <Gift className="w-4 h-4" />
                    <span className="font-semibold">Điểm Đã Dùng</span>
                  </div>

                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold text-purple-700">
                      {selected.pointsRedeemed ? `-${money(selected.pointsRedeemed)}` : "0"}
                    </span>
                    <span className="text-xs text-purple-600">điểm</span>
                  </div>

                  {selected.pointsRedeemAmount && selected.pointsRedeemAmount > 0 ? (
                    <div className="mt-2 space-y-1 text-xs">
                      <div className="text-purple-700 font-semibold">Giảm: {money(selected.pointsRedeemAmount)}đ</div>

                      {selected.pointsRedeemedAt ? (
                        <div className="flex items-center gap-1 text-gray-600">
                          <CheckCircle2 className="w-3 h-3 text-purple-600" />
                          <span>Đã trừ: {fmtDateTime(selected.pointsRedeemedAt)}</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-gray-400">
                          <AlertCircle className="w-3 h-3" />
                          <span>Chưa trừ điểm</span>
                        </div>
                      )}

                      {selected.pointsRedeemRevertedAt && (
                        <div className="flex items-center gap-1 text-red-600">
                          <AlertCircle className="w-3 h-3" />
                          <span>Đã hoàn: {fmtDateTime(selected.pointsRedeemRevertedAt)}</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="mt-2 text-xs text-gray-400">Không dùng điểm</div>
                  )}
                </div>

                <div
                  className={`rounded-lg p-3 border ${
                    String(selected.status).toUpperCase() === "DEBT"
                      ? "bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200"
                      : "bg-gray-50 border-gray-200"
                  }`}
                >
                  <div className="flex items-center gap-2 text-xs mb-2">
                    <CreditCard
                      className={`w-4 h-4 ${
                        String(selected.status).toUpperCase() === "DEBT" ? "text-amber-600" : "text-gray-500"
                      }`}
                    />
                    <span
                      className={`font-semibold ${
                        String(selected.status).toUpperCase() === "DEBT" ? "text-amber-600" : "text-gray-600"
                      }`}
                    >
                      Công Nợ
                    </span>
                  </div>

                  {(() => {
                    const due = calcDue(selected);
                    const debtAmt = Number(selected.debtAmount || 0);

                    return (
                      <div>
                        <div className="flex items-baseline gap-2">
                          <span className={`text-2xl font-bold ${due > 0 ? "text-red-600" : "text-gray-700"}`}>
                            {money(due)}đ
                          </span>
                        </div>

                        <div className="mt-2 text-xs text-gray-600">
                          {debtAmt > 0 && (
                            <div>
                              Nợ ban đầu: <b className="text-amber-700">{money(debtAmt)}đ</b>
                            </div>
                          )}

                          {due > 0 ? (
                            <div className="text-red-600 font-semibold mt-1">Còn thiếu: {money(due)}đ</div>
                          ) : (
                            <div className="flex items-center gap-1 text-green-600 mt-1">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Đã thanh toán đủ</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })()}
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
                      <span className="text-gray-500">Điểm hiện có</span>
                      <div className="text-right">
                        {customerLoading ? (
                          <span className="text-xs text-gray-400">Đang tải...</span>
                        ) : (
                          <span className="font-semibold text-green-700">{customer?.points != null ? `${money(customer.points)} điểm` : "—"}</span>
                        )}
                      </div>
                    </div>

                    <div className="flex justify-between gap-3">
                      <span className="text-gray-500">Tier</span>
                      <div className="text-right">
                        {customerLoading ? (
                          <span className="text-xs text-gray-400">Đang tải...</span>
                        ) : (
                          <span className="font-semibold">
                            {customer?.tier?.code || "—"}
                            {customer?.tier?.permanent ? " • Permanent" : ""}
                            {customer?.tier?.locked ? " • Locked" : ""}
                          </span>
                        )}
                        {!customerLoading && customer?.tier?.expiresAt ? (
                          <div className="text-xs text-gray-500">Hết hạn: {fmtDateTime(customer.tier.expiresAt)}</div>
                        ) : null}
                      </div>
                    </div>

                    <div className="flex justify-between gap-3">
                      <span className="text-gray-500">Chi tiêu xét hạng</span>
                      <span className="font-semibold text-right">{customer?.tierProgress?.spendForTier != null ? `${money(customer.tierProgress.spendForTier)}đ` : "—"}</span>
                    </div>

                    <div className="flex justify-between gap-3">
                      <span className="text-gray-500">Người Tạo</span>
                      <div className="text-right">
                        <div className="font-semibold">
                          {usersLoading && isObjectId(selected.createdById) && !userById.has(String(selected.createdById)) ? "Đang tải..." : userLabel(selected.createdById)}
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-between gap-3">
                      <span className="text-gray-500">Người Xác Nhận</span>
                      <div className="text-right">
                        <div className="font-semibold">
                          {usersLoading && isObjectId(selected.confirmedById) && !userById.has(String(selected.confirmedById)) ? "Đang tải..." : userLabel(selected.confirmedById)}
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
                const base = calcBaseAmount(selected);
                const redeemAmt = calcRedeemAmount(selected);
                const total = calcTotal(selected);
                const paid = sumPaid(selected.payments);
                const due = calcDue(selected);
                const discount = calcDiscount(selected);
                const extraFee = calcExtraFee(selected);
                const pricingNote = selected.pricingNote || "";
                const subtotal = calcSubtotal(selected);

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
                        <span className={`font-bold ${due > 0 ? "text-red-600" : "text-gray-800"}`}>{money(due)}đ</span>
                      </div>

                      <div className="mt-3 border-t pt-3">
                        <div className="text-xs font-semibold text-gray-600 mb-2">Danh sách payments</div>

                        {selected.payments && selected.payments.length > 0 ? (
                          <div className="space-y-2">
                            {selected.payments.map((p, idx) => (
                              <div key={idx} className="flex items-center justify-between text-sm bg-white border border-gray-200 rounded-lg px-3 py-2">
                                <div className="flex flex-col">
                                  <span className="font-semibold text-gray-800">{payMethodLabel(p.method)}</span>
                                  <span className="text-xs text-gray-400">Payment #{idx + 1}</span>
                                </div>

                                <span className="font-extrabold text-gray-900">{money(p.amount)}đ</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-sm text-gray-500 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">Chưa có thanh toán.</div>
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
                          <span className={`font-semibold ${discount > 0 ? "text-red-600" : ""}`}>-{money(discount)}đ</span>
                        </div>

                        {redeemAmt > 0 && (
                          <div className="flex items-center justify-between">
                            <span className="text-gray-500 flex items-center gap-1">
                              <Gift className="w-3 h-3" />
                              Trừ điểm
                            </span>
                            <span className="font-semibold text-purple-600">-{money(redeemAmt)}đ</span>
                          </div>
                        )}

                        <div className="flex items-center justify-between">
                          <span className="text-gray-500">Cộng thêm</span>
                          <span className={`font-semibold ${extraFee > 0 ? "text-green-700" : ""}`}>+{money(extraFee)}đ</span>
                        </div>

                        {pricingNote && (
                          <div className="flex items-start justify-between gap-2 text-xs text-gray-600">
                            <span className="text-gray-500 whitespace-nowrap">Ghi chú phí</span>
                            <span className="text-right italic text-gray-700 break-words">{pricingNote}</span>
                          </div>
                        )}

                        <div className="border-t pt-2 flex items-center justify-between">
                          <span className="text-gray-700 font-bold">Tổng cộng</span>
                          <span className="text-gray-900 font-extrabold text-lg">{money(total)}đ</span>
                        </div>

                        <div className="text-xs text-gray-500">
                          Base (subtotal - discount + extraFee): <b>{money(base)}đ</b>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Items */}
              <div className="border rounded-lg overflow-hidden">
          <div className="px-3 py-2 bg-gray-50 border-b text-sm font-semibold text-gray-700 flex items-center justify-between">
            <span>Sản phẩm ({sumQty(selected.items)} món)</span>
            {selected.items?.some(it => it.isFlashSale) && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs font-bold">
                <Flame className="w-3 h-3" />
                {selected.items.filter(it => it.isFlashSale).length} Flash Sale
              </span>
            )}
          </div>
          
          <div className="max-h-96 overflow-auto">
            <table className="w-full text-sm">
              <thead className="bg-white sticky top-0 border-b">
                <tr className="text-left">
                  <th className="px-3 py-2">Sản phẩm</th>
                  <th className="px-3 py-2 text-center">SL</th>
                  <th className="px-3 py-2 text-right">Đơn giá</th>
                  <th className="px-3 py-2 text-right">Thành tiền</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {selected.items.map((it, idx) => {
                  const lineTotal = it.total != null ? Number(it.total || 0) : Number(it.price || 0) * Number(it.qty || 0);
                  const isFlashSale = it.isFlashSale;
                  const hasDiscount =
                    isFlashSale &&
                    typeof it.originalPrice === "number" &&
                    typeof it.price === "number" &&
                    it.originalPrice > it.price;
                  const discountAmount = hasDiscount ? (Number(it.originalPrice) - Number(it.price)) * Number(it.qty) : 0;

                  return (
                    <tr key={it.productId || idx} className={isFlashSale ? "bg-red-50/30" : ""}>
                      <td className="px-3 py-2">
                        <div className="flex items-start gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-gray-800 flex items-center gap-2 flex-wrap">
                              <span>{it.name || "—"}</span>
                              
                              {/* ✅ Flash Sale Badge */}
                              {isFlashSale && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-gradient-to-r from-red-500 to-pink-500 text-white rounded text-[10px] font-bold">
                                  <Flame className="w-2.5 h-2.5" />
                                  -{it.discountPercent}%
                                </span>
                              )}
                            </div>

                            <div className="text-xs text-gray-500 mt-0.5">
                              SKU: {it.sku || "—"}
                            </div>

                            {/* ✅ Variant Info (if available) */}
                            {it.attributes && it.attributes.length > 0 && (() => {
                              const attrs = it.attributes || [];
                              return (
                                <div className="text-xs text-gray-500 mt-0.5">
                                  {attrs.map((attr: any, i: number) => (
                                    <span key={i}>
                                      {attr.k}: <b>{attr.v}</b>
                                      {i < attrs.length - 1 && " • "}
                                    </span>
                                  ))}
                                </div>
                              );
                            })()}

                            <div className="text-[10px] text-gray-400 mt-0.5 font-mono">
                              Variant: {it.variantId || it.productId}
                            </div>

                            {/* ✅ Flash Sale ID (if available) */}
                            {it.flashSaleId && (
                              <div className="text-[10px] text-red-600 mt-0.5 font-mono">
                                Flash Sale: {it.flashSaleId}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="px-3 py-2 text-center">
                        <span className={`inline-block px-2 py-1 rounded font-semibold ${
                          isFlashSale ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-700"
                        }`}>
                          {it.qty}
                        </span>
                      </td>

                      <td className="px-3 py-2 text-right">
                        <div>
                          {/* ✅ Show original price strikethrough if flash sale */}
                          {hasDiscount && (
                            <div className="text-xs text-gray-400 line-through">
                              {money(it.originalPrice)}đ
                            </div>
                          )}
                          
                          {/* Current/Flash price */}
                          <div className={`font-semibold ${isFlashSale ? "text-red-600" : "text-gray-900"}`}>
                            {money(it.price)}đ
                          </div>

                          {/* ✅ Savings per unit */}
                          {hasDiscount && (
                            <div className="text-[10px] text-green-600 font-semibold">
                              Tiết kiệm {money(it.originalPrice! - it.price!)}đ
                            </div>
                          )}
                        </div>
                      </td>

                      <td className="px-3 py-2 text-right">
                        <div>
                          <div className={`font-bold ${isFlashSale ? "text-red-700" : "text-gray-900"}`}>
                            {money(lineTotal)}đ
                          </div>

                          {/* ✅ Total savings for this line */}
                          {hasDiscount && discountAmount > 0 && (
                            <div className="text-[10px] text-green-600 font-semibold mt-0.5">
                              (Tiết kiệm {money(discountAmount)}đ)
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>

              {/* ✅ Flash Sale Summary Footer */}
              {selected.items?.some(it => it.isFlashSale) && (
                <tfoot className="bg-gradient-to-r from-green-50 to-emerald-50 border-t-2 border-green-200">
                  <tr>
                    <td colSpan={3} className="px-3 py-2 text-right font-bold text-green-900">
                      <div className="flex items-center justify-end gap-2">
                        <TrendingUp className="w-4 h-4" />
                        Tổng tiết kiệm từ Flash Sale:
                      </div>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <div className="text-lg font-extrabold text-green-700">
                        {money(
                          selected.items
                            .filter(it => it.isFlashSale)
                            .reduce((sum, it) => {
                              const discount = (it.originalPrice || 0) - (it.price || 0);
                              return sum + (discount * it.qty);
                            }, 0)
                        )}đ
                      </div>
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>

              {/* Stock Allocations */}
              {selected.stockAllocations && selected.stockAllocations.length > 0 && (
                <div className="border rounded-lg overflow-hidden">
                  <div className="px-3 py-2 bg-gray-50 border-b text-sm font-semibold text-gray-700">Phân bổ kho</div>
                  <div className="p-3">
                    <div className="space-y-2">
                      {selected.stockAllocations.map((sa, idx) => (
                        <div key={idx} className="flex items-center justify-between text-sm bg-white border border-gray-200 rounded-lg px-3 py-2">
                          <div>
                            <div className="font-semibold text-gray-800">{branchName(sa.branchId)}</div>
                            <div className="text-xs text-gray-500">Product: {sa.productId}</div>
                          </div>
                          <span className="font-bold text-gray-900">{sa.qty} SP</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="space-y-2">
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
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <div className="font-bold text-gray-800">{payMode === "CONFIRM" ? "Thanh toán & xác nhận đơn" : "Trả nợ đơn hàng"}</div>
              <button onClick={() => setPayOpen(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            <div className="p-4 space-y-4 overflow-y-auto">
              {/* Summary */}
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="text-xs text-gray-500">Đơn</div>
                <div className="font-semibold text-gray-800">{selected.code}</div>
                <div className="text-xs text-gray-500 mt-1">
                  Base: <b>{money(confirmBase)}đ</b>
                  {payMode === "DEBT" && (
                    <>
                      {" "}
                      • Còn thiếu: <b className="text-red-600">{money(calcDue(selected))}đ</b>
                    </>
                  )}
                </div>
              </div>

              {/* Redeem Section */}
              {payMode === "CONFIRM" && (
                <div className="bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-200 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Gift className="w-4 h-4 text-purple-600" />
                      <span className="font-bold text-purple-900">Sử dụng điểm</span>
                    </div>

                    {redeemLoading && <div className="text-xs text-purple-600">Đang tải...</div>}
                  </div>

                  {redeemPolicy && redeemPolicy.enabled ? (
                    <div className="space-y-2">
                      <Checkbox checked={useRedeem} onChange={(e) => setUseRedeem(e.target.checked)} className="text-sm">
                        <span className="text-purple-900 font-semibold">
                          Dùng {money(redeemPolicy.maxPoints)} điểm = Giảm {money(redeemPolicy.redeemAmount)}đ
                        </span>
                      </Checkbox>

                      {customer && (
                        <div className="text-xs text-gray-600 pl-6">
                          Khách có: <b className="text-green-700">{money(customer.points || 0)} điểm</b>
                        </div>
                      )}

                      {useRedeem && (
                        <div className="mt-2 pt-2 border-t border-purple-200">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-purple-700">Base</span>
                            <span className="font-semibold">{money(confirmBase)}đ</span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-purple-700">Trừ điểm</span>
                            <span className="font-semibold text-purple-600">-{money(redeemAmount)}đ</span>
                          </div>
                          <div className="flex items-center justify-between text-sm font-bold border-t border-purple-200 pt-1 mt-1">
                            <span className="text-purple-900">Cần thanh toán</span>
                            <span className="text-purple-900">{money(confirmTarget)}đ</span>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-sm text-gray-500">{redeemLoading ? "Đang kiểm tra..." : "Không đủ điều kiện sử dụng điểm"}</div>
                  )}
                </div>
              )}

              {/* Payment Rows */}
              <div className="bg-white border border-gray-200 rounded-lg p-3">
                <div className="flex items-center justify-between mb-3">
                  <div className="font-bold text-gray-900 flex items-center gap-2">
                    <CreditCard className="w-4 h-4" />
                    Hình thức thanh toán
                  </div>

                  <button
                    type="button"
                    onClick={() => addPayMethodRow(targetTotal)}
                    className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg bg-pink-50 text-pink-600 hover:bg-pink-100 text-sm font-bold"
                    title="Thêm hình thức"
                  >
                    <Plus className="w-4 h-4" />
                    Thêm
                  </button>
                </div>

                <div className="space-y-2">
                  {payRows.map((r) => {
                    const isActive = r.id === activePayRowId;
                    const amountNum = toAmountInt(r.amountText);
                    const isAuto = r.id === autoRowId;

                    return (
                      <div
                        key={r.id}
                        className={`rounded-lg border p-2 transition-colors ${
                          isActive ? "border-pink-300 bg-pink-50" : "border-gray-200 bg-white"
                        }`}
                        onClick={() => setActivePayRowId(r.id)}
                        role="button"
                        tabIndex={0}
                      >
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <div className="flex items-center gap-1 flex-wrap">
                            {(METHODS as PaymentMethodUI[]).map((m) => (
                              <button
                                key={m}
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  updatePayRow(r.id, { method: m }, targetTotal);
                                  setActivePayRowId(r.id);
                                }}
                                className={`px-2 py-1 rounded-lg text-xs font-bold border transition-colors flex items-center gap-1 ${
                                  normMethod(r.method) === m ? "bg-pink-500 text-white border-pink-500" : "bg-white border-gray-200 hover:bg-gray-50"
                                }`}
                              >
                                {m === "CASH" && <Banknote className="w-3 h-3" />}
                                {m === "BANK" && <CreditCard className="w-3 h-3" />}
                                {m === "CARD" && <CreditCard className="w-3 h-3" />}
                                {m === "WALLET" && <Wallet className="w-3 h-3" />}
                                {m}
                              </button>
                            ))}
                          </div>

                          {payRows.length > 1 && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                removePayRow(r.id, targetTotal);
                              }}
                              className="p-1 rounded-lg bg-white border border-gray-200 hover:bg-gray-50"
                              title="Xoá hình thức"
                            >
                              <X className="w-4 h-4 text-gray-600" />
                            </button>
                          )}
                        </div>

                        <div className="text-xs text-gray-700 mb-2 flex items-center justify-between">
                          <div>
                            Số tiền: <b>{money(amountNum)}đ</b>
                            {isAuto && <span className="ml-2 text-[11px] text-pink-600 font-bold">(Auto)</span>}
                          </div>
                          {isAuto && <div className="text-[11px] text-gray-500">nhận phần còn lại</div>}
                        </div>

                        {isActive && (
                          <input
                            value={r.amountText}
                            onChange={(e) => updatePayRow(r.id, { amountText: e.target.value }, targetTotal)}
                            inputMode="numeric"
                            placeholder="Nhập số tiền"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-pink-500 text-sm"
                          />
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Total Summary */}
                <div className="mt-3 pt-3 border-t space-y-1 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Tổng đã nhập</span>
                    <span className="font-bold text-gray-900">{money(paidSum)}đ</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">{payMode === "DEBT" ? "Còn thiếu" : "Cần thanh toán"}</span>
                    <span className={`font-bold ${Math.max(0, targetTotal - paidSum) > 0 ? "text-red-600" : "text-green-600"}`}>
                      {money(Math.max(0, targetTotal - paidSum))}đ
                    </span>
                  </div>

                  {paidSum === targetTotal && (
                    <div className="flex items-center gap-1 text-green-600 text-xs">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>{payMode === "DEBT" ? "Trả đủ → Đơn sẽ chuyển CONFIRM" : "Hợp lệ → Có thể xác nhận"}</span>
                    </div>
                  )}

                  {paidSum !== targetTotal && payMode === "CONFIRM" && (
                    <div className="flex items-center gap-1 text-amber-600 text-xs">
                      <AlertCircle className="w-3 h-3" />
                      <span>POS yêu cầu tổng thanh toán phải đúng bằng số cần thanh toán.</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Submit Button */}
              <button
                onClick={payMode === "CONFIRM" ? confirmWithPayment : payDebt}
                disabled={paying}
                className="w-full bg-pink-500 hover:bg-pink-600 text-white py-3 rounded-lg font-extrabold disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                {paying ? "Đang xử lý..." : payMode === "CONFIRM" ? "XÁC NHẬN THANH TOÁN" : "TRẢ NỢ"}
              </button>

              <div className="text-xs text-gray-500">
                {payMode === "DEBT" ? (
                  <>
                    * <b>Trả đủ</b> (= {money(targetTotal)}đ): Đơn chuyển CONFIRM
                    <br />* <b>Trả thiếu</b> (&lt; {money(targetTotal)}đ): Đơn vẫn DEBT, lưu thanh toán
                  </>
                ) : (
                  <>
                    * Xác nhận thanh toán PENDING → CONFIRM
                    {useRedeem && redeemPolicy?.enabled && (
                      <>
                        <br />* Sử dụng {money(redeemPolicy.maxPoints)} điểm để giảm {money(redeemPolicy.redeemAmount)}đ
                      </>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrdersSection;
