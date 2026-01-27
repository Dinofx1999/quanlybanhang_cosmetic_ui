import React, { useMemo, useState } from "react";
import { Button, Input, message, Tag } from "antd";
import { Copy, TicketPercent, CheckCircle2 } from "lucide-react";

type Voucher = {
  code: string;
  qty: number;
  discountText: string;
  hint?: string;
  type?: "PERCENT" | "AMOUNT" | "SHIP";
};

type Props = {
  onApply?: (code: string) => void;
};

export default function VoucherBar({ onApply }: Props) {
  const vouchers: Voucher[] = useMemo(
    () => [
      { code: "BA10", qty: 128, discountText: "Giảm 10%", hint: "Đơn từ 199K", type: "PERCENT" },
      { code: "BA20", qty: 64, discountText: "Giảm 20%", hint: "Đơn từ 499K", type: "PERCENT" },
      { code: "BA30K", qty: 256, discountText: "Giảm 30K", hint: "Đơn từ 149K", type: "AMOUNT" },
      { code: "FREESHIP", qty: 512, discountText: "Freeship toàn quốc", hint: "Đơn từ 99K", type: "SHIP" },
    ],
    []
  );

  const [code, setCode] = useState("");

  const apply = (c?: string) => {
    const v = (c ?? code).trim();
    if (!v) return message.warning("Nhập hoặc chọn voucher trước nhé.");
    message.success(`Đã áp dụng voucher: ${v}`);
    onApply?.(v);
    setCode(v);
  };

  const copy = async (c: string) => {
    try {
      await navigator.clipboard.writeText(c);
      message.success(`Đã copy: ${c}`);
      setCode(c);
    } catch {
      setCode(c);
      message.info("Không copy được tự động, bạn hãy copy thủ công.");
    }
  };

  const badgeByType = (t?: Voucher["type"]) => {
    if (t === "SHIP") return <Tag color="magenta" className="!m-0 rounded-lg">FREESHIP</Tag>;
    if (t === "AMOUNT") return <Tag color="red" className="!m-0 rounded-lg">GIẢM TIỀN</Tag>;
    return <Tag color="pink" className="!m-0 rounded-lg">GIẢM %</Tag>;
  };

  return (
    <div className="w-full">
      <div className="w-full bg-white border border-pink-100 rounded-[22px] shadow-sm overflow-hidden">
        {/* Header */}
        <div className="px-4 md:px-5 py-3 bg-gradient-to-r from-pink-500 to-pink-400 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-2xl bg-white/15 flex items-center justify-center">
              <TicketPercent size={18} />
            </div>
            <div>
              <div className="font-extrabold leading-tight">Voucher</div>
              <div className="text-xs opacity-90">Chọn voucher để giảm giá nhanh</div>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-2 text-xs">
            <CheckCircle2 size={16} />
            <span>Copy mã → dán vào ô → áp dụng</span>
          </div>
        </div>

        {/* Input apply */}
        <div className="p-4 md:p-5 border-b border-pink-100">
          <div className="flex flex-col md:flex-row gap-2">
            <Input
              size="large"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Nhập mã voucher (VD: BA10)"
              className="rounded-2xl"
            />
            <Button
              size="large"
              type="primary"
              onClick={() => apply()}
              className="rounded-2xl !bg-pink-500 hover:!bg-pink-600 !border-pink-500"
            >
              Áp dụng
            </Button>
          </div>
        </div>

        {/* Voucher list – SCROLL NGANG */}
        <div className="p-4 md:p-5">
          <div
            className="
              flex gap-3 overflow-x-auto pb-2
              scroll-smooth
              snap-x snap-mandatory
              [-ms-overflow-style:none]
              [scrollbar-width:none]
            "
          >
            {/* Ẩn scrollbar Chrome */}
            <style>{`
              div::-webkit-scrollbar {
                display: none;
              }
            `}</style>

            {vouchers.map((v) => (
              <div
                key={v.code}
                className="
                  snap-start
                  min-w-[260px] max-w-[260px]
                  rounded-[18px]
                  border border-pink-100
                  bg-pink-50/40
                  overflow-hidden
                  hover:shadow-md transition
                "
              >
                <div className="p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-xs text-gray-500">Code</div>
                      <div className="text-lg font-extrabold text-gray-900 tracking-wide">
                        {v.code}
                      </div>
                    </div>
                    {badgeByType(v.type)}
                  </div>

                  <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
                    <div className="rounded-xl bg-white border border-pink-100 p-2">
                      <div className="text-gray-500">Số lượng</div>
                      <div className="font-extrabold text-gray-900">{v.qty}</div>
                    </div>
                    <div className="rounded-xl bg-white border border-pink-100 p-2 col-span-2">
                      <div className="text-gray-500">Được giảm</div>
                      <div className="font-extrabold text-pink-600">
                        {v.discountText}
                      </div>
                    </div>
                  </div>

                  {v.hint && (
                    <div className="mt-2 text-xs text-gray-600">
                      Điều kiện: {v.hint}
                    </div>
                  )}

                  <div className="mt-3 flex gap-2">
                    <Button
                      onClick={() => copy(v.code)}
                      className="flex-1 rounded-2xl border-pink-200 text-pink-700 hover:!border-pink-300"
                    >
                      <Copy size={16} className="mr-1" />
                      Copy
                    </Button>
                    <Button
                      type="primary"
                      onClick={() => apply(v.code)}
                      className="flex-1 rounded-2xl !bg-pink-500 hover:!bg-pink-600 !border-pink-500"
                    >
                      Dùng ngay
                    </Button>
                  </div>
                </div>

                <div className="px-3 py-2 bg-white border-t border-pink-100 text-[11px] text-gray-500">
                  Tip: voucher hết hạn/số lượng sẽ tự ẩn khi nối API thật.
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
