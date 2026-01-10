import React, { useMemo, useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  ShoppingCart,
  Package,
  FileText,
  Inbox,
  Users,
  Menu,
  X,
  Store,
  MapPin,
  User as UserIcon,
  Shield,
  CircleDot
} from 'lucide-react';

type BranchLite = {
  _id?: string;
  code?: string;
  name?: string;
  address?: string;
};

type CurrentUserLite = {
  name?: string;
  username?: string;
  role?: string; // ADMIN / MANAGER / CASHIER / STAFF ...
  last_online?: string;
};

type SidebarProps = {
  shopName?: string; // tên shop
  branch?: BranchLite | null; // chi nhánh hiện tại
  currentUser?: CurrentUserLite | null; // user hiện tại
  isOnline?: boolean; // trạng thái kết nối (tuỳ bạn set theo ws/api)
  onChangeBranch?: () => void; // optional: mở modal đổi chi nhánh
};

const Sidebar: React.FC<SidebarProps> = ({
  shopName = 'Bảo Ân Cosmetic',
  branch = null,
  currentUser = null,
  isOnline = true,
  onChangeBranch,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const menuItems = useMemo(
    () => [
      { path: '/pos', icon: ShoppingCart, label: 'Bán Hàng' },
      { path: '/orders', icon: FileText, label: 'Đơn Hàng' },
      { path: '/products', icon: Inbox, label: 'Sản Phẩm' },
      { path: '/inventory', icon: Package, label: 'Kiểm Kho' },
      { path: '/staff', icon: Users, label: 'Nhân Viên' },
      { path: '/shop-info', icon: Store, label: 'Thông Tin Cửa Hàng' },
    ],
    []
  );

  const toggleSidebar = () => setIsOpen((v) => !v);
  const closeSidebar = () => setIsOpen(false);

  const userLabel =
    currentUser?.name?.trim() ||
    currentUser?.username?.trim() ||
    'Nhân viên';

  const roleLabel = currentUser?.role ? String(currentUser.role) : 'STAFF';

  const branchLabel =
    branch?.name?.trim() ||
    branch?.code?.trim() ||
    'Chưa chọn chi nhánh';

  const branchAddress = branch?.address?.trim();

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={toggleSidebar}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-lg shadow-lg"
        aria-label="Toggle sidebar"
      >
        {isOpen ? (
          <X className="w-6 h-6 text-gray-700" />
        ) : (
          <Menu className="w-6 h-6 text-gray-700" />
        )}
      </button>

      {/* Overlay */}
      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-30"
          onClick={closeSidebar}
        />
      )}

      {/* Sidebar */}
      <div
        className={`
          fixed lg:static inset-y-0 left-0 z-40
          w-64 bg-white border-r border-gray-200
          transform transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        {/* Logo */}
        <div className="h-16 flex items-center justify-center border-b border-gray-200">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-pink-500 to-rose-500 rounded-lg flex items-center justify-center">
              <span className="text-white text-lg">💄</span>
            </div>
            <span className="font-bold text-lg text-gray-800">{shopName}</span>
          </div>
        </div>

        {/* Content wrapper (nav + shop info bottom) */}
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
                    isActive
                      ? 'bg-pink-500 text-white shadow-sm'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`
                }
              >
                <item.icon className="w-5 h-5 flex-shrink-0" />
                <span className="font-medium text-sm">{item.label}</span>
              </NavLink>
            ))}
          </nav>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
