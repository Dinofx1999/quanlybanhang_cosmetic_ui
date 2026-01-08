import React, { useState } from 'react';
import { Plus, Edit, Trash2, Phone, Mail, User, Calendar } from 'lucide-react';

interface Staff {
  id: number;
  name: string;
  email: string;
  phone: string;
  position: string;
  salary: number;
  joinDate: string;
  status: 'active' | 'inactive';
}

const StaffSection: React.FC = () => {
  const [staff, setStaff] = useState<Staff[]>([
    { id: 1, name: 'Nguyễn Văn A', email: 'vana@gmail.com', phone: '0901234567', position: 'Nhân viên bán hàng', salary: 8000000, joinDate: '2024-01-15', status: 'active' },
    { id: 2, name: 'Trần Thị B', email: 'thib@gmail.com', phone: '0912345678', position: 'Thủ kho', salary: 7000000, joinDate: '2024-02-20', status: 'active' },
    { id: 3, name: 'Lê Văn C', email: 'vanc@gmail.com', phone: '0923456789', position: 'Nhân viên bán hàng', salary: 7500000, joinDate: '2024-03-10', status: 'active' },
  ]);

  const [showModal, setShowModal] = useState(false);
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);

  const deleteStaff = (id: number) => {
    if (window.confirm('Xóa nhân viên này?')) {
      setStaff(staff.filter(s => s.id !== id));
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Quản Lý Nhân Viên</h2>
          <p className="text-sm text-gray-600 mt-1">Tổng: {staff.length} nhân viên</p>
        </div>
        <button className="inline-flex items-center gap-2 px-4 py-2.5 bg-pink-500 text-white rounded-lg hover:bg-pink-600 transition-colors">
          <Plus className="w-5 h-5" />
          <span className="font-medium">Thêm nhân viên</span>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-2xl font-bold text-gray-800">{staff.length}</div>
          <div className="text-sm text-gray-600 mt-1">Tổng NV</div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-2xl font-bold text-green-600">{staff.filter(s => s.status === 'active').length}</div>
          <div className="text-sm text-gray-600 mt-1">Đang làm</div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-2xl font-bold text-pink-600">
            {(staff.reduce((sum, s) => sum + s.salary, 0) / 1000000).toFixed(1)}M
          </div>
          <div className="text-sm text-gray-600 mt-1">Lương/tháng</div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-2xl font-bold text-blue-600">2</div>
          <div className="text-sm text-gray-600 mt-1">Mới tháng này</div>
        </div>
      </div>

      {/* Staff List */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {/* Desktop Table */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Nhân viên</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Liên hệ</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Chức vụ</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Lương</th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Ngày vào</th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Trạng thái</th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {staff.map((s) => (
                <tr key={s.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-pink-100 rounded-lg flex items-center justify-center">
                        <User className="w-5 h-5 text-pink-600" />
                      </div>
                      <div>
                        <div className="font-medium text-gray-800">{s.name}</div>
                        <div className="text-sm text-gray-500">ID: {s.id}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Mail className="w-4 h-4" />
                        <span>{s.email}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Phone className="w-4 h-4" />
                        <span>{s.phone}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-700">{s.position}</td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-800">
                    {s.salary.toLocaleString('vi-VN')}đ
                  </td>
                  <td className="px-4 py-3 text-center text-sm text-gray-600">{s.joinDate}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-center">
                      <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                        s.status === 'active' 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-gray-100 text-gray-700'
                      }`}>
                        {s.status === 'active' ? 'Đang làm' : 'Nghỉ'}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-2">
                      <button className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors">
                        <Edit className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => deleteStaff(s.id)}
                        className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards */}
        <div className="lg:hidden divide-y divide-gray-200">
          {staff.map((s) => (
            <div key={s.id} className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-pink-100 rounded-lg flex items-center justify-center">
                    <User className="w-6 h-6 text-pink-600" />
                  </div>
                  <div>
                    <div className="font-semibold text-gray-800">{s.name}</div>
                    <div className="text-sm text-gray-600">{s.position}</div>
                  </div>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  s.status === 'active' 
                    ? 'bg-green-100 text-green-700' 
                    : 'bg-gray-100 text-gray-700'
                }`}>
                  {s.status === 'active' ? 'Đang làm' : 'Nghỉ'}
                </span>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-gray-600">
                  <Mail className="w-4 h-4" />
                  <span>{s.email}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <Phone className="w-4 h-4" />
                  <span>{s.phone}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <Calendar className="w-4 h-4" />
                  <span>Vào: {s.joinDate}</span>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-gray-200">
                  <span className="font-semibold text-gray-800">
                    {s.salary.toLocaleString('vi-VN')}đ/tháng
                  </span>
                  <div className="flex gap-2">
                    <button className="p-2 text-blue-600 hover:bg-blue-50 rounded transition-colors">
                      <Edit className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => deleteStaff(s.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default StaffSection;