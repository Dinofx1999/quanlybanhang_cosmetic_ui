import React, { useState, useEffect, useCallback, useMemo } from "react";
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";
import { message } from "antd";

import LoginPage from "./components/Auth/LoginPage";
import Layout from "./components/Layout/Layout";
import POSSection from "./components/POS/POSSection";
import OrdersSection from "./components/Orders/OrdersSection";
import ProductInputSection from "./components/Products/ProductInputSection";
import InventorySection from "./components/Inventory/InventorySection";
import WarehouseSection from "./components/Warehouse/WarehouseSection";
import StaffSection from "./components/Staff/StaffSection";
import RevenueSection from "./components/Revenue/RevenueSection";
import ProtectedRoute from "./components/Auth/ProtectedRoute";
import ShopSettings from "./components/ShopSettings/ShopSettings";
import { BRANCH_KEY, getPosBranchId } from "./services/branchContext";

import { isAuthenticated, getCurrentUser } from "./services/authService";
import api from "./services/api";

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

interface User {
  id?: string;
  username?: string;
  name?: string;
  role?: string;
  branchId?: string | null;
}

interface Branch {
  _id: string;
  name: string;
  isActive?: boolean;
  code?: string;
}

// Helpers
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

// ===============================
// App Inner
// ===============================
const AppInner: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const [posBranchId, setPosBranchId] = useState<string>("all");
  const [branches, setBranches] = useState<Branch[]>([]);

  const [productsRaw, setProductsRaw] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);

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

  // Fetch branches
  const fetchBranches = useCallback(async () => {
    try {
      const res = await api.get("/branches");
      const items = res.data?.items || [];
      const mapped: Branch[] = items.map((b: any) => ({
        _id: String(b._id),
        name: String(b.name || ""),
        isActive: b.isActive !== false,
        code: b.code || "",
      }));
      setBranches(mapped.filter((b) => b.isActive !== false));
    } catch (err: any) {
      console.error("Fetch branches error:", err?.response?.data || err?.message);
      setBranches([]);
      message.error(err?.response?.data?.message || "Không tải được danh sách chi nhánh.");
    }
  }, []);

  // Fetch products by branch
  const fetchProducts = useCallback(async () => {
    if (!isLoggedIn) return;

    setLoadingProducts(true);
    try {
      const u = getCurrentUser();
      const role = upperRole(u);

      const effective =
        role === "STAFF"
          ? String(u?.branchId || "")
          : String(localStorage.getItem(BRANCH_KEY) || posBranchId || "all");

      const params = effective && effective !== "all" ? { branchId: effective } : {};
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

      setProductsRaw(mapped);
    } catch (err: any) {
      console.error("Fetch products error:", err?.response?.data || err?.message);
      setProductsRaw([]);
      message.error(err?.response?.data?.message || "Không tải được sản phẩm.");
    } finally {
      setLoadingProducts(false);
    }
  }, [isLoggedIn, posBranchId]);

  useEffect(() => {
    if (!isLoggedIn) return;
    fetchBranches();
    fetchProducts();
  }, [isLoggedIn, fetchBranches, fetchProducts]);

  // listen branch_changed
  useEffect(() => {
    if (!isLoggedIn) return;

    const onBranchChanged = () => {
      const u = getCurrentUser();
      const next = getPosBranchId(u);
      setPosBranchId(next);

      // clear current cart
      setActiveOrders((prev) => prev.map((o) => (o.id === currentOrderId ? { ...o, items: [] } : o)));

      fetchProducts();
      message.info("Đã đổi chi nhánh, giỏ hàng hiện tại được làm trống.");
    };

    window.addEventListener("branch_changed", onBranchChanged);
    return () => window.removeEventListener("branch_changed", onBranchChanged);
  }, [isLoggedIn, fetchProducts, currentOrderId]);

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

  // Stock deduction display
  const currentOrder = useMemo(() => activeOrders.find((o) => o.id === currentOrderId), [activeOrders, currentOrderId]);

  const reservedMap = useMemo(() => {
    const m = new Map<string, number>();
    const items = currentOrder?.items || [];
    for (const it of items) m.set(it._id, (m.get(it._id) || 0) + Number(it.quantity || 0));
    return m;
  }, [currentOrder]);

  const productsForPOS = useMemo(() => {
    return productsRaw.map((p) => {
      const reserved = reservedMap.get(p._id) || 0;
      return { ...p, stock: Math.max(0, Number(p.stock || 0) - reserved) };
    });
  }, [productsRaw, reservedMap]);

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

  // ✅ Cho phép bán dù stock <= 0 (kho âm)
  // const available = Number(product.stock || 0);
  // if (available <= 0) {
  //   message.warning("Sản phẩm đã hết hàng.");
  //   return;
  // }

  setActiveOrders((prev) =>
    prev.map((o) => {
      if (o.id !== currentOrderId) return o;

      const existing = o.items.find((it) => it._id === product._id);
      if (existing) {
        return {
          ...o,
          items: o.items.map((it) =>
            it._id === product._id
              ? { ...it, quantity: Number(it.quantity || 0) + 1 }
              : it
          ),
        };
      }

      // ✅ add mới dù stock = 0 / âm
      return { ...o, items: [...o.items, { ...product, quantity: 1 }] };
    })
  );
};

