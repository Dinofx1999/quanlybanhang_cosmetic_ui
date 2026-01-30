// src/components/ShopSettings/ShopSettings.tsx
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
import api from "../../../services/api";

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
  | "CUSTOMER_INFO"
  | "LOYALTY_INFO"
  | "ITEMS_TABLE"
  | "TOTALS"
  | "PAYMENTS_INFO"
  | "BARCODE"
  | "QR_PAYMENT"
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
  { id: genId(), type: "CUSTOMER_INFO", enabled: true, align: "left", fontSize: 11 },
  { id: genId(), type: "LOYALTY_INFO", enabled: true, align: "left", fontSize: 11 },
  { id: genId(), type: "ITEMS_TABLE", enabled: true, align: "left", fontSize: 11 },
  { id: genId(), type: "TOTALS", enabled: true, align: "left", bold: true, fontSize: 12 },
  { id: genId(), type: "PAYMENTS_INFO", enabled: true, align: "left", fontSize: 11 },
  { id: genId(), type: "BARCODE", enabled: true, align: "center" },
  { id: genId(), type: "QR_PAYMENT", enabled: true, align: "center" },
  { id: genId(), type: "FOOTER_TEXT", enabled: true, align: "center", fontSize: 11, text: "Cảm ơn quý khách!" },
];

// ==========================
// DTO settings
// ==========================
type TierCode = "BRONZE" | "SILVER" | "GOLD" | "DIAMOND";

