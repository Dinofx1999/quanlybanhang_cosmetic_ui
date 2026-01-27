// src/components/shop/ProductGrid.tsx
import React from "react";
import { Empty, Pagination } from "antd";
import type { Product } from "../../data/shopMock";
import ProductCard from "./ProductCard";

export default function ProductGrid({
  items,
  page,
  pageSize,
  total,
  onPageChange,
}: {
  items: Product[];
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (p: number, ps: number) => void;
}) {
  return (
    <div className="w-full">
      {items.length === 0 ? (
        <div className="bg-white border border-pink-100 rounded-[22px] p-10 shadow-sm">
          <Empty description="Không có sản phẩm phù hợp" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 2xl:grid-cols-8 gap-2">
            {items.map(p => (
              <ProductCard key={p.id} p={p} />
            ))}
          </div>

          <div className="mt-5 flex justify-center">
            <Pagination
              current={page}
              pageSize={pageSize}
              total={total} 
              showSizeChanger
              pageSizeOptions={[12, 24, 36, 48]}
              onChange={onPageChange}
            />
          </div>
        </>
      )}
    </div>
  );
}
