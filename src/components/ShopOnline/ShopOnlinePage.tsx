import React, { useMemo, useState } from "react";
import "./shopOnline.css";

type Category = {
  id: string;
  name: string;
  desc: string;
  icon: string; // emoji for demo
};

type Product = {
  id: string;
  name: string;
  brand: string;
  categoryId: string;
  price: number;
  compareAt?: number;
  rating: number;
  sold: number;
  tags: string[];
  thumbnail: string;
  description: string;
};

type CartItem = { product: Product; qty: number };

const money = (n: number) => n.toLocaleString("vi-VN") + "₫";

const CATEGORIES: Category[] = [
  { id: "skincare", name: "Chăm sóc da", desc: "Serum • Kem dưỡng • Toner", icon: "✨" },
  { id: "suncare", name: "Chống nắng", desc: "SPF • PA++++ • Body/Face", icon: "☀️" },
  { id: "makeup", name: "Trang điểm", desc: "Son • Nền • Phấn", icon: "💄" },
  { id: "haircare", name: "Chăm sóc tóc", desc: "Dầu gội • Ủ • Dưỡng", icon: "💇‍♀️" },
  { id: "bodycare", name: "Chăm sóc body", desc: "Tắm • Dưỡng thể", icon: "🧴" },
  { id: "perfume", name: "Nước hoa", desc: "EDP • Mini • Gift", icon: "🌸" },
];

const PRODUCTS: Product[] = [
  {
    id: "p1",
    name: "Serum Niacinamide 10% + Zinc 1%",
    brand: "The Ordinary",
    categoryId: "skincare",
    price: 289000,
    compareAt: 349000,
    rating: 4.7,
    sold: 1520,
    tags: ["Best-seller", "Giảm dầu"],
    thumbnail:
      "https://images.unsplash.com/photo-1612810806695-30f7a8258391?auto=format&fit=crop&w=1200&q=80",
    description: "Hỗ trợ giảm dầu, se lỗ chân lông, làm đều màu da.",
  },
  {
    id: "p2",
    name: "Kem chống nắng SPF50+ PA++++",
    brand: "La Roche-Posay",
    categoryId: "suncare",
    price: 399000,
    rating: 4.8,
    sold: 2310,
    tags: ["Hot", "Mỏng nhẹ"],
    thumbnail:
      "https://images.unsplash.com/photo-1611930022073-84f6f3f3c58f?auto=format&fit=crop&w=1200&q=80",
    description: "Chống nắng phổ rộng, kết cấu mỏng nhẹ, không để lại vệt trắng.",
  },
  {
    id: "p3",
    name: "Son kem lì Velvet Lip Cream",
    brand: "3CE",
    categoryId: "makeup",
    price: 265000,
    compareAt: 320000,
    rating: 4.6,
    sold: 980,
    tags: ["New", "Velvet"],
    thumbnail:
      "https://images.unsplash.com/photo-1586495777744-4413f21062fa?auto=format&fit=crop&w=1200&q=80",
    description: "Chất son mịn như nhung, bám màu tốt, không khô môi.",
  },
  {
    id: "p4",
    name: "Sữa tắm hương hoa trắng",
    brand: "Dove",
    categoryId: "bodycare",
    price: 129000,
    rating: 4.4,
    sold: 540,
    tags: ["Dịu nhẹ"],
    thumbnail:
      "https://images.unsplash.com/photo-1585232351009-aa87416fca90?auto=format&fit=crop&w=1200&q=80",
    description: "Làm sạch dịu nhẹ, hỗ trợ dưỡng ẩm, hương thơm thư giãn.",
  },
  {
    id: "p5",
    name: "Dầu gội phục hồi tóc hư tổn",
    brand: "TSUBAKI",
    categoryId: "haircare",
    price: 189000,
    rating: 4.5,
    sold: 770,
    tags: ["Repair"],
    thumbnail:
      "https://images.unsplash.com/photo-1522337660859-02fbefca4702?auto=format&fit=crop&w=1200&q=80",
    description: "Phù hợp tóc khô xơ, hư tổn do uốn/nhuộm.",
  },
  {
    id: "p6",
    name: "Nước hoa mini Eau de Parfum 10ml",
    brand: "Jo Malone",
    categoryId: "perfume",
    price: 590000,
    rating: 4.7,
    sold: 320,
    tags: ["Gift", "Mini"],
    thumbnail:
      "https://images.unsplash.com/photo-1547887537-6158d64c35b3?auto=format&fit=crop&w=1200&q=80",
    description: "Phiên bản mini tiện mang theo. Mùi hương thanh lịch.",
  },
];

