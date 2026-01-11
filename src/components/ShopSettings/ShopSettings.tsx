import React, { useEffect, useMemo, useState } from "react";
import {
  Card,
  Tabs,
  Form,
  Input,
  InputNumber,
  Switch,
  Button,
  Select,
  Space,
  Divider,
  Upload,
  message,
  TimePicker,
  Row,
  Col,
  Typography,
  Alert,
  Modal,
  Popconfirm,
  Tag,
} from "antd";
import type { UploadProps } from "antd";
import dayjs, { Dayjs } from "dayjs";
import api from "../../services/api";

const { Title, Text } = Typography;

type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

// ==========================
// Receipt Template Blocks
// ==========================
type ReceiptBlockType =
  | "LOGO"
  | "BRAND_NAME"
  | "SHOP_NAME"
  | "ADDRESS"
  | "PHONE"
  | "TAX_CODE"
  | "ORDER_META"
  | "ITEMS_TABLE"
  | "TOTALS"
  | "PAYMENT"
  | "FOOTER_TEXT";

type ReceiptBlock = {
  id: string;
  type: ReceiptBlockType;
  enabled: boolean;
  align?: "left" | "center" | "right";
  fontSize?: number;
  bold?: boolean;
  text?: string;
};

const genId = () => `${Date.now()}_${Math.random().toString(16).slice(2)}`;

const DEFAULT_RECEIPT_TEMPLATE: ReceiptBlock[] = [
  { id: genId(), type: "LOGO", enabled: true, align: "center" },
  { id: genId(), type: "BRAND_NAME", enabled: true, align: "center", bold: true, fontSize: 14 },
  { id: genId(), type: "ADDRESS", enabled: true, align: "center", fontSize: 11 },
  { id: genId(), type: "PHONE", enabled: true, align: "center", fontSize: 11 },
  { id: genId(), type: "ORDER_META", enabled: true, align: "left", fontSize: 11 },
  { id: genId(), type: "ITEMS_TABLE", enabled: true, align: "left", fontSize: 11 },
  { id: genId(), type: "TOTALS", enabled: true, align: "left", bold: true, fontSize: 12 },
  { id: genId(), type: "PAYMENT", enabled: true, align: "left", fontSize: 11 },
  { id: genId(), type: "FOOTER_TEXT", enabled: true, align: "center", fontSize: 11, text: "Cảm ơn quý khách!" },
];

// ==========================
// DTO settings
// ==========================
type ShopSettingsDTO = {
  branchId: string;

  name: string;
  brandName?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  logoUrl?: string;

  timezone?: string;
  openDays: Weekday[];
  openTime: string;
  closeTime: string;
  allowNegativeStock: boolean;
  allowEditPriceAtPOS: boolean;
  requireCustomerForPoints: boolean;
  defaultCustomerId?: string | null;

  receipt: {
    paperSize: "56mm" | "80mm";
    showLogo: boolean;
    showQRCode: boolean;
    showBarcode: boolean;
    footerNote?: string;
    autoPrintAfterPaid: boolean;
    printCopies: number;
    template?: ReceiptBlock[];
  };

  tax: {
    enableVAT: boolean;
    vatPercent: number;
    showVATOnReceipt: boolean;
    companyName?: string;
    taxCode?: string;
    invoiceNote?: string;
  };

  loyalty: {
    enable: boolean;
    earnRate: number;
    earnUnitVnd: number;
    redeemEnable: boolean;
    redeemValueVndPerPoint: number;
    pointsExpireDays: number;
    birthdayBonusPoints: number;
  };

  online: {
    enableOnlineOrders: boolean;
    autoConfirmPaidByBank: boolean;
    orderNotifyZalo?: boolean;
    orderNotifyTelegram?: boolean;
    notifyPhone?: string;
  };
};

type Props = {
  branchId: string;
  customers?: { _id: string; name: string; phone?: string }[];
};

const DEFAULT_SETTINGS: Omit<ShopSettingsDTO, "branchId"> = {
  name: "",
  brandName: "",
  phone: "",
  email: "",
  address: "",
  city: "",
  logoUrl: "",

  timezone: "Asia/Ho_Chi_Minh",
  openDays: [1, 2, 3, 4, 5, 6, 0],
  openTime: "08:00",
  closeTime: "22:00",
  allowNegativeStock: false,
  allowEditPriceAtPOS: false,
  requireCustomerForPoints: true,
  defaultCustomerId: null,

  receipt: {
    paperSize: "56mm",
    showLogo: true,
    showQRCode: true,
    showBarcode: true,
    footerNote: "Cảm ơn quý khách!",
    autoPrintAfterPaid: true,
    printCopies: 1,
    template: [],
  },

  tax: {
    enableVAT: false,
    vatPercent: 8,
    showVATOnReceipt: true,
    companyName: "",
    taxCode: "",
    invoiceNote: "",
  },

  loyalty: {
    enable: true,
    earnRate: 1,
    earnUnitVnd: 1000,
    redeemEnable: true,
    redeemValueVndPerPoint: 100,
    pointsExpireDays: 0,
    birthdayBonusPoints: 50,
  },

  online: {
    enableOnlineOrders: false,
    autoConfirmPaidByBank: false,
    orderNotifyZalo: false,
    orderNotifyTelegram: false,
    notifyPhone: "",
  },
};

const WEEKDAY_LABEL: Record<Weekday, string> = {
  0: "CN",
  1: "T2",
  2: "T3",
  3: "T4",
  4: "T5",
  5: "T6",
  6: "T7",
};

const toTimeDayjs = (hhmm: string): Dayjs => {
  const [h, m] = (hhmm || "00:00").split(":").map((x) => Number(x || 0));
  return dayjs().hour(h).minute(m).second(0);
};
const toHHmm = (t: Dayjs | null): string => {
  if (!t) return "00:00";
  return `${String(t.hour()).padStart(2, "0")}:${String(t.minute()).padStart(2, "0")}`;
};

const money = (n: number) => Number(n || 0).toLocaleString("vi-VN");

