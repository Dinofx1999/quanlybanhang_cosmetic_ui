// src/components/Products/ProductInputSection.tsx
import React, { useEffect, useMemo, useState } from "react";
import {
  Package,
  Tag,
  Plus,
  RefreshCw,
  Image as ImageIcon,
  X,
  Pencil,
} from "lucide-react";
import api from "../../services/api";
import { message, Modal } from "antd";

// ===============================
// Types
// ===============================
type ProductImage = {
  url: string;
  isPrimary?: boolean;
  order?: number;
};

type ProductItem = {
  _id: string;
  sku: string;
  name: string;
  brand?: string;
  categoryId?: string | null;
  categoryName?: string;
  barcode?: string;
  cost?: number;
  price?: number;
  thumbnail?: string;
  images?: ProductImage[];
  isActive?: boolean;
};

type CategoryItem = {
  _id: string;
  code: string;
  name: string;
  order?: number;
  isActive?: boolean;
};

// ===============================
// API helpers
// ===============================
const createCategory = async (data: any) => {
  const res = await api.post("/categories", {
    code: String(data.code || "").trim().toUpperCase(),
    name: String(data.name || "").trim(),
    order: Number(data.order) || 1,
  });
  return res.data;
};

const updateCategory = async (id: string, data: any) => {
  const res = await api.put(`/categories/${id}`, {
    code: String(data.code || "").trim().toUpperCase(),
    name: String(data.name || "").trim(),
    order: Number(data.order) || 1,
    isActive: data.isActive === undefined ? true : Boolean(data.isActive),
  });
  return res.data;
};

const createProduct = async (data: any) => {
  const res = await api.post("/products", {
    sku: String(data.sku || "").trim().toUpperCase(),
    name: String(data.name || "").trim(),
    price: Number(data.price),
    categoryId: data.categoryId,
    categoryName: String(data.categoryName || "").trim(),
    brand: String(data.brand || "").trim(),
    barcode: String(data.barcode || "").trim(),
  });
  return res.data;
};

const updateProduct = async (id: string, data: any) => {
  const res = await api.put(`/products/${id}`, {
    sku: String(data.sku || "").trim().toUpperCase(),
    name: String(data.name || "").trim(),
    price: Number(data.price),
    cost: data.cost !== undefined && data.cost !== "" ? Number(data.cost) : undefined,
    categoryId: data.categoryId || null,
    categoryName: String(data.categoryName || "").trim(),
    brand: String(data.brand || "").trim(),
    barcode: String(data.barcode || "").trim(),
    isActive: data.isActive === undefined ? true : Boolean(data.isActive),
  });
  return res.data;
};

