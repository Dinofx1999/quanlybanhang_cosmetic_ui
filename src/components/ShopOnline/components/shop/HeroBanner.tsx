// src/components/shop/HeroBanner.tsx
import React from "react";
import { Button } from "antd";
import { Sparkles, ArrowRight } from "lucide-react";

export default function HeroBanner() {
  return (
    <div className="w-full px-6 lg:px-10 mt-5">
      <div className="relative overflow-hidden rounded-[28px] border border-pink-100 bg-white shadow-[0_10px_40px_rgba(236,72,153,0.12)]">
        <div className="absolute inset-0 bg-gradient-to-r from-pink-50 via-white to-pink-50" />
        <div className="absolute -top-28 -right-28 h-72 w-72 rounded-full bg-pink-200/40 blur-3xl" />
        <div className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-pink-100/60 blur-3xl" />

        <div className="relative grid grid-cols-1 lg:grid-cols-2 gap-6 p-6 lg:p-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-pink-50 border border-pink-100 text-pink-700 text-sm font-semibold">
              <Sparkles size={16} />
              Hồng xinh – deal xịn mỗi ngày
            </div>

            <h1 className="mt-4 text-3xl lg:text-4xl font-extrabold tracking-tight text-gray-900">
              Mỹ phẩm chính hãng
              <span className="text-pink-600"> – Giá tốt – Giao nhanh</span>
            </h1>

            <p className="mt-3 text-gray-600 text-base leading-relaxed">
              Skincare, makeup, bodycare… chọn nhanh theo danh mục, áp voucher 1 chạm, flashsale theo giờ.
            </p>

            <div className="mt-5 flex flex-wrap gap-3">
              <Button
                size="large"
                type="primary"
                className="rounded-2xl !bg-pink-500 hover:!bg-pink-600 !border-pink-500 shadow-sm"
              >
                Mua ngay <ArrowRight size={18} className="ml-1" />
              </Button>

              <Button size="large" className="rounded-2xl border-pink-200 text-pink-600 hover:!border-pink-300 hover:!text-pink-700">
                Xem bestseller
              </Button>
            </div>

            <div className="mt-6 grid grid-cols-3 gap-3">
              <div className="rounded-2xl border border-pink-100 bg-white p-3">
                <div className="text-sm text-gray-500">Freeship</div>
                <div className="font-extrabold text-gray-900">Từ 299K</div>
              </div>
              <div className="rounded-2xl border border-pink-100 bg-white p-3">
                <div className="text-sm text-gray-500">Voucher</div>
                <div className="font-extrabold text-gray-900">Đến 20%</div>
              </div>
              <div className="rounded-2xl border border-pink-100 bg-white p-3">
                <div className="text-sm text-gray-500">Đổi trả</div>
                <div className="font-extrabold text-gray-900">7 ngày</div>
              </div>
            </div>
          </div>

          {/* ảnh minh hoạ */}
          <div className="lg:flex hidden items-center justify-center">
            <div className="relative w-full max-w-md">
              <div className="absolute -inset-2 rounded-[28px] bg-pink-200/40 blur-2xl" />
              <div className="relative rounded-[28px] overflow-hidden border border-pink-100 shadow-md">
                <img
                  alt="banner"
                  className="w-full h-[320px] object-cover"
                  src="https://images.unsplash.com/photo-1612810436541-336d7f7f0b9e?auto=format&fit=crop&w=1200&q=75"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
