import React, { useState } from 'react';
import { Package, TrendingUp, TrendingDown, AlertTriangle, Calendar, Plus } from 'lucide-react';

interface WarehouseItem {
  id: number;
  productName: string;
  category: string;
  quantity: number;
  minStock: number;
  location: string;
  lastUpdate: string;
  supplier: string;
}

const WarehouseSection: React.FC = () => {
  const [items] = useState<WarehouseItem[]>([
    { id: 1, productName: 'Son Kem Lì Rose Pink', category: 'Son môi', quantity: 45, minStock: 20, location: 'Kệ A1', lastUpdate: '2024-01-07', supplier: 'NCC 1' },
    { id: 2, productName: 'Phấn Nước Cushion', category: 'Trang điểm', quantity: 32, minStock: 25, location: 'Kệ B2', lastUpdate: '2024-01-06', supplier: 'NCC 2' },
    { id: 3, productName: 'Serum Vitamin C', category: 'Chăm sóc da', quantity: 15, minStock: 20, location: 'Kệ C1', lastUpdate: '2024-01-05', supplier: 'NCC 1' },
    { id: 4, productName: 'Mascara Dài Mi', category: 'Trang điểm', quantity: 56, minStock: 30, location: 'Kệ A3', lastUpdate: '2024-01-07', supplier: 'NCC 3' },
    { id: 5, productName: 'Kem Chống Nắng SPF50', category: 'Chăm sóc da', quantity: 8, minStock: 15, location: 'Kệ C2', lastUpdate: '2024-01-04', supplier: 'NCC 2' },
  ]);

  const lowStockItems = items.filter(item => item.quantity < item.minStock);
  const totalValue = items.reduce((sum, item) => sum + item.quantity, 0);

  const getStockStatus = (quantity: number, minStock: number) => {
    if (quantity < minStock * 0.5) return { color: 'text-red-600', bg: 'bg-red-50', label: 'Rất thấp', icon: '🔴' };
    if (quantity < minStock) return { color: 'text-yellow-600', bg: 'bg-yellow-50', label: 'Thấp', icon: '🟡' };
    return { color: 'text-green-600', bg: 'bg-green-50', label: 'Đủ', icon: '🟢' };
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Quản Lý Kho</h2>
          <p className="text-sm text-gray-600 mt-1">Theo dõi tồn kho và nhập xuất</p>
        </div>
        <button className="inline-flex items-center gap-2 px-4 py-2.5 bg-pink-500 text-white rounded-lg hover:bg-pink-600 transition-colors">
          <Plus className="w-5 h-5" />
          <span className="font-medium">Nhập kho</span>
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-2 text-blue-600 mb-2">
            <Package className="w-5 h-5" />
          </div>
          <div className="text-2xl font-bold text-gray-800">{items.length}</div>
          <div className="text-sm text-gray-600 mt-1">Loại SP</div>
        </div>
        
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-2 text-green-600 mb-2">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div className="text-2xl font-bold text-gray-800">{totalValue}</div>
          <div className="text-sm text-gray-600 mt-1">Tổng SL</div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-2 text-red-600 mb-2">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div className="text-2xl font-bold text-gray-800">{lowStockItems.length}</div>
          <div className="text-sm text-gray-600 mt-1">Sắp hết</div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-2 text-purple-600 mb-2">
            <TrendingDown className="w-5 h-5" />
          </div>
          <div className="text-2xl font-bold text-gray-800">156</div>
          <div className="text-sm text-gray-600 mt-1">Đã bán/tuần</div>
        </div>
      </div>

      {/* Low Stock Alert */}
      {lowStockItems.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="font-semibold text-gray-800 mb-1">Cảnh báo tồn kho thấp</h3>
              <p className="text-sm text-gray-600">
                {lowStockItems.length} sản phẩm cần nhập thêm hàng
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Warehouse Items */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {/* Desktop Table */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Sản phẩm</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Danh mục</th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Tồn kho</th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Tối thiểu</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Vị trí</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Nhà cung cấp</th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Cập nhật</th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Trạng thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {items.map((item) => {
                const status = getStockStatus(item.quantity, item.minStock);
                return (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-800">{item.productName}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{item.category}</td>
                    <td className="px-4 py-3 text-center">
                      <span className="font-bold text-gray-800">{item.quantity}</span>
                    </td>
                    <td className="px-4 py-3 text-center text-gray-600">{item.minStock}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 bg-gray-100 rounded text-sm font-medium text-gray-700">
                        {item.location}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{item.supplier}</td>
                    <td className="px-4 py-3 text-center text-sm text-gray-500">{item.lastUpdate}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-center">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${status.bg} ${status.color}`}>
                          <span>{status.icon}</span>
                          {status.label}
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards */}
        <div className="lg:hidden divide-y divide-gray-200">
          {items.map((item) => {
            const status = getStockStatus(item.quantity, item.minStock);
            return (
              <div key={item.id} className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="font-semibold text-gray-800">{item.productName}</div>
                    <div className="text-sm text-gray-600">{item.category}</div>
                  </div>
                  <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${status.bg} ${status.color}`}>
                    <span>{status.icon}</span>
                    {status.label}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-gray-600">Tồn kho:</span>
                    <span className="ml-2 font-bold text-gray-800">{item.quantity}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Tối thiểu:</span>
                    <span className="ml-2 font-semibold text-gray-700">{item.minStock}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Vị trí:</span>
                    <span className="ml-2 px-1.5 py-0.5 bg-gray-100 rounded text-xs font-medium">
                      {item.location}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">NCC:</span>
                    <span className="ml-2 text-gray-800">{item.supplier}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-200 text-xs text-gray-500">
                  <Calendar className="w-4 h-4" />
                  <span>Cập nhật: {item.lastUpdate}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default WarehouseSection;