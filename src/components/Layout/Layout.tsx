import React from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import Sidebar from "../Sidebar/Sidebar";
import { logout } from "../../services/authService";
import { LogOut, Store, ChevronDown, Check } from "lucide-react";
import api from "../../services/api";
import {
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

  // ✅ Mobile dropdown
  const [branchOpen, setBranchOpen] = React.useState(false);

  // ===============================
  // Page title
  // ===============================
  const getPageTitle = (): string => {
    const path = location.pathname;
    if (path.includes("/pos")) return "Bán Hàng";
    if (path.includes("/orders")) return "Đơn Hàng";
    if (path.includes("/products")) return "Sản Phẩm";
    if (path.includes("/inventory")) return "Kiểm Kho";
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

      // close dropdown
      setBranchOpen(false);
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

  // ✅ close dropdown when route changes
  React.useEffect(() => {
    setBranchOpen(false);
  }, [location.pathname]);

  // ✅ close dropdown when click outside / ESC
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setBranchOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar */}
        <div className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-3 sm:px-4 lg:px-6">
          <div className="flex items-center gap-3 min-w-0 ml-12 lg:ml-0">
            <h2 className="text-lg font-semibold text-gray-800 truncate">{getPageTitle()}</h2>

            {/* ✅ Branch selector: ALWAYS VISIBLE (mobile included) */}
            <div className="flex items-center gap-2 min-w-0">
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    if (isStaff) return;
                    setBranchOpen((v) => !v);
                  }}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition ${
                    isStaff
                      ? "bg-gray-100 border-gray-200 cursor-not-allowed"
                      : "bg-gray-100 border-gray-200 hover:bg-gray-200"
                  }`}
                  title={isStaff ? "STAFF không được đổi chi nhánh" : isPosRoute ? "POS bắt buộc chọn 1 chi nhánh" : "Chọn chi nhánh"}
                >
                  <Store className="w-4 h-4 text-gray-500" />
                  <span className="text-sm font-medium text-gray-700 max-w-[140px] sm:max-w-[220px] truncate">
                    {loadingBranches ? "Đang tải..." : activeBranchLabel}
                  </span>
                  {!isStaff && <ChevronDown className={`w-4 h-4 text-gray-500 transition ${branchOpen ? "rotate-180" : ""}`} />}
                </button>

                {/* ✅ Dropdown panel */}
                {!isStaff && branchOpen && (
                  <>
                    {/* overlay click outside */}
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setBranchOpen(false)}
                      aria-hidden="true"
                    />

                    <div className="absolute z-50 mt-2 w-64 max-w-[75vw] bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
                      {/* only allow "all" when NOT in POS */}
                      {!isPosRoute && (
                        <button
                          type="button"
                          onClick={() => handleSetBranch("all")}
                          className={`w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-gray-50 ${
                            activeBranchId === "all" ? "bg-gray-50" : ""
                          }`}
                        >
                          <span className="truncate">Tất cả chi nhánh</span>
                          {activeBranchId === "all" && <Check className="w-4 h-4 text-pink-600" />}
                        </button>
                      )}

                      <div className="max-h-[320px] overflow-auto border-t border-gray-100">
                        {branches.map((b) => (
                          <button
                            key={b._id}
                            type="button"
                            onClick={() => handleSetBranch(b._id)}
                            className={`w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-gray-50 ${
                              activeBranchId === b._id ? "bg-gray-50" : ""
                            }`}
                          >
                            <span className="truncate">{b.name}</span>
                            {activeBranchId === b._id && <Check className="w-4 h-4 text-pink-600" />}
                          </button>
                        ))}

                        {branches.length === 0 && (
                          <div className="px-3 py-3 text-sm text-gray-500">Không có chi nhánh.</div>
                        )}
                      </div>

                      {isPosRoute && (
                        <div className="px-3 py-2 text-[11px] text-gray-500 border-t border-gray-100">
                          POS: bắt buộc chọn 1 chi nhánh
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>

              {isPosRoute && !isStaff && (
                <span className="hidden sm:inline text-xs text-gray-500">POS: chọn 1 chi nhánh</span>
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
