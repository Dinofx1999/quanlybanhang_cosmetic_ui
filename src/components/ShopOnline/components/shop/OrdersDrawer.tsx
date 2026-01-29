import React, { useEffect, useMemo, useState } from "react";
import { Drawer, Button, Empty, Spin, Tag, message, Divider } from "antd";
import { RefreshCw, Package, BadgeCheck, XCircle, Clock, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import api from "../../../../services/api"; // ✅ chỉnh path api theo project bạn

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
  phoneKey?: string; // default: last_order_phone
};

const money = (n?: number) =>
  (Number(n || 0)).toLocaleString("vi-VN", { maximumFractionDigits: 0 }) + "đ";

const fmtTime = (iso?: string) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("vi-VN");
};

const statusTag = (s?: string) => {
  const v = String(s || "").toUpperCase();
  if (v === "CONFIRM")
    return (
      <Tag color="green" className="!m-0 rounded-lg">
        <span className="inline-flex items-center gap-1">
          <BadgeCheck size={14} /> Đã xác nhận
        </span>
      </Tag>
    );
  if (v === "CANCELLED")
    return (
      <Tag color="red" className="!m-0 rounded-lg">
        <span className="inline-flex items-center gap-1">
          <XCircle size={14} /> Đã hủy
        </span>
      </Tag>
    );
  return (
    <Tag color="gold" className="!m-0 rounded-lg">
      <span className="inline-flex items-center gap-1">
        <Clock size={14} /> Chờ xử lý
      </span>
    </Tag>
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
      // ✅ API: /order-public/orders/track/:phone
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
      width={420}
      title={
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-2xl bg-pink-50 border border-pink-100 flex items-center justify-center">
            <Package size={18} className="text-pink-600" />
          </div>
          <div className="leading-tight">
            <div className="font-extrabold text-gray-900">Đơn hàng của tôi</div>
            <div className="text-xs text-gray-500">
              {hasPhone ? `SĐT: ${phone}` : "Chưa có SĐT trong máy"}
            </div>
          </div>
        </div>
      }
      extra={
        <Button
          onClick={fetchOrders}
          className="rounded-xl border-pink-200 text-pink-600 hover:!border-pink-300 hover:!text-pink-700"
        >
          <RefreshCw size={16} className="mr-1" />
          Tải lại
        </Button>
      }
      bodyStyle={{ paddingBottom: 16 }}
    >
      {!hasPhone && (
        <div className="rounded-2xl border border-pink-100 bg-pink-50/40 p-4">
          <div className="font-semibold text-gray-900">Chưa có số điện thoại</div>
          <div className="text-sm text-gray-600 mt-1">
            Bạn cần đặt hàng 1 lần để hệ thống lưu SĐT (key <b>{phoneKey}</b>) hoặc bạn có thể lưu thủ công vào
            localStorage.
          </div>
          <Divider className="!my-3" />
          <Button
            type="primary"
            className="rounded-2xl !bg-pink-500 hover:!bg-pink-600 !border-pink-500"
            onClick={() => {
              onClose();
              nav("/my-orders"); // nếu bạn có trang nhập SĐT tra cứu
            }}
          >
            Đi tới tra cứu đơn
          </Button>
        </div>
      )}

      {loading && (
        <div className="py-10 flex items-center justify-center">
          <Spin />
        </div>
      )}

      {!loading && hasPhone && (
        <>
          {/* Customer */}
          {data?.customer && (
            <div className="rounded-2xl border border-pink-100 bg-white p-4">
              <div className="text-xs text-gray-500">Khách hàng</div>
              <div className="font-extrabold text-gray-900">{data.customer.name || "—"}</div>
              <div className="text-sm text-gray-600 mt-1">
                <div>SĐT: <b>{data.customer.phone || phone}</b></div>
                {data.customer.email ? <div>Email: {data.customer.email}</div> : null}
              </div>
            </div>
          )}

          <div className="mt-4 flex items-center justify-between">
            <div className="font-extrabold text-gray-900">
              Danh sách đơn ({data?.total ?? data?.orders?.length ?? 0})
            </div>
          </div>

          {/* Orders */}
          <div className="mt-3 space-y-2">
            {(!data?.orders || data.orders.length === 0) && (
              <Empty description="Chưa có đơn hàng nào." />
            )}

            {data?.orders?.map((o) => (
              <button
                key={o._id}
                onClick={() => {
                  onClose();
                  nav(`/my-orders/${o.code}`);
                }}
                className="
                  w-full text-left
                  rounded-2xl border border-pink-100 bg-white
                  p-3 hover:shadow-sm transition
                "
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-xs text-gray-500">Mã đơn</div>
                    <div className="font-extrabold text-gray-900">{o.code}</div>
                  </div>
                  {statusTag(o.status)}
                </div>

                <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
                  <div className="rounded-xl bg-pink-50/40 border border-pink-100 p-2">
                    <div className="text-gray-500">Tổng</div>
                    <div className="font-extrabold text-gray-900">{money(o.total)}</div>
                  </div>
                  <div className="rounded-xl bg-pink-50/40 border border-pink-100 p-2">
                    <div className="text-gray-500">SP</div>
                    <div className="font-extrabold text-gray-900">{o.itemCount ?? 0}</div>
                  </div>
                  <div className="rounded-xl bg-pink-50/40 border border-pink-100 p-2">
                    <div className="text-gray-500">Tiết kiệm</div>
                    <div className="font-extrabold text-pink-600">{money(o.totalSavings)}</div>
                  </div>
                </div>

                <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
                  <div>{fmtTime(o.createdAt)}</div>
                  <div className="inline-flex items-center gap-1 text-pink-600 font-semibold">
                    Xem chi tiết <ChevronRight size={14} />
                  </div>
                </div>

                {o.hasFlashSaleItems && (
                  <div className="mt-2">
                    <Tag color="magenta" className="rounded-lg !m-0">Flash Sale</Tag>
                  </div>
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </Drawer>
  );
}
