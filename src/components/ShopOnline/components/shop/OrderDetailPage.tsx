import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button, Divider, Spin, Tag, Empty } from "antd";
import { ArrowLeft, Truck, CreditCard, Package, Copy } from "lucide-react";
import api from "../../../../services/api";
import ShopHeader from "../shop/ShopHeader";

type OrderItem = {
  name: string;
  variantName?: string;
  price: number;
  qty: number;
  image?: string;

  // optional from BE
  discountAmount?: number; // discount per 1 item
  attributes?: { k: string; v: string }[];
};

type Order = {
  _id: string;
  code: string;
  status: string;
  createdAt: string;

  // BE của bạn đang trả: subtotal/discount/extraFee/total/payments...
  subtotal?: number;
  discount?: number;
  extraFee?: number;
  total?: number;

  paymentMethod?: string;
  payments?: { method?: string; amount?: number }[];

  items: OrderItem[];
};

const money = (n: number) => Number(n || 0).toLocaleString("vi-VN") + "đ";

function statusTag(status: string) {
  const s = String(status || "").toUpperCase();
  if (s === "PAID" || s === "COMPLETED" || s === "DONE" || s === "CONFIRM")
    return <Tag className="!m-0 rounded-full border-0 bg-green-600 text-white font-extrabold">ĐÃ THANH TOÁN</Tag>;
  if (s === "SHIPPING")
    return <Tag className="!m-0 rounded-full border-0 bg-blue-600 text-white font-extrabold">ĐANG GIAO</Tag>;
  if (s === "CANCELLED" || s === "CANCELED")
    return <Tag className="!m-0 rounded-full border-0 bg-gray-600 text-white font-extrabold">ĐÃ HUỶ</Tag>;
  if (s === "FAILED")
    return <Tag className="!m-0 rounded-full border-0 bg-red-600 text-white font-extrabold">THẤT BẠI</Tag>;
  return <Tag className="!m-0 rounded-full border-0 bg-amber-500 text-white font-extrabold">CHỜ XỬ LÝ</Tag>;
}

export default function OrderDetailPage() {
  const { orderId } = useParams();
  const nav = useNavigate();
  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState<Order | null>(null);

  useEffect(() => {
    if (!orderId) return;

    const ctrl = new AbortController();

    (async () => {
      try {
        setLoading(true);
        const res = await api.get(`/order-public/orders/${orderId}`, { signal: ctrl.signal });
        setOrder(res.data.order);
      } catch {
        setOrder(null);
      } finally {
        setLoading(false);
      }
    })();

    return () => ctrl.abort();
  }, [orderId]);

  const paymentMethod = useMemo(() => {
    if (!order) return "—";
    if (order.paymentMethod) return order.paymentMethod;
    const m = order.payments?.[0]?.method;
    return m ? String(m).toUpperCase() : "—";
  }, [order]);

  const totalSavings = useMemo(() => {
    if (!order) return 0;
    return (order.items || []).reduce((sum, it) => {
      const d = Number(it.discountAmount || 0);
      if (d > 0) return sum + d * Number(it.qty || 0);
      return sum;
    }, 0);
  }, [order]);

  const itemSubtotal = useMemo(() => {
    if (!order) return 0;
    return (order.items || []).reduce((sum, it) => sum + Number(it.price || 0) * Number(it.qty || 0), 0);
  }, [order]);

  const shipFee = Number(order?.extraFee || 0);
  const grandTotal = Number(order?.total ?? itemSubtotal + shipFee);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Spin />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="w-full max-w-[720px] rounded-[26px] border border-pink-100 bg-white shadow-sm p-8 text-center">
          <Empty description="Không tìm thấy đơn hàng" />
          <Button onClick={() => nav("/shop")} className="mt-4 rounded-2xl border-pink-200 text-pink-700">
            Quay lại mua sắm
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-pink-50/60 to-white">
      <ShopHeader
        {...({
          onSearch: (_v: string) => {},
          onOpenVoucher: () => window.scrollTo({ top: 450, behavior: "smooth" }),
        } as any)}
      />

      <div className="mx-auto w-full max-w-[980px] px-4 md:px-6 py-5 pb-10">
        {/* Top bar */}
        <div className="flex items-center justify-between gap-3">
          <Button
            onClick={() => nav("/shop")}
            className="rounded-2xl border-pink-200 text-pink-700 font-extrabold"
          >
            <ArrowLeft size={16} className="mr-1" /> Quay lại shop
          </Button>

          <div className="hidden sm:flex items-center gap-2">
            <div className="text-xs font-bold text-gray-500">Mã đơn</div>
            <div className="px-3 py-1.5 rounded-2xl border border-pink-100 bg-white font-mono text-sm font-extrabold text-gray-900">
              {order.code}
            </div>
            <Button
              size="small"
              className="rounded-xl border-pink-200 text-pink-700"
              onClick={() => navigator.clipboard?.writeText(order.code)}
            >
              <Copy size={14} className="mr-1" /> Copy
            </Button>
          </div>
        </div>

        {/* Header card */}
        <div className="mt-4 rounded-[26px] border border-pink-100 bg-white shadow-sm overflow-hidden">
          <div className="p-5 md:p-6">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-pink-600">
                    <Package size={18} />
                  </span>
                  <div className="text-[18px] md:text-[22px] font-extrabold text-gray-900 truncate">
                    Đơn hàng #{order.code}
                  </div>
                </div>
                <div className="mt-1 text-sm text-gray-600">
                  Tạo lúc:{" "}
                  <span className="font-semibold text-gray-900">
                    {new Date(order.createdAt).toLocaleString("vi-VN")}
                  </span>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <div className="rounded-2xl border border-pink-100 bg-pink-50/50 px-3 py-2 text-xs font-semibold text-gray-700 flex items-center gap-2">
                    <span className="text-pink-600">
                      <Truck size={16} />
                    </span>
                    <span>Vận chuyển: {shipFee > 0 ? money(shipFee) : "—"}</span>
                  </div>

                  <div className="rounded-2xl border border-pink-100 bg-pink-50/50 px-3 py-2 text-xs font-semibold text-gray-700 flex items-center gap-2">
                    <span className="text-pink-600">
                      <CreditCard size={16} />
                    </span>
                    <span>Thanh toán: {paymentMethod}</span>
                  </div>

                  {totalSavings > 0 ? (
                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 px-3 py-2 text-xs font-extrabold text-emerald-700">
                      Tiết kiệm: {money(totalSavings)}
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="shrink-0">{statusTag(order.status)}</div>
            </div>
          </div>

          <div className="h-px bg-pink-100" />

          {/* Items */}
          <div className="p-5 md:p-6">
            <div className="text-[15px] md:text-base font-extrabold text-gray-900">Sản phẩm</div>

            <div className="mt-4 space-y-3">
              {(order.items || []).map((it, idx) => {
                const lineTotal = Number(it.price || 0) * Number(it.qty || 0);
                const d = Number(it.discountAmount || 0);
                const oldLine = d > 0 ? (Number(it.price || 0) + d) * Number(it.qty || 0) : 0;

                const attrsText = Array.isArray(it.attributes)
                  ? it.attributes
                      .filter((x) => x?.k && x?.v)
                      .map((x) => `${x.k}: ${x.v}`)
                      .join(" • ")
                  : "";

                return (
                  <div
                    key={idx}
                    className="rounded-[22px] border border-pink-100 bg-white shadow-[0_1px_0_rgba(0,0,0,0.02)] p-3 flex gap-3"
                  >
                    <img
                      src={it.image || "https://via.placeholder.com/96"}
                      alt={it.name}
                      className="w-20 h-20 rounded-2xl object-cover border border-pink-100 bg-pink-50 shrink-0"
                      onError={(e) => ((e.currentTarget as HTMLImageElement).src = "https://via.placeholder.com/96")}
                    />

                    <div className="flex-1 min-w-0">
                      <div className="font-extrabold text-gray-900 line-clamp-2">{it.name}</div>

                      {it.variantName ? (
                        <div className="mt-0.5 text-xs text-gray-500 line-clamp-1">{it.variantName}</div>
                      ) : null}

                      {attrsText ? (
                        <div className="mt-0.5 text-xs text-gray-500 line-clamp-2">{attrsText}</div>
                      ) : null}

                      <div className="mt-2 flex items-center justify-between gap-2">
                        <div className="text-sm font-extrabold text-pink-600">
                          {money(it.price)} <span className="text-gray-400 font-semibold">× {it.qty}</span>
                        </div>

                        <div className="text-right">
                          {oldLine > 0 ? (
                            <div className="text-xs text-gray-400 line-through">{money(oldLine)}</div>
                          ) : null}
                          <div className="text-[15px] font-extrabold text-gray-900">{money(lineTotal)}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <Divider className="!my-5" />

            {/* Summary */}
            <div className="rounded-[22px] border border-pink-100 bg-pink-50/30 p-4 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Tạm tính</span>
                <span className="font-extrabold text-gray-900">{money(itemSubtotal)}</span>
              </div>

              {totalSavings > 0 ? (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Giảm giá</span>
                  <span className="font-extrabold text-emerald-700">- {money(totalSavings)}</span>
                </div>
              ) : null}

              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Phí ship</span>
                <span className="font-extrabold text-gray-900">{money(shipFee)}</span>
              </div>

              <div className="h-px bg-pink-100 my-2" />

              <div className="flex items-center justify-between">
                <span className="text-[15px] font-extrabold text-gray-900">Tổng cộng</span>
                <span className="text-[18px] font-extrabold text-pink-600">{money(grandTotal)}</span>
              </div>
            </div>

            <div className="mt-4 flex flex-col sm:flex-row gap-2">
              <Button
                onClick={() => nav("/shop")}
                className="rounded-2xl border-pink-200 text-pink-700 font-extrabold h-11"
              >
                Tiếp tục mua sắm
              </Button>

              <Button
                type="primary"
                className="rounded-2xl !bg-pink-600 hover:!bg-pink-700 !border-pink-600 font-extrabold h-11"
                onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              >
                Lên đầu trang
              </Button>
            </div>
          </div>
        </div>

        {/* Mobile: show order code + copy */}
        <div className="sm:hidden mt-3 rounded-2xl border border-pink-100 bg-white shadow-sm p-4 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="text-xs text-gray-500">Mã đơn</div>
            <div className="font-mono font-extrabold text-gray-900 truncate">{order.code}</div>
          </div>
          <Button
            size="small"
            className="rounded-xl border-pink-200 text-pink-700"
            onClick={() => navigator.clipboard?.writeText(order.code)}
          >
            <Copy size={14} className="mr-1" /> Copy
          </Button>
        </div>
      </div>
    </div>
  );
}
