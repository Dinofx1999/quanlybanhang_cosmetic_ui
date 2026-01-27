import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button, Divider, Empty, Pagination, Spin, Tag, message } from "antd";
import { ArrowLeft, BadgePercent, Flame, Clock3, RefreshCw, ShoppingCart, Zap } from "lucide-react";

import ProductCard from "../components/shop/ProductCard";
import ShopHeader from "../components/shop/ShopHeader";
import api from "../../../services/api";

// =======================
// Types
// =======================
type ApiImage = { url: string; isPrimary?: boolean; order?: number };

type ApiFlashSale = {
  _id: string;
  name: string;
  code: string;
  description?: string;
  startDate: string;
  endDate: string;
  banner?: string;
};

type ApiFlashSaleItem = {
  _id: string;
  productId: string;
  productName: string;
  productBrand?: string;
  productCategoryName?: string;

  sku?: string;
  name?: string;
  attributes?: { k: string; v: string }[];

  originalPrice: number;
  flashPrice: number;
  discountPercent?: number;
  discountAmount?: number;

  thumbnail?: string;
  images?: ApiImage[];

  badge?: string;

  limitedQuantity?: number | null;
  soldQuantity?: number;
  remainingQuantity?: number;
};

type ApiFlashSaleRes = {
  ok: boolean;
  flashSale: ApiFlashSale;
  items: ApiFlashSaleItem[];
  total?: number;
  page?: number;
  limit?: number;
  totalPages?: number;
};

