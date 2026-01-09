import React from "react";
import { message } from "antd";
import {
  Plus,
  Minus,
  Trash2,
  ShoppingBag,
  CreditCard,
  User,
  Search,
  Store,
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Tag,
  Truck,
  Gift,
} from "lucide-react";

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

type PaymentMethodUI = "CASH" | "BANK" | "PENDING";
type Step = "CART" | "CUSTOMER" | "PAYMENT";

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

  // NEW: App.tsx implement cái này
  completeOrderWithStatus?: (
    status: "PENDING" | "CONFIRM",
    payload: {
      branchId: string;
      customer?: { name?: string; phone?: string; email?: string };
      delivery: { method: "PICKUP" | "DELIVERY"; address?: string; note?: string };
      payment: { method: "CASH" | "BANK" | "PENDING"; amount: number };

      // ✅ NEW pricing fields
      discount: number; // giảm trừ (>=0)
      extraFee: number; // phụ phí (>=0) ví dụ ship/gói quà
      pricingNote?: string; // ghi chú phí
    }
  ) => Promise<void> | void;

  getCurrentOrder: () => Order | undefined;

  branches: Branch[];
  posBranchId: string;
  setPosBranchId: (id: string) => void;
  currentUser: any;
}

const money = (n: any) => Number(n || 0).toLocaleString("vi-VN");

const getPrimaryImage = (p: Product): string | undefined => {
  if (p.thumbnail) return p.thumbnail;
  const primary = p.images?.find((x) => x.isPrimary)?.url;
  if (primary) return primary;
  return p.images?.[0]?.url;
};

const normalizePhone = (s: string) => String(s || "").replace(/\s+/g, "").trim();
const isValidPhone = (s: string) => /^(\+?84|0)\d{8,10}$/.test(normalizePhone(s));

