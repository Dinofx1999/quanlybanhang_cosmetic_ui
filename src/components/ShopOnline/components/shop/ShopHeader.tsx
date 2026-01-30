import React, { useEffect, useState } from "react";
import { Badge, Input, Button } from "antd";
import { Search, ShoppingBag, TicketPercent, Flame, Package } from "lucide-react";
import { getCartCount, subscribeCart } from "../../../../utils/cart";
import CartDrawer from "./CartDrawer";
import OrdersDrawer from "./OrdersDrawer";
import { useNavigate } from "react-router-dom";
import axios from "axios";

type Props = {
  onSearch?: (q: string) => void;
  onOpenVoucher?: () => void;
  onGoFlash?: () => void;
};

type BrandInfo = {
  logo?: string;
  brandName?: string;
};

export default function ShopHeader({ onSearch, onOpenVoucher, onGoFlash }: Props) {
  const nav = useNavigate();

  const [cartCount, setCartCount] = useState<number>(() => getCartCount());
  const [openCart, setOpenCart] = useState(false);
  const [openOrders, setOpenOrders] = useState(false);

  const [brand, setBrand] = useState<BrandInfo>({
    logo: "",
    brandName: "",
  });

  // ==========================
  // Load cart count
  // ==========================
  useEffect(() => {
    setCartCount(getCartCount());
    const unsubscribe = subscribeCart(() => setCartCount(getCartCount()));
    return () => {
      unsubscribe();
    };
  }, []);

  // ==========================
  // Load brand logo (PUBLIC)
  // ==========================
  useEffect(() => {
    let mounted = true;

    axios
      .get(`${process.env.REACT_APP_API_URL}/public/logo`)
      .then((res) => {
        console.log("Loaded brand info:", res.data);
        if (!mounted) return;
        if (res.data?.success) {
          
          setBrand({
            logo: res.data.logo,
            brandName: res.data.brandName,
          });
        }
      })
      .catch(() => {
        // fail silently – không crash UI
      });

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <>
      <div className="sticky top-0 z-40 w-full bg-white/90 backdrop-blur border-b border-pink-100">
        <div className="w-full px-5 md:px-8 lg:px-10 py-3 flex items-center gap-3">
          {/* ===== Brand ===== */}
          <div className="flex items-center gap-2 shrink-0">
            <div
              className="h-10 w-10 bg-pink-500 flex items-center justify-center shadow-sm cursor-pointer overflow-hidden"
              onClick={() => nav("/shop")}
            >
              {brand.logo ? (
                <img
                  alt="logo"
                  className="w-full h-full object-cover"
                  src={brand.logo}
                />
              ) : (
                <span className="text-white font-bold">BA</span>
              )}
            </div>

            <div className="leading-tight hidden sm:block">
  <div
    className="font-extrabold cursor-pointer"
    onClick={() => nav("/shop")}
  >
    <span className="text-[#052d69]">Bảo Ân</span>{" "}
    <span className="text-pink-600">Cosmetics</span>
  </div>
  <div className="text-xs text-gray-500">Deal sốc mỗi ngày</div>
</div>
          </div>

          {/* ===== Search ===== */}
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
                nav(`/my-orders/${value}`);
              }}
            />
          </div>

          {/* ===== Actions ===== */}
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

            <Button
              onClick={() => setOpenOrders(true)}
              className="rounded-2xl border-pink-200 text-pink-600 hover:!border-pink-300 hover:!text-pink-700"
            >
              <Package size={18} />
              <span className="hidden md:inline ml-1">Đơn hàng</span>
            </Button>
          </div>
        </div>
      </div>

      {/* ===== Drawers ===== */}
      <CartDrawer open={openCart} onClose={() => setOpenCart(false)} />
      <OrdersDrawer open={openOrders} onClose={() => setOpenOrders(false)} />
    </>
  );
}
