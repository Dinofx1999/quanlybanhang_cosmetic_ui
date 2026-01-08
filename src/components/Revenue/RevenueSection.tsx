import React from "react";
import {
  Package,
  AlertTriangle,
  TrendingUp,
  Plus,
  Trash2,
  CheckCircle2,
  ClipboardList,
  Warehouse,
} from "lucide-react";
import api from "../../services/api";

// ===============================
// Types
// ===============================
interface Product {
  id: number;
  name: string;
  category: string;
  price: number;
  stock: number;
  image: string;
  barcode: string;

  _id?: string; // backend mongo id
  sku?: string;
}

interface InventorySectionProps {
  products: Product[];
  selectedBranchId?: string | null;
  refreshProducts?: () => Promise<void> | void;
}

type ViewKey = "inventory" | "inbound_create" | "inbound_confirm";

type InboundItem = {
  productId: string;
  qty: number;
  cost: number;
};

// ===============================
// Helpers
// ===============================
const money = (n: any) => Number(n || 0).toLocaleString("vi-VN");

const getUserFromStorage = (): { role?: string; branchId?: string | null } => {
  try {
    const raw =
      localStorage.getItem("user") ||
      localStorage.getItem("currentUser") ||
      localStorage.getItem("auth_user");
    if (!raw) return {};
    const u = JSON.parse(raw);
    return { role: u?.role, branchId: u?.branchId ?? null };
  } catch {
    return {};
  }
};

const getStockStatus = (stock: number) => {
  if (stock < 10)
    return { color: "text-red-600", bg: "bg-red-50", label: "Rất thấp", icon: "🔴" };
  if (stock < 30)
    return { color: "text-yellow-700", bg: "bg-yellow-50", label: "Thấp", icon: "🟡" };
  return { color: "text-green-700", bg: "bg-green-50", label: "Tốt", icon: "🟢" };
};