function Stars({ value }: { value: number }) {
  const full = Math.floor(value);
  const half = value - full >= 0.5;
  return (
    <div className="stars" title={value.toFixed(1)}>
      {Array.from({ length: 5 }).map((_, i) => {
        const idx = i + 1;
        const filled = idx <= full;
        const halfHere = !filled && half && idx === full + 1;
        return (
          <span key={i} className={`star ${filled ? "on" : halfHere ? "half" : ""}`}>★</span>
        );
      })}
      <span className="starsText">{value.toFixed(1)}</span>
    </div>
  );
}

function Drawer({
  open,
  title,
  onClose,
  children,
  footer,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <>
      <div className={`overlay ${open ? "show" : ""}`} onClick={onClose} />
      <aside className={`drawer ${open ? "open" : ""}`}>
        <div className="drawerHeader">
          <div className="drawerTitle">{title}</div>
          <button className="iconBtn" onClick={onClose} aria-label="close">✕</button>
        </div>
        <div className="drawerBody">{children}</div>
        {footer ? <div className="drawerFooter">{footer}</div> : null}
      </aside>
    </>
  );
}

export default function App() {
  const [query, setQuery] = useState("");
  const [activeCat, setActiveCat] = useState<string>("all");
  const [sort, setSort] = useState<"popular" | "price_asc" | "price_desc" | "rating">("popular");
  const [onlySale, setOnlySale] = useState(false);

  const [cartOpen, setCartOpen] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);

  const cartCount = useMemo(() => cart.reduce((s, it) => s + it.qty, 0), [cart]);
  const subtotal = useMemo(() => cart.reduce((s, it) => s + it.qty * it.product.price, 0), [cart]);
  const shipping = useMemo(() => (subtotal >= 500000 || subtotal === 0 ? 0 : 25000), [subtotal]);
  const discount = useMemo(() => (cartCount >= 3 ? Math.round(subtotal * 0.05) : 0), [cartCount, subtotal]);
  const total = Math.max(0, subtotal + shipping - discount);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = PRODUCTS.slice();

    if (activeCat !== "all") list = list.filter((p) => p.categoryId === activeCat);

    if (q) {
      list = list.filter((p) => {
        const cat = CATEGORIES.find((c) => c.id === p.categoryId)?.name ?? "";
        const hay = `${p.name} ${p.brand} ${cat} ${p.tags.join(" ")}`.toLowerCase();
        return hay.includes(q);
      });
    }

    if (onlySale) list = list.filter((p) => !!p.compareAt && p.compareAt > p.price);

    switch (sort) {
      case "popular":
        list.sort((a, b) => b.sold - a.sold);
        break;
      case "price_asc":
        list.sort((a, b) => a.price - b.price);
        break;
      case "price_desc":
        list.sort((a, b) => b.price - a.price);
        break;
      case "rating":
        list.sort((a, b) => b.rating - a.rating);
        break;
    }
    return list;
  }, [query, activeCat, sort, onlySale]);

  function addToCart(p: Product, qty = 1) {
    setCart((prev) => {
      const idx = prev.findIndex((x) => x.product.id === p.id);
      if (idx >= 0) {
        const next = prev.slice();
        next[idx] = { ...next[idx], qty: next[idx].qty + qty };
        return next;
      }
      return [...prev, { product: p, qty }];
    });
    setCartOpen(true);
  }

  function inc(id: string) {
    setCart((prev) => prev.map((x) => (x.product.id === id ? { ...x, qty: x.qty + 1 } : x)));
  }
  function dec(id: string) {
    setCart((prev) =>
      prev
        .map((x) => (x.product.id === id ? { ...x, qty: Math.max(1, x.qty - 1) } : x))
    );
  }
  function remove(id: string) {
    setCart((prev) => prev.filter((x) => x.product.id !== id));
  }

  return (
    <div className="app">
      {/* Topbar */}
      <div className="topbar">
        <div className="container topbarInner">
          <div className="topbarLeft">
            <span className="dotPink" />
            Freeship đơn từ <b>500k</b> • Đổi trả 7 ngày • Chính hãng
          </div>
          <div className="topbarRight">
            <a href="#!" onClick={(e) => e.preventDefault()}>Hỗ trợ</a>
            <span className="sep">•</span>
            <a href="#!" onClick={(e) => e.preventDefault()}>Tra cứu đơn</a>
          </div>
        </div>
      </div>

      {/* Header */}
      <header className="header">
        <div className="container headerInner">
          <div className="brand">
            <div className="logo">BA</div>
            <div className="brandText">
              <div className="brandName">Bảo Ân Cosmetics</div>
              <div className="brandSub">Beauty that feels like you</div>
            </div>
          </div>

          <div className="searchWrap">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Tìm sản phẩm, thương hiệu…"
              className="searchInput"
            />
          </div>

          <button className="cartBtn" onClick={() => setCartOpen(true)}>
            <span className="cartIcon">🛍️</span>
            <span>Giỏ</span>
            <span className="cartBadge">{cartCount}</span>
          </button>
        </div>

        {/* Category menu */}
        <div className="container catMenu">
          <button
            className={`catPill ${activeCat === "all" ? "active" : ""}`}
            onClick={() => setActiveCat("all")}
          >
            🏷️ Tất cả
          </button>
          {CATEGORIES.map((c) => (
            <button
              key={c.id}
              className={`catPill ${activeCat === c.id ? "active" : ""}`}
              onClick={() => setActiveCat(c.id)}
            >
              {c.icon} {c.name}
            </button>
          ))}
        </div>
      </header>

      {/* Hero */}
      <section className="hero">
        <div className="container heroInner">
          <div className="heroLeft">
            <div className="heroBadge">💗 New Year Sale</div>
            <h1>Mỹ phẩm chuẩn xịn — mua là đẹp</h1>
            <p>
              Giao diện store Online (trắng/hồng) có danh mục, tìm kiếm, sắp xếp, giỏ hàng. Bạn thay dữ liệu API là chạy.
            </p>
            <div className="heroActions">
              <button className="btn btn-primary" onClick={() => window.scrollTo({ top: 640, behavior: "smooth" })}>
                Mua ngay
              </button>
              <button className="btn btn-ghost" onClick={() => setOnlySale((v) => !v)}>
                {onlySale ? "Bỏ lọc giảm giá" : "Chỉ xem giảm giá"}
              </button>
            </div>
            <div className="heroChips">
              <span className="chip">✅ Chính hãng</span>
              <span className="chip">⚡ Giao nhanh</span>
              <span className="chip">🎁 Quà tặng kèm</span>
            </div>
          </div>

          <div className="heroRight">
            <div className="heroCard">
              <div className="heroCardTop">
                <div className="heroMini">Best picks</div>
                <div className="heroMini ghost">Glow routine</div>
              </div>
              <img
                className="heroImg"
                alt="beauty"
                src="https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=1600&q=80"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Category grid */}
      <section className="container catGridWrap">
        <div className="sectionHead">
          <div>
            <div className="sectionTitle">Danh mục sản phẩm</div>
            <div className="sectionSub">Chọn nhanh theo nhu cầu</div>
          </div>

          <div className="tools">
            <label className="toggle">
              <input type="checkbox" checked={onlySale} onChange={(e) => setOnlySale(e.target.checked)} />
              <span>Giảm giá</span>
            </label>

            <select className="select" value={sort} onChange={(e) => setSort(e.target.value as any)}>
              <option value="popular">Phổ biến</option>
              <option value="rating">Đánh giá cao</option>
              <option value="price_asc">Giá tăng dần</option>
              <option value="price_desc">Giá giảm dần</option>
            </select>
          </div>
        </div>

        <div className="catGrid">
          <button
            className={`catCard ${activeCat === "all" ? "active" : ""}`}
            onClick={() => setActiveCat("all")}
          >
            <div className="catIcon">🏷️</div>
            <div className="catName">Tất cả</div>
            <div className="catDesc">Xem toàn bộ sản phẩm</div>
          </button>

          {CATEGORIES.map((c) => (
            <button
              key={c.id}
              className={`catCard ${activeCat === c.id ? "active" : ""}`}
              onClick={() => setActiveCat(c.id)}
            >
              <div className="catIcon">{c.icon}</div>
              <div className="catName">{c.name}</div>
              <div className="catDesc">{c.desc}</div>
            </button>
          ))}
        </div>
      </section>

      {/* Product grid */}
      <main className="container main">
        <div className="productHead">
          <div className="productTitle">
            {activeCat === "all"
              ? "Tất cả sản phẩm"
              : CATEGORIES.find((c) => c.id === activeCat)?.name}
          </div>
          <div className="productCount">{filtered.length} sản phẩm</div>
        </div>

        <section className="grid">
          {filtered.map((p) => {
            const isSale = !!p.compareAt && p.compareAt > p.price;
            const salePct = isSale ? Math.round(((p.compareAt! - p.price) / p.compareAt!) * 100) : 0;

            return (
              <article key={p.id} className="card">
                <div className="cardMedia">
                  <img src={p.thumbnail} alt={p.name} />
                  <div className="cardBadges">
                    {isSale ? <span className="badge badge-pink">- {salePct}%</span> : null}
                    {p.tags.slice(0, 1).map((t) => (
                      <span key={t} className="badge badge-soft">{t}</span>
                    ))}
                  </div>
                </div>

                <div className="cardBody">
                  <div className="cardTitle" title={p.name}>{p.name}</div>
                  <div className="cardBrand">{p.brand}</div>

                  <div className="cardMeta">
                    <Stars value={p.rating} />
                    <span className="sold">Đã bán {p.sold}</span>
                  </div>

                  <div className="priceRow">
                    <div className="price">{money(p.price)}</div>
                    {isSale ? <div className="compare">{money(p.compareAt!)}</div> : null}
                  </div>

                  <button className="btn btn-primary wfull" onClick={() => addToCart(p, 1)}>
                    Thêm vào giỏ
                  </button>

                  <div className="tinyNote">{p.description}</div>
                </div>
              </article>
            );
          })}
        </section>

        {filtered.length === 0 ? (
          <div className="empty">
            <div className="emptyTitle">Không tìm thấy sản phẩm</div>
            <div className="emptyDesc">Thử đổi danh mục hoặc từ khóa.</div>
          </div>
        ) : null}
      </main>

      {/* Cart */}
      <Drawer
        open={cartOpen}
        title={`Giỏ hàng (${cartCount})`}
        onClose={() => setCartOpen(false)}
        footer={
          <div className="cartFooter">
            <div className="sumRow"><span>Tạm tính</span><b>{money(subtotal)}</b></div>
            <div className="sumRow"><span>Vận chuyển</span><b>{shipping === 0 ? "Miễn phí" : money(shipping)}</b></div>
            <div className="sumRow"><span>Giảm giá</span><b className="pink">- {money(discount)}</b></div>
            <div className="sumTotal"><span>Tổng</span><b>{money(total)}</b></div>
            <button
              className="btn btn-primary wfull"
              disabled={cart.length === 0}
              onClick={() => alert("Demo: nối API /orders ở đây")}
            >
              Thanh toán
            </button>
            <div className="tiny">
              {subtotal > 0 && subtotal < 500000 ? (
                <>Mua thêm <b>{money(500000 - subtotal)}</b> để freeship.</>
              ) : (
                <>Freeship đơn từ 500k.</>
              )}
            </div>
          </div>
        }
      >
        {cart.length === 0 ? (
          <div className="cartEmpty">
            <div className="emptyTitle">Giỏ hàng trống</div>
            <div className="emptyDesc">Thêm sản phẩm để bắt đầu.</div>
          </div>
        ) : (
          <div className="cartList">
            {cart.map((it) => (
              <div key={it.product.id} className="cartItem">
                <img className="cartThumb" src={it.product.thumbnail} alt={it.product.name} />
                <div className="cartInfo">
                  <div className="cartName">{it.product.name}</div>
                  <div className="cartBrand">{it.product.brand}</div>
                  <div className="cartPrice">{money(it.product.price)}</div>
                </div>

                <div className="qtyBox">
                  <button className="qtyBtn" onClick={() => dec(it.product.id)}>−</button>
                  <div className="qty">{it.qty}</div>
                  <button className="qtyBtn" onClick={() => inc(it.product.id)}>+</button>
                </div>

                <button className="iconBtn" onClick={() => remove(it.product.id)}>🗑️</button>
              </div>
            ))}
          </div>
        )}
      </Drawer>

      <footer className="footer">
        <div className="container footerInner">
          <div>
            <div className="footerTitle">Bảo Ân Cosmetics</div>
            <div className="footerText">Store UI • White/Pink • ReactJS</div>
          </div>
          <div className="footerLinks">
            <a href="#!" onClick={(e) => e.preventDefault()}>Chính sách</a>
            <a href="#!" onClick={(e) => e.preventDefault()}>Đổi trả</a>
            <a href="#!" onClick={(e) => e.preventDefault()}>Liên hệ</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
