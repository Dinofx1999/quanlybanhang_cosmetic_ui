import React, { useEffect, useMemo, useState } from "react";
import { Drawer, Button, InputNumber, Empty, message } from "antd";
import { Minus, Plus, Trash2, X, ShoppingBag, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  getCart,
  subscribeCart,
  setQty,
  incQty,
  decQty,
  removeItem,
  clearCart,
} from "../../../../utils/cart";

// Types
interface CartItem {
  id: string;
  name: string;
  price: number;
  qty: number;
  image?: string;
  sku?: string;
  variantName?: string;
  attrsText?: string;
}

interface CartDrawerProps {
  open: boolean;
  onClose: () => void;
  title?: string;
}

const formatMoney = (amount: number): string => {
  return Number(amount || 0).toLocaleString("vi-VN");
};

// Cart Item Component với animations
const CartItemCard: React.FC<{
  item: CartItem;
  onRemove: () => void;
  onQtyChange: (qty: number) => void;
  onIncrement: () => void;
  onDecrement: () => void;
}> = ({ item, onRemove, onQtyChange, onIncrement, onDecrement }) => {
  const itemTotal = Number(item.price || 0) * Number(item.qty || 0);

  return (
    <div className="group relative overflow-hidden rounded-3xl border border-pink-100 bg-gradient-to-br from-white to-pink-50/30 p-4 transition-all duration-300 hover:border-pink-300 hover:shadow-xl hover:shadow-pink-100/50 hover:-translate-y-0.5">
      {/* Decorative gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-pink-500/0 via-purple-500/0 to-pink-500/5 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      
      <div className="relative flex gap-4">
        {/* Product Image */}
        <div className="relative h-24 w-24 flex-shrink-0 overflow-hidden rounded-2xl bg-gradient-to-br from-pink-100 to-purple-100 p-1">
          <img
            src={item.image || "/placeholder.png"}
            alt={item.name}
            className="h-full w-full rounded-xl object-cover transition-transform duration-300 group-hover:scale-110"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src = "/placeholder.png";
            }}
          />
          {/* Qty badge */}
          <div className="absolute -right-1 -top-1 flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-pink-500 to-pink-600 text-xs font-bold text-white shadow-lg">
            {item.qty}
          </div>
        </div>

        {/* Product Info */}
        <div className="flex min-w-0 flex-1 flex-col">
          {/* Name & Delete */}
          <div className="mb-2 flex items-start justify-between gap-2">
            <h4 className="line-clamp-2 flex-1 font-semibold text-gray-900 transition-colors group-hover:text-pink-600">
              {item.name}
            </h4>
            <button
              onClick={onRemove}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-red-50 text-red-500 opacity-0 transition-all duration-200 hover:bg-red-100 group-hover:opacity-100"
            >
              <Trash2 size={14} />
            </button>
          </div>

          {/* Meta Info */}
          {(item.sku || item.variantName || item.attrsText) && (
            <div className="mb-2 space-y-1 text-xs text-gray-500">
              {item.sku && (
                <div className="flex items-center gap-1">
                  <span className="inline-block h-1 w-1 rounded-full bg-pink-400" />
                  SKU: {item.sku}
                </div>
              )}
              {item.variantName && (
                <div className="flex items-center gap-1">
                  <span className="inline-block h-1 w-1 rounded-full bg-purple-400" />
                  {item.variantName}
                </div>
              )}
              {item.attrsText && (
                <div className="flex items-center gap-1">
                  <span className="inline-block h-1 w-1 rounded-full bg-blue-400" />
                  {item.attrsText}
                </div>
              )}
            </div>
          )}

          {/* Price & Quantity Controls */}
          <div className="mt-auto flex items-end justify-between gap-3">
            <div className="flex items-center gap-1.5 rounded-full border border-pink-200 bg-white p-1 shadow-sm">
              <button
                onClick={onDecrement}
                disabled={item.qty <= 1}
                className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-pink-100 to-pink-200 text-pink-700 transition-all hover:from-pink-200 hover:to-pink-300 disabled:opacity-40"
              >
                <Minus size={12} />
              </button>
              <InputNumber
                min={1}
                max={999}
                value={item.qty}
                className="!w-12 border-0 text-center"
                size="small"
                controls={false}
                onChange={(v) => onQtyChange(Number(v || 1))}
              />
              <button
                onClick={onIncrement}
                className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-pink-500 to-pink-600 text-white transition-all hover:from-pink-600 hover:to-pink-700 shadow-sm"
              >
                <Plus size={12} />
              </button>
            </div>

            <div className="flex flex-col items-end">
              <span className="text-xs text-gray-400 line-through">
                {formatMoney(item.price * (item.qty + 1))}đ
              </span>
              <span className="bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-lg font-bold text-transparent">
                {formatMoney(itemTotal)}đ
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Cart Summary Component
const CartSummary: React.FC<{
  totalQty: number;
  totalMoney: number;
  onClearCart: () => void;
  onCheckout: () => void;
}> = ({ totalQty, totalMoney, onClearCart, onCheckout }) => {
  return (
    <div className="space-y-4">
      {/* Summary Card */}
      <div className="relative overflow-hidden rounded-3xl border border-pink-200 bg-gradient-to-br from-white via-pink-50/50 to-purple-50/30 p-5 shadow-xl shadow-pink-100/50">
        {/* Decorative elements */}
        <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-gradient-to-br from-pink-200/30 to-purple-200/30 blur-3xl" />
        <div className="absolute -bottom-10 -left-10 h-32 w-32 rounded-full bg-gradient-to-br from-purple-200/30 to-pink-200/30 blur-3xl" />
        
        <div className="relative space-y-3">
          {/* Summary Info */}
          <div className="flex items-center justify-between rounded-2xl bg-white/70 p-3 backdrop-blur-sm">
            <span className="flex items-center gap-2 text-sm text-gray-600">
              <Sparkles size={14} className="text-pink-500" />
              Tổng số lượng
            </span>
            <span className="font-bold text-gray-900">{totalQty} món</span>
          </div>

          <div className="flex items-center justify-between rounded-2xl bg-gradient-to-r from-pink-50 to-purple-50 p-4">
            <span className="text-base font-semibold text-gray-700">Tổng cộng</span>
            <div className="text-right">
              <div className="bg-gradient-to-r from-pink-600 via-purple-600 to-pink-600 bg-clip-text text-2xl font-extrabold text-transparent">
                {formatMoney(totalMoney)}đ
              </div>
              <div className="text-xs text-gray-500">Đã bao gồm VAT</div>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={onClearCart}
          className="group relative overflow-hidden rounded-2xl border-2 border-red-200 bg-white px-4 py-3.5 font-semibold text-red-600 transition-all hover:border-red-300 hover:bg-red-50 hover:shadow-lg active:scale-95"
        >
          <div className="flex items-center justify-center gap-2">
            <Trash2 size={16} />
            <span>Xoá giỏ</span>
          </div>
        </button>

        <button
          onClick={onCheckout}
          className="group relative overflow-hidden rounded-2xl bg-gradient-to-r from-pink-600 via-purple-600 to-pink-600 bg-size-200 px-4 py-3.5 font-bold text-white shadow-lg shadow-pink-500/50 transition-all hover:bg-right hover:shadow-xl hover:shadow-pink-500/60 active:scale-95"
        >
          <div className="flex items-center justify-center gap-2">
            <ShoppingBag size={16} />
            <span>Thanh toán</span>
          </div>
          {/* Shine effect */}
          <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-500 group-hover:translate-x-full" />
        </button>
      </div>
    </div>
  );
};

