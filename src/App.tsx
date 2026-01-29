// src/App.tsx
import React, { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";
import { message } from "antd";

import LoginPage from "./components/POS_ONLINE/Auth/LoginPage";
import Layout from "./components/POS_ONLINE/Layout/Layout";
import POSSection from "./components/POS_ONLINE/POS/POSSection";
import OrdersSection from "./components/POS_ONLINE/Orders/OrdersSection";
import ProductInputSection from "./components/POS_ONLINE/Products/ProductInputSection";
import InventorySection from "./components/POS_ONLINE/Inventory/InventorySection";
import WarehouseSection from "./components/POS_ONLINE/Warehouse/WarehouseSection";
import CustomersSection from "./components/POS_ONLINE/Customers/CustomersSection";
import RevenueSection from "./components/POS_ONLINE/Revenue/RevenueSection";
import ProtectedRoute from "./components/POS_ONLINE/Auth/ProtectedRoute";
import ShopSettings from "./components/POS_ONLINE/ShopSettings/ShopSettings";
import FlashSalesAdminSection from "./components/POS_ONLINE/FlashSale/FlashSaleManager";
import { BRANCH_KEY, getPosBranchId } from "./services/branchContext";
import { isAuthenticated, getCurrentUser } from "./services/authService";
import api from "./services/api";

// Shop Online
import ShopOnlinePage from "./components/ShopOnline/pages/ShopHome";
import ProductDetailPage from "./components/ShopOnline/pages/ProductDetailPage";
import ProductCategory from "./components/ShopOnline/pages/ProductCategory";
import ProductFlashSale from "./components/ShopOnline/pages/ProductFlashSale";
import CheckoutPage from "./components/ShopOnline/components/shop/CheckoutPage";
import MyOrdersPage from "./components/ShopOnline/components/shop/MyOrdersPage";
import OrderDetailPage from "./components/ShopOnline/components/shop/OrderDetailPage";

// ===============================
// Types
// ===============================
interface ProductImage {
  url: string;
  isPrimary?: boolean;
  order?: number;
}

type PriceTierRow = {
  tierId: string;
  price: number;
};

type VariantAttr = { k: string; v: string };

export interface Product {
  _id: string;
  sku?: string;
  name: string;
  categoryId?: string | null;
  categoryName: string;
  price: number;
  price_tier?: PriceTierRow[];
  cost?: number;
  brand?: string;
  barcode: string;
  stock: number;
  thumbnail?: string;
  images?: ProductImage[];
  isActive?: boolean;
  attributes?: VariantAttr[];
  productId?: string;
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

interface User {
  id?: string;
  username?: string;
  name?: string;
  role?: string;
  branchId?: string | null;
}

// ===============================
// Helpers
// ===============================
function upperRole(user: any) {
  return String(user?.role || "").toUpperCase();
}

function getInitialPosBranchId(user: any): string {
  const role = upperRole(user);
  const userBranch = user?.branchId ? String(user.branchId) : "";
  if (role === "STAFF") return userBranch;

  const saved = localStorage.getItem(BRANCH_KEY);
  if (saved && saved.length) return saved;
  return "all";
}

function mustSelectSingleBranchForPOS(user: any, posBranchId: string) {
  const role = upperRole(user);
  if (role === "STAFF") return false;
  return !posBranchId || posBranchId === "all";
}

const moneyInt = (n: any) => {
  const x = Number(n || 0);
  if (!Number.isFinite(x)) return 0;
  return Math.round(x);
};

// ✅ Mongo ObjectId check
const isMongoId = (s: any) => typeof s === "string" && /^[a-f\d]{24}$/i.test(String(s).trim());

// ===============================
// App Inner
// ===============================
const AppInner: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const [posBranchId, setPosBranchId] = useState<string>("all");

  // POS orders local
  const [activeOrders, setActiveOrders] = useState<Order[]>([
    { id: 1, orderNumber: "TMP001", customer: "Khách lẻ", items: [], createdAt: new Date(), status: "active" },
  ]);
  const [currentOrderId, setCurrentOrderId] = useState<number>(1);
  const [nextOrderNumber, setNextOrderNumber] = useState<number>(2);

  // Auth bootstrap
  useEffect(() => {
    if (isAuthenticated()) {
      const u = getCurrentUser();
      setIsLoggedIn(true);
      setCurrentUser(u);
      setPosBranchId(getPosBranchId(u));
    }
  }, []);

  const handleLoginSuccess = (data: any) => {
    const u = data?.user || getCurrentUser();
    setIsLoggedIn(true);
    setCurrentUser(u);
    setPosBranchId(getPosBranchId(u));
  };

  // POS must select single branch
  useEffect(() => {
    if (!isLoggedIn) return;

    const isPOS = location.pathname.startsWith("/pos");
    if (!isPOS) return;

    const u = getCurrentUser();
    const nextPosBranch = getInitialPosBranchId(u);

    if (mustSelectSingleBranchForPOS(u, nextPosBranch)) {
      message.warning("POS bắt buộc chọn 1 chi nhánh (không được chọn Tất cả). Vui lòng chọn chi nhánh ở Layout.");
      navigate("/inventory", { replace: true });
    }
  }, [isLoggedIn, location.pathname, navigate]);

  // POS handlers
  const getCurrentOrderFn = (): Order | undefined => activeOrders.find((order) => order.id === currentOrderId);

  const createNewOrder = (): void => {
    const newOrder: Order = {
      id: Date.now(),
      orderNumber: `TMP${String(nextOrderNumber).padStart(3, "0")}`,
      customer: "Khách lẻ",
      items: [],
      createdAt: new Date(),
      status: "active",
    };
    setActiveOrders((prev) => [...prev, newOrder]);
    setCurrentOrderId(newOrder.id);
    setNextOrderNumber((n) => n + 1);
  };

  const deleteOrder = (orderId: number): void => {
    if (activeOrders.length === 1) {
      message.warning("Không thể xóa đơn hàng duy nhất!");
      return;
    }
    setActiveOrders((prev) => prev.filter((o) => o.id !== orderId));
    if (currentOrderId === orderId) {
      const next = activeOrders.find((o) => o.id !== orderId);
      if (next) setCurrentOrderId(next.id);
    }
  };

  const addToCart = (product: Product): void => {
    const order = getCurrentOrderFn();
    if (!order) return;

    setActiveOrders((prev) =>
      prev.map((o) => {
        if (o.id !== currentOrderId) return o;

        const existing = o.items.find((it) => it._id === product._id);
        if (existing) {
          return {
            ...o,
            items: o.items.map((it) => (it._id === product._id ? { ...it, quantity: Number(it.quantity || 0) + 1 } : it)),
          };
        }

        return { ...o, items: [...o.items, { ...product, quantity: 1 }] };
      })
    );
  };

  const updateQuantity = (productId: string, delta: number): void => {
    setActiveOrders((prev) =>
      prev.map((o) => {
        if (o.id !== currentOrderId) return o;

        return {
          ...o,
          items: o.items
            .map((it) => {
              if (it._id !== productId) return it;
              const nextQty = Number(it.quantity || 0) + delta;
              if (nextQty <= 0) return { ...it, quantity: 0 };
              return { ...it, quantity: nextQty };
            })
            .filter((it) => Number(it.quantity || 0) > 0),
        };
      })
    );
  };

  const removeFromCart = (productId: string): void => {
    setActiveOrders((prev) =>
      prev.map((o) => (o.id !== currentOrderId ? o : { ...o, items: o.items.filter((it) => it._id !== productId) }))
    );
  };

  const updateCustomerName = (orderId: number, name: string): void => {
    setActiveOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, customer: name } : o)));
  };

  const getTotal = (orderId: number): number => {
    const order = activeOrders.find((o) => o.id === orderId);
    if (!order) return 0;
    return order.items.reduce((sum, it) => sum + Number(it.price || 0) * Number(it.quantity || 0), 0);
  };

  const replaceCurrentOrderItems = (items: OrderItem[]) => {
    setActiveOrders((prev) =>
      prev.map((o) => {
        if (o.id !== currentOrderId) return o;
        return { ...o, items: Array.isArray(items) ? items : [] };
      })
    );
  };

  const completeOrder = (): void => {
    // legacy
  };

  /**
   * ✅ FIX: MUST call BE to get Mongo ObjectId.
   * IMPORTANT: change "/orders" to your real create order endpoint.
   */
  const completeOrderWithStatus = async (
    status: "PENDING" | "CONFIRM" | "DEBT",
    payload: {
      branchId: string;
      customer?: { name?: string; phone?: string; email?: string; dob?: string };
      delivery: { method: "PICKUP" | "SHIP"; address?: string; note?: string };
      payments?: { method: "CASH" | "BANK" | "CARD" | "WALLET"; amount: number }[];
      discount: number;
      extraFee: number;
      pricingNote?: string;
      pointsRedeemed?: number;
      pointsRedeemAmount?: number;
    }
  ): Promise<{ _id: string }> => {
    const order = getCurrentOrderFn();
    if (!order) throw new Error("NO_CURRENT_ORDER");
    if (!payload.branchId || payload.branchId === "all") throw new Error("POS_BRANCH_REQUIRED");

    const items = order.items.map((it) => ({ productId: it._id, qty: Number(it.quantity || 0) }));
    if (!items.length) throw new Error("EMPTY_CART");

    const subtotal = moneyInt(order.items.reduce((s, it) => s + Number(it.price || 0) * Number(it.quantity || 0), 0));
    const discount = moneyInt(payload.discount || 0);
    const extraFee = moneyInt(payload.extraFee || 0);

    const baseAmount = Math.max(0, subtotal - discount + extraFee);

    const isShip = payload.delivery.method === "SHIP";
    if (isShip) {
      const phone = String(payload.customer?.phone || "").trim();
      const addr = String(payload.delivery.address || "").trim();
      if (!phone) throw new Error("SHIP_REQUIRES_PHONE");
      if (!addr) throw new Error("SHIP_REQUIRES_ADDRESS");
    }

    const cleanPayments = (arr: any[]) =>
      (Array.isArray(arr) ? arr : [])
        .map((p) => ({
          method: String(p?.method || "").toUpperCase(),
          amount: moneyInt(p?.amount || 0),
        }))
        .filter((p) => ["CASH", "BANK", "CARD", "WALLET"].includes(p.method) && Number.isFinite(p.amount) && p.amount >= 0)
        .map((p) => ({ method: p.method as "CASH" | "BANK" | "CARD" | "WALLET", amount: p.amount }));

    let payments = cleanPayments(payload.payments || []);

    let pointsRedeemed = Math.max(0, Math.floor(Number(payload.pointsRedeemed || 0)));
    let pointsRedeemAmount = 0;

    if (status !== "CONFIRM") {
      pointsRedeemed = 0;
      pointsRedeemAmount = 0;
    } else {
      if (pointsRedeemed > 0) {
        const phone = String(payload.customer?.phone || "").trim();
        if (!phone) throw new Error("REDEEM_REQUIRES_PHONE");
        pointsRedeemAmount = Math.max(0, Number(payload.pointsRedeemAmount || 0));
      }
    }

    const totalAfterRedeem = Math.max(0, baseAmount - pointsRedeemAmount);

    if (status === "PENDING") payments = [];

    if (status === "CONFIRM") {
      if (totalAfterRedeem <= 0) throw new Error("TOTAL_INVALID");

      if (payments.length === 0) payments = [{ method: "CASH", amount: totalAfterRedeem }];
      if (payments.length === 1 && moneyInt(payments[0].amount) === 0) payments = [{ ...payments[0], amount: totalAfterRedeem }];

      const sum = moneyInt(payments.reduce((s, p) => s + Number(p.amount || 0), 0));
      if (sum !== totalAfterRedeem) throw new Error("CONFIRM_REQUIRE_FULL_PAYMENT");
    }

    if (status === "DEBT") {
      if (totalAfterRedeem <= 0) throw new Error("TOTAL_INVALID");
      if (payments.length === 0) throw new Error("DEBT_REQUIRES_PAYMENT");

      const sum = moneyInt(payments.reduce((s, p) => s + Number(p.amount || 0), 0));
      if (!(sum > 0 && sum < totalAfterRedeem)) throw new Error("DEBT_REQUIRE_PARTIAL_PAYMENT");
    }

    const body: any = {
      channel: "POS",
      status,
      branchId: payload.branchId,
      customer: payload.customer?.phone
        ? {
            phone: payload.customer.phone,
            name: payload.customer.name || "",
            email: payload.customer.email || "",
            ...(payload.customer.dob ? { dob: payload.customer.dob } : {}),
          }
        : undefined,
      delivery: {
        method: payload.delivery.method,
        address: isShip ? payload.delivery.address || "" : "",
        note: payload.delivery.note || (payload.delivery.method === "PICKUP" ? "Bán tại quầy" : ""),
      },
      discount,
      extraFee,
      pricingNote: payload.pricingNote || "",
      items,
      payments,
      ...(status === "CONFIRM" && pointsRedeemed > 0 ? { pointsRedeemed } : {}),
      ...(status === "CONFIRM" && pointsRedeemAmount > 0 ? { pointsRedeemAmount } : {}),
    };

    const key = "pos-create-order";
    message.loading({ content: "Đang tạo đơn...", key });

    try {
      // ✅ REAL API (change endpoint to your BE)
      const res = await api.post("/orders", body);

      const created = res.data?.order || res.data?.data?.order || res.data?.item || res.data || {};
      const id = String(created?._id || "");

      // ✅ MUST be Mongo ObjectId
      if (!isMongoId(id)) throw new Error("ORDER_ID_INVALID");

      setActiveOrders((prev) =>
        prev.map((o) => (o.id === currentOrderId ? { ...o, items: [], customer: "Khách lẻ" } : o))
      );

      message.success({
        content:
          status === "CONFIRM"
            ? "Đã tạo & xác nhận đơn thành công!"
            : status === "DEBT"
            ? "Đã tạo đơn ghi nợ thành công!"
            : "Đã tạo đơn PENDING thành công!",
        key,
        duration: 2,
      });

      return { _id: id };
    } catch (err: any) {
      console.error("completeOrderWithStatus error:", err?.response?.data || err?.message || err);

      const beMsg = err?.response?.data?.message;
      const msg =
        beMsg ||
        (err?.message === "POS_BRANCH_REQUIRED" ? "POS bắt buộc chọn 1 chi nhánh (không được ALL)." : "") ||
        (err?.message === "EMPTY_CART" ? "Giỏ hàng đang trống." : "") ||
        (err?.message === "SHIP_REQUIRES_PHONE" ? "Giao hàng: bắt buộc nhập SĐT." : "") ||
        (err?.message === "SHIP_REQUIRES_ADDRESS" ? "Giao hàng: bắt buộc nhập địa chỉ." : "") ||
        (err?.message === "REDEEM_REQUIRES_PHONE" ? "Sử dụng điểm: cần có SĐT khách hàng." : "") ||
        (err?.message === "TOTAL_INVALID" ? "Tổng thanh toán không hợp lệ." : "") ||
        (err?.message === "CONFIRM_REQUIRE_FULL_PAYMENT"
          ? "CONFIRM: Tổng tiền thanh toán phải đúng bằng tổng đơn (sau khi trừ điểm/giảm giá/phụ phí)."
          : "") ||
        (err?.message === "DEBT_REQUIRES_PAYMENT" ? "DEBT: Phải nhập ít nhất 1 khoản thanh toán." : "") ||
        (err?.message === "DEBT_REQUIRE_PARTIAL_PAYMENT"
          ? "DEBT: Phải thu một phần (0 < đã trả < tổng đơn sau trừ điểm)."
          : "") ||
        (err?.message === "ORDER_ID_INVALID"
          ? "Server không trả về _id dạng ObjectId. Hãy kiểm tra response API tạo đơn."
          : "") ||
        "Không tạo đơn / thanh toán được.";

      message.error({ content: msg, key, duration: 3 });
      throw err;
    }
  };

  return (
    <Routes>
      <Route
        path="/login"
        element={isLoggedIn ? <Navigate to="/" replace /> : <LoginPage onLoginSuccess={handleLoginSuccess} />}
      />

      {/* SHOP ONLINE */}
      <Route path="/shop" element={<ShopOnlinePage />} />
      <Route path="/product/:id" element={<ProductDetailPage />} />
      <Route path="/category/:categoryId" element={<ProductCategory />} />
      <Route path="/flash-sale/:flashSaleId" element={<ProductFlashSale />} />
      <Route path="/checkout" element={<CheckoutPage />} />
      <Route path="/my-orders" element={<MyOrdersPage />} />
      <Route path="/my-orders/:orderId" element={<OrderDetailPage />} />

      <Route
        path="/"
        element={
          <ProtectedRoute isAuthenticated={isLoggedIn}>
            <Layout
              currentUser={currentUser}
              onLogout={() => {
                setIsLoggedIn(false);
                setCurrentUser(null);
              }}
            />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/pos" replace />} />
        <Route
          path="pos"
          element={
            <POSSection
              activeOrders={activeOrders}
              currentOrderId={currentOrderId}
              setCurrentOrderId={setCurrentOrderId}
              createNewOrder={createNewOrder}
              deleteOrder={deleteOrder}
              addToCart={addToCart}
              updateQuantity={updateQuantity}
              removeFromCart={removeFromCart}
              updateCustomerName={updateCustomerName}
              getTotal={getTotal}
              completeOrder={completeOrder}
              completeOrderWithStatus={completeOrderWithStatus as any}
              getCurrentOrder={getCurrentOrderFn}
              posBranchId={posBranchId}
              setPosBranchId={setPosBranchId}
              currentUser={currentUser}
              replaceCurrentOrderItems={replaceCurrentOrderItems as any}
            />
          }
        />

        <Route path="orders" element={<OrdersSection />} />
        <Route path="products" element={<ProductInputSection />} />
        <Route path="inventory" element={<InventorySection />} />
        <Route path="warehouse" element={<WarehouseSection />} />
        <Route path="customers" element={<CustomersSection />} />
        {/* <Route path="revenue" element={<RevenueSection />} /> */}
        <Route path="shop-settings" element={<ShopSettings branchId={posBranchId} />} />
        <Route path="flash-sales-admin" element={<FlashSalesAdminSection />} />
        <Route path="shop" element={<ShopOnlinePage />} />
      </Route>

      <Route path="*" element={<Navigate to="/shop" replace />} />
    </Routes>
  );
};

const App: React.FC = () => (
  <BrowserRouter>
    <AppInner />
  </BrowserRouter>
);

export default App;
