// src/components/shop/FlashSale.tsx
import React, { useEffect, useMemo, useState } from "react";
import { Button, Progress, Tag, message } from "antd";
import { Flame, Timer, Zap, ShoppingCart, CreditCard } from "lucide-react";
import { addItem } from "../../../../utils/cart";
import { useNavigate } from "react-router-dom";

type FlashSaleProduct = {
  id: string; // ✅ variantId
  productId?: string; // ✅ productId
  name: string;
  image: string;
  price: number;
  originalPrice?: number;

  flashSale?: {
    badge?: string;
    stock?: number;
    sold?: number;
  };

  sold?: number;
};

type Props = {
  endsAt: number; // ms
  items: FlashSaleProduct[];
  name?: string;
  onViewAll?: () => void;

  onAddToCart?: (p: FlashSaleProduct) => void;
  onBuyNow?: (p: FlashSaleProduct) => void;
  onItemClick?: (p: FlashSaleProduct) => void;
};

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function money(n: number) {
  return Number(n || 0).toLocaleString("vi-VN");
}

export default function FlashSale({
  endsAt,
  items,
  name,
  onViewAll,
  onAddToCart,
  onBuyNow,
  onItemClick,
}: Props) {
  const navigate = useNavigate();
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const remain = Math.max(0, endsAt - now);
  const hh = Math.floor(remain / 3600000);
  const mm = Math.floor((remain % 3600000) / 60000);
  const ss = Math.floor((remain % 60000) / 1000);

  const top = useMemo(() => items.slice(0, 8), [items]);

  if (remain === 0) return null;

  const handleAdd = (p: FlashSaleProduct) => {
    if (onAddToCart) return onAddToCart(p);

    addItem({
      id: p.id, // ✅ variantId
      name: p.name,
      price: p.price,
      qty: 1,
      image: p.image,
      productId: p.productId,
      variantId: p.id,
    });

    message.success(`Đã thêm vào giỏ: ${p.name}`);
  };

  const openDetail = (p: FlashSaleProduct) => {
  onItemClick?.(p);

  if (!p.productId) {
    message.error("Thiếu productId nên không mở được chi tiết.");
    return;
  }

  // ✅ Navigate với variantId trong query string
  navigate(`/product/${p.productId}?variantId=${p.id}`);
};

  return (
    <div className="w-full">
      <div className="w-full rounded-[22px] border border-pink-100 bg-white shadow-sm overflow-hidden">
        <div className="px-4 md:px-5 py-3 bg-gradient-to-r from-red-500 via-pink-500 to-pink-400 text-white flex items-center justify-between">
          <div className="flex items-start gap-2 min-w-0">
            <div className="h-9 w-9 rounded-2xl bg-white/15 flex items-center justify-center flex-shrink-0">
              <Flame size={18} />
            </div>

            <div className="min-w-0 flex-1">
              <div className="font-extrabold leading-tight text-base sm:text-lg line-clamp-2">
                {name?.trim() ? name : "Flash Sale"}
              </div>

              <div className="mt-1 text-xs opacity-90 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                <div className="flex items-center gap-1">
                  <Timer size={14} />
                  <span className="whitespace-nowrap">Kết thúc trong</span>
                </div>

                <span className="inline-flex w-fit items-center rounded-full bg-white/15 px-2 py-[2px] font-mono tracking-wide">
                  {pad(hh)}:{pad(mm)}:{pad(ss)}
                </span>
              </div>
            </div>
          </div>

          {onViewAll && (
            <Button
              onClick={onViewAll}
              className="rounded-2xl border-white/50 bg-white/10 text-white hover:!text-white hover:!border-white"
            >
              Xem tất cả
            </Button>
          )}
        </div>

        <div className="p-4 md:p-5">
          {top.length === 0 ? (
            <div className="text-sm text-gray-500">Chưa có sản phẩm flash sale.</div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 2xl:grid-cols-8 gap-3 md:gap-4">
              {top.map((p) => {
                const discount =
                  p.originalPrice && p.originalPrice > p.price
                    ? Math.round(((p.originalPrice - p.price) / p.originalPrice) * 100)
                    : 0;

                const stock = p.flashSale?.stock;
                const soldQty = p.flashSale?.sold;

                let soldPercent = 0;
                let soldText = "";

                if (typeof stock === "number" && typeof soldQty === "number" && stock > 0) {
                  soldPercent = Math.min(100, Math.round((soldQty / stock) * 100));
                  soldText = `${soldQty}/${stock}`;
                } else {
                  soldPercent = Math.min(100, Number(p.sold ?? 0));
                  soldText = `${soldPercent}%`;
                }

                return (
                  <div
                    key={p.id}
                    className="rounded-[16px] border border-pink-100 bg-white overflow-hidden hover:shadow-md transition cursor-pointer"
                    onClick={() => openDetail(p)}
                  >
                    <div className="relative aspect-square bg-white">
                      <img
                        src={p.image}
                        alt={p.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).src =
                            "https://via.placeholder.com/600x600.png?text=No+Image";
                        }}
                      />

                      <div className="absolute top-1.5 left-1.5 flex flex-col gap-1">
                        <Tag className="!m-0 !px-1.5 !py-0 rounded-lg border-0 bg-red-500 text-white text-[10px] leading-tight flex items-center">
                          <Zap size={10} /> <span className="text-[10px]">{p.flashSale?.badge || "Flash"}</span>
                        </Tag>

                        {discount > 0 && (
                          <Tag className="!m-0 !px-1.5 !py-0 rounded-lg border-0 bg-yellow-300 text-gray-900 text-[10px] font-bold">
                            -{discount}%
                          </Tag>
                        )}
                      </div>
                    </div>

                    <div className="p-2.5 space-y-1.5">
                      <div className="text-[12px] font-semibold text-gray-900 line-clamp-2 min-h-[32px]">
                        {p.name}
                      </div>

                      <div className="flex items-end justify-between">
                        <div>
                          <div className="text-pink-600 font-bold text-[14px] leading-tight">
                            {money(p.price)}đ
                          </div>
                          {p.originalPrice && (
                            <div className="text-[10px] text-gray-400 line-through">
                              {money(p.originalPrice)}đ
                            </div>
                          )}
                        </div>
                      </div>

                      <div>
                        <Progress percent={soldPercent} size="small" showInfo={false} />
                        <div className="mt-0.5 text-[10px] text-gray-500 flex justify-between">
                          <span>Đã bán</span>
                          <span className="font-semibold">{soldText}</span>
                        </div>
                      </div>

                      <div className="flex gap-1.5 pt-1" onClick={(e) => e.stopPropagation()}>
                        <Button
                          onClick={() => handleAdd(p)}
                          className="flex-1 h-8 px-0 rounded-xl border-0 bg-pink-600 text-white text-[11px] font-semibold hover:!bg-pink-700"
                          icon={<ShoppingCart size={14} />}
                        >
                          Giỏ
                        </Button>

                        <Button
                          onClick={() => {
                            if (onBuyNow) return onBuyNow(p);

                            navigate("/checkout", {
                              state: {
                                mode: "buyNow",
                                buyNowItem: {
                                  id: p.id, // variantId
                                  productId: p.productId,
                                  variantId: p.id,
                                  name: p.name,
                                  price: p.price,
                                  qty: 1,
                                  image: p.image,
                                },
                              },
                            });
                          }}
                          className="flex-1 h-8 px-0 rounded-xl border border-pink-200 bg-white text-pink-700 text-[11px] font-semibold hover:!border-pink-400"
                          icon={<CreditCard size={14} />}
                        >
                          Mua
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