// ==========================
// Preview bill demo
// ==========================
const renderReceiptPreview = (
  blocks: ReceiptBlock[],
  paper: "56mm" | "80mm",
  data: {
    logoUrl?: string;
    brandName: string;
    shopName: string;
    address: string;
    phone: string;
    taxCode?: string;
  }
) => {
  const w = paper === "80mm" ? 302 : 210;
  const esc = (s: any) =>
    String(s ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");

  const styleOf = (b: ReceiptBlock) => {
    const fs = b.fontSize || 11;
    const fw = b.bold ? 700 : 400;
    const ta = b.align || "left";
    return `style="font-size:${fs}px;font-weight:${fw};text-align:${ta};line-height:1.2;margin:2px 0;"`;
  };

  const demo = {
    order: { code: "HD000123", time: dayjs().format("DD/MM/YYYY HH:mm"), cashier: "NV A" },
    items: [
      { name: "Son môi 4AC - Hồng Hồng", qty: 1, price: 120000 },
      { name: "Kem dưỡng da", qty: 2, price: 85000 },
    ],
    pay: { method: "CASH" },
  };

  const sub = demo.items.reduce((s, it) => s + it.qty * it.price, 0);
  const itemsHtml = demo.items
    .map(
      (it) => `
      <div style="display:flex;gap:6px;">
        <div style="flex:1;min-width:0;">
          ${esc(it.name)}
          <div style="color:#666;font-size:10px;">${it.qty} x ${money(it.price)}</div>
        </div>
        <div style="text-align:right;white-space:nowrap;">${money(it.qty * it.price)}</div>
      </div>`
    )
    .join("");

  const line = `<div style="border-top:1px dashed #bbb;margin:6px 0;"></div>`;

  const blockHtml = (b: ReceiptBlock) => {
    if (!b.enabled) return "";
    switch (b.type) {
      case "LOGO":
        return data.logoUrl
          ? `<div ${styleOf(b)}><img src="${esc(data.logoUrl)}" style="max-height:52px;max-width:100%;object-fit:contain;" /></div>`
          : `<div ${styleOf(b)}><div style="display:inline-block;padding:6px 10px;border:1px dashed #bbb;border-radius:8px;color:#666;">LOGO</div></div>`;
      case "BRAND_NAME":
        return `<div ${styleOf(b)}>${esc(data.brandName)}</div>`;
      case "SHOP_NAME":
        return `<div ${styleOf(b)}>${esc(data.shopName)}</div>`;
      case "ADDRESS":
        return `<div ${styleOf(b)}>${esc(data.address)}</div>`;
      case "PHONE":
        return `<div ${styleOf(b)}>ĐT: ${esc(data.phone)}</div>`;
      case "TAX_CODE":
        return data.taxCode ? `<div ${styleOf(b)}>MST: ${esc(data.taxCode)}</div>` : "";
      case "ORDER_META":
        return `<div style="font-size:${b.fontSize || 11}px;text-align:left;line-height:1.25;margin:2px 0;">
          <div>Mã: <b>${esc(demo.order.code)}</b></div>
          <div>Giờ: ${esc(demo.order.time)}</div>
          <div>Thu ngân: ${esc(demo.order.cashier)}</div>
        </div>`;
      case "ITEMS_TABLE":
        return `${line}<div ${styleOf(b)}>${itemsHtml}</div>${line}`;
      case "TOTALS":
        return `<div ${styleOf(b)} style="text-align:left;">
          <div style="display:flex;justify-content:space-between;"><span>Tạm tính</span><b>${money(sub)}</b></div>
          <div style="display:flex;justify-content:space-between;font-size:13px;"><span>Tổng</span><b>${money(sub)}</b></div>
        </div>`;
      case "PAYMENT":
        return `<div ${styleOf(b)} style="text-align:left;">Thanh toán: <b>${esc(demo.pay.method)}</b></div>`;
      case "FOOTER_TEXT":
        return `<div ${styleOf(b)}>${esc(b.text || "Cảm ơn quý khách!")}</div>`;
      default:
        return "";
    }
  };

  return `
    <div style="
      width:${w}px;background:#fff;border:1px solid #eee;border-radius:10px;
      padding:10px;font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono','Courier New', monospace;
      color:#111;">
      ${blocks.map(blockHtml).filter(Boolean).join("")}
    </div>
  `;
};

// ==========================
// Branch types for Tab "Thông tin cửa hàng"
// ==========================
type BranchItem = {
  _id: string;
  code: string;
  name: string;
  address?: string;
  phone?: string;
  isActive?: boolean;

  brandName?: string;
  email?: string;
  taxCode?: string;
  logo?: string;

  isMain?: boolean;

  receipt?: {
    header?: string;
    footer?: string;
    paperSize?: number; // 56|80
    showLogo?: boolean;
    showTaxCode?: boolean;
    template?: ReceiptBlock[];
  };

  posConfig?: {
    allowNegativeStock?: boolean;
    autoPrintReceipt?: boolean;
    defaultPaymentMethod?: "CASH" | "BANK" | "QR" | "CARD";
  };
};

// ==========================
// Helpers: chỉ gửi field khi có giá trị (không overwrite "")
// ==========================
const normalizeStr = (v: any) => String(v ?? "").trim();
const isNonEmpty = (v: any) => normalizeStr(v) !== "";
const setIfNonEmpty = (obj: any, key: string, v: any) => {
  if (isNonEmpty(v)) obj[key] = normalizeStr(v);
};
const setIfDefined = (obj: any, key: string, v: any) => {
  if (v !== undefined) obj[key] = v;
};

const ShopSettings: React.FC<Props> = ({ branchId, customers = [] }) => {
  const [form] = Form.useForm<ShopSettingsDTO>();
  const [loading, setLoading] = useState(false);
  const [dirty, setDirty] = useState(false);

  const [tpl, setTpl] = useState<ReceiptBlock[]>(DEFAULT_RECEIPT_TEMPLATE);

  const [branches, setBranches] = useState<BranchItem[]>([]);
  const [branchLoading, setBranchLoading] = useState(false);

  const [branchModalOpen, setBranchModalOpen] = useState(false);
  const [branchModalMode, setBranchModalMode] = useState<"create" | "edit">("create");
  const [editingBranch, setEditingBranch] = useState<BranchItem | null>(null);
  const [branchForm] = Form.useForm();

  // ==========================
  // Load branches list (for cards)
  // ==========================
  const loadBranches = async () => {
    setBranchLoading(true);
    try {
      const res = await api.get("/branches");
      const items: BranchItem[] = res.data?.items || res.data?.branches || [];
      setBranches(Array.isArray(items) ? items : []);
    } catch (e: any) {
      message.error(e?.response?.data?.message || e?.message || "Không tải được danh sách cửa hàng");
    } finally {
      setBranchLoading(false);
    }
  };

  // ==========================
  // Load current branch settings
  // ==========================
  const loadData = async () => {
    setLoading(true);
    try {
      // NOTE: API của bạn hiện đang chưa có GET /branches/:id (bạn từng báo 404).
      // Nếu backend đã thêm rồi thì ok, còn không thì bạn nên đổi loadData theo API bạn đang có.
      const res = await api.get(`/branches/${branchId}`);
      if (!res.data?.ok) throw new Error(res.data?.message || "LOAD_FAILED");

      const br = res.data.branch || {};

      const paperSize: "56mm" | "80mm" = (br?.receipt?.paperSize || 56) === 80 ? "80mm" : "56mm";
      const template: ReceiptBlock[] =
        Array.isArray(br?.receipt?.template) && br.receipt.template.length
          ? br.receipt.template
          : DEFAULT_RECEIPT_TEMPLATE.map((b) => ({ ...b, id: genId() }));

      const data: ShopSettingsDTO = {
        ...DEFAULT_SETTINGS,
        branchId,

        name: br?.name || "",
        brandName: br?.brandName || "",
        phone: br?.phone || "",
        email: br?.email || "",
        address: br?.address || "",
        logoUrl: br?.logo || "",

        allowNegativeStock: !!br?.posConfig?.allowNegativeStock,

        receipt: {
          ...DEFAULT_SETTINGS.receipt,
          paperSize,
          showLogo: !!br?.receipt?.showLogo,
          footerNote: br?.receipt?.footer || DEFAULT_SETTINGS.receipt.footerNote,
          autoPrintAfterPaid: br?.posConfig?.autoPrintReceipt ?? DEFAULT_SETTINGS.receipt.autoPrintAfterPaid,
          template,
          showQRCode: br?.receipt?.showQRCode ?? true,
        },

        tax: {
          ...DEFAULT_SETTINGS.tax,
          taxCode: br?.taxCode || "",
        },
      };

      form.setFieldsValue(data);
      setTpl(template);
      setDirty(false);
    } catch (e: any) {
      message.error(e?.response?.data?.message || e?.message || "Không tải được cài đặt cửa hàng");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBranches();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branchId]);

  // ==========================
  // ✅ Save current branch settings (FIX overwrite "")
  // ==========================
  const onSave = async () => {
    try {
      const values = await form.validateFields();

      // ✅ payload chỉ gửi field có ý nghĩa + settings bill
      const payload: any = {};

      // chỉ set nếu user có nhập (không gửi "")
      setIfNonEmpty(payload, "name", values.name);
      setIfNonEmpty(payload, "brandName", values.brandName);
      setIfNonEmpty(payload, "phone", values.phone);
      setIfNonEmpty(payload, "email", values.email);
      setIfNonEmpty(payload, "address", values.address);
      setIfNonEmpty(payload, "logo", values.logoUrl);
      setIfNonEmpty(payload, "taxCode", values.tax?.taxCode);

      // ✅ luôn gửi receipt + posConfig vì đây là thứ bạn đang chỉnh
      payload.receipt = {
        footer: normalizeStr(values.receipt?.footerNote || ""),
        paperSize: values.receipt?.paperSize === "80mm" ? 80 : 56,
        showLogo: !!values.receipt?.showLogo,
        template: tpl,
        showQRCode: !!values.receipt?.showQRCode,
      };

      payload.posConfig = {
        allowNegativeStock: !!values.allowNegativeStock,
        autoPrintReceipt: !!values.receipt?.autoPrintAfterPaid,
      };

      setLoading(true);
      const res = await api.put(`/branches/${branchId}`, payload);
      if (!res.data?.ok) throw new Error(res.data?.message || "SAVE_FAILED");

      message.success("Đã lưu cài đặt");
      setDirty(false);
      loadBranches();
    } catch (e: any) {
      if (e?.errorFields) return;
      message.error(e?.response?.data?.message || e?.message || "Lưu thất bại");
    } finally {
      setLoading(false);
    }
  };

  // ==========================
  // Upload logo (current branch settings)
  // ==========================
  const uploadProps: UploadProps = {
    accept: "image/*",
    showUploadList: false,
    beforeUpload: async (file) => {
      try {
        setLoading(true);

        const fd = new FormData();
        fd.append("file", file as File);

        // ✅ bạn đang dùng endpoint này
        const up = await api.post(`/uploads/branch-logo`, fd, {
          headers: { "Content-Type": "multipart/form-data" },
        });

        const url = up.data?.file?.url;
        if (!up.data?.ok || !url) throw new Error(up.data?.message || "Upload thất bại");

        form.setFieldsValue({ logoUrl: url });
        setDirty(true);
        message.success("Đã cập nhật logo");
      } catch (e: any) {
        message.error(e?.response?.data?.message || e?.message || "Upload logo thất bại");
      } finally {
        setLoading(false);
      }
      return false;
    },
  };

  // ==========================
  // ✅ Upload logo cho MODAL create/edit branch (NEW)
  // ==========================
  const branchLogoUploadProps: UploadProps = {
    accept: "image/*",
    showUploadList: false,
    beforeUpload: async (file) => {
      try {
        setBranchLoading(true);
        const fd = new FormData();
        fd.append("file", file as File);

        const up = await api.post(`/uploads/branch-logo`, fd, {
          headers: { "Content-Type": "multipart/form-data" },
        });

        const url = up.data?.file?.url;
        if (!up.data?.ok || !url) throw new Error(up.data?.message || "Upload thất bại");

        branchForm.setFieldValue("logo", url);
        message.success("Đã upload logo");
      } catch (e: any) {
        message.error(e?.response?.data?.message || e?.message || "Upload logo thất bại");
      } finally {
        setBranchLoading(false);
      }
      return false;
    },
  };

  // ==========================
  // Template builder helpers
  // ==========================
  const syncTpl = (next: ReceiptBlock[]) => {
    setTpl(next);
    form.setFieldValue(["receipt", "template"], next as any);
    setDirty(true);
  };

  const moveBlock = (idx: number, dir: -1 | 1) => {
    const next = [...tpl];
    const to = idx + dir;
    if (to < 0 || to >= next.length) return;
    const tmp = next[idx];
    next[idx] = next[to];
    next[to] = tmp;
    syncTpl(next);
  };
  const toggleBlock = (idx: number, enabled: boolean) => {
    const next = [...tpl];
    next[idx] = { ...next[idx], enabled };
    syncTpl(next);
  };
  const updateBlock = (idx: number, patch: Partial<ReceiptBlock>) => {
    const next = [...tpl];
    next[idx] = { ...next[idx], ...patch };
    syncTpl(next);
  };
  const addBlock = (type: ReceiptBlockType) => {
    const next: ReceiptBlock[] = [...tpl, { id: genId(), type, enabled: true, align: "left", fontSize: 11 }];
    syncTpl(next);
  };
  const removeBlock = (idx: number) => {
    const next = [...tpl];
    next.splice(idx, 1);
    syncTpl(next);
  };
  const resetTpl = () => {
    syncTpl(DEFAULT_RECEIPT_TEMPLATE.map((b) => ({ ...b, id: genId() })));
  };

  // ==========================
  // Branch modal actions (create/edit)
  // ==========================
  const openCreateBranch = () => {
    setBranchModalMode("create");
    setEditingBranch(null);
    branchForm.resetFields();
    branchForm.setFieldsValue({
      code: "",
      name: "",
      address: "",
      phone: "",
      brandName: "",
      email: "",
      taxCode: "",
      logo: "",
      isMain: false,
    });
    setBranchModalOpen(true);
  };

  const openEditBranch = (br: BranchItem) => {
    setBranchModalMode("edit");
    setEditingBranch(br);
    branchForm.resetFields();
    branchForm.setFieldsValue({
      code: br.code || "",
      name: br.name || "",
      address: br.address || "",
      phone: br.phone || "",
      brandName: br.brandName || "",
      email: br.email || "",
      taxCode: br.taxCode || "",
      logo: br.logo || "",
      isMain: !!br.isMain,
    });
    setBranchModalOpen(true);
  };

  const submitBranchModal = async () => {
    try {
      const values = await branchForm.validateFields();
      setBranchLoading(true);

      if (branchModalMode === "create") {
        const payload = {
          code: String(values.code || "").trim(),
          name: String(values.name || "").trim(),
          address: String(values.address || ""),
          phone: String(values.phone || ""),
        };

        const res = await api.post("/branches", payload);
        if (!res.data?.ok) throw new Error(res.data?.message || "CREATE_FAILED");

        const created: BranchItem = res.data.branch;

        // ✅ update thêm các field mở rộng (brand/email/tax/logo/isMain) sau khi create
        if (created?._id) {
          const extra: any = {};
          setIfNonEmpty(extra, "brandName", values.brandName);
          setIfNonEmpty(extra, "email", values.email);
          setIfNonEmpty(extra, "taxCode", values.taxCode);
          setIfNonEmpty(extra, "logo", values.logo);
          setIfDefined(extra, "isMain", !!values.isMain);

          if (Object.keys(extra).length) {
            await api.put(`/branches/${created._id}`, extra);
          }
        }

        message.success("Đã tạo cửa hàng");
      } else {
        if (!editingBranch?._id) throw new Error("Missing branch id");

        // ✅ chỉ gửi field có giá trị hoặc boolean
        const payload: any = {};
        setIfNonEmpty(payload, "code", values.code);
        setIfNonEmpty(payload, "name", values.name);
        setIfNonEmpty(payload, "address", values.address);
        setIfNonEmpty(payload, "phone", values.phone);
        setIfNonEmpty(payload, "brandName", values.brandName);
        setIfNonEmpty(payload, "email", values.email);
        setIfNonEmpty(payload, "taxCode", values.taxCode);
        setIfNonEmpty(payload, "logo", values.logo);
        setIfDefined(payload, "isMain", !!values.isMain);

        const res = await api.put(`/branches/${editingBranch._id}`, payload);
        if (!res.data?.ok) throw new Error(res.data?.message || "UPDATE_FAILED");

        message.success("Đã cập nhật cửa hàng");
      }

      setBranchModalOpen(false);
      await loadBranches();
    } catch (e: any) {
      if (e?.errorFields) return;
      message.error(e?.response?.data?.message || e?.message || "Thao tác thất bại");
    } finally {
      setBranchLoading(false);
    }
  };

  const deactivateBranch = async (br: BranchItem) => {
    try {
      setBranchLoading(true);
      const res = await api.put(`/branches/${br._id}`, { isActive: false });
      if (!res.data?.ok) throw new Error(res.data?.message || "DELETE_FAILED");
      message.success("Đã xoá (ngưng hoạt động) cửa hàng");
      loadBranches();
    } catch (e: any) {
      message.error(e?.response?.data?.message || e?.message || "Xoá thất bại");
    } finally {
      setBranchLoading(false);
    }
  };

  const LABEL_BLOCK: Record<ReceiptBlockType, string> = {
  LOGO: "Logo",
  BRAND_NAME: "Tên thương hiệu",
  SHOP_NAME: "Tên chi nhánh",
  ADDRESS: "Địa chỉ",
  PHONE: "SĐT",
  TAX_CODE: "MST",
  ORDER_META: "Thông tin hoá đơn",
  ITEMS_TABLE: "Danh sách sản phẩm",
  TOTALS: "Tổng tiền",
  PAYMENT: "Thanh toán",
  FOOTER_TEXT: "Câu chữ cuối",
};

const Convert_Type = (type: ReceiptBlockType) => LABEL_BLOCK[type] || type;


  const setMainBranch = async (br: BranchItem) => {
    try {
      setBranchLoading(true);
      const res = await api.put(`/branches/${br._id}`, { isMain: true });
      if (!res.data?.ok) throw new Error(res.data?.message || "SET_MAIN_FAILED");
      message.success("Đã set Main Brand");
      loadBranches();
    } catch (e: any) {
      message.error(e?.response?.data?.message || e?.message || "Set Main thất bại");
    } finally {
      setBranchLoading(false);
    }
  };

  const customerOptions = useMemo(
    () =>
      customers.map((c) => ({
        value: c._id,
        label: `${c.name}${c.phone ? ` - ${c.phone}` : ""}`,
      })),
    [customers]
  );

  const openTime = Form.useWatch("openTime", form);
  const closeTime = Form.useWatch("closeTime", form);
  const enableVAT = Form.useWatch(["tax", "enableVAT"], form);
  const enableLoyalty = Form.useWatch(["loyalty", "enable"], form);

  return (
    <Card
      title={
        <Space direction="vertical" size={0}>
          <Title level={4} style={{ margin: 0 }}>
            Cài đặt cửa hàng
          </Title>
          <Text type="secondary">Branch ID: {branchId}</Text>
        </Space>
      }
      extra={
        <Space>
          <Button onClick={() => { loadData(); loadBranches(); }} disabled={loading || branchLoading}>
            Tải lại
          </Button>
          <Button type="primary" onClick={onSave} loading={loading} disabled={!dirty}>
            Lưu
          </Button>
        </Space>
      }
    >
      {dirty && <Alert type="warning" showIcon message="Bạn có thay đổi chưa lưu" style={{ marginBottom: 12 }} />}

      <Form
        form={form}
        layout="vertical"
        initialValues={{ ...DEFAULT_SETTINGS, branchId }}
        onValuesChange={() => setDirty(true)}
        disabled={loading}
      >
        <Tabs
          items={[
            // ✅ TAB 1: Thông tin cửa hàng
            {
              key: "info",
              label: "Thông tin cửa hàng",
              children: (
                <>
                  <Space style={{ width: "100%", justifyContent: "space-between", marginBottom: 12 }}>
                    <Title level={5} style={{ margin: 0 }}>
                      Danh sách cửa hàng
                    </Title>
                    <Space>
                      <Button onClick={loadBranches} loading={branchLoading}>
                        Refresh
                      </Button>
                      <Button type="primary" onClick={openCreateBranch}>
                        Thêm mới cửa hàng
                      </Button>
                    </Space>
                  </Space>

                  <Row gutter={[16, 16]}>
                    {branches.map((br) => (
                      <Col key={br._id} xs={24} md={12} lg={8}>
                        <Card
                          size="small"
                          title={
                            <Space>
                              <Text strong>{br.name}</Text>
                              {br.isMain ? <Tag color="green">MAIN</Tag> : null}
                            </Space>
                          }
                          extra={<Text type="secondary">{br.code}</Text>}
                          actions={[
                            <Button key="update" type="link" onClick={() => openEditBranch(br)}>
                              Update
                            </Button>,
                            <Popconfirm
                              key="delete"
                              title="Xoá cửa hàng này?"
                              description="Sẽ chuyển isActive=false (không xoá DB)."
                              okText="Xoá"
                              cancelText="Huỷ"
                              onConfirm={() => deactivateBranch(br)}
                            >
                              <Button type="link" danger>
                                Xoá
                              </Button>
                            </Popconfirm>,
                          ]}
                        >
                          <Space direction="vertical" style={{ width: "100%" }} size={6}>
                            {br.logo ? (
                              <div style={{ height: 90, display: "flex", alignItems: "center", justifyContent: "center" }}>
                                <img src={br.logo} alt="logo" style={{ maxHeight: 80, maxWidth: "100%", objectFit: "contain" }} />
                              </div>
                            ) : (
                              <Text type="secondary">Chưa có logo</Text>
                            )}

                            <Divider style={{ margin: "8px 0" }} />

                            <Text><b>Brand:</b> {br.brandName || "—"}</Text>
                            <Text><b>Phone:</b> {br.phone || "—"}</Text>
                            <Text><b>Address:</b> {br.address || "—"}</Text>

                            <Divider style={{ margin: "8px 0" }} />

                            <Space style={{ width: "100%", justifyContent: "space-between" }}>
                              <Text type="secondary">Set Main Brand</Text>
                              <Switch
                                checked={!!br.isMain}
                                onChange={(v) => (v ? setMainBranch(br) : openEditBranch(br))}
                                disabled={branchLoading}
                              />
                            </Space>

                            {!br.isMain ? (
                              <Button onClick={() => setMainBranch(br)} disabled={branchLoading} block>
                                Đặt làm Main Brand
                              </Button>
                            ) : null}
                          </Space>
                        </Card>
                      </Col>
                    ))}
                  </Row>

                  <Modal
                    open={branchModalOpen}
                    onCancel={() => setBranchModalOpen(false)}
                    title={branchModalMode === "create" ? "Thêm mới cửa hàng" : "Cập nhật cửa hàng"}
                    okText={branchModalMode === "create" ? "Tạo" : "Lưu"}
                    cancelText="Huỷ"
                    onOk={submitBranchModal}
                    confirmLoading={branchLoading}
                    destroyOnClose
                  >
                    <Form form={branchForm} layout="vertical">
                      <Row gutter={12}>
                        <Col span={12}>
                          <Form.Item
                            label="Code"
                            name="code"
                            rules={[
                              { required: true, message: "Nhập code" },
                              { min: 2, message: "Tối thiểu 2 ký tự" },
                            ]}
                          >
                            <Input placeholder="VD: TK01" />
                          </Form.Item>
                        </Col>
                        <Col span={12}>
                          <Form.Item
                            label="Tên cửa hàng"
                            name="name"
                            rules={[
                              { required: true, message: "Nhập tên cửa hàng" },
                              { min: 2, message: "Tối thiểu 2 ký tự" },
                            ]}
                          >
                            <Input placeholder="VD: Bảo Ân Cosmetics - Tam Kỳ" />
                          </Form.Item>
                        </Col>
                      </Row>

                      <Row gutter={12}>
                        <Col span={12}>
                          <Form.Item label="Số điện thoại" name="phone">
                            <Input placeholder="090..." />
                          </Form.Item>
                        </Col>
                        <Col span={12}>
                          <Form.Item label="Địa chỉ" name="address">
                            <Input placeholder="Số nhà, đường..." />
                          </Form.Item>
                        </Col>
                      </Row>

                      <Divider />

                      <Row gutter={12}>
                        <Col span={12}>
                          <Form.Item label="Brand Name" name="brandName">
                            <Input placeholder="Bảo Ân Cosmetics" />
                          </Form.Item>
                        </Col>
                        <Col span={12}>
                          <Form.Item label="Email" name="email" rules={[{ type: "email", message: "Email không hợp lệ" }]}>
                            <Input placeholder="shop@email.com" />
                          </Form.Item>
                        </Col>
                      </Row>

                      <Row gutter={12}>
                        <Col span={12}>
                          <Form.Item label="MST" name="taxCode">
                            <Input placeholder="Mã số thuế" />
                          </Form.Item>
                        </Col>
                        <Col span={12}>
                          {/* ✅ Upload logo trong modal */}
                          <Form.Item label="Logo" name="logo">
                            <Space style={{ width: "100%", justifyContent: "space-between" }}>
                              <Input placeholder="http://.../uploads/..." />
                              <Upload {...branchLogoUploadProps}>
                                <Button>Upload</Button>
                              </Upload>
                            </Space>
                            {branchForm.getFieldValue("logo") ? (
                              <div style={{ marginTop: 8, textAlign: "center" }}>
                                <img
                                  src={branchForm.getFieldValue("logo")}
                                  alt="logo"
                                  style={{ maxHeight: 70, maxWidth: "100%", objectFit: "contain" }}
                                />
                              </div>
                            ) : null}
                          </Form.Item>
                        </Col>
                      </Row>

                      <Form.Item label="Set Main Brand" name="isMain" valuePropName="checked">
                        <Switch />
                      </Form.Item>

                      <Alert
                        type="info"
                        showIcon
                        message="Lưu ý"
                        description='Khi bật "Main Brand": backend sẽ tự tắt isMain của các cửa hàng khác.'
                      />
                    </Form>
                  </Modal>
                </>
              ),
            },

            // ===== TAB Vận hành giữ nguyên =====
            // {
            //   key: "ops",
            //   label: "Vận hành",
            //   children: (
            //     <>
            //       <Row gutter={16}>
            //         <Col xs={24} md={12}>
            //           <Form.Item label="Ngày mở cửa" name="openDays">
            //             <Select
            //               mode="multiple"
            //               options={(Object.keys(WEEKDAY_LABEL) as unknown as Weekday[]).map((d) => ({
            //                 value: d,
            //                 label: WEEKDAY_LABEL[d],
            //               }))}
            //             />
            //           </Form.Item>
            //         </Col>

            //         <Col xs={24} md={12}>
            //           <Row gutter={16}>
            //             <Col span={12}>
            //               <Form.Item label="Giờ mở cửa">
            //                 <TimePicker
            //                   value={toTimeDayjs(openTime || "08:00")}
            //                   format="HH:mm"
            //                   style={{ width: "100%" }}
            //                   onChange={(t) => form.setFieldValue("openTime", toHHmm(t))}
            //                 />
            //               </Form.Item>
            //             </Col>
            //             <Col span={12}>
            //               <Form.Item label="Giờ đóng cửa">
            //                 <TimePicker
            //                   value={toTimeDayjs(closeTime || "22:00")}
            //                   format="HH:mm"
            //                   style={{ width: "100%" }}
            //                   onChange={(t) => form.setFieldValue("closeTime", toHHmm(t))}
            //                 />
            //               </Form.Item>
            //             </Col>
            //           </Row>
            //         </Col>
            //       </Row>

            //       <Divider />

            //       <Row gutter={16}>
            //         <Col xs={24} md={12}>
            //           <Form.Item label="Cho phép âm kho (POS)" name="allowNegativeStock" valuePropName="checked">
            //             <Switch />
            //           </Form.Item>
            //           <Text type="secondary">Bật khi bạn muốn bán trước - nhập hàng sau (cần audit tồn kho).</Text>
            //         </Col>

            //         <Col xs={24} md={12}>
            //           <Form.Item label="Cho phép sửa giá trực tiếp tại POS" name="allowEditPriceAtPOS" valuePropName="checked">
            //             <Switch />
            //           </Form.Item>
            //           <Text type="secondary">Nếu bật, nhân viên có thể override giá (khuyến nghị có log).</Text>
            //         </Col>
            //       </Row>

            //       <Divider />

            //       <Row gutter={16}>
            //         <Col xs={24} md={12}>
            //           <Form.Item label="Bắt buộc nhập khách hàng để tích điểm" name="requireCustomerForPoints" valuePropName="checked">
            //             <Switch />
            //           </Form.Item>
            //           <Text type="secondary">Khi tắt: cho phép bán “khách lẻ” vẫn tích điểm vào khách mặc định.</Text>
            //         </Col>
            //         <Col xs={24} md={12}>
            //           <Form.Item label="Khách mặc định" name="defaultCustomerId">
            //             <Select
            //               allowClear
            //               placeholder="Chọn khách mặc định (khách lẻ)"
            //               options={customerOptions}
            //               showSearch
            //               optionFilterProp="label"
            //             />
            //           </Form.Item>
            //         </Col>
            //       </Row>
            //     </>
            //   ),
            // },

            // ===== TAB Receipt: giữ nguyên, chỉ fix logic save ở trên =====
            {
              key: "receipt",
              label: "Cài Đặt In Bill",
              children: (
                <>
                  <Row gutter={16}>
                    <Col xs={24} md={8}>
                      <Form.Item label="Khổ giấy" name={["receipt", "paperSize"]}>
                        <Select
                          options={[
                            { value: "56mm", label: "56mm (máy in bill phổ biến)" },
                            { value: "80mm", label: "80mm" },
                          ]}
                        />
                      </Form.Item>
                    </Col>

                    <Col xs={24} md={8}>
                      <Form.Item label="Tự in sau khi thanh toán" name={["receipt", "autoPrintAfterPaid"]} valuePropName="checked">
                        <Switch />
                      </Form.Item>
                    </Col>

                    <Col xs={24} md={8}>
                      <Form.Item label="Số bản in" name={["receipt", "printCopies"]}>
                        <InputNumber min={1} max={5} style={{ width: "100%" }} />
                      </Form.Item>
                    </Col>
                  </Row>

                  <Divider />

                  <Row gutter={16}>
                    <Col xs={24} md={8}>
                      <Form.Item label="Hiện logo" name={["receipt", "showLogo"]} valuePropName="checked">
                        <Switch />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={8}>
                      <Form.Item label="Hiện QRCode" name={["receipt", "showQRCode"]} valuePropName="checked">
                        <Switch />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={8}>
                      <Form.Item label="Hiện barcode" name={["receipt", "showBarcode"]} valuePropName="checked">
                        <Switch />
                      </Form.Item>
                    </Col>
                  </Row>

                  <Divider />

                  <Form.Item label="Ghi chú cuối bill" name={["receipt", "footerNote"]}>
                    <Input.TextArea rows={2} placeholder="VD: Đổi trả trong 7 ngày (còn hoá đơn)..." />
                  </Form.Item>

                  <Alert
                    type="info"
                    showIcon
                    message="Gợi ý"
                    description="Với máy in 56mm, tránh nội dung quá dài; QRCode & barcode nên bật/tắt theo mẫu bill bạn đang dùng."
                  />

                  <Form.Item name={["receipt", "template"]} hidden>
                    <Input />
                  </Form.Item>

                  <Divider />

                  <Row gutter={16}>
                    <Col xs={24} md={12}>
                      <Card
                        size="small"
                        title="Mẫu bill tuỳ chỉnh"
                        extra={
                          <Space>
                            <Button onClick={resetTpl}>Reset</Button>
                            <Select
                              style={{ width: 190 }}
                              placeholder="Thêm block"
                              onChange={(v) => addBlock(v as ReceiptBlockType)}
                              options={[
                                { value: "LOGO", label: "Logo" },
                                { value: "BRAND_NAME", label: "Tên thương hiệu" },
                                { value: "SHOP_NAME", label: "Tên chi nhánh" },
                                { value: "ADDRESS", label: "Địa chỉ" },
                                { value: "PHONE", label: "SĐT" },
                                { value: "TAX_CODE", label: "MST" },
                                { value: "ORDER_META", label: "Thông tin hoá đơn" },
                                { value: "ITEMS_TABLE", label: "Danh sách sản phẩm" },
                                { value: "TOTALS", label: "Tổng tiền" },
                                { value: "PAYMENT", label: "Thanh toán" },
                                { value: "FOOTER_TEXT", label: "Câu chữ cuối" },
                              ]}
                            />
                          </Space>
                        }
                      >
                        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                          {tpl.map((b, idx) => (
                            <div key={b.id} style={{ border: "1px solid #eee", borderRadius: 10, padding: 10, background: "#fff" }}>
                              <Space style={{ width: "100%", justifyContent: "space-between" }} align="start">
                                <Space>
                                  <Switch checked={b.enabled} onChange={(v) => toggleBlock(idx, v)} />
                                  <Text strong>{Convert_Type(b.type)}</Text>
                                </Space>

                                <Space>
                                  <Button size="small" onClick={() => moveBlock(idx, -1)} disabled={idx === 0}>
                                    ↑
                                  </Button>
                                  <Button size="small" onClick={() => moveBlock(idx, 1)} disabled={idx === tpl.length - 1}>
                                    ↓
                                  </Button>
                                  <Button size="small" danger onClick={() => removeBlock(idx)}>
                                    Xoá
                                  </Button>
                                </Space>
                              </Space>

                              <Row gutter={12} style={{ marginTop: 10 }}>
                                <Col xs={24} md={8}>
                                  <Text type="secondary">Canh chỉnh(Trái, Giữa, Phải)</Text>
                                  <Select
                                    value={b.align || "left"}
                                    style={{ width: "100%" }}
                                    onChange={(v) => updateBlock(idx, { align: v })}
                                    options={[
                                      { value: "left", label: "Trái" },
                                      { value: "center", label: "Giữa" },
                                      { value: "right", label: "Phải" },
                                    ]}
                                  />
                                </Col>

                                <Col xs={24} md={8}>
                                  <Text type="secondary">Size Chữ (px)</Text>
                                  <InputNumber
                                    min={9}
                                    max={18}
                                    value={b.fontSize || 11}
                                    style={{ width: "100%" }}
                                    onChange={(v) => updateBlock(idx, { fontSize: Number(v || 11) })}
                                  />
                                </Col>

                                <Col xs={24} md={8}>
                                  <Text type="secondary">In Đậm</Text>
                                  <div>
                                    <Switch checked={!!b.bold} onChange={(v) => updateBlock(idx, { bold: v })} />
                                  </div>
                                </Col>
                              </Row>

                              {b.type === "FOOTER_TEXT" ? (
                                <div style={{ marginTop: 10 }}>
                                  <Text type="secondary">Text</Text>
                                  <Input.TextArea
                                    rows={2}
                                    value={b.text || ""}
                                    onChange={(e) => updateBlock(idx, { text: e.target.value })}
                                    placeholder="VD: Đổi trả trong 7 ngày (còn hoá đơn)..."
                                  />
                                </div>
                              ) : null}
                            </div>
                          ))}
                        </div>

                        <Alert style={{ marginTop: 12 }} type="info" showIcon message="Mẹo" description="Bill 56mm nên gọn: BRAND + ORDER_META + ITEMS + TOTALS + FOOTER." />
                      </Card>
                    </Col>

                    <Col xs={24} md={12}>
                      <Card size="small" title="Preview bill">
                        <div
                          dangerouslySetInnerHTML={{
                            __html: renderReceiptPreview(
                              tpl,
                              form.getFieldValue(["receipt", "paperSize"]) || "56mm",
                              {
                                logoUrl: form.getFieldValue("logoUrl") || "",
                                brandName: form.getFieldValue("brandName") || form.getFieldValue("name") || "SHOP",
                                shopName: form.getFieldValue("name") || "Chi nhánh",
                                address: form.getFieldValue("address") || "—",
                                phone: form.getFieldValue("phone") || "—",
                                taxCode: form.getFieldValue(["tax", "taxCode"]) || "",
                              }
                            ),
                          }}
                        />
                      </Card>
                    </Col>
                  </Row>
                </>
              ),
            },

            // ===== TAB Tax giữ nguyên =====
            {
              key: "tax",
              label: "Thuế & hoá đơn",
              children: (
                <>
                  <Row gutter={16}>
                    <Col xs={24} md={8}>
                      <Form.Item label="Bật VAT" name={["tax", "enableVAT"]} valuePropName="checked">
                        <Switch />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={8}>
                      <Form.Item label="VAT (%)" name={["tax", "vatPercent"]}>
                        <InputNumber min={0} max={100} style={{ width: "100%" }} disabled={!enableVAT} />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={8}>
                      <Form.Item label="Hiện VAT trên bill" name={["tax", "showVATOnReceipt"]} valuePropName="checked">
                        <Switch disabled={!enableVAT} />
                      </Form.Item>
                    </Col>
                  </Row>

                  <Divider />

                  <Row gutter={16}>
                    <Col xs={24} md={12}>
                      <Form.Item label="Tên công ty" name={["tax", "companyName"]}>
                        <Input disabled={!enableVAT} />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={12}>
                      <Form.Item label="Mã số thuế" name={["tax", "taxCode"]}>
                        <Input disabled={!enableVAT} />
                      </Form.Item>
                    </Col>
                  </Row>

                  <Form.Item label="Ghi chú hoá đơn" name={["tax", "invoiceNote"]}>
                    <Input.TextArea rows={2} disabled={!enableVAT} />
                  </Form.Item>
                </>
              ),
            },

            // ===== TAB Loyalty giữ nguyên =====
            {
              key: "loyalty",
              label: "Tích điểm",
              children: (
                <>
                  <Row gutter={16}>
                    <Col xs={24} md={8}>
                      <Form.Item label="Bật tích điểm" name={["loyalty", "enable"]} valuePropName="checked">
                        <Switch />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={8}>
                      <Form.Item label="1 điểm / (VND)" name={["loyalty", "earnUnitVnd"]}>
                        <InputNumber min={1} step={500} style={{ width: "100%" }} disabled={!enableLoyalty} />
                      </Form.Item>
                      <Text type="secondary">VD: 1000 nghĩa là 1 điểm / 1.000đ</Text>
                    </Col>
                    <Col xs={24} md={8}>
                      <Form.Item label="Hết hạn (ngày)" name={["loyalty", "pointsExpireDays"]}>
                        <InputNumber min={0} style={{ width: "100%" }} disabled={!enableLoyalty} />
                      </Form.Item>
                      <Text type="secondary">0 = không hết hạn</Text>
                    </Col>
                  </Row>

                  <Divider />

                  <Row gutter={16}>
                    <Col xs={24} md={8}>
                      <Form.Item label="Cho phép đổi điểm" name={["loyalty", "redeemEnable"]} valuePropName="checked">
                        <Switch disabled={!enableLoyalty} />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={8}>
                      <Form.Item label="Giá trị (VND) / 1 điểm" name={["loyalty", "redeemValueVndPerPoint"]}>
                        <InputNumber min={0} step={50} style={{ width: "100%" }} disabled={!enableLoyalty} />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={8}>
                      <Form.Item label="Thưởng sinh nhật (điểm)" name={["loyalty", "birthdayBonusPoints"]}>
                        <InputNumber min={0} style={{ width: "100%" }} disabled={!enableLoyalty} />
                      </Form.Item>
                    </Col>
                  </Row>

                  <Alert
                    type="success"
                    showIcon
                    message="Gợi ý chính sách phù hợp bán lẻ"
                    description="Dễ vận hành nhất: 1 điểm / 1.000đ, đổi 1 điểm = 100đ hoặc 200đ; hạn 0 hoặc 365 ngày tuỳ chiến lược."
                  />
                </>
              ),
            },

            // ===== TAB Online giữ nguyên =====
            {
              key: "online",
              label: "Online & thông báo",
              children: (
                <>
                  <Row gutter={16}>
                    <Col xs={24} md={12}>
                      <Form.Item label="Bật đơn online" name={["online", "enableOnlineOrders"]} valuePropName="checked">
                        <Switch />
                      </Form.Item>
                      <Text type="secondary">Khi bật: đơn web/online đổ về Orders, dùng allocate stock theo branch chính.</Text>
                    </Col>
                    <Col xs={24} md={12}>
                      <Form.Item label="Tự đối soát đã trả (ngân hàng)" name={["online", "autoConfirmPaidByBank"]} valuePropName="checked">
                        <Switch />
                      </Form.Item>
                      <Text type="secondary">Bật khi bạn đã tích hợp luồng nhận giao dịch/đối soát.</Text>
                    </Col>
                  </Row>

                  <Divider />

                  <Row gutter={16}>
                    <Col xs={24} md={8}>
                      <Form.Item label="Thông báo Zalo" name={["online", "orderNotifyZalo"]} valuePropName="checked">
                        <Switch />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={8}>
                      <Form.Item label="Thông báo Telegram" name={["online", "orderNotifyTelegram"]} valuePropName="checked">
                        <Switch />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={8}>
                      <Form.Item label="SĐT nhận thông báo" name={["online", "notifyPhone"]}>
                        <Input placeholder="VD: 090..." />
                      </Form.Item>
                    </Col>
                  </Row>
                </>
              ),
            },
          ]}
        />

        <Divider style={{ marginTop: 0 }} />

        <Space>
          <Button type="primary" onClick={onSave} loading={loading} disabled={!dirty}>
            Lưu thay đổi (chi nhánh hiện tại)
          </Button>
          <Button onClick={() => { loadData(); loadBranches(); }} disabled={loading}>
            Hủy / Tải lại
          </Button>
        </Space>

        {/* ✅ Optional: khu vực upload logo cho branch hiện tại nếu bạn muốn hiển thị ở ngoài tab */}
        <Divider />
        <Space direction="vertical" style={{ width: "100%" }}>
          <Text strong>Logo chi nhánh hiện tại</Text>
          <Space>
            <Upload {...uploadProps}>
              <Button>Upload logo</Button>
            </Upload>
            <Text type="secondary">{form.getFieldValue("logoUrl") || "Chưa có logo"}</Text>
          </Space>
          {form.getFieldValue("logoUrl") ? (
            <img
              src={form.getFieldValue("logoUrl")}
              alt="logo"
              style={{ maxHeight: 80, maxWidth: 240, objectFit: "contain" }}
            />
          ) : null}
        </Space>
      </Form>
    </Card>
  );
};

export default ShopSettings;
