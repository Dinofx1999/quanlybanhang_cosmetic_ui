import React, { useState } from 'react';
import { ShoppingCart, Heart, Search, Menu, Phone, Mail, MapPin, Facebook, Instagram, Youtube, Star, Tag, Zap, Clock } from 'lucide-react';
import { Badge, Card, Button, Input, Modal } from 'antd';

// Header Component
const Header = ({ cartCount }: { cartCount: number }) => {
  return (
    <header className="bg-gradient-to-r from-pink-500 to-purple-600 text-white sticky top-0 z-50 shadow-lg">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between py-4">
          <div className="flex items-center space-x-8">
            <h1 className="text-2xl font-bold">BeautyShop</h1>
            <nav className="hidden md:flex space-x-6">
              <a href="#home" className="hover:text-pink-200 transition">Trang chủ</a>
              <a href="#categories" className="hover:text-pink-200 transition">Danh mục</a>
              <a href="#flashsale" className="hover:text-pink-200 transition">Flash Sale</a>
              <a href="#products" className="hover:text-pink-200 transition">Sản phẩm</a>
            </nav>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="hidden md:block">
              <Input
                prefix={<Search className="w-4 h-4 text-gray-400" />}
                placeholder="Tìm kiếm sản phẩm..."
                className="w-64 rounded-full"
              />
            </div>
            <Button type="text" icon={<Heart className="w-5 h-5" />} className="text-white" />
            <Badge count={cartCount} className="cursor-pointer">
              <ShoppingCart className="w-6 h-6 text-white" />
            </Badge>
            <Button type="text" icon={<Menu className="w-6 h-6 md:hidden" />} className="text-white" />
          </div>
        </div>
      </div>
    </header>
  );
};

