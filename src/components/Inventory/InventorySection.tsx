import React from 'react';
import { Package, AlertTriangle, TrendingUp } from 'lucide-react';

interface Product {
  id: number;
  name: string;
  category: string;
  price: number;
  stock: number;
  image: string;
  barcode: string;
}

interface InventorySectionProps {
  products: Product[];
}

const InventorySection: React.FC<InventorySectionProps> = ({ products }) => {
  const lowStockProducts = products.filter(p => p.stock < 30);
  const totalValue = products.reduce((sum, p) => sum + (p.price * p.stock), 0);
  const totalItems = products.reduce((sum, p) => sum + p.stock, 0);

  const getStockStatus = (stock: number) => {
    if (stock < 10) return { color: 'text-red-600', bg: 'bg-red-50', label: 'Rất thấp', icon: '🔴' };
    if (stock < 30) return { color: 'text-yellow-600', bg: 'bg-yellow-50', label: 'Thấp', icon: '🟡' };
    return { color: 'text-green-600', bg: 'bg-green-50', label: 'Tốt', icon: '🟢' };
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-gray-800">Kiểm Tra Kho</h2>
        <p className="text-sm text-gray-600 mt-1">Theo dõi tồn kho sản phẩm</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-50 rounded-lg">
              <Package className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-800">{products.length}</div>
              <div className="text-sm text-gray-600">Loại SP</div>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-green-50 rounded-lg">
              <TrendingUp className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-800">{totalItems}</div>
              <div className="text-sm text-gray-600">Tổng SL</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4 col-span-2 lg:col-span-1">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-purple-50 rounded-lg">
              <AlertTriangle className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-800">{lowStockProducts.length}</div>
              <div className="text-sm text-gray-600">Sắp hết</div>
            </div>
          </div>
        </div>
      </div>

      {/* Low Stock Alert */}
      {lowStockProducts.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-gray-800 mb-1">Cảnh báo tồn kho thấp</h3>
              <p className="text-sm text-gray-600">
                {lowStockProducts.length} sản phẩm cần nhập thêm
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Inventory Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Sản phẩm</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Danh mục</th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Mã vạch</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Giá</th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Tồn kho</th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Trạng thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {products.map((product) => {
                const status = getStockStatus(product.stock);
                return (
                  <tr key={product.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{product.image}</span>
                        <span className="font-medium text-gray-800">{product.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{product.category}</td>
                    <td className="px-4 py-3 text-center">
                      <code className="px-2 py-1 bg-gray-100 rounded text-sm">
                        {product.barcode}
                      </code>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-800">
                      {product.price.toLocaleString('vi-VN')}đ
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="font-bold text-lg text-gray-800">{product.stock}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-center">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${status.bg} ${status.color}`}>
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
        <div className="md:hidden divide-y divide-gray-200">
          {products.map((product) => {
            const status = getStockStatus(product.stock);
            return (
              <div key={product.id} className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{product.image}</span>
                    <div>
                      <div className="font-semibold text-gray-800">{product.name}</div>
                      <div className="text-sm text-gray-600">{product.category}</div>
                    </div>
                  </div>
                  <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${status.bg} ${status.color}`}>
                    <span>{status.icon}</span>
                    {status.label}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-gray-600">Tồn kho:</span>
                    <span className="ml-2 font-bold text-gray-800">{product.stock}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Giá:</span>
                    <span className="ml-2 font-semibold text-gray-800">
                      {product.price.toLocaleString('vi-VN')}đ
                    </span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-gray-600">Mã:</span>
                    <code className="ml-2 px-1.5 py-0.5 bg-gray-100 rounded text-xs">
                      {product.barcode}
                    </code>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default InventorySection;