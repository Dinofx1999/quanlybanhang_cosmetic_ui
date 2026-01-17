// src/data/shopMock.ts
export type Category = {
  id: string;
  name: string;
  children?: Category[]; // ✅ recursive
};

export type Product = {
  id: string;
  name: string;
  brand?: string;
  categoryId?: string;
  price: number;
  originalPrice?: number;
  image: string;

  flashSale?: boolean;
  sold?: number; // % sold progress
  soldCount?: number; // số đã bán
  rating?: number; // 0..5
  reviews?: number;
  location?: string;
  tags?: string[]; // ["Mall","Hot","New","Freeship"]
};


export const flashSaleEndsAt = Date.now() + 1000 * 60 * 60 * 3 + 1000 * 60 * 12;

export const products: Product[] = [
  {
    id: "p1",
    name: "Sữa rửa mặt dịu nhẹ - sạch sâu không khô da",
    brand: "BA Cosmetics",
    categoryId: "skincare",
    price: 129000,
    originalPrice: 189000,
    image: "https://images.unsplash.com/photo-1611930022073-b7a4ba5fcccd?auto=format&fit=crop&w=900&q=75",
    sold: 72,
    soldCount: 1280,
    rating: 4.8,
    reviews: 532,
    location: "Đà Nẵng",
    flashSale: true,
    tags: ["Mall", "Freeship", "Hot"],
  },
  {
    id: "p2",
    name: "Toner hoa hồng cấp ẩm - da căng bóng",
    brand: "Rose Lab",
    categoryId: "skincare",
    price: 159000,
    originalPrice: 220000,
    image: "https://images.unsplash.com/photo-1616394584738-fc6e612e71b9?auto=format&fit=crop&w=900&q=75",
    sold: 45,
    soldCount: 690,
    rating: 4.6,
    reviews: 211,
    location: "Hồ Chí Minh",
    flashSale: true,
    tags: ["Flash", "Freeship"],
  },
  {
    id: "p3",
    name: "Kem chống nắng SPF50+ không nâng tone",
    brand: "SunCare",
    categoryId: "skincare",
    price: 239000,
    originalPrice: 299000,
    image: "https://images.unsplash.com/photo-1612810436541-336d7f7f0b9e?auto=format&fit=crop&w=900&q=75",
    soldCount: 940,
    rating: 4.7,
    reviews: 345,
    location: "Hà Nội",
    tags: ["New", "Freeship","Flash"],
  },
  {
    id: "p4",
    name: "Son lì hồng đất - bền màu không khô môi",
    brand: "Pinkie",
    categoryId: "makeup",
    price: 199000,
    originalPrice: 259000,
    image: "https://images.unsplash.com/photo-1614852206732-6728910dc175?auto=format&fit=crop&w=900&q=75",
    soldCount: 1580,
    rating: 4.9,
    reviews: 802,
    location: "Đà Nẵng",
    tags: ["Hot","Flash"],
  },
  {
    id: "p5",
    name: "Serum phục hồi - giảm kích ứng, phục hồi hàng rào",
    brand: "Repair+",
    categoryId: "skincare",
    price: 329000,
    originalPrice: 399000,
    image: "https://images.unsplash.com/photo-1611930022093-7c1b7e76aa87?auto=format&fit=crop&w=900&q=75",
    sold: 80,
    soldCount: 420,
    rating: 4.5,
    reviews: 120,
    location: "Hồ Chí Minh",
    flashSale: true,
    tags: ["Flash", "Mall"],
  },
  {
    id: "p6",
    name: "Serum phục hồi - giảm kích ứng, phục hồi hàng rào",
    brand: "Repair+",
    categoryId: "skincare",
    price: 329000,
    originalPrice: 399000,
    image: "https://images.unsplash.com/photo-1611930022093-7c1b7e76aa87?auto=format&fit=crop&w=900&q=75",
    sold: 80,
    soldCount: 420,
    rating: 4.5,
    reviews: 120,
    location: "Hồ Chí Minh",
    flashSale: true,
    tags: ["Flash", "Mall"],
  },
  {
    id: "p7",
    name: "Dưỡng thể hương hoa - mềm mịn cả ngày",
    brand: "Body Bloom",
    categoryId: "bodycare",
    sold: 80,
    price: 179000,
    originalPrice: 219000,
    image: "https://images.unsplash.com/photo-1629198688000-71f23e745b6b?auto=format&fit=crop&w=900&q=75",
    soldCount: 260,
    rating: 4.3,
    reviews: 55,
    flashSale: true,
    location: "Quảng Nam",
    tags: ["Gift","Flash"],
  },
];

export const categories: Category[] = [
  {
    id: "skincare",
    name: "Skincare",
    children: [
      {
        id: "cleanser",
        name: "Làm sạch",
        children: [
          { id: "foam", name: "Sữa rửa mặt" },
          { id: "oil", name: "Tẩy trang dầu" },
          { id: "micellar", name: "Nước tẩy trang" },
        ],
      },
      {
        id: "treatment",
        name: "Đặc trị",
        children: [
          { id: "serum", name: "Serum" },
          { id: "retinol", name: "Retinol" },
          { id: "aha-bha", name: "AHA/BHA" },
        ],
      },
    ],
  },
  {
    id: "makeup",
    name: "Makeup",
    children: [
      {
        id: "lips",
        name: "Môi",
        children: [
          { id: "lipstick", name: "Son thỏi" },
          { id: "tint", name: "Tint" },
        ],
      },
      {
        id: "face",
        name: "Mặt",
        children: [
          { id: "cushion", name: "Cushion" },
          { id: "powder", name: "Phấn phủ" },
        ],
      },
    ],
  },
];
