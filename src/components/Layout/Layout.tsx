import React from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import Sidebar from "../Sidebar/Sidebar";
import { logout, getCurrentUser } from "../../services/authService";
import { LogOut, Store } from "lucide-react";
import api from "../../services/api";
import { getActiveBranchRaw, setActiveBranchId } from "../../services/branchContext";

interface User {
  id?: string;
  username?: string;
  name?: string;
  role?: string;
  branchId?: string | null;
}

interface LayoutProps {
  currentUser: User | null;
  onBranchChanged?: () => void; // optional hook to refetch
}

const Layout: React.FC<LayoutProps> = ({ currentUser, onBranchChanged }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const user = currentUser || getCurrentUser();
  const role = String(user?.role || "").toUpperCase();

  const [branches, setBranches] = React.useState<any[]>([]);
  const [branchRaw, setBranchRaw] = React.useState<string>(() => getActiveBranchRaw(user));
  const [loadingBranches, setLoadingBranches] = React.useState(false);

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
      navigate("/login");
    }
  };

  // load branches for admin/manager
  React.useEffect(() => {
    const canPickBranch = role === "ADMIN" || role === "MANAGER";
    if (!canPickBranch) return;

    setLoadingBranches(true);
    api
      .get("/branches")
      .then((res) => setBranches(res.data?.items || []))
      .catch(() => setBranches([]))
      .finally(() => setLoadingBranches(false));
  }, [role]);

  // keep branchRaw in sync when user changes (login/logout)
  React.useEffect(() => {
    setBranchRaw(getActiveBranchRaw(user));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.role, user?.branchId]);

  const canPickBranch = role === "ADMIN" || role === "MANAGER";

  const staffBranchName = React.useMemo(() => {
    if (role !== "STAFF") return "";
    const id = user?.branchId ? String(user.branchId) : "";
    const found = branches.find((b) => String(b._id) === id);
    return found?.name || id || "";
  }, [role, user?.branchId, branches]);

  const onChangeBranch = (val: string) => {
    setBranchRaw(val);
    setActiveBranchId(val);

    // notify whole app
    window.dispatchEvent(new Event("branch_changed"));
    onBranchChanged?.();
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar */}
        <div className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 lg:px-6">
          <div className="flex items-center gap-3 min-w-0 ml-12 lg:ml-0">
            <h2 className="text-lg font-semibold text-gray-800 truncate">{getPageTitle()}</h2>

            {/* ✅ Branch switch */}
            {canPickBranch && (
              <div className="hidden md:flex items-center gap-2 ml-2">
                <div className="flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-lg border border-gray-200">
                  <Store className="w-4 h-4 text-gray-600" />
                  <select
                    value={branchRaw}
                    onChange={(e) => onChangeBranch(e.target.value)}
                    className="bg-transparent text-sm font-semibold text-gray-700 outline-none"
                    disabled={loadingBranches}
                    title="Chọn chi nhánh"
                  >
                    <option value="all">Tất cả chi nhánh</option>
                    {branches.map((b) => (
                      <option key={b._id} value={b._id}>
                        {b.code} - {b.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* STAFF: show branch */}
            {!canPickBranch && role === "STAFF" && (
              <div className="hidden md:flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-lg border border-gray-200">
                <Store className="w-4 h-4 text-gray-600" />
                <span className="text-sm font-semibold text-gray-700">
                  {staffBranchName ? staffBranchName : String(user?.branchId || "")}
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-lg">
              <div className="w-7 h-7 bg-pink-500 rounded-lg flex items-center justify-center text-white text-xs font-bold">
                {(user?.name || user?.username || "A")[0].toUpperCase()}
              </div>
              <div className="flex flex-col leading-tight">
                <span className="text-sm font-medium text-gray-700 max-w-[120px] truncate">
                  {user?.name || user?.username || "Admin"}
                </span>
                <span className="text-[11px] text-gray-500">{role || "—"}</span>
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

        {/* Content */}
        <div className="flex-1 overflow-auto p-4 lg:p-6">
          <Outlet />
        </div>
      </div>
    </div>
  );
};

export default Layout;
