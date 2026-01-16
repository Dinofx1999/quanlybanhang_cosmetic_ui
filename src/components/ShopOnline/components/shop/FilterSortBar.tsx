// src/components/shop/FilterSortBar.tsx
import React, { useMemo } from "react";
import { Button, Drawer, Select, Slider, Switch, Rate } from "antd";
import { SlidersHorizontal, X } from "lucide-react";

export type SortKey = "relevance" | "best" | "price_asc" | "price_desc";

export type Filters = {
  priceMin: number;
  priceMax: number;
  minRating: number;
  freeship: boolean;
  flash: boolean;
  mall: boolean;
};

type Props = {
  sort: SortKey;
  onSortChange: (v: SortKey) => void;

  open: boolean;
  setOpen: (v: boolean) => void;

  filters: Filters;
  setFilters: (f: Filters) => void;

  maxPrice: number;
  onReset: () => void;
};

export default function FilterSortBar({
  sort,
  onSortChange,
  open,
  setOpen,
  filters,
  setFilters,
  maxPrice,
  onReset,
}: Props) {
  const chips = useMemo(() => {
    const arr: string[] = [];
    if (filters.freeship) arr.push("Freeship");
    if (filters.flash) arr.push("Flash");
    if (filters.mall) arr.push("Mall");
    if (filters.minRating > 0) arr.push(`⭐ >= ${filters.minRating}`);
    if (filters.priceMin > 0 || filters.priceMax < maxPrice)
      arr.push(`Giá ${filters.priceMin.toLocaleString("vi-VN")} - ${filters.priceMax.toLocaleString("vi-VN")}`);
    return arr;
  }, [filters, maxPrice]);

  return (
    <div className="w-full bg-white border border-pink-100 rounded-[22px] shadow-sm p-3 md:p-4">
      <div className="flex flex-col lg:flex-row lg:items-center gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="text-sm font-extrabold text-gray-900">Sắp xếp:</div>
          <Select
            value={sort}
            onChange={(v) => onSortChange(v)}
            className="min-w-[220px]"
            options={[
              { value: "relevance", label: "Liên quan" },
              { value: "best", label: "Bán chạy" },
              { value: "price_asc", label: "Giá: Thấp → Cao" },
              { value: "price_desc", label: "Giá: Cao → Thấp" },
            ]}
          />

          <Button
            onClick={() => setOpen(true)}
            className="rounded-2xl border-pink-200 text-pink-700 hover:!border-pink-300"
          >
            <SlidersHorizontal size={18} />
            <span className="ml-1">Bộ lọc</span>
          </Button>

          <Button onClick={onReset} className="rounded-2xl">
            Reset
          </Button>
        </div>

        <div className="flex-1" />

        <div className="flex flex-wrap gap-2">
          {chips.length ? (
            chips.map((c) => (
              <span key={c} className="px-3 py-1.5 rounded-full bg-pink-50 border border-pink-100 text-pink-700 text-xs font-semibold">
                {c}
              </span>
            ))
          ) : (
            <span className="text-xs text-gray-500">Chưa chọn bộ lọc</span>
          )}
        </div>
      </div>

      <Drawer
        title="Bộ lọc"
        open={open}
        onClose={() => setOpen(false)}
        width={380}
        closeIcon={<X size={18} />}
      >
        <div className="space-y-6">
          <div>
            <div className="font-bold text-gray-900 mb-2">Khoảng giá</div>
            <Slider
              range
              min={0}
              max={maxPrice}
              step={10000}
              value={[filters.priceMin, filters.priceMax]}
              onChange={(v) => {
                const [a, b] = v as number[];
                setFilters({ ...filters, priceMin: a, priceMax: b });
              }}
            />
            <div className="text-sm text-gray-600">
              {filters.priceMin.toLocaleString("vi-VN")}đ - {filters.priceMax.toLocaleString("vi-VN")}đ
            </div>
          </div>

          <div>
            <div className="font-bold text-gray-900 mb-2">Đánh giá tối thiểu</div>
            <Rate allowHalf value={filters.minRating} onChange={(v) => setFilters({ ...filters, minRating: v })} />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="font-bold text-gray-900">Freeship</div>
              <Switch checked={filters.freeship} onChange={(v) => setFilters({ ...filters, freeship: v })} />
            </div>

            <div className="flex items-center justify-between">
              <div className="font-bold text-gray-900">Flash Sale</div>
              <Switch checked={filters.flash} onChange={(v) => setFilters({ ...filters, flash: v })} />
            </div>

            <div className="flex items-center justify-between">
              <div className="font-bold text-gray-900">Mall</div>
              <Switch checked={filters.mall} onChange={(v) => setFilters({ ...filters, mall: v })} />
            </div>
          </div>

          <Button
            type="primary"
            onClick={() => setOpen(false)}
            className="w-full rounded-2xl !bg-pink-500 hover:!bg-pink-600 !border-pink-500"
          >
            Áp dụng
          </Button>
        </div>
      </Drawer>
    </div>
  );
}