// =======================
// Helpers
// =======================
function money(n: number) {
  return Number(n || 0).toLocaleString("vi-VN") + "đ";
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function msToClock(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const dd = Math.floor(s / 86400);
  const hh = Math.floor((s % 86400) / 3600);
  const mm = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  const pad = (x: number) => String(x).padStart(2, "0");
  if (dd > 0) return `${dd}d ${pad(hh)}:${pad(mm)}:${pad(ss)}`;
  return `${pad(hh)}:${pad(mm)}:${pad(ss)}`;
}

const FALLBACK_BANNER =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(`
  <svg xmlns="http://www.w3.org/2000/svg" width="1200" height="400">
    <defs>
      <linearGradient id="g" x1="0" x2="1">
        <stop offset="0" stop-color="#FCE7F3"/>
        <stop offset="1" stop-color="#FFFFFF"/>
      </linearGradient>
    </defs>
    <rect width="1200" height="400" fill="url(#g)"/>
    <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle"
      font-family="Arial" font-size="64" fill="#DB2777" font-weight="700">
      FLASH SALE
    </text>
  </svg>
`);

const FALLBACK_IMAGE =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(`
  <svg xmlns="http://www.w3.org/2000/svg" width="600" height="600">
    <rect width="600" height="600" fill="#FCE7F3"/>
    <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle"
      font-family="Arial" font-size="28" fill="#DB2777" font-weight="700">
      NO IMAGE
    </text>
  </svg>
`);

function getItemImage(it: ApiFlashSaleItem) {
  return it.thumbnail || it.images?.find((x) => x?.isPrimary)?.url || it.images?.[0]?.url || FALLBACK_IMAGE;
}

function SectionTitle({ title, right }: { title: string; right?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="text-[15px] md:text-base font-extrabold text-gray-900">{title}</div>
      {right}
    </div>
  );
}

function Pill({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="rounded-2xl border border-pink-100 bg-white px-3 py-2 text-xs font-semibold text-gray-700 flex items-center gap-2">
      <span className="text-pink-600">{icon}</span>
      <span>{text}</span>
    </div>
  );
}

// =======================
// Component
// =======================
export default function ProductFlashSale() {
  const nav = useNavigate();
  const { flashSaleId } = useParams();

  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<ApiFlashSaleRes | null>(null);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);

  // ✅ chọn item cho sticky mobile actions
  const [activeItem, setActiveItem] = useState<ApiFlashSaleItem | null>(null);

  // countdown tick
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const fetchList = async (p = page, l = limit, signal?: AbortSignal) => {
    if (!flashSaleId) return;

    setLoading(true);
    try {
      const res = await api.get(`/public/flash-sales/${flashSaleId}/products`, {
        signal,
        params: { page: p, limit: l },
      });

      const payload = res.data as ApiFlashSaleRes;
      if (!payload?.ok || !payload?.flashSale?._id) throw new Error("INVALID_PAYLOAD");

      setData(payload);
      setPage(Number(payload.page ?? p));
      setLimit(Number(payload.limit ?? l));
    } catch (e: any) {
      if (e?.name !== "CanceledError") message.error("Không tải được danh sách Flash Sale.");
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const ctrl = new AbortController();
    fetchList(page, limit, ctrl.signal);
    return () => ctrl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flashSaleId, page, limit]);

  const flashSale = data?.flashSale;
  const items = data?.items || [];

  // nếu activeItem không còn trong list (đổi page) thì reset
  useEffect(() => {
    if (!activeItem) return;
    const exists = items.some((x) => x._id === activeItem._id);
    if (!exists) setActiveItem(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]);

  const timeInfo = useMemo(() => {
    if (!flashSale) return null;
    const start = new Date(flashSale.startDate).getTime();
    const end = new Date(flashSale.endDate).getTime();
    const status = now < start ? "upcoming" : now > end ? "ended" : "running";
    const remainMs = status === "upcoming" ? start - now : status === "running" ? end - now : 0;
    return { start, end, status, remainMs };
  }, [flashSale, now]);

  const headerRight = useMemo(() => {
    if (!flashSale || !timeInfo) return null;

    const statusTag =
      timeInfo.status === "running" ? (
        <Tag className="!m-0 rounded-full border-0 bg-pink-600 text-white font-bold">ĐANG DIỄN RA</Tag>
      ) : timeInfo.status === "upcoming" ? (
        <Tag className="!m-0 rounded-full border-0 bg-amber-500 text-white font-bold">SẮP BẮT ĐẦU</Tag>
      ) : (
        <Tag className="!m-0 rounded-full border-0 bg-gray-600 text-white font-bold">ĐÃ KẾT THÚC</Tag>
      );

    return (
      <div className="flex items-center gap-2">
        {statusTag}
        <Pill icon={<Clock3 size={16} />} text={timeInfo.status === "ended" ? "00:00:00" : msToClock(timeInfo.remainMs)} />
      </div>
    );
  }, [flashSale, timeInfo]);

  // ✅ Actions (demo)
  const addToCart = (it: ApiFlashSaleItem) => {
    message.success(`Đã thêm vào giỏ: ${it.productName}`);
  };

  const buyNow = (it: ApiFlashSaleItem) => {
    message.success(`Mua ngay: ${it.productName} (demo)`);
    nav(`/product/${it.productId}`);
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-pink-50/60 to-white">
        <ShopHeader
                onSearch={(v) => {
                //   setQ(v);
                  setPage(1);
                }}
                onOpenVoucher={() => window.scrollTo({ top: 450, behavior: "smooth" })}
                // onGoFlash={() => flashRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
              />
      <div className="mx-auto w-full px-4 md:px-8 py-5 pb-28 lg:pb-8">
        
        {/* Top bar */}
        <div className="flex items-center justify-between gap-3">
          <Button onClick={() => nav(-1)} className="rounded-2xl border-pink-200 text-pink-700">
            <ArrowLeft size={16} className="mr-1" /> Quay lại
          </Button>

          <Button
            onClick={() => fetchList(page, limit)}
            className="rounded-2xl border-pink-200 text-pink-700 font-extrabold"
            icon={<RefreshCw size={16} />}
          >
            Làm mới
          </Button>
        </div>

        {/* Header / Banner */}
<div className="mt-4 rounded-[26px] border border-pink-100 bg-white shadow-sm overflow-hidden">
  <div className="relative">
    <div className="h-40 md:h-52 bg-pink-50">
      <img
        src={flashSale?.banner || FALLBACK_BANNER}
        alt="banner"
        className="w-full h-full object-cover"
        onError={(e) => ((e.target as HTMLImageElement).src = FALLBACK_BANNER)}
      />
    </div>

    <div className="absolute inset-0 bg-gradient-to-tr from-pink-200/25 via-transparent to-white/20 pointer-events-none" />

    {/* ✅ Desktop overlay */}
    <div className="hidden md:block absolute left-4 right-4 bottom-4">
      <div className="rounded-[22px] border border-pink-100 bg-white/95 backdrop-blur shadow-sm p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-pink-600">
                <Flame size={18} />
              </span>
              <div className="text-[18px] md:text-[22px] font-extrabold text-gray-900 truncate">
                {flashSale?.name || "Flash Sale"}
              </div>
            </div>

            {flashSale?.description ? (
              <div className="mt-1 text-sm text-gray-600 line-clamp-2">{flashSale.description}</div>
            ) : null}

            {flashSale?.code ? (
              <div className="mt-2 text-xs font-bold text-gray-600">
                Code: <span className="font-mono text-gray-900">{flashSale.code}</span>
              </div>
            ) : null}
          </div>

          <div className="shrink-0">{headerRight}</div>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <Pill icon={<BadgePercent size={16} />} text="Giá sốc" />
          <Pill icon={<Flame size={16} />} text="Số lượng có hạn" />
        </div>
      </div>
    </div>
  </div>

  {/* ✅ Mobile: đưa info ra ngoài absolute để không bị cắt */}
  <div className="md:hidden p-4">
    <div className="rounded-[22px] border border-pink-100 bg-white shadow-sm p-4">
      {/* headerRight xuống dòng cho gọn */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-pink-600">
              <Flame size={18} />
            </span>
            <div className="text-[18px] font-extrabold text-gray-900">
              {flashSale?.name || "Flash Sale"}
            </div>
          </div>

          {flashSale?.description ? (
            <div className="mt-1 text-sm text-gray-600 whitespace-normal">
              {flashSale.description}
            </div>
          ) : null}

          {flashSale?.code ? (
            <div className="mt-2 text-xs font-bold text-gray-600">
              Code: <span className="font-mono text-gray-900">{flashSale.code}</span>
            </div>
          ) : null}
        </div>
      </div>

      <div className="mt-3">{headerRight}</div>

      <div className="mt-3 flex flex-wrap gap-2">
        <Pill icon={<BadgePercent size={16} />} text="Giá sốc" />
        <Pill icon={<Flame size={16} />} text="Số lượng có hạn" />
      </div>
    </div>
  </div>
</div>


        <Divider className="!my-5" />

        {/* List */}
        <div className="rounded-[26px] border border-pink-100 bg-white shadow-sm p-5">
          <SectionTitle
            title="Sản phẩm đang sale"
            right={<div className="text-xs font-semibold text-gray-500">{data?.total != null ? `Tổng: ${data.total}` : ""}</div>}
          />

          {loading ? (
            <div className="py-10 flex justify-center">
              <Spin />
            </div>
          ) : items.length === 0 ? (
            <div className="mt-6">
              <Empty description="Hiện chưa có sản phẩm Flash Sale." />
            </div>
          ) : (
            <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-8 gap-3">
              {items.map((it) => {
                const image = getItemImage(it);
                const flashPrice = Number(it.flashPrice || 0);
                const originalPrice = Number(it.originalPrice || 0);

                const percent =
                  it.discountPercent != null
                    ? Number(it.discountPercent || 0)
                    : originalPrice > 0
                    ? Math.round(((originalPrice - flashPrice) / originalPrice) * 100)
                    : 0;

                const sold = Number(it.soldQuantity || 0);
                const remain =
                  it.remainingQuantity != null
                    ? Number(it.remainingQuantity || 0)
                    : it.limitedQuantity != null
                    ? Math.max(0, Number(it.limitedQuantity || 0) - sold)
                    : null;

                const limitQty = it.limitedQuantity != null ? Number(it.limitedQuantity || 0) : null;
                const denom = limitQty != null ? Math.max(1, limitQty) : remain != null ? sold + remain : 1;
                const progress = clamp(Math.round((sold / denom) * 100), 0, 100);

                const cardProduct = {
                  id: it.productId,
                  name: it.productName,
                  brand: it.productBrand,
                  price: flashPrice,
                  originalPrice: originalPrice > 0 ? originalPrice : undefined,
                  image,
                  flashSale: false, // ✅ để ProductCard không tự render Flash badge (mình tự truyền badges)
                  tags: [],
                  location: "VN",
                  soldCount: it.soldQuantity || 0,
                  rating: 0,
                  reviews: 0,
                };

                const isActive = activeItem?._id === it._id;

                const badges = [
                  it.badge ? { text: it.badge, variant: "dark" as const } : null,
                  it.productCategoryName ? { text: it.productCategoryName, variant: "white" as const } : null,
                ].filter(Boolean) as any;

                return (
                  <div key={it._id} className="touch-manipulation">
                    <div
                      className={[
                        "rounded-[22px] transition",
                        isActive ? "ring-2 ring-pink-200" : "ring-0",
                        "active:scale-[0.99]",
                      ].join(" ")}
                      onClick={() => setActiveItem(it)}
                    >
                      <ProductCard
                        p={cardProduct as any}
                        badges={badges}
                        topRightBadge={percent > 0 ? `-${percent}%` : ""}
                        hideCta // ✅ mobile dùng sticky -> ẩn CTA trong card để khỏi trùng
                      />

                      {/* ✅ Progress + desktop actions (không trùng UI nữa) */}
                      <div className="px-2 pb-2 -mt-1">
                        {(limitQty != null || remain != null) ? (
                          <div className="mt-2 rounded-2xl border border-pink-100 bg-pink-50/40 p-2">
                            <div className="flex items-center justify-between text-[11px] font-bold text-gray-700">
                              <span>Đã bán: {sold}</span>
                              <span>Còn: {remain != null ? remain : "—"}</span>
                            </div>
                            <div className="mt-1 h-2 rounded-full bg-pink-100 overflow-hidden">
                              <div className="h-full rounded-full bg-pink-600 transition-all" style={{ width: `${progress}%` }} />
                            </div>
                          </div>
                        ) : null}

                        {/* Desktop buttons */}
                        <div className="mt-2 hidden sm:flex gap-1.5">
  <Button
    size="small"
    onClickCapture={(e) => e.stopPropagation()}
    onClick={() => addToCart(it)}
    className="
      flex-1 h-8
      rounded-xl
      border-pink-200
      text-pink-700
      font-semibold
      text-[12px]
      hover:!border-pink-300
    "
  >
    <ShoppingCart size={14} />
    <span className="ml-1">Giỏ</span>
  </Button>

  <Button
    size="small"
    type="primary"
    onClickCapture={(e) => e.stopPropagation()}
    onClick={() => buyNow(it)}
    className="
      flex-1 h-8
      rounded-xl
      !bg-pink-600 hover:!bg-pink-700
      !border-pink-600
      font-semibold
      text-[12px]
    "
  >
    <Zap size={14} />
    <span className="ml-1">Mua</span>
  </Button>
</div>

                      </div>
                    </div>

                    <div className="sm:hidden mt-1 px-1 text-[11px] text-gray-500">
                      Chạm để chọn • Dùng thanh dưới để mua nhanh
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {data?.totalPages && data.totalPages > 1 ? (
            <div className="mt-6 flex justify-center">
              <Pagination
                current={page}
                pageSize={limit}
                total={data.total || 0}
                showSizeChanger
                onChange={(p, ps) => {
                  setPage(p);
                  setLimit(ps);
                }}
              />
            </div>
          ) : null}
        </div>
      </div>

      {/* Sticky bottom bar (Mobile) */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 z-40">
        <div className="mx-auto max-w-[1180px] px-4 pb-4">
          <div className="rounded-[22px] border border-pink-100 bg-white/95 backdrop-blur shadow-lg p-3 flex items-center gap-2">
            <div className="flex-1 min-w-0">
              <div className="text-[11px] text-gray-500">Đang chọn</div>
              <div className="text-gray-900 font-extrabold truncate">
                {activeItem ? activeItem.productName : "Chưa chọn sản phẩm"}
              </div>
              <div className="text-pink-600 font-extrabold text-sm truncate">
                {activeItem ? money(Number(activeItem.flashPrice || 0)) : "—"}
              </div>
            </div>

            <Button
              disabled={!activeItem}
              onClick={() => activeItem && addToCart(activeItem)}
              className="rounded-2xl border-pink-200 text-pink-700 h-11 font-extrabold"
            >
              <ShoppingCart size={18} />
            </Button>

            <Button
              type="primary"
              disabled={!activeItem}
              onClick={() => activeItem && buyNow(activeItem)}
              className="rounded-2xl !bg-pink-600 hover:!bg-pink-700 !border-pink-600 h-11 font-extrabold"
            >
              <Zap size={18} />
              <span className="ml-2">Mua ngay</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
