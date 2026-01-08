import React, { useState } from 'react';
import { Eye, Trash2, X, Calendar, User, Package } from 'lucide-react';

interface CompletedOrder {
  id: string;
  date: string;
  customer: string;
  total: number;
  status: 'pending' | 'shipping' | 'completed' | 'cancelled';
  items: number;
}

interface OrdersSectionProps {
  completedOrders: CompletedOrder[];
  setCompletedOrders: React.Dispatch<React.SetStateAction<CompletedOrder[]>>;
}

const OrdersSection: React.FC<OrdersSectionProps> = ({ completedOrders, setCompletedOrders }) => {
  const [selectedOrder, setSelectedOrder] = useState<CompletedOrder | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  const getStatusConfig = (status: CompletedOrder['status']) => {
    const configs: Record<CompletedOrder['status'], { bg: string; text: string; label: string }> = {
      pending: { bg: 'bg-yellow-50', text: 'text-yellow-700', label: '⏳ Chờ xử lý' },
      shipping: { bg: 'bg-blue-50', text: 'text-blue-700', label: '🚚 Đang giao' },
      completed: { bg: 'bg-green-50', text: 'text-green-700', label: '✓ Hoàn thành' },
      cancelled: { bg: 'bg-red-50', text: 'text-red-700', label: '✕ Đã hủy' },
    };
    return configs[status];
  };

  const openOrderDetail = (order: CompletedOrder): void => {
    setSelectedOrder(order);
    setIsModalOpen(true);
  };

  const closeModal = (): void => {
    setIsModalOpen(false);
    setSelectedOrder(null);
  };

  const updateOrderStatus = (orderId: string, newStatus: CompletedOrder['status']): void => {
    setCompletedOrders(orders =>
      orders.map(order =>
        order.id === orderId ? { ...order, status: newStatus } : order
      )
    );
    if (selectedOrder && selectedOrder.id === orderId) {
      setSelectedOrder({ ...selectedOrder, status: newStatus });
    }
  };

  const deleteOrder = (orderId: string): void => {
    if (window.confirm('Bạn có chắc muốn xóa đơn hàng này?')) {
      setCompletedOrders(orders => orders.filter(order => order.id !== orderId));
      closeModal();
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Quản Lý Đơn Hàng</h2>
          <p className="text-sm text-gray-600 mt-1">Tổng: {completedOrders.length} đơn</p>
        </div>
      </div>

      {/* Orders List */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {completedOrders.length > 0 ? (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Mã ĐH</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Ngày</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Khách hàng</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">SP</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Tổng tiền</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Trạng thái</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {completedOrders.map((order) => {
                    const statusConfig = getStatusConfig(order.status);
                    return (
                      <tr key={order.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-semibold text-gray-800">{order.id}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{order.date}</td>
                        <td className="px-4 py-3 text-gray-700">{order.customer}</td>
                        <td className="px-4 py-3 text-center">
                          <span className="px-2 py-1 bg-pink-50 text-pink-600 rounded text-sm">
                            {order.items}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-gray-800">
                          {order.total.toLocaleString('vi-VN')}đ
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-center">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${statusConfig.bg} ${statusConfig.text}`}>
                              {statusConfig.label}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => openOrderDetail(order)}
                              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => deleteOrder(order.id)}
                              className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
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
              {completedOrders.map((order) => {
                const statusConfig = getStatusConfig(order.status);
                return (
                  <div key={order.id} className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="font-semibold text-gray-800">{order.id}</div>
                        <div className="text-sm text-gray-600">{order.customer}</div>
                      </div>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${statusConfig.bg} ${statusConfig.text}`}>
                        {statusConfig.label}
                      </span>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2 text-gray-600">
                        <Calendar className="w-4 h-4" />
                        <span>{order.date}</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-600">
                        <Package className="w-4 h-4" />
                        <span>{order.items} sản phẩm</span>
                      </div>
                      <div className="flex items-center justify-between pt-2 border-t border-gray-200">
                        <span className="font-semibold text-gray-800">
                          {order.total.toLocaleString('vi-VN')}đ
                        </span>
                        <div className="flex gap-2">
                          <button
                            onClick={() => openOrderDetail(order)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => deleteOrder(order.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-12">
            <Package className="w-16 h-16 text-gray-300 mb-3" />
            <p className="text-gray-500">Chưa có đơn hàng nào</p>
          </div>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && selectedOrder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="text-lg font-bold text-gray-800">Chi Tiết #{selectedOrder.id}</h3>
              <button onClick={closeModal} className="p-1 hover:bg-gray-100 rounded">
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="flex items-center gap-2 text-gray-600 text-sm mb-1">
                    <User className="w-4 h-4" />
                    Khách hàng
                  </div>
                  <div className="font-medium text-gray-800">{selectedOrder.customer}</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="flex items-center gap-2 text-gray-600 text-sm mb-1">
                    <Calendar className="w-4 h-4" />
                    Ngày đặt
                  </div>
                  <div className="font-medium text-gray-800">{selectedOrder.date}</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="flex items-center gap-2 text-gray-600 text-sm mb-1">
                    <Package className="w-4 h-4" />
                    Số lượng
                  </div>
                  <div className="font-medium text-gray-800">{selectedOrder.items} SP</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-gray-600 text-sm mb-1">Tổng tiền</div>
                  <div className="font-bold text-gray-800">
                    {selectedOrder.total.toLocaleString('vi-VN')}đ
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-3">
                <div className="text-sm font-semibold text-gray-700 mb-2">Cập nhật trạng thái:</div>
                <div className="grid grid-cols-2 gap-2">
                  {(['pending', 'shipping', 'completed', 'cancelled'] as const).map((status) => {
                    const config = getStatusConfig(status);
                    return (
                      <button
                        key={status}
                        onClick={() => updateOrderStatus(selectedOrder.id, status)}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                          selectedOrder.status === status
                            ? 'bg-pink-500 text-white'
                            : `${config.bg} ${config.text} hover:opacity-80`
                        }`}
                      >
                        {config.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
            <div className="flex gap-2 p-4 border-t border-gray-200">
              <button
                onClick={() => deleteOrder(selectedOrder.id)}
                className="flex-1 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium"
              >
                Xóa
              </button>
              <button
                onClick={closeModal}
                className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrdersSection;