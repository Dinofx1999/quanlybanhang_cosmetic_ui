import React from "react";
import { Facebook, Instagram, PhoneCall, MapPin, Mail, BadgeCheck, Truck, RefreshCcw, Shield } from "lucide-react";

export default function ShopFooter() {
  return (
    <div className="w-full mt-10 bg-white border-t border-pink-100">
      {/* top footer */}
      <div className="w-full px-5 md:px-8 lg:px-10 py-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* brand */}
          <div>
            <div className="text-xl font-extrabold text-gray-900">
              Bảo Ân <span className="text-pink-600">Cosmetics</span>
            </div>
            <div className="mt-2 text-sm text-gray-600 leading-relaxed">
              Mỹ phẩm chính hãng – giá tốt – giao nhanh. Tư vấn nhiệt tình, đổi trả rõ ràng.
            </div>

            <div className="mt-4 flex gap-3">
              <a className="h-10 w-10 rounded-2xl border border-pink-200 flex items-center justify-center hover:bg-pink-50" href="#">
                <Facebook size={18} className="text-pink-600" />
              </a>
              <a className="h-10 w-10 rounded-2xl border border-pink-200 flex items-center justify-center hover:bg-pink-50" href="#">
                <Instagram size={18} className="text-pink-600" />
              </a>
            </div>
          </div>

          {/* info */}
          <div>
            <div className="font-extrabold text-gray-900">Thông tin cửa hàng</div>
            <div className="mt-3 space-y-3 text-sm text-gray-700">
              <div className="flex items-center gap-2">
                <MapPin size={16} className="text-pink-600" />
                156 Hùng Vương, Tam Kỳ, Quảng Nam
              </div>
              <div className="flex items-center gap-2">
                <PhoneCall size={16} className="text-pink-600" />
                0924 8888 94
              </div>
              <div className="flex items-center gap-2">
                <Mail size={16} className="text-pink-600" />
                support@bacosmetics.vn
              </div>
            </div>
          </div>

          {/* policies */}
          <div>
            <div className="font-extrabold text-gray-900">Chính sách</div>
            <ul className="mt-3 space-y-2 text-sm text-gray-700">
              <li className="flex items-center gap-2">
                <Shield size={16} className="text-pink-600" /> Cam kết hàng chính hãng
              </li>
              <li className="flex items-center gap-2">
                <RefreshCcw size={16} className="text-pink-600" /> Đổi trả 7 ngày (tuỳ điều kiện)
              </li>
              <li className="flex items-center gap-2">
                <Truck size={16} className="text-pink-600" /> Giao hàng 1–3 ngày
              </li>
              <li className="flex items-center gap-2">
                <BadgeCheck size={16} className="text-pink-600" /> Bảo mật thông tin khách hàng
              </li>
            </ul>
          </div>

          {/* support */}
          <div>
            <div className="font-extrabold text-gray-900">Hỗ trợ</div>
            <div className="mt-3 space-y-3 text-sm text-gray-700">
              <div className="rounded-2xl border border-pink-100 bg-pink-50/40 p-4">
                <div className="font-bold text-gray-900">Hotline tư vấn</div>
                <div className="mt-1 text-pink-600 font-extrabold text-lg">0924 8888 94</div>
                <div className="mt-1 text-xs text-gray-600">08:00 - 22:00 (T2 - CN)</div>
              </div>

              <div className="rounded-2xl border border-pink-100 bg-white p-4">
                <div className="text-xs text-gray-500">Email hỗ trợ</div>
                <div className="font-bold text-gray-900">support@bacosmetics.vn</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* bottom bar */}
      <div className="w-full border-t border-pink-100 py-4 px-5 md:px-8 lg:px-10 text-xs text-gray-500 flex flex-col md:flex-row gap-2 md:items-center md:justify-between">
        <div>© {new Date().getFullYear()} BA Cosmetics. All rights reserved.</div>
        {/* <div className="text-gray-500">Thiết kế UI: Trắng/Hồng • Style Shopee-like</div> */}
      </div>
    </div>
  );
}
