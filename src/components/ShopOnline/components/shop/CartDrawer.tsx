import React, { useEffect, useMemo, useState } from "react";
import { Drawer, Button, InputNumber, Empty, Divider, message } from "antd";
import { Minus, Plus, Trash2, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  getCart,
  subscribeCart,
  setQty,
  incQty,
  decQty,
  removeItem,
  clearCart,
} from "../../../../utils/cart";

function money(n: number) {
  return Number(n || 0).toLocaleString("vi-VN");
}

type Props = {
  open: boolean;
  onClose: () => void;
  title?: string;
};

export default function CartDrawer({ open, onClose, title = "Giỏ hàng" }: Props) {
  const nav = useNavigate();
  const [items, setItems] = useState(() => getCart());

  useEffect(() => {
    setItems(getCart());
    const unsub = subscribeCart(() => setItems(getCart()));
    return () => {
      if (typeof unsub === "function") unsub();
    };
  }, []);

  const totalQty = useMemo(
    () => items.reduce((s: number, it: any) => s + Number(it.qty || 0), 0),
    [items]
  );

  const totalMoney = useMemo(
    () => items.reduce((s: number, it: any) => s + Number(it.price || 0) * Number(it.qty || 0), 0),
    [items]
  );

  return (
    <Drawer
      open={open}
      onClose={onClose}
      width={420}
      title={
        <div className="flex items-center justify-between gap-2">
          <div className="font-extrabold">{title}</div>
          <Button type="text" onClick={onClose} icon={<X size={18} />} />
        </div>
      }
      destroyOnClose
    >
      {items.length === 0 ? (
        <Empty description="Chưa có sản phẩm trong giỏ" />
      ) : (
        <div className="space-y-3">
          {items.map((it: any) => (
            <div
              key={it.id}
              className="flex gap-3 rounded-2xl border border-pink-100 p-3 bg-white"
            >
              <img
                src={it.image || "/placeholder.png"}
                alt={it.name}
                className="w-16 h-16 rounded-xl object-cover border border-gray-200"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = "/placeholder.png";
                }}
              />

              <div className="flex-1 min-w-0">
                <div className="font-semibold text-gray-900 line-clamp-2">
                  {it.name}
                </div>

                {!!it.sku && (
                  <div className="text-xs text-gray-500 mt-0.5">SKU: {it.sku}</div>
                )}

                {!!it.variantName && (
                  <div className="text-xs text-gray-500 mt-0.5">
                    Phân loại: {it.variantName}
                  </div>
                )}

                {!!it.attrsText && (
                  <div className="text-xs text-gray-500 mt-0.5">{it.attrsText}</div>
                )}

                <div className="mt-1 flex items-center justify-between">
                  <div className="text-pink-600 font-extrabold">
                    {money(it.price)}đ
                  </div>

                  <Button
                    danger
                    type="text"
                    icon={<Trash2 size={16} />}
                    onClick={() => {
                      removeItem(it.id);
                      message.success("Đã xoá khỏi giỏ");
                    }}
                  />
                </div>

                <div className="mt-2 flex items-center gap-2">
                  <Button
                    className="rounded-xl"
                    onClick={() => decQty(it.id)}
                    icon={<Minus size={16} />}
                  />
                  <InputNumber
                    min={1}
                    value={it.qty}
                    className="!w-[90px]"
                    onChange={(v) => {
                      const n = Number(v || 1);
                      setQty(it.id, n);
                    }}
                  />
                  <Button
                    className="rounded-xl"
                    onClick={() => incQty(it.id)}
                    icon={<Plus size={16} />}
                  />
                  <div className="ml-auto font-bold text-gray-900">
                    {money(Number(it.price || 0) * Number(it.qty || 0))}đ
                  </div>
                </div>
              </div>
            </div>
          ))}

          <Divider className="!my-3" />

          <div className="rounded-2xl bg-pink-50 border border-pink-100 p-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Số lượng</span>
              <span className="font-bold">{totalQty}</span>
            </div>
            <div className="flex items-center justify-between text-sm mt-1">
              <span className="text-gray-600">Tạm tính</span>
              <span className="font-extrabold text-pink-700">
                {money(totalMoney)}đ
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 mt-3">
              <Button
                danger
                className="rounded-2xl"
                onClick={() => {
                  clearCart();
                  message.success("Đã xoá giỏ hàng");
                }}
              >
                Xoá giỏ
              </Button>

              <Button
                type="primary"
                className="rounded-2xl !bg-pink-600 !border-pink-600 hover:!bg-pink-700"
                onClick={() => {
                    nav("/checkout");
                  // tuỳ bạn: mở trang checkout
                  message.info("Đi tới thanh toán (bạn nối route/logic ở đây)");
                }}
              >
                Thanh toán
              </Button>
            </div>
          </div>
        </div>
      )}
    </Drawer>
  );
}
