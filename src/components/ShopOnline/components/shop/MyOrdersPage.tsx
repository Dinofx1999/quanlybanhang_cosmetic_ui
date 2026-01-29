// src/pages/shop/MyOrdersPage.tsx
import React, { useEffect, useMemo, useState } from "react";
import { Button, Drawer, Empty, Input, Pagination, Spin, Tag, message, Select, Divider } from "antd";
import { ArrowLeft, PackageSearch, RefreshCw, ReceiptText } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import api from "../../../../services/api";

type OrderStatus =
  | "PENDING"
  | "CONFIRMED"
  | "PACKING"
  | "SHIPPING"
  | "DELIVERED"
  | "CANCELLED"
  | "FAILED";

type OrderItem = {
  productId?: string;
  variantId?: string;
  name: string;
  sku?: string;
  image?: string;
  price: number;
  qty: number;
  attrsText?: string;
};

type Order = {
  _id: string;
  code?: string; // mã đơn
  createdAt: string;
  status: OrderStatus;
  paymentMethod?: "COD" | "BANK" | "QR" | string;
  shippingMethod?: "SHIP" | "PICKUP" | string;

  customerName?: string;
  customerPhone?: string;
  addressText?: string;

  subtotal?: number;
  shippingFee?: number;
  discountTotal?: number;
  total: number;

  items: OrderItem[];
  note?: string;
};

type ApiRes = {
  ok: boolean;
  items: Order[];
  total?: number;
  page?: number;
  limit?: number;
  totalPages?: number;
};

function money(n: number) {
  return Number(n || 0).toLocaleString("vi-VN") + "đ";
}

function statusTag(status: OrderStatus) {
  switch (status) {
    case "PENDING":
      return <Tag className="!m-0 rounded-full border-0 bg-amber-500 text-white font-bold">CHỜ XÁC NHẬN</Tag>;
    case "CONFIRMED":
      return <Tag className="!m-0 rounded-full border-0 bg-blue-600 text-white font-bold">ĐÃ XÁC NHẬN</Tag>;
    case "PACKING":
      return <Tag className="!m-0 rounded-full border-0 bg-indigo-600 text-white font-bold">ĐANG SOẠN</Tag>;
    case "SHIPPING":
      return <Tag className="!m-0 rounded-full border-0 bg-purple-600 text-white font-bold">ĐANG GIAO</Tag>;
    case "DELIVERED":
      return <Tag className="!m-0 rounded-full border-0 bg-green-600 text-white font-bold">ĐÃ GIAO</Tag>;
    case "CANCELLED":
      return <Tag className="!m-0 rounded-full border-0 bg-gray-600 text-white font-bold">ĐÃ HUỶ</Tag>;
    case "FAILED":
      return <Tag className="!m-0 rounded-full border-0 bg-red-600 text-white font-bold">THẤT BẠI</Tag>;
    default:
      return <Tag className="!m-0 rounded-full border-0 bg-gray-700 text-white font-bold">{status}</Tag>;
  }
}

function OrderCard({ o, onOpen }: { o: Order; onOpen: () => void }) {
  const firstImg = o.items?.[0]?.image;

  return (
    <button
      onClick={onOpen}
      className="w-full text-left rounded-[22px] border border-pink-100 bg-white shadow-sm hover:shadow transition p-4"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-pink-600">
              <ReceiptText size={18} />
            </span>
            <div className="font-extrabold text-gray-900 truncate">
              {o.code ? `Đơn ${o.code}` : `Đơn #${o._id.slice(-6).toUpperCase()}`}
            </div>
          </div>
          <div className="mt-1 text-xs text-gray-500">
            {new Date(o.createdAt).toLocaleString("vi-VN")}
            {o.paymentMethod ? <span className="mx-2 text-gray-300">•</span> : null}
            {o.paymentMethod ? <span className="font-semibold text-gray-700">{o.paymentMethod}</span> : null}
          </div>
        </div>
        <div className="shrink-0">{statusTag(o.status)}</div>
      </div>

      <div className="mt-3 flex items-center gap-3">
        <div className="h-14 w-14 rounded-2xl overflow-hidden border border-pink-100 bg-pink-50 shrink-0">
          {firstImg ? <img src={firstImg} alt="img" className="w-full h-full object-cover" loading="lazy" /> : null}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-bold text-gray-900 line-clamp-1">
            {o.items?.[0]?.name || "Sản phẩm"}
          </div>
          <div className="text-xs text-gray-500 mt-0.5">
            {o.items?.length ? `${o.items.length} sản phẩm` : "—"}
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs text-gray-500">Tổng</div>
          <div className="text-pink-600 font-extrabold">{money(o.total)}</div>
        </div>
      </div>
    </button>
  );
}

