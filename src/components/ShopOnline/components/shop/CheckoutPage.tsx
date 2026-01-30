// src/pages/ShopOnline/pages/CheckoutPage.tsx
import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Button,
  Card,
  Divider,
  Empty,
  Form,
  Input,
  InputNumber,
  message,
  Radio,
  Space,
  Typography,
  Modal,
  Badge,
  Tag,
} from "antd";
import {
  ArrowLeft,
  Trash2,
  CheckCircle,
  ShoppingBag,
  MapPin,
  CreditCard,
  Ticket,
  X,
  Sparkles,
  Gift,
  TrendingUp,
} from "lucide-react";

import api from "../../../../services/api";
import {
  getCart,
  subscribeCart,
  setQty,
  removeItem,
  clearCart,
  type CartItem,
} from "../../../../utils/cart";
import ShopHeader from "../shop/ShopHeader";

const { Title, Text } = Typography;

// Types
interface Voucher {
  code: string;
  qty: number;
  discountText: string;
  hint: string;
  type: "PERCENT" | "AMOUNT" | "SHIP";
}

type CheckoutState =
  | {
      mode?: "buyNow" | "cart";
      buyNowItem?: CartItem;
    }
  | undefined;

// Utils
function money(n: number) {
  return Number(n || 0).toLocaleString("vi-VN") + "đ";
}

