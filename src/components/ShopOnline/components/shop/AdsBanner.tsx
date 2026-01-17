import React, { useMemo } from "react";
import { Carousel, Tag } from "antd";
import { Megaphone, Sparkles } from "lucide-react";

export type AdsBannerItem = {
  id: string;
  title: string;
  subtitle?: string;
  image: string;
  badge?: string; // VD: "HOT", "NEW", "FLASH"
  href?: string;
};

type Props = {
  items?: AdsBannerItem[];
};

export default function AdsBanner({ items }: Props) {
  const data = useMemo<AdsBannerItem[]>(
    () =>
      items?.length
        ? items
        : [
            {
              id: "b1",
              title: "Deal sốc hôm nay",
              subtitle: "Giảm đến 50% • Freeship từ 299K",
              badge: "HOT",
              image:
                "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=1600&q=75",
            },
            {
              id: "b2",
              title: "Skincare phục hồi",
              subtitle: "Serum / Toner / Kem dưỡng",
              badge: "NEW",
              image:
                "https://images.unsplash.com/photo-1616394584738-fc6e612e71b9?auto=format&fit=crop&w=1600&q=75",
            },
            {
              id: "b3",
              title: "Makeup chuẩn trend",
              subtitle: "Son lì • Cushion • Phấn phủ",
              badge: "FLASH",
              image:
                "https://images.unsplash.com/photo-1614852206732-6728910dc175?auto=format&fit=crop&w=1600&q=75",
            },
          ],
    [items]
  );

  const small = useMemo(
    () => [
      {
        id: "s1",
        title: "Voucher hôm nay",
        subtitle: "Nhập BA10 • PINK20",
        icon: <Megaphone size={18} className="text-pink-600" />,
        image:
          "https://images.unsplash.com/photo-1611930022073-b7a4ba5fcccd?auto=format&fit=crop&w=1200&q=75",
      },
      {
        id: "s2",
        title: "Top bán chạy",
        subtitle: "Chống nắng • Serum",
        icon: <Sparkles size={18} className="text-pink-600" />,
        image:
          "https://images.unsplash.com/photo-1612810436541-336d7f7f0b9e?auto=format&fit=crop&w=1200&q=75",
      },
    ],
    []
  );

  return (
    <div className="w-full">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 md:gap-4">
        {/* Banner lớn (Carousel) */}
        <div className="lg:col-span-2">
          <div className="rounded-[22px] overflow-hidden border border-pink-100 bg-white shadow-sm">
            <Carousel autoplay autoplaySpeed={3500} dots>
              {data.map((b) => (
                <div key={b.id}>
                  <div className="relative h-[190px] sm:h-[240px] lg:h-[280px]">
                    <img src={b.image} alt={b.title} className="absolute inset-0 w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-r from-black/55 via-black/25 to-transparent" />

                    <div className="absolute left-5 md:left-6 top-1/2 -translate-y-1/2 text-white max-w-[70%]">
                      {b.badge ? (
                        <Tag className="!m-0 rounded-lg border-0 bg-pink-500 text-white font-extrabold">
                          {b.badge}
                        </Tag>
                      ) : null}
                      <div className="mt-2 text-2xl md:text-3xl font-extrabold leading-tight">
                        {b.title}
                      </div>
                      {b.subtitle ? <div className="mt-1 text-sm md:text-base opacity-95">{b.subtitle}</div> : null}

                      <div className="mt-3 inline-flex items-center gap-2 text-xs md:text-sm">
                        <span className="px-3 py-1.5 rounded-full bg-white/15 border border-white/25">
                          Deal cập nhật liên tục
                        </span>
                        <span className="px-3 py-1.5 rounded-full bg-white/15 border border-white/25">
                          Freeship / Voucher
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </Carousel>
          </div>
        </div>

        {/* 2 banner nhỏ */}
        <div className="lg:col-span-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3 md:gap-4">
          {small.map((s) => (
            <div
              key={s.id}
              className="rounded-[22px] overflow-hidden border border-pink-100 bg-white shadow-sm hover:shadow-md transition"
            >
              <div className="relative h-[120px] sm:h-[140px] lg:h-[132px]">
                <img src={s.image} alt={s.title} className="absolute inset-0 w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-r from-white/85 via-white/55 to-transparent" />

                <div className="absolute inset-0 p-4 flex flex-col justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-9 w-9 rounded-2xl bg-white border border-pink-100 flex items-center justify-center">
                      {s.icon}
                    </div>
                    <div>
                      <div className="font-extrabold text-gray-900 leading-tight">{s.title}</div>
                      <div className="text-xs text-gray-600">{s.subtitle}</div>
                    </div>
                  </div>

                  <div className="text-xs font-bold text-pink-700">
                    Xem ngay →
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick strip */}
      <div className="mt-3 rounded-[22px] border border-pink-100 bg-white shadow-sm p-3 md:p-4 flex flex-wrap gap-2">
        {["Deal sốc", "Freeship", "Hàng chính hãng", "Đổi trả 7 ngày", "Voucher mỗi ngày"].map((t) => (
          <span
            key={t}
            className="px-3 py-1.5 rounded-full bg-pink-50 border border-pink-100 text-pink-700 text-xs font-semibold"
          >
            {t}
          </span>
        ))}
      </div>
    </div>
  );
}