const InventorySection: React.FC<InventorySectionProps> = ({
  products,
  selectedBranchId,
  refreshProducts,
}) => {
  // ✅ default mở kiểm kho
  const [view, setView] = React.useState<ViewKey>("inventory");

  // toast nhỏ
  const [toast, setToast] = React.useState<string>("");
  const showToast = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(""), 1600);
  };

  // ===============================
  // Branch logic
  // ===============================
  const user = React.useMemo(() => getUserFromStorage(), []);
  const role = String(user.role || "").toUpperCase();
  const isAdminOrManager = role === "ADMIN" || role === "MANAGER";

  const resolvedBranchId = React.useMemo(() => {
    if (selectedBranchId !== undefined) return selectedBranchId;
    return user.branchId ?? null;
  }, [selectedBranchId, user.branchId]);

  // ===============================
  // Stats
  // ===============================
  const lowStockProducts = products.filter((p) => (p.stock ?? 0) < 30);
  const totalValue = products.reduce(
    (sum, p) => sum + Number(p.price || 0) * Number(p.stock || 0),
    0
  );
  const totalItems = products.reduce((sum, p) => sum + Number(p.stock || 0), 0);

  // ===============================
  // Inbound state
  // ===============================
  const [branchIdInput, setBranchIdInput] = React.useState<string>(resolvedBranchId || "");
  const [supplier, setSupplier] = React.useState<string>("NPP A");
  const [note, setNote] = React.useState<string>("Nhập hàng Kho Phụ");

  const [items, setItems] = React.useState<InboundItem[]>([]);
  const [productPick, setProductPick] = React.useState<string>("");
  const [qtyPick, setQtyPick] = React.useState<number>(1);
  const [costPick, setCostPick] = React.useState<number>(0);

  const [creating, setCreating] = React.useState(false);
  const [createdInboundId, setCreatedInboundId] = React.useState<string>("");

  const [confirmId, setConfirmId] = React.useState<string>("");
  const [confirming, setConfirming] = React.useState(false);

  React.useEffect(() => {
    if (resolvedBranchId) setBranchIdInput(resolvedBranchId);
  }, [resolvedBranchId]);

  // sản phẩm dùng cho select: phải có _id
  const productsForSelect = React.useMemo(() => {
    return (products || []).filter((p) => p._id);
  }, [products]);

  const totalInboundCost = React.useMemo(() => {
    return items.reduce((sum, it) => sum + Number(it.qty || 0) * Number(it.cost || 0), 0);
  }, [items]);

  const addItem = () => {
    const pid = String(productPick || "").trim();
    if (!pid) return showToast("Chọn sản phẩm trước");
    const q = Number(qtyPick || 0);
    const c = Number(costPick || 0);

    if (q <= 0) return showToast("Số lượng phải > 0");
    if (c < 0) return showToast("Giá vốn không hợp lệ");

    setItems((prev) => {
      const existed = prev.find((x) => x.productId === pid);
      if (existed) {
        return prev.map((x) => (x.productId === pid ? { ...x, qty: x.qty + q, cost: c } : x));
      }
      return [...prev, { productId: pid, qty: q, cost: c }];
    });

    setProductPick("");
    setQtyPick(1);
    setCostPick(0);
  };

  const removeItem = (pid: string) => setItems((prev) => prev.filter((x) => x.productId !== pid));

  const getNameById = (pid: string) => {
    const p = productsForSelect.find((x) => x._id === pid);
    if (!p) return pid;
    return `${p.name}${p.sku ? ` • ${p.sku}` : ""}`;
  };

  const createInbound = async () => {
    const branchId = String(branchIdInput || "").trim();
    if (!branchId) return showToast("Thiếu branchId");
    if (!supplier.trim()) return showToast("Thiếu nhà cung cấp");
    if (items.length === 0) return showToast("Chưa có sản phẩm nhập");

    setCreating(true);
    setCreatedInboundId("");
    try {
      const payload = {
        branchId,
        supplier: supplier.trim(),
        note: note.trim(),
        items: items.map((x) => ({
          productId: x.productId,
          qty: Number(x.qty || 0),
          cost: Number(x.cost || 0),
        })),
      };

      const res = await api.post("/inbounds", payload);
      const inboundId = String(res.data?.inbound?._id || res.data?._id || res.data?.id || "");
      if (!inboundId) {
        showToast("Tạo phiếu OK nhưng không lấy được inboundId");
        return;
      }

      setCreatedInboundId(inboundId);
      setConfirmId(inboundId);
      showToast("✅ Tạo phiếu nhập thành công");
      setView("inbound_confirm");
    } catch (err: any) {
      console.error("Create inbound error:", err?.response?.data || err?.message);
      showToast(err?.response?.data?.message || "Tạo phiếu nhập thất bại");
    } finally {
      setCreating(false);
    }
  };

  const confirmInbound = async () => {
    const id = String(confirmId || "").trim();
    if (!id) return showToast("Nhập inboundId để xác nhận");

    setConfirming(true);
    try {
      await api.post(`/inbounds/${id}/confirm`, {});
      showToast("✅ Xác nhận phiếu thành công");

      await Promise.resolve(refreshProducts?.());

      // reset
      setItems([]);
      setSupplier("NPP A");
      setNote("Nhập hàng Kho Phụ");
      setCreatedInboundId("");
      setConfirmId("");
      setView("inventory");
    } catch (err: any) {
      console.error("Confirm inbound error:", err?.response?.data || err?.message);
      showToast(err?.response?.data?.message || "Xác nhận phiếu thất bại");
    } finally {
      setConfirming(false);
    }
  };

  // ===============================
  // Render
  // ===============================
  return (
    <div className="space-y-4">
      {/* Header + Switch */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-extrabold text-gray-800">Kho</h2>
          <p className="text-sm text-gray-600 mt-1">Kiểm kho • Nhập kho • Xác nhận phiếu</p>

          {resolvedBranchId && (
            <div className="mt-2 inline-flex items-center gap-2 text-xs px-2 py-1 rounded-lg border border-gray-200 bg-white">
              <Warehouse className="w-4 h-4 text-gray-600" />
              <span className="text-gray-700 font-semibold">Branch:</span>
              <span className="text-gray-600">{resolvedBranchId}</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-2xl p-1">
          <button
            onClick={() => setView("inventory")}
            className={[
              "px-3 py-2 rounded-xl text-sm font-bold transition-all",
              view === "inventory" ? "bg-pink-500 text-white" : "text-gray-700 hover:bg-gray-50",
            ].join(" ")}
          >
            Kiểm kho
          </button>

          <button
            onClick={() => setView("inbound_create")}
            className={[
              "px-3 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2",
              view === "inbound_create" ? "bg-pink-500 text-white" : "text-gray-700 hover:bg-gray-50",
            ].join(" ")}
          >
            <ClipboardList className="w-4 h-4" />
            Nhập Kho
          </button>

          <button
            onClick={() => setView("inbound_confirm")}
            className={[
              "px-3 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2",
              view === "inbound_confirm" ? "bg-pink-500 text-white" : "text-gray-700 hover:bg-gray-50",
            ].join(" ")}
          >
            <CheckCircle2 className="w-4 h-4" />
            Xác nhận
          </button>
        </div>
      </div>

      {toast && (
        <div className="bg-black/80 text-white text-sm font-semibold px-3 py-2 rounded-xl inline-block w-fit">
          {toast}
        </div>
      )}

      {/* ===============================
          VIEW: INVENTORY
      =============================== */}
      {view === "inventory" && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="bg-white rounded-2xl border border-gray-200 p-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-blue-50 rounded-xl">
                  <Package className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-800">{products.length}</div>
                  <div className="text-sm text-gray-600">Loại SP</div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 p-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-green-50 rounded-xl">
                  <TrendingUp className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-800">{totalItems}</div>
                  <div className="text-sm text-gray-600">Tổng SL</div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 p-4 col-span-2 lg:col-span-1">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-purple-50 rounded-xl">
                  <AlertTriangle className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-800">{lowStockProducts.length}</div>
                  <div className="text-sm text-gray-600">Sắp hết</div>
                </div>
              </div>
            </div>
          </div>

          {lowStockProducts.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-yellow-700 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-gray-800 mb-1">Cảnh báo tồn kho thấp</h3>
                  <p className="text-sm text-gray-700">{lowStockProducts.length} sản phẩm cần nhập thêm</p>
                </div>
              </div>
            </div>
          )}

          <div className="bg-white rounded-2xl border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div className="text-gray-700 font-semibold">Tổng giá trị tồn (giá bán)</div>
              <div className="text-xl font-extrabold text-gray-800">{money(totalValue)}đ</div>
            </div>
            <div className="text-xs text-gray-500 mt-1">Tính theo: price × stock</div>
          </div>
        </>
      )}

      {/* ===============================
          VIEW: INBOUND CREATE
      =============================== */}
      {view === "inbound_create" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white rounded-2xl border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="font-extrabold text-gray-800 text-lg">Phiếu Nhập Kho (Tạo Phiếu)</div>
                <div className="text-xs text-gray-500 font-mono">POST /api/inbounds</div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-semibold text-gray-700">BranchId</label>
                  <input
                    value={branchIdInput}
                    onChange={(e) => setBranchIdInput(e.target.value)}
                    disabled={!isAdminOrManager && !!resolvedBranchId}
                    className="mt-1 w-full px-3 py-2.5 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent disabled:bg-gray-100"
                    placeholder="695e0aca431b608125a8d860"
                  />
                  {!isAdminOrManager && !resolvedBranchId && (
                    <div className="text-xs text-red-600 mt-1 font-semibold">
                      STAFF bắt buộc có branchId
                    </div>
                  )}
                </div>

                <div>
                  <label className="text-sm font-semibold text-gray-700">Nhà cung cấp</label>
                  <input
                    value={supplier}
                    onChange={(e) => setSupplier(e.target.value)}
                    className="mt-1 w-full px-3 py-2.5 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                    placeholder="NPP A"
                  />
                </div>
              </div>

              <div className="mt-3">
                <label className="text-sm font-semibold text-gray-700">Ghi chú</label>
                <input
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="mt-1 w-full px-3 py-2.5 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                  placeholder="Nhập hàng Kho Phụ"
                />
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="font-bold text-gray-800">Thêm sản phẩm</div>
                <div className="text-xs text-gray-500">
                  {productsForSelect.length === 0 ? (
                    <span className="text-red-600 font-semibold">
                      products chưa có _id (không chọn được productId)
                    </span>
                  ) : (
                    "Chọn productId + qty + cost"
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="sm:col-span-2">
                  <label className="text-sm font-semibold text-gray-700">Sản phẩm</label>
                  <select
                    value={productPick}
                    onChange={(e) => setProductPick(e.target.value)}
                    className="mt-1 w-full px-3 py-2.5 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                  >
                    <option value="">-- Chọn sản phẩm --</option>
                    {productsForSelect.map((p) => (
                      <option key={String(p._id)} value={String(p._id)}>
                        {p.name} {p.sku ? `(${p.sku})` : ""} • {p.category}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-sm font-semibold text-gray-700">SL</label>
                  <input
                    type="number"
                    value={qtyPick}
                    onChange={(e) => setQtyPick(Number(e.target.value))}
                    className="mt-1 w-full px-3 py-2.5 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                    min={1}
                  />
                </div>

                <div>
                  <label className="text-sm font-semibold text-gray-700">Giá vốn</label>
                  <input
                    type="number"
                    value={costPick}
                    onChange={(e) => setCostPick(Number(e.target.value))}
                    className="mt-1 w-full px-3 py-2.5 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                    min={0}
                  />
                </div>
              </div>

              <div className="mt-3 flex justify-end">
                <button
                  onClick={addItem}
                  className="px-4 py-2.5 rounded-xl bg-pink-500 hover:bg-pink-600 text-white font-extrabold flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Thêm vào phiếu
                </button>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                <div className="font-bold text-gray-800">Danh sách nhập</div>
                <div className="text-sm font-extrabold text-gray-800">Tổng: {money(totalInboundCost)}đ</div>
              </div>

              {items.length === 0 ? (
                <div className="p-6 text-sm text-gray-500">Chưa có sản phẩm trong phiếu.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Sản phẩm</th>
                        <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">SL</th>
                        <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Giá vốn</th>
                        <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Thành tiền</th>
                        <th className="px-4 py-3"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {items.map((it) => (
                        <tr key={it.productId}>
                          <td className="px-4 py-3">
                            <div className="font-semibold text-gray-800">{getNameById(it.productId)}</div>
                            <div className="text-xs text-gray-500 font-mono">{it.productId}</div>
                          </td>
                          <td className="px-4 py-3 text-center font-bold">{it.qty}</td>
                          <td className="px-4 py-3 text-right font-semibold">{money(it.cost)}đ</td>
                          <td className="px-4 py-3 text-right font-extrabold">{money(it.qty * it.cost)}đ</td>
                          <td className="px-4 py-3 text-right">
                            <button
                              onClick={() => removeItem(it.productId)}
                              className="p-2 rounded-xl bg-red-50 hover:bg-red-100 border border-red-200"
                            >
                              <Trash2 className="w-4 h-4 text-red-600" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="p-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between gap-2">
                <div className="text-xs text-gray-600">
                  {createdInboundId ? (
                    <>
                      <span className="font-semibold text-gray-700">InboundId:</span>{" "}
                      <span className="font-mono">{createdInboundId}</span>
                    </>
                  ) : (
                    "Tạo phiếu xong sẽ có inboundId để xác nhận"
                  )}
                </div>

                <button
                  onClick={createInbound}
                  disabled={creating}
                  className="px-5 py-2.5 rounded-xl bg-pink-500 hover:bg-pink-600 text-white font-extrabold disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  {creating ? "Đang tạo..." : "Tạo phiếu nhập"}
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-yellow-50 rounded-2xl border border-yellow-200 p-4">
              <div className="flex gap-2">
                <AlertTriangle className="w-5 h-5 text-yellow-700 mt-0.5" />
                <div className="text-sm text-gray-700">
                  Tạo phiếu xong nhớ qua <b>Xác nhận</b> để cộng tồn kho.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===============================
          VIEW: INBOUND CONFIRM
      =============================== */}
      {view === "inbound_confirm" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white rounded-2xl border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="font-extrabold text-gray-800 text-lg">Xác nhận phiếu nhập</div>
                <div className="text-xs text-gray-500 font-mono">POST /api/inbounds/:id/confirm</div>
              </div>

              <label className="text-sm font-semibold text-gray-700">InboundId</label>
              <input
                value={confirmId}
                onChange={(e) => setConfirmId(e.target.value)}
                className="mt-1 w-full px-3 py-2.5 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent font-mono"
                placeholder="695e0b01431b608125a8d864"
              />

              {createdInboundId && (
                <div className="mt-2 text-sm text-gray-700">
                  Phiếu vừa tạo: <span className="font-mono font-semibold">{createdInboundId}</span>
                </div>
              )}

              <div className="mt-4 flex justify-end">
                <button
                  onClick={confirmInbound}
                  disabled={confirming}
                  className="px-5 py-2.5 rounded-xl bg-pink-500 hover:bg-pink-600 text-white font-extrabold disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  {confirming ? "Đang xác nhận..." : "Xác nhận phiếu"}
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-green-50 rounded-2xl border border-green-200 p-4">
              <div className="flex gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-700 mt-0.5" />
                <div className="text-sm text-gray-700">
                  Xác nhận xong, tồn kho của branch sẽ được cộng.
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 p-4">
              <div className="font-bold text-gray-800 mb-2">Nếu vẫn “không thấy thay đổi”</div>
              <div className="text-sm text-gray-700 space-y-1">
                <div>1) Bạn có đang ở đúng route <b>/inventory</b> không?</div>
                <div>2) Sidebar “Nhập Kho” có trỏ nhầm <b>/warehouse</b> không?</div>
                <div>3) File bạn sửa có đúng path import không?</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer note */}
      <div className="text-xs text-gray-500">
        Nếu bạn click “Nhập Kho” mà không đổi, gần như chắc chắn Sidebar đang điều hướng sai route (warehouse vs inventory)
        hoặc bạn sửa sai file.
      </div>
    </div>
  );
};

export default InventorySection;
