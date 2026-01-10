// src/hooks/usePosProducts.ts
import { useCallback, useEffect, useMemo, useState } from "react";
import { message } from "antd";
import api from "../services/api";
import { BRANCH_KEY, getPosBranchId } from "../services/branchContext";
import { getCurrentUser } from "../services/authService";

export interface ProductImage {
  url: string;
  isPrimary?: boolean;
  order?: number;
}

export interface Product {
  _id: string;
  sku?: string;
  name: string;
  categoryId?: string | null;
  categoryName: string;
  price: number;
  cost?: number;
  brand?: string;
  barcode: string;
  stock: number;
  thumbnail?: string;
  images?: ProductImage[];
  isActive?: boolean;
}

function upperRole(user: any) {
  return String(user?.role || "").toUpperCase();
}

function resolveEffectiveBranchId(posBranchId: string) {
  const u = getCurrentUser();
  const role = upperRole(u);

  if (role === "STAFF") return String(u?.branchId || "");

  // ưu tiên localStorage giống App.tsx của bạn
  const saved = String(localStorage.getItem(BRANCH_KEY) || "");
  const effective = saved || posBranchId || "all";
  return String(effective || "all");
}

export function usePosProducts(posBranchId: string, enabled: boolean) {
  const [productsRaw, setProductsRaw] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);

  const fetchProducts = useCallback(async () => {
    if (!enabled) return;

    setLoadingProducts(true);
    try {
      const effective = resolveEffectiveBranchId(posBranchId);

      // POS: bạn đang bắt buộc chọn 1 branch, nhưng hook vẫn hỗ trợ all cho màn khác
      const params = effective && effective !== "all" ? { branchId: effective } : {};
      const res = await api.get("/products", { params });

      const items = res.data?.items || [];
      const mapped: Product[] = items.map((p: any) => ({
        _id: String(p._id),
        sku: p.sku || "",
        name: p.name || "",
        categoryId: p.categoryId ? String(p.categoryId) : null,
        categoryName: p.categoryName || "",
        price: Number(p.price || 0),
        cost: Number(p.cost || 0),
        brand: p.brand || "",
        barcode: p.barcode || "",
        stock: Number(p.stock || 0),
        thumbnail: p.thumbnail || "",
        images: Array.isArray(p.images) ? p.images : [],
        isActive: p.isActive !== false,
      }));

      setProductsRaw(mapped);
    } catch (err: any) {
      console.error("Fetch products error:", err?.response?.data || err?.message);
      setProductsRaw([]);
      message.error(err?.response?.data?.message || "Không tải được sản phẩm.");
    } finally {
      setLoadingProducts(false);
    }
  }, [posBranchId, enabled]);

  // load lần đầu / khi đổi branchId
  useEffect(() => {
    if (!enabled) return;
    fetchProducts();
  }, [enabled, fetchProducts]);

  // listen branch_changed -> reload
  useEffect(() => {
    if (!enabled) return;

    const onBranchChanged = () => {
      fetchProducts();
    };

    window.addEventListener("branch_changed", onBranchChanged);
    return () => window.removeEventListener("branch_changed", onBranchChanged);
  }, [enabled, fetchProducts]);

  const refresh = useCallback(() => fetchProducts(), [fetchProducts]);

  return useMemo(
    () => ({ productsRaw, loadingProducts, refresh }),
    [productsRaw, loadingProducts, refresh]
  );
}