type LoyaltySettingDTO = {
  downgradeTo: TierCode;

  renew: {
    enabled: boolean;
    addDays: number;
    basedOn: "NOW";
    onlyForTiers: TierCode[];
  };

  autoUpgrade: {
    enabled: boolean;
    metric: "spend12m";
  };

  pointBase: {
    field: "total" | "subtotal";
  };

  redeem: {
    redeemEnable: boolean;
    redeemValueVndPerPoint: number;
    percentOfBill?: number;
    maxPointsPerOrder?: number;
  };
};

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
    setting?: LoyaltySettingDTO | null;
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
    setting: {
      downgradeTo: "BRONZE",
      renew: {
        enabled: true,
        addDays: 365,
        basedOn: "NOW",
        onlyForTiers: ["SILVER", "GOLD", "DIAMOND"],
      },
      autoUpgrade: { enabled: true, metric: "spend12m" },
      pointBase: { field: "total" },
      redeem: {
        redeemEnable: false,
        redeemValueVndPerPoint: 1000,
        percentOfBill: 0,
        maxPointsPerOrder: 0,
      },
    },
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
    order: {
      code: "HD000123",
      time: dayjs().format("DD/MM/YYYY HH:mm"),
      cashier: "NV A",
      status: "CONFIRM",
    },
    customer: {
      name: "Nguyễn Văn A",
      phone: "0987654321",
      address: "123 Lê Lợi, Q1, TP.HCM",
    },
    loyalty: {
      pointsEarned: 50,
      pointsRedeemed: 10,
      redeemAmount: 10000,
    },
    items: [
      { name: "Son môi 4AC - Hồng Hồng", qty: 1, price: 120000 },
      { name: "Kem dưỡng da", qty: 2, price: 85000 },
    ],
    payments: [
      { method: "Tiền mặt", amount: 200000 },
      { method: "Chuyển khoản", amount: 90000 },
    ],
    paid: 290000,
    due: 0,
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
          <div>Mã đơn: <b>${esc(demo.order.code)}</b></div>
          <div>Thời gian: ${esc(demo.order.time)}</div>
          <div>Thu ngân: ${esc(demo.order.cashier)}</div>
          <div>Trạng thái: <b>${esc(demo.order.status)}</b></div>
        </div>`;

      case "CUSTOMER_INFO":
        return `${line}<div style="font-size:${b.fontSize || 11}px;text-align:left;line-height:1.25;margin:2px 0;">
          <div style="font-weight:600;margin-bottom:3px;">THÔNG TIN KHÁCH HÀNG</div>
          <div>Tên: <b>${esc(demo.customer.name)}</b></div>
          <div>SĐT: <b>${esc(demo.customer.phone)}</b></div>
          <div>Địa chỉ: ${esc(demo.customer.address)}</div>
        </div>`;

      case "LOYALTY_INFO":
        return `<div style="font-size:${b.fontSize || 11}px;text-align:left;line-height:1.25;margin:2px 0;">
          <div style="font-weight:600;margin-bottom:3px;">TÍCH ĐIỂM & ƯU ĐÃI</div>
          <div>Đã dùng: <b>-${demo.loyalty.pointsRedeemed} điểm</b> (Giảm ${money(demo.loyalty.redeemAmount)}đ)</div>
          <div>Tích lũy: <b>+${demo.loyalty.pointsEarned} điểm</b></div>
        </div>`;

      case "ITEMS_TABLE":
        return `${line}<div ${styleOf(b)}>${itemsHtml}</div>${line}`;

      case "TOTALS":
        return `<div ${styleOf(b)} style="text-align:left;">
          <div style="display:flex;justify-content:space-between;margin:2px 0;"><span>Tạm tính</span><b>${money(sub)}</b></div>
          <div style="display:flex;justify-content:space-between;margin:2px 0;"><span>Trừ điểm</span><span style="color:#9c27b0;">-${money(demo.loyalty.redeemAmount)}</span></div>
          <div style="display:flex;justify-content:space-between;font-size:13px;font-weight:700;margin-top:4px;padding-top:4px;border-top:1px solid #333;"><span>TỔNG CỘNG</span><b>${money(sub - demo.loyalty.redeemAmount)}</b></div>
        </div>`;

      case "PAYMENTS_INFO":
        return `${line}<div style="font-size:${b.fontSize || 11}px;text-align:left;line-height:1.25;margin:2px 0;">
          <div style="font-weight:600;margin-bottom:3px;">THANH TOÁN</div>
          ${demo.payments
            .map(
              (p) =>
                `<div style="display:flex;justify-content:space-between;margin:2px 0;"><span>${esc(p.method)}</span><b>${money(p.amount)}</b></div>`
            )
            .join("")}
          <div style="display:flex;justify-content:space-between;font-weight:600;margin-top:4px;padding-top:4px;border-top:1px dashed #999;">
            <span>Đã trả</span><span style="color:#388e3c;">${money(demo.paid)}</span>
          </div>
        </div>`;

      case "BARCODE":
        return `<div ${styleOf(b)}><div style="display:inline-block;padding:10px;border:1px dashed #bbb;border-radius:8px;color:#666;font-size:10px;">BARCODE: ${esc(
          demo.order.code
        )}</div></div>`;

      case "QR_PAYMENT":
        return `<div ${styleOf(b)}><div style="display:inline-block;padding:20px;border:1px dashed #bbb;border-radius:8px;color:#666;font-size:10px;">QR CODE<br/>Chuyển khoản</div></div>`;

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
// Branch types
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
    paperSize?: number;
    showLogo?: boolean;
    showTaxCode?: boolean;
    template?: ReceiptBlock[];
    showQRCode?: boolean;
    showBarcode?: boolean;
  };

  posConfig?: {
    allowNegativeStock?: boolean;
    autoPrintReceipt?: boolean;
    defaultPaymentMethod?: "CASH" | "BANK" | "QR" | "CARD";
  };
};

// ==========================
// Tier types
// ==========================
type TierDTO = {
  _id: string;
  code: "BRONZE" | "SILVER" | "GOLD" | "DIAMOND" | string;
  name: string;
  isActive: boolean;
  priority: number;
  earn: {
    amountPerPoint: number;
    round: "FLOOR" | "ROUND" | "CEIL";
    minOrderAmount: number;
  };
  qualify: {
    thresholdVnd: number;
  };
  durationDays: number;
};

// ==========================
// TierAgency (khách sỉ / đại lý) types
// ==========================
type TierAgencyDTO = {
  _id: string;
  code: string; // "AGENCY_1"
  name: string; // "Sỉ cấp 1"
  level: number;
  isActive: boolean;
  note?: string;
};

// ==========================
// Helpers
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

  const [loyaltySetting, setLoyaltySetting] = useState<LoyaltySettingDTO | null>(null);
  const [tiers, setTiers] = useState<TierDTO[]>([]);
  const [loyaltyLoading, setLoyaltyLoading] = useState(false);

  const [tierModalOpen, setTierModalOpen] = useState(false);
  const [tierModalMode, setTierModalMode] = useState<"create" | "edit">("create");
  const [editingTier, setEditingTier] = useState<TierDTO | null>(null);
  const [tierForm] = Form.useForm();

  const [useMinOrderGate, setUseMinOrderGate] = useState(false);

  // ==========================
  // Agency tiers (khách sỉ / đại lý)
  // ==========================
  const [agencyTiers, setAgencyTiers] = useState<TierAgencyDTO[]>([]);
  const [agencyLoading, setAgencyLoading] = useState(false);

  const [agencyModalOpen, setAgencyModalOpen] = useState(false);
  const [agencyModalMode, setAgencyModalMode] = useState<"create" | "edit">("create");
  const [editingAgencyTier, setEditingAgencyTier] = useState<TierAgencyDTO | null>(null);
  const [agencyForm] = Form.useForm();

  // ==========================
  // Load branches list
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
  // Load Loyalty setting + tiers
  // ==========================
  const loadLoyalty = async () => {
    setLoyaltyLoading(true);
    try {
      const s = await api.get("/loyalty-settings");
      const t = await api.get("/tiers");

      const raw = s.data?.setting || null;

      const normalized: LoyaltySettingDTO | null = raw
        ? {
            ...raw,
            autoUpgrade: { ...(raw.autoUpgrade || {}), metric: "spend12m" },
            pointBase: { ...(raw.pointBase || {}), field: (raw?.pointBase?.field || "total") as any },
            redeem: {
              redeemEnable: raw?.redeem?.redeemEnable ?? (raw as any)?.redeemEnable ?? false,
              redeemValueVndPerPoint: Number(raw?.redeem?.redeemValueVndPerPoint ?? (raw as any)?.redeemValueVndPerPoint ?? 0),
              percentOfBill: Number(raw?.redeem?.percentOfBill ?? (raw as any)?.percentOfBill ?? 0),
              maxPointsPerOrder: Number(raw?.redeem?.maxPointsPerOrder ?? (raw as any)?.maxPointsPerOrder ?? 0),
            },
          }
        : null;

      const items: TierDTO[] = t.data?.items || [];
      setLoyaltySetting(normalized);
      setTiers(Array.isArray(items) ? items : []);
      form.setFieldValue(["loyalty", "setting"], normalized);
    } catch (e: any) {
      setLoyaltySetting(null);
      setTiers([]);
      form.setFieldValue(["loyalty", "setting"], null);

      const msg =
        e?.response?.status === 404
          ? "Chưa có API /loyalty-settings hoặc /tiers (backend 404)"
          : "Không tải được Loyalty";
      console.log(msg, e?.response?.data || e?.message);
    } finally {
      setLoyaltyLoading(false);
    }
  };

  const initLoyalty = async () => {
    setLoyaltyLoading(true);
    try {
      const r = await api.post("/loyalty-settings/init");
      if (!r.data?.ok) throw new Error(r.data?.message || "INIT_FAILED");
      message.success("Đã khởi tạo Loyalty Setting");
      await loadLoyalty();
    } catch (e: any) {
      message.error(e?.response?.data?.message || e?.message || "Init thất bại (kiểm tra backend route)");
    } finally {
      setLoyaltyLoading(false);
    }
  };

  const saveLoyaltySetting = async () => {
    try {
      const setting = form.getFieldValue(["loyalty", "setting"]) as LoyaltySettingDTO | null;

      setLoyaltyLoading(true);

      const payload = setting
        ? {
            ...setting,
            autoUpgrade: { ...(setting.autoUpgrade || {}), metric: "spend12m" as const },
            redeem: {
              redeemEnable: !!setting?.redeem?.redeemEnable,
              redeemValueVndPerPoint: Number(setting?.redeem?.redeemValueVndPerPoint || 0),
              percentOfBill: Number(setting?.redeem?.percentOfBill || 0),
              maxPointsPerOrder: Number(setting?.redeem?.maxPointsPerOrder || 0),
            },
          }
        : {};

      const r = await api.put("/loyalty-settings", payload);
      if (!r.data?.ok) throw new Error(r.data?.message || "SAVE_FAILED");
      message.success("Đã lưu Loyalty Setting");
      await loadLoyalty();
    } catch (e: any) {
      message.error(e?.response?.data?.message || e?.message || "Lưu Loyalty Setting thất bại");
    } finally {
      setLoyaltyLoading(false);
    }
  };

  // ==========================
  // Load TierAgency (khách sỉ / đại lý)
  // ==========================
  const loadAgencyTiers = async () => {
    setAgencyLoading(true);
    try {
      const res = await api.get("/tier-agencies");
      const items: TierAgencyDTO[] = res.data?.items || [];
      setAgencyTiers(Array.isArray(items) ? items : []);
    } catch (e: any) {
      message.error(e?.response?.data?.message || e?.message || "Không tải được danh sách cấp sỉ");
    } finally {
      setAgencyLoading(false);
    }
  };

  const openCreateAgencyTier = () => {
    setAgencyModalMode("create");
    setEditingAgencyTier(null);
    agencyForm.resetFields();
    agencyForm.setFieldsValue({
      code: "",
      name: "",
      level: 0,
      isActive: true,
      note: "",
    });
    setAgencyModalOpen(true);
  };

  const openEditAgencyTier = (t: TierAgencyDTO) => {
    setAgencyModalMode("edit");
    setEditingAgencyTier(t);
    agencyForm.resetFields();
    agencyForm.setFieldsValue({
      code: t.code || "",
      name: t.name || "",
      level: Number(t.level || 0),
      isActive: t.isActive !== false,
      note: t.note || "",
    });
    setAgencyModalOpen(true);
  };

  const submitAgencyTierModal = async () => {
    try {
      const v = await agencyForm.validateFields();
      setAgencyLoading(true);

      const payload: any = {
        code: String(v.code || "").toUpperCase().trim(),
        name: String(v.name || "").trim(),
        level: Number(v.level || 0),
        isActive: !!v.isActive,
        note: String(v.note || ""),
      };

      if (agencyModalMode === "create") {
        const r = await api.post("/tier-agencies", payload);
        if (!r.data?.ok) throw new Error(r.data?.message || "CREATE_AGENCY_TIER_FAILED");
        message.success("Đã tạo cấp sỉ");
      } else {
        if (!editingAgencyTier?._id) throw new Error("Missing agency tier id");
        const r = await api.put(`/tier-agencies/${editingAgencyTier._id}`, payload);
        if (!r.data?.ok) throw new Error(r.data?.message || "UPDATE_AGENCY_TIER_FAILED");
        message.success("Đã cập nhật cấp sỉ");
      }

      setAgencyModalOpen(false);
      await loadAgencyTiers();
    } catch (e: any) {
      if (e?.errorFields) return;
      message.error(e?.response?.data?.message || e?.message || "Thao tác cấp sỉ thất bại");
    } finally {
      setAgencyLoading(false);
    }
  };

  const toggleAgencyTier = async (t: TierAgencyDTO) => {
    try {
      setAgencyLoading(true);
      const r = await api.patch(`/tier-agencies/${t._id}/toggle`);
      if (!r.data?.ok) throw new Error(r.data?.message || "TOGGLE_FAILED");
      message.success("Đã cập nhật trạng thái");
      await loadAgencyTiers();
    } catch (e: any) {
      message.error(e?.response?.data?.message || e?.message || "Toggle thất bại");
    } finally {
      setAgencyLoading(false);
    }
  };

  const deleteAgencyTier = async (t: TierAgencyDTO) => {
    try {
      setAgencyLoading(true);
      const r = await api.delete(`/tier-agencies/${t._id}`);
      if (!r.data?.ok) throw new Error(r.data?.message || "DELETE_FAILED");
      message.success("Đã xoá cấp sỉ");
      await loadAgencyTiers();
    } catch (e: any) {
      message.error(e?.response?.data?.message || e?.message || "Xoá thất bại");
    } finally {
      setAgencyLoading(false);
    }
  };

  // Tier modal actions
  const openCreateTier = () => {
    setTierModalMode("create");
    setEditingTier(null);
    tierForm.resetFields();

    setUseMinOrderGate(false);

    tierForm.setFieldsValue({
      code: "BRONZE",
      name: "",
      isActive: true,
      priority: 0,

      earn_amountPerPoint: 100000,
      earn_round: "FLOOR",
      earn_minOrderAmount: 0,

      qualify_thresholdVnd: 0,
      durationDays: 0,
    });
    setTierModalOpen(true);
  };

  const openEditTier = (t: TierDTO) => {
    setTierModalMode("edit");
    setEditingTier(t);
    tierForm.resetFields();

    const minGate = Number(t.earn?.minOrderAmount || 0);
    setUseMinOrderGate(minGate > 0);

    tierForm.setFieldsValue({
      code: t.code,
      name: t.name,
      isActive: !!t.isActive,
      priority: Number(t.priority || 0),

      earn_amountPerPoint: Number(t.earn?.amountPerPoint || 0),
      earn_round: t.earn?.round || "FLOOR",
      earn_minOrderAmount: minGate,

      qualify_thresholdVnd: Number(t.qualify?.thresholdVnd || 0),
      durationDays: Number(t.durationDays || 0),
    });

    setTierModalOpen(true);
  };

  const submitTierModal = async () => {
    try {
      const v = await tierForm.validateFields();
      setLoyaltyLoading(true);

      const payload: any = {
        code: String(v.code || "").toUpperCase(),
        name: String(v.name || "").trim(),
        isActive: !!v.isActive,
        priority: Number(v.priority || 0),
        earn: {
          amountPerPoint: Number(v.earn_amountPerPoint || 0),
          round: v.earn_round || "FLOOR",
          minOrderAmount: useMinOrderGate ? Number(v.earn_minOrderAmount || 0) : 0,
        },
        qualify: { thresholdVnd: Number(v.qualify_thresholdVnd || 0) },
        durationDays: Number(v.durationDays || 0),
      };

      if (tierModalMode === "create") {
        const r = await api.post("/tiers", payload);
        if (!r.data?.ok) throw new Error(r.data?.message || "CREATE_TIER_FAILED");
        message.success("Đã tạo Tier");
      } else {
        if (!editingTier?._id) throw new Error("Missing tier id");
        const r = await api.put(`/tiers/${editingTier._id}`, {
          name: payload.name,
          isActive: payload.isActive,
          priority: payload.priority,
          earn: payload.earn,
          qualify: payload.qualify,
          durationDays: payload.durationDays,
        });
        if (!r.data?.ok) throw new Error(r.data?.message || "UPDATE_TIER_FAILED");
        message.success("Đã cập nhật Tier");
      }

      setTierModalOpen(false);
      await loadLoyalty();
    } catch (e: any) {
      if (e?.errorFields) return;
      message.error(e?.response?.data?.message || e?.message || "Thao tác Tier thất bại");
    } finally {
      setLoyaltyLoading(false);
    }
  };

  // ==========================
  // Load current branch settings
  // ==========================
  const loadData = async () => {
    setLoading(true);
    try {
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
          showBarcode: br?.receipt?.showBarcode ?? true,
        },

        tax: {
          ...DEFAULT_SETTINGS.tax,
          taxCode: br?.taxCode || "",
        },

        loyalty: {
          ...DEFAULT_SETTINGS.loyalty,
          setting: loyaltySetting || DEFAULT_SETTINGS.loyalty.setting,
        },

        online: {
          ...DEFAULT_SETTINGS.online,
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
    loadLoyalty();
    loadAgencyTiers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branchId]);

  // ==========================
  // Save current branch settings
  // ==========================
  const onSave = async () => {
    try {
      const values = await form.validateFields();

      const payload: any = {};

      setIfNonEmpty(payload, "name", values.name);
      setIfNonEmpty(payload, "brandName", values.brandName);
      setIfNonEmpty(payload, "phone", values.phone);
      setIfNonEmpty(payload, "email", values.email);
      setIfNonEmpty(payload, "address", values.address);
      setIfNonEmpty(payload, "logo", values.logoUrl);
      setIfNonEmpty(payload, "taxCode", values.tax?.taxCode);

      payload.receipt = {
        footer: normalizeStr(values.receipt?.footerNote || ""),
        paperSize: values.receipt?.paperSize === "80mm" ? 80 : 56,
        showLogo: !!values.receipt?.showLogo,
        template: tpl,
        showQRCode: !!values.receipt?.showQRCode,
        showBarcode: !!values.receipt?.showBarcode,
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

  // Upload logo for branch modal
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
  // Template helpers
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
    CUSTOMER_INFO: "Thông tin khách hàng",
    LOYALTY_INFO: "Tích điểm & ưu đãi",
    ITEMS_TABLE: "Danh sách sản phẩm",
    TOTALS: "Tổng tiền",
    PAYMENTS_INFO: "Thanh toán",
    BARCODE: "Barcode",
    QR_PAYMENT: "QR chuyển khoản",
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

  const enableVAT = Form.useWatch(["tax", "enableVAT"], form);
  const enableLoyaltyUI = Form.useWatch(["loyalty", "enable"], form);
  const redeemEnable = Form.useWatch(["loyalty", "setting", "redeem", "redeemEnable"], form);

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
          <Button
            onClick={() => {
              loadData();
              loadBranches();
              loadLoyalty();
              loadAgencyTiers();
            }}
            disabled={loading || branchLoading || loyaltyLoading || agencyLoading}
          >
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
            // ===== TAB 1: Thông tin cửa hàng =====
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

                            <Text>
                              <b>Brand:</b> {br.brandName || "—"}
                            </Text>
                            <Text>
                              <b>Phone:</b> {br.phone || "—"}
                            </Text>
                            <Text>
                              <b>Address:</b> {br.address || "—"}
                            </Text>

                            <Divider style={{ margin: "8px 0" }} />

                            <Space style={{ width: "100%", justifyContent: "space-between" }}>
                              <Text type="secondary">Set Main Brand</Text>
                              <Switch checked={!!br.isMain} onChange={(v) => (v ? setMainBranch(br) : openEditBranch(br))} disabled={branchLoading} />
                            </Space>
                          </Space>
                        </Card>
                      </Col>
                    ))}
                  </Row>
                </>
              ),
            },

            // ===== TAB 2: Receipt =====
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
                              style={{ width: 220 }}
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
                                { value: "CUSTOMER_INFO", label: "Thông tin khách hàng" },
                                { value: "LOYALTY_INFO", label: "Tích điểm & ưu đãi" },
                                { value: "ITEMS_TABLE", label: "Danh sách sản phẩm" },
                                { value: "TOTALS", label: "Tổng tiền" },
                                { value: "PAYMENTS_INFO", label: "Thanh toán" },
                                { value: "BARCODE", label: "Barcode" },
                                { value: "QR_PAYMENT", label: "QR chuyển khoản" },
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
                                  <Text type="secondary">Canh chỉnh</Text>
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

                        <Alert
                          style={{ marginTop: 12 }}
                          type="info"
                          showIcon
                          message="Mẹo"
                          description="Bill 56mm nên gọn. Bill 80mm có thể hiển thị đầy đủ: Logo, Customer Info, Loyalty, Items, Totals, Payments, Barcode, QR."
                        />
                      </Card>
                    </Col>

                    <Col xs={24} md={12}>
                      <Card size="small" title="Preview bill">
                        <div
                          dangerouslySetInnerHTML={{
                            __html: renderReceiptPreview(tpl, form.getFieldValue(["receipt", "paperSize"]) || "56mm", {
                              logoUrl: form.getFieldValue("logoUrl") || "",
                              brandName: form.getFieldValue("brandName") || form.getFieldValue("name") || "SHOP",
                              shopName: form.getFieldValue("name") || "Chi nhánh",
                              address: form.getFieldValue("address") || "—",
                              phone: form.getFieldValue("phone") || "—",
                              taxCode: form.getFieldValue(["tax", "taxCode"]) || "",
                            }),
                          }}
                        />
                      </Card>
                    </Col>
                  </Row>
                </>
              ),
            },

            // ===== TAB 3: Loyalty =====
            {
              key: "loyalty",
              label: "Tích điểm",
              children: (
                <>
                  <Row gutter={16}>
                    <Col xs={24} md={8}>
                      <Form.Item label="Bật hiển thị tích điểm (POS)" name={["loyalty", "enable"]} valuePropName="checked">
                        <Switch />
                      </Form.Item>
                      <Text type="secondary">Chỉ bật/tắt UI ở POS. Rule/engine vẫn chạy theo backend khi đơn CONFIRM.</Text>
                    </Col>

                    <Col xs={24} md={16}>
                      <Space style={{ width: "100%", justifyContent: "flex-end" }}>
                        <Button onClick={loadLoyalty} loading={loyaltyLoading}>
                          Tải cấu hình
                        </Button>
                        {!loyaltySetting ? (
                          <Button type="primary" onClick={initLoyalty} loading={loyaltyLoading}>
                            Khởi tạo (Init)
                          </Button>
                        ) : (
                          <Button type="primary" onClick={saveLoyaltySetting} loading={loyaltyLoading}>
                            Lưu Loyalty Setting
                          </Button>
                        )}
                      </Space>
                    </Col>
                  </Row>

                  <Divider />

                  {!enableLoyaltyUI ? (
                    <Alert type="info" showIcon message="Đang tắt hiển thị tích điểm (POS UI)" description="Bạn vẫn có thể chỉnh rule/tier bên dưới. POS sẽ ẩn phần tích điểm." />
                  ) : null}

                  {!loyaltySetting ? (
                    <Alert
                      type="warning"
                      showIcon
                      message="Chưa có Loyalty Setting / Tier"
                      description={
                        <>
                          <div>Bạn đang gặp 404 ở backend (ví dụ: GET /tiers, POST /loyalty-settings/init).</div>
                          <div>Bấm 'Khởi tạo (Init)' sau khi bạn đã tạo route backend tương ứng.</div>
                        </>
                      }
                    />
                  ) : (
                    <>
                      <Card size="small" title="Cấu hình Loyalty (global)">
                        <Row gutter={16}>
                          <Col xs={24} md={8}>
                            <Form.Item label="Rơi xuống tier khi hết hạn" name={["loyalty", "setting", "downgradeTo"]}>
                              <Select
                                options={[
                                  { value: "BRONZE", label: "BRONZE (Đồng)" },
                                  { value: "SILVER", label: "SILVER (Bạc)" },
                                  { value: "GOLD", label: "GOLD (Vàng)" },
                                  { value: "DIAMOND", label: "DIAMOND (Kim cương)" },
                                ]}
                              />
                            </Form.Item>
                          </Col>

                          <Col xs={24} md={8}>
                            <Form.Item label="Tính điểm theo field của order" name={["loyalty", "setting", "pointBase", "field"]}>
                              <Select options={[{ value: "total", label: "order.total (khuyến nghị)" }, { value: "subtotal", label: "order.subtotal" }]} />
                            </Form.Item>
                          </Col>

                          <Col xs={24} md={8}>
                            <Form.Item label="Auto upgrade" name={["loyalty", "setting", "autoUpgrade", "enabled"]} valuePropName="checked">
                              <Switch />
                            </Form.Item>
                            <Text type="secondary">Nâng hạng theo mốc 'Chi tiêu 12 tháng' của từng Tier.</Text>
                          </Col>
                        </Row>

                        <Divider />

                        <Row gutter={16}>
                          <Col xs={24} md={6}>
                            <Form.Item label="Renew khi mua" name={["loyalty", "setting", "renew", "enabled"]} valuePropName="checked">
                              <Switch />
                            </Form.Item>
                          </Col>

                          <Col xs={24} md={6}>
                            <Form.Item label="Cộng thêm (ngày)" name={["loyalty", "setting", "renew", "addDays"]}>
                              <InputNumber min={1} style={{ width: "100%" }} />
                            </Form.Item>
                          </Col>

                          <Col xs={24} md={6}>
                            <Form.Item label="Based on" name={["loyalty", "setting", "renew", "basedOn"]}>
                              <Select options={[{ value: "NOW", label: "NOW (tính từ lúc confirm đơn)" }]} />
                            </Form.Item>
                          </Col>

                          <Col xs={24} md={6}>
                            <Form.Item label="Áp dụng renew cho tier" name={["loyalty", "setting", "renew", "onlyForTiers"]}>
                              <Select
                                mode="multiple"
                                options={[
                                  { value: "SILVER", label: "SILVER" },
                                  { value: "GOLD", label: "GOLD" },
                                  { value: "DIAMOND", label: "DIAMOND" },
                                  { value: "BRONZE", label: "BRONZE" },
                                ]}
                              />
                            </Form.Item>
                          </Col>
                        </Row>

                        <Divider />

                        <Row gutter={16}>
                          <Col xs={24} md={6}>
                            <Form.Item label="Cho phép đổi điểm (Redeem)" name={["loyalty", "setting", "redeem", "redeemEnable"]} valuePropName="checked">
                              <Switch />
                            </Form.Item>
                            <Text type="secondary">Cho phép trừ điểm để giảm tiền khi thanh toán.</Text>
                          </Col>

                          <Col xs={24} md={6}>
                            <Form.Item label="Giá trị VNĐ / 1 point" name={["loyalty", "setting", "redeem", "redeemValueVndPerPoint"]}>
                              <InputNumber min={0} step={100} style={{ width: "100%" }} disabled={!redeemEnable} />
                            </Form.Item>
                            <Text type="secondary">Ví dụ: 1 point = 1.000đ.</Text>
                          </Col>

                          <Col xs={24} md={6}>
                            <Form.Item label="Phần trăm hóa đơn tối đa (%)" name={["loyalty", "setting", "redeem", "percentOfBill"]}>
                              <InputNumber min={0} max={100} step={5} addonAfter="%" style={{ width: "100%" }} disabled={!redeemEnable} />
                            </Form.Item>
                            <Text type="secondary">Ví dụ: tối đa 30% giá trị hóa đơn.</Text>
                          </Col>

                          <Col xs={24} md={6}>
                            <Form.Item label="Điểm tối đa / 1 đơn" name={["loyalty", "setting", "redeem", "maxPointsPerOrder"]}>
                              <InputNumber min={0} step={10} style={{ width: "100%" }} disabled={!redeemEnable} />
                            </Form.Item>
                            <Text type="secondary">Giới hạn cứng số point có thể dùng cho mỗi đơn.</Text>
                          </Col>
                        </Row>

                        <Row className="mt-3">
                          <Col span={24}>
                            <Alert
                              type="info"
                              showIcon
                              message="Gợi ý cấu hình an toàn"
                              description={
                                <>
                                  • Không nên cho dùng quá <b>30–40%</b> giá trị hóa đơn
                                  <br />• Nên giới hạn <b>maxPointsPerOrder</b> để tránh xả điểm lớn
                                </>
                              }
                            />
                          </Col>
                        </Row>

                        <Alert
                          style={{ marginTop: 12 }}
                          type="info"
                          showIcon
                          message="Ghi chú"
                          description="Renew NOW: mỗi lần đơn CONFIRM → expiresAt = now + addDays (không cộng dồn vào hạn cũ)."
                        />
                      </Card>

                      <Divider />

                      <Card
                        size="small"
                        title="Danh sách Tier (sửa trực tiếp tại đây)"
                        extra={
                          <Space>
                            <Button onClick={loadLoyalty} loading={loyaltyLoading}>
                              Refresh Tier
                            </Button>
                            <Button type="primary" onClick={openCreateTier}>
                              Thêm Tier
                            </Button>
                          </Space>
                        }
                      >
                        {tiers.length === 0 ? (
                          <Alert type="warning" showIcon message="Chưa có Tier" description="Bạn cần tạo BRONZE/SILVER/GOLD/DIAMOND trong DB (bấm Thêm Tier)." />
                        ) : (
                          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                            {tiers.map((t) => (
                              <div key={t._id} style={{ border: "1px solid #eee", borderRadius: 10, padding: 12 }}>
                                <Space style={{ width: "100%", justifyContent: "space-between" }}>
                                  <Space>
                                    <Text strong>{t.code}</Text>
                                    <Tag color={t.isActive ? "green" : "default"}>{t.isActive ? "ACTIVE" : "OFF"}</Tag>
                                    <Text type="secondary">{t.name}</Text>
                                  </Space>

                                  <Space>
                                    <Text type="secondary">priority: {t.priority ?? 0}</Text>
                                    <Button size="small" onClick={() => openEditTier(t)}>
                                      Sửa
                                    </Button>
                                  </Space>
                                </Space>

                                <Divider style={{ margin: "8px 0" }} />

                                <Row gutter={16}>
                                  <Col xs={24} md={6}>
                                    <Text type="secondary">Tích điểm</Text>
                                    <div>
                                      <b>{money(t.earn?.amountPerPoint || 0)}</b> / 1 point
                                    </div>
                                  </Col>
                                  <Col xs={24} md={6}>
                                    <Text type="secondary">Làm tròn</Text>
                                    <div>
                                      <b>{t.earn?.round || "FLOOR"}</b>
                                    </div>
                                  </Col>
                                  <Col xs={24} md={6}>
                                    <Text type="secondary">Chặn đơn nhỏ</Text>
                                    <div>
                                      <b>{money(t.earn?.minOrderAmount || 0)}</b>
                                    </div>
                                  </Col>
                                  <Col xs={24} md={6}>
                                    <Text type="secondary">Hạn tier</Text>
                                    <div>
                                      <b>{t.durationDays ? `${t.durationDays} ngày` : "Không hạn"}</b>
                                    </div>
                                  </Col>
                                </Row>

                                <Divider style={{ margin: "8px 0" }} />

                                <Row gutter={16}>
                                  <Col xs={24} md={12}>
                                    <Text type="secondary">Ngưỡng lên hạng (thresholdVnd)</Text>
                                    <div>
                                      <b>{money(t.qualify?.thresholdVnd || 0)}</b>
                                    </div>
                                  </Col>
                                </Row>
                              </div>
                            ))}
                          </div>
                        )}
                      </Card>
                    </>
                  )}
                </>
              ),
            },

            // ===== TAB 4: TierAgency (Khách sỉ / Đại lý) =====
            {
              key: "agency",
              label: "Khách sỉ / Đại lý",
              children: (
                <>
                  <Space style={{ width: "100%", justifyContent: "space-between", marginBottom: 12 }}>
                    <Title level={5} style={{ margin: 0 }}>
                      Cấp sỉ (TierAgency)
                    </Title>
                    <Space>
                      <Button onClick={loadAgencyTiers} loading={agencyLoading}>
                        Refresh
                      </Button>
                      <Button type="primary" onClick={openCreateAgencyTier}>
                        Thêm cấp sỉ
                      </Button>
                    </Space>
                  </Space>

                  {agencyTiers.length === 0 ? (
                    <Alert type="info" showIcon message="Chưa có cấp sỉ" description="Bấm 'Thêm cấp sỉ' để tạo AGENCY_1, AGENCY_2..." />
                  ) : (
                    <Row gutter={[16, 16]}>
                      {agencyTiers
                        .slice()
                        .sort((a, b) => Number(a.level || 0) - Number(b.level || 0))
                        .map((t) => (
                          <Col key={t._id} xs={24} md={12} lg={8}>
                            <Card
                              size="small"
                              title={
                                <Space>
                                  <Text strong>{t.name}</Text>
                                  <Tag color={t.isActive ? "green" : "default"}>{t.isActive ? "ACTIVE" : "OFF"}</Tag>
                                </Space>
                              }
                              extra={<Text type="secondary">{t.code}</Text>}
                              actions={[
                                <Button key="edit" type="link" onClick={() => openEditAgencyTier(t)}>
                                  Sửa
                                </Button>,
                                <Button key="toggle" type="link" onClick={() => toggleAgencyTier(t)} disabled={agencyLoading}>
                                  {t.isActive ? "Tắt" : "Bật"}
                                </Button>,
                                <Popconfirm
                                  key="del"
                                  title="Xoá cấp sỉ này?"
                                  description="Xoá cứng khỏi DB (khuyến nghị chỉ Tắt)."
                                  okText="Xoá"
                                  cancelText="Huỷ"
                                  onConfirm={() => deleteAgencyTier(t)}
                                >
                                  <Button type="link" danger>
                                    Xoá
                                  </Button>
                                </Popconfirm>,
                              ]}
                            >
                              <Space direction="vertical" style={{ width: "100%" }} size={6}>
                                <Text>
                                  <b>Level:</b> {Number(t.level || 0)}
                                </Text>
                                <Text>
                                  <b>Note:</b> {t.note || "—"}
                                </Text>
                                <Alert
                                  type="info"
                                  showIcon
                                  message="Gợi ý"
                                  description="Bạn có thể dùng level để ưu tiên giá: level thấp hơn = ưu tiên cao hơn (tuỳ bạn định nghĩa)."
                                />
                              </Space>
                            </Card>
                          </Col>
                        ))}
                    </Row>
                  )}
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
          <Button
            onClick={() => {
              loadData();
              loadBranches();
              loadLoyalty();
              loadAgencyTiers();
            }}
            disabled={loading}
          >
            Hủy / Tải lại
          </Button>
        </Space>

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
            <img src={form.getFieldValue("logoUrl")} alt="logo" style={{ maxHeight: 80, maxWidth: 240, objectFit: "contain" }} />
          ) : null}
        </Space>
      </Form>

      {/* ===== Branch Modal ===== */}
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
              <Form.Item label="Code" name="code" rules={[{ required: true, message: "Nhập code" }, { min: 2, message: "Tối thiểu 2 ký tự" }]}>
                <Input placeholder="VD: TK01" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Tên cửa hàng" name="name" rules={[{ required: true, message: "Nhập tên cửa hàng" }, { min: 2, message: "Tối thiểu 2 ký tự" }]}>
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
              <Form.Item label="Logo" name="logo">
                <Space style={{ width: "100%", justifyContent: "space-between" }}>
                  <Input placeholder="https://.../uploads/..." />
                  <Upload {...branchLogoUploadProps}>
                    <Button>Upload</Button>
                  </Upload>
                </Space>
                {branchForm.getFieldValue("logo") ? (
                  <div style={{ marginTop: 8, textAlign: "center" }}>
                    <img src={branchForm.getFieldValue("logo")} alt="logo" style={{ maxHeight: 70, maxWidth: "100%", objectFit: "contain" }} />
                  </div>
                ) : null}
              </Form.Item>
            </Col>
          </Row>

          <Form.Item label="Set Main Brand" name="isMain" valuePropName="checked">
            <Switch />
          </Form.Item>

          <Alert type="info" showIcon message="Lưu ý" description='Khi bật "Main Brand": backend sẽ tự tắt isMain của các cửa hàng khác.' />
        </Form>
      </Modal>

      {/* ===== Tier Modal ===== */}
      <Modal
        open={tierModalOpen}
        onCancel={() => setTierModalOpen(false)}
        title={tierModalMode === "create" ? "Thêm Tier" : `Sửa Tier: ${editingTier?.code || ""}`}
        okText={tierModalMode === "create" ? "Tạo" : "Lưu"}
        cancelText="Huỷ"
        onOk={submitTierModal}
        confirmLoading={loyaltyLoading}
        destroyOnClose
      >
        <Form form={tierForm} layout="vertical">
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item label="Code" name="code" rules={[{ required: true, message: "Chọn code" }]}>
                <Select
                  disabled={tierModalMode === "edit"}
                  options={[
                    { value: "BRONZE", label: "BRONZE" },
                    { value: "SILVER", label: "SILVER" },
                    { value: "GOLD", label: "GOLD" },
                    { value: "DIAMOND", label: "DIAMOND" },
                  ]}
                />
              </Form.Item>
            </Col>

            <Col span={12}>
              <Form.Item label="Tên hiển thị" name="name" rules={[{ required: true, message: "Nhập tên" }]}>
                <Input placeholder="VD: Đồng / Bạc / Vàng / Kim cương" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={12}>
            <Col span={12}>
              <Form.Item label="Active" name="isActive" valuePropName="checked">
                <Switch />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Xếp Hạng Level" name="priority">
                <InputNumber style={{ width: "100%" }} />
              </Form.Item>
            </Col>
          </Row>

          <Divider />

          <Row gutter={12}>
            <Col span={12}>
              <Form.Item label="Amount / 1 point (VND)" name="earn_amountPerPoint" rules={[{ required: true, message: "Nhập amountPerPoint" }]}>
                <InputNumber min={1} step={1000} style={{ width: "100%" }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Round" name="earn_round">
                <Select
                  options={[
                    { value: "FLOOR", label: "FLOOR (lấy xuống)" },
                    { value: "ROUND", label: "ROUND" },
                    { value: "CEIL", label: "CEIL (lấy lên)" },
                  ]}
                />
              </Form.Item>
            </Col>
          </Row>

          <Divider />

          <Row gutter={12}>
            <Col span={12}>
              <Space style={{ width: "100%", justifyContent: "space-between" }}>
                <Text strong>Chặn đơn nhỏ (Min order)</Text>
                <Switch checked={useMinOrderGate} onChange={setUseMinOrderGate} />
              </Space>
              <Text type="secondary">Nếu bạn không cần, tắt đi. Khi tắt: backend nhận minOrderAmount = 0.</Text>
            </Col>

            <Col span={12}>
              <Form.Item label="Min order amount (VND)" name="earn_minOrderAmount">
                <InputNumber min={0} step={1000} style={{ width: "100%" }} disabled={!useMinOrderGate} />
              </Form.Item>
            </Col>
          </Row>

          <Divider />

          <Row gutter={12}>
            <Col span={12}>
              <Form.Item label="Ngưỡng lên hạng (thresholdVnd)" name="qualify_thresholdVnd">
                <InputNumber min={0} step={100000} style={{ width: "100%" }} />
              </Form.Item>
              <Text type="secondary">VD: SILVER 10.000.000, GOLD 30.000.000…</Text>
            </Col>
            <Col span={12}>
              <Form.Item label="Duration (ngày) - 0 = không hạn" name="durationDays">
                <InputNumber min={0} step={30} style={{ width: "100%" }} />
              </Form.Item>
            </Col>
          </Row>

          <Alert
            type="info"
            showIcon
            message="Chuẩn hoá logic"
            description={
              <div>
                <div>
                  • Điểm cộng khi đơn <b>CONFIRM</b>.
                </div>
                <div>
                  • amountPerPoint = số tiền để được <b>1 điểm</b> (VD 100.000 = 1 điểm).
                </div>
                <div>
                  • thresholdVnd = ngưỡng chi tiêu 12 tháng để <b>lên hạng</b>.
                </div>
              </div>
            }
          />
        </Form>
      </Modal>

      {/* ===== TierAgency Modal ===== */}
      <Modal
        open={agencyModalOpen}
        onCancel={() => setAgencyModalOpen(false)}
        title={agencyModalMode === "create" ? "Thêm cấp sỉ (TierAgency)" : `Sửa cấp sỉ: ${editingAgencyTier?.code || ""}`}
        okText={agencyModalMode === "create" ? "Tạo" : "Lưu"}
        cancelText="Huỷ"
        onOk={submitAgencyTierModal}
        confirmLoading={agencyLoading}
        destroyOnClose
      >
        <Form form={agencyForm} layout="vertical">
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
                <Input placeholder="VD: AGENCY_1" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="Tên cấp sỉ"
                name="name"
                rules={[
                  { required: true, message: "Nhập tên" },
                  { min: 2, message: "Tối thiểu 2 ký tự" },
                ]}
              >
                <Input placeholder="VD: Sỉ cấp 1" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={12}>
            <Col span={12}>
              <Form.Item label="Level (sắp xếp/ưu tiên)" name="level">
                <InputNumber min={0} step={1} style={{ width: "100%" }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Active" name="isActive" valuePropName="checked">
                <Switch />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item label="Note" name="note">
            <Input.TextArea rows={3} placeholder="Mô tả/điều kiện áp dụng (tuỳ chọn)..." />
          </Form.Item>

          <Alert
            type="info"
            showIcon
            message="Chuẩn dùng"
            description={
              <>
                • Code nên chuẩn hoá: <b>AGENCY_1</b>, <b>AGENCY_2</b>... <br />
                • Bạn sẽ dùng TierAgency để map ra bảng giá sỉ theo từng level.
              </>
            }
          />
        </Form>
      </Modal>
    </Card>
  );
};

export default ShopSettings;
