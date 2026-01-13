// src/components/POS/POSSection.tsx
import React from "react";
import { message } from "antd";
import {
  Plus,
  Minus,
  Trash2,
  ShoppingBag,
  CreditCard,
  Search,
  Store,
  ArrowLeft,
  CheckCircle2,
  Tag,
  Truck,
  Gift,
  X,
} from "lucide-react";
import api from "../../services/api";

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

export interface OrderItem extends Product {
  quantity: number;
}

export interface Order {
  id: number;
  orderNumber: string;
  customer: string;
  items: OrderItem[];
  createdAt: Date;
  status: string;
}

interface Branch {
  _id: string;
  name: string;
  isActive?: boolean;
}

type PaymentMethodUI = "CASH" | "BANK" | "CARD" | "WALLET";
type SaleStatus = "CONFIRM" | "PENDING" | "DEBT";
type Step = "CART" | "CUSTOMER" | "PAYMENT";

type CustomerRow = {
  _id: string;
  name?: string;
  phone?: string;
  email?: string;
  dob?: string | Date | null;
  tierCode?: string;
  points?: number;
  spendTier?: number;
};

type PaymentRow = {
  id: string;
  method: PaymentMethodUI;
  amountText: string; // nhập khi multi hoặc DEBT
};

interface POSSectionProps {
  products: Product[];
  activeOrders: Order[];
  currentOrderId: number;
  setCurrentOrderId: (id: number) => void;
  createNewOrder: () => void;
  deleteOrder: (id: number) => void;

  addToCart: (product: Product) => void;
  updateQuantity: (productId: string, delta: number) => void;
  removeFromCart: (productId: string) => void;

  updateCustomerName: (orderId: number, name: string) => void;
  getTotal: (orderId: number) => number;

  // legacy
  completeOrder: () => void;

  completeOrderWithStatus?: (
    status: "PENDING" | "CONFIRM" | "DEBT",
    payload: {
      branchId: string;
      customer?: { name?: string; phone?: string; email?: string; dob?: string };
      delivery: { method: "PICKUP" | "SHIP"; address?: string; note?: string };

      payment?: { method: "CASH" | "BANK" | "CARD" | "WALLET" | "PENDING"; amount: number };
      payments?: { method: "CASH" | "BANK" | "CARD" | "WALLET"; amount: number }[];

      discount: number;
      extraFee: number;
      pricingNote?: string;

      pointsRedeemed?: number;
      pointsRedeemAmount?: number;
    }
  ) => Promise<{ _id: string } | any> | { _id: string } | any;

  getCurrentOrder: () => Order | undefined;

  branches: Branch[];
  posBranchId: string;
  setPosBranchId: (id: string) => void;
  currentUser: any;
}

// ===============================
// Helpers
// ===============================
const money = (n: any) => Number(n || 0).toLocaleString("vi-VN");

