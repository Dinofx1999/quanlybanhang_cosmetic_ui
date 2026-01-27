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
  Spin,
} from "antd";
import { ArrowLeft, Trash2, CheckCircle } from "lucide-react";

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

function money(n: number) {
  return Number(n || 0).toLocaleString("vi-VN") + "đ";
}

type CheckoutState =
  | {
      mode?: "buyNow" | "cart";
      buyNowItem?: CartItem;
    }
  | undefined;

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
    if (subtotal >= 300000) return 0;
    return cart.length ? 20000 : 0;
  }, [subtotal, cart.length]);

  const total = useMemo(() => subtotal + shippingFee, [subtotal, shippingFee]);

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

  // ✅ Submit order to database
  const submitOrder = async () => {
    try {
      if (!cart.length) {
        return message.warning("Giỏ hàng đang trống.");
      }

      setSubmitting(true);

      // Validate form
      const values = await form.validateFields();

      // ✅ Build payload for ONLINE order
      const payload = {
        channel: "ONLINE",
        status: "PENDING", // ONLINE always starts as PENDING
        
        // Customer info (for delivery)
        customer: {
          name: String(values.fullName || "").trim(),
          phone: String(values.phone || "").trim(),
          email: String(values.email || "").trim(),
        },

        // Delivery info
        delivery: {
          method: "SHIP",
          address: String(values.address || "").trim(),
          receiverName: String(values.fullName || "").trim(),
          receiverPhone: String(values.phone || "").trim(),
          note: String(values.note || "").trim(),
        },

        // Payment method
        payment: {
          method: values.paymentMethod || "COD",
          amount: 0, // COD = 0, will be set when confirm
        },

        // ✅ Items - send variantId as productId (server auto-detects)
        items: cart.map((it) => ({
          productId: it.variantId || it.id, // ✅ Server expects variantId as productId
          qty: Number(it.qty || 1),
        })),

        // Fees (optional - server can recalculate)
        extraFee: shippingFee,
        discount: 0,
      };

      console.log("Submitting order payload:", payload);

      // ✅ Call API
      const res = await api.post("/order-public/orders", payload);

      if (!res.data?.ok) {
        throw new Error(res.data?.message || "ORDER_FAILED");
      }

      const order = res.data.order;

      message.success({
        content: (
          <div>
            <CheckCircle className="inline mr-2" size={16} />
            Đặt hàng thành công! Mã đơn: <strong>{order.code}</strong>
          </div>
        ),
        duration: 5,
      });

      // ✅ Clear cart only if not buyNow mode
      if (!isBuyNow) {
        clearCart();
      }

      // ✅ Navigate to order success page or back to shop
      setTimeout(() => {
        nav("/shop", { replace: true });
      }, 1500);

    } catch (e: any) {
      console.error("Submit order error:", e);
      
      if (e?.errorFields) {
        // Antd form validation error
        return;
      }

      const errorMsg = 
        e?.response?.data?.message || 
        e?.message || 
        "Đặt hàng thất bại. Vui lòng thử lại.";

      message.error(errorMsg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-pink-50/60 to-white">
      <ShopHeader
        onSearch={(v: string) => {}}
        onOpenVoucher={() => window.scrollTo({ top: 450, behavior: "smooth" })}
      />
      
      <div className="mx-auto w-full max-w-[1200px] px-4 md:px-8 py-5 pb-20">
        {/* Top bar */}
        <div className="flex items-center justify-between gap-3">
          <Button
            onClick={() => nav(-1)}
            className="rounded-2xl border-pink-200 text-pink-700"
          >
            <ArrowLeft size={16} className="mr-1" /> Quay lại
          </Button>

          <div className="text-sm text-gray-500">
            {isBuyNow ? "Thanh toán • Mua ngay" : "Thanh toán • Giỏ hàng"}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* LEFT: items */}
          <div className="lg:col-span-7">
            <Card
              className="rounded-[22px] border-pink-100"
              bodyStyle={{ padding: 16 }}
            >
              <div className="flex items-center justify-between">
                <Title level={4} style={{ margin: 0 }}>
                  Sản phẩm
                </Title>
                <Text type="secondary">{cart.length} món</Text>
              </div>

              <Divider className="!my-3" />

              {cart.length === 0 ? (
                <Empty description="Chưa có sản phẩm" />
              ) : (
                <div className="space-y-3">
                  {cart.map((it) => (
                    <div
                      key={it.id}
                      className="flex gap-3 rounded-2xl border border-pink-100 bg-white p-3"
                    >
                      <img
                        src={it.image || "/placeholder.png"}
                        alt={it.name}
                        className="w-16 h-16 rounded-2xl object-cover border border-pink-100"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).src = "/placeholder.png";
                        }}
                      />

                      <div className="flex-1 min-w-0">
                        <div className="font-extrabold text-gray-900 line-clamp-2">
                          {it.name}
                        </div>

                        {!!it.attrsText && (
                          <div className="text-xs text-gray-500 mt-0.5 line-clamp-1">
                            {it.attrsText}
                          </div>
                        )}

                        {!!it.sku && (
                          <div className="text-[11px] text-gray-400 mt-0.5">
                            SKU: <span className="font-mono">{it.sku}</span>
                          </div>
                        )}

                        <div className="mt-2 flex items-center justify-between gap-2">
                          <div className="text-pink-600 font-extrabold">
                            {money(it.price)}
                          </div>

                          <div className="flex items-center gap-2">
                            <InputNumber
                              min={1}
                              value={it.qty}
                              onChange={(v) => changeQty(it.id, Number(v || 1))}
                              className="w-[96px]"
                            />
                            <Button
                              danger
                              className="rounded-xl"
                              icon={<Trash2 size={16} />}
                              onClick={() => deleteItem(it.id)}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>

          {/* RIGHT: customer + totals */}
          <div className="lg:col-span-5 space-y-4">
            <Card className="rounded-[22px] border-pink-100" bodyStyle={{ padding: 16 }}>
              <Title level={4} style={{ margin: 0 }}>
                Thông tin nhận hàng
              </Title>

              <Divider className="!my-3" />

              <Form
                form={form}
                layout="vertical"
                initialValues={{ paymentMethod: "COD" }}
              >
                <Form.Item
                  label="Họ tên"
                  name="fullName"
                  rules={[{ required: true, message: "Nhập họ tên" }]}
                >
                  <Input placeholder="VD: Nguyễn Văn A" className="rounded-2xl" />
                </Form.Item>

                <Form.Item
                  label="Số điện thoại"
                  name="phone"
                  rules={[
                    { required: true, message: "Nhập số điện thoại" },
                    { pattern: /^[0-9+ ]{8,15}$/, message: "Số điện thoại không hợp lệ" },
                  ]}
                >
                  <Input placeholder="VD: 0901234567" className="rounded-2xl" />
                </Form.Item>

                <Form.Item
                  label="Email (tùy chọn)"
                  name="email"
                  rules={[
                    { type: "email", message: "Email không hợp lệ" },
                  ]}
                >
                  <Input placeholder="VD: email@example.com" className="rounded-2xl" />
                </Form.Item>

                <Form.Item
                  label="Địa chỉ"
                  name="address"
                  rules={[{ required: true, message: "Nhập địa chỉ giao hàng" }]}
                >
                  <Input.TextArea 
                    rows={3} 
                    placeholder="Số nhà, đường, phường/xã, quận/huyện, tỉnh/thành..." 
                    className="rounded-2xl" 
                  />
                </Form.Item>

                <Form.Item label="Ghi chú" name="note">
                  <Input.TextArea 
                    rows={2} 
                    placeholder="Ghi chú cho shop (tùy chọn)..." 
                    className="rounded-2xl" 
                  />
                </Form.Item>

                <Form.Item label="Phương thức thanh toán" name="paymentMethod">
                  <Radio.Group className="w-full">
                    <Space direction="vertical" className="w-full">
                      <Radio value="COD">
                        <div>
                          <div className="font-semibold">COD - Thanh toán khi nhận hàng</div>
                          <div className="text-xs text-gray-500">Thanh toán tiền mặt khi ship đến</div>
                        </div>
                      </Radio>
                      <Radio value="BANK">
                        <div>
                          <div className="font-semibold">Chuyển khoản ngân hàng</div>
                          <div className="text-xs text-gray-500">Chuyển khoản trước khi ship</div>
                        </div>
                      </Radio>
                      <Radio value="WALLET">
                        <div>
                          <div className="font-semibold">Ví điện tử</div>
                          <div className="text-xs text-gray-500">Momo, ZaloPay, VNPay...</div>
                        </div>
                      </Radio>
                    </Space>
                  </Radio.Group>
                </Form.Item>
              </Form>
            </Card>

            <Card className="rounded-[22px] border-pink-100" bodyStyle={{ padding: 16 }}>
              <Title level={4} style={{ margin: 0 }}>
                Tổng thanh toán
              </Title>

              <Divider className="!my-3" />

              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Tạm tính</span>
                  <span className="font-semibold">{money(subtotal)}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Phí vận chuyển</span>
                  <span className="font-semibold">
                    {shippingFee === 0 ? (
                      <span className="text-green-600">Miễn phí</span>
                    ) : (
                      money(shippingFee)
                    )}
                  </span>
                </div>

                {subtotal >= 300000 && (
                  <div className="text-xs text-green-600">
                    🎉 Đơn hàng trên 300k được miễn phí ship!
                  </div>
                )}

                <Divider className="!my-2" />

                <div className="flex items-center justify-between">
                  <span className="text-gray-900 font-extrabold">Tổng cộng</span>
                  <span className="text-pink-600 font-extrabold text-lg">{money(total)}</span>
                </div>
              </div>

              <Button
                disabled={!cart.length || submitting}
                type="primary"
                onClick={submitOrder}
                loading={submitting}
                className="mt-4 w-full rounded-2xl !bg-pink-600 hover:!bg-pink-700 !border-pink-600 h-12 font-extrabold"
              >
                {submitting ? "Đang xử lý..." : "Đặt hàng"}
              </Button>

              {!cart.length && (
                <div className="mt-2 text-xs text-gray-500 text-center">
                  Chọn sản phẩm để thanh toán.
                </div>
              )}

              <div className="mt-3 text-xs text-gray-500 text-center">
                Bằng việc đặt hàng, bạn đồng ý với{" "}
                <span className="text-pink-600 cursor-pointer hover:underline">
                  Điều khoản sử dụng
                </span>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}