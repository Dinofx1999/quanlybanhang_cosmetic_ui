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

// ===============================
// Types (match backend + POS needs)
// ===============================
interface ProductImage {
  url: string;
  isPrimary?: boolean;
  order?: number;
}

interface Product {
  _id: string; // ✅ dùng _id thật cho cart
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

interface OrderItem extends Product {
  quantity: number;
}

interface Order {
  id: number; // local temp id for order tab
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
  id?: number;
  username?: string;
  name?: string;
  role?: string;
}

// ===============================
// App
// ===============================
const App: React.FC = () => {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // ✅ products from API
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState<boolean>(false);

  const [activeOrders, setActiveOrders] = useState<Order[]>([
    {
      id: 1,
      orderNumber: "TMP001",
      customer: "Khách hàng 1",
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

  useEffect(() => {
    if (isAuthenticated()) {
      setIsLoggedIn(true);
      setCurrentUser(getCurrentUser());
    }
  }, []);

  const handleLoginSuccess = (data: any): void => {
    setIsLoggedIn(true);
    setCurrentUser(data.user || getCurrentUser());
  };

  // ===============================
  // Fetch products API
  // ===============================
  const fetchProducts = useCallback(async () => {
    setLoadingProducts(true);
    try {
      const res = await api.get("/products"); // baseURL = http://localhost:3000/api
      const items = res.data?.items || [];

      const mapped: Product[] = items.map((p: any) => ({
        _id: String(p._id),
        sku: p.sku || "",
        name: p.name || "",
        categoryId: p.categoryId ? String(p.categoryId) : null,
        categoryName: p.categoryName || "",
        price: Number(p.price || 0),
        cost: p.cost !== undefined ? Number(p.cost || 0) : undefined,
        brand: p.brand || "",
        barcode: p.barcode || "",
        stock: 0, // ✅ tạm thời
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

  // ===============================
  // POS logic
  // ===============================
  const createNewOrder = (): void => {
    const newOrder: Order = {
      id: Date.now(),
      orderNumber: `TMP${String(nextOrderNumber).padStart(3, "0")}`,
      customer: `Khách hàng ${nextOrderNumber}`,
      items: [],
      createdAt: new Date(),
      status: "active",
    };
    setActiveOrders((prev) => [...prev, newOrder]);
    setCurrentOrderId(newOrder.id);
    setNextOrderNumber((n) => n + 1);
  };

  const getCurrentOrder = (): Order | undefined => {
    return activeOrders.find((order) => order.id === currentOrderId);
  };

  // ✅ add by _id
  const addToCart = (product: Product): void => {
    const currentOrder = getCurrentOrder();
    if (!currentOrder) return;

    setActiveOrders((prev) =>
      prev.map((order) => {
        if (order.id !== currentOrderId) return order;

        const existingItem = order.items.find((item) => item._id === product._id);

        if (existingItem) {
          return {
            ...order,
            items: order.items.map((item) =>
              item._id === product._id ? { ...item, quantity: item.quantity + 1 } : item
            ),
          };
        }

        return { ...order, items: [...order.items, { ...product, quantity: 1 }] };
      })
    );
  };

  // ✅ update by _id:string
  const updateQuantity = (productId: string, delta: number): void => {
    setActiveOrders((prev) =>
      prev.map((order) => {
        if (order.id !== currentOrderId) return order;

        return {
          ...order,
          items: order.items
            .map((item) => {
              if (item._id === productId) {
                const newQuantity = item.quantity + delta;
                return newQuantity > 0 ? { ...item, quantity: newQuantity } : item;
              }
              return item;
            })
            .filter((item) => item.quantity > 0),
        };
      })
    );
  };

  // ✅ remove by _id:string
  const removeFromCart = (productId: string): void => {
    setActiveOrders((prev) =>
      prev.map((order) => {
        if (order.id !== currentOrderId) return order;
        return { ...order, items: order.items.filter((item) => item._id !== productId) };
      })
    );
  };

  const getTotal = (orderId: number): number => {
    const order = activeOrders.find((o) => o.id === orderId);
    if (!order) return 0;
    return order.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  };

  const updateCustomerName = (orderId: number, name: string): void => {
    setActiveOrders((prev) => prev.map((order) => (order.id === orderId ? { ...order, customer: name } : order)));
  };

  const completeOrder = (): void => {
    const currentOrder = getCurrentOrder();
    if (!currentOrder || currentOrder.items.length === 0) {
      alert("Đơn hàng trống!");
      return;
    }

    const completedOrder: CompletedOrder = {
      id: currentOrder.orderNumber,
      date: new Date().toISOString().split("T")[0],
      customer: currentOrder.customer,
      total: getTotal(currentOrder.id),
      status: "completed",
      items: currentOrder.items.length,
    };

    setCompletedOrders((prev) => [completedOrder, ...prev]);
    setActiveOrders((prev) => prev.filter((order) => order.id !== currentOrderId));

    // chọn order tiếp theo
    const remain = activeOrders.filter((o) => o.id !== currentOrderId);
    if (remain.length > 0) {
      setCurrentOrderId(remain[0].id);
    } else {
      createNewOrder();
    }

    alert(`✓ Đơn hàng ${currentOrder.orderNumber} đã thanh toán!`);
  };

  const deleteOrder = (orderId: number): void => {
    if (activeOrders.length === 1) {
      alert("Không thể xóa đơn hàng duy nhất!");
      return;
    }

    setActiveOrders((prev) => prev.filter((order) => order.id !== orderId));

    if (currentOrderId === orderId) {
      const nextOrder = activeOrders.find((o) => o.id !== orderId);
      if (nextOrder) setCurrentOrderId(nextOrder.id);
    }
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
              <Layout currentUser={currentUser} />
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
                updateQuantity={updateQuantity} // ✅ string
                removeFromCart={removeFromCart} // ✅ string
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

          <Route path="inventory" element={<InventorySection products={products as any} />} />

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