// Main Component
export default function CartDrawer({
  open,
  onClose,
  title = "Giỏ hàng của bạn",
}: CartDrawerProps) {
  const navigate = useNavigate();
  const [items, setItems] = useState<CartItem[]>(() => getCart());

  useEffect(() => {
    setItems(getCart());
    const unsubscribe = subscribeCart(() => setItems(getCart()));
    return () => {
      if (typeof unsubscribe === "function") unsubscribe();
    };
  }, []);

  const totalQty = useMemo(
    () => items.reduce((sum, item) => sum + Number(item.qty || 0), 0),
    [items]
  );

  const totalMoney = useMemo(
    () =>
      items.reduce(
        (sum, item) => sum + Number(item.price || 0) * Number(item.qty || 0),
        0
      ),
    [items]
  );

  const handleRemoveItem = (itemId: string, itemName: string) => {
    removeItem(itemId);
    message.success({
      content: `Đã xoá "${itemName}" khỏi giỏ hàng`,
      icon: <Trash2 size={16} className="text-red-500" />,
    });
  };

  const handleClearCart = () => {
    clearCart();
    message.success("Đã xoá toàn bộ giỏ hàng");
  };

  const handleCheckout = () => {
    onClose();
    navigate("/checkout");
  };

  return (
    <Drawer
      open={open}
      onClose={onClose}
      width={460}
      title={
        <div className="flex items-center justify-between py-2">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-pink-500 to-purple-600 shadow-lg shadow-pink-500/50">
              <ShoppingBag size={22} className="text-white" />
            </div>
            <div>
              <h3 className="bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-xl font-bold text-transparent">
                {title}
              </h3>
              {totalQty > 0 && (
                <p className="text-xs text-gray-500">{totalQty} sản phẩm</p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100 text-gray-600 transition-all hover:bg-gray-200 hover:text-gray-900"
          >
            <X size={18} />
          </button>
        </div>
      }
      closeIcon={null}
      destroyOnClose
      styles={{
        body: { padding: 0 },
        header: { borderBottom: "1px solid rgb(254 205 211)", padding: "16px 24px" },
      }}
    >
      <div className="flex h-full flex-col bg-gradient-to-b from-pink-50/30 to-white">
        {items.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center px-6 py-20">
            <div className="mb-6 flex h-32 w-32 items-center justify-center rounded-full bg-gradient-to-br from-pink-100 to-purple-100">
              <ShoppingBag size={56} className="text-pink-400" />
            </div>
            <h3 className="mb-2 text-xl font-bold text-gray-900">
              Giỏ hàng trống
            </h3>
            <p className="mb-6 text-center text-gray-500">
              Hãy khám phá và thêm những sản phẩm yêu thích vào giỏ hàng nhé!
            </p>
            <button
              onClick={onClose}
              className="rounded-2xl bg-gradient-to-r from-pink-600 to-purple-600 px-8 py-3 font-semibold text-white shadow-lg shadow-pink-500/50 transition-all hover:shadow-xl active:scale-95"
            >
              Tiếp tục mua sắm
            </button>
          </div>
        ) : (
          <>
            {/* Cart Items - Scrollable */}
            <div className="flex-1 space-y-3 overflow-y-auto px-6 py-6">
              {items.map((item, index) => (
                <div
                  key={item.id}
                  style={{
                    animation: `slideIn 0.3s ease-out ${index * 0.05}s both`,
                  }}
                >
                  <CartItemCard
                    item={item}
                    onRemove={() => handleRemoveItem(item.id, item.name)}
                    onQtyChange={(qty) => setQty(item.id, qty)}
                    onIncrement={() => incQty(item.id)}
                    onDecrement={() => decQty(item.id)}
                  />
                </div>
              ))}
            </div>

            {/* Cart Summary - Sticky at bottom */}
            <div className="border-t border-pink-100 bg-white p-6 shadow-2xl shadow-pink-100/50">
              <CartSummary
                totalQty={totalQty}
                totalMoney={totalMoney}
                onClearCart={handleClearCart}
                onCheckout={handleCheckout}
              />
            </div>
          </>
        )}
      </div>

      <style>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .bg-size-200 {
          background-size: 200%;
        }
      `}</style>
    </Drawer>
  );
}