// number helpers
const toNumberSafe = (v: any) => {
  const n = Number(String(v ?? "").replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? n : 0;
};
const clamp0 = (n: number) => (n < 0 ? 0 : n);

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

  // ✅ POS cần 1 branch cụ thể (không cho "all")
  const branchFinal = isStaff ? staffBranch : posBranchId;
  const posReady = !!branchFinal && branchFinal !== "all";

  // ===============================
  // Step flow
  // ===============================
  const [step, setStep] = React.useState<Step>("CART");

  // customer
  const [cName, setCName] = React.useState("");
  const [cPhone, setCPhone] = React.useState("");
  const [cEmail, setCEmail] = React.useState("");
  const [cAddress, setCAddress] = React.useState("");
  const [cNote, setCNote] = React.useState("");
  const [deliveryMethod, setDeliveryMethod] = React.useState<"PICKUP" | "DELIVERY">("PICKUP");

  // pricing
  const [discount, setDiscount] = React.useState<string>("0");
  const [extraFee, setExtraFee] = React.useState<string>("0");
  const [pricingNote, setPricingNote] = React.useState<string>(""); // ví dụ "Ship" / "Gói quà"

  // payment
  const [payMethod, setPayMethod] = React.useState<PaymentMethodUI>("CASH");
  const [submitting, setSubmitting] = React.useState(false);

  // sync tên khách nhanh từ order -> form
  React.useEffect(() => {
    if (!currentOrder) return;
    if (!cName) setCName(currentOrder.customer || "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentOrderId]);

  React.useEffect(() => {
    setStep("CART");
    setPayMethod("CASH");
    setSubmitting(false);

    // reset pricing mỗi tab (tuỳ bạn thích giữ hay reset)
    setDiscount("0");
    setExtraFee("0");
    setPricingNote("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentOrderId]);

  const subtotalAmount = currentOrder ? Number(getTotal(currentOrder.id) || 0) : 0;

  const discountNum = clamp0(toNumberSafe(discount));
  const extraFeeNum = clamp0(toNumberSafe(extraFee));

  const finalTotal = Math.max(0, subtotalAmount - discountNum + extraFeeNum);

  const canGoCustomer = () => posReady && !!currentOrder && (currentOrder.items?.length || 0) > 0;

  /**
   * ✅ Validate theo yêu cầu:
   * - PICKUP: không bắt buộc phone (vãng lai)
   * - DELIVERY: bắt buộc phone + address
   * - name: nếu để trống thì tự fallback "Khách lẻ"
   */
  const validateCustomer = () => {
    const phone = String(cPhone || "").trim();
    const addr = String(cAddress || "").trim();

    if (deliveryMethod === "DELIVERY") {
      if (!phone) return { ok: false, msg: "Giao hàng: bắt buộc nhập SĐT." };
      if (!isValidPhone(phone)) return { ok: false, msg: "Giao hàng: SĐT không hợp lệ." };
      if (!addr) return { ok: false, msg: "Giao hàng: bắt buộc nhập địa chỉ." };
    } else {
      // PICKUP: phone optional, nếu có thì validate
      if (phone && !isValidPhone(phone)) return { ok: false, msg: "SĐT không hợp lệ." };
    }

    // pricing sanity
    if (discountNum > subtotalAmount) return { ok: false, msg: "Discount không được lớn hơn tạm tính." };

    return { ok: true, msg: "" };
  };

  const buildPayload = () => {
    const nameRaw = String(cName || "").trim();
    const name = nameRaw || "Khách lẻ";

    const phoneRaw = normalizePhone(String(cPhone || ""));
    const phone = phoneRaw || undefined;

    const email = String(cEmail || "").trim() || undefined;
    const address = String(cAddress || "").trim() || undefined;
    const note = String(cNote || "").trim() || "";

    // khách vãng lai: pickup + không phone/email + không nhập name -> không gửi customer
    const customerObj =
      deliveryMethod === "DELIVERY" || phone || email || nameRaw ? { name, phone, email } : undefined;

    return {
      branchId: branchFinal,

      customer: customerObj,

      delivery: {
        method: deliveryMethod,
        address: deliveryMethod === "DELIVERY" ? address : undefined,
        note: note || (deliveryMethod === "PICKUP" ? "Bán tại quầy" : undefined),
      },

      // ✅ payment amount: dùng finalTotal (đã cộng/trừ)
      payment: {
        method: payMethod,
        amount: payMethod === "PENDING" ? 0 : finalTotal,
      },

      // ✅ pricing fields
      discount: discountNum,
      extraFee: extraFeeNum,
      pricingNote: String(pricingNote || "").trim() || undefined,
    };
  };

  /**
   * ✅ New behavior:
   * - CASH/BANK -> statusFinal = CONFIRM
   * - PENDING  -> statusFinal = PENDING
   */
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

    const payload = buildPayload();
    const statusFinal: "PENDING" | "CONFIRM" = payMethod === "PENDING" ? "PENDING" : "CONFIRM";

    const key = "pos-submit";
    setSubmitting(true);
    message.loading({ content: "Đang xử lý đơn hàng...", key });

    try {
      if (completeOrderWithStatus) {
        await completeOrderWithStatus(statusFinal, payload);
      } else {
        await Promise.resolve(completeOrder());
      }

      message.success({ content: "Thành công!", key, duration: 2 });

      // reset UI
      setStep("CART");
      setPayMethod("CASH");
      setCPhone("");
      setCEmail("");
      setCAddress("");
      setCNote("");
      setDiscount("0");
      setExtraFee("0");
      setPricingNote("");
      // giữ name để tiện hoặc reset tuỳ bạn:
      // setCName("");
    } catch (e: any) {
      console.error("completeOrder error:", e?.response?.data || e?.message);
      message.error({
        content: e?.response?.data?.message || e?.message || "Không tạo đơn / thanh toán được.",
        key,
        duration: 3,
      });
    } finally {
      setSubmitting(false);
    }
  };

  // ===============================
  // Products filter
  // ===============================
  const filteredProducts = React.useMemo(() => {
    const s = searchTerm.trim().toLowerCase();
    const list = (products || []).filter((p) => p?.isActive !== false);
    const sorted = [...list].sort((a, b) => Number(b.stock || 0) - Number(a.stock || 0));
    if (!s) return sorted;
    return sorted.filter((p) => {
      const name = String(p.name || "").toLowerCase();
      const barcode = String(p.barcode || "").toLowerCase();
      const sku = String(p.sku || "").toLowerCase();
      return name.includes(s) || barcode.includes(s) || sku.includes(s);
    });
  }, [products, searchTerm]);

  const onPickProduct = (p: Product) => {
    if (!posReady) {
      message.warning("POS bắt buộc chọn 1 chi nhánh trước.");
      return;
    }
    if (Number(p.stock || 0) <= 0) {
      message.warning("Sản phẩm đã hết hàng.");
      return;
    }
    addToCart(p);
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
              placeholder="Tìm sản phẩm (tên / SKU / barcode)..."
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
              const out = Number(p.stock || 0) <= 0;
              const disabled = !posReady || out;

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
                  title={!posReady ? "POS bắt buộc chọn 1 chi nhánh" : out ? "Hết hàng" : p.name}
                >
                  <div className="relative w-full aspect-square bg-gray-50">
                    {img ? (
                      <img
                        src={img}
                        alt={p.name}
                        className={`w-full h-full object-cover transition-transform ${
                          disabled ? "" : "group-hover:scale-[1.02]"
                        }`}
                        loading="lazy"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).style.display = "none";
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400 text-3xl">🧴</div>
                    )}

                    <div className="absolute top-2 left-2 text-[11px] px-2 py-1 rounded bg-white/90 border border-gray-200 text-gray-700 max-w-[90%] truncate">
                      {p.categoryName || "—"}
                    </div>

                    {out && (
                      <div className="absolute inset-0 bg-black/35 flex items-center justify-center">
                        <span className="px-2 py-1 rounded bg-white text-xs font-extrabold text-gray-800">
                          HẾT HÀNG
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="p-3">
                    <div className="text-sm font-semibold text-gray-800 line-clamp-2 min-h-[40px]">{p.name}</div>
                    <div className="mt-1 text-[11px] text-gray-500 truncate">
                      {p.sku ? `SKU: ${p.sku}` : p.barcode ? `BC: ${p.barcode}` : ""}
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-xs font-bold text-pink-600">{money(p.price)}đ</span>
                      <span className={`text-xs ${out ? "text-red-600 font-bold" : "text-gray-500"}`}>
                        SL: {Number(p.stock || 0)}
                      </span>
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

        {/* Step Tabs */}
        <StepTabs />

        {/* Main Panel */}
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
              {/* Customer Name quick */}
              <div className="p-4 border-b border-gray-200">
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={currentOrder?.customer || ""}
                    onChange={(e) => currentOrder && posReady && updateCustomerName(currentOrder.id, e.target.value)}
                    placeholder="Tên khách hàng (tuỳ chọn)..."
                    disabled={!posReady}
                    className={`w-full pl-9 pr-3 py-2 border rounded-lg outline-none text-sm ${
                      posReady
                        ? "border-gray-300 focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                        : "border-gray-200 bg-gray-100 cursor-not-allowed"
                    }`}
                  />
                </div>
                <div className="mt-2 text-[11px] text-gray-500">
                  Khách vãng lai có thể để trống SĐT, chỉ cần nhập khi chọn Giao hàng.
                </div>
              </div>

              {/* Cart items */}
              <div className="flex-1 overflow-y-auto p-3 max-h-[55vh]">
                {currentOrder && currentOrder.items.length > 0 ? (
                  <div className="space-y-2">
                    {currentOrder.items.map((item) => {
                      const img = getPrimaryImage(item);
                      const reached = item.quantity >= Number(item.stock || 0);

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
                                  onError={(e) => {
                                    (e.currentTarget as HTMLImageElement).style.display = "none";
                                  }}
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-400 text-xl">
                                  🧴
                                </div>
                              )}
                            </div>

                            <div className="flex-1 min-w-0">
                              <h4 className="font-semibold text-sm text-gray-800 truncate">{item.name}</h4>
                              <div className="text-[11px] text-gray-500 truncate">
                                {item.categoryName || ""} {item.sku ? ` • ${item.sku}` : ""}
                              </div>
                              <p className="text-xs text-pink-600 font-semibold mt-1">{money(item.price)}đ</p>
                            </div>
                          </div>

                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => posReady && updateQuantity(item._id, -1)}
                                className={`p-1 rounded ${
                                  posReady
                                    ? "bg-gray-200 hover:bg-gray-300"
                                    : "bg-gray-200 opacity-60 cursor-not-allowed"
                                }`}
                                disabled={!posReady}
                              >
                                <Minus className="w-3 h-3 text-gray-600" />
                              </button>

                              <span className="w-6 text-center font-semibold text-sm">{item.quantity}</span>

                              <button
                                onClick={() => posReady && !reached && updateQuantity(item._id, 1)}
                                className={`p-1 rounded ${
                                  posReady && !reached
                                    ? "bg-pink-500 hover:bg-pink-600"
                                    : "bg-gray-300 cursor-not-allowed"
                                }`}
                                disabled={!posReady || reached}
                              >
                                <Plus className="w-3 h-3 text-white" />
                              </button>

                              <span className="ml-2 text-xs text-gray-500">tồn: {Number(item.stock ?? 0)}</span>
                              {reached && <span className="ml-2 text-[11px] font-bold text-red-600">Đạt tồn</span>}
                            </div>

                            <div className="flex items-center gap-2">
                              <span className="font-bold text-sm text-gray-800">
                                {money(item.price * item.quantity)}đ
                              </span>
                              <button
                                onClick={() => posReady && removeFromCart(item._id)}
                                className={`p-1 rounded ${
                                  posReady ? "bg-red-50 hover:bg-red-100" : "bg-red-50 opacity-60 cursor-not-allowed"
                                }`}
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

              {/* Footer */}
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
                  Xác Nhận Đơn Hàng
                </button>
              </div>
            </>
          )}

          {/* CUSTOMER */}
          {step === "CUSTOMER" && (
            <div className="p-4 space-y-4">
              {/* Pricing box */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Tạm tính</span>
                  <span className="font-extrabold text-gray-900">{money(subtotalAmount)}đ</span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs font-bold text-gray-700 flex items-center gap-1">
                      <Tag className="w-4 h-4" /> Discount
                    </label>
                    <input
                      value={discount}
                      onChange={(e) => setDiscount(e.target.value)}
                      className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-pink-500 text-sm"
                      placeholder="0"
                      inputMode="numeric"
                      disabled={!posReady}
                    />
                    {discountNum > subtotalAmount && (
                      <div className="mt-1 text-[11px] text-red-600">Discount không được lớn hơn tạm tính.</div>
                    )}
                  </div>

                  <div>
                    <label className="text-xs font-bold text-gray-700 flex items-center gap-1">
                      <Gift className="w-4 h-4" /> Phụ phí
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
                  <span className="text-gray-700 font-bold">Tổng thanh toán</span>
                  <span className="text-gray-900 font-extrabold">{money(finalTotal)}đ</span>
                </div>

                <div className="text-[11px] text-gray-500">
                  Đơn: <b>{currentOrder?.orderNumber || "—"}</b>
                </div>
              </div>

              {/* Customer fields */}
              <div className="grid grid-cols-1 gap-3">
                <div>
                  <label className="text-sm font-semibold text-gray-700">Tên khách (tuỳ chọn)</label>
                  <input
                    value={cName}
                    onChange={(e) => setCName(e.target.value)}
                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-pink-500"
                    placeholder="VD: Khách lẻ"
                    disabled={!posReady}
                  />
                  <div className="mt-1 text-[11px] text-gray-500">Nếu bỏ trống sẽ tự dùng “Khách lẻ”.</div>
                </div>

                <div>
                  <label className="text-sm font-semibold text-gray-700">
                    SĐT {deliveryMethod === "DELIVERY" ? "*" : "(tuỳ chọn)"}
                  </label>
                  <input
                    value={cPhone}
                    onChange={(e) => setCPhone(e.target.value)}
                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-pink-500"
                    placeholder="VD: 0909123456"
                    disabled={!posReady}
                  />
                  {cPhone && !isValidPhone(cPhone) && <div className="mt-1 text-xs text-red-600">SĐT chưa đúng.</div>}
                  {!cPhone && deliveryMethod === "DELIVERY" && (
                    <div className="mt-1 text-xs text-red-600">Giao hàng bắt buộc nhập SĐT.</div>
                  )}
                </div>

                <div>
                  <label className="text-sm font-semibold text-gray-700">Email (tuỳ chọn)</label>
                  <input
                    value={cEmail}
                    onChange={(e) => setCEmail(e.target.value)}
                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-pink-500"
                    placeholder="VD: a@gmail.com"
                    disabled={!posReady}
                  />
                </div>

                {/* Delivery method */}
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
                    onClick={() => setDeliveryMethod("DELIVERY")}
                    className={`px-3 py-2 rounded-lg border text-sm font-bold ${
                      deliveryMethod === "DELIVERY"
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
                    Địa chỉ {deliveryMethod === "DELIVERY" ? "*" : "(tuỳ chọn)"}
                  </label>
                  <textarea
                    value={cAddress}
                    onChange={(e) => setCAddress(e.target.value)}
                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-pink-500 min-h-[70px]"
                    placeholder="Số nhà, đường, phường/xã, quận/huyện..."
                    disabled={!posReady}
                  />
                  {deliveryMethod === "DELIVERY" && !String(cAddress || "").trim() && (
                    <div className="mt-1 text-xs text-red-600">Giao hàng bắt buộc nhập địa chỉ.</div>
                  )}
                </div>

                <div>
                  <label className="text-sm font-semibold text-gray-700">Ghi chú (tuỳ chọn)</label>
                  <textarea
                    value={cNote}
                    onChange={(e) => setCNote(e.target.value)}
                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-pink-500 min-h-[70px]"
                    placeholder="VD: gọi trước khi giao / gói quà màu đỏ..."
                    disabled={!posReady}
                  />
                </div>
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

                <div className="mt-2 text-xs text-gray-500">
                  CASH/BANK sẽ xác nhận (CONFIRM) ngay; PENDING chỉ tạo đơn chờ.
                </div>
              </div>
            </div>
          )}

          {/* PAYMENT */}
          {step === "PAYMENT" && (
            <div className="p-4 space-y-4">
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Khách</span>
                  <span className="font-bold text-gray-900">{String(cName || currentOrder?.customer || "Khách lẻ")}</span>
                </div>

                <div className="flex items-center justify-between text-sm mt-1">
                  <span className="text-gray-600">SĐT</span>
                  <span className="font-bold text-gray-900">{cPhone || "—"}</span>
                </div>

                <div className="flex items-center justify-between text-sm mt-2 border-t pt-2">
                  <span className="text-gray-700 font-bold">Tổng thanh toán</span>
                  <span className="text-gray-900 font-extrabold text-lg">{money(finalTotal)}đ</span>
                </div>

                <div className="text-[11px] text-gray-500 mt-1">
                  Tạm tính: {money(subtotalAmount)}đ • Discount: {money(discountNum)}đ • Phụ phí: {money(extraFeeNum)}đ
                </div>
              </div>

              <div className="grid grid-cols-1 gap-2">
                <button
                  type="button"
                  onClick={() => setPayMethod("CASH")}
                  className={`px-3 py-3 rounded-lg border text-sm font-extrabold flex items-center justify-center gap-2 ${
                    payMethod === "CASH"
                      ? "bg-pink-500 text-white border-pink-500"
                      : "bg-white hover:bg-gray-50 border-gray-200"
                  }`}
                >
                  <CreditCard className="w-4 h-4" />
                  Tiền mặt (CONFIRM)
                </button>

                <button
                  type="button"
                  onClick={() => setPayMethod("BANK")}
                  className={`px-3 py-3 rounded-lg border text-sm font-extrabold flex items-center justify-center gap-2 ${
                    payMethod === "BANK"
                      ? "bg-pink-500 text-white border-pink-500"
                      : "bg-white hover:bg-gray-50 border-gray-200"
                  }`}
                >
                  <CreditCard className="w-4 h-4" />
                  Chuyển khoản (CONFIRM)
                </button>

                <button
                  type="button"
                  onClick={() => setPayMethod("PENDING")}
                  className={`px-3 py-3 rounded-lg border text-sm font-extrabold flex items-center justify-center gap-2 ${
                    payMethod === "PENDING"
                      ? "bg-yellow-400 text-gray-900 border-yellow-400"
                      : "bg-white hover:bg-gray-50 border-gray-200"
                  }`}
                >
                  <AlertCircle className="w-4 h-4" />
                  Pending (PENDING)
                </button>
              </div>

              <button
                type="button"
                onClick={onSubmitPayment}
                disabled={submitting || !posReady || !currentOrder || finalTotal <= 0}
                className="w-full bg-gray-900 hover:bg-black text-white py-3 rounded-lg font-extrabold disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {submitting ? (
                  "Đang xử lý..."
                ) : (
                  <>
                    <CheckCircle2 className="w-5 h-5" />
                    Hoàn tất đơn ({payMethod})
                  </>
                )}
              </button>

              <div className="text-xs text-gray-500">
                {payMethod === "PENDING"
                  ? "Tạo đơn PENDING (chưa xác nhận thanh toán)."
                  : "Tạo đơn và CONFIRM ngay (đã xác nhận thanh toán)."}
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
    </div>
  );
};

export default POSSection;
