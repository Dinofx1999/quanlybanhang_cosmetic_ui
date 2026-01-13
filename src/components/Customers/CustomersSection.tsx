import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Edit, Trash2, Phone, Mail, User, Calendar, RefreshCcw } from "lucide-react";
import api from "../../services/api"; // sửa path cho đúng project bạn (vd: "../../services/api")

// ===============================
// Types theo response /api/customers
// ===============================
type TierInfo = {
  code?: string; // BRONZE / SILVER / GOLD ...
  startsAt?: string | null;
  expiresAt?: string | null;
  locked?: boolean;
  permanent?: boolean;
};

type CustomerStats = {
  lastOrderAt?: string | null;
  ordersAll?: number;
  spendAll?: number;
};

export interface Customer {
  _id: string;
  name: string;
  phone: string;
  email?: string;
  dob?: string | null; // ISO
  points?: number;

  stats?: CustomerStats;
  tier?: TierInfo;

  createdAt?: string;
  updatedAt?: string;
}

type CustomersResponse = {
  ok: boolean;
  items: Customer[];
  error?: any;
};

// ===============================
// Helpers
// ===============================
const fmtMoney = (n?: number) => Number(n || 0).toLocaleString("vi-VN") + "đ";

const fmtDate = (iso?: string | null) => {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  // dd/mm/yyyy
  return d.toLocaleDateString("vi-VN");
};

const fmtDateTime = (iso?: string | null) => {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString("vi-VN");
};

const tierLabel = (code?: string) => {
  if (!code) return "—";
  return String(code).toUpperCase();
};

const tierBadgeClass = (code?: string) => {
  const c = String(code || "").toUpperCase();
  if (c === "DIAMOND") return "bg-purple-100 text-purple-700";
  if (c === "PLATINUM") return "bg-slate-100 text-slate-700";
  if (c === "GOLD") return "bg-yellow-100 text-yellow-700";
  if (c === "SILVER") return "bg-gray-100 text-gray-700";
  if (c === "BRONZE") return "bg-orange-100 text-orange-700";
  return "bg-gray-100 text-gray-700";
};