// Hero Banner Component
const HeroBanner = () => {
  return (
    <div className="bg-gradient-to-r from-pink-100 to-purple-100 py-16">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row items-center justify-between">
          <div className="md:w-1/2 mb-8 md:mb-0">
            <h2 className="text-5xl font-bold text-gray-800 mb-4">
              Làm đẹp mỗi ngày
            </h2>
            <p className="text-xl text-gray-600 mb-6">
              Khám phá bộ sưu tập mỹ phẩm cao cấp với ưu đãi đặc biệt
            </p>
            <Button type="primary" size="large" className="bg-pink-500 hover:bg-pink-600 border-none rounded-full px-8">
              Khám phá ngay
            </Button>
          </div>
          <div className="md:w-1/2 flex justify-center">
            <div className="w-80 h-80 bg-gradient-to-br from-pink-300 to-purple-300 rounded-full flex items-center justify-center">
              {/* <span className="text-6xl">💄</span> */}
              <img alt="logo" className="w-200 h-200 object-cover rounded-full" src="http://localhost:9009/uploads/branches/1768104874836-1068c7d025f7cf40e9748569.jpg"></img>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Categories Component
const Categories = () => {
  const categories = [
    { id: 1, name: 'Chăm sóc da', icon: '🧴', color: 'from-pink-400 to-pink-500' },
    { id: 2, name: 'Trang điểm', icon: '💄', color: 'from-purple-400 to-purple-500' },
    { id: 3, name: 'Dưỡng môi', icon: '💋', color: 'from-red-400 to-red-500' },
    { id: 4, name: 'Nước hoa', icon: '🌸', color: 'from-blue-400 to-blue-500' },
    { id: 5, name: 'Chăm sóc tóc', icon: '💆', color: 'from-green-400 to-green-500' },
    { id: 6, name: 'Phụ kiện', icon: '✨', color: 'from-yellow-400 to-yellow-500' },
  ];

  return (
    <section id="categories" className="py-16 bg-white">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl font-bold text-center mb-12 text-gray-800">
          Danh Mục Sản Phẩm
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
          {categories.map((category) => (
            <div
              key={category.id}
              className={`bg-gradient-to-br ${category.color} rounded-2xl p-6 text-center cursor-pointer transform hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-xl`}
            >
              <div className="text-5xl mb-3">{category.icon}</div>
              <h3 className="text-white font-semibold text-sm">{category.name}</h3>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

// Voucher Component
const VoucherSection = () => {
  const vouchers = [
    { id: 1, code: 'BEAUTY20', discount: '20%', minOrder: '500k', expiry: '31/01/2026' },
    { id: 2, code: 'FREESHIP', discount: 'Freeship', minOrder: '300k', expiry: '28/02/2026' },
    { id: 3, code: 'FIRST50', discount: '50k', minOrder: '0đ', expiry: '15/02/2026' },
  ];

  return (
    <section className="py-12 bg-gradient-to-r from-orange-50 to-pink-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-center mb-8">
          <Tag className="w-8 h-8 text-orange-500 mr-3" />
          <h2 className="text-3xl font-bold text-gray-800">Mã Giảm Giá Hot</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {vouchers.map((voucher) => (
            <div
              key={voucher.id}
              className="bg-white rounded-xl shadow-lg overflow-hidden border-2 border-dashed border-orange-300 hover:border-orange-500 transition-all cursor-pointer transform hover:scale-105"
            >
              <div className="bg-gradient-to-r from-orange-400 to-pink-400 p-4 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm opacity-90">Mã giảm giá</p>
                    <p className="text-2xl font-bold">{voucher.code}</p>
                  </div>
                  <div className="text-3xl font-bold">{voucher.discount}</div>
                </div>
              </div>
              <div className="p-4">
                <p className="text-sm text-gray-600 mb-2">
                  Đơn tối thiểu: <span className="font-semibold">{voucher.minOrder}</span>
                </p>
                <p className="text-sm text-gray-600 mb-3">
                  HSD: <span className="font-semibold">{voucher.expiry}</span>
                </p>
                <Button type="primary" block className="bg-orange-500 hover:bg-orange-600 border-none rounded-lg">
                  Sao chép mã
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

// Flash Sale Component
const FlashSale = () => {
  const flashSaleProducts = [
    { id: 1, name: 'Serum Vitamin C', price: 299000, oldPrice: 599000, image: '🧪', sold: 234 },
    { id: 2, name: 'Son Kem Lì', price: 129000, oldPrice: 259000, image: '💄', sold: 567 },
    { id: 3, name: 'Kem Chống Nắng', price: 189000, oldPrice: 349000, image: '🧴', sold: 423 },
    { id: 4, name: 'Mặt Nạ Dưỡng Da', price: 149000, oldPrice: 299000, image: '🎭', sold: 678 },
  ];

  const [timeLeft, setTimeLeft] = useState({ hours: 2, minutes: 34, seconds: 56 });

  return (
    <section id="flashsale" className="py-16 bg-red-50">
      <div className="container mx-auto px-4">
        <div className="bg-gradient-to-r from-red-500 to-pink-500 rounded-2xl p-6 mb-8 text-white shadow-xl">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div className="flex items-center mb-4 md:mb-0">
              <Zap className="w-10 h-10 mr-3 animate-pulse" />
              <div>
                <h2 className="text-3xl font-bold">FLASH SALE</h2>
                <p className="text-sm opacity-90">Giảm giá sốc - Số lượng có hạn</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Clock className="w-6 h-6" />
              <div className="flex space-x-2">
                <div className="bg-white text-red-500 px-3 py-2 rounded-lg font-bold text-xl">
                  {String(timeLeft.hours).padStart(2, '0')}
                </div>
                <span className="text-2xl">:</span>
                <div className="bg-white text-red-500 px-3 py-2 rounded-lg font-bold text-xl">
                  {String(timeLeft.minutes).padStart(2, '0')}
                </div>
                <span className="text-2xl">:</span>
                <div className="bg-white text-red-500 px-3 py-2 rounded-lg font-bold text-xl">
                  {String(timeLeft.seconds).padStart(2, '0')}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {flashSaleProducts.map((product) => (
            <div
              key={product.id}
              className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-2xl transition-all cursor-pointer transform hover:scale-105"
            >
              <div className="relative">
                <div className="h-48 bg-gradient-to-br from-pink-100 to-purple-100 flex items-center justify-center text-6xl">
                  {product.image}
                </div>
                <div className="absolute top-2 right-2 bg-red-500 text-white px-3 py-1 rounded-full text-sm font-bold">
                  -{Math.round((1 - product.price / product.oldPrice) * 100)}%
                </div>
              </div>
              <div className="p-4">
                <h3 className="font-semibold text-gray-800 mb-2 truncate">{product.name}</h3>
                <div className="flex items-center space-x-2 mb-2">
                  <span className="text-xl font-bold text-red-500">
                    {product.price.toLocaleString()}đ
                  </span>
                  <span className="text-sm text-gray-400 line-through">
                    {product.oldPrice.toLocaleString()}đ
                  </span>
                </div>
                <div className="mb-3">
                  <div className="flex justify-between text-xs text-gray-600 mb-1">
                    <span>Đã bán {product.sold}</span>
                    <span>78%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-red-500 h-2 rounded-full" style={{ width: '78%' }}></div>
                  </div>
                </div>
                <Button type="primary" danger block className="rounded-lg">
                  Mua ngay
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

// Products Component
const ProductsSection = ({ onAddToCart }: { onAddToCart: (product: any) => void }) => {
  const products = [
    { id: 1, name: 'Kem Dưỡng Ẩm La Roche-Posay', price: 450000, rating: 4.8, reviews: 234, image: '🧴', category: 'Chăm sóc da' },
    { id: 2, name: 'Phấn Nước Cushion Laneige', price: 680000, rating: 4.9, reviews: 456, image: '💄', category: 'Trang điểm' },
    { id: 3, name: 'Serum Retinol The Ordinary', price: 380000, rating: 4.7, reviews: 189, image: '🧪', category: 'Chăm sóc da' },
    { id: 4, name: 'Son Thỏi MAC Ruby Woo', price: 590000, rating: 4.9, reviews: 567, image: '💋', category: 'Trang điểm' },
    { id: 5, name: 'Nước Tẩy Trang Bioderma', price: 320000, rating: 4.8, reviews: 890, image: '💧', category: 'Chăm sóc da' },
    { id: 6, name: 'Kem Chống Nắng Anessa', price: 550000, rating: 4.9, reviews: 345, image: '☀️', category: 'Chăm sóc da' },
    { id: 7, name: 'Nước Hoa Chanel No.5', price: 2500000, rating: 5.0, reviews: 123, image: '🌸', category: 'Nước hoa' },
    { id: 8, name: 'Mặt Nạ Innisfree Green Tea', price: 180000, rating: 4.6, reviews: 678, image: '🎭', category: 'Chăm sóc da' },
  ];

  return (
    <section id="products" className="py-16 bg-gray-50">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl font-bold text-center mb-12 text-gray-800">
          Sản Phẩm Nổi Bật
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {products.map((product) => (
            <div
              key={product.id}
              className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-xl transition-all cursor-pointer group"
            >
              <div className="relative overflow-hidden">
                <div className="h-56 bg-gradient-to-br from-pink-100 to-purple-100 flex items-center justify-center text-7xl group-hover:scale-110 transition-transform">
                  {product.image}
                </div>
                <Button
                  type="text"
                  icon={<Heart className="w-5 h-5" />}
                  className="absolute top-2 right-2 bg-white rounded-full hover:bg-pink-100 hover:text-pink-500"
                />
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/50 to-transparent p-2">
                  <span className="text-white text-xs bg-pink-500 px-2 py-1 rounded-full">
                    {product.category}
                  </span>
                </div>
              </div>
              <div className="p-4">
                <h3 className="font-semibold text-gray-800 mb-2 truncate">{product.name}</h3>
                <div className="flex items-center mb-2">
                  <div className="flex text-yellow-400">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-current" />
                    ))}
                  </div>
                  <span className="text-sm text-gray-600 ml-2">
                    {product.rating} ({product.reviews})
                  </span>
                </div>
                <div className="text-2xl font-bold text-pink-600 mb-3">
                  {product.price.toLocaleString()}đ
                </div>
                <Button
                  type="primary"
                  block
                  icon={<ShoppingCart className="w-4 h-4" />}
                  onClick={() => onAddToCart(product)}
                  className="bg-gradient-to-r from-pink-500 to-purple-500 border-none rounded-lg hover:from-pink-600 hover:to-purple-600"
                >
                  Thêm vào giỏ
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

// Footer Component
const Footer = () => {
  return (
    <footer className="bg-gray-800 text-white py-12">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div>
            <h3 className="text-2xl font-bold mb-4 text-pink-400">BeautyShop</h3>
            <p className="text-gray-300 mb-4">
              Cửa hàng mỹ phẩm uy tín, chất lượng hàng đầu Việt Nam
            </p>
            <div className="flex space-x-4">
              <Facebook className="w-6 h-6 cursor-pointer hover:text-pink-400 transition" />
              <Instagram className="w-6 h-6 cursor-pointer hover:text-pink-400 transition" />
              <Youtube className="w-6 h-6 cursor-pointer hover:text-pink-400 transition" />
            </div>
          </div>
          
          <div>
            <h4 className="text-lg font-semibold mb-4">Về chúng tôi</h4>
            <ul className="space-y-2 text-gray-300">
              <li><a href="#" className="hover:text-pink-400 transition">Giới thiệu</a></li>
              <li><a href="#" className="hover:text-pink-400 transition">Tuyển dụng</a></li>
              <li><a href="#" className="hover:text-pink-400 transition">Tin tức</a></li>
              <li><a href="#" className="hover:text-pink-400 transition">Hệ thống cửa hàng</a></li>
            </ul>
          </div>
          
          <div>
            <h4 className="text-lg font-semibold mb-4">Chính sách</h4>
            <ul className="space-y-2 text-gray-300">
              <li><a href="#" className="hover:text-pink-400 transition">Chính sách đổi trả</a></li>
              <li><a href="#" className="hover:text-pink-400 transition">Chính sách bảo mật</a></li>
              <li><a href="#" className="hover:text-pink-400 transition">Điều khoản sử dụng</a></li>
              <li><a href="#" className="hover:text-pink-400 transition">Hướng dẫn mua hàng</a></li>
            </ul>
          </div>
          
          <div>
            <h4 className="text-lg font-semibold mb-4">Liên hệ</h4>
            <ul className="space-y-3 text-gray-300">
              <li className="flex items-center">
                <MapPin className="w-5 h-5 mr-2 text-pink-400" />
                123 Đường ABC, Quận 1, TP.HCM
              </li>
              <li className="flex items-center">
                <Phone className="w-5 h-5 mr-2 text-pink-400" />
                0123 456 789
              </li>
              <li className="flex items-center">
                <Mail className="w-5 h-5 mr-2 text-pink-400" />
                support@beautyshop.vn
              </li>
            </ul>
          </div>
        </div>
        
        <div className="border-t border-gray-700 pt-8 text-center text-gray-400">
          <p>&copy; 2026 BeautyShop. Tất cả các quyền được bảo lưu.</p>
          <p className="mt-2 text-sm">Giấy phép ĐKKD số: 0123456789 - Ngày cấp: 01/01/2020</p>
        </div>
      </div>
    </footer>
  );
};

// Main App Component
const CosmeticsShop = () => {
  const [cartCount, setCartCount] = useState(0);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);

  const handleAddToCart = (product: any) => {
    setCartCount(cartCount + 1);
    setSelectedProduct(product);
    setModalVisible(true);
    setTimeout(() => setModalVisible(false), 2000);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header cartCount={cartCount} />
      <HeroBanner />
      <Categories />
      <VoucherSection />
      <FlashSale />
      <ProductsSection onAddToCart={handleAddToCart} />
      <Footer />
      
      <Modal
        open={modalVisible}
        footer={null}
        closable={false}
        centered
        className="text-center"
      >
        <div className="py-4">
          <div className="text-6xl mb-4">✅</div>
          <h3 className="text-xl font-semibold mb-2">Đã thêm vào giỏ hàng!</h3>
          <p className="text-gray-600">{selectedProduct?.name}</p>
        </div>
      </Modal>
    </div>
  );
};

export default CosmeticsShop;