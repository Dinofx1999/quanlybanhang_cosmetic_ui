import React, { useEffect, useMemo, useState } from "react";
import { Drawer, Button, Empty, Spin, Tag, message, Divider } from "antd";
import {
  RefreshCw,
  Package,
  BadgeCheck,
  XCircle,
  Clock,
  ChevronRight,
  User,
  Phone,
  Mail,
  ShoppingBag,
  TrendingDown,
  Sparkles,
  Calendar,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import api from "../../../../services/api";

type OrderTrackItem = {
  _id: string;
  code: string;
  status: "PENDING" | "CONFIRM" | "CANCELLED" | string;
  total: number;
  hasFlashSaleItems?: boolean;
  totalSavings?: number;
  itemCount?: number;
  createdAt?: string;
};

type TrackResponse = {
  ok: boolean;
  orders: OrderTrackItem[];
  total: number;
  customer?: { name?: string; phone?: string; email?: string };
  message?: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  phoneKey?: string;
};

const money = (n?: number) =>
  Number(n || 0).toLocaleString("vi-VN", { maximumFractionDigits: 0 }) + "đ";

const fmtTime = (iso?: string) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  
  if (days === 0) return "Hôm nay " + d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
  if (days === 1) return "Hôm qua " + d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
  if (days < 7) return `${days} ngày trước`;
  
  return d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
};

const StatusTag: React.FC<{ status?: string }> = ({ status }) => {
  const v = String(status || "").toUpperCase();

  if (v === "CONFIRM") {
    return (
      <div className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-green-50 to-emerald-50 px-3 py-1 border border-green-200">
        <BadgeCheck size={14} className="text-green-600" />
        <span className="text-xs font-semibold text-green-700">Đã xác nhận</span>
      </div>
    );
  }

  if (v === "CANCELLED") {
    return (
      <div className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-red-50 to-rose-50 px-3 py-1 border border-red-200">
        <XCircle size={14} className="text-red-600" />
        <span className="text-xs font-semibold text-red-700">Đã hủy</span>
      </div>
    );
  }

  return (
    <div className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-orange-50 to-amber-50 px-3 py-1 border border-orange-200">
      <Clock size={14} className="text-orange-600" />
      <span className="text-xs font-semibold text-orange-700">Chờ xử lý</span>
    </div>
  );
};

const OrderCard: React.FC<{
  order: OrderTrackItem;
  onClick: () => void;
}> = ({ order, onClick }) => {
  return (
    <button
      onClick={onClick}
      className="group relative w-full overflow-hidden rounded-2xl border border-pink-100 bg-gradient-to-br from-white to-pink-50/30 p-4 text-left transition-all hover:border-pink-300 hover:shadow-lg hover:shadow-pink-100/50 active:scale-[0.98]"
    >
      {/* Decorative gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-pink-500/0 via-purple-500/0 to-pink-500/5 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

      <div className="relative">
        {/* Header */}
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="flex-1">
            <div className="mb-1 flex items-center gap-2">
              <div className="rounded-lg bg-gradient-to-br from-pink-100 to-purple-100 p-1.5">
                <Package size={14} className="text-pink-600" />
              </div>
              <span className="text-xs font-medium text-gray-500">Mã đơn hàng</span>
            </div>
            <div className="font-mono text-base font-bold text-gray-900 group-hover:text-pink-600 transition-colors">
              {order.code}
            </div>
          </div>
          <StatusTag status={order.status} />
        </div>

        {/* Stats Grid */}
        <div className="mb-3 grid grid-cols-3 gap-2">
          <div className="rounded-xl border border-pink-100 bg-white/80 p-2.5 backdrop-blur-sm">
            <div className="mb-1 flex items-center gap-1 text-xs text-gray-500">
              <TrendingDown size={12} />
              <span>Tổng tiền</span>
            </div>
            <div className="font-bold text-pink-600">{money(order.total)}</div>
          </div>

          <div className="rounded-xl border border-purple-100 bg-white/80 p-2.5 backdrop-blur-sm">
            <div className="mb-1 flex items-center gap-1 text-xs text-gray-500">
              <ShoppingBag size={12} />
              <span>Sản phẩm</span>
            </div>
            <div className="font-bold text-purple-600">{order.itemCount ?? 0}</div>
          </div>

          <div className="rounded-xl border border-green-100 bg-white/80 p-2.5 backdrop-blur-sm">
            <div className="mb-1 flex items-center gap-1 text-xs text-gray-500">
              <Sparkles size={12} />
              <span>Tiết kiệm</span>
            </div>
            <div className="font-bold text-green-600">{money(order.totalSavings)}</div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <Calendar size={12} />
            <span>{fmtTime(order.createdAt)}</span>
          </div>

          <div className="flex items-center gap-1 text-xs font-semibold text-pink-600 transition-all group-hover:gap-2">
            <span>Xem chi tiết</span>
            <ChevronRight size={14} className="transition-transform group-hover:translate-x-0.5" />
          </div>
        </div>

        {/* Flash Sale Badge */}
        {order.hasFlashSaleItems && (
          <div className="mt-3">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-yellow-400 to-orange-500 px-3 py-1 shadow-md">
              <Sparkles size={12} className="text-white" />
              <span className="text-xs font-bold text-white">Flash Sale</span>
            </div>
          </div>
        )}
      </div>
    </button>
  );
};

