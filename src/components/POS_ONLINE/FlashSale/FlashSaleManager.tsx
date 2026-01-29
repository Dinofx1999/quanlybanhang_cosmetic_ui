import React, { useEffect, useState } from "react";
import {
  Button,
  Input,
  Table,
  Modal,
  Form,
  InputNumber,
  DatePicker,
  Switch,
  Tag,
  message,
  Drawer,
  Select,
  Space,
  Tooltip,
  AutoComplete,
    Upload,  
} from "antd";
import { Plus, Edit, Trash2, Flame, Boxes, ToggleLeft, ToggleRight ,  UploadCloud  } from "lucide-react";
import dayjs from "dayjs";
import api from "../../../services/api";

const { RangePicker } = DatePicker;
const { TextArea } = Input;

/* ================= TYPES ================= */

type FlashSale = {
  _id: string;
  name: string;
  code: string;
  description?: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  status: string;
  banner?: string;
  priority?: number;
  totalProducts?: number;
  totalVariants?: number;
};

type FlashSaleVariant = {
  _id: string;
  variantId: string;
  productId: string;
  productName: string;
  productBrand?: string;
  sku?: string;
  name: string;
  attributes?: any[];
  originalPrice: number;
  flashPrice: number;
  discountPercent: number;
  discountAmount: number;
  limitedQuantity?: number | null;
  soldQuantity?: number;
  remainingQuantity?: number | null;
  maxPerCustomer?: number | null;
  badge?: string;
  order?: number;
  thumbnail?: string;
};

type VariantOption = {
  _id: string;
  productId: string;
  productName: string;
  name: string;
  sku: string;
  price: number;
  attributes?: any[];
  thumbnail?: string;          // ✅ add
  productThumbnail?: string;   // ✅ optional
};

/* ================= COMPONENT ================= */