// Upload nhiều ảnh cho productId
// POST /api/products/:id/images  (form-data key: files)
const uploadProductImages = async (productId: string, files: File[], primaryIndex = 0) => {
  const fd = new FormData();
  files.forEach((f) => fd.append("files", f));

  const res = await api.post(`/products/${productId}/images?primaryIndex=${primaryIndex}`, fd, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
};

// Set primary theo URL
// PATCH /api/products/:id/images/primary  body { url }
const setPrimaryProductImage = async (productId: string, url: string) => {
  const res = await api.patch(`/products/${productId}/images/primary`, { url });
  return res.data;
};

// Delete ảnh theo URL
// DELETE /api/products/:id/images  body { url }
const deleteProductImageByUrl = async (productId: string, url: string) => {
  const res = await api.delete(`/products/${productId}/images`, {
    data: { url }, // axios delete body phải dùng data
  });
  return res.data;
};

function extractCreatedProductId(created: any): string {
  return String(
    created?.product?._id ||
      created?.item?._id ||
      created?.data?.product?._id ||
      created?.data?.item?._id ||
      created?.productId ||
      created?.id ||
      created?._id ||
      ""
  );
}

// ===============================
// Component
// ===============================
const ProductInputSection: React.FC = () => {
  const [messageApi, contextHolder] = message.useMessage();
  const success = (mess: string) => messageApi.open({ type: "success", content: mess });
  const error = (mess: string) => messageApi.open({ type: "error", content: mess });
  const warning = (mess: string) => messageApi.open({ type: "warning", content: mess });

  const [activeTab, setActiveTab] = useState<"product" | "category">("product");

  // ✅ Product form
  const [productForm, setProductForm] = useState({
    sku: "",
    name: "",
    price: "",
    categoryId: "",
    categoryName: "",
    brand: "",
    barcode: "",
  });

  // ✅ Category form
  const [categoryForm, setCategoryForm] = useState({
    name: "",
    code: "",
    order: "",
  });

  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);

  // ✅ Images (select BEFORE create)
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [primaryIndex, setPrimaryIndex] = useState<number>(0);

  // ✅ Creating state
  const [creating, setCreating] = useState(false);

  // ===============================
  // EDIT MODALS state
  // ===============================
  const [editProductOpen, setEditProductOpen] = useState(false);
  const [editCategoryOpen, setEditCategoryOpen] = useState(false);

  const [editProduct, setEditProduct] = useState<any>({
    _id: "",
    sku: "",
    name: "",
    price: "",
    cost: "",
    categoryId: "",
    categoryName: "",
    brand: "",
    barcode: "",
    isActive: true,
    thumbnail: "",
    images: [] as ProductImage[],
  });

  const [editCategory, setEditCategory] = useState<any>({
    _id: "",
    code: "",
    name: "",
    order: 1,
    isActive: true,
  });

  const [savingEdit, setSavingEdit] = useState(false);

  // ===============================
  // EDIT IMAGES state
  // ===============================
  const [editImageFiles, setEditImageFiles] = useState<File[]>([]);
  const [editImagePrimaryIndex, setEditImagePrimaryIndex] = useState<number>(0);
  const [uploadingEditImages, setUploadingEditImages] = useState(false);

  // ===============================
  // Previews (create)
  // ===============================
  const previews = useMemo(() => {
    return selectedFiles.map((f) => ({ name: f.name, url: URL.createObjectURL(f) }));
  }, [selectedFiles]);

  useEffect(() => {
    return () => {
      previews.forEach((p) => URL.revokeObjectURL(p.url));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedFiles]);

  // ===============================
  // Previews (edit modal)
  // ===============================
  const editImagePreviews = useMemo(() => {
    return editImageFiles.map((f) => ({ name: f.name, url: URL.createObjectURL(f) }));
  }, [editImageFiles]);

  useEffect(() => {
    return () => {
      editImagePreviews.forEach((p) => URL.revokeObjectURL(p.url));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editImageFiles]);

  // ===============================
  // Fetch
  // ===============================
  const getCategories = async () => {
    const res = await api.get("/categories");
    setCategories((res.data.items || []) as CategoryItem[]);
  };

  const getProducts = async () => {
    setLoadingProducts(true);
    try {
      const res = await api.get("/products");
      const items = (res.data.items || res.data.products || []) as ProductItem[];
      setProducts(items);
    } catch (e: any) {
      console.error("Get products error:", e.response?.data || e.message);
      setProducts([]);
      error(e?.response?.data?.message || "Không tải được danh sách sản phẩm");
    } finally {
      setLoadingProducts(false);
    }
  };

  useEffect(() => {
    getCategories().catch(console.error);
  }, []);

  useEffect(() => {
    if (activeTab !== "product") return;
    getProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const formatMoney = (n: any) => Number(n || 0).toLocaleString("vi-VN");

  // ===============================
  // Create handlers
  // ===============================
  const handleProductSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();

    if (!productForm.sku.trim()) return void warning("Thiếu SKU");
    if (!productForm.name.trim()) return void warning("Thiếu tên sản phẩm");
    if (!productForm.categoryId) return void warning("Chọn danh mục");
    if (!productForm.price) return void warning("Nhập giá bán");

    setCreating(true);
    try {
      const created = await createProduct(productForm);
      const productId = extractCreatedProductId(created);

      if (!productId) {
        console.log("CREATE PRODUCT RESPONSE:", created);
        throw new Error("Không lấy được productId từ response create product");
      }

      if (selectedFiles.length > 0) {
        await uploadProductImages(productId, selectedFiles, primaryIndex);
      }

      setProductForm({
        sku: "",
        name: "",
        price: "",
        categoryId: "",
        categoryName: "",
        brand: "",
        barcode: "",
      });
      setSelectedFiles([]);
      setPrimaryIndex(0);

      await getProducts();
      success("Tạo sản phẩm thành công");
    } catch (err: any) {
      console.error("Create product error:", err?.response?.data || err?.message);
      error(err?.response?.data?.message || err?.message || "Có lỗi khi tạo sản phẩm");
    } finally {
      setCreating(false);
    }
  };

  const handleCategorySubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();

    if (!categoryForm.name.trim()) return void warning("Thiếu tên danh mục");
    if (!categoryForm.code.trim()) return void warning("Thiếu CODE");

    setCreating(true);
    try {
      await createCategory(categoryForm);
      await getCategories();
      setCategoryForm({ name: "", code: "", order: "" });
      success("Thêm Mới Danh Mục Thành Công");
    } catch (err: any) {
      console.error("Create category error:", err?.response?.data || err?.message);
      error(err?.response?.data?.message || "Có lỗi khi thêm danh mục");
    } finally {
      setCreating(false);
    }
  };

  // ===============================
  // OPEN EDIT
  // ===============================
  const openEditProduct = (p: ProductItem) => {
    setEditProduct({
      _id: p._id,
      sku: p.sku || "",
      name: p.name || "",
      price: String(p.price ?? ""),
      cost: String(p.cost ?? ""),
      categoryId: p.categoryId ? String(p.categoryId) : "",
      categoryName: p.categoryName || "",
      brand: p.brand || "",
      barcode: p.barcode || "",
      isActive: p.isActive !== false,

      thumbnail: p.thumbnail || "",
      images: Array.isArray(p.images) ? p.images : [],
    });

    setEditImageFiles([]);
    setEditImagePrimaryIndex(0);
    setEditProductOpen(true);
  };

  const openEditCategory = (c: CategoryItem) => {
    setEditCategory({
      _id: c._id,
      code: c.code || "",
      name: c.name || "",
      order: Number(c.order ?? 1),
      isActive: c.isActive !== false,
    });
    setEditCategoryOpen(true);
  };

  // ===============================
  // SAVE EDIT
  // ===============================
  const saveEditProduct = async () => {
    if (!editProduct._id) return;
    if (!String(editProduct.sku || "").trim()) return void warning("Thiếu SKU");
    if (!String(editProduct.name || "").trim()) return void warning("Thiếu tên sản phẩm");
    if (!String(editProduct.price || "").trim()) return void warning("Thiếu giá bán");

    setSavingEdit(true);
    try {
      // sync categoryName from selected categoryId
      let catName = editProduct.categoryName || "";
      if (editProduct.categoryId) {
        const cat = categories.find((x) => String(x._id) === String(editProduct.categoryId));
        if (cat?.name) catName = cat.name;
      }

      await updateProduct(editProduct._id, { ...editProduct, categoryName: catName });
      setEditProductOpen(false);
      await getProducts();
      success("Cập nhật sản phẩm thành công");
    } catch (err: any) {
      console.error("Update product error:", err?.response?.data || err?.message);
      error(err?.response?.data?.message || "Có lỗi khi cập nhật sản phẩm");
    } finally {
      setSavingEdit(false);
    }
  };

  const saveEditCategory = async () => {
    if (!editCategory._id) return;
    if (!String(editCategory.name || "").trim()) return void warning("Thiếu tên danh mục");
    if (!String(editCategory.code || "").trim()) return void warning("Thiếu CODE");

    setSavingEdit(true);
    try {
      await updateCategory(editCategory._id, editCategory);
      setEditCategoryOpen(false);
      await getCategories();
      await getProducts().catch(() => {});
      success("Cập nhật danh mục thành công");
    } catch (err: any) {
      console.error("Update category error:", err?.response?.data || err?.message);
      error(err?.response?.data?.message || "Có lỗi khi cập nhật danh mục");
    } finally {
      setSavingEdit(false);
    }
  };

  // ===============================
  // EDIT IMAGES handlers
  // ===============================
  const uploadImagesInEditModal = async () => {
    if (!editProduct?._id) return;
    if (editImageFiles.length === 0) return void warning("Chưa chọn ảnh");

    setUploadingEditImages(true);
    try {
      const rs = await uploadProductImages(editProduct._id, editImageFiles, editImagePrimaryIndex);

      setEditProduct((prev: any) => ({
        ...prev,
        thumbnail: rs?.thumbnail || prev.thumbnail,
        images: rs?.images || prev.images,
      }));

      setEditImageFiles([]);
      setEditImagePrimaryIndex(0);

      await getProducts();
      success("Upload ảnh thành công");
    } catch (err: any) {
      console.error(err);
      error(err?.response?.data?.message || "Upload ảnh thất bại");
    } finally {
      setUploadingEditImages(false);
    }
  };

  const setPrimaryInEditModal = async (url: string) => {
    if (!editProduct?._id) return;

    try {
      const rs = await setPrimaryProductImage(editProduct._id, url);
      setEditProduct((prev: any) => ({
        ...prev,
        thumbnail: rs?.thumbnail || url,
        images: rs?.images || prev.images,
      }));
      await getProducts();
      success("Đã đặt ảnh chính");
    } catch (err: any) {
      console.error(err);
      error(err?.response?.data?.message || "Không đặt được ảnh chính");
    }
  };

  const deleteImageInEditModal = async (url: string) => {
    if (!editProduct?._id) return;

    Modal.confirm({
      title: "Xoá ảnh?",
      content: "Ảnh sẽ bị xoá khỏi sản phẩm (và xoá file trên server).",
      okText: "Xoá",
      okButtonProps: { danger: true },
      cancelText: "Huỷ",
      onOk: async () => {
        try {
          const rs = await deleteProductImageByUrl(editProduct._id, url);
          setEditProduct((prev: any) => ({
            ...prev,
            thumbnail: rs?.thumbnail || "",
            images: rs?.images || [],
          }));
          await getProducts();
          success("Đã xoá ảnh");
        } catch (err: any) {
          console.error(err);
          error(err?.response?.data?.message || "Xoá ảnh thất bại");
        }
      },
    });
  };

  // ===============================
  // UI
  // ===============================
  return (
    <div className="max-w-5xl mx-auto space-y-4">
      {contextHolder}

      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-gray-800">Quản Lý Sản Phẩm</h2>
        <p className="text-sm text-gray-600 mt-1">Thêm sản phẩm và danh mục</p>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg border border-gray-200 p-2">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab("product")}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-all ${
              activeTab === "product"
                ? "bg-pink-500 text-white"
                : "text-gray-600 hover:bg-gray-50"
            }`}
          >
            <Package className="w-5 h-5" />
            Nhập Sản Phẩm
          </button>

          <button
            onClick={() => setActiveTab("category")}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-all ${
              activeTab === "category"
                ? "bg-pink-500 text-white"
                : "text-gray-600 hover:bg-gray-50"
            }`}
          >
            <Tag className="w-5 h-5" />
            Danh Mục
          </button>
        </div>
      </div>

      {/* ===============================
          Product Form + Images + List
      =============================== */}
      {activeTab === "product" && (
        <div className="space-y-4">
          {/* Product Form */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <form onSubmit={handleProductSubmit} className="space-y-4">
              {/* SKU + Name */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    SKU *
                  </label>
                  <input
                    type="text"
                    value={productForm.sku}
                    onChange={(e) =>
                      setProductForm({
                        ...productForm,
                        sku: e.target.value.toUpperCase(),
                      })
                    }
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent outline-none"
                    placeholder="VD: SON-DO-002"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Tên Sản Phẩm *
                  </label>
                  <input
                    type="text"
                    value={productForm.name}
                    onChange={(e) =>
                      setProductForm({ ...productForm, name: e.target.value })
                    }
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent outline-none"
                    placeholder="VD: Son Hồng Cánh Sen"
                    required
                  />
                </div>
              </div>

              {/* Category + Price + Brand */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Danh Mục *
                  </label>
                  <select
                    value={productForm.categoryId}
                    onChange={(e) => {
                      const id = e.target.value;
                      const cat = categories.find(
                        (x) => String(x._id) === String(id)
                      );
                      setProductForm({
                        ...productForm,
                        categoryId: id,
                        categoryName: cat?.name || "",
                      });
                    }}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent outline-none"
                    required
                  >
                    <option value="">-- Chọn danh mục --</option>
                    {categories?.map((cat) => (
                      <option key={cat._id} value={cat._id}>
                        {cat.code} - {cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Giá Bán (đ) *
                  </label>
                  <input
                    type="number"
                    value={productForm.price}
                    onChange={(e) =>
                      setProductForm({ ...productForm, price: e.target.value })
                    }
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent outline-none"
                    placeholder="150000"
                    min={0}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Brand
                  </label>
                  <input
                    type="text"
                    value={productForm.brand}
                    onChange={(e) =>
                      setProductForm({ ...productForm, brand: e.target.value })
                    }
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent outline-none"
                    placeholder="VD: 3CE"
                  />
                </div>
              </div>

              {/* Barcode */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Barcode
                </label>
                <input
                  type="text"
                  value={productForm.barcode}
                  onChange={(e) =>
                    setProductForm({ ...productForm, barcode: e.target.value })
                  }
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent outline-none"
                  placeholder="8938501234567"
                />
              </div>

              {/* ✅ Images picker */}
              <div className="border-t pt-4">
                <div className="flex items-center gap-2 mb-2">
                  <ImageIcon className="w-5 h-5 text-gray-600" />
                  <h4 className="font-semibold text-gray-800">
                    Hình ảnh sản phẩm
                  </h4>
                  <span className="text-xs text-gray-500">
                    (chọn ảnh trước, tạo xong sẽ upload tự động)
                  </span>
                </div>

                <label className="block w-full cursor-pointer">
                  <div className="w-full px-3 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium text-gray-700">
                    Bấm để chọn ảnh (tối đa 8 ảnh)
                  </div>
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={(e) => {
                      const files = Array.from(e.target.files || []).slice(0, 8);
                      setSelectedFiles(files);
                      setPrimaryIndex(0);
                      e.currentTarget.value = "";
                    }}
                    className="hidden"
                    disabled={creating}
                  />
                </label>

                {selectedFiles.length > 0 && (
                  <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-3">
                    {previews.map((p, idx) => (
                      <div
                        key={p.url}
                        className={`relative border rounded-lg overflow-hidden ${
                          idx === primaryIndex
                            ? "border-pink-500 ring-2 ring-pink-200"
                            : "border-gray-200"
                        }`}
                      >
                        <img
                          src={p.url}
                          alt={p.name}
                          className="w-full h-24 object-cover"
                        />
                        <div className="p-2 text-xs text-gray-600 truncate">
                          {p.name}
                        </div>

                        <button
                          type="button"
                          onClick={() => setPrimaryIndex(idx)}
                          className="absolute top-2 left-2 text-[11px] px-2 py-1 rounded bg-white/90 border border-gray-200 hover:border-pink-300"
                        >
                          {idx === primaryIndex ? "Ảnh chính" : "Chọn chính"}
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            const next = selectedFiles.filter((_, i) => i !== idx);
                            setSelectedFiles(next);
                            setPrimaryIndex((pi) => {
                              if (idx === pi) return 0;
                              if (idx < pi) return Math.max(0, pi - 1);
                              return pi;
                            });
                          }}
                          className="absolute top-2 right-2 p-1 rounded bg-white/90 border border-gray-200 hover:border-red-300"
                          title="Xoá ảnh"
                        >
                          <X className="w-4 h-4 text-gray-700" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={creating}
                className={`w-full py-3 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2 ${
                  creating
                    ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                    : "bg-pink-500 hover:bg-pink-600 text-white"
                }`}
              >
                <Plus className="w-5 h-5" />
                {creating ? "Đang tạo..." : "Thêm Sản Phẩm"}
              </button>
            </form>
          </div>

          {/* Products List */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between gap-3 mb-4">
              <h3 className="font-semibold text-gray-800">
                Danh Sách Sản Phẩm ({products.length})
              </h3>

              <button
                type="button"
                onClick={getProducts}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 text-sm font-semibold"
              >
                <RefreshCw
                  className={`w-4 h-4 ${loadingProducts ? "animate-spin" : ""}`}
                />
                Tải lại
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left bg-gray-50 border-y border-gray-200">
                    <th className="px-3 py-2.5 font-semibold text-gray-700">
                      Ảnh
                    </th>
                    <th className="px-3 py-2.5 font-semibold text-gray-700">
                      SKU
                    </th>
                    <th className="px-3 py-2.5 font-semibold text-gray-700">
                      Tên
                    </th>
                    <th className="px-3 py-2.5 font-semibold text-gray-700">
                      Danh mục
                    </th>
                    <th className="px-3 py-2.5 font-semibold text-gray-700">
                      Giá
                    </th>
                    <th className="px-3 py-2.5 font-semibold text-gray-700">
                      Brand
                    </th>
                    <th className="px-3 py-2.5 font-semibold text-gray-700">
                      Barcode
                    </th>
                    <th className="px-3 py-2.5 font-semibold text-gray-700 text-right">
                      Action
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {loadingProducts && (
                    <tr>
                      <td colSpan={8} className="px-3 py-6 text-center text-gray-500">
                        Đang tải sản phẩm...
                      </td>
                    </tr>
                  )}

                  {!loadingProducts && products.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-3 py-6 text-center text-gray-500">
                        Chưa có sản phẩm nào.
                      </td>
                    </tr>
                  )}

                  {!loadingProducts &&
                    products.map((p) => (
                      <tr key={p._id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="px-3 py-2.5">
                          {p.thumbnail ? (
                            <img
                              src={p.thumbnail}
                              alt={p.name}
                              className="w-10 h-10 rounded-lg object-cover border border-gray-200"
                              onError={(e) => {
                                // fallback nếu url lỗi
                                (e.currentTarget as HTMLImageElement).style.display = "none";
                              }}
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center text-gray-400">
                              <ImageIcon className="w-5 h-5" />
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-2.5 font-semibold text-gray-800 whitespace-nowrap">
                          {p.sku || "-"}
                        </td>
                        <td className="px-3 py-2.5 text-gray-800">{p.name || "-"}</td>
                        <td className="px-3 py-2.5 text-gray-700 whitespace-nowrap">
                          {p.categoryName || "-"}
                        </td>
                        <td className="px-3 py-2.5 text-gray-800 whitespace-nowrap">
                          {formatMoney(p.price)}đ
                        </td>
                        <td className="px-3 py-2.5 text-gray-700 whitespace-nowrap">
                          {p.brand || "-"}
                        </td>
                        <td className="px-3 py-2.5 text-gray-700 whitespace-nowrap">
                          {p.barcode || "-"}
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          <button
                            type="button"
                            onClick={() => openEditProduct(p)}
                            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 text-sm font-semibold"
                          >
                            <Pencil className="w-4 h-4" />
                            Sửa
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* ✅ Edit Product Modal */}
          <Modal
            open={editProductOpen}
            onCancel={() => setEditProductOpen(false)}
            onOk={saveEditProduct}
            okText={savingEdit ? "Đang lưu..." : "Lưu"}
            cancelText="Đóng"
            confirmLoading={savingEdit}
            title="Sửa sản phẩm"
          >
            <div className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-gray-700">SKU *</label>
                  <input
                    value={editProduct.sku}
                    onChange={(e) => setEditProduct({ ...editProduct, sku: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Tên *</label>
                  <input
                    value={editProduct.name}
                    onChange={(e) => setEditProduct({ ...editProduct, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="text-sm font-medium text-gray-700">Danh mục</label>
                  <select
                    value={editProduct.categoryId}
                    onChange={(e) => {
                      const id = e.target.value;
                      const cat = categories.find((x) => String(x._id) === String(id));
                      setEditProduct({
                        ...editProduct,
                        categoryId: id,
                        categoryName: cat?.name || "",
                      });
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none"
                  >
                    <option value="">-- Chọn --</option>
                    {categories?.map((cat) => (
                      <option key={cat._id} value={cat._id}>
                        {cat.code} - {cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700">Giá *</label>
                  <input
                    type="number"
                    value={editProduct.price}
                    onChange={(e) => setEditProduct({ ...editProduct, price: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700">Giá vốn</label>
                  <input
                    type="number"
                    value={editProduct.cost}
                    onChange={(e) => setEditProduct({ ...editProduct, cost: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-gray-700">Brand</label>
                  <input
                    value={editProduct.brand}
                    onChange={(e) => setEditProduct({ ...editProduct, brand: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700">Barcode</label>
                  <input
                    value={editProduct.barcode}
                    onChange={(e) => setEditProduct({ ...editProduct, barcode: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none"
                  />
                </div>
              </div>

              <label className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={!!editProduct.isActive}
                  onChange={(e) => setEditProduct({ ...editProduct, isActive: e.target.checked })}
                />
                <span className="text-sm text-gray-700">Đang bán (isActive)</span>
              </label>

              {/* ===============================
                  EDIT IMAGES
              =============================== */}
              <div className="mt-4 border-t pt-4">
                <div className="flex items-center gap-2 mb-2">
                  <ImageIcon className="w-5 h-5 text-gray-600" />
                  <h4 className="font-semibold text-gray-800">Ảnh sản phẩm</h4>
                  <span className="text-xs text-gray-500">(chọn ảnh chính / xoá / upload thêm)</span>
                </div>

                {/* Current images */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {(editProduct.images || []).length === 0 && (
                    <div className="text-sm text-gray-500">Chưa có ảnh.</div>
                  )}

                  {(editProduct.images || []).map((img: ProductImage) => {
                    const isPrimary = !!img.isPrimary || img.url === editProduct.thumbnail;
                    return (
                      <div
                        key={img.url}
                        className={`relative border rounded-lg overflow-hidden ${
                          isPrimary ? "border-pink-500 ring-2 ring-pink-200" : "border-gray-200"
                        }`}
                      >
                        <img src={img.url} alt="product" className="w-full h-24 object-cover" />

                        <div className="p-2 flex items-center justify-between gap-2">
                          <button
                            type="button"
                            onClick={() => setPrimaryInEditModal(img.url)}
                            className="text-[11px] px-2 py-1 rounded bg-white border border-gray-200 hover:border-pink-300"
                          >
                            {isPrimary ? "Ảnh chính" : "Chọn chính"}
                          </button>

                          <button
                            type="button"
                            onClick={() => deleteImageInEditModal(img.url)}
                            className="text-[11px] px-2 py-1 rounded bg-white border border-gray-200 hover:border-red-300"
                          >
                            Xoá
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Upload new images */}
                <div className="mt-4">
                  <div className="text-sm font-medium text-gray-700 mb-2">Upload thêm ảnh</div>

                  <label className="block w-full cursor-pointer">
                    <div className="w-full px-3 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium text-gray-700">
                      Bấm để chọn ảnh (tối đa 8)
                    </div>
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={(e) => {
                        const files = Array.from(e.target.files || []).slice(0, 8);
                        setEditImageFiles(files);
                        setEditImagePrimaryIndex(0);
                        e.currentTarget.value = "";
                      }}
                      className="hidden"
                      disabled={uploadingEditImages || savingEdit}
                    />
                  </label>

                  {editImageFiles.length > 0 && (
                    <div className="mt-3">
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {editImagePreviews.map((p, idx) => (
                          <div
                            key={p.url}
                            className={`relative border rounded-lg overflow-hidden ${
                              idx === editImagePrimaryIndex
                                ? "border-pink-500 ring-2 ring-pink-200"
                                : "border-gray-200"
                            }`}
                          >
                            <img src={p.url} alt={p.name} className="w-full h-24 object-cover" />
                            <div className="p-2 text-xs text-gray-600 truncate">{p.name}</div>

                            <button
                              type="button"
                              onClick={() => setEditImagePrimaryIndex(idx)}
                              className="absolute top-2 left-2 text-[11px] px-2 py-1 rounded bg-white/90 border border-gray-200 hover:border-pink-300"
                            >
                              {idx === editImagePrimaryIndex ? "Ảnh chính" : "Chọn chính"}
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                const next = editImageFiles.filter((_, i) => i !== idx);
                                setEditImageFiles(next);
                                setEditImagePrimaryIndex((pi) => {
                                  if (idx === pi) return 0;
                                  if (idx < pi) return Math.max(0, pi - 1);
                                  return pi;
                                });
                              }}
                              className="absolute top-2 right-2 p-1 rounded bg-white/90 border border-gray-200 hover:border-red-300"
                              title="Xoá ảnh"
                            >
                              <X className="w-4 h-4 text-gray-700" />
                            </button>
                          </div>
                        ))}
                      </div>

                      <button
                        type="button"
                        onClick={uploadImagesInEditModal}
                        disabled={uploadingEditImages}
                        className={`mt-3 w-full py-2.5 rounded-lg font-semibold transition-colors ${
                          uploadingEditImages
                            ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                            : "bg-pink-500 hover:bg-pink-600 text-white"
                        }`}
                      >
                        {uploadingEditImages ? "Đang upload..." : "Upload ảnh"}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </Modal>
        </div>
      )}

      {/* ===============================
          Category Form + List
      =============================== */}
      {activeTab === "category" && (
        <div className="space-y-4">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <form onSubmit={handleCategorySubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Tên Danh Mục *
                  </label>
                  <input
                    type="text"
                    value={categoryForm.name}
                    onChange={(e) =>
                      setCategoryForm({ ...categoryForm, name: e.target.value })
                    }
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent outline-none"
                    placeholder="VD: Kem dưỡng da"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    CODE *
                  </label>
                  <input
                    type="text"
                    value={categoryForm.code}
                    onChange={(e) =>
                      setCategoryForm({
                        ...categoryForm,
                        code: e.target.value.toUpperCase(),
                      })
                    }
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent outline-none"
                    placeholder="VD: SON"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Order
                  </label>
                  <input
                    type="number"
                    value={categoryForm.order}
                    onChange={(e) =>
                      setCategoryForm({ ...categoryForm, order: e.target.value })
                    }
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent outline-none"
                    placeholder="1"
                    min={1}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={creating}
                className={`w-full py-3 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2 ${
                  creating
                    ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                    : "bg-pink-500 hover:bg-pink-600 text-white"
                }`}
              >
                <Plus className="w-5 h-5" />
                {creating ? "Đang tạo..." : "Thêm Danh Mục"}
              </button>
            </form>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-800 mb-4">
              Danh Sách ({categories.length})
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {categories?.map((cat) => (
                <div
                  key={cat._id}
                  className="bg-gray-50 border border-gray-200 rounded-lg p-4 hover:border-pink-300 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="text-xl font-bold text-pink-600">{cat.code}</div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-800">{cat.name}</h4>
                      <p className="text-sm text-gray-600">Order: {cat.order ?? "-"}</p>
                    </div>

                    <button
                      type="button"
                      onClick={() => openEditCategory(cat)}
                      className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 text-sm font-semibold"
                    >
                      <Pencil className="w-4 h-4" />
                      Sửa
                    </button>
                  </div>
                </div>
              ))}

              {categories.length === 0 && (
                <div className="text-sm text-gray-500">Chưa có danh mục nào.</div>
              )}
            </div>
          </div>

          {/* ✅ Edit Category Modal */}
          <Modal
            open={editCategoryOpen}
            onCancel={() => setEditCategoryOpen(false)}
            onOk={saveEditCategory}
            okText={savingEdit ? "Đang lưu..." : "Lưu"}
            cancelText="Đóng"
            confirmLoading={savingEdit}
            title="Sửa danh mục"
          >
            <div className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-gray-700">CODE *</label>
                  <input
                    value={editCategory.code}
                    onChange={(e) =>
                      setEditCategory({ ...editCategory, code: e.target.value.toUpperCase() })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Tên *</label>
                  <input
                    value={editCategory.name}
                    onChange={(e) => setEditCategory({ ...editCategory, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">Order</label>
                <input
                  type="number"
                  value={editCategory.order}
                  onChange={(e) =>
                    setEditCategory({ ...editCategory, order: Number(e.target.value || 1) })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none"
                />
              </div>

              <label className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={!!editCategory.isActive}
                  onChange={(e) => setEditCategory({ ...editCategory, isActive: e.target.checked })}
                />
                <span className="text-sm text-gray-700">Đang dùng (isActive)</span>
              </label>
            </div>
          </Modal>
        </div>
      )}
    </div>
  );
};

export default ProductInputSection;
