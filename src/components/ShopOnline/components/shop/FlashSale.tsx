import React, { useEffect, useMemo, useState } from "react";
import { Button, Progress, Tag } from "antd";
import { Flame, Timer, Zap } from "lucide-react";
import type { Product } from "../../data/shopMock";

type Props = {
  endsAt: number;
  items: Product[];
  onViewAll?: () => void;
};

function pad(n: number) {
  return String(n).padStart(2, "0");
}
function money(n: number) {
  return Number(n || 0).toLocaleString("vi-VN");
}

export default function FlashSale({ endsAt, items, onViewAll }: Props) {
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

  return (
    <div className="w-full">
      <div className="w-full rounded-[22px] border border-pink-100 bg-white shadow-sm overflow-hidden">
        {/* header */}
        <div className="px-4 md:px-5 py-3 bg-gradient-to-r from-red-500 via-pink-500 to-pink-400 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-2xl bg-white/15 flex items-center justify-center">
              <Flame size={18} />
            </div>
            <div>
              <div className="font-extrabold leading-tight">Flash Sale</div>
              <div className="text-xs opacity-90 flex items-center gap-2">
                <Timer size={14} />
                <span>
                  Kết thúc trong: {pad(hh)}:{pad(mm)}:{pad(ss)}
                </span>
              </div>
            </div>
          </div>

          <Button
            onClick={onViewAll}
            className="rounded-2xl border-white/50 bg-white/10 text-white hover:!text-white hover:!border-white"
          >
            Xem tất cả
          </Button>
        </div>

        {/* content - full width grid */}
        <div className="p-4 md:p-5">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 2xl:grid-cols-8 gap-3 md:gap-4">
            {top.map((p) => {
              const discount =
                p.originalPrice && p.originalPrice > p.price
                  ? Math.round(((p.originalPrice - p.price) / p.originalPrice) * 100)
                  : 0;

              const soldPercent = Math.min(100, Math.max(0, Number(p.sold ?? 0)));
              return (
                <div
                  key={p.id}
                  className="rounded-[18px] border border-pink-100 bg-pink-50/30 overflow-hidden hover:shadow-md transition"
                >
                  <div className="relative aspect-square bg-white overflow-hidden">
                    <img src={p.image} alt={p.name} className="w-full h-full object-cover hover:scale-[1.04] transition" />
                    <div className="absolute top-2 left-2 flex gap-1">
                      <Tag className="!m-0 rounded-lg border-0 bg-red-500 text-white">
                        <span className="inline-flex items-center gap-1">
                          <Zap size={14} /> Flash
                        </span>
                      </Tag>
                      {discount > 0 ? (
                        <Tag className="!m-0 rounded-lg border-0 bg-yellow-300 text-gray-900 font-extrabold">
                          -{discount}%
                        </Tag>
                      ) : null}
                    </div>
                  </div>

                  <div className="p-3">
                    <div className="text-[13px] font-bold text-gray-900 line-clamp-2 min-h-[36px]">{p.name}</div>

                    <div className="mt-1 flex items-baseline justify-between gap-2">
                      <div className="text-pink-600 font-extrabold">{money(p.price)}đ</div>
                      {p.originalPrice ? (
                        <div className="text-xs text-gray-400 line-through">{money(p.originalPrice)}đ</div>
                      ) : null}
                    </div>

                    <div className="mt-2">
                      <Progress percent={soldPercent} size="small" showInfo={false} />
                      <div className="mt-1 text-[11px] text-gray-600 flex justify-between">
                        <span>Đã bán</span>
                        <span className="font-semibold">{soldPercent}%</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {top.length === 0 ? (
            <div className="text-sm text-gray-500">Chưa có sản phẩm flash sale.</div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