export default function FlashSaleManager() {
  const [bannerFileList, setBannerFileList] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [list, setList] = useState<FlashSale[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<FlashSale | null>(null);

  // ✅ variant manager
  const [openVariants, setOpenVariants] = useState(false);
  const [currentFlashSale, setCurrentFlashSale] = useState<FlashSale | null>(null);
  const [variants, setVariants] = useState<FlashSaleVariant[]>([]);
  const [availableVariants, setAvailableVariants] = useState<VariantOption[]>([]);
  const [manualInput, setManualInput] = useState(false);
  const [searchVariant, setSearchVariant] = useState<string>("");

  const [form] = Form.useForm();
  const [variantForm] = Form.useForm();

  /* ================= FETCH FLASH SALES ================= */

  const fetchFlashSales = async () => {
    setLoading(true);
    try {
      const res = await api.get("/flashsales");
      setList(res.data?.items || []);
    } catch {
      message.error("Không tải được Flash Sale");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFlashSales();
  }, []);

  /* ================= FETCH VARIANTS ================= */

  const fetchFlashSaleVariants = async (flashSaleId: string) => {
    try {
      const res = await api.get(`/flashsales/${flashSaleId}`);
      console.log("Flash Sale details:", res.data?.flashSale.variants);
      setVariants(res.data?.flashSale.variants || []);
    } catch (error) {
      message.error("Không tải được sản phẩm Flash Sale");
      console.error(error);
    }
  };

  const fetchAvailableVariants = async (search?: string) => {
    try {
      // Thử nhiều endpoint có thể có
      let res;
      const params: any = { limit: 100, page: 1 };
      if (search) params.q = search;
      
      try {
        // Thử endpoint 1: /product-variants
        res = await api.get("/product-variants", { params });
      } catch (err: any) {
        console.warn("Endpoint /product-variants failed, trying /variants...", err.response?.status);
        try {
          // Thử endpoint 2: /variants
          res = await api.get("/variants", { params });
        } catch (err2: any) {
        //   console.warn("Endpoint /variants failed, trying /products...", err2.response?.status);
         // Thử endpoint 3: Lấy products (mode=product) và map về defaultVariantId
res = await api.get("/products", { params: { ...params, mode: "pos" } });

if (res.data) {
  const items = res.data?.items || res.data?.data || [];

  const flatVariants: VariantOption[] = items
    .filter((x: any) => x?.isVariant && x?._id && x?.productId) // ✅ chỉ lấy variant thật
    .map((v: any) => ({
      _id: String(v._id),                  // ✅ variantId thật
      productId: String(v.productId),      // ✅ productId
      productName: String(v.name || "N/A"),// ✅ để hiển thị (vì API pos không có productName riêng)
      name: String(v.name || ""),          // ✅ tên variant
      sku: String(v.sku || ""),
      price: Number(v.price || 0),
      attributes: Array.isArray(v.attributes) ? v.attributes : [],
      thumbnail: String(v.thumbnail || ""),
      productThumbnail: String(v.thumbnail || ""), // optional
    }));

  setAvailableVariants(flatVariants);
  return;
}

        }
      }
      
      // Parse response - có thể có cấu trúc khác nhau
      const items = res.data?.items || res.data?.data || res.data?.variants || res.data || [];
      
      // Transform data nếu cần
      const transformed = items.map((item: any) => ({
        _id: item._id || item.id,
        productId: item.productId?._id || item.productId || item.product?._id,
        productName: item.productId?.name || item.productName || item.product?.name || "N/A",
        name: item.name || item.variantName || "",
        sku: item.sku || "",
        price: item.price || 0,
        attributes: item.attributes || [],
      }));
      
      setAvailableVariants(transformed);
    } catch (error: any) {
      console.error("Fetch variants error:", error);
      message.error(`Không tải được danh sách variants: ${error.response?.data?.message || error.message}`);
      // Set empty array để không block UI
      setAvailableVariants([]);
    }
  };

  /* ================= ACTIONS FLASH SALE ================= */

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({
      isActive: true,
      status: "DRAFT",
      priority: 0,
    });
    setBannerFileList([]);
    setOpen(true);
  };

  const openEdit = (fs: FlashSale) => {
    setEditing(fs);
    form.setFieldsValue({
      name: fs.name,
      code: fs.code,
      description: fs.description,
      time: [dayjs(fs.startDate), dayjs(fs.endDate)],
      isActive: fs.isActive,
      status: fs.status,
      banner: fs.banner,
      priority: fs.priority || 0,
    });
    // ✅ show preview nếu đã có banner
  if (fs.banner) {
    setBannerFileList([
      {
        uid: "banner-1",
        name: "banner",
        status: "done",
        url: fs.banner,
      },
    ]);
  } else {
    setBannerFileList([]);
  }
    setOpen(true);
  };

  const submit = async () => {
    try {
      const values = await form.validateFields();
      const payload = {
        name: values.name,
        code: values.code,
        description: values.description || "",
        startDate: values.time[0].toISOString(),
        endDate: values.time[1].toISOString(),
        isActive: values.isActive,
        status: values.status || "DRAFT",
        banner: values.banner || "",
        priority: values.priority || 0,
      };

      if (editing) {
        await api.put(`/flashsales/${editing._id}`, payload);
        message.success("Đã cập nhật Flash Sale");
      } else {
        await api.post("/flashsales", payload);
        message.success("Đã tạo Flash Sale");
      }
      setOpen(false);
      fetchFlashSales();
    } catch (error) {
      message.error("Lưu Flash Sale thất bại");
      console.error(error);
    }
  };

  const remove = async (id: string) => {
    Modal.confirm({
      title: "Xóa Flash Sale?",
      content: "Hành động này không thể hoàn tác",
      okType: "danger",
      onOk: async () => {
        try {
          await api.delete(`/flashsales/${id}`);
          message.success("Đã xóa");
          fetchFlashSales();
        } catch (error) {
          message.error("Xóa thất bại");
          console.error(error);
        }
      },
    });
  };

  const toggleActivate = async (fs: FlashSale) => {
    try {
      if (fs.isActive && fs.status === "ACTIVE") {
        await api.post(`/flashsales/${fs._id}/deactivate`);
        message.success("Đã tắt Flash Sale");
      } else {
        await api.post(`/flashsales/${fs._id}/activate`);
        message.success("Đã kích hoạt Flash Sale");
      }
      fetchFlashSales();
    } catch (error) {
      message.error("Thao tác thất bại");
      console.error(error);
    }
  };

  /* ================= ACTIONS VARIANTS ================= */

  const openVariantManager = async (fs: FlashSale) => {
    setCurrentFlashSale(fs);
    setOpenVariants(true);
    setManualInput(false);
    variantForm.resetFields();
    setSearchVariant("");
    await fetchFlashSaleVariants(fs._id);
    await fetchAvailableVariants();
  };

  const handleSearchVariant = async (value: string) => {
    setSearchVariant(value);
    await fetchAvailableVariants(value);
  };

  const addVariant = async () => {
    if (!currentFlashSale) return;
    
    try {
      const values = await variantForm.validateFields();

      // Nếu manual input, không cần tìm variant
      let discountPercent = values.discountPercent || 0;
      
      if (!manualInput) {
        // Tìm variant được chọn để lấy giá gốc
        const selectedVariant = availableVariants.find(v => v._id === values.variantId);
        if (!selectedVariant) {
          message.error("Không tìm thấy variant");
          return;
        }

        // Tính discount percent nếu chưa có
        if (!discountPercent && selectedVariant.price > 0) {
          discountPercent = Math.round(
            ((selectedVariant.price - values.flashPrice) / selectedVariant.price) * 100
          );
        }
      }

      const payload = {
        variants: [
          {
            variantId: values.variantId,
            flashPrice: values.flashPrice,
            discountPercent: discountPercent || 0,
            limitedQuantity: values.limitedQuantity || null,
            maxPerCustomer: values.maxPerCustomer || null,
            badge: values.badge || "",
            order: values.order || 0,
            isActive: true,
          },
        ],
      };

      await api.post(`/flashsales/${currentFlashSale._id}/variants`, payload);
      message.success("Đã thêm variant");
      variantForm.resetFields();
      fetchFlashSaleVariants(currentFlashSale._id);
    } catch (error: any) {
      const errMsg = error.response?.data?.message || error.message;
      message.error(`Thêm variant thất bại: ${errMsg}`);
      console.error(error);
    }
  };

  const removeVariant = async (variantId: string) => {
    if (!currentFlashSale) return;
    
    Modal.confirm({
      title: "Xoá variant khỏi Flash Sale?",
      content: "Hành động này không thể hoàn tác",
      okType: "danger",
      onOk: async () => {
        try {
          await api.delete(`/flashsales/${currentFlashSale._id}/variants/${variantId}`);
          message.success("Đã xoá");
          fetchFlashSaleVariants(currentFlashSale._id);
        } catch (error) {
          message.error("Xóa thất bại");
          console.error(error);
        }
      },
    });
  };

  /* ================= TABLES ================= */

  const getStatusTag = (status: string, isActive: boolean) => {
    if (!isActive) return <Tag color="default">TẮT</Tag>;
    
    switch (status) {
      case "ACTIVE":
        return <Tag color="green">ĐANG CHẠY</Tag>;
      case "SCHEDULED":
        return <Tag color="blue">ĐÃ LÊN LỊCH</Tag>;
      case "ENDED":
        return <Tag color="orange">ĐÃ KẾT THÚC</Tag>;
      case "CANCELLED":
        return <Tag color="red">ĐÃ HỦY</Tag>;
      default:
        return <Tag color="default">NHÁP</Tag>;
    }
  };


  const attrsText = (attrs: any[]) =>
  (attrs || []).map((a) => `${a.k}: ${a.v}`).join(", ");

// tạo map để lấy nhanh record theo id
const variantMap = React.useMemo(() => {
  const m = new Map<string, VariantOption>();
  for (const v of availableVariants) m.set(String(v._id), v);
  return m;
}, [availableVariants]);


  const columns = [
    {
      title: "Tên Flash Sale",
      dataIndex: "name",
      render: (v: string, r: FlashSale) => (
        <div>
          <div className="font-bold">{v}</div>
          <div className="text-xs text-gray-500">{r.description}</div>
        </div>
      ),
    },
    {
      title: "Code",
      dataIndex: "code",
      width: 120,
      render: (v: string) => <Tag color="pink">{v}</Tag>,
    },
    {
      title: "Thời gian",
      width: 160,
      render: (_: any, r: FlashSale) => (
        <div className="text-xs">
          <div>{dayjs(r.startDate).format("DD/MM HH:mm")}</div>
          <div>→ {dayjs(r.endDate).format("DD/MM HH:mm")}</div>
        </div>
      ),
    },
    {
      title: "Sản phẩm",
      width: 100,
      render: (_: any, r: FlashSale) => (
        <div className="text-center">
          <div className="font-bold text-pink-600">{r.totalProducts || 0}</div>
          <div className="text-xs text-gray-500">variants: {r.totalVariants || 0}</div>
        </div>
      ),
    },
    {
      title: "Ưu tiên",
      dataIndex: "priority",
      width: 80,
      render: (v: number) => <Tag color="purple">{v || 0}</Tag>,
    },
    {
      title: "Trạng thái",
      width: 120,
      render: (_: any, r: FlashSale) => getStatusTag(r.status, r.isActive),
    },
    {
      title: "Hành động",
      width: 280,
      fixed: "right" as const,
      render: (_: any, r: FlashSale) => (
        <Space size="small">
          <Tooltip title={r.isActive && r.status === "ACTIVE" ? "Tắt" : "Kích hoạt"}>
            <Button
              size="small"
              type={r.isActive && r.status === "ACTIVE" ? "primary" : "default"}
              danger={r.isActive && r.status === "ACTIVE"}
              onClick={() => toggleActivate(r)}
            >
              {r.isActive && r.status === "ACTIVE" ? (
                <ToggleRight size={14} />
              ) : (
                <ToggleLeft size={14} />
              )}
            </Button>
          </Tooltip>

          <Button size="small" onClick={() => openEdit(r)} icon={<Edit size={14} />}>
            Sửa
          </Button>

          <Button
            size="small"
            type="primary"
            className="!bg-pink-600 !border-pink-600"
            onClick={() => openVariantManager(r)}
            icon={<Boxes size={14} />}
          >
            SP
          </Button>

          <Button danger size="small" onClick={() => remove(r._id)} icon={<Trash2 size={14} />} />
        </Space>
      ),
    },
  ];

  const variantColumns = [
    {
  title: "Sản phẩm",
  width: 300,
  render: (_: any, r: FlashSaleVariant) => (
    <div className="flex gap-3">
      {/* Thumbnail */}
      <img
        src={r.thumbnail || "/placeholder.png"}
        alt={r.name}
        className="w-12 h-12 rounded-lg object-cover border border-gray-200 flex-shrink-0"
        onError={(e) => {
          (e.currentTarget as HTMLImageElement).src = "/placeholder.png";
        }}
      />

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-sm truncate">
          {r.productName}
        </div>

        <div className="text-xs text-gray-500 truncate">
          {r.name}
          {r.sku && <span className="ml-1">({r.sku})</span>}
        </div>

        {r.badge && (
          <Tag color="red" className="mt-1 text-xs px-1">
            {r.badge}
          </Tag>
        )}
      </div>
    </div>
  ),
},

    {
      title: "Giá gốc",
      dataIndex: "originalPrice",
      width: 100,
      render: (v: number) => (
        <span className="text-gray-500 line-through">
          {v.toLocaleString("vi-VN")}đ
        </span>
      ),
    },
    {
      title: "Giá Sale",
      width: 120,
      render: (_: any, r: FlashSaleVariant) => (
        <div>
          <div className="font-bold text-pink-600">
            {r.flashPrice.toLocaleString("vi-VN")}đ
          </div>
          <Tag color="red" className="text-xs">-{r.discountPercent}%</Tag>
        </div>
      ),
    },
    {
      title: "Đã bán",
      dataIndex: "soldQuantity",
      width: 80,
      render: (v: number) => <span className="font-medium">{v || 0}</span>,
    },
    {
      title: "Giới hạn",
      width: 80,
      render: (_: any, r: FlashSaleVariant) => {
        if (r.limitedQuantity == null) return <Tag color="green">∞</Tag>;
        return (
          <div>
            <div className="font-medium">{r.limitedQuantity}</div>
            {r.remainingQuantity != null && (
              <div className="text-xs text-gray-500">còn: {r.remainingQuantity}</div>
            )}
          </div>
        );
      },
    },
    {
      title: "Max/KH",
      dataIndex: "maxPerCustomer",
      width: 80,
      render: (v: number | null) => v || "∞",
    },
    {
      title: "Thứ tự",
      dataIndex: "order",
      width: 70,
      render: (v: number) => v || 0,
    },
    {
      title: "",
      width: 60,
      fixed: "right" as const,
      render: (_: any, r: FlashSaleVariant) => (
        <Button
          danger
          size="small"
          onClick={() => removeVariant(r.variantId)}
          icon={<Trash2 size={14} />}
        />
      ),
    },
  ];

  /* ================= DEBUG HELPER ================= */
  
  const testEndpoints = async () => {
    const endpoints = [
      "/product-variants",
      "/variants", 
      "/products",
      "/flashsales",
    ];
    
    console.group("🔍 API Endpoints Test");
    for (const endpoint of endpoints) {
      try {
        const res = await api.get(endpoint, { params: { limit: 1 } });
        console.log(`✅ ${endpoint}:`, res.status, res.data);
      } catch (error: any) {
        console.log(`❌ ${endpoint}:`, error.response?.status, error.response?.data);
      }
    }
    console.groupEnd();
    message.info("Kiểm tra console để xem kết quả");
  };

  /* ================= RENDER ================= */
  const uploadBanner = async (file: File): Promise<string> => {
  // ✅ anh đổi endpoint theo backend của anh
  // gợi ý: /upload/single hoặc /uploads hoặc /files
  const formData = new FormData();
  formData.append("file", file);

  const res = await api.post("/uploads/flashsale-banner", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

  // ✅ tùy response backend: {url} hoặc {data:{url}} hoặc {path}
  console.log("Upload response:", res);
  const url =
    res.data?.file?.url ||
    res.data?.data?.url ||
    res.data?.path ||
    res.data?.data?.path ||
    "";

  if (!url) throw new Error("Upload xong nhưng không nhận được URL");

  return String(url);
};

  return (
    <div className="p-5 bg-white rounded-2xl border border-pink-100 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Flame className="text-pink-600" size={24} />
          <h2 className="text-xl font-extrabold text-gray-800">Quản lý Flash Sale</h2>
        </div>

        <Space>
          {process.env.NODE_ENV === "development" && (
            <Button size="large" onClick={testEndpoints}>
              🔍 Test API
            </Button>
          )}
          <Button
            type="primary"
            size="large"
            icon={<Plus size={18} />}
            className="!bg-pink-600 !border-pink-600 hover:!bg-pink-700"
            onClick={openCreate}
          >
            Tạo Flash Sale
          </Button>
        </Space>
      </div>

      <Table
        rowKey="_id"
        loading={loading}
        dataSource={list}
        columns={columns}
        pagination={{ pageSize: 10, showSizeChanger: true }}
        scroll={{ x: 1200 }}
      />

      {/* ===== MODAL CREATE / EDIT FLASH SALE ===== */}
      <Modal
        open={open}
        onCancel={() => setOpen(false)}
        onOk={submit}
        title={
          <div className="flex items-center gap-2">
            <Flame className="text-pink-600" size={20} />
            <span>{editing ? "Cập nhật Flash Sale" : "Tạo Flash Sale"}</span>
          </div>
        }
        okText="Lưu"
        cancelText="Hủy"
        width={600}
        destroyOnClose
      >
        <Form layout="vertical" form={form} className="mt-4">
          <Form.Item
            label="Tên Flash Sale"
            name="name"
            rules={[{ required: true, message: "Vui lòng nhập tên" }]}
          >
            <Input placeholder="VD: Flash Sale Tết 2025" />
          </Form.Item>

          <Form.Item
            label="Code (Mã duy nhất)"
            name="code"
            rules={[{ required: true, message: "Vui lòng nhập code" }]}
          >
            <Input placeholder="VD: TET2025" />
          </Form.Item>

          <Form.Item label="Mô tả" name="description">
            <TextArea rows={3} placeholder="Mô tả ngắn về flash sale..." />
          </Form.Item>

          <Form.Item
            label="Thời gian"
            name="time"
            rules={[{ required: true, message: "Vui lòng chọn thời gian" }]}
          >
            <RangePicker
              showTime={{ format: "HH:mm" }}
              format="DD/MM/YYYY HH:mm"
              className="w-full"
              placeholder={["Bắt đầu", "Kết thúc"]}
            />
          </Form.Item>

          <div className="grid grid-cols-2 gap-4">
            <Form.Item label="Trạng thái" name="status">
              <Select>
                <Select.Option value="DRAFT">Nháp</Select.Option>
                <Select.Option value="SCHEDULED">Đã lên lịch</Select.Option>
                <Select.Option value="ACTIVE">Đang chạy</Select.Option>
                <Select.Option value="ENDED">Đã kết thúc</Select.Option>
                <Select.Option value="CANCELLED">Đã hủy</Select.Option>
              </Select>
            </Form.Item>

            <Form.Item label="Độ ưu tiên" name="priority">
              <InputNumber min={0} className="w-full" placeholder="0" />
            </Form.Item>
          </div>

          <Form.Item label="Banner (Upload ảnh)">
  <Upload
    accept="image/*"
    listType="picture-card"
    fileList={bannerFileList}
    maxCount={1}
    onRemove={() => {
      setBannerFileList([]);
      form.setFieldsValue({ banner: "" });
    }}
    customRequest={async ({ file, onSuccess, onError }: any) => {
      try {
        const url = await uploadBanner(file as File);

        // ✅ set vào form field banner để submit giữ nguyên logic cũ
        form.setFieldsValue({ banner: url });

        setBannerFileList([
          {
            uid: "banner-1",
            name: (file as File).name,
            status: "done",
            url,
          },
        ]);

        onSuccess?.("ok");
        message.success("Upload banner thành công");
      } catch (e: any) {
        onError?.(e);
        message.error(e?.message || "Upload banner thất bại");
      }
    }}
  >
    {bannerFileList.length >= 1 ? null : (
      <div className="flex flex-col items-center justify-center gap-1">
        <UploadCloud size={18} />
        <div className="text-xs">Upload</div>
      </div>
    )}
  </Upload>

  {/* ✅ nếu anh vẫn muốn cho nhập tay URL */}
  <Form.Item name="banner" className="mt-2 mb-0">
    <Input placeholder="Hoặc dán URL banner..." />
  </Form.Item>
</Form.Item>


          <Form.Item label="Kích hoạt" name="isActive" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>

      {/* ===== DRAWER VARIANTS ===== */}
      <Drawer
        open={openVariants}
        onClose={() => setOpenVariants(false)}
        width={1000}
        title={
          <div className="flex items-center gap-2">
            <Boxes className="text-pink-600" />
            <span>
              Quản lý sản phẩm{currentFlashSale ? `: ${currentFlashSale.name}` : ""}
            </span>
          </div>
        }
        destroyOnClose
      >
        <div className="mb-4 p-4 bg-pink-50 rounded-lg border border-pink-200">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-pink-800">Thêm variant vào Flash Sale</h3>
            <Button
              size="small"
              type="link"
              onClick={() => setManualInput(!manualInput)}
            >
              {manualInput ? "Chọn từ danh sách" : "Nhập thủ công"}
            </Button>
          </div>
          
          <Form layout="vertical" form={variantForm}>
            <div className="grid grid-cols-2 gap-3">
              {manualInput ? (
                <Form.Item
                  name="variantId"
                  rules={[{ required: true, message: "Nhập variant ID" }]}
                  extra="Nhập ObjectId của variant (24 ký tự hex)"
                >
                  <Input
                    placeholder="VD: 507f1f77bcf86cd799439011"
                    maxLength={24}
                  />
                </Form.Item>
              ) : (
                <>
  {/* ✅ field thật để submit */}
  <Form.Item name="variantId" hidden rules={[{ required: true, message: "Chọn variant" }]}>
    <Input />
  </Form.Item>

  {/* ✅ field hiển thị */}
  <Form.Item
    name="variantLabel"
    rules={[{ required: true, message: "Chọn variant" }]}
  >
    <AutoComplete
      placeholder="Tìm và chọn variant..."
      style={{ width: "100%" }}
      onSearch={handleSearchVariant}      // search server
      filterOption={false}
      options={availableVariants.map((v) => {
        const showName = `${v.productName} — ${v.name || "Default"}`;
        const sub = `${v.sku || "NO-SKU"} • ${Number(v.price || 0).toLocaleString("vi-VN")}đ${
          v.attributes?.length ? ` • ${attrsText(v.attributes)}` : ""
        }`;

        return {
          value: showName,                // ✅ cái này sẽ hiện trong input
          // ✅ quan trọng: dùng key = variantId để biết đang chọn id nào
          key: String(v._id),
          label: (
            <div className="flex items-center gap-2 py-1">
              <img
                src={v.thumbnail || "/placeholder.png"}
                className="w-9 h-9 rounded-lg object-cover border"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = "/placeholder.png";
                }}
              />
              <div className="leading-tight min-w-0">
                <div className="font-semibold truncate">{showName}</div>
                <div className="text-xs text-gray-500 truncate">{sub}</div>
              </div>
            </div>
          ),
        };
      })}
      notFoundContent={
        availableVariants.length === 0 ? (
          <div className="text-center py-3">
            <div className="text-gray-400 mb-2">Không tìm thấy variants</div>
            <Button size="small" type="link" onClick={() => setManualInput(true)}>
              Nhập thủ công
            </Button>
          </div>
        ) : null
      }
      onSelect={(value, option: any) => {
        // option.key chính là variantId
        variantForm.setFieldsValue({
          variantId: String(option?.key || ""),
          variantLabel: value, // giữ text hiển thị
        });
      }}
      onChange={(txt) => {
        // nếu user xoá text => xoá luôn variantId để validate lại
        if (!txt) variantForm.setFieldsValue({ variantId: "" });
      }}
    />
  </Form.Item>
</>

              )}

              <Form.Item
                name="flashPrice"
                rules={[{ required: true, message: "Nhập giá flash" }]}
              >
                <InputNumber
                  min={0}
                  placeholder="Giá flash"
                  className="w-full"
                  formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
                  addonAfter="đ"
                />
              </Form.Item>

              <Form.Item name="limitedQuantity">
                <InputNumber
                  min={0}
                  placeholder="Giới hạn số lượng (để trống = không giới hạn)"
                  className="w-full"
                />
              </Form.Item>

              <Form.Item name="maxPerCustomer">
                <InputNumber
                  min={0}
                  placeholder="Max/khách hàng (để trống = không giới hạn)"
                  className="w-full"
                />
              </Form.Item>

              <Form.Item name="badge">
                <Input placeholder="Badge (VD: HOT, NEW...)" />
              </Form.Item>

              <Form.Item name="order">
                <InputNumber min={0} placeholder="Thứ tự hiển thị" className="w-full" />
              </Form.Item>
            </div>

            <Button
              type="primary"
              onClick={addVariant}
              className="!bg-pink-600 !border-pink-600 hover:!bg-pink-700 w-full"
              icon={<Plus size={16} />}
            >
              Thêm variant
            </Button>
          </Form>
        </div>

        <Table
          rowKey="variantId"
          dataSource={variants}
          columns={variantColumns}
          pagination={false}
          size="small"
          scroll={{ x: 900 }}
        />
      </Drawer>
    </div>
  );
}