const getSpendTier = (x: any) => {
  const v = x?.tierProgress?.spendForTier ?? x?.spendTier ?? x?.spend_tier ?? 0;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const getTierCode = (tier: any) => {
  if (!tier) return "";
  if (typeof tier === "string") return tier;
  if (typeof tier === "object" && tier.code) return String(tier.code);
  return "";
};

const getPrimaryImage = (p: Product): string | undefined => {
  if (p.thumbnail) return p.thumbnail;
  const primary = p.images?.find((x) => x.isPrimary)?.url;
  if (primary) return primary;
  return p.images?.[0]?.url;
};

const normalizePhone = (s: string) => String(s || "").replace(/\s+/g, "").trim();
const isValidPhone = (s: string) => /^(\+?84|0)\d{8,10}$/.test(normalizePhone(s));

const toNumberSafe = (v: any) => {
  const n = Number(String(v ?? "").replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? n : 0;
};
const clamp0 = (n: number) => (n < 0 ? 0 : n);

const fmtDobInput = (v: any) => {
  if (!v) return "";
  try {
    const d = typeof v === "string" ? new Date(v) : v instanceof Date ? v : new Date(String(v));
    if (isNaN(d.getTime())) return "";
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  } catch {
    return "";
  }
};

const uid = () => `${Date.now()}_${Math.random().toString(16).slice(2)}`;

// ===============================
// Component
// ===============================
const POSSection: React.FC<POSSectionProps> = ({
  products,
  activeOrders,
  currentOrderId,
  setCurrentOrderId,
  createNewOrder,
  deleteOrder,
  addToCart,
  updateQuantity,
  removeFromCart,
  updateCustomerName,
  getTotal,
  completeOrder,
  completeOrderWithStatus,
  getCurrentOrder,
  branches,
  posBranchId,
  setPosBranchId,
  currentUser,
}) => {
  const currentOrder = getCurrentOrder();
  const [searchTerm, setSearchTerm] = React.useState("");

  const role = String(currentUser?.role || "").toUpperCase();
  const isStaff = role === "STAFF";
  const staffBranch = currentUser?.branchId ? String(currentUser.branchId) : "";

  // STAFF auto lock branch
  React.useEffect(() => {
    if (isStaff && staffBranch && posBranchId !== staffBranch) setPosBranchId(staffBranch);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isStaff, staffBranch]);

  const branchFinal = isStaff ? staffBranch : posBranchId;
  const posReady = !!branchFinal && branchFinal !== "all";

  // ===============================
  // Step flow
  // ===============================
  const [step, setStep] = React.useState<Step>("CART");

  // customer form fields
  const [cName, setCName] = React.useState("");
  const [cPhone, setCPhone] = React.useState("");
  const [cEmail, setCEmail] = React.useState("");
  const [cDob, setCDob] = React.useState<string>(""); // YYYY-MM-DD
  const [selectedCustomerId, setSelectedCustomerId] = React.useState<string>("");
  const [selectedCustomerInfo, setSelectedCustomerInfo] = React.useState<CustomerRow | null>(null);

  const [cAddress, setCAddress] = React.useState("");
  const [cNote, setCNote] = React.useState("");

  const [deliveryMethod, setDeliveryMethod] = React.useState<"PICKUP" | "SHIP">("PICKUP");

  // pricing
  const [discount, setDiscount] = React.useState<string>("0");
  const [extraFee, setExtraFee] = React.useState<string>("0");
  const [pricingNote, setPricingNote] = React.useState<string>("");

  // ✅ NEW: SaleStatus = CONFIRM | PENDING | DEBT
  const [saleStatus, setSaleStatus] = React.useState<SaleStatus>("CONFIRM");

  // ✅ NEW: multi payment rows
  const [payRows, setPayRows] = React.useState<PaymentRow[]>([{ id: uid(), method: "CASH", amountText: "" }]);
  const [activePayRowId, setActivePayRowId] = React.useState<string>(() => {
    const first = uid();
    return first;
  });

  React.useEffect(() => {
    if (!payRows.length) return;
    if (!activePayRowId) setActivePayRowId(payRows[0].id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [submitting, setSubmitting] = React.useState(false);

  // ✅ input số lượng lớn theo từng item
  const [bulkQty, setBulkQty] = React.useState<Record<string, string>>({});

  // ===============================
  // Customer Autocomplete
  // ===============================
  const [custQ, setCustQ] = React.useState("");
  const [custOpen, setCustOpen] = React.useState(false);
  const [custLoading, setCustLoading] = React.useState(false);
  const [custItems, setCustItems] = React.useState<CustomerRow[]>([]);
  const custFetchTimer = React.useRef<any>(null);

  // ===============================
  // Print choose modal (In / Không in)
  // ===============================
  const [printOpen, setPrintOpen] = React.useState(false);
  const [choosingPrint, setChoosingPrint] = React.useState(false);
  const PRINT_BASE = (process.env.REACT_APP_PRINT_BASE as string) || "http://localhost:9009";

  // ===============================
  // Loyalty Redeem (policy from admin) + ✅ server calc
  // ===============================
  const [redeemPolicy, setRedeemPolicy] = React.useState<any>(null);

  const [redeemOn, setRedeemOn] = React.useState(false);
  const [redeemPointsText, setRedeemPointsText] = React.useState("");

  // ✅ server-truth result
  const [redeemCalc, setRedeemCalc] = React.useState<{
    points: number;
    amount: number;
    maxPoints: number;
    customerPoints: number;
    policy?: any;
    redeemEnable?: boolean;
  } | null>(null);

  const [redeemCalcLoading, setRedeemCalcLoading] = React.useState(false);
  const redeemCalcTimer = React.useRef<any>(null);

  const fetchLoyaltySetting = React.useCallback(async () => {
    try {
      const res = await api.get("/loyalty-settings");
      setRedeemPolicy(res.data?.setting || res.data || null);
    } catch {
      setRedeemPolicy(null);
    }
  }, []);

  React.useEffect(() => {
    if (!posReady) return;
    fetchLoyaltySetting();
  }, [posReady, fetchLoyaltySetting]);

  // ===============================
  // Reset per order tab (✅ CHỈ 1 effect, không trùng)
  // ===============================
  React.useEffect(() => {
    setStep("CART");
    setSubmitting(false);

    // reset customer form
    setCName("");
    setCPhone("");
    setCEmail("");
    setCDob("");
    setCustQ("");
    setSelectedCustomerId("");
    setSelectedCustomerInfo(null);
    setCAddress("");
    setCNote("");
    setDeliveryMethod("PICKUP");

    // pricing
    setDiscount("0");
    setExtraFee("0");
    setPricingNote("");
    setBulkQty({});

    // payment
    setSaleStatus("CONFIRM");
    const first = { id: uid(), method: "CASH" as PaymentMethodUI, amountText: "" };
    setPayRows([first]);
    setActivePayRowId(first.id);

    // customer autocomplete UI
    setCustItems([]);
    setCustOpen(false);
    setCustLoading(false);

    // print
    setPrintOpen(false);
    setChoosingPrint(false);

    // redeem
    setRedeemOn(false);
    setRedeemPointsText("");
    setRedeemCalc(null);
    setRedeemCalcLoading(false);

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentOrderId]);

  // sync tên khách nhanh từ order -> form
  React.useEffect(() => {
    if (!currentOrder) return;
    if (!cName) setCName(currentOrder.customer || "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentOrderId]);

  // ===============================
  // Customer Autocomplete handlers
  // ===============================
  const fetchCustomers = React.useCallback(async (q: string) => {
    const qs = String(q || "").trim();
    if (!qs) {
      setCustItems([]);
      return;
    }
    setCustLoading(true);
    try {
      const res = await api.get("/customers", { params: { q: qs } });
      const items = (res.data?.items || []) as any[];
      const mapped: CustomerRow[] = items.map((x) => ({
        _id: String(x._id),
        name: x.name || "",
        phone: x.phone || "",
        email: x.email || "",
        dob: x.dob || null,
        tierCode: getTierCode(x.tier),
        points: Number(x.points || 0),
        spendTier: getSpendTier(x),
      }));
      setCustItems(mapped);
    } catch (e: any) {
      console.error("fetchCustomers error:", e?.response?.data || e?.message);
      setCustItems([]);
    } finally {
      setCustLoading(false);
    }
  }, []);

  const onCustomerInput = (v: string) => {
    setCustQ(v);
    setCName(v);
    setCustOpen(true);

    if (custFetchTimer.current) clearTimeout(custFetchTimer.current);
    custFetchTimer.current = setTimeout(() => {
      fetchCustomers(v);
    }, 250);
  };

  const pickCustomer = (c: CustomerRow) => {
    const name = String(c.name || "").trim() || "Khách lẻ";
    const phone = String(c.phone || "").trim();
    const email = String(c.email || "").trim();
    const dob = fmtDobInput(c.dob);

    setSelectedCustomerId(String(c._id));
    setSelectedCustomerInfo(c);

    setCName(name);
    setCPhone(phone);
    setCEmail(email);
    setCDob(dob);

    // reset redeem when picking another customer
    setRedeemOn(false);
    setRedeemPointsText("");
    setRedeemCalc(null);

    setCustOpen(false);
    setCustItems([]);
    setCustQ(`${name} - ${phone || ""}`.trim());
  };

  const refetchSelectedCustomer = React.useCallback(async () => {
    const cid = String(selectedCustomerId || "").trim();
    if (!cid) return;
    try {
      const res = await api.get(`/customers/${cid}`);
      const x = res.data?.customer || res.data?.item || res.data || {};
      const next: CustomerRow = {
        _id: String(x._id || cid),
        name: x.name || "",
        phone: x.phone || "",
        email: x.email || "",
        dob: x.dob || null,
        tierCode: getTierCode(x.tier),
        points: Number(x.points || 0),
        spendTier: getSpendTier(x),
      };
      setSelectedCustomerInfo(next);
    } catch {
      // ignore
    }
  }, [selectedCustomerId]);

  // ===============================
  // Totals
  // ===============================
  const subtotalAmount = currentOrder ? Number(getTotal(currentOrder.id) || 0) : 0;
  const discountNum = clamp0(toNumberSafe(discount));
  const extraFeeNum = clamp0(toNumberSafe(extraFee));
  const finalTotalBeforeRedeem = Math.max(0, subtotalAmount - discountNum + extraFeeNum);

  // redeem enabled?
  const redeemEnabled = !!redeemPolicy?.redeem?.redeemEnable;

  // show policy info only (UI)
  const vndPerPointUI = Number(redeemPolicy?.redeem?.redeemValueVndPerPoint || 0);
  const percentOfBillUI = Number(redeemPolicy?.redeem?.percentOfBill || 0);
  const maxPointsPerOrderUI = Number(redeemPolicy?.redeem?.maxPointsPerOrder || 0);

  const customerPointsUI = Number(selectedCustomerInfo?.points || 0);

  // ✅ server calc applied values (source of truth)
  const redeemPointsNum = Math.max(0, Math.floor(toNumberSafe(redeemPointsText)));
  const redeemPointsApplied = redeemOn ? Math.max(0, Number(redeemCalc?.points || 0)) : 0;
  const redeemAmountVnd = redeemOn ? Math.max(0, Number(redeemCalc?.amount || 0)) : 0;
  const maxRedeemPoints = Math.max(0, Number(redeemCalc?.maxPoints || 0));

  const finalTotal = Math.max(0, finalTotalBeforeRedeem - redeemAmountVnd);

  const paidSum = React.useMemo(() => {
    return payRows.reduce((s, r) => s + clamp0(toNumberSafe(r.amountText)), 0);
  }, [payRows]);

  const debtLeft = Math.max(0, finalTotal - paidSum);

  const canGoCustomer = () => posReady && !!currentOrder && (currentOrder.items?.length || 0) > 0;

  /**
   * Validate:
   * - SHIP: bắt buộc phone + address
   * - PICKUP: phone optional
   */
  const validateCustomer = () => {
    const phone = String(cPhone || "").trim();
    const addr = String(cAddress || "").trim();

    if (deliveryMethod === "SHIP") {
      if (!phone) return { ok: false, msg: "Giao hàng: bắt buộc nhập SĐT." };
      if (!isValidPhone(phone)) return { ok: false, msg: "Giao hàng: SĐT không hợp lệ." };
      if (!addr) return { ok: false, msg: "Giao hàng: bắt buộc nhập địa chỉ." };
    } else {
      if (phone && !isValidPhone(phone)) return { ok: false, msg: "SĐT không hợp lệ." };
    }

    if (discountNum > subtotalAmount) return { ok: false, msg: "Discount không được lớn hơn tạm tính." };

    // Redeem only CONFIRM (FE)
    if (redeemOn && saleStatus !== "CONFIRM") {
      return { ok: false, msg: "Chỉ được sử dụng điểm khi CONFIRM (trả đủ)." };
    }

    // Redeem requires customer
    if (redeemOn && !selectedCustomerId) {
      return { ok: false, msg: "Sử dụng điểm: hãy chọn khách hàng từ danh sách." };
    }

    return { ok: true, msg: "" };
  };

  // ===============================
  // ✅ Redeem server calc
  // ===============================
  const callCalcRedeem = React.useCallback(
    async (pointsInput: number) => {
      if (!redeemEnabled) {
        setRedeemCalc({ points: 0, amount: 0, maxPoints: 0, customerPoints: customerPointsUI, redeemEnable: false });
        return;
      }
      if (!selectedCustomerId) {
        setRedeemCalc(null);
        return;
      }
      if (saleStatus !== "CONFIRM") {
        setRedeemCalc({ points: 0, amount: 0, maxPoints: 0, customerPoints: customerPointsUI, redeemEnable: false });
        return;
      }

      // require phone for server lookup (as per our calc endpoint)
      const phone = String(selectedCustomerInfo?.phone || cPhone || "").trim();
      if (!phone) {
        setRedeemCalc(null);
        return;
      }

      setRedeemCalcLoading(true);
      try {
        const res = await api.post("/loyalty-settings/calc-redeem", {
          branchId: branchFinal,
          phone,
          baseAmount: Math.round(finalTotalBeforeRedeem),
          points: Math.max(0, Math.floor(pointsInput || 0)),
        });

        const d = res.data || {};
        setRedeemCalc({
          points: Number(d.points || 0),
          amount: Number(d.amount || 0),
          maxPoints: Number(d.maxPoints || 0),
          customerPoints: Number(d.customerPoints || customerPointsUI || 0),
          policy: d.policy,
          redeemEnable: !!d.redeemEnable,
        });
      } catch (e: any) {
        console.error("calc-redeem error:", e?.response?.data || e?.message);
        setRedeemCalc(null);
      } finally {
        setRedeemCalcLoading(false);
      }
    },
    [
      redeemEnabled,
      selectedCustomerId,
      selectedCustomerInfo?.phone,
      cPhone,
      saleStatus,
      branchFinal,
      finalTotalBeforeRedeem,
      customerPointsUI,
    ]
  );

  // debounce redeem calc when input changes / total changes
  React.useEffect(() => {
    if (!redeemOn) return;

    // if not CONFIRM, auto turn off
    if (saleStatus !== "CONFIRM") return;

    const p = Math.max(0, Math.floor(redeemPointsNum || 0));

    if (redeemCalcTimer.current) clearTimeout(redeemCalcTimer.current);
    redeemCalcTimer.current = setTimeout(() => {
      callCalcRedeem(p);
    }, 200);

    return () => {
      if (redeemCalcTimer.current) clearTimeout(redeemCalcTimer.current);
    };
  }, [redeemOn, redeemPointsNum, finalTotalBeforeRedeem, saleStatus, callCalcRedeem]);

  // When changing status away from CONFIRM => turn off redeem & calc
  React.useEffect(() => {
    if (saleStatus !== "CONFIRM") {
      setRedeemOn(false);
      setRedeemPointsText("");
      setRedeemCalc(null);
      setRedeemCalcLoading(false);
    }
  }, [saleStatus]);

  // ===============================
  // Payments UI rules
  // ===============================
  const ensurePayRow = React.useCallback(() => {
    setPayRows((prev) => {
      if (prev.length > 0) return prev;
      const first = { id: uid(), method: "CASH" as PaymentMethodUI, amountText: "" };
      setActivePayRowId(first.id);
      return [first];
    });
  }, []);

  const setStatusSafe = (st: SaleStatus) => {
    setSaleStatus(st);

    // ✅ Redeem chỉ khi CONFIRM
    if (st !== "CONFIRM") {
      setRedeemOn(false);
      setRedeemPointsText("");
      setRedeemCalc(null);
    }

    if (st === "PENDING") {
      const first = { id: uid(), method: "CASH" as PaymentMethodUI, amountText: "" };
      setPayRows([first]);
      setActivePayRowId(first.id);
      return;
    }

    ensurePayRow();
  };

  const addPayMethodRow = () => {
    if (saleStatus === "PENDING") {
      message.info("Đang ở PENDING (chưa thu). Chọn CONFIRM hoặc NỢ để chia thanh toán.");
      return;
    }
    const row: PaymentRow = { id: uid(), method: "BANK", amountText: "" };
    setPayRows((prev) => [...prev, row]);
    setActivePayRowId(row.id);
  };

  const removePayRow = (id: string) => {
    setPayRows((prev) => {
      const next = prev.filter((x) => x.id !== id);
      if (next.length === 0) {
        const first = { id: uid(), method: "CASH" as PaymentMethodUI, amountText: "" };
        setActivePayRowId(first.id);
        return [first];
      }
      if (activePayRowId === id) setActivePayRowId(next[0].id);
      return next;
    });
  };

  const updatePayRow = (id: string, patch: Partial<PaymentRow>) => {
    setPayRows((prev) => prev.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  };

  // ✅ FIX: Khi total đổi (do redeem/discount/phí), tự cân dòng active cho multi CONFIRM
  React.useEffect(() => {
    if (saleStatus !== "CONFIRM") return;
    if (payRows.length <= 1) return;

    setPayRows((prev) => {
      const rows = Array.isArray(prev) ? prev : [];
      if (rows.length <= 1) return rows;

      const idx = rows.findIndex((r) => r.id === activePayRowId);
      const activeIdx = idx >= 0 ? idx : 0;

      const amounts = rows.map((r) => clamp0(toNumberSafe(r.amountText)));
      const sumOthers = amounts.reduce((s, n, i) => (i === activeIdx ? s : s + n), 0);

      const remain = Math.max(0, Math.round(finalTotal - sumOthers));
      return rows.map((r, i) => (i === activeIdx ? { ...r, amountText: String(remain) } : r));
    });
  }, [finalTotal, saleStatus, activePayRowId]);

  // ===============================
  // Build payload (✅ always payments[])
  // ===============================
  const buildPayload = () => {
    const nameRaw = String(cName || "").trim();
    const name = nameRaw || "Khách lẻ";

    const phoneRaw = normalizePhone(String(cPhone || ""));
    const phone = phoneRaw || undefined;

    const emailRaw = String(cEmail || "").trim();
    const email = emailRaw ? emailRaw : undefined;

    const dobRaw = String(cDob || "").trim();
    const dob = dobRaw ? dobRaw : undefined;

    const addressRaw = String(cAddress || "").trim();
    const address = addressRaw ? addressRaw : undefined;

    const noteRaw = String(cNote || "").trim();
    const note = noteRaw ? noteRaw : undefined;

    const customerObj =
      deliveryMethod === "SHIP" || phone || email || dob || nameRaw
        ? { name, ...(phone ? { phone } : {}), ...(email ? { email } : {}), ...(dob ? { dob } : {}) }
        : undefined;

    const pricingNoteRaw = String(pricingNote || "").trim();
    const pricingNoteVal = pricingNoteRaw ? pricingNoteRaw : undefined;

    const rows = Array.isArray(payRows) ? payRows : [];
    const normalizedPayments = rows
      .map((r) => ({
        method: r.method,
        amount: clamp0(toNumberSafe(r.amountText)),
      }))
      .filter((x) => !!x.method)
      .map((x) => ({ method: x.method as any, amount: Math.round(x.amount) }));

    let statusForApi: "PENDING" | "CONFIRM" | "DEBT" = saleStatus;

    let paymentsForApi: { method: "CASH" | "BANK" | "CARD" | "WALLET"; amount: number }[] = [];

    if (saleStatus === "PENDING") {
      statusForApi = "PENDING";
      paymentsForApi = [];
    }

    if (saleStatus === "CONFIRM") {
      statusForApi = "CONFIRM";

      if (rows.length <= 1) {
        paymentsForApi = [
          {
            method: (rows[0]?.method || "CASH") as any,
            amount: Math.round(finalTotal),
          },
        ];
      } else {
        paymentsForApi = normalizedPayments as any;
      }
    }

    if (saleStatus === "DEBT") {
      statusForApi = "DEBT";

      if (rows.length <= 1) {
        paymentsForApi = [
          {
            method: (rows[0]?.method || "CASH") as any,
            amount: Math.round(clamp0(toNumberSafe(rows[0]?.amountText))),
          },
        ];
      } else {
        paymentsForApi = normalizedPayments as any;
      }
    }

    const legacyPayment =
      saleStatus === "PENDING"
        ? ({ method: "PENDING", amount: 0 } as const)
        : ({
            method: (paymentsForApi[0]?.method || "CASH") as any,
            amount: Math.round(paymentsForApi[0]?.amount || 0),
          } as const);

    // ✅ redeem send: server truth only
    const canSendRedeem =
      saleStatus === "CONFIRM" &&
      redeemOn &&
      redeemEnabled &&
      !!selectedCustomerId &&
      redeemPointsApplied > 0 &&
      redeemAmountVnd > 0;

    const payload: any = {
      branchId: branchFinal,
      customer: customerObj,
      delivery: {
        method: deliveryMethod,
        ...(deliveryMethod === "SHIP" && address ? { address } : {}),
        note: note || (deliveryMethod === "PICKUP" ? "Bán tại quầy" : ""),
      },

      payments: paymentsForApi,
      payment: legacyPayment,

      discount: Math.round(discountNum),
      extraFee: Math.round(extraFeeNum),
      ...(pricingNoteVal ? { pricingNote: pricingNoteVal } : {}),

      ...(canSendRedeem ? { pointsRedeemed: redeemPointsApplied, pointsRedeemAmount: redeemAmountVnd } : {}),

      statusForApi,
    };

    return payload;
  };

  const validatePaymentLogic = () => {
    if (finalTotal <= 0) return { ok: false, msg: "Tổng thanh toán phải > 0" };

    if (saleStatus === "PENDING") return { ok: true, msg: "" };

    const rows = Array.isArray(payRows) ? payRows : [];
    const amounts = rows.map((r) => Math.round(clamp0(toNumberSafe(r.amountText))));
    const sum = Math.round(amounts.reduce((s, n) => s + n, 0));
    const totalRound = Math.round(finalTotal);

    if (saleStatus === "CONFIRM") {
      if (rows.length <= 1) return { ok: true, msg: "" };

      if (sum !== totalRound) {
        return { ok: false, msg: `Chia nhiều hình thức: tổng (${money(sum)}) phải bằng (${money(totalRound)})` };
      }
      return { ok: true, msg: "" };
    }

    if (rows.length <= 1) {
      const paid = Math.round(clamp0(toNumberSafe(rows[0]?.amountText)));
      if (!(paid > 0)) return { ok: false, msg: "Nợ: cần nhập số tiền đã trả > 0" };
      if (!(paid < totalRound)) return { ok: false, msg: "Nợ: số đã trả phải < tổng thanh toán" };
      return { ok: true, msg: "" };
    }

    if (!(sum > 0)) return { ok: false, msg: "Nợ: tổng đã trả phải > 0" };
    if (!(sum < totalRound)) return { ok: false, msg: "Nợ: tổng đã trả phải < tổng thanh toán" };
    return { ok: true, msg: "" };
  };

  // ✅ thực thi tạo/confirm đơn và trả về _id để in
  const doSubmitPayment = async () => {
    if (!currentOrder || !posReady) {
      if (!posReady) message.warning("POS bắt buộc chọn 1 chi nhánh (không được ALL).");
      return { ok: false as const, orderId: "" };
    }

    const v = validateCustomer();
    if (!v.ok) {
      message.warning(v.msg);
      setStep("CUSTOMER");
      return { ok: false as const, orderId: "" };
    }

    // ✅ redeem calc must be ready if redeemOn
    if (redeemOn && saleStatus === "CONFIRM") {
      if (redeemCalcLoading) {
        message.info("Đang tính điểm theo chính sách... vui lòng thử lại.");
        return { ok: false as const, orderId: "" };
      }
      if (!redeemCalc) {
        message.warning("Không tính được số tiền trừ điểm. Hãy tắt/bật lại Sử dụng điểm hoặc kiểm tra khách hàng.");
        return { ok: false as const, orderId: "" };
      }
    }

    const vp = validatePaymentLogic();
    if (!vp.ok) {
      message.warning(vp.msg);
      setStep("PAYMENT");
      return { ok: false as const, orderId: "" };
    }

    const payload = buildPayload();

    const key = "pos-submit";
    setSubmitting(true);
    message.loading({ content: "Đang xử lý đơn hàng...", key });

    try {
      let orderId = "";

      if (completeOrderWithStatus) {
        const res: any = await completeOrderWithStatus(payload.statusForApi, payload as any);
        orderId = String(res?._id || res?.order?._id || res?.data?._id || "");
      } else {
        await Promise.resolve(completeOrder());
      }

      message.success({ content: "Thành công!", key, duration: 2 });

      // refresh customer info (points may change by redeem/earn)
      await refetchSelectedCustomer();

      setStep("CART");

      // reset nhẹ
      setCAddress("");
      setCNote("");
      setDiscount("0");
      setExtraFee("0");
      setPricingNote("");
      setBulkQty({});

      // reset redeem
      setRedeemOn(false);
      setRedeemPointsText("");
      setRedeemCalc(null);

      // reset payment UI
      setStatusSafe("CONFIRM");
      const first = { id: uid(), method: "CASH" as PaymentMethodUI, amountText: "" };
      setPayRows([first]);
      setActivePayRowId(first.id);

      return { ok: true as const, orderId };
    } catch (e: any) {
      console.error("submit error:", e?.response?.data || e?.message);
      message.error({
        content: e?.response?.data?.message || e?.message || "Không tạo đơn / thanh toán được.",
        key,
        duration: 3,
      });
      return { ok: false as const, orderId: "" };
    } finally {
      setSubmitting(false);
    }
  };

  // ✅ nút Hoàn tất đơn: chỉ mở modal chọn in/không in
  const onSubmitPayment = async () => {
    if (!currentOrder || !posReady) {
      if (!posReady) message.warning("POS bắt buộc chọn 1 chi nhánh (không được ALL).");
      return;
    }

    const v = validateCustomer();
    if (!v.ok) {
      message.warning(v.msg);
      setStep("CUSTOMER");
      return;
    }

    if (redeemOn && saleStatus === "CONFIRM") {
      if (redeemCalcLoading) {
        message.info("Đang tính điểm theo chính sách... vui lòng thử lại.");
        return;
      }
      if (!redeemCalc) {
        message.warning("Không tính được số tiền trừ điểm. Hãy tắt/bật lại Sử dụng điểm hoặc kiểm tra khách hàng.");
        return;
      }
    }

    const vp = validatePaymentLogic();
    if (!vp.ok) {
      message.warning(vp.msg);
      setStep("PAYMENT");
      return;
    }

    setPrintOpen(true);
  };

  // ===============================
  // Products filter
  // ===============================
  const filteredProducts = React.useMemo(() => {
    const s = searchTerm.trim().toLowerCase();
    const list = (products || []).filter((p) => p?.isActive !== false);

    const sorted = [...list].sort((a, b) => {
      const an = String(a.name || "").toLowerCase();
      const bn = String(b.name || "").toLowerCase();
      const c = an.localeCompare(bn, "vi");
      if (c !== 0) return c;
      return String(a._id).localeCompare(String(b._id));
    });

    if (!s) return sorted;

    return sorted.filter((p) => {
      const name = String(p.name || "").toLowerCase();
      const barcode = String(p.barcode || "").toLowerCase();
      const sku = String(p.sku || "").toLowerCase();
      const brand = String(p.brand || "").toLowerCase();
      return name.includes(s) || barcode.includes(s) || sku.includes(s) || brand.includes(s);
    });
  }, [products, searchTerm]);

  const onPickProduct = (p: Product) => {
    if (!posReady) {
      message.warning("POS bắt buộc chọn 1 chi nhánh trước.");
      return;
    }
    addToCart(p);
    message.success({ content: `Đã thêm "${p.name}" vào giỏ`, key: "add-cart", duration: 0.8 });
  };

  // tồn còn lại trong giỏ
  const remainingStockForItem = (item: OrderItem) => {
    const base = Number(item.stock || 0);
    const q = Number(item.quantity || 0);
    return base - q;
  };

  // bulk set qty
  const applyBulkQty = (productId: string) => {
    if (!posReady) return;
    const raw = String(bulkQty[productId] ?? "").trim();
    const target = Math.max(0, Math.floor(toNumberSafe(raw)));
    if (!currentOrder) return;

    const it = currentOrder.items.find((x) => x._id === productId);
    const current = Number(it?.quantity || 0);

    if (!it) {
      if (target <= 0) return;
      const prod = products.find((p) => p._id === productId);
      if (!prod) return;
      addToCart(prod);
      if (target - 1 > 0) updateQuantity(productId, target - 1);
      return;
    }

    const delta = target - current;
    if (delta === 0) return;
    updateQuantity(productId, delta);
  };

  const StepTabs = () => (
    <div className="bg-white rounded-lg border border-gray-200 p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setStep("CART")}
            className={`px-3 py-2 rounded-lg text-sm font-bold ${
              step === "CART" ? "bg-pink-500 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            1) Giỏ hàng
          </button>

          <button
            type="button"
            onClick={() => {
              if (!canGoCustomer()) {
                if (!posReady) message.warning("POS bắt buộc chọn 1 chi nhánh (không được ALL).");
                else message.warning("Giỏ hàng đang trống.");
                return;
              }
              setStep("CUSTOMER");
            }}
            disabled={!canGoCustomer()}
            className={`px-3 py-2 rounded-lg text-sm font-bold ${
              step === "CUSTOMER" ? "bg-pink-500 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            } ${!canGoCustomer() ? "opacity-60 cursor-not-allowed" : ""}`}
          >
            2) Khách hàng
          </button>

          <button
            type="button"
            onClick={() => {
              if (!canGoCustomer()) {
                if (!posReady) message.warning("POS bắt buộc chọn 1 chi nhánh (không được ALL).");
                else message.warning("Giỏ hàng đang trống.");
                return;
              }
              const v = validateCustomer();
              if (!v.ok) {
                message.warning(v.msg);
                setStep("CUSTOMER");
                return;
              }
              setStep("PAYMENT");
            }}
            disabled={!canGoCustomer()}
            className={`px-3 py-2 rounded-lg text-sm font-bold ${
              step === "PAYMENT" ? "bg-pink-500 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            } ${!canGoCustomer() ? "opacity-60 cursor-not-allowed" : ""}`}
          >
            3) Thanh toán
          </button>
        </div>

        <div className="text-xs text-gray-500 text-right">
          <div>
            Tạm tính: <b className="text-gray-800">{money(subtotalAmount)}đ</b>
          </div>
          <div>
            Tổng: <b className="text-gray-900">{money(finalTotal)}đ</b>
          </div>
        </div>
      </div>
    </div>
  );

  // ===============================
  // RENDER
  // ===============================
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Left - Products */}
      <div className="lg:col-span-2 space-y-4">
        {/* Search */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm sản phẩm (tên / SKU / barcode / brand)..."
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent outline-none"
            />
          </div>
        </div>

        {/* Products Grid */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-800">Sản Phẩm ({filteredProducts.length})</h3>
            <div className="text-xs text-gray-500">Click để thêm vào giỏ</div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {filteredProducts.map((p) => {
              const img = getPrimaryImage(p);
              const disabled = !posReady;

              return (
                <button
                  key={p._id}
                  onClick={() => onPickProduct(p)}
                  disabled={disabled}
                  className={`group rounded-lg overflow-hidden transition-all text-left border ${
                    disabled
                      ? "bg-gray-50 border-gray-200 opacity-60 cursor-not-allowed"
                      : "bg-white border-gray-200 hover:border-pink-300 hover:shadow-sm"
                  }`}
                  title={!posReady ? "POS bắt buộc chọn 1 chi nhánh" : p.name}
                >
                  <div className="relative w-full aspect-square bg-gray-50">
                    {img ? (
                      <img
                        src={img}
                        alt={p.name}
                        className={`w-full h-full object-cover transition-transform ${disabled ? "" : "group-hover:scale-[1.02]"}`}
                        loading="lazy"
                        onError={(e) => ((e.currentTarget as HTMLImageElement).style.display = "none")}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400 text-3xl">🧴</div>
                    )}
                  </div>

                  <div className="p-3">
                    <div className="text-sm font-semibold text-gray-800 line-clamp-2 min-h-[40px]">{p.name}</div>
                    <div className="mt-1 text-[11px] text-gray-500 truncate">
                      {p.sku ? `SKU: ${p.sku}` : p.barcode ? `BC: ${p.barcode}` : ""}
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-pink-600">{money(p.price)}đ</span>
                      <span className="text-xs text-gray-500">SL: {Number(p.stock || 0)}</span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {filteredProducts.length === 0 && (
            <div className="py-10 text-center text-sm text-gray-500">Không tìm thấy sản phẩm phù hợp.</div>
          )}
        </div>
      </div>

      {/* Right - Cart / Flow */}
      <div className="space-y-4">
        {/* Order Tabs */}
        <div className="bg-white rounded-lg border border-gray-200 p-3">
          <div className="flex flex-wrap gap-2">
            {activeOrders.map((order) => (
              <button
                key={order.id}
                onClick={() => posReady && setCurrentOrderId(order.id)}
                className={`px-3 py-2 rounded-lg font-medium text-sm transition-all flex items-center gap-2 ${
                  order.id === currentOrderId ? "bg-pink-500 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                } ${!posReady ? "opacity-60 cursor-not-allowed" : ""}`}
                title={!posReady ? "Chọn chi nhánh ở Layout trước" : ""}
              >
                <span className="whitespace-nowrap">{order.orderNumber}</span>

                {order.id !== currentOrderId && order.id !== 1 && (
                  <span
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!posReady) return;
                      deleteOrder(order.id);
                    }}
                    className={`ml-1 inline-flex items-center justify-center w-5 h-5 rounded ${
                      order.id === currentOrderId ? "text-white/80" : "text-gray-500 hover:text-red-600"
                    }`}
                    title="Đóng đơn"
                  >
                    ×
                  </span>
                )}
              </button>
            ))}

            <button
              onClick={() => {
                if (!posReady) {
                  message.warning("Chọn chi nhánh ở Layout trước.");
                  return;
                }
                createNewOrder();
              }}
              className={`px-3 py-2 rounded-lg bg-pink-50 text-pink-600 hover:bg-pink-100 font-medium text-sm flex items-center gap-1 ${
                !posReady ? "opacity-60 cursor-not-allowed" : ""
              }`}
              title={!posReady ? "Chọn chi nhánh ở Layout trước" : ""}
            >
              <Plus className="w-4 h-4" />
              Thêm
            </button>
          </div>
        </div>

        <StepTabs />

        <div className="bg-white rounded-lg border border-gray-200 flex flex-col">
          {/* Header */}
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-pink-500" />
                <h3 className="font-semibold text-gray-800">
                  {step === "CART" ? "Giỏ hàng" : step === "CUSTOMER" ? "Thông tin khách hàng" : "Thanh toán"}
                </h3>
              </div>

              {step !== "CART" && (
                <button
                  className="inline-flex items-center gap-2 text-sm font-bold text-gray-700 hover:text-gray-900"
                  onClick={() => setStep(step === "PAYMENT" ? "CUSTOMER" : "CART")}
                >
                  <ArrowLeft className="w-4 h-4" />
                  Quay lại
                </button>
              )}
            </div>

            {!posReady && (
              <div className="mt-3 text-xs text-gray-600 bg-gray-50 border border-gray-200 rounded-lg p-2">
                POS bắt buộc chọn 1 chi nhánh (không được ALL).
              </div>
            )}
          </div>

          {/* CART */}
          {step === "CART" && (
            <>
              <div className="flex-1 overflow-y-auto p-3 max-h-[55vh]">
                {currentOrder && currentOrder.items.length > 0 ? (
                  <div className="space-y-2">
                    {currentOrder.items.map((item) => {
                      const img = getPrimaryImage(item);
                      const remaining = remainingStockForItem(item);

                      return (
                        <div key={item._id} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                          <div className="flex items-start gap-3 mb-2">
                            <div className="w-14 h-14 rounded-lg overflow-hidden border border-gray-200 bg-white flex-shrink-0">
                              {img ? (
                                <img
                                  src={img}
                                  alt={item.name}
                                  className="w-full h-full object-cover"
                                  loading="lazy"
                                  onError={(e) => ((e.currentTarget as HTMLImageElement).style.display = "none")}
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-400 text-xl">🧴</div>
                              )}
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <h4 className="font-semibold text-sm text-gray-800 truncate">{item.name}</h4>
                              </div>

                              <div className="text-[11px] text-gray-500 truncate">
                                {item.categoryName || ""} {item.sku ? ` • ${item.sku}` : ""}
                              </div>

                              <p className="text-xs text-pink-600 font-semibold mt-1">{money(item.price)}đ</p>

                              <div className="mt-2 flex items-center gap-2 flex-wrap">
                                <input
                                  value={bulkQty[item._id] ?? ""}
                                  onChange={(e) => setBulkQty((m) => ({ ...m, [item._id]: e.target.value }))}
                                  onKeyDown={(e) => e.key === "Enter" && applyBulkQty(item._id)}
                                  placeholder="Nhập SL (vd: 50)"
                                  inputMode="numeric"
                                  className="w-28 px-2 py-1.5 border border-gray-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-pink-500"
                                  disabled={!posReady}
                                />
                                <button
                                  type="button"
                                  onClick={() => applyBulkQty(item._id)}
                                  disabled={!posReady}
                                  className={`px-2.5 py-1.5 rounded-lg text-xs font-extrabold border ${
                                    posReady ? "bg-white hover:bg-gray-50 border-gray-300" : "bg-gray-100 border-gray-200"
                                  }`}
                                >
                                  Set
                                </button>

                                <div className="text-xs text-gray-600">
                                  tồn hiển thị: <b>{Number(item.stock ?? 0)}</b> • tồn còn lại:{" "}
                                  <b className={remaining < 0 ? "text-red-700" : ""}>{remaining}</b>
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 flex-wrap">
                              <button
                                onClick={() => posReady && updateQuantity(item._id, -1)}
                                className={`p-1 rounded ${posReady ? "bg-gray-200 hover:bg-gray-300" : "bg-gray-200 opacity-60"}`}
                                disabled={!posReady}
                              >
                                <Minus className="w-3 h-3 text-gray-600" />
                              </button>

                              <span className="w-6 text-center font-semibold text-sm">{item.quantity}</span>

                              <button
                                onClick={() => posReady && updateQuantity(item._id, 1)}
                                className={`p-1 rounded ${posReady ? "bg-pink-500 hover:bg-pink-600" : "bg-gray-300"}`}
                                disabled={!posReady}
                              >
                                <Plus className="w-3 h-3 text-white" />
                              </button>
                            </div>

                            <div className="flex items-center gap-2">
                              <span className="font-bold text-sm text-gray-800">{money(item.price * item.quantity)}đ</span>
                              <button
                                onClick={() => posReady && removeFromCart(item._id)}
                                className={`p-1 rounded ${posReady ? "bg-red-50 hover:bg-red-100" : "bg-red-50 opacity-60"}`}
                                disabled={!posReady}
                              >
                                <Trash2 className="w-3 h-3 text-red-500" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-center py-10">
                    <ShoppingBag className="w-12 h-12 text-gray-300 mb-2" />
                    <p className="text-gray-500 text-sm">Chưa có sản phẩm</p>
                  </div>
                )}
              </div>

              <div className="p-4 border-t border-gray-200 bg-gray-50">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-600 font-medium">Tạm tính:</span>
                  <span className="text-lg font-bold text-gray-800">{money(subtotalAmount)}đ</span>
                </div>

                <button
                  onClick={() => {
                    if (!canGoCustomer()) {
                      if (!posReady) message.warning("POS bắt buộc chọn 1 chi nhánh (không được ALL).");
                      else message.warning("Giỏ hàng đang trống.");
                      return;
                    }
                    setStep("CUSTOMER");
                  }}
                  disabled={!canGoCustomer()}
                  className="w-full bg-pink-500 hover:bg-pink-600 text-white py-3 rounded-lg font-semibold disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  Tiếp Tục
                </button>
              </div>
            </>
          )}

          {/* CUSTOMER */}
          {step === "CUSTOMER" && (
            <div className="p-4 space-y-4">
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Tạm tính</span>
                  <span className="font-extrabold text-gray-900">{money(subtotalAmount)}đ</span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs font-bold text-gray-700 flex items-center gap-1">
                      <Gift className="w-4 h-4" /> Giảm Giá
                    </label>
                    <input
                      value={discount}
                      onChange={(e) => setDiscount(e.target.value)}
                      className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-pink-500 text-sm"
                      placeholder="0"
                      inputMode="numeric"
                      disabled={!posReady}
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-gray-700 flex items-center gap-1">
                      <Tag className="w-4 h-4" /> Phụ phí
                    </label>
                    <input
                      value={extraFee}
                      onChange={(e) => setExtraFee(e.target.value)}
                      className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-pink-500 text-sm"
                      placeholder="0"
                      inputMode="numeric"
                      disabled={!posReady}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-700 flex items-center gap-1">
                    <Truck className="w-4 h-4" /> Ghi chú phí (ship/gói quà…)
                  </label>
                  <input
                    value={pricingNote}
                    onChange={(e) => setPricingNote(e.target.value)}
                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-pink-500 text-sm"
                    placeholder="VD: Ship nội thành / Gói quà"
                    disabled={!posReady}
                  />
                </div>

                <div className="flex items-center justify-between text-sm border-t pt-2">
                  <span className="text-gray-700 font-bold">Tổng trước trừ điểm</span>
                  <span className="text-gray-900 font-extrabold">{money(finalTotalBeforeRedeem)}đ</span>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-700 font-bold">Tổng thanh toán</span>
                  <span className="text-gray-900 font-extrabold">{money(finalTotal)}đ</span>
                </div>

                {redeemOn && redeemEnabled && redeemPointsApplied > 0 && (
                  <div className="text-[11px] text-gray-600">
                    Trừ điểm: <b>{money(redeemPointsApplied)}</b> điểm = <b>{money(redeemAmountVnd)}đ</b>
                    {redeemCalcLoading ? <span className="ml-2 text-gray-500">(đang tính...)</span> : null}
                  </div>
                )}
              </div>

              {/* Autocomplete customer */}
              <div className="relative">
                <label className="text-sm font-semibold text-gray-700">Tên khách</label>
                <input
                  value={custQ}
                  onChange={(e) => onCustomerInput(e.target.value)}
                  onFocus={() => {
                    setCustOpen(true);
                    if (custQ.trim()) fetchCustomers(custQ);
                  }}
                  onBlur={() => setTimeout(() => setCustOpen(false), 150)}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-pink-500"
                  placeholder='Nhập tên/sđt... (gợi ý "name - sdt")'
                  disabled={!posReady}
                />

                {custOpen && posReady && custQ.trim() && (
                  <div className="absolute z-[50] left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
                    {custLoading ? (
                      <div className="p-3 text-sm text-gray-500">Đang tìm khách...</div>
                    ) : custItems.length ? (
                      <div className="max-h-56 overflow-y-auto">
                        {custItems.map((c: any) => {
                          const label = `${String(c.name || "").trim() || "Khách"} - ${String(c.phone || "").trim()}`;
                          return (
                            <button
                              type="button"
                              key={c._id}
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => pickCustomer(c)}
                              className="w-full text-left px-3 py-2 hover:bg-pink-50 border-b border-gray-100"
                            >
                              <div className="text-sm font-semibold text-gray-800">{label}</div>
                              <div className="text-[11px] text-gray-500">
                                {c.email ? `Email: ${c.email}` : "—"}
                                {typeof c.points === "number" ? ` • Điểm: ${money(c.points)}` : ""}
                                {c.tierCode ? ` • Hạng: ${c.tierCode}` : ""}
                                {typeof c.spendTier === "number" ? ` • Tổng(hạng): ${money(c.spendTier)}đ` : ""}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="p-3 text-sm text-gray-500">Không thấy khách phù hợp.</div>
                    )}
                  </div>
                )}
              </div>

              {/* Show loyalty quick */}
              {selectedCustomerId && (
                <div className="bg-white border border-gray-200 rounded-lg p-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Hạng</span>
                    <b className="text-gray-900">{selectedCustomerInfo?.tierCode || "—"}</b>
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-gray-600">Điểm</span>
                    <b className="text-gray-900">{money(selectedCustomerInfo?.points || 0)}</b>
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-gray-600">Tổng trong hạng</span>
                    <b className="text-gray-900">{money(selectedCustomerInfo?.spendTier || 0)}đ</b>
                  </div>
                </div>
              )}

              {/* phone */}
              <div>
                <label className="text-sm font-semibold text-gray-700">
                  SĐT {deliveryMethod === "SHIP" ? "*" : "(tuỳ chọn)"}
                </label>
                <input
                  value={cPhone}
                  onChange={(e) => {
                    setCPhone(e.target.value);
                    setSelectedCustomerId("");
                    setSelectedCustomerInfo(null);
                    setRedeemOn(false);
                    setRedeemPointsText("");
                    setRedeemCalc(null);
                  }}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-pink-500"
                  placeholder="VD: 0909123456"
                  disabled={!posReady}
                />
              </div>

              {(!!selectedCustomerId || !!normalizePhone(cPhone)) && (
                <div>
                  <label className="text-sm font-semibold text-gray-700">Ngày sinh</label>
                  <input
                    type="date"
                    value={cDob}
                    onChange={(e) => setCDob(e.target.value)}
                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-pink-500"
                    disabled={!posReady}
                  />
                </div>
              )}

              {/* email */}
              <div>
                <label className="text-sm font-semibold text-gray-700">Email (tuỳ chọn)</label>
                <input
                  value={cEmail}
                  onChange={(e) => {
                    setCEmail(e.target.value);
                    setSelectedCustomerId("");
                    setSelectedCustomerInfo(null);
                    setRedeemOn(false);
                    setRedeemPointsText("");
                    setRedeemCalc(null);
                  }}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-pink-500"
                  placeholder="VD: a@gmail.com"
                  disabled={!posReady}
                />
              </div>

              {/* delivery switch */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setDeliveryMethod("PICKUP")}
                  className={`px-3 py-2 rounded-lg border text-sm font-bold ${
                    deliveryMethod === "PICKUP"
                      ? "bg-pink-500 text-white border-pink-500"
                      : "bg-white hover:bg-gray-50 border-gray-200"
                  }`}
                  disabled={!posReady}
                >
                  Nhận tại quầy
                </button>
                <button
                  type="button"
                  onClick={() => setDeliveryMethod("SHIP")}
                  className={`px-3 py-2 rounded-lg border text-sm font-bold ${
                    deliveryMethod === "SHIP"
                      ? "bg-pink-500 text-white border-pink-500"
                      : "bg-white hover:bg-gray-50 border-gray-200"
                  }`}
                  disabled={!posReady}
                >
                  Giao hàng
                </button>
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-700">
                  Địa chỉ {deliveryMethod === "SHIP" ? "*" : "(tuỳ chọn)"}
                </label>
                <textarea
                  value={cAddress}
                  onChange={(e) => setCAddress(e.target.value)}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-pink-500 min-h-[70px]"
                  placeholder="Số nhà, đường, phường/xã, quận/huyện..."
                  disabled={!posReady}
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-700">Ghi chú (tuỳ chọn)</label>
                <textarea
                  value={cNote}
                  onChange={(e) => setCNote(e.target.value)}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-pink-500 min-h-[70px]"
                  placeholder="VD: gọi trước khi giao / gói quà..."
                  disabled={!posReady}
                />
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => {
                    const v = validateCustomer();
                    if (!v.ok) {
                      message.warning(v.msg);
                      return;
                    }
                    setStep("PAYMENT");
                  }}
                  disabled={!posReady || !currentOrder}
                  className="w-full bg-pink-500 hover:bg-pink-600 text-white py-3 rounded-lg font-extrabold disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  Thanh Toán
                </button>
              </div>
            </div>
          )}

          {/* PAYMENT */}
          {step === "PAYMENT" && (
            <div className="p-4 space-y-4">
              {/* Summary */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Khách</span>
                  <span className="font-bold text-gray-900">{String(cName || currentOrder?.customer || "Khách lẻ")}</span>
                </div>

                <div className="flex items-center justify-between text-sm mt-1">
                  <span className="text-gray-600">Tổng thanh toán</span>
                  <span className="text-gray-900 font-extrabold text-lg">{money(finalTotal)}đ</span>
                </div>

                <div className="text-[11px] text-gray-500 mt-1">
                  Tạm tính: {money(subtotalAmount)}đ • Discount: {money(discountNum)}đ • Phụ phí: {money(extraFeeNum)}đ
                  {redeemOn && redeemEnabled && redeemPointsApplied > 0 ? (
                    <>
                      {" "}
                      • Trừ điểm: {money(redeemPointsApplied)} ({money(redeemAmountVnd)}đ)
                      {redeemCalcLoading ? " (đang tính...)" : ""}
                    </>
                  ) : null}
                </div>

                {saleStatus === "DEBT" && (
                  <div className="mt-2 text-sm border-t pt-2 flex items-center justify-between">
                    <span className="text-gray-600">Đã trả</span>
                    <b className="text-gray-900">{money(paidSum)}đ</b>
                    <span className="text-gray-600">Còn nợ</span>
                    <b className="text-red-700">{money(debtLeft)}đ</b>
                  </div>
                )}
              </div>

              {/* ✅ Redeem Box (CONFIRM only) */}
              {redeemEnabled && selectedCustomerId && (
                <div className="bg-white border border-gray-200 rounded-lg p-3">
                  <div className="flex items-center justify-between gap-3">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={redeemOn}
                        disabled={saleStatus !== "CONFIRM"}
                        onChange={(e) => {
                          const next = e.target.checked;
                          setRedeemOn(next);
                          if (!next) {
                            setRedeemPointsText("");
                            setRedeemCalc(null);
                            return;
                          }

                          // bật lên -> gợi ý: nếu đã có maxPoints từ server lần trước thì dùng, còn không thì set 0 rồi server calc
                          const suggest = String(redeemCalc?.maxPoints || 0);
                          setRedeemPointsText(suggest === "0" ? "0" : suggest);
                          // kick calc ngay
                          callCalcRedeem(Math.max(0, Math.floor(toNumberSafe(suggest))));
                        }}
                        className="w-4 h-4 accent-pink-500"
                      />
                      <span className="font-extrabold text-gray-900 flex items-center gap-2">
                        <Gift className="w-4 h-4" />
                        Sử dụng điểm
                      </span>
                    </label>

                    <div className="text-xs text-gray-600 text-right">
                      <div>
                        Điểm hiện có: <b className="text-gray-900">{money(customerPointsUI)}</b>
                      </div>
                      <div>
                        Tối đa dùng: <b className="text-gray-900">{money(maxRedeemPoints)}</b>
                      </div>
                    </div>
                  </div>

                  <div className="mt-2 text-[11px] text-gray-500">
                    Quy đổi (policy):{" "}
                    <b>1 điểm = {money(vndPerPointUI)}đ</b>
                    {percentOfBillUI > 0 ? (
                      <>
                        {" "}
                        • Giới hạn theo % hóa đơn: <b>{percentOfBillUI}%</b>
                      </>
                    ) : null}
                    {maxPointsPerOrderUI > 0 ? (
                      <>
                        {" "}
                        • Max/đơn: <b>{money(maxPointsPerOrderUI)} điểm</b>
                      </>
                    ) : null}
                    {redeemCalcLoading ? <span className="ml-2">(đang tính...)</span> : null}
                  </div>

                  {saleStatus !== "CONFIRM" && (
                    <div className="mt-2 text-[11px] text-amber-600">Chỉ dùng điểm khi CONFIRM (trả đủ).</div>
                  )}

                  {redeemOn && saleStatus === "CONFIRM" && (
                    <div className="mt-3">
                      <label className="text-sm font-semibold text-gray-700">Nhập số điểm muốn dùng</label>
                      <input
                        value={redeemPointsText}
                        onChange={(e) => setRedeemPointsText(e.target.value)}
                        inputMode="numeric"
                        placeholder={`VD: 100`}
                        className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-pink-500 text-sm"
                      />

                      <div className="mt-2 flex items-center justify-between text-sm">
                        <span className="text-gray-600">Điểm áp dụng</span>
                        <b className="text-gray-900">{money(redeemPointsApplied)}</b>
                      </div>

                      <div className="mt-1 flex items-center justify-between text-sm">
                        <span className="text-gray-600">Giảm</span>
                        <b className="text-green-700">-{money(redeemAmountVnd)}đ</b>
                      </div>

                      <div className="mt-2 text-[11px] text-gray-500">
                        Tổng sau trừ điểm: <b className="text-gray-900">{money(finalTotal)}đ</b>
                        <button
                          type="button"
                          onClick={() => setRedeemPointsText(String(maxRedeemPoints))}
                          className="ml-2 text-pink-600 font-extrabold hover:underline"
                        >
                          Dùng tối đa
                        </button>
                      </div>

                      {redeemPointsNum > 0 && redeemPointsApplied !== redeemPointsNum ? (
                        <div className="mt-1 text-[11px] text-amber-600">
                          Điểm bạn nhập vượt giới hạn, hệ thống tự giảm về {money(redeemPointsApplied)} điểm (theo policy server).
                        </div>
                      ) : null}

                      {!redeemCalc && !redeemCalcLoading ? (
                        <div className="mt-1 text-[11px] text-red-600">
                          Không tính được redeem. Kiểm tra endpoint /loyalty-settings/calc-redeem hoặc dữ liệu khách hàng.
                        </div>
                      ) : null}
                    </div>
                  )}
                </div>
              )}

              {/* Status selection */}
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setStatusSafe("CONFIRM")}
                  className={`px-3 py-2 rounded-lg border text-sm font-extrabold ${
                    saleStatus === "CONFIRM"
                      ? "bg-green-600 text-white border-green-600"
                      : "bg-white hover:bg-gray-50 border-gray-200"
                  }`}
                >
                  CONFIRM
                  <div className="text-[11px] font-medium opacity-90">Đã thu đủ</div>
                </button>

                <button
                  type="button"
                  onClick={() => setStatusSafe("PENDING")}
                  className={`px-3 py-2 rounded-lg border text-sm font-extrabold ${
                    saleStatus === "PENDING"
                      ? "bg-yellow-400 text-gray-900 border-yellow-400"
                      : "bg-white hover:bg-gray-50 border-gray-200"
                  }`}
                >
                  PENDING
                  <div className="text-[11px] font-medium opacity-90">Chưa thu</div>
                </button>

                <button
                  type="button"
                  onClick={() => setStatusSafe("DEBT")}
                  className={`px-3 py-2 rounded-lg border text-sm font-extrabold ${
                    saleStatus === "DEBT" ? "bg-red-600 text-white border-red-600" : "bg-white hover:bg-gray-50 border-gray-200"
                  }`}
                >
                  NỢ
                  <div className="text-[11px] font-medium opacity-90">Thu thiếu</div>
                </button>
              </div>

              {/* Payment Methods UI */}
              {saleStatus !== "PENDING" && (
                <div className="bg-white border border-gray-200 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <div className="font-extrabold text-gray-900 flex items-center gap-2">
                      <CreditCard className="w-4 h-4" />
                      Hình thức thanh toán
                    </div>

                    <button
                      type="button"
                      onClick={addPayMethodRow}
                      className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg bg-pink-50 text-pink-600 hover:bg-pink-100 text-sm font-extrabold"
                      title="Thêm hình thức"
                    >
                      <Plus className="w-4 h-4" />
                      Thêm
                    </button>
                  </div>

                  <div className="mt-3 space-y-2">
                    {payRows.map((r) => {
                      const isActive = r.id === activePayRowId;
                      const isMulti = payRows.length > 1;

                      const showInput =
                        saleStatus === "DEBT"
                          ? isActive
                          : saleStatus === "CONFIRM"
                          ? isMulti
                            ? isActive
                            : false
                          : false;

                      const amountNum = clamp0(toNumberSafe(r.amountText));

                      return (
                        <div
                          key={r.id}
                          className={`rounded-lg border p-2 ${isActive ? "border-pink-300 bg-pink-50" : "border-gray-200 bg-white"}`}
                          onClick={() => setActivePayRowId(r.id)}
                          role="button"
                          tabIndex={0}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <div className="flex items-center gap-1 flex-wrap">
                                {(["CASH", "BANK", "CARD", "WALLET"] as PaymentMethodUI[]).map((m) => (
                                  <button
                                    key={m}
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      updatePayRow(r.id, { method: m });
                                      setActivePayRowId(r.id);
                                    }}
                                    className={`px-2 py-1 rounded-lg text-xs font-extrabold border ${
                                      r.method === m
                                        ? "bg-pink-500 text-white border-pink-500"
                                        : "bg-white border-gray-200 hover:bg-gray-50"
                                    }`}
                                  >
                                    {m}
                                  </button>
                                ))}
                              </div>

                              <div className="text-xs text-gray-700">
                                {saleStatus === "CONFIRM" && payRows.length === 1 ? (
                                  <span>
                                    Số tiền: <b>{money(finalTotal)}đ</b> (auto)
                                  </span>
                                ) : (
                                  <span>
                                    Số tiền: <b>{money(amountNum)}đ</b>
                                  </span>
                                )}
                              </div>
                            </div>

                            {payRows.length > 1 && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  removePayRow(r.id);
                                }}
                                className="p-1 rounded-lg bg-white border border-gray-200 hover:bg-gray-50"
                                title="Xoá hình thức"
                              >
                                <X className="w-4 h-4 text-gray-600" />
                              </button>
                            )}
                          </div>

                          {showInput && (
                            <div className="mt-2">
                              <input
                                value={r.amountText}
                                onChange={(e) => updatePayRow(r.id, { amountText: e.target.value })}
                                inputMode="numeric"
                                placeholder={saleStatus === "DEBT" ? "Nhập số tiền đã trả" : "Nhập số tiền cho hình thức này"}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-pink-500 text-sm"
                              />
                              <div className="mt-1 text-[11px] text-gray-500">
                                {saleStatus === "DEBT"
                                  ? "Nợ: tổng đã trả phải > 0 và < tổng thanh toán."
                                  : "Multi: tổng các hình thức phải = tổng thanh toán (hệ thống sẽ tự cân dòng đang chọn)."}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Action */}
              <button
                type="button"
                onClick={onSubmitPayment}
                disabled={submitting || !posReady || !currentOrder || finalTotal <= 0}
                className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg font-extrabold disabled:bg-green-300 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
              >
                {submitting ? (
                  "Đang xử lý..."
                ) : (
                  <>
                    <CheckCircle2 className="w-5 h-5" />
                    Hoàn tất đơn ({saleStatus})
                  </>
                )}
              </button>

              <div className="text-xs text-gray-500">
                {saleStatus === "PENDING"
                  ? "Tạo đơn PENDING: chưa thu tiền."
                  : saleStatus === "DEBT"
                  ? "Tạo đơn NỢ (DEBT): thu thiếu, còn công nợ."
                  : "Tạo đơn CONFIRM: đã thu đủ (1 hình thức auto số tiền, nhiều hình thức nhập từng dòng)."}
              </div>
            </div>
          )}
        </div>

        {!isStaff && (
          <div className="bg-white rounded-lg border border-gray-200 p-3 text-xs text-gray-600 flex items-center gap-2">
            <Store className="w-4 h-4 text-gray-500" />
            POS Branch: <b className="text-gray-900">{branchFinal || "chưa chọn"}</b>
          </div>
        )}
      </div>

      {/* PRINT CHOICE MODAL */}
      {printOpen && (
        <div className="fixed inset-0 z-[9999] bg-black/40 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-xl shadow-xl overflow-hidden">
            <div className="p-4 border-b border-gray-200">
              <div className="text-lg font-extrabold text-gray-900">Hoàn tất đơn</div>
              <div className="text-sm text-gray-600 mt-1">
                Chọn in bill cho đơn <b>{currentOrder?.orderNumber || "—"}</b>
              </div>
            </div>

            <div className="p-4 space-y-3">
              <button
                type="button"
                disabled={choosingPrint || submitting}
                onClick={async () => {
                  if (choosingPrint) return;
                  setChoosingPrint(true);

                  const r = await doSubmitPayment();
                  if (r.ok) setPrintOpen(false);

                  setChoosingPrint(false);
                }}
                className="w-full px-4 py-3 rounded-lg border border-gray-200 hover:bg-gray-50 font-extrabold text-gray-800 disabled:opacity-60"
              >
                Không in bill
              </button>

              <button
                type="button"
                disabled={choosingPrint || submitting}
                onClick={async () => {
                  if (choosingPrint) return;
                  setChoosingPrint(true);

                  const popup = window.open("about:blank", "_blank", "width=420,height=720");

                  if (!popup) {
                    message.warning("Trình duyệt đang chặn popup. Hãy cho phép popup trong cài đặt trình duyệt.");
                    setChoosingPrint(false);
                    return;
                  }

                  popup.document.write(`
                    <html>
                      <head><title>Đang xử lý...</title></head>
                      <body style="display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;">
                        <div style="text-align:center;">
                          <div style="font-size:24px;margin-bottom:10px;">⏳</div>
                          <div>Đang xử lý đơn hàng...</div>
                        </div>
                      </body>
                    </html>
                  `);

                  const r = await doSubmitPayment();

                  if (r.ok) {
                    const orderId = String(r.orderId || "").trim();
                    if (!orderId) {
                      popup.close();
                      message.warning("Không có _id của đơn để in.");
                      setChoosingPrint(false);
                      return;
                    }

                    const url = `${PRINT_BASE}/print/receipt/${encodeURIComponent(orderId)}?paper=80&autoprint=1`;
                    popup.location.href = url;

                    message.success("Đã mở trang in bill");
                    setPrintOpen(false);
                  } else {
                    popup.close();
                  }

                  setChoosingPrint(false);
                }}
                className="w-full px-4 py-3 rounded-lg bg-pink-500 hover:bg-pink-600 text-white font-extrabold"
              >
                In bill
              </button>

              <button
                type="button"
                disabled={choosingPrint || submitting}
                onClick={() => setPrintOpen(false)}
                className="w-full px-4 py-2 rounded-lg text-sm font-bold text-gray-600 hover:text-gray-900"
              >
                Huỷ
              </button>

              <div className="text-xs text-gray-500">Nếu bị chặn popup, hãy cho phép popup để mở trang in.</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default POSSection;
