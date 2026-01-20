// src/components/shop/ProductCard.tsx
import React from "react";
import { Button, Rate, Tag, message } from "antd";
import { ShoppingCart, Truck, ShieldCheck, Zap } from "lucide-react";
import type { Product } from "../../data/shopMock";
import { useNavigate } from "react-router-dom";

function money(n: number) {
  return Number(n || 0).toLocaleString("vi-VN");
}


type Props = { p: Product; onOpen?: (id: string) => void };

export default function ProductCard({ p, onOpen }: Props) {
  const nav = useNavigate();
  const discount =
    p.originalPrice && p.originalPrice > p.price
      ? Math.round(((p.originalPrice - p.price) / p.originalPrice) * 100)
      : 0;

  const add = (e: React.MouseEvent) => {
    e.stopPropagation(); // ✅ tránh mở chi tiết
    message.success(`Đã thêm vào giỏ: ${p.name}`);
  };

  const open = () => nav(`/product/${p.id}`);

  return (
    <div
      onClick={open}
      className="group cursor-pointer rounded-[18px] bg-white border border-pink-100 shadow-sm hover:shadow-[0_12px_42px_rgba(236,72,153,0.14)] transition overflow-hidden"
    >
      {/* Image */}
      <div className="relative aspect-square bg-pink-50 overflow-hidden">
        <img
          src={p.image}
          alt={p.name}
          className="w-full h-full object-cover group-hover:scale-[1.05] transition duration-500"
        />

        {/* badges */}
        <div className="absolute top-2 left-2 flex flex-wrap gap-1">
          {p.tags?.includes("Mall") ? (
            <Tag className="!m-0 rounded-lg border-0 bg-pink-500 text-white">
              <span className="inline-flex items-center gap-1">
                <ShieldCheck size={14} /> Mall
              </span>
            </Tag>
          ) : null}

          {p.flashSale ? (
            <Tag className="!m-0 rounded-lg border-0 bg-red-500 text-white">
              <span className="inline-flex items-center gap-1">
                <Zap size={14} /> Flash
              </span>
            </Tag>
          ) : null}

          {p.tags?.includes("Freeship") ? (
            <Tag className="!m-0 rounded-lg border border-pink-200 bg-white text-pink-700">
              <span className="inline-flex items-center gap-1">
                <Truck size={14} /> Freeship
              </span>
            </Tag>
          ) : null}
        </div>

        {/* discount */}
        {discount > 0 ? (
          <div className="absolute top-2 right-2 px-2 py-1 rounded-lg bg-yellow-300 text-gray-900 text-xs font-extrabold">
            -{discount}%
          </div>
        ) : null}
      </div>

      {/* Content */}
      <div className="p-3">
        {/* Name (click cũng mở chi tiết) */}
        <div className="text-[13px] font-bold text-gray-900 line-clamp-2 min-h-[36px]">{p.name}</div>

        <div className="mt-1 flex items-center justify-between">
          <div className="text-pink-600 font-extrabold">{money(p.price)}đ</div>
          {p.originalPrice ? (
            <div className="text-xs text-gray-400 line-through">{money(p.originalPrice)}đ</div>
          ) : null}
        </div>

        <div className="mt-1 flex items-center gap-2">
          <Rate allowHalf disabled value={p.rating || 0} style={{ fontSize: 14 }} />
          <span className="text-xs text-gray-500">({p.reviews || 0})</span>
        </div>

        <div className="mt-2 flex items-center justify-between text-xs text-gray-600">
          <span>Đã bán {p.soldCount ? money(p.soldCount) : "—"}</span>
          <span className="text-gray-500">{p.location || "VN"}</span>
        </div>

        <Button
          type="primary"
          onClick={add}
          className="mt-3 w-full rounded-2xl !bg-pink-500 hover:!bg-pink-600 !border-pink-500"
        >
          <ShoppingCart size={18} className="mr-1" />
          Thêm vào giỏ
        </Button>
      </div>
    </div>
  );
}
