import React, { useEffect, useState } from "react";
import { Badge, Input, Button } from "antd";
import { Search, ShoppingBag, TicketPercent, Flame , Package } from "lucide-react";
import { getCartCount, subscribeCart } from "../../../../utils/cart";
import CartDrawer from "./CartDrawer"; // ✅ chỉnh path nếu khác
import { useNavigate } from "react-router-dom";
import OrdersDrawer from "./OrdersDrawer"; 

type Props = {
  onSearch?: (q: string) => void;
  onOpenVoucher?: () => void;
  onGoFlash?: () => void;
};

export default function ShopHeader({ onSearch, onOpenVoucher, onGoFlash }: Props) {
  const nav = useNavigate();
  const [cartCount, setCartCount] = useState<number>(() => getCartCount());
  const [openCart, setOpenCart] = useState(false);
  const [openOrders, setOpenOrders] = useState(false);

  useEffect(() => {
    setCartCount(getCartCount());
    const unsubscribe = subscribeCart(() => setCartCount(getCartCount()));
    return () => {
      // call unsubscribe and ignore its return value to satisfy EffectCallback type
      unsubscribe();
    };
  }, []);

  return (
    <>
      <div className="sticky top-0 z-40 w-full bg-white/90 backdrop-blur border-b border-pink-100">
        <div className="w-full px-5 md:px-8 lg:px-10 py-3 flex items-center gap-3">
          <div className="flex items-center gap-2 shrink-0">
            <div className="h-10 w-10 rounded-2xl bg-pink-500 flex items-center justify-center shadow-sm">
              <img
                alt="logo"
                className="w-full h-full object-cover"
                src={`${process.env.REACT_APP_API_URL}/uploads/branches/1768574184904-1628e0c38b65dce695ad7e55.jpg`}
              />
            </div>
            <div className="leading-tight hidden sm:block">
              <div className="font-extrabold text-gray-900 cursor-pointer"
               onClick={() => nav('/shop')}
              >
                Bảo Ân <span className="text-pink-600">Cosmetics</span>
              </div>
              <div className="text-xs text-gray-500">Deal sốc mỗi ngày</div>
            </div>
          </div>

          <div className="flex-1">
            <Input
              size="large"
              allowClear
              placeholder="Tìm kiếm thông tin theo Mã Đơn Hàng đã đặt..."
              prefix={<Search size={18} className="text-pink-500" />}
              className="rounded-2xl"
              onPressEnter={(e) => {
              const value = (e.target as HTMLInputElement).value.trim();
              if (!value) return;

              // ví dụ: điều hướng sang trang xem đơn hàng
              nav(`/my-orders/${value}`);
            }}
            />
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              onClick={onOpenVoucher}
              className="rounded-2xl border-pink-200 text-pink-600 hover:!border-pink-300 hover:!text-pink-700"
            >
              <TicketPercent size={18} />
              <span className="hidden md:inline ml-1">Voucher</span>
            </Button>

            <Button
              onClick={onGoFlash}
              className="rounded-2xl border-pink-200 text-pink-600 hover:!border-pink-300 hover:!text-pink-700"
            >
              <Flame size={18} />
              <span className="hidden md:inline ml-1">Flash</span>
            </Button>

            <Badge count={cartCount} color="#ec4899" overflowCount={99}>
              <Button
                onClick={() => setOpenCart(true)}
                type="primary"
                className="rounded-2xl !bg-pink-500 hover:!bg-pink-600 !border-pink-500"
              >
                <ShoppingBag size={18} />
                <span className="hidden md:inline ml-1">Giỏ</span>
              </Button>
            </Badge>

            <Badge color="#ec4899" overflowCount={99}>
              <Button
              onClick={() => setOpenOrders(true)}
              className="rounded-2xl border-pink-200 text-pink-600 hover:!border-pink-300 hover:!text-pink-700"
            >
              <Package size={18} />
              <span className="hidden md:inline ml-1">Đơn hàng</span>
            </Button>
            </Badge>
          </div>
        </div>
      </div>
      {/* ✅ Drawer cart */}
      <CartDrawer open={openCart} onClose={() => setOpenCart(false)} />
        <OrdersDrawer open={openOrders} onClose={() => setOpenOrders(false)} />
    </>
  );
}
