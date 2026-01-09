import React from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import Sidebar from "../Sidebar/Sidebar";
import { logout } from "../../services/authService";
import { LogOut, Store, ChevronDown } from "lucide-react";
import api from "../../services/api";
import {
  BRANCH_KEY,
  getActiveBranchId,
  setActiveBranchId as persistActiveBranchId, // ✅ alias để không trùng tên
} from "../../services/branchContext";

interface User {
  id?: string;
  username?: string;
  name?: string;
  role?: string;
  branchId?: string | null;
}

interface LayoutProps {
  currentUser: User | null;
  onBranchChanged?: () => void;
}

export interface Branch {
  _id: string;
  code?: string;
  name: string;
  address?: string;
  phone?: string;
  isActive?: boolean;
}

export type LayoutOutletContext = {
  branches: Branch[];
  activeBranchId: string; // "all" | "<id>"
  isStaff: boolean;
  isPosRoute: boolean;
  setBranch: (id: string) => void;
};

const Layout: React.FC<LayoutProps> = ({ currentUser, onBranchChanged }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const role = String(currentUser?.role || "").toUpperCase();
  const isStaff = role === "STAFF";
  const isPosRoute = location.pathname.includes("/pos");

  const [branches, setBranches] = React.useState<Branch[]>([]);
  const [loadingBranches, setLoadingBranches] = React.useState(false);

  const [activeBranchId, setActiveBranchState] = React.useState<string>(() => {
    if (!currentUser) return "all";
    return getActiveBranchId(currentUser);
  });

  // ===============================
  // Page title
  // ===============================
  const getPageTitle = (): string => {
    const path = location.pathname;
    if (path.includes("/pos")) return "Bán Hàng";
    if (path.includes("/orders")) return "Đơn Hàng";
    if (path.includes("/products")) return "Sản Phẩm";
    if (path.includes("/inventory")) return "Kiểm Kho";
    // if (path.includes("/warehouse")) return "Quản Lý Kho";
    if (path.includes("/staff")) return "Nhân Viên";
    if (path.includes("/revenue")) return "Doanh Thu";
    return "Dashboard";
  };

  // ===============================
  // Logout
  // ===============================
  const handleLogout = (): void => {
    if (window.confirm("Bạn có chắc muốn đăng xuất?")) {
      logout();
      navigate("/login");
    }
  };

  // ===============================
  // Fetch branches
  // ===============================
  const fetchBranches = React.useCallback(async () => {
    setLoadingBranches(true);
    try {
      const res = await api.get("/branches");
      const items: Branch[] = res.data?.items || [];
      setBranches(items.filter((b) => b?.isActive !== false));
    } catch (err: any) {
      console.error("Fetch branches error:", err?.response?.data || err?.message);
      setBranches([]);
    } finally {
      setLoadingBranches(false);
    }
  }, []);

  React.useEffect(() => {
    if (!currentUser) return;
    fetchBranches();
  }, [currentUser, fetchBranches]);

  // ===============================
  // Sync activeBranchId when user changes
  // ===============================
  React.useEffect(() => {
    if (!currentUser) return;
    const next = getActiveBranchId(currentUser);
    setActiveBranchState(next);
  }, [currentUser]);

  // ===============================
  // Set branch (single source of truth)
  // - updates localStorage (ADMIN/MANAGER)
  // - updates state
  // - dispatch branch_changed event for App refetch (optional)
  // ===============================
  const handleSetBranch = React.useCallback(
    (id: string) => {
      if (!currentUser) return;

      // STAFF cannot change
      if (isStaff) return;

      // POS cannot choose "all"
      if (isPosRoute && id === "all") return;

      setActiveBranchState(id);

      // ✅ persist to localStorage via branchContext
      persistActiveBranchId(id);

      // notify App refetch if needed
      window.dispatchEvent(new Event("branch_changed"));
      onBranchChanged?.();
    },
    [currentUser, isStaff, isPosRoute, onBranchChanged]
  );

  // ===============================
  // POS rule: must select a specific branch (not "all")
  // - if on /pos and activeBranchId is "all", auto pick first branch
  // ===============================
  React.useEffect(() => {
    if (!currentUser) return;
    if (!isPosRoute) return;
    if (isStaff) return;

    if (activeBranchId === "all") {
      const first = branches?.[0]?._id;
      if (first) handleSetBranch(first);
    }
  }, [currentUser, isPosRoute, isStaff, activeBranchId, branches, handleSetBranch]);

  // ===============================
  // UI label
  // ===============================
  const activeBranchLabel = React.useMemo(() => {
    if (isStaff) {
      const b = branches.find((x) => x._id === String(currentUser?.branchId || ""));
      return b?.name || "Chi nhánh (STAFF)";
    }

    if (activeBranchId === "all") return "Tất cả chi nhánh";
    const b = branches.find((x) => x._id === activeBranchId);
    return b?.name || "Chọn chi nhánh";
  }, [activeBranchId, branches, isStaff, currentUser?.branchId]);

  const outletCtx: LayoutOutletContext = {
    branches,
    activeBranchId,
    isStaff,
    isPosRoute,
    setBranch: handleSetBranch,
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar */}
        <div className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 lg:px-6">
          <div className="flex items-center gap-4 min-w-0 ml-12 lg:ml-0">
            <h2 className="text-lg font-semibold text-gray-800 truncate">{getPageTitle()}</h2>

            {/* Branch selector */}
            <div className="hidden md:flex items-center gap-2">
              <div className="relative">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-lg border border-gray-200">
                  <Store className="w-4 h-4 text-gray-500" />
                  <span className="text-sm font-medium text-gray-700 max-w-[220px] truncate">
                    {loadingBranches ? "Đang tải chi nhánh..." : activeBranchLabel}
                  </span>
                  {!isStaff && <ChevronDown className="w-4 h-4 text-gray-500" />}
                </div>

                {/* Dropdown (ADMIN/MANAGER only) */}
                {!isStaff && (
                  <select
                    value={activeBranchId}
                    onChange={(e) => handleSetBranch(e.target.value)}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                    title={isPosRoute ? "POS bắt buộc chọn 1 chi nhánh" : "Chọn chi nhánh"}
                  >
                    {/* Only allow "all" when NOT in POS */}
                    {!isPosRoute && <option value="all">Tất cả chi nhánh</option>}

                    {branches.map((b) => (
                      <option key={b._id} value={b._id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {isPosRoute && !isStaff && (
                <span className="text-xs text-gray-500">POS: bắt buộc chọn 1 chi nhánh</span>
              )}
            </div>
          </div>

          {/* Right */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-lg">
              <div className="w-7 h-7 bg-pink-500 rounded-lg flex items-center justify-center text-white text-xs font-bold">
                {(currentUser?.name || currentUser?.username || "A")[0].toUpperCase()}
              </div>
              <span className="text-sm font-medium text-gray-700 max-w-[120px] truncate">
                {currentUser?.name || currentUser?.username || "Admin"}
              </span>
              <span className="text-[11px] px-2 py-0.5 rounded bg-white border border-gray-200 text-gray-600">
                {role || "USER"}
              </span>
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
          <Outlet context={outletCtx} />
        </div>
      </div>
    </div>
  );
};

export default Layout;
