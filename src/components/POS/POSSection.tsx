import React from "react";
import { Plus, Minus, Trash2, ShoppingBag, CreditCard, User, Search } from "lucide-react";

// ===============================
// Types (match backend)
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
}) => {
  const currentOrder = getCurrentOrder();
  const [searchTerm, setSearchTerm] = React.useState("");

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

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Left Side - Products */}
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
            <h3 className="font-semibold text-gray-800">
              Sản Phẩm ({filteredProducts.length})
            </h3>
            <div className="text-xs text-gray-500">
              Click để thêm vào giỏ
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {filteredProducts.map((p) => {
              const img = getPrimaryImage(p);

              return (
                <button
                  key={p._id}
                  onClick={() => addToCart(p)}
                  className="group bg-white border border-gray-200 hover:border-pink-300 rounded-lg overflow-hidden transition-all text-left hover:shadow-sm"
                  title={p.name}
                >
                  {/* Image */}
                  <div className="relative w-full aspect-square bg-gray-50">
                    {img ? (
                      <img
                        src={img}
                        alt={p.name}
                        className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform"
                        loading="lazy"
                        onError={(e) => {
                          // fallback: hide broken image
                          (e.currentTarget as HTMLImageElement).style.display = "none";
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400 text-3xl">
                        🧴
                      </div>
                    )}

                    {/* Badge category */}
                    <div className="absolute top-2 left-2 text-[11px] px-2 py-1 rounded bg-white/90 border border-gray-200 text-gray-700 max-w-[90%] truncate">
                      {p.categoryName || "—"}
                    </div>
                  </div>

                  {/* Info */}
                  <div className="p-3">
                    <div className="text-sm font-semibold text-gray-800 line-clamp-2 min-h-[40px]">
                      {p.name}
                    </div>

                    <div className="mt-1 text-[11px] text-gray-500 truncate">
                      {p.sku ? `SKU: ${p.sku}` : p.barcode ? `BC: ${p.barcode}` : ""}
                    </div>

                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-xs font-bold text-pink-600">
                        {money(p.price)}đ
                      </span>
                      <span className="text-xs text-gray-500">
                        SL: {Number(p.stock ?? 0)}
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {filteredProducts.length === 0 && (
            <div className="py-10 text-center text-sm text-gray-500">
              Không tìm thấy sản phẩm phù hợp.
            </div>
          )}
        </div>
      </div>

      {/* Right Side - Cart */}
      <div className="space-y-4">
        {/* Order Tabs (wrap rows, no scroll) */}
        <div className="bg-white rounded-lg border border-gray-200 p-3">
          <div className="flex flex-wrap gap-2">
            {activeOrders.map((order) => (
              <button
                key={order.id}
                onClick={() => setCurrentOrderId(order.id)}
                className={`px-3 py-2 rounded-lg font-medium text-sm transition-all flex items-center gap-2 ${
                  order.id === currentOrderId
                    ? "bg-pink-500 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                <span className="whitespace-nowrap">{order.orderNumber}</span>

                {order.id !== currentOrderId && order.id !== 1 && (
                  <span
                    onClick={(e) => {
                      e.stopPropagation();
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
              onClick={createNewOrder}
              className="px-3 py-2 rounded-lg bg-pink-50 text-pink-600 hover:bg-pink-100 font-medium text-sm flex items-center gap-1"
            >
              <Plus className="w-4 h-4" />
              Thêm
            </button>
          </div>
        </div>

        {/* Cart */}
        <div className="bg-white rounded-lg border border-gray-200 flex flex-col h-[calc(100vh-240px)] lg:h-auto">
          {/* Cart Header */}
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center gap-2 mb-3">
              <ShoppingBag className="w-5 h-5 text-pink-500" />
              <h3 className="font-semibold text-gray-800">Giỏ Hàng</h3>
              <span className="text-sm text-gray-500">({currentOrder?.items.length || 0})</span>
            </div>

            {/* Customer Name */}
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={currentOrder?.customer || ""}
                onChange={(e) => currentOrder && updateCustomerName(currentOrder.id, e.target.value)}
                placeholder="Tên khách hàng..."
                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent outline-none text-sm"
              />
            </div>
          </div>

          {/* Cart Items */}
          <div className="flex-1 overflow-y-auto p-3">
            {currentOrder && currentOrder.items.length > 0 ? (
              <div className="space-y-2">
                {currentOrder.items.map((item) => {
                  const img = getPrimaryImage(item);

                  return (
                    <div
                      key={item._id}
                      className="bg-gray-50 rounded-lg p-3 border border-gray-200"
                    >
                      <div className="flex items-start gap-3 mb-2">
                        {/* Image */}
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

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-sm text-gray-800 truncate">
                            {item.name}
                          </h4>

                          <div className="text-[11px] text-gray-500 truncate">
                            {item.categoryName || ""}{item.sku ? ` • ${item.sku}` : ""}
                          </div>

                          <p className="text-xs text-pink-600 font-semibold mt-1">
                            {money(item.price)}đ
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        {/* Quantity */}
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => updateQuantity(item._id, -1)}
                            className="p-1 rounded bg-gray-200 hover:bg-gray-300"
                            title="Giảm"
                          >
                            <Minus className="w-3 h-3 text-gray-600" />
                          </button>

                          <span className="w-6 text-center font-semibold text-sm">
                            {item.quantity}
                          </span>

                          <button
                            onClick={() => updateQuantity(item._id, 1)}
                            className="p-1 rounded bg-pink-500 hover:bg-pink-600"
                            title="Tăng"
                          >
                            <Plus className="w-3 h-3 text-white" />
                          </button>

                          <span className="ml-2 text-xs text-gray-500">
                            tồn: {Number(item.stock ?? 0)}
                          </span>
                        </div>

                        {/* Subtotal & Remove */}
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-gray-800">
                            {money(item.price * item.quantity)}đ
                          </span>

                          <button
                            onClick={() => removeFromCart(item._id)}
                            className="p-1 rounded bg-red-50 hover:bg-red-100"
                            title="Xoá"
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
              <div className="flex flex-col items-center justify-center h-full text-center py-8">
                <ShoppingBag className="w-12 h-12 text-gray-300 mb-2" />
                <p className="text-gray-500 text-sm">Chưa có sản phẩm</p>
              </div>
            )}
          </div>

          {/* Cart Footer */}
          <div className="p-4 border-t border-gray-200 bg-gray-50">
            {/* Total */}
            <div className="flex items-center justify-between mb-3">
              <span className="text-gray-600 font-medium">Tổng cộng:</span>
              <span className="text-xl font-bold text-gray-800">
                {currentOrder ? money(getTotal(currentOrder.id)) : "0"}đ
              </span>
            </div>

            {/* Checkout Button */}
            <button
              onClick={completeOrder}
              disabled={!currentOrder || currentOrder.items.length === 0}
              className="w-full bg-pink-500 hover:bg-pink-600 text-white py-3 rounded-lg font-semibold disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              <CreditCard className="w-5 h-5" />
              Thanh Toán
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default POSSection;
