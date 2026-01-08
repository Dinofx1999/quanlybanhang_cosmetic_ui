import React, { useState, useEffect, useCallback } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
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
import { isAuthenticated, getCurrentUser } from "./services/authService";
import api from "./services/api";
import { getEffectiveBranchId } from "./services/branchContext";

// ===============================
// Types (match backend style)
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

interface CompletedOrder {
  id: string;
  date: string;
  customer: string;
  total: number;
  status: "pending" | "shipping" | "completed" | "cancelled";
  items: number;
}

interface User {
  id?: string;
  username?: string;
  name?: string;
  role?: string;
  branchId?: string | null;
}

// ===============================
// App
// ===============================
const App: React.FC = () => {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // ✅ products from API (already includes stock)
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState<boolean>(false);

  // ===============================
  // POS orders local logic
  // ===============================
  const [activeOrders, setActiveOrders] = useState<Order[]>([
    {
      id: 1,
      orderNumber: "TMP001",
      customer: "Khách lẻ",
      items: [],
      createdAt: new Date(),
      status: "active",
    },
  ]);
  const [currentOrderId, setCurrentOrderId] = useState<number>(1);
  const [nextOrderNumber, setNextOrderNumber] = useState<number>(2);

  const [completedOrders, setCompletedOrders] = useState<CompletedOrder[]>([
    { id: "DH001", date: "2024-01-07", customer: "Nguyễn Thu Hà", total: 1200000, status: "completed", items: 3 },
    { id: "DH002", date: "2024-01-07", customer: "Trần Minh Anh", total: 680000, status: "pending", items: 2 },
    { id: "DH003", date: "2024-01-06", customer: "Lê Thanh Mai", total: 955000, status: "completed", items: 4 },
  ]);

  // ===============================
  // Auth bootstrap
  // ===============================
  useEffect(() => {
    if (isAuthenticated()) {
      setIsLoggedIn(true);
      setCurrentUser(getCurrentUser());
    }
  }, []);

  const handleLoginSuccess = (data: any): void => {
    setIsLoggedIn(true);
    setCurrentUser(data?.user || getCurrentUser());
  };

  // ===============================
  // Fetch products (by effective branch)
  // ===============================
  const fetchProducts = useCallback(async () => {
    setLoadingProducts(true);
    try {
      const user = getCurrentUser();
      const branchId = getEffectiveBranchId(user); // null = ALL, string = branchId

      const res = await api.get("/products", {
        params: branchId ? { branchId } : {},
      });

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
        stock: Number(p.stock || 0), // ✅ từ API
        thumbnail: p.thumbnail || "",
        images: Array.isArray(p.images) ? p.images : [],
        isActive: p.isActive !== false,
      }));

      setProducts(mapped);
    } catch (err: any) {
      console.error("Fetch products error:", err?.response?.data || err?.message);
      setProducts([]);
    } finally {
      setLoadingProducts(false);
    }
  }, []);

  // load products after login
  useEffect(() => {
    if (!isLoggedIn) return;
    fetchProducts();
  }, [isLoggedIn, fetchProducts]);

  // ✅ refetch when branch changes (Layout will dispatch this event)
  useEffect(() => {
    const onBranchChanged = () => {
      // clear cart to avoid mixing branches (optional but recommended)
      setActiveOrders((prev) =>
        prev.map((o) => (o.id === currentOrderId ? { ...o, items: [] } : o))
      );
      fetchProducts();
    };
    window.addEventListener("branch_changed", onBranchChanged);
    return () => window.removeEventListener("branch_changed", onBranchChanged);
  }, [fetchProducts, currentOrderId]);

  // ===============================
  // POS logic (stock-safe)
  // ===============================
  const getCurrentOrder = (): Order | undefined => {
    return activeOrders.find((order) => order.id === currentOrderId);
  };

  const createNewOrder = (): void => {
    const newOrder: Order = {
      id: Date.now(),
      orderNumber: `TMP${String(nextOrderNumber).padStart(3, "0")}`,
      customer: `Khách lẻ`,
      items: [],
      createdAt: new Date(),
      status: "active",
    };
    setActiveOrders((prev) => [...prev, newOrder]);
    setCurrentOrderId(newOrder.id);
    setNextOrderNumber((n) => n + 1);
  };

  const getCartQty = (order: Order | undefined, productId: string): number => {
    if (!order) return 0;
    const it = order.items.find((x) => x._id === productId);
    return it ? Number(it.quantity || 0) : 0;
  };

  // ✅ addToCart: do NOT exceed stock
  const addToCart = (product: Product): void => {
    const order = getCurrentOrder();
    if (!order) return;

    const stock = Number(product.stock || 0);
    if (stock <= 0) return; // no stock -> ignore

    const currentQty = getCartQty(order, product._id);
    if (currentQty >= stock) return; // reached stock -> ignore

    setActiveOrders((prev) =>
      prev.map((o) => {
        if (o.id !== currentOrderId) return o;

        const existing = o.items.find((it) => it._id === product._id);
        if (existing) {
          return {
            ...o,
            items: o.items.map((it) =>
              it._id === product._id
                ? { ...it, quantity: Math.min(stock, Number(it.quantity || 0) + 1) }
                : it
            ),
          };
        }

        return { ...o, items: [...o.items, { ...product, quantity: 1 }] };
      })
    );
  };

  const updateQuantity = (productId: string, delta: number): void => {
    const order = getCurrentOrder();
    if (!order) return;

    const p = products.find((x) => x._id === productId) || order.items.find((x) => x._id === productId);
    const stock = Number(p?.stock || 0);

    setActiveOrders((prev) =>
      prev.map((o) => {
        if (o.id !== currentOrderId) return o;

        return {
          ...o,
          items: o.items
            .map((it) => {
              if (it._id !== productId) return it;

              const next = Number(it.quantity || 0) + delta;
              if (next <= 0) return { ...it, quantity: 0 };
              if (stock > 0) return { ...it, quantity: Math.min(stock, next) };
              return { ...it, quantity: next };
            })
            .filter((it) => Number(it.quantity || 0) > 0),
        };
      })
    );
  };

  const removeFromCart = (productId: string): void => {
    setActiveOrders((prev) =>
      prev.map((o) => {
        if (o.id !== currentOrderId) return o;
        return { ...o, items: o.items.filter((it) => it._id !== productId) };
      })
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

  const deleteOrder = (orderId: number): void => {
    if (activeOrders.length === 1) {
      alert("Không thể xóa đơn hàng duy nhất!");
      return;
    }

    setActiveOrders((prev) => prev.filter((o) => o.id !== orderId));

    if (currentOrderId === orderId) {
      const next = activeOrders.find((o) => o.id !== orderId);
      if (next) setCurrentOrderId(next.id);
    }
  };

  // POS checkout handled inside POSSection now (order create/confirm flow)
  const completeOrder = (): void => {
    // kept for compatibility, POSSection will call its own flow or call this if you want
    // alert("POSSection sẽ xử lý quy trình tạo/confirm order theo API /orders.");
  };

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/login"
          element={isLoggedIn ? <Navigate to="/" replace /> : <LoginPage onLoginSuccess={handleLoginSuccess} />}
        />

        <Route
          path="/"
          element={
            <ProtectedRoute isAuthenticated={isLoggedIn}>
              <Layout currentUser={currentUser} onBranchChanged={fetchProducts} />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/pos" replace />} />

          <Route
            path="pos"
            element={
              <POSSection
                products={products}
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
                getCurrentOrder={getCurrentOrder}
              />
            }
          />

          <Route
            path="orders"
            element={<OrdersSection completedOrders={completedOrders} setCompletedOrders={setCompletedOrders} />}
          />

          <Route path="products" element={<ProductInputSection />} />

          {/* ✅ Inventory receives products with stock already */}
          <Route path="inventory" element={<InventorySection products={products} />} />

          <Route path="warehouse" element={<WarehouseSection />} />

          <Route path="staff" element={<StaffSection />} />

          <Route path="revenue" element={<RevenueSection products={products as any} />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