const updateQuantity = (productId: string, delta: number): void => {
  // ✅ Không cần rawStock để cap nữa (vì cho phép âm kho)
  // const raw = productsRaw.find((p) => p._id === productId);
  // const rawStock = Number(raw?.stock || 0);

  setActiveOrders((prev) =>
    prev.map((o) => {
      if (o.id !== currentOrderId) return o;

      return {
        ...o,
        items: o.items
          .map((it) => {
            if (it._id !== productId) return it;

            // ✅ chỉ chặn về 0 (không cho qty âm), còn lại cho tăng tự do
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

  const completeOrder = (): void => {
    // legacy giữ lại
  };

  const completeOrderWithStatus = async (
  status: "PENDING" | "CONFIRM",
  payload: {
    branchId: string;
    customer?: { name?: string; phone?: string; email?: string };
    delivery: { method: "PICKUP" | "DELIVERY"; address?: string; note?: string };
    payment: { method: "CASH" | "BANK" | "PENDING"; amount: number };
    discount?: number;
    extraFee?: number;
    pricingNote?: string;
  }
) => {
  const order = getCurrentOrderFn();
  if (!order) throw new Error("NO_CURRENT_ORDER");
  if (!payload.branchId || payload.branchId === "all") throw new Error("POS_BRANCH_REQUIRED");

  const items = order.items.map((it) => ({ productId: it._id, qty: Number(it.quantity || 0) }));
  if (!items.length) throw new Error("EMPTY_CART");

  const key = "pos-create-order";
  message.loading({ content: "Đang tạo đơn...", key });

  // 1) CREATE ORDER (backend currently creates PENDING)
  const res = await api.post("/orders", {
    channel: "POS",
    branchId: payload.branchId,

    customer: payload.customer?.phone
      ? {
          phone: payload.customer.phone,
          name: payload.customer.name || "",
          email: payload.customer.email || "",
        }
      : undefined,

    delivery: {
      method: payload.delivery.method === "DELIVERY" ? "SHIP" : "PICKUP",
      address: payload.delivery.address || "",
      note: payload.delivery.note || (payload.delivery.method === "PICKUP" ? "Bán tại quầy" : ""),
    },

    discount: Number(payload.discount || 0),
    extraFee: Number(payload.extraFee || 0),
    pricingNote: payload.pricingNote || "",

    items,
  });

  const created = res.data?.order;
  if (!created?._id) {
    message.error({ content: "Tạo đơn thất bại.", key });
    throw new Error("ORDER_CREATE_FAILED");
  }

  // 2) CONFIRM if needed
  if (status === "CONFIRM") {
    const method = payload.payment.method;
    if (method === "PENDING") {
      message.error({ content: "Không thể CONFIRM với phương thức PENDING.", key });
      throw new Error("PAYMENT_METHOD_INVALID_FOR_CONFIRM");
    }

    const totalServer = Number(created?.total || 0);
    await api.post(`/orders/${created._id}/confirm`, {
      payment: { method, amount: totalServer },
    });
  }

  // 3) reset cart
  setActiveOrders((prev) =>
    prev.map((o) => (o.id === currentOrderId ? { ...o, items: [], customer: "Khách lẻ" } : o))
  );

  await fetchProducts();

  message.success({
    content: status === "CONFIRM" ? "Đã tạo & xác nhận đơn thành công!" : "Đã tạo đơn thành công!",
    key,
    duration: 2,
  });

  // ✅ IMPORTANT: return _id để POSSection in theo _id
  return { orderId: created._id, order: created };

};


  return (
    <Routes>
      <Route
        path="/login"
        element={isLoggedIn ? <Navigate to="/" replace /> : <LoginPage onLoginSuccess={handleLoginSuccess} />}
      />

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
              products={productsForPOS}
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
              completeOrderWithStatus={completeOrderWithStatus}
              getCurrentOrder={getCurrentOrderFn}
              branches={branches}
              posBranchId={posBranchId}
              setPosBranchId={setPosBranchId}
              currentUser={currentUser}
            />
          }
        />

        <Route path="orders" element={<OrdersSection />} />
        <Route path="products" element={<ProductInputSection />} />
        <Route path="inventory" element={<InventorySection />} />
        <Route path="warehouse" element={<WarehouseSection />} />
        <Route path="staff" element={<StaffSection />} />
        <Route
                path="shop-settings"
                element={
                  <ShopSettings
                    branchId={posBranchId}
                  />
                }
              />
        <Route path="revenue" element={<RevenueSection products={productsRaw as any} />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

const App: React.FC = () => (
  <BrowserRouter>
    <AppInner />
  </BrowserRouter>
);

export default App;
