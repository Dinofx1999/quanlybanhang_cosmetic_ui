import React, { useEffect, useMemo, useState } from "react";
import { NavLink } from "react-router-dom";
import {
  ShoppingCart,
  Package,
  FileText,
  Inbox,
  Users,
  Menu,
  X,
  Store,
} from "lucide-react";
import api from "../../../services/api"; // chỉnh path nếu khác

type BranchLite = {
  _id?: string;
  code?: string;
  name?: string;
  address?: string;

  // ✅ thêm để dùng MAIN
  isMain?: boolean;
  brandName?: string;
  logo?: string;
  isActive?: boolean;
};

type CurrentUserLite = {
  name?: string;
  username?: string;
  role?: string; // ADMIN / MANAGER / CASHIER / STAFF ...
  last_online?: string;
};

type SidebarProps = {
  shopName?: string; // fallback nếu chưa load main branch
  branch?: BranchLite | null; // chi nhánh hiện tại
  currentUser?: CurrentUserLite | null; // user hiện tại
  isOnline?: boolean; // trạng thái kết nối (tuỳ bạn set theo ws/api)
  onChangeBranch?: () => void; // optional: mở modal đổi chi nhánh
};

const Sidebar: React.FC<SidebarProps> = ({
  shopName = "Bảo Ân Cosmetic",
  branch = null,
  currentUser = null,
  isOnline = true,
  onChangeBranch,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  // ✅ main branch state
  const [mainBranch, setMainBranch] = useState<BranchLite | null>(null);
  const [loadingMain, setLoadingMain] = useState(false);

  const menuItems = useMemo(
    () => [
      { path: "/pos", icon: ShoppingCart, label: "Bán Hàng" },
      { path: "/orders", icon: FileText, label: "Đơn Hàng" },
      { path: "/products", icon: Inbox, label: "Sản Phẩm" },
      { path: "/inventory", icon: Package, label: "Kiểm Kho" },
      { path: "/customers", icon: Users, label: "Khách Hàng" },
      { path: "/shop-settings", icon: Store, label: "Thông Tin Cửa Hàng" },
    ],
    []
  );

  const toggleSidebar = () => setIsOpen((v) => !v);
  const closeSidebar = () => setIsOpen(false);

  const userLabel =
    currentUser?.name?.trim() || currentUser?.username?.trim() || "Khách Hàng";

  const roleLabel = currentUser?.role ? String(currentUser.role) : "STAFF";

  const branchLabel =
    branch?.name?.trim() || branch?.code?.trim() || "Chưa chọn chi nhánh";

  const branchAddress = branch?.address?.trim();

  // ✅ fetch main branch từ API branches
  useEffect(() => {
    let alive = true;

    const loadMainBranch = async () => {
      try {
        setLoadingMain(true);
        const res = await api.get("/branches"); // baseURL đã /api
        if (!res.data?.ok) throw new Error(res.data?.message || "Load branches failed");

        const items: BranchLite[] = res.data.items || [];
        const main =
          items.find((b) => b?.isActive !== false && b?.isMain === true) ||
          items.find((b) => b?.isMain === true) ||
          null;

        if (!alive) return;
        setMainBranch(main);
      } catch {
        // im lặng: Sidebar vẫn dùng fallback shopName
        if (!alive) return;
        setMainBranch(null);
      } finally {
        if (!alive) return;
        setLoadingMain(false);
      }
    };

    loadMainBranch();

    return () => {
      alive = false;
    };
  }, []);

  // ✅ shopName + logo theo MAIN
  const displayShopName =
    mainBranch?.brandName?.trim() ||
    mainBranch?.name?.trim() ||
    shopName;

  const displayLogoUrl = mainBranch?.logo?.trim() || "";

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={toggleSidebar}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-lg shadow-lg"
        aria-label="Toggle sidebar"
      >
        {isOpen ? <X className="w-6 h-6 text-gray-700" /> : <Menu className="w-6 h-6 text-gray-700" />}
      </button>

      {/* Overlay */}
      {isOpen && (
        <div className="lg:hidden fixed inset-0 bg-black/50 z-30" onClick={closeSidebar} />
      )}

      {/* Sidebar */}
      <div
        className={`
          fixed lg:static inset-y-0 left-0 z-40
          w-64 bg-white border-r border-gray-200
          transform transition-transform duration-300 ease-in-out
          ${isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        `}
      >
        {/* Logo */}
        <div className="h-16 flex items-center justify-center border-b border-gray-200 px-3">
          <div className="flex items-center gap-2 w-full">
            {/* Logo box */}
            <div className="w-9 h-9 rounded-lg flex items-center justify-center overflow-hidden bg-gradient-to-br from-pink-500 to-rose-500 flex-shrink-0">
              {displayLogoUrl ? (
                <img
                  src={displayLogoUrl}
                  alt="logo"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    // fallback nếu link logo lỗi
                    (e.currentTarget as HTMLImageElement).style.display = "none";
                  }}
                />
              ) : (
                <span className="text-white text-lg">💄</span>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-bold text-[15px] text-gray-800 truncate">
                  {displayShopName}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Content wrapper */}
        <div className="flex flex-col h-[calc(100vh-64px)]">
          {/* Navigation */}
          <nav className="p-3 space-y-1 overflow-y-auto">
            {menuItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={closeSidebar}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
                    isActive ? "bg-pink-500 text-white shadow-sm" : "text-gray-700 hover:bg-gray-100"
                  }`
                }
              >
                <item.icon className="w-5 h-5 flex-shrink-0" />
                <span className="font-medium text-sm">{item.label}</span>
              </NavLink>
            ))}
          </nav>

          {/* Bottom info */}
          <div className="mt-auto p-3 border-t border-gray-200 space-y-2">
            <div className="text-xs text-gray-500">
              <div className="font-semibold text-gray-700 truncate">{branchLabel}</div>
              {branchAddress ? <div className="truncate">{branchAddress}</div> : null}
            </div>

            <div className="flex items-center justify-between">
              <div className="text-xs text-gray-600 truncate">
                {userLabel} <span className="text-gray-400">•</span> {roleLabel}
              </div>

              {onChangeBranch ? (
                <button
                  onClick={onChangeBranch}
                  className="text-xs px-2 py-1 rounded bg-gray-100 hover:bg-gray-200 text-gray-700"
                >
                  Đổi CN
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