// Voucher Modal Component
const VoucherModal: React.FC<{
  open: boolean;
  onClose: () => void;
  vouchers: Voucher[];
  selectedCode: string | null;
  onSelect: (code: string) => void;
  subtotal: number;
}> = ({ open, onClose, vouchers, selectedCode, onSelect, subtotal }) => {
  const getMinAmount = (hint: string) => {
    const match = hint.match(/(\d+)K/);
    return match ? parseInt(match[1]) * 1000 : 0;
  };

  const isVoucherValid = (voucher: Voucher) => {
    const minAmount = getMinAmount(voucher.hint);
    return subtotal >= minAmount;
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      width={520}
      title={
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-orange-400 to-pink-500">
            <Ticket size={20} className="text-white" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">Chọn voucher</h3>
            <p className="text-xs text-gray-500">Áp dụng ưu đãi cho đơn hàng</p>
          </div>
        </div>
      }
      closeIcon={<X size={18} />}
    >
      <div className="mt-4 space-y-3 max-h-[500px] overflow-y-auto pr-2">
        {vouchers.map((voucher) => {
          const isValid = isVoucherValid(voucher);
          const isSelected = selectedCode === voucher.code;

          return (
            <div
              key={voucher.code}
              onClick={() => {
                if (isValid) {
                  onSelect(voucher.code);
                  message.success(`Đã áp dụng mã ${voucher.code}`);
                  onClose();
                } else {
                  message.warning(`Chưa đủ điều kiện áp dụng mã ${voucher.code}`);
                }
              }}
              className={`group relative overflow-hidden rounded-2xl border-2 p-4 transition-all cursor-pointer ${
                isSelected
                  ? "border-pink-500 bg-pink-50 shadow-lg shadow-pink-200/50"
                  : isValid
                  ? "border-gray-200 bg-white hover:border-pink-300 hover:shadow-md"
                  : "border-gray-100 bg-gray-50 opacity-60 cursor-not-allowed"
              }`}
            >
              {/* Background decoration */}
              <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-gradient-to-br from-pink-200/20 to-orange-200/20 blur-2xl" />

              <div className="relative flex gap-4">
                {/* Icon */}
                <div
                  className={`flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-xl ${
                    voucher.type === "SHIP"
                      ? "bg-gradient-to-br from-green-400 to-emerald-500"
                      : voucher.type === "AMOUNT"
                      ? "bg-gradient-to-br from-blue-400 to-indigo-500"
                      : "bg-gradient-to-br from-orange-400 to-pink-500"
                  } shadow-lg`}
                >
                  {voucher.type === "SHIP" ? (
                    <Gift size={28} className="text-white" />
                  ) : (
                    <Ticket size={28} className="text-white" />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div>
                      <div className="font-mono text-sm font-bold text-gray-900">
                        {voucher.code}
                      </div>
                      <div className="text-xs text-gray-500">Còn {voucher.qty} mã</div>
                    </div>
                    {isSelected && (
                      <CheckCircle size={20} className="text-pink-500 flex-shrink-0" />
                    )}
                  </div>

                  <div className="mt-2 mb-2">
                    <div className="text-base font-bold text-pink-600">
                      {voucher.discountText}
                    </div>
                    <div className="text-xs text-gray-600">{voucher.hint}</div>
                  </div>

                  {!isValid && (
                    <Tag color="orange" className="text-xs">
                      Chưa đủ điều kiện
                    </Tag>
                  )}
                  {isValid && !isSelected && (
                    <Tag color="green" className="text-xs">
                      Có thể áp dụng
                    </Tag>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {selectedCode && (
        <div className="mt-4 flex justify-between gap-2">
          <Button
            onClick={() => {
              onSelect("");
              message.info("Đã bỏ chọn voucher");
            }}
            className="flex-1 rounded-xl"
          >
            Bỏ chọn
          </Button>
          <Button
            type="primary"
            onClick={onClose}
            className="flex-1 rounded-xl !bg-pink-600 hover:!bg-pink-700"
          >
            Xác nhận
          </Button>
        </div>
      )}
    </Modal>
  );
};

// Product Item Card Component
const ProductItemCard: React.FC<{
  item: CartItem;
  onChangeQty: (qty: number) => void;
  onDelete: () => void;
}> = ({ item, onChangeQty, onDelete }) => {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-pink-100 bg-gradient-to-br from-white to-pink-50/30 p-4 transition-all hover:border-pink-300 hover:shadow-lg">
      <div className="flex gap-4">
        {/* Image */}
        <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-xl bg-gradient-to-br from-pink-100 to-purple-100 p-0.5">
          <img
            src={item.image || "/placeholder.png"}
            alt={item.name}
            className="h-full w-full rounded-xl object-cover"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src = "/placeholder.png";
            }}
          />
        </div>

        {/* Info */}
        <div className="flex flex-1 flex-col min-w-0">
          <div className="flex items-start justify-between gap-2 mb-2">
            <h4 className="line-clamp-2 flex-1 text-sm font-semibold text-gray-900 group-hover:text-pink-600 transition-colors">
              {item.name}
            </h4>
            <button
              onClick={onDelete}
              className="flex h-7 w-7 items-center justify-center rounded-full bg-red-50 text-red-500 opacity-0 transition-all hover:bg-red-100 group-hover:opacity-100"
            >
              <Trash2 size={14} />
            </button>
          </div>

          {item.attrsText && (
            <div className="mb-1 text-xs text-gray-500 line-clamp-1">
              {item.attrsText}
            </div>
          )}

          {item.sku && (
            <div className="mb-2 text-xs text-gray-400">
              SKU: <span className="font-mono">{item.sku}</span>
            </div>
          )}

          <div className="mt-auto flex items-center justify-between gap-3">
            <div className="text-base font-bold text-pink-600">{money(item.price)}</div>

            <div className="flex items-center gap-1.5 rounded-full border border-pink-200 bg-white p-1">
              <InputNumber
                min={1}
                max={999}
                value={item.qty}
                onChange={(v) => onChangeQty(Number(v || 1))}
                className="!w-16 border-0 text-center"
                size="small"
                controls={false}
              />
              <span className="pr-2 text-xs text-gray-500">×{money(item.price)}</span>
            </div>
          </div>

          <div className="mt-2 text-right text-sm font-bold text-gray-900">
            = {money(Number(item.price || 0) * Number(item.qty || 0))}
          </div>
        </div>
      </div>
    </div>
  );
};

// Main Component
export default function CheckoutPage() {
  const nav = useNavigate();
  const location = useLocation();
  const [form] = Form.useForm();

  const st = (location.state as CheckoutState) || {};
  const isBuyNow = st?.mode === "buyNow" && !!st?.buyNowItem;

  const [cart, setCartState] = useState<CartItem[]>(() => {
    return isBuyNow ? [st!.buyNowItem!] : getCart();
  });

  const [submitting, setSubmitting] = useState(false);
  const [voucherModalOpen, setVoucherModalOpen] = useState(false);
  const [selectedVoucher, setSelectedVoucher] = useState<string | null>(null);

  // Mock vouchers
  const vouchers: Voucher[] = useMemo(
    () => [
      { code: "BA10", qty: 128, discountText: "Giảm 10%", hint: "Đơn từ 199K", type: "PERCENT" },
      { code: "BA20", qty: 64, discountText: "Giảm 20%", hint: "Đơn từ 499K", type: "PERCENT" },
      { code: "BA30K", qty: 256, discountText: "Giảm 30K", hint: "Đơn từ 149K", type: "AMOUNT" },
      { code: "FREESHIP", qty: 512, discountText: "Freeship toàn quốc", hint: "Đơn từ 99K", type: "SHIP" },
    ],
    []
  );

  useEffect(() => {
    if (isBuyNow) return;
    setCartState(getCart());
    const unsub = subscribeCart(() => setCartState(getCart()));
    return () => {
      if (typeof unsub === "function") {
        unsub();
      }
    };
  }, [isBuyNow]);

  const subtotal = useMemo(() => {
    return cart.reduce((s, it) => s + Number(it.price || 0) * Number(it.qty || 0), 0);
  }, [cart]);

  const shippingFee = useMemo(() => {
    if (selectedVoucher === "FREESHIP" && subtotal >= 99000) return 0;
    if (subtotal >= 300000) return 0;
    return cart.length ? 20000 : 0;
  }, [subtotal, cart.length, selectedVoucher]);

  const voucherDiscount = useMemo(() => {
    if (!selectedVoucher) return 0;
    const voucher = vouchers.find((v) => v.code === selectedVoucher);
    if (!voucher) return 0;

    const getMinAmount = (hint: string) => {
      const match = hint.match(/(\d+)K/);
      return match ? parseInt(match[1]) * 1000 : 0;
    };

    if (subtotal < getMinAmount(voucher.hint)) return 0;

    if (voucher.type === "PERCENT") {
      const percent = parseInt(voucher.discountText.match(/\d+/)?.[0] || "0");
      return Math.floor((subtotal * percent) / 100);
    }
    if (voucher.type === "AMOUNT") {
      const amount = parseInt(voucher.discountText.match(/\d+/)?.[0] || "0") * 1000;
      return amount;
    }
    return 0;
  }, [subtotal, selectedVoucher, vouchers]);

  const total = useMemo(
    () => Math.max(0, subtotal + shippingFee - voucherDiscount),
    [subtotal, shippingFee, voucherDiscount]
  );

  const changeQty = (id: string, qty: number) => {
    const safeQty = Math.max(1, Number(qty || 1));
    if (isBuyNow) {
      setCartState((prev) => prev.map((x) => (x.id === id ? { ...x, qty: safeQty } : x)));
    } else {
      setQty(id, safeQty);
    }
  };

  const deleteItem = (id: string) => {
    if (isBuyNow) {
      setCartState([]);
    } else {
      removeItem(id);
    }
  };

  const submitOrder = async () => {
    try {
      if (!cart.length) {
        return message.warning("Giỏ hàng đang trống.");
      }

      setSubmitting(true);
      const values = await form.validateFields();

      const payload = {
        channel: "ONLINE",
        status: "PENDING",
        customer: {
          name: String(values.fullName || "").trim(),
          phone: String(values.phone || "").trim(),
          email: String(values.email || "").trim(),
        },
        delivery: {
          method: "SHIP",
          address: String(values.address || "").trim(),
          receiverName: String(values.fullName || "").trim(),
          receiverPhone: String(values.phone || "").trim(),
          note: String(values.note || "").trim(),
        },
        payment: {
          method: values.paymentMethod || "COD",
          amount: 0,
        },
        items: cart.map((it) => ({
          productId: it.variantId || it.id,
          qty: Number(it.qty || 1),
        })),
        extraFee: shippingFee,
        discount: voucherDiscount,
        voucherCode: selectedVoucher || undefined,
      };

      console.log("Submitting order payload:", payload);

      const res = await api.post("/order-public/orders", payload);

      if (!res.data?.ok) {
        throw new Error(res.data?.message || "ORDER_FAILED");
      }

      const order = res.data.order;
      message.success({
        content: (
          <div className="flex items-center gap-2">
            <CheckCircle size={16} />
            <span>
              Đặt hàng thành công! Mã đơn: <strong>{order.code}</strong>
            </span>
          </div>
        ),
        duration: 5,
      });

      if (payload.customer) {
        localStorage.setItem("last_order_phone", payload?.customer?.phone);
      }

      nav(`/my-orders/${order.code}`, { replace: true });

      if (!isBuyNow) {
        clearCart();
      }
    } catch (e: any) {
      console.error("Submit order error:", e);

      if (e?.errorFields) {
        return;
      }

      const errorMsg =
        e?.response?.data?.message || e?.message || "Đặt hàng thất bại. Vui lòng thử lại.";

      message.error(errorMsg);
    } finally {
      setSubmitting(false);
    }
  };

  const selectedVoucherObj = vouchers.find((v) => v.code === selectedVoucher);

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-pink-50/30 via-purple-50/20 to-white">
      <ShopHeader
        onSearch={(v: string) => {}}
        onOpenVoucher={() => window.scrollTo({ top: 450, behavior: "smooth" })}
      />

      <div className="mx-auto w-full max-w-[1200px] px-4 py-6 pb-20 md:px-8">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <Button
            onClick={() => nav(-1)}
            className="rounded-2xl border-pink-200 text-pink-700 hover:border-pink-300 hover:bg-pink-50"
            icon={<ArrowLeft size={16} />}
          >
            Quay lại
          </Button>

          <div className="flex items-center gap-2 rounded-2xl bg-white px-4 py-2 shadow-sm border border-pink-100">
            <ShoppingBag size={16} className="text-pink-600" />
            <span className="text-sm font-semibold text-gray-700">
              {isBuyNow ? "Mua ngay" : "Thanh toán"}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* LEFT: Products */}
          <div className="space-y-4 lg:col-span-7">
            {/* Products Card */}
            <div className="overflow-hidden rounded-3xl border border-pink-100 bg-white shadow-lg shadow-pink-100/50">
              <div className="bg-gradient-to-r from-pink-50 to-purple-50 p-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-pink-500 to-purple-600">
                      <ShoppingBag size={20} className="text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">Sản phẩm</h3>
                      <p className="text-xs text-gray-600">{cart.length} món trong giỏ</p>
                    </div>
                  </div>
                  <Badge count={cart.length} showZero color="#ec4899" />
                </div>
              </div>

              <div className="p-5">
                {cart.length === 0 ? (
                  <Empty description="Chưa có sản phẩm" />
                ) : (
                  <div className="space-y-3">
                    {cart.map((it) => (
                      <ProductItemCard
                        key={it.id}
                        item={it}
                        onChangeQty={(qty) => changeQty(it.id, qty)}
                        onDelete={() => deleteItem(it.id)}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* RIGHT: Info & Summary */}
          <div className="space-y-4 lg:col-span-5">
            {/* Customer Info Card */}
            <div className="overflow-hidden rounded-3xl border border-pink-100 bg-white shadow-lg shadow-pink-100/50">
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600">
                    <MapPin size={20} className="text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">Thông tin nhận hàng</h3>
                    <p className="text-xs text-gray-600">Vui lòng điền đầy đủ</p>
                  </div>
                </div>
              </div>

              <div className="p-5">
                <Form form={form} layout="vertical" initialValues={{ paymentMethod: "COD" }}>
                  <Form.Item
                    label={<span className="font-semibold text-gray-700">Họ tên</span>}
                    name="fullName"
                    rules={[{ required: true, message: "Vui lòng nhập họ tên" }]}
                  >
                    <Input
                      placeholder="VD: Nguyễn Văn A"
                      className="rounded-xl"
                      size="large"
                    />
                  </Form.Item>

                  <Form.Item
                    label={<span className="font-semibold text-gray-700">Số điện thoại</span>}
                    name="phone"
                    rules={[
                      { required: true, message: "Vui lòng nhập số điện thoại" },
                      { pattern: /^[0-9+ ]{8,15}$/, message: "Số điện thoại không hợp lệ" },
                    ]}
                  >
                    <Input
                      placeholder="VD: 0901234567"
                      className="rounded-xl"
                      size="large"
                    />
                  </Form.Item>

                  <Form.Item
                    label={<span className="font-semibold text-gray-700">Email (tùy chọn)</span>}
                    name="email"
                    rules={[{ type: "email", message: "Email không hợp lệ" }]}
                  >
                    <Input
                      placeholder="VD: email@example.com"
                      className="rounded-xl"
                      size="large"
                    />
                  </Form.Item>

                  <Form.Item
                    label={<span className="font-semibold text-gray-700">Địa chỉ giao hàng</span>}
                    name="address"
                    rules={[{ required: true, message: "Vui lòng nhập địa chỉ" }]}
                  >
                    <Input.TextArea
                      rows={3}
                      placeholder="Số nhà, đường, phường/xã, quận/huyện, tỉnh/thành..."
                      className="rounded-xl"
                    />
                  </Form.Item>

                  <Form.Item
                    label={<span className="font-semibold text-gray-700">Ghi chú</span>}
                    name="note"
                  >
                    <Input.TextArea
                      rows={2}
                      placeholder="Ghi chú cho shop (tùy chọn)..."
                      className="rounded-xl"
                    />
                  </Form.Item>

                  <Form.Item
                    label={
                      <div className="flex items-center gap-2">
                        <CreditCard size={16} className="text-gray-600" />
                        <span className="font-semibold text-gray-700">Thanh toán</span>
                      </div>
                    }
                    name="paymentMethod"
                  >
                    <Radio.Group className="w-full">
                      <Space direction="vertical" className="w-full gap-2">
                        <Radio value="COD" className="w-full">
                          <div className="rounded-xl border border-gray-200 p-3 transition-all hover:border-pink-300 hover:bg-pink-50/50">
                            <div className="font-semibold text-gray-900">
                              💵 COD - Thanh toán khi nhận hàng
                            </div>
                            <div className="text-xs text-gray-500">
                              Thanh toán tiền mặt khi ship đến
                            </div>
                          </div>
                        </Radio>
                        <Radio value="BANK" className="w-full">
                          <div className="rounded-xl border border-gray-200 p-3 transition-all hover:border-pink-300 hover:bg-pink-50/50">
                            <div className="font-semibold text-gray-900">
                              🏦 Chuyển khoản ngân hàng
                            </div>
                            <div className="text-xs text-gray-500">
                              Chuyển khoản trước khi ship
                            </div>
                          </div>
                        </Radio>
                        <Radio value="WALLET" className="w-full">
                          <div className="rounded-xl border border-gray-200 p-3 transition-all hover:border-pink-300 hover:bg-pink-50/50">
                            <div className="font-semibold text-gray-900">💳 Ví điện tử</div>
                            <div className="text-xs text-gray-500">
                              Momo, ZaloPay, VNPay...
                            </div>
                          </div>
                        </Radio>
                      </Space>
                    </Radio.Group>
                  </Form.Item>
                </Form>
              </div>
            </div>

            {/* Voucher Card */}
            <div
              onClick={() => setVoucherModalOpen(true)}
              className="group relative overflow-hidden rounded-3xl border-2 border-dashed border-orange-200 bg-gradient-to-br from-orange-50 to-pink-50 p-5 cursor-pointer transition-all hover:border-orange-300 hover:shadow-lg hover:shadow-orange-100/50"
            >
              <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-gradient-to-br from-orange-300/30 to-pink-300/30 blur-2xl" />

              <div className="relative flex items-center gap-4">
                <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-400 to-pink-500 shadow-lg">
                  <Ticket size={24} className="text-white" />
                </div>

                <div className="flex-1 min-w-0">
                  {selectedVoucherObj ? (
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-sm font-bold text-orange-600">
                          {selectedVoucherObj.code}
                        </span>
                        <CheckCircle size={16} className="text-green-500" />
                      </div>
                      <div className="text-sm font-semibold text-gray-900">
                        {selectedVoucherObj.discountText}
                      </div>
                      <div className="text-xs text-gray-600">{selectedVoucherObj.hint}</div>
                    </div>
                  ) : (
                    <div>
                      <div className="text-base font-bold text-gray-900">Chọn voucher</div>
                      <div className="text-xs text-gray-600">
                        Tiết kiệm thêm cho đơn hàng
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex-shrink-0">
                  <Sparkles size={20} className="text-orange-500 group-hover:animate-pulse" />
                </div>
              </div>
            </div>

            {/* Summary Card */}
            <div className="overflow-hidden rounded-3xl border border-pink-100 bg-white shadow-xl shadow-pink-100/50">
              <div className="bg-gradient-to-r from-pink-50 to-purple-50 p-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-pink-500 to-purple-600">
                    <TrendingUp size={20} className="text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">Tổng thanh toán</h3>
                    <p className="text-xs text-gray-600">Chi tiết đơn hàng</p>
                  </div>
                </div>
              </div>

              <div className="p-5 space-y-3">
                <div className="flex items-center justify-between rounded-xl bg-gray-50 p-3">
                  <span className="text-sm text-gray-600">Tạm tính</span>
                  <span className="font-semibold text-gray-900">{money(subtotal)}</span>
                </div>

                <div className="flex items-center justify-between rounded-xl bg-gray-50 p-3">
                  <span className="text-sm text-gray-600">Phí vận chuyển</span>
                  <span className="font-semibold">
                    {shippingFee === 0 ? (
                      <span className="text-green-600 flex items-center gap-1">
                        <Gift size={14} />
                        Miễn phí
                      </span>
                    ) : (
                      <span className="text-gray-900">{money(shippingFee)}</span>
                    )}
                  </span>
                </div>

                {voucherDiscount > 0 && (
                  <div className="flex items-center justify-between rounded-xl bg-orange-50 p-3">
                    <span className="text-sm text-orange-600 flex items-center gap-1">
                      <Ticket size={14} />
                      Giảm giá
                    </span>
                    <span className="font-semibold text-orange-600">
                      -{money(voucherDiscount)}
                    </span>
                  </div>
                )}

                {subtotal >= 300000 && shippingFee === 0 && !selectedVoucher && (
                  <div className="rounded-xl bg-green-50 p-3 text-xs text-green-700 flex items-center gap-2">
                    <Gift size={14} />
                    🎉 Đơn hàng trên 300K được miễn phí ship!
                  </div>
                )}

                <Divider className="!my-3" />

                <div className="flex items-center justify-between rounded-2xl bg-gradient-to-r from-pink-50 to-purple-50 p-4">
                  <span className="text-base font-bold text-gray-900">Tổng cộng</span>
                  <div className="text-right">
                    <div className="bg-gradient-to-r from-pink-600 via-purple-600 to-pink-600 bg-clip-text text-2xl font-extrabold text-transparent">
                      {money(total)}
                    </div>
                    <div className="text-xs text-gray-500">Đã bao gồm VAT</div>
                  </div>
                </div>

                <button
                  disabled={!cart.length || submitting}
                  onClick={submitOrder}
                  className="group relative mt-4 w-full overflow-hidden rounded-2xl bg-gradient-to-r from-pink-600 via-purple-600 to-pink-600 bg-size-200 px-6 py-4 font-bold text-white shadow-lg shadow-pink-500/50 transition-all hover:bg-right hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
                >
                  <div className="flex items-center justify-center gap-2">
                    {submitting ? (
                      <>
                        <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        <span>Đang xử lý...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle size={20} />
                        <span>Đặt hàng ngay</span>
                      </>
                    )}
                  </div>
                  <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-500 group-hover:translate-x-full" />
                </button>

                <div className="mt-3 text-center text-xs text-gray-500">
                  Bằng việc đặt hàng, bạn đồng ý với{" "}
                  <span className="cursor-pointer text-pink-600 hover:underline">
                    Điều khoản sử dụng
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Voucher Modal */}
      <VoucherModal
        open={voucherModalOpen}
        onClose={() => setVoucherModalOpen(false)}
        vouchers={vouchers}
        selectedCode={selectedVoucher}
        onSelect={setSelectedVoucher}
        subtotal={subtotal}
      />

      <style>{`
        .bg-size-200 {
          background-size: 200%;
        }
      `}</style>
    </div>
  );
}