export default function OrdersDrawer({ open, onClose, phoneKey = "last_order_phone" }: Props) {
  const nav = useNavigate();

  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<TrackResponse | null>(null);
  const [phone, setPhone] = useState<string>("");

  const hasPhone = useMemo(() => !!phone && phone.length >= 9, [phone]);

  const fetchOrders = async () => {
    const p = (localStorage.getItem(phoneKey) || "").trim();
    setPhone(p);

    if (!p) {
      setData(null);
      return;
    }

    setLoading(true);
    try {
      const res = await api.get(`/order-public/orders/track/${encodeURIComponent(p)}`);
      const body: TrackResponse = res.data;

      if (!body?.ok) throw new Error(body?.message || "TRACK_FAILED");
      setData(body);
    } catch (e: any) {
      setData(null);
      message.error(e?.message || "Không tải được danh sách đơn hàng.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) fetchOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return (
    <Drawer
      open={open}
      onClose={onClose}
      width={460}
      title={
        <div className="flex items-center justify-between py-2">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-pink-500 to-purple-600 shadow-lg shadow-pink-500/50">
              <Package size={22} className="text-white" />
            </div>
            <div>
              <h3 className="bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-xl font-bold text-transparent">
                Đơn hàng của tôi
              </h3>
              {hasPhone && (
                <p className="flex items-center gap-1 text-xs text-gray-500">
                  <Phone size={11} />
                  {phone}
                </p>
              )}
            </div>
          </div>
        </div>
      }
      extra={
        <Button
          onClick={fetchOrders}
          loading={loading}
          className="rounded-xl border-pink-200 text-pink-600 hover:!border-pink-300 hover:!bg-pink-50"
          icon={<RefreshCw size={16} />}
        >
          Tải lại
        </Button>
      }
      closeIcon={null}
      destroyOnClose
      styles={{
        body: { padding: 0 },
        header: { borderBottom: "1px solid rgb(254 205 211)", padding: "16px 24px" },
      }}
    >
      <div className="h-full bg-gradient-to-b from-pink-50/30 to-white">
        {/* Empty State - No Phone */}
        {!hasPhone && (
          <div className="flex h-full flex-col items-center justify-center p-6">
            <div className="mb-6 flex h-32 w-32 items-center justify-center rounded-full bg-gradient-to-br from-pink-100 to-purple-100">
              <Package size={56} className="text-pink-400" />
            </div>
            <h3 className="mb-2 text-xl font-bold text-gray-900">Chưa có đơn hàng</h3>
            <p className="mb-6 text-center text-sm text-gray-600">
              Hãy đặt hàng để bắt đầu trải nghiệm mua sắm cùng chúng tôi nhé!
            </p>
            <Button
              type="primary"
              size="large"
              onClick={() => {
                onClose();
                nav("/my-orders");
              }}
              className="rounded-2xl !bg-gradient-to-r !from-pink-600 !to-purple-600 !border-none font-semibold shadow-lg shadow-pink-500/50"
            >
              Tra cứu đơn hàng
            </Button>
          </div>
        )}

        {/* Loading State */}
        {loading && hasPhone && (
          <div className="flex h-full items-center justify-center py-20">
            <div className="text-center">
              <Spin size="large" />
              <p className="mt-4 text-sm text-gray-500">Đang tải đơn hàng...</p>
            </div>
          </div>
        )}

        {/* Content */}
        {!loading && hasPhone && (
          <div className="p-6 space-y-4">
            {/* Customer Info Card */}
            {data?.customer && (
              <div className="overflow-hidden rounded-2xl border border-pink-100 bg-gradient-to-br from-white to-pink-50/50 p-4 shadow-sm">
                <div className="mb-3 flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600">
                    <User size={16} className="text-white" />
                  </div>
                  <span className="text-sm font-semibold text-gray-700">Thông tin khách hàng</span>
                </div>

                <div className="space-y-2">
                  <div className="rounded-xl bg-white/80 p-3 backdrop-blur-sm">
                    <div className="text-xs text-gray-500">Họ tên</div>
                    <div className="mt-0.5 font-bold text-gray-900">
                      {data.customer.name || "—"}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-xl bg-white/80 p-3 backdrop-blur-sm">
                      <div className="mb-1 flex items-center gap-1 text-xs text-gray-500">
                        <Phone size={11} />
                        <span>Số điện thoại</span>
                      </div>
                      <div className="font-mono text-sm font-semibold text-gray-900">
                        {data.customer.phone || phone}
                      </div>
                    </div>

                    {data.customer.email && (
                      <div className="rounded-xl bg-white/80 p-3 backdrop-blur-sm">
                        <div className="mb-1 flex items-center gap-1 text-xs text-gray-500">
                          <Mail size={11} />
                          <span>Email</span>
                        </div>
                        <div className="truncate text-sm font-semibold text-gray-900">
                          {data.customer.email}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Orders Header */}
            <div className="flex items-center justify-between">
              <h4 className="text-base font-bold text-gray-900">
                Danh sách đơn hàng
                <span className="ml-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-pink-100 text-xs font-bold text-pink-600">
                  {data?.total ?? data?.orders?.length ?? 0}
                </span>
              </h4>
            </div>

            {/* Orders List */}
            <div className="space-y-3">
              {(!data?.orders || data.orders.length === 0) && (
                <div className="flex flex-col items-center justify-center rounded-2xl border border-pink-100 bg-white p-12">
                  <Empty
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    description={
                      <div className="text-center">
                        <p className="text-base font-medium text-gray-900">
                          Chưa có đơn hàng nào
                        </p>
                        <p className="mt-1 text-sm text-gray-500">
                          Các đơn hàng của bạn sẽ hiển thị ở đây
                        </p>
                      </div>
                    }
                  />
                </div>
              )}

              {data?.orders?.map((order, index) => (
                <div
                  key={order._id}
                  style={{
                    animation: `slideIn 0.3s ease-out ${index * 0.05}s both`,
                  }}
                >
                  <OrderCard
                    order={order}
                    onClick={() => {
                      onClose();
                      nav(`/my-orders/${order.code}`);
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </Drawer>
  );
}