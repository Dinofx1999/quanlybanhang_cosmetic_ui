// src/components/shop/CategoryBar.tsx
import React from "react";
import type { Category } from "../../data/shopMock";

type Props = {
  items: Category[];
  activeId?: string;
  onChange?: (id: string) => void;
};

export default function CategoryBar({ items, activeId, onChange }: Props) {
  return (
    <div className="w-full">
      <div className="flex gap-2 overflow-x-auto pb-2">
        <button
          onClick={() => onChange?.("")}
          className={[
            "px-4 py-2 rounded-2xl border text-sm font-semibold whitespace-nowrap",
            !activeId ? "bg-pink-500 text-white border-pink-500" : "bg-white border-pink-200 text-pink-700 hover:bg-pink-50",
          ].join(" ")}
        >
          Tất cả
        </button>

        {items.map((c) => {
          const active = activeId === c.id;
          return (
            <button
              key={c.id}
              onClick={() => onChange?.(c.id)}
              className={[
                "px-4 py-2 rounded-2xl border text-sm font-semibold whitespace-nowrap",
                active ? "bg-pink-500 text-white border-pink-500" : "bg-white border-pink-200 text-pink-700 hover:bg-pink-50",
              ].join(" ")}
            >
              {c.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}