export default function MyOrdersPage() {
  const nav = useNavigate();





  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<ApiRes | null>(null);

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  const [q, setQ] = useState("");
  const [status, setStatus] = useState<OrderStatus | "ALL">("ALL");

  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<Order | null>(null);


  
  const fetchOrders = async (p = page, l = limit, signal?: AbortSignal) => {
    setLoading(true);
    try {
      const res = await api.get("/public/orders/my", {
        signal,
        params: {
          page: p,
          limit: l,
          q: q?.trim() || undefined,
          status: status === "ALL" ? undefined : status,
        },
      });

      const payload = res.data as ApiRes;
      if (!payload?.ok) throw new Error("INVALID_PAYLOAD");
      setData(payload);
      setPage(Number(payload.page ?? p));
      setLimit(Number(payload.limit ?? l));
    } catch (e: any) {
      if (e?.name !== "CanceledError") message.error("Không tải được danh sách đơn hàng.");
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const ctrl = new AbortController();
    fetchOrders(page, limit, ctrl.signal);
    return () => ctrl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, limit, status]);

  // search debounce nhẹ
  useEffect(() => {
    const t = setTimeout(() => {
      setPage(1);
      const ctrl = new AbortController();
      fetchOrders(1, limit, ctrl.signal);
      return () => ctrl.abort();
    }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const items = data?.items || [];
  const total = data?.total || 0;

  const drawerTotalBreakdown = useMemo(() => {
    if (!active) return null;
    return {
      subtotal: active.subtotal ?? active.items.reduce((s, it) => s + it.price * it.qty, 0),
      shippingFee: active.shippingFee ?? 0,
      discountTotal: active.discountTotal ?? 0,
      total: active.total ?? 0,
    };
  }, [active]);

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-pink-50/60 to-white">
      <div className="mx-auto w-full max-w-[1180px] px-4 md:px-8 py-5">
        {/* Top bar */}
        <div className="flex items-center justify-between gap-3">
          <Button onClick={() => nav(-1)} className="rounded-2xl border-pink-200 text-pink-700">
            <ArrowLeft size={16} className="mr-1" /> Quay lại
          </Button>

          <Button
            onClick={() => fetchOrders(page, limit)}
            className="rounded-2xl border-pink-200 text-pink-700 font-extrabold"
            icon={<RefreshCw size={16} />}
          >
            Làm mới
          </Button>
        </div>

        {/* Filters */}
        <div className="mt-4 rounded-[26px] border border-pink-100 bg-white shadow-sm p-4">
          <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
            <div className="font-extrabold text-gray-900">Đơn hàng của bạn</div>

            <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Tìm theo mã đơn / tên sản phẩm…"
                className="rounded-2xl"
                prefix={<PackageSearch size={16} className="text-gray-400" />}
                allowClear
              />

              <Select
                value={status}
                onChange={(v) => {
                  setStatus(v);
                  setPage(1);
                }}
                className="min-w-[190px]"
                options={[
                  { value: "ALL", label: "Tất cả trạng thái" },
                  { value: "PENDING", label: "Chờ xác nhận" },
                  { value: "CONFIRMED", label: "Đã xác nhận" },
                  { value: "PACKING", label: "Đang soạn" },
                  { value: "SHIPPING", label: "Đang giao" },
                  { value: "DELIVERED", label: "Đã giao" },
                  { value: "CANCELLED", label: "Đã huỷ" },
                  { value: "FAILED", label: "Thất bại" },
                ]}
              />
            </div>
          </div>
        </div>

        {/* List */}
        <div className="mt-4">
          {loading ? (
            <div className="py-10 flex justify-center">
              <Spin />
            </div>
          ) : items.length === 0 ? (
            <div className="rounded-[26px] border border-pink-100 bg-white shadow-sm p-8">
              <Empty description="Bạn chưa có đơn hàng nào." />
              <div className="mt-4 flex justify-center">
                <Button
                  type="primary"
                  className="rounded-2xl !bg-pink-600 !border-pink-600 hover:!bg-pink-700"
                  onClick={() => nav("/shop")}
                >
                  Mua sắm ngay
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {items.map((o) => (
                <OrderCard
                  key={o._id}
                  o={o}
                  onOpen={() => {
                    setActive(o);
                    setOpen(true);
                  }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Pagination */}
        {data?.totalPages && data.totalPages > 1 ? (
          <div className="mt-5 flex justify-center">
            <Pagination
              current={page}
              pageSize={limit}
              total={total}
              showSizeChanger
              onChange={(p, ps) => {
                setPage(p);
                setLimit(ps);
              }}
            />
          </div>
        ) : null}
      </div>

      {/* Drawer detail */}
      <Drawer
        open={open}
        onClose={() => setOpen(false)}
        width={520}
        title={<div className="font-extrabold text-gray-900">Chi tiết đơn hàng</div>}
        destroyOnClose
      >
        {!active ? null : (
          <div className="space-y-3">
            <div className="rounded-2xl border border-pink-100 bg-pink-50/40 p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-extrabold text-gray-900">
                    {active.code ? `Đơn ${active.code}` : `Đơn #${active._id.slice(-6).toUpperCase()}`}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">{new Date(active.createdAt).toLocaleString("vi-VN")}</div>
                </div>
                <div className="shrink-0">{statusTag(active.status)}</div>
              </div>

              <div className="mt-2 text-xs text-gray-600">
                {active.paymentMethod ? (
                  <div>
                    Thanh toán: <span className="font-bold text-gray-900">{active.paymentMethod}</span>
                  </div>
                ) : null}
                {active.shippingMethod ? (
                  <div>
                    Giao nhận: <span className="font-bold text-gray-900">{active.shippingMethod}</span>
                  </div>
                ) : null}
              </div>
            </div>

            {active.customerName || active.customerPhone || active.addressText ? (
              <div className="rounded-2xl border border-pink-100 bg-white p-3">
                <div className="font-extrabold text-gray-900 mb-1">Thông tin nhận hàng</div>
                <div className="text-sm text-gray-700">
                  {active.customerName ? <div>{active.customerName}</div> : null}
                  {active.customerPhone ? <div>{active.customerPhone}</div> : null}
                  {active.addressText ? <div className="text-gray-600">{active.addressText}</div> : null}
                </div>
              </div>
            ) : null}

            <div className="rounded-2xl border border-pink-100 bg-white p-3">
              <div className="font-extrabold text-gray-900 mb-2">Sản phẩm</div>

              <div className="space-y-3">
                {(active.items || []).map((it, idx) => (
                  <div key={idx} className="flex gap-3">
                    <img
                      src={it.image || "https://via.placeholder.com/120x120.png?text=No+Image"}
                      alt={it.name}
                      className="w-14 h-14 rounded-2xl object-cover border border-pink-100 bg-pink-50"
                      onError={(e) =>
                        ((e.currentTarget as HTMLImageElement).src =
                          "https://via.placeholder.com/120x120.png?text=No+Image")
                      }
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-gray-900 text-sm line-clamp-2">{it.name}</div>
                      <div className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                        {it.sku ? `SKU: ${it.sku}` : ""}
                        {it.attrsText ? (it.sku ? ` • ${it.attrsText}` : it.attrsText) : ""}
                      </div>

                      <div className="mt-1 flex items-center justify-between">
                        <div className="text-pink-600 font-extrabold">{money(it.price)}</div>
                        <div className="text-xs text-gray-600">
                          x <span className="font-bold text-gray-900">{it.qty}</span>
                        </div>
                      </div>

                      <div className="text-xs text-gray-500 mt-1">
                        Thành tiền: <span className="font-bold text-gray-900">{money(it.price * it.qty)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {active.note ? (
                <>
                  <Divider className="!my-3" />
                  <div className="text-xs text-gray-500">
                    Ghi chú: <span className="text-gray-900 font-semibold">{active.note}</span>
                  </div>
                </>
              ) : null}
            </div>

            <div className="rounded-2xl border border-pink-100 bg-white p-3">
              <div className="font-extrabold text-gray-900 mb-2">Thanh toán</div>

              {drawerTotalBreakdown ? (
                <div className="space-y-1 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Tạm tính</span>
                    <span className="font-bold text-gray-900">{money(drawerTotalBreakdown.subtotal)}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Phí ship</span>
                    <span className="font-bold text-gray-900">{money(drawerTotalBreakdown.shippingFee)}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Giảm giá</span>
                    <span className="font-bold text-gray-900">- {money(drawerTotalBreakdown.discountTotal)}</span>
                  </div>

                  <Divider className="!my-2" />

                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-gray-900">Tổng cộng</span>
                    <span className="text-pink-600 font-extrabold text-lg">{money(drawerTotalBreakdown.total)}</span>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
}
