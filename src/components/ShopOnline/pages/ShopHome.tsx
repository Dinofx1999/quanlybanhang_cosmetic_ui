// src/pages/ShopHome.tsx
import React, { useMemo, useRef, useState } from "react";
import ShopHeader from "../components/shop/ShopHeader";
import CategoryBar from "../components/shop/CategoryBar";
import VoucherBar from "../components/shop/VoucherBar";
import FlashSale from "../components/shop/FlashSale";
import FilterSortBar, { Filters, SortKey } from "../components/shop/FilterSortBar";
import ProductGrid from "../components/shop/ProductGrid";
import ShopFooter from "../components/shop/ShopFooter";
import AdsBanner from "../components/shop/AdsBanner";
import ProductQuickView from "../components/shop/ProductQuickView";

//HELPER
import {getLastId} from "../helpers/format"
import {normalizeProductsFromApi} from "../helpers/func_helper"

import { flashSaleEndsAt } from "../data/shopMock";
import api from "../../../services/api";

export default function ShopHome() {
  const flashRef = useRef<HTMLDivElement | null>(null);

  const [q, setQ] = useState("");
  const [catId, setCatId] = useState<string>("");

  const [sort, setSort] = useState<SortKey>("relevance");
  const [filterOpen, setFilterOpen] = useState(false);

  const [openDetail, setOpenDetail] = useState(false);
 const [detailId, setDetailId] = useState<string>("");

    const openProduct = (id: string) => {
  setDetailId(id);
  setOpenDetail(true);
};

  // pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(24);

   // load categories from API
  const [categories, setCategories] = React.useState<any[]>([]);
    const fetchCategories = React.useCallback(async () => {
        try {
        const res = await api.get("/public/categories/tree");
        setCategories(res.data.tree || []);
        console.log("Fetched categories:", res.data.tree);
        } catch {
        setCategories([]);
        }
    }, []);
    React.useEffect(() => {
        fetchCategories();
    }, []);


    //Load products from API
    const [products, setProducts] = React.useState<any[]>([]);

    const fetchProducts = React.useCallback(async (id_cat: string) => {
        try {
            let url = `/public/categories/${id_cat}/products?includeSubcategories=true`;
            if(id_cat===""){
                url=`/public/products`;
            }
            const res = await api.get(url);
            const uiItems = normalizeProductsFromApi(res.data.items || []);
            setProducts(uiItems);
        } catch {
            setProducts([]);
        }
    }, []);
    React.useEffect(() => {
        const id_cat = getLastId(catId);
        fetchProducts(id_cat);
    }, [catId]);


      const maxPrice = useMemo(() => Math.max(...products.map((p) => p.originalPrice || p.price)), []);
  const [filters, setFilters] = useState<Filters>({
    priceMin: 0,
    priceMax: maxPrice,
    minRating: 0,
    freeship: false,
    flash: false,
    mall: false,
  });

    
  const resetAll = () => {
    setSort("relevance");
    setFilters({
      priceMin: 0,
      priceMax: maxPrice,
      minRating: 0,
      freeship: false,
      flash: false,
      mall: false,
    });
    setPage(1);
  };

  const filteredSorted = useMemo(() => {
    const query = q.trim().toLowerCase();

    let list = products.filter((p) => {
      const matchQ =
        !query ||
        p.name.toLowerCase().includes(query) ||
        (p.brand || "").toLowerCase().includes(query);

      const matchCat = !catId || p.categoryId === catId;

      const priceBase = p.price;
      const matchPrice = priceBase >= filters.priceMin && priceBase <= filters.priceMax;

      const matchRating = (p.rating || 0) >= (filters.minRating || 0);

      const matchFreeship = !filters.freeship || p.tags?.includes("Freeship");
      const matchFlash = !filters.flash || !!p.flashSale;
      const matchMall = !filters.mall || p.tags?.includes("Mall");

      return matchQ && matchCat && matchPrice && matchRating && matchFreeship && matchFlash && matchMall;
    });

    // sort
    list = [...list];
    if (sort === "best") {
      list.sort((a, b) => (b.soldCount || 0) - (a.soldCount || 0));
    } else if (sort === "price_asc") {
      list.sort((a, b) => a.price - b.price);
    } else if (sort === "price_desc") {
      list.sort((a, b) => b.price - a.price);
    } else {
      // relevance: ưu tiên flash + rating + soldCount
      list.sort((a, b) => {
        const sa = (a.flashSale ? 1000000 : 0) + (a.rating || 0) * 1000 + (a.soldCount || 0);
        const sb = (b.flashSale ? 1000000 : 0) + (b.rating || 0) * 1000 + (b.soldCount || 0);
        return sb - sa;
      });
    }

    return list;
  }, [q, catId, filters, sort, maxPrice]);

  const total = filteredSorted.length;

  const paged = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredSorted.slice(start, start + pageSize);
  }, [filteredSorted, page, pageSize]);

  const onPageChange = (p: number, ps: number) => {
    setPage(p);
    setPageSize(ps);
  };

  const flashItems = products.filter((p) => p.flashSale);

  return (
    <div className="min-h-screen w-full bg-pink-50/40">
      <ShopHeader
        onSearch={(v) => {
          setQ(v);
          setPage(1);
        }}
        onOpenVoucher={() => window.scrollTo({ top: 450, behavior: "smooth" })}
        onGoFlash={() => flashRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
      />

      {/* FULL SCREEN WRAPPER */}
        <div className="w-full px-5 md:px-8 lg:px-10 py-5 space-y-4">
        <AdsBanner />
        <div ref={flashRef}>
        {flashSaleEndsAt && flashItems.length > 0 && (
        <FlashSale endsAt={flashSaleEndsAt} items={flashItems} />
        )}
        </div>
         <VoucherBar onApply={() => {}} />
        <div className="bg-white border border-pink-100 rounded-[22px] p-3 md:p-4 shadow-sm">
          <CategoryBar
            items={categories}
            activeId={catId}
            onChange={(id) => {
              setCatId(id);
              setPage(1);
            }}
          />
        </div>

       

        

        <FilterSortBar
          sort={sort}
          onSortChange={(v) => {
            setSort(v);
            setPage(1);
          }}
          open={filterOpen}
          setOpen={setFilterOpen}
          filters={filters}
          setFilters={(f) => {
            setFilters(f);
            setPage(1);
          }}
          maxPrice={maxPrice}
          onReset={resetAll}
        />

        <div className="flex items-center justify-between text-sm text-gray-600">
          <div>
            Kết quả: <span className="font-extrabold text-gray-900">{total}</span> sản phẩm
          </div>
          <div className="hidden md:block">
            Tip: dùng <span className="font-semibold text-pink-600">Bộ lọc</span> để tìm nhanh đúng hàng bán chạy.
          </div>
        </div>

        <ProductGrid
          items={products}
          page={page}
          pageSize={pageSize}
          total={total}
          onPageChange={onPageChange}
        />

        <ProductQuickView
            open={openDetail}
            productId={detailId}
            onClose={() => setOpenDetail(false)}
            />
      </div>

      <ShopFooter />
    </div>
  );
}