const CustomersSection: React.FC = () => {
  const [items, setItems] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string>("");

  const [showModal, setShowModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    setErr("");
    try {
      const { data } = await api.get<CustomersResponse>("/customers");
      if (!data?.ok) {
        setErr("Không tải được danh sách khách hàng.");
        setItems([]);
        return;
      }
      setItems(Array.isArray(data.items) ? data.items : []);
    } catch (e: any) {
      const msg =
        e?.response?.data?.message ||
        e?.message ||
        "Lỗi kết nối API. Vui lòng thử lại.";
      setErr(msg);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const totals = useMemo(() => {
    const total = items.length;
    const totalPoints = items.reduce((sum, c) => sum + Number(c.points || 0), 0);
    const totalSpend = items.reduce((sum, c) => sum + Number(c.stats?.spendAll || 0), 0);
    const newThisMonth = items.filter((c) => {
      if (!c.createdAt) return false;
      const d = new Date(c.createdAt);
      if (Number.isNaN(d.getTime())) return false;
      const now = new Date();
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length;

    return { total, totalPoints, totalSpend, newThisMonth };
  }, [items]);

  const openAdd = () => {
    setEditingCustomer(null);
    setShowModal(true);
  };

  const openEdit = (c: Customer) => {
    setEditingCustomer(c);
    setShowModal(true);
  };

  const deleteCustomer = async (id: string) => {
    if (!window.confirm("Xóa khách hàng này?")) return;

    // ✅ Nếu bạn có API xoá, bật lại dòng dưới:
    // await api.delete(`/customers/${id}`);

    // Tạm thời: xoá trên UI để test
    setItems((prev) => prev.filter((x) => x._id !== id));
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Quản Lý Khách Hàng</h2>
          <p className="text-sm text-gray-600 mt-1">
            Tổng: {loading ? "…" : items.length} khách hàng
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchCustomers}
            className="inline-flex items-center gap-2 px-3 py-2.5 bg-white text-gray-700 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
            title="Tải lại"
          >
            <RefreshCcw className={`w-5 h-5 ${loading ? "animate-spin" : ""}`} />
            <span className="font-medium">Tải lại</span>
          </button>

          <button
            onClick={openAdd}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-pink-500 text-white rounded-lg hover:bg-pink-600 transition-colors"
          >
            <Plus className="w-5 h-5" />
            <span className="font-medium">Thêm khách hàng</span>
          </button>
        </div>
      </div>

      {/* Error */}
      {err && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">
          {err}
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-2xl font-bold text-gray-800">{loading ? "…" : totals.total}</div>
          <div className="text-sm text-gray-600 mt-1">Tổng KH</div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-2xl font-bold text-green-600">
            {loading ? "…" : totals.totalPoints.toLocaleString("vi-VN")}
          </div>
          <div className="text-sm text-gray-600 mt-1">Tổng điểm</div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-2xl font-bold text-pink-600">
            {loading ? "…" : (totals.totalSpend / 1_000_000).toFixed(1) + "M"}
          </div>
          <div className="text-sm text-gray-600 mt-1">Tổng chi tiêu</div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-2xl font-bold text-blue-600">{loading ? "…" : totals.newThisMonth}</div>
          <div className="text-sm text-gray-600 mt-1">Mới tháng này</div>
        </div>
      </div>

      {/* List */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {/* Loading skeleton (nhẹ) */}
        {loading && items.length === 0 ? (
          <div className="p-4 text-sm text-gray-600">Đang tải danh sách khách hàng…</div>
        ) : items.length === 0 ? (
          <div className="p-4 text-sm text-gray-600">Chưa có khách hàng nào.</div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Khách Hàng</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Liên hệ</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Hạng</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Điểm</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Chi tiêu</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Lần mua gần nhất</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Thao tác</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-200">
                  {items.map((c) => (
                    <tr key={c._id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-pink-100 rounded-lg flex items-center justify-center">
                            <User className="w-5 h-5 text-pink-600" />
                          </div>
                          <div>
                            <div className="font-medium text-gray-800">{c.name || "—"}</div>
                            <div className="text-sm text-gray-500">ID: {c._id}</div>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Phone className="w-4 h-4" />
                            <span>{c.phone || "—"}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Mail className="w-4 h-4" />
                            <span>{c.email || "—"}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Calendar className="w-4 h-4" />
                            <span>Ngày Sinh: {fmtDate(c.dob)}</span>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3 text-center">
                        <span
                          className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${tierBadgeClass(
                            c.tier?.code
                          )}`}
                        >
                          {tierLabel(c.tier?.code)}
                        </span>
                      </td>

                      <td className="px-4 py-3 text-right font-semibold text-gray-800">
                        {Number(c.points || 0).toLocaleString("vi-VN")}
                      </td>

                      <td className="px-4 py-3 text-right font-semibold text-gray-800">
                        {fmtMoney(c.stats?.spendAll)}
                        <div className="text-xs text-gray-500 font-normal">
                          {Number(c.stats?.ordersAll || 0)} đơn
                        </div>
                      </td>

                      <td className="px-4 py-3 text-center text-sm text-gray-600">
                        {fmtDateTime(c.stats?.lastOrderAt)}
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => openEdit(c)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                            title="Sửa"
                          >
                            <Edit className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => deleteCustomer(c._id)}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                            title="Xóa"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="lg:hidden divide-y divide-gray-200">
              {items.map((c) => (
                <div key={c._id} className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-pink-100 rounded-lg flex items-center justify-center">
                        <User className="w-6 h-6 text-pink-600" />
                      </div>
                      <div>
                        <div className="font-semibold text-gray-800">{c.name || "—"}</div>
                        <div className="text-sm text-gray-600">{c.phone || "—"}</div>
                      </div>
                    </div>

                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${tierBadgeClass(c.tier?.code)}`}
                    >
                      {tierLabel(c.tier?.code)}
                    </span>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-gray-600">
                      <Mail className="w-4 h-4" />
                      <span>{c.email || "—"}</span>
                    </div>

                    <div className="flex items-center gap-2 text-gray-600">
                      <Calendar className="w-4 h-4" />
                      <span>Ngày Sinh: {fmtDate(c.dob)}</span>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-gray-200">
                      <div className="text-gray-700">
                        <div className="font-semibold text-gray-800">
                          Điểm: {Number(c.points || 0).toLocaleString("vi-VN")}
                        </div>
                        <div className="text-xs text-gray-500">
                          Chi tiêu: {fmtMoney(c.stats?.spendAll)} • {Number(c.stats?.ordersAll || 0)} đơn
                        </div>
                        <div className="text-xs text-gray-500">
                          Gần nhất: {fmtDateTime(c.stats?.lastOrderAt)}
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => openEdit(c)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                          title="Sửa"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => deleteCustomer(c._id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                          title="Xóa"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Modal placeholder (bạn gắn Form tạo/sửa ở đây) */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl w-full max-w-lg p-4">
            <div className="flex items-center justify-between">
              <div className="font-semibold text-gray-800">
                {editingCustomer ? "Sửa khách hàng" : "Thêm khách hàng"}
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="px-3 py-1.5 rounded-lg hover:bg-gray-100 text-gray-700"
              >
                Đóng
              </button>
            </div>

            <div className="mt-3 text-sm text-gray-600">
              Modal form chưa được bạn cung cấp field + API tạo/sửa.
              <br />
              Customer đang chọn:{" "}
              <span className="font-medium text-gray-800">
                {editingCustomer?.name || "—"}
              </span>
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 rounded-lg border border-gray-200 hover:bg-gray-50"
              >
                Huỷ
              </button>
              <button
                className="px-4 py-2 rounded-lg bg-pink-500 text-white hover:bg-pink-600"
                onClick={() => setShowModal(false)}
              >
                Lưu (demo)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomersSection;
