// src/components/shop/CategoryBar.tsx
import React, { useEffect, useMemo, useState } from "react";
import type { Category } from "../../data/shopMock";
import { Layers, ChevronRight } from "lucide-react";

type Props = {
  items: Category[];
  activeId?: string; // "" | "lv1" | "lv1/lv2" | "lv1/lv2/lv3"
  onChange?: (id: string) => void;
};

function splitPath(path?: string) {
  const v = String(path || "").trim();
  if (!v) return [];
  return v.split("/").filter(Boolean);
}

// tìm node theo path
function findNodeByPath(items: Category[], pathSegs: string[]): Category | undefined {
  let curList = items;
  let curNode: Category | undefined;
  for (const seg of pathSegs) {
    curNode = curList.find((x) => x.id === seg);
    if (!curNode) return undefined;
    curList = curNode.children || [];
  }
  return curNode;
}

export default function CategoryBar({ items, activeId, onChange }: Props) {
  const segs = useMemo(() => splitPath(activeId), [activeId]);
  const lv1 = segs[0] || "";
  const lv2 = segs[1] || "";
  const lv3 = segs[2] || "";

  // để panel hiển thị ổn định khi user click
  const [openLv1, setOpenLv1] = useState<string>(lv1);

  useEffect(() => {
    setOpenLv1(lv1 || "");
  }, [lv1]);

  const lv1Node = useMemo(() => (openLv1 ? items.find((x) => x.id === openLv1) : undefined), [items, openLv1]);
  const lv2Items = lv1Node?.children || [];

  const lv2Node = useMemo(() => {
    if (!openLv1 || !lv2) return undefined;
    return (lv1Node?.children || []).find((x) => x.id === lv2);
  }, [lv1Node, openLv1, lv2]);

  const lv3Items = lv2Node?.children || [];

  const setAll = () => {
    setOpenLv1("");
    onChange?.("");
  };

  const selectLv1 = (id: string) => {
    setOpenLv1(id);
    onChange?.(id); // chọn level1 (tất cả bên trong level1)
  };

  const selectLv2 = (lv1Id: string, lv2Id: string) => {
    setOpenLv1(lv1Id);
    onChange?.(`${lv1Id}/${lv2Id}`); // chọn level2 (tất cả bên trong level2)
  };

  const selectLv3 = (lv1Id: string, lv2Id: string, lv3Id: string) => {
    setOpenLv1(lv1Id);
    onChange?.(`${lv1Id}/${lv2Id}/${lv3Id}`);
  };

  // label helper
  const lv1Label = useMemo(() => (lv1 ? items.find((x) => x.id === lv1)?.name : ""), [items, lv1]);
  const lv2Label = useMemo(() => {
    if (!lv1 || !lv2) return "";
    const p = items.find((x) => x.id === lv1);
    return (p?.children || []).find((x) => x.id === lv2)?.name || "";
  }, [items, lv1, lv2]);

  return (
    <div className="w-full">
      {/* Title */}
      <div className="flex items-center gap-2 mb-2">
        <Layers size={18} className="text-pink-600" />
        <div className="font-extrabold text-gray-900">Danh mục</div>
        <div className="text-xs text-gray-500 hidden md:block">3 lớp: Cha → Con → Nhánh</div>
      </div>

      {/* ===== Level 1 (Parent row) ===== */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        <button
          onClick={setAll}
          className={[
            "px-4 py-2 rounded-2xl border text-sm font-semibold whitespace-nowrap",
            !activeId ? "bg-pink-500 text-white border-pink-500" : "bg-white border-pink-200 text-pink-700 hover:bg-pink-50",
          ].join(" ")}
        >
          Tất cả
        </button>

        {items.map((p) => {
          const active = !!activeId && lv1 === p.id;
          return (
            <button
              key={p.id}
              onClick={() => selectLv1(p.id)}
              className={[
                "px-4 py-2 rounded-2xl border text-sm font-semibold whitespace-nowrap",
                active ? "bg-pink-500 text-white border-pink-500" : "bg-white border-pink-200 text-pink-700 hover:bg-pink-50",
              ].join(" ")}
              title={p.name}
            >
              {p.name}
            </button>
          );
        })}
      </div>

      {/* ===== Level 2 panel ===== */}
      {openLv1 && lv2Items.length > 0 ? (
        <div className="mt-3 rounded-[18px] border border-pink-100 bg-pink-50/40 p-3">
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="text-sm font-extrabold text-gray-900">
              {items.find((x) => x.id === openLv1)?.name}{" "}
              <span className="text-gray-500 font-semibold">/ Level 2</span>
            </div>

            <button
              onClick={() => onChange?.(openLv1)}
              className="text-xs font-bold text-pink-700 hover:text-pink-800 inline-flex items-center gap-1"
            >
              Xem tất cả <ChevronRight size={14} />
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            {/* tất cả level2 */}
            <button
              onClick={() => onChange?.(openLv1)}
              className={[
                "px-3 py-2 rounded-2xl border text-sm font-semibold",
                lv1 === openLv1 && !lv2
                  ? "bg-white border-pink-400 text-pink-700 shadow-sm"
                  : "bg-white border-pink-200 text-gray-700 hover:border-pink-300 hover:bg-pink-50",
              ].join(" ")}
            >
              Tất cả {items.find((x) => x.id === openLv1)?.name}
            </button>

            {lv2Items.map((c2) => {
              const active = lv1 === openLv1 && lv2 === c2.id;
              return (
                <button
                  key={c2.id}
                  onClick={() => selectLv2(openLv1, c2.id)}
                  className={[
                    "px-3 py-2 rounded-2xl border text-sm font-semibold",
                    active
                      ? "bg-white border-pink-400 text-pink-700 shadow-sm"
                      : "bg-white border-pink-200 text-gray-700 hover:border-pink-300 hover:bg-pink-50",
                  ].join(" ")}
                  title={c2.name}
                >
                  {c2.name}
                </button>
              );
            })}
          </div>

          {/* ===== Level 3 panel ===== */}
          {lv2Node && lv3Items.length > 0 ? (
            <div className="mt-3 rounded-[16px] border border-pink-100 bg-white p-3">
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="text-sm font-extrabold text-gray-900">
                  {lv1Label} <span className="text-gray-400">/</span> {lv2Label}{" "}
                  <span className="text-gray-500 font-semibold">/ Level 3</span>
                </div>

                <button
                  onClick={() => onChange?.(`${openLv1}/${lv2}`)}
                  className="text-xs font-bold text-pink-700 hover:text-pink-800 inline-flex items-center gap-1"
                >
                  Xem tất cả <ChevronRight size={14} />
                </button>
              </div>

              <div className="flex flex-wrap gap-2">
                {/* tất cả level3 trong lv2 */}
                <button
                  onClick={() => onChange?.(`${openLv1}/${lv2}`)}
                  className={[
                    "px-3 py-2 rounded-2xl border text-sm font-semibold",
                    lv1 === openLv1 && lv2 && !lv3
                      ? "bg-pink-50 border-pink-400 text-pink-700 shadow-sm"
                      : "bg-white border-pink-200 text-gray-700 hover:border-pink-300 hover:bg-pink-50",
                  ].join(" ")}
                >
                  Tất cả {lv2Label}
                </button>

                {lv3Items.map((c3) => {
                  const active = lv1 === openLv1 && lv2 === lv2Node.id && lv3 === c3.id;
                  return (
                    <button
                      key={c3.id}
                      onClick={() => selectLv3(openLv1, lv2Node.id, c3.id)}
                      className={[
                        "px-3 py-2 rounded-2xl border text-sm font-semibold",
                        active
                          ? "bg-pink-50 border-pink-500 text-pink-700 shadow-sm"
                          : "bg-white border-pink-200 text-gray-700 hover:border-pink-300 hover:bg-pink-50",
                      ].join(" ")}
                      title={c3.name}
                    >
                      {c3.name}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
