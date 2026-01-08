// src/components/Layout/Layout.tsx
import React, { useEffect, useMemo, useState } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import Sidebar from "../Sidebar/Sidebar";
import { logout } from "../../services/authService";
import { LogOut, Store } from "lucide-react";
import api from "../../services/api";

type Role = "ADMIN" | "MANAGER" | "STAFF" | "CASHIER" | "USER";

interface User {
  id?: string | number;
  username?: string;
  name?: string;
  role?: Role | string;
  branchId?: string | null; // STAFF có branchId, ADMIN/MANAGER thường null
}

interface Branch {
  _id: string;
  name?: string;
  code?: string;
  address?: string;
  isActive?: boolean;
}

interface LayoutProps {
  currentUser: User | null;
}

/**
 * Lưu lựa chọn branch để api.ts có thể đọc và tự gắn vào query params.
 * - STAFF: ép theo currentUser.branchId
 * - ADMIN/MANAGER: cho chọn 1 branch hoặc "ALL"
 */
const STORAGE_KEY = "activeBranchId"; // giá trị: "ALL" | "<branchId>"

export const getActiveBranchId = (user?: User | null): string => {
  if (!user) return "ALL";
  const role = String(user.role || "").toUpperCase();
  if (role === "STAFF" || role === "CASHIER") {
    return user.branchId ? String(user.branchId) : "ALL";
  }
  // ADMIN/MANAGER
  return localStorage.getItem(STORAGE_KEY) || "ALL";
};

// (optional) nếu bạn muốn api.ts import thẳng từ Layout
export const setActiveBranchId = (val: string) => {
  localStorage.setItem(STORAGE_KEY, val);
};

const Layout: React.FC<LayoutProps> = ({ currentUser }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const role = String(currentUser?.role || "").toUpperCase();
  const isStaff = role === "STAFF" || role === "CASHIER";
  const isAdminOrManager = role === "ADMIN" || role === "MANAGER";

  const [branches, setBranches] = useState<Branch[]>([]);
  const [loadingBranches, setLoadingBranches] = useState(false);

  // selected branch in UI
  const [selectedBranch, setSelectedBranch] = useState<string>("ALL");

  const getPageTitle = (): string => {
    const path = location.pathname;
    if (path.includes("/pos")) return "Bán Hàng";
    if (path.includes("/orders")) return "Đơn Hàng";
    if (path.includes("/products")) return "Sản Phẩm";
    if (path.includes("/inventory")) return "Kiểm Kho";
    if (path.includes("/warehouse")) return "Quản Lý Kho";
    if (path.includes("/staff")) return "Nhân Viên";
    if (path.includes("/revenue")) return "Doanh Thu";
    return "Dashboard";
  };

  const handleLogout = (): void => {
    if (window.confirm("Bạn có chắc muốn đăng xuất?")) {
      logout();
      localStorage.removeItem(STORAGE_KEY);
      navigate("/login");
    }
  };

  // Load branches (chỉ khi ADMIN/MANAGER)
  useEffect(() => {
    const load = async () => {
      if (!isAdminOrManager) return;

      setLoadingBranches(true);
      try {
        // ✅ Bạn cần backend route GET /api/branches
        // Response kỳ vọng: { ok:true, items:[...] }
        const res = await api.get("/branches");
        const items = res.data?.items || res.data?.branches || [];
        setBranches(items);
      } catch (e: any) {
        console.error("Load branches error:", e?.response?.data || e?.message);
        setBranches([]);
      } finally {
        setLoadingBranches(false);
      }
    };

    load();
  }, [isAdminOrManager]);

  // Init selected branch
  useEffect(() => {
    if (!currentUser) return;

    if (isStaff) {
      const staffBranch = currentUser.branchId ? String(currentUser.branchId) : "ALL";
      setSelectedBranch(staffBranch);
      setActiveBranchId(staffBranch);
      return;
    }

    // ADMIN/MANAGER: lấy từ localStorage
    const saved = localStorage.getItem(STORAGE_KEY) || "ALL";
    setSelectedBranch(saved);
  }, [currentUser, isStaff]);

  const branchLabel = useMemo(() => {
    if (!currentUser) return "—";

    if (isStaff) {
      const id = currentUser.branchId ? String(currentUser.branchId) : "";
      const b = branches.find((x) => String(x._id) === id);
      return b?.name || (id ? `Cửa hàng (${id.slice(-6)})` : "Cửa hàng");
    }

    if (selectedBranch === "ALL") return "Tất cả cửa hàng";
    const b = branches.find((x) => String(x._id) === String(selectedBranch));
    return b?.name || `Cửa hàng (${String(selectedBranch).slice(-6)})`;
  }, [currentUser, isStaff, selectedBranch, branches]);

  const onChangeBranch = (val: string) => {
    if (isStaff) return; // staff không cho đổi
    setSelectedBranch(val);
    setActiveBranchId(val);

    // Optional: nếu bạn muốn reload trang để các page fetch lại theo branch
    // window.location.reload();
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar */}
        <div className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 lg:px-6">
          <div className="flex items-center gap-4 min-w-0 ml-12 lg:ml-0">
            <h2 className="text-lg font-semibold text-gray-800 truncate">{getPageTitle()}</h2>

            {/* ✅ Branch selector */}
            <div className="hidden md:flex items-center gap-2">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-lg">
                <Store className="w-4 h-4 text-gray-600" />
                <span className="text-sm font-medium text-gray-700 truncate max-w-[220px]">
                  {branchLabel}
                </span>
              </div>

              {isAdminOrManager && (
                <div className="flex items-center gap-2">
                  <select
                    value={selectedBranch}
                    onChange={(e) => onChangeBranch(e.target.value)}
                    disabled={loadingBranches}
                    className="px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm outline-none focus:ring-2 focus:ring-pink-500"
                    title="Chọn cửa hàng"
                  >
                    <option value="ALL">Tất cả</option>
                    {branches.map((b) => (
                      <option key={b._id} value={b._id}>
                        {b.name || b.code || b._id}
                      </option>
                    ))}
                  </select>

                  {loadingBranches && (
                    <span className="text-xs text-gray-500">Đang tải...</span>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-lg">
              <div className="w-7 h-7 bg-pink-500 rounded-lg flex items-center justify-center text-white text-xs font-bold">
                {(currentUser?.name || currentUser?.username || "A")[0].toUpperCase()}
              </div>
              <div className="flex flex-col leading-tight">
                <span className="text-sm font-medium text-gray-700 max-w-[140px] truncate">
                  {currentUser?.name || currentUser?.username || "Admin"}
                </span>
                <span className="text-[11px] text-gray-500">{String(currentUser?.role || "").toUpperCase()}</span>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
              title="Đăng xuất"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-auto p-4 lg:p-6">
          <Outlet />
        </div>
      </div>
    </div>
  );
};

export default Layout;
