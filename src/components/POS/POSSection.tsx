import React from "react";
import {
  Plus,
  Minus,
  Trash2,
  ShoppingBag,
  CreditCard,
  User,
  Search,
  X,
  Phone,
  CheckCircle2,
  Banknote,
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
  id: number; // local temp id for tabs
  orderNumber: string;
  customer: string;
  items: OrderItem[];
  createdAt: Date;
  status: string;
}

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
  completeOrder: () => void;
  getCurrentOrder: () => Order | undefined;

  selectedBranchId?: string | null;

  // ✅ NEW
  refreshProducts?: () => Promise<void> | void;
  onSoldAdjustStock?: (soldItems: Array<{ productId: string; qty: number }>) => void;
}

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

const getLocalUser = (): { role?: string; branchId?: string | null } => {
  try {
    const raw =
      localStorage.getItem("user") ||
      localStorage.getItem("currentUser") ||
      localStorage.getItem("auth_user");
    if (!raw) return {};
    const u = JSON.parse(raw);
    return { role: u?.role, branchId: u?.branchId ?? null };
  } catch {
    return {};
  }
};

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
  getCurrentOrder,
  selectedBranchId,
  refreshProducts,
  onSoldAdjustStock,
}) => {
  const currentOrder = getCurrentOrder();

  const [searchTerm, setSearchTerm] = React.useState("");
  const [toast, setToast] = React.useState<Record<string, string>>({});

  // ===============================
  // STOCK UI ONLY (per current order)
  // ===============================
  const stockAvailMap = React.useMemo(() => {
    const map: Record<string, number> = {};
    for (const p of products || []) map[p._id] = Math.max(0, Number(p.stock || 0));
    if (currentOrder?.items?.length) {
      for (const it of currentOrder.items) {
        const cur = map[it._id] ?? Math.max(0, Number(it.stock || 0));
        map[it._id] = Math.max(0, cur - Number(it.quantity || 0));
      }
    }
    return map;
  }, [products, currentOrder?.items]);

  const filteredProducts = React.useMemo(() => {
    const s = searchTerm.trim().toLowerCase();
    const list = (products || []).filter((p) => p?.isActive !== false);
    if (!s) return list;
    return list.filter((p) => {
      const name = String(p.name || "").toLowerCase();
      const barcode = String(p.barcode || "").toLowerCase();
      const sku = String(p.sku || "").toLowerCase();
      return name.includes(s) || barcode.includes(s) || sku.includes(s);
    });
  }, [products, searchTerm]);

  const showToast = (pid: string, text: string) => {
    setToast((m) => ({ ...m, [pid]: text }));
    window.setTimeout(() => {
      setToast((m) => {
        const n = { ...m };
        delete n[pid];
        return n;
      });
    }, 900);
  };

  const canAddProduct = (p: Product) => {
    const avail = stockAvailMap[p._id] ?? 0;
    return avail > 0 && p.isActive !== false;
  };

  const handleClickProduct = (p: Product) => {
    if (!canAddProduct(p)) {
      showToast(p._id, "Hết tồn");
      return;
    }
    addToCart(p);
  };

  const handleIncItem = (item: OrderItem) => {
    const avail = stockAvailMap[item._id] ?? 0;
    if (avail <= 0) {
      showToast(item._id, "Đạt tồn");
      return;
    }
    updateQuantity(item._id, 1);
  };

  const handleDecItem = (item: OrderItem) => updateQuantity(item._id, -1);
  const handleRemoveItem = (item: OrderItem) => removeFromCart(item._id);

  // ===============================
  // Checkout workflow (2-step modal)
  // ===============================
  const [checkoutOpen, setCheckoutOpen] = React.useState(false);
  const [checkoutStep, setCheckoutStep] = React.useState<1 | 2>(1);

  const [creatingOrder, setCreatingOrder] = React.useState(false);
  const [orderCreatedId, setOrderCreatedId] = React.useState<string>("");

  const [customerName, setCustomerName] = React.useState<string>("Khách lẻ");
  const [customerPhone, setCustomerPhone] = React.useState<string>("0909123456");

  const [deliveryMethod, setDeliveryMethod] = React.useState<"PICKUP" | "SHIP">("PICKUP");
  const [deliveryNote, setDeliveryNote] = React.useState<string>("Bán tại quầy");

  const [payMethod, setPayMethod] = React.useState<"CASH" | "BANK">("CASH");
  const [finalizing, setFinalizing] = React.useState(false);

  const resolvedBranchId = React.useMemo(() => {
    if (selectedBranchId !== undefined) return selectedBranchId;
    const u = getLocalUser();
    return u.branchId ?? null;
  }, [selectedBranchId]);

  const openCheckout = () => {
    if (!currentOrder || currentOrder.items.length === 0) return;

    setCheckoutStep(1);
    setOrderCreatedId("");
    setPayMethod("CASH");

    if (currentOrder.customer?.trim()) setCustomerName(currentOrder.customer.trim());

    setCheckoutOpen(true);
  };

  const closeCheckout = () => {
    if (creatingOrder || finalizing) return;
    setCheckoutOpen(false);
  };

  const buildPayload = () => {
    const items = (currentOrder?.items || []).map((x) => ({
      productId: x._id,
      qty: Number(x.quantity || 0),
    }));

    return {
      channel: "POS",
      branchId: resolvedBranchId,
      customer: {
        phone: String(customerPhone || "").trim(),
        name: String(customerName || "").trim() || "Khách lẻ",
      },
      delivery: {
        method: deliveryMethod,
        note: String(deliveryNote || "").trim() || "Bán tại quầy",
      },
      items,
    };
  };

  const confirmCreateOrder = async () => {
    if (!currentOrder || currentOrder.items.length === 0) return;

    if (!resolvedBranchId) {
      showToast("checkout", "Thiếu branchId");
      return;
    }

    const phone = String(customerPhone || "").trim();
    const name = String(customerName || "").trim() || "Khách lẻ";
    if (phone && phone.length < 8) {
      showToast("checkout", "SĐT không hợp lệ");
      return;
    }
    if (!name) return;

    setCreatingOrder(true);
    try {
      const payload = buildPayload();

      const res = await api.post("/orders", payload);
      const createdId = String(res.data?.order?._id || res.data?.orderId || res.data?._id || "");
      if (!createdId) {
        showToast("checkout", "Không lấy được orderId");
        return;
      }

      setOrderCreatedId(createdId);
      setCheckoutStep(2);
    } catch (err: any) {
      console.error("Create order error:", err?.response?.data || err?.message);
      showToast("checkout", err?.response?.data?.message || "Tạo đơn thất bại");
    } finally {
      setCreatingOrder(false);
    }
  };

  // ✅ FINAL STEP: CALL /orders/:id/confirm
  // ✅ After success: optimistic stock adjust + refetch products
  const finalizePayment = async () => {
    if (!currentOrder || currentOrder.items.length === 0) return;
    if (!orderCreatedId) {
      showToast("checkout", "Chưa có orderId");
      return;
    }

    const amount = Number(getTotal(currentOrder.id) || 0);

    setFinalizing(true);
    try {
      await api.post(`/orders/${orderCreatedId}/confirm`, {
        payment: { method: payMethod, amount },
      });

      // ✅ optimistic: trừ stock ngay trên UI
      const sold = currentOrder.items.map((it) => ({ productId: it._id, qty: Number(it.quantity || 0) }));
      onSoldAdjustStock?.(sold);

      // ✅ đóng modal + complete local flow
      completeOrder();
      setCheckoutOpen(false);

      // ✅ refetch tồn thật từ server
      await Promise.resolve(refreshProducts?.());
    } catch (err: any) {
      console.error("Confirm order error:", err?.response?.data || err?.message);
      showToast("checkout", err?.response?.data?.message || "Xác nhận thanh toán thất bại");
    } finally {
      setFinalizing(false);
    }
  };

  // ===============================
  // UI
  // ===============================
  const cartCount = currentOrder?.items?.reduce((s, it) => s + (it.quantity || 0), 0) || 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Left - Products */}
      <div className="lg:col-span-2 space-y-4">
        {/* Search */}
        <div className="bg-white rounded-2xl border border-gray-200 p-4">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div className="font-semibold text-gray-800">Danh sách sản phẩm</div>
            <div className="text-xs text-gray-500">Tồn hiển thị theo đơn đang chọn</div>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm (tên / SKU / barcode)..."
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-transparent outline-none"
            />
          </div>
        </div>

        {/* Products Grid */}
        <div className="bg-white rounded-2xl border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-800">Sản phẩm ({filteredProducts.length})</h3>
            <div className="text-xs text-gray-500">Click để thêm</div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {filteredProducts.map((p) => {
              const img = getPrimaryImage(p);
              const avail = stockAvailMap[p._id] ?? 0;
              const disabled = avail <= 0 || p.isActive === false;

              return (
                <button
                  key={p._id}
                  onClick={() => handleClickProduct(p)}
                  disabled={disabled}
                  className={[
                    "group rounded-2xl overflow-hidden text-left border transition-all",
                    disabled
                      ? "bg-gray-50 border-gray-200 opacity-50 cursor-not-allowed"
                      : "bg-white border-gray-200 hover:border-pink-300 hover:shadow-sm",
                  ].join(" ")}
                  title={p.name}
                >
                  <div className="relative w-full aspect-square bg-gray-50">
                    {img ? (
                      <img
                        src={img}
                        alt={p.name}
                        className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform"
                        loading="lazy"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).style.display = "none";
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400 text-3xl">🧴</div>
                    )}

                    <div className="absolute top-2 left-2 text-[11px] px-2 py-1 rounded-lg bg-white/90 border border-gray-200 text-gray-700 max-w-[90%] truncate">
                      {p.categoryName || "—"}
                    </div>

                    <div
                      className={[
                        "absolute top-2 right-2 text-[11px] px-2 py-1 rounded-lg border",
                        disabled ? "bg-gray-100 border-gray-200 text-gray-600" : "bg-white/90 border-gray-200 text-gray-700",
                      ].join(" ")}
                    >
                      tồn: {avail}
                    </div>

                    {toast[p._id] && (
                      <div className="absolute bottom-2 left-2 right-2 text-center text-[12px] font-semibold text-white bg-black/70 rounded-lg py-1">
                        {toast[p._id]}
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
                      <span className="text-[11px] text-gray-500 truncate">{p.brand || ""}</span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {filteredProducts.length === 0 && (
            <div className="py-10 text-center text-sm text-gray-500">Không tìm thấy sản phẩm.</div>
          )}
        </div>
      </div>

      {/* Right - Cart */}
      <div className="space-y-4">
        {/* Order Tabs */}
        <div className="bg-white rounded-2xl border border-gray-200 p-3">
          <div className="flex flex-wrap gap-2">
            {activeOrders.map((order) => (
              <button
                key={order.id}
                onClick={() => setCurrentOrderId(order.id)}
                className={`px-3 py-2 rounded-xl font-medium text-sm transition-all flex items-center gap-2 ${
                  order.id === currentOrderId ? "bg-pink-500 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                <span className="whitespace-nowrap">{order.orderNumber}</span>

                {order.id !== currentOrderId && order.id !== 1 && (
                  <span
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteOrder(order.id);
                    }}
                    className="ml-1 inline-flex items-center justify-center w-5 h-5 rounded text-gray-500 hover:text-red-600"
                    title="Đóng đơn"
                  >
                    ×
                  </span>
                )}
              </button>
            ))}

            <button
              onClick={createNewOrder}
              className="px-3 py-2 rounded-xl bg-pink-50 text-pink-600 hover:bg-pink-100 font-medium text-sm flex items-center gap-1"
            >
              <Plus className="w-4 h-4" />
              Thêm
            </button>
          </div>
        </div>

        {/* Cart */}
        <div className="bg-white rounded-2xl border border-gray-200 flex flex-col h-[calc(100vh-240px)] lg:h-auto">
          {/* Header */}
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between gap-3 mb-3">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-pink-500" />
                <h3 className="font-semibold text-gray-800">Giỏ hàng</h3>
                <span className="text-sm text-gray-500">({cartCount})</span>
              </div>

              <div className="text-[11px] px-2 py-1 rounded-lg border border-gray-200 bg-gray-50 text-gray-600">
                Tổng: {currentOrder ? money(getTotal(currentOrder.id)) : "0"}đ
              </div>
            </div>

            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={currentOrder?.customer || ""}
                onChange={(e) => currentOrder && updateCustomerName(currentOrder.id, e.target.value)}
                placeholder="Tên khách hàng..."
                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-transparent outline-none text-sm"
              />
            </div>
          </div>

          {/* Items */}
          <div className="flex-1 overflow-y-auto p-3">
            {currentOrder && currentOrder.items.length > 0 ? (
              <div className="space-y-2">
                {currentOrder.items.map((item) => {
                  const img = getPrimaryImage(item);
                  const avail = stockAvailMap[item._id] ?? 0;

                  return (
                    <div key={item._id} className="bg-gray-50 rounded-2xl p-3 border border-gray-200">
                      <div className="flex items-start gap-3">
                        <div className="w-14 h-14 rounded-xl overflow-hidden border border-gray-200 bg-white flex-shrink-0">
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
                            <div className="w-full h-full flex items-center justify-center text-gray-400 text-xl">🧴</div>
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <div className="font-semibold text-sm text-gray-800 truncate">{item.name}</div>
                              <div className="text-[11px] text-gray-500 truncate">
                                {item.categoryName || ""}{item.sku ? ` • ${item.sku}` : ""}
                              </div>
                              <div className="text-xs text-pink-600 font-semibold mt-1">{money(item.price)}đ</div>
                            </div>

                            <button
                              onClick={() => handleRemoveItem(item)}
                              className="p-2 rounded-xl bg-white border border-gray-200 hover:border-red-300"
                              title="Xoá"
                            >
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </button>
                          </div>

                          {toast[item._id] && <div className="mt-1 text-[11px] font-semibold text-red-600">{toast[item._id]}</div>}

                          <div className="mt-3 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleDecItem(item)}
                                className="p-2 rounded-xl bg-white border border-gray-200 hover:bg-gray-50"
                                title="Giảm"
                              >
                                <Minus className="w-4 h-4 text-gray-600" />
                              </button>

                              <div className="min-w-[44px] text-center font-bold text-gray-800">{item.quantity}</div>

                              <button
                                onClick={() => handleIncItem(item)}
                                disabled={avail <= 0}
                                className={[
                                  "p-2 rounded-xl border",
                                  avail <= 0
                                    ? "bg-gray-200 border-gray-200 cursor-not-allowed"
                                    : "bg-pink-500 border-pink-500 hover:bg-pink-600",
                                ].join(" ")}
                                title={avail <= 0 ? "Đạt tồn" : "Tăng"}
                              >
                                <Plus className="w-4 h-4 text-white" />
                              </button>

                              <div className="text-xs text-gray-500 ml-2">còn: {avail}</div>
                            </div>

                            <div className="font-bold text-gray-800">{money(item.price * item.quantity)}đ</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center py-8">
                <ShoppingBag className="w-12 h-12 text-gray-300 mb-2" />
                <p className="text-gray-500 text-sm">Chưa có sản phẩm</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-gray-200 bg-gray-50">
            <button
              onClick={openCheckout}
              disabled={!currentOrder || currentOrder.items.length === 0}
              className="w-full bg-pink-500 hover:bg-pink-600 text-white py-3 rounded-2xl font-semibold disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              <CreditCard className="w-5 h-5" />
              Thanh Toán
            </button>

            {!resolvedBranchId && (
              <div className="mt-2 text-[12px] text-red-600 font-semibold">Bạn chưa chọn cửa hàng (branchId).</div>
            )}
          </div>
        </div>
      </div>

      {/* ===============================
          CHECKOUT MODAL
      =============================== */}
      {checkoutOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={closeCheckout} />

          <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-pink-500" />
                <div className="font-bold text-gray-800">
                  {checkoutStep === 1 ? "Xác nhận đơn hàng" : "Chọn hình thức thanh toán"}
                </div>
              </div>

              <button onClick={closeCheckout} className="p-2 rounded-xl hover:bg-gray-100" title="Đóng">
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            <div className="p-4">
              {checkoutStep === 1 && (
                <div className="space-y-4">
                  <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-gray-700">
                        <div className="font-semibold">{currentOrder?.orderNumber}</div>
                        <div className="text-xs text-gray-500">Channel: POS • Branch: {resolvedBranchId || "—"}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-gray-500">Tổng cộng</div>
                        <div className="text-xl font-extrabold text-gray-800">
                          {currentOrder ? money(getTotal(currentOrder.id)) : "0"}đ
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 text-xs text-gray-600">
                      {currentOrder?.items?.map((it) => (
                        <div key={it._id} className="flex justify-between py-1">
                          <span className="truncate max-w-[70%]">
                            {it.name} <span className="text-gray-400">×</span> {it.quantity}
                          </span>
                          <span className="font-semibold">{money(it.price * it.quantity)}đ</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm font-semibold text-gray-700">Tên khách</label>
                      <div className="mt-1 relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          value={customerName}
                          onChange={(e) => setCustomerName(e.target.value)}
                          className="w-full pl-9 pr-3 py-2.5 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                          placeholder="Khách lẻ"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-sm font-semibold text-gray-700">Số điện thoại</label>
                      <div className="mt-1 relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          value={customerPhone}
                          onChange={(e) => setCustomerPhone(e.target.value)}
                          className="w-full pl-9 pr-3 py-2.5 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                          placeholder="0909123456"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm font-semibold text-gray-700">Hình thức nhận</label>
                      <select
                        value={deliveryMethod}
                        onChange={(e) => setDeliveryMethod(e.target.value as any)}
                        className="mt-1 w-full px-3 py-2.5 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                      >
                        <option value="PICKUP">PICKUP (Bán tại quầy)</option>
                        <option value="SHIP">SHIP (Giao hàng)</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-sm font-semibold text-gray-700">Ghi chú</label>
                      <input
                        value={deliveryNote}
                        onChange={(e) => setDeliveryNote(e.target.value)}
                        className="mt-1 w-full px-3 py-2.5 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                        placeholder="Bán tại quầy"
                      />
                    </div>
                  </div>

                  {toast["checkout"] && <div className="text-sm font-semibold text-red-600">{toast["checkout"]}</div>}
                </div>
              )}

              {checkoutStep === 2 && (
                <div className="space-y-4">
                  <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 flex items-center justify-between">
                    <div>
                      <div className="text-xs text-gray-500">OrderId</div>
                      <div className="font-bold text-gray-800">{orderCreatedId}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-gray-500">Tổng tiền</div>
                      <div className="text-xl font-extrabold text-gray-800">
                        {currentOrder ? money(getTotal(currentOrder.id)) : "0"}đ
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setPayMethod("CASH")}
                      className={[
                        "rounded-2xl border p-4 text-left transition-all",
                        payMethod === "CASH"
                          ? "border-pink-500 ring-2 ring-pink-100 bg-pink-50"
                          : "border-gray-200 hover:border-pink-300",
                      ].join(" ")}
                    >
                      <div className="flex items-center gap-2">
                        <Banknote className="w-5 h-5 text-pink-600" />
                        <div className="font-bold text-gray-800">Tiền mặt</div>
                      </div>
                      <div className="text-xs text-gray-600 mt-1">Thu tiền trực tiếp tại quầy</div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPayMethod("BANK")}
                      className={[
                        "rounded-2xl border p-4 text-left transition-all",
                        payMethod === "BANK"
                          ? "border-pink-500 ring-2 ring-pink-100 bg-pink-50"
                          : "border-gray-200 hover:border-pink-300",
                      ].join(" ")}
                    >
                      <div className="flex items-center gap-2">
                        <CreditCard className="w-5 h-5 text-pink-600" />
                        <div className="font-bold text-gray-800">Chuyển khoản</div>
                      </div>
                      <div className="text-xs text-gray-600 mt-1">Khách chuyển khoản ngân hàng</div>
                    </button>
                  </div>

                  {toast["checkout"] && <div className="text-sm font-semibold text-red-600">{toast["checkout"]}</div>}
                </div>
              )}
            </div>

            <div className="p-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between gap-2">
              {checkoutStep === 2 ? (
                <button
                  type="button"
                  onClick={() => setCheckoutStep(1)}
                  className="px-4 py-2.5 rounded-xl border border-gray-300 bg-white hover:bg-gray-50 font-semibold text-gray-700"
                  disabled={finalizing}
                >
                  Quay lại
                </button>
              ) : (
                <button
                  type="button"
                  onClick={closeCheckout}
                  className="px-4 py-2.5 rounded-xl border border-gray-300 bg-white hover:bg-gray-50 font-semibold text-gray-700"
                  disabled={creatingOrder}
                >
                  Huỷ
                </button>
              )}

              <div className="flex-1" />

              {checkoutStep === 1 ? (
                <button
                  type="button"
                  onClick={confirmCreateOrder}
                  disabled={creatingOrder || !currentOrder || currentOrder.items.length === 0}
                  className="px-5 py-2.5 rounded-xl bg-pink-500 hover:bg-pink-600 text-white font-extrabold disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  {creatingOrder ? "Đang tạo đơn..." : "Xác nhận đơn"}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={finalizePayment}
                  disabled={finalizing || !currentOrder || currentOrder.items.length === 0}
                  className="px-5 py-2.5 rounded-xl bg-pink-500 hover:bg-pink-600 text-white font-extrabold disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  {finalizing ? "Đang thanh toán..." : "THANH TOÁN"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default POSSection;
