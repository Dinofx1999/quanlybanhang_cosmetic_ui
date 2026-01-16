// src/components/shop/ShopHeader.tsx
import React from "react";
import { Badge, Input, Button } from "antd";
import { Search, ShoppingBag, TicketPercent, Flame } from "lucide-react";

type Props = {
  onSearch?: (q: string) => void;
  onOpenVoucher?: () => void;
  onGoFlash?: () => void;
};

export default function ShopHeader({ onSearch, onOpenVoucher, onGoFlash }: Props) {
  return (
    <div className="sticky top-0 z-40 w-full bg-white/90 backdrop-blur border-b border-pink-100">
      <div className="w-full px-5 md:px-8 lg:px-10 py-3 flex items-center gap-3">
        <div className="flex items-center gap-2 shrink-0">
          <div className="h-10 w-10 rounded-2xl bg-pink-500 flex items-center justify-center shadow-sm">
            {/* <Flame size={20} className="text-white" /> */}
            <img alt="logo" className="w-full h-full object-cover" src="http://116.105.227.149:9009/uploads/branches/1768574184904-1628e0c38b65dce695ad7e55.jpg" />
          </div>
          <div className="leading-tight hidden sm:block">
            <div className="font-extrabold text-gray-900">
              Bảo Ân <span className="text-pink-600">Cosmetics</span>
            </div>
            <div className="text-xs text-gray-500">Deal sốc mỗi ngày</div>
          </div>
        </div>

        <div className="flex-1">
          <Input
            size="large"
            allowClear
            placeholder="Tìm kiếm sản phẩm, thương hiệu..."
            prefix={<Search size={18} className="text-pink-500" />}
            className="rounded-2xl"
            onChange={(e) => onSearch?.(e.target.value)}
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

          <Badge count={2} color="#ec4899">
            <Button type="primary" className="rounded-2xl !bg-pink-500 hover:!bg-pink-600 !border-pink-500">
              <ShoppingBag size={18} />
              <span className="hidden md:inline ml-1">Giỏ</span>
            </Button>
          </Badge>
        </div>
      </div>
    </div>
  );
}
