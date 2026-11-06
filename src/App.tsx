import React, { useEffect, useState } from "react";
import {
  Package,
  ShoppingBag,
  Plus,
  Trash2,
  Edit2,
  TrendingUp,
  Search,
  Sparkles,
  ArrowUpRight,
  RefreshCw,
  X,
  Layers,
  Settings as SettingsIcon,
  LogOut,
} from "lucide-react";
import { adminFetch, clearAdminKey, getAdminKey, getUploadStatus } from "./api";
import { AdminGate } from "./components/AdminGate";
import { ImageUploader } from "./components/ImageUploader";
import { SettingsTab } from "./components/SettingsTab";

const SHOP_URL = (import.meta.env.VITE_SHOP_URL as string | undefined) || "https://stickerhub.in";

type Product = {
  id: string;
  name: string;
  category: string;
  price: number;
  originalPrice: number;
  images: string[];
  background: "lemon" | "coral" | "mint";
  tag: string;
  description: string;
  stock: number;
  rating?: string;
  ratingCount?: number;
};

type Order = {
  id: string;
  orderNumber: string;
  customer: { name: string; email: string; phone: string };
  shippingAddress: { street: string; city: string; state: string; pincode: string };
  items: { productId: string; name: string; price: number; quantity: number; total: number }[];
  subtotal: number;
  shippingFee: number;
  totalAmount: number;
  status: string;
  razorpay_order_id?: string;
  razorpay_payment_id?: string;
  created_at: string;
};

type Metrics = {
  totalOrders: number;
  confirmedOrders: number;
  shippedOrders: number;
  totalRevenue: number;
};

export default function App() {
  const [unlocked, setUnlocked] = useState<boolean>(() => Boolean(getAdminKey()));
  const [uploadConfigured, setUploadConfigured] = useState(false);
  const [tab, setTab] = useState<"PRODUCTS" | "ORDERS" | "SETTINGS">("PRODUCTS");
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [metrics, setMetrics] = useState<Metrics>({
    totalOrders: 0,
    confirmedOrders: 0,
    shippedOrders: 0,
    totalRevenue: 0,
  });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Product Modal State (Create or Edit)
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productForm, setProductForm] = useState({
    name: "",
    category: "Good vibes",
    price: 10,
    originalPrice: 79,
    images: [] as string[],
    background: "lemon" as "lemon" | "coral" | "mint",
    tag: "Trending",
    description: "",
    stock: 100,
    rating: "5.0",
    ratingCount: 0,
  });

  const loadData = async () => {
    setLoading(true);
    try {
      // Load Products from the backend
      const prodRes = await adminFetch<{ success: boolean; data: any[] }>("/products");
      if (prodRes.success) {
        setProducts(
          prodRes.data.map((p) => ({
            ...p,
            images: typeof p.images === "string" ? JSON.parse(p.images) : p.images,
          }))
        );
      }

      // Load Orders and Metrics
      const orderRes = await adminFetch<{ success: boolean; metrics: Metrics; orders: Order[] }>("/admin/orders");
      if (orderRes.success) {
        setOrders(orderRes.orders);
        setMetrics(orderRes.metrics);
      }
    } catch (err: any) {
      console.error("Failed to load admin data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!unlocked) return;
    loadData();
    getUploadStatus().then(setUploadConfigured);
  }, [unlocked]);

  const handleLogout = () => {
    clearAdminKey();
    setUnlocked(false);
  };

  const handleOpenCreate = () => {
    setEditingProduct(null);
    setProductForm({
      name: "",
      category: "Good vibes",
      price: 10,
      originalPrice: 79,
      images: [],
      background: "lemon",
      tag: "Trending",
      description: "Waterproof vinyl sticker designed for laptops and bottles.",
      stock: 100,
      rating: "5.0",
      ratingCount: 0,
    });
    setModalOpen(true);
  };

  const handleOpenEdit = (p: Product) => {
    setEditingProduct(p);
    setProductForm({
      name: p.name,
      category: p.category,
      price: p.price,
      originalPrice: p.originalPrice || 79,
      images: Array.isArray(p.images) ? p.images : p.images ? [p.images] : [],
      background: p.background || "lemon",
      tag: p.tag || "Fan favourite",
      description: p.description || "",
      stock: p.stock ?? 100,
      rating: p.rating || "5.0",
      ratingCount: p.ratingCount ?? 0,
    });
    setModalOpen(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (productForm.images.length === 0) {
        alert("Please add at least one product image.");
        return;
      }

      const payload = {
        ...productForm,
        price: Number(productForm.price),
        originalPrice: Number(productForm.originalPrice),
        stock: Number(productForm.stock),
        ratingCount: Number(productForm.ratingCount),
        images: productForm.images,
      };

      if (editingProduct) {
        // UPDATE
        await adminFetch(`/admin/products/${editingProduct.id}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
      } else {
        // CREATE
        await adminFetch("/admin/products", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }

      setModalOpen(false);
      await loadData();
    } catch (err: any) {
      alert("Error saving product: " + err.message);
    }
  };

  const handleDeleteProduct = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    try {
      await adminFetch(`/admin/products/${id}`, { method: "DELETE" });
      await loadData();
    } catch (err: any) {
      alert("Failed to delete: " + err.message);
    }
  };

  const handleUpdateOrderStatus = async (orderId: string, status: string) => {
    try {
      await adminFetch(`/admin/orders/${orderId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      await loadData();
    } catch (err: any) {
      alert("Failed to update status: " + err.message);
    }
  };

  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.category.toLowerCase().includes(search.toLowerCase())
  );

  if (!unlocked) {
    return <AdminGate onUnlock={() => setUnlocked(true)} />;
  }

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-900 pb-12">
      {/* Top Navbar */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white shadow-xs">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-8">
          <div className="flex items-center gap-3">
            <span className="flex size-9 items-center justify-center rounded-xl bg-pink-500 text-white shadow-sm font-bold">
              <Sparkles className="size-5" />
            </span>
            <div>
              <span className="font-display text-lg font-bold lowercase">stickerhub.</span>
              <span className="ml-2 rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-500">ADMIN</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={loadData}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-xs cursor-pointer"
            >
              <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
            </button>
            <a
              href={SHOP_URL}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 shadow-xs"
            >
              Live Shop <ArrowUpRight className="size-3.5" />
            </a>
            <button
              onClick={handleLogout}
              title="Sign out"
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 shadow-xs cursor-pointer"
            >
              <LogOut className="size-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="mx-auto max-w-7xl px-4 sm:px-8 pt-8">
        {/* Metric Cards Banner */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Revenue</span>
              <span className="flex size-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                <TrendingUp className="size-4" />
              </span>
            </div>
            <p className="mt-3 font-display text-2xl font-bold text-slate-900">₹{metrics.totalRevenue}</p>
            <span className="text-[11px] text-slate-400">Captured in Razorpay</span>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Orders</span>
              <span className="flex size-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                <ShoppingBag className="size-4" />
              </span>
            </div>
            <p className="mt-3 font-display text-2xl font-bold text-slate-900">{metrics.totalOrders}</p>
            <span className="text-[11px] text-slate-400">Lifetime orders placed</span>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Paid / To Pack</span>
              <span className="flex size-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                <Package className="size-4" />
              </span>
            </div>
            <p className="mt-3 font-display text-2xl font-bold text-amber-600">{metrics.confirmedOrders}</p>
            <span className="text-[11px] text-slate-400">Need sticker packing</span>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Products</span>
              <span className="flex size-8 items-center justify-center rounded-lg bg-purple-50 text-purple-600">
                <Layers className="size-4" />
              </span>
            </div>
            <p className="mt-3 font-display text-2xl font-bold text-slate-900">{products.length}</p>
            <span className="text-[11px] text-slate-400">Live in your store</span>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-4 mb-6">
          <div className="flex gap-2">
            <button
              onClick={() => setTab("PRODUCTS")}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition-all cursor-pointer ${
                tab === "PRODUCTS"
                  ? "bg-slate-900 text-white shadow-sm"
                  : "bg-white text-slate-600 hover:text-slate-900 border border-slate-200"
              }`}
            >
              <Package className="size-4" /> Products Catalog ({products.length})
            </button>
            <button
              onClick={() => setTab("ORDERS")}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition-all cursor-pointer ${
                tab === "ORDERS"
                  ? "bg-slate-900 text-white shadow-sm"
                  : "bg-white text-slate-600 hover:text-slate-900 border border-slate-200"
              }`}
            >
              <ShoppingBag className="size-4" /> Customer Orders ({orders.length})
            </button>
            <button
              onClick={() => setTab("SETTINGS")}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition-all cursor-pointer ${
                tab === "SETTINGS"
                  ? "bg-slate-900 text-white shadow-sm"
                  : "bg-white text-slate-600 hover:text-slate-900 border border-slate-200"
              }`}
            >
              <SettingsIcon className="size-4" /> Store Settings
            </button>
          </div>

          {tab === "PRODUCTS" && (
            <button
              onClick={handleOpenCreate}
              className="inline-flex items-center gap-2 rounded-xl bg-pink-500 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-pink-600 cursor-pointer"
            >
              <Plus className="size-4" /> Add New Sticker
            </button>
          )}
        </div>

        {/* TAB 1: PRODUCTS CRUD */}
        {tab === "PRODUCTS" && (
          <div>
            <div className="mb-4 flex items-center gap-2 max-w-sm">
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filter by title or category..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full h-10 rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-xs focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-200 bg-slate-50 font-bold uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="py-3 px-4">Sticker</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Price</th>
                    <th className="py-3 px-4">Stock</th>
                    <th className="py-3 px-4">Tag</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredProducts.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-4 font-semibold text-slate-900">
                        <div className="flex items-center gap-3">
                          <img
                            src={Array.isArray(p.images) ? p.images[0] : p.images}
                            alt=""
                            className="size-11 rounded-lg object-cover border border-slate-200"
                          />
                          <div>
                            <p className="font-bold text-sm leading-snug">{p.name}</p>
                            <span className="font-mono text-[10px] text-slate-400">{p.id}</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="rounded-md bg-slate-100 px-2 py-1 font-semibold text-slate-700">
                          {p.category}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-bold text-sm text-slate-900">₹{p.price}</span>
                        <span className="ml-1 text-[11px] text-slate-400 line-through">₹{p.originalPrice}</span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`font-bold ${
                            p.stock > 10 ? "text-emerald-600" : "text-red-500"
                          }`}
                        >
                          {p.stock} in stock
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-500">{p.tag}</td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex gap-1.5">
                          <button
                            onClick={() => handleOpenEdit(p)}
                            className="rounded-lg p-1.5 text-slate-600 hover:bg-slate-100 hover:text-slate-900 cursor-pointer"
                            title="Edit Sticker"
                          >
                            <Edit2 className="size-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteProduct(p.id, p.name)}
                            className="rounded-lg p-1.5 text-red-500 hover:bg-red-50 hover:text-red-700 cursor-pointer"
                            title="Delete Sticker"
                          >
                            <Trash2 className="size-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: ORDERS MANAGEMENT */}
        {tab === "ORDERS" && (
          <div className="space-y-4">
            {orders.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-slate-500">
                <ShoppingBag className="mx-auto size-8 text-slate-300 mb-2" />
                <p className="font-bold text-base">No orders yet</p>
                <p className="text-xs">Once a customer checks out via Razorpay, it will show up here live.</p>
              </div>
            ) : (
              orders.map((order) => {
                const items = typeof order.items === "string" ? JSON.parse(order.items) : order.items;
                const addr = typeof order.shippingAddress === "string" ? JSON.parse(order.shippingAddress) : order.shippingAddress;

                return (
                  <div key={order.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3 mb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm font-bold text-slate-900">{order.orderNumber}</span>
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                              order.status === "PAYMENT_CONFIRMED"
                                ? "bg-emerald-100 text-emerald-800"
                                : order.status === "SHIPPED"
                                ? "bg-blue-100 text-blue-800"
                                : "bg-amber-100 text-amber-800"
                            }`}
                          >
                            {order.status}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Placed on: {new Date(order.created_at).toLocaleString("en-IN")}
                        </p>
                      </div>

                      {/* Status Dropdown Controller */}
                      <div className="flex items-center gap-2">
                        <label className="text-xs text-slate-500 font-semibold">Change Status:</label>
                        <select
                          value={order.status}
                          onChange={(e) => handleUpdateOrderStatus(order.id, e.target.value)}
                          className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900 cursor-pointer"
                        >
                          <option value="PENDING_PAYMENT">PENDING_PAYMENT</option>
                          <option value="PAYMENT_CONFIRMED">PAYMENT_CONFIRMED</option>
                          <option value="PROCESSING">PROCESSING</option>
                          <option value="SHIPPED">SHIPPED</option>
                          <option value="DELIVERED">DELIVERED</option>
                          <option value="CANCELLED">CANCELLED</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                      {/* Customer info */}
                      <div className="rounded-xl bg-slate-50 p-3">
                        <span className="font-bold uppercase tracking-wider text-slate-400 text-[10px]">Customer</span>
                        <p className="font-bold text-slate-900 mt-1">{order.customer?.name}</p>
                        <p className="text-slate-500">{order.customer?.email}</p>
                        <p className="text-slate-500">{order.customer?.phone}</p>
                      </div>

                      {/* Delivery Address */}
                      <div className="rounded-xl bg-slate-50 p-3">
                        <span className="font-bold uppercase tracking-wider text-slate-400 text-[10px]">Shipping Address</span>
                        <p className="text-slate-700 mt-1">{addr?.street}</p>
                        <p className="text-slate-700">
                          {addr?.city}, {addr?.state} - {addr?.pincode}
                        </p>
                      </div>

                      {/* Items & Payment Info */}
                      <div className="rounded-xl bg-slate-50 p-3">
                        <span className="font-bold uppercase tracking-wider text-slate-400 text-[10px]">Items & Razorpay</span>
                        <div className="mt-1 space-y-1">
                          {items?.map((it: any, i: number) => (
                            <div key={i} className="flex justify-between">
                              <span>{it.quantity}× {it.name}</span>
                              <span className="font-bold">₹{it.total}</span>
                            </div>
                          ))}
                        </div>
                        <div className="border-t border-slate-200 mt-2 pt-1 flex justify-between font-bold text-sm">
                          <span>Total:</span>
                          <span className="text-pink-600">₹{order.totalAmount}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* TAB 3: STORE SETTINGS */}
        {tab === "SETTINGS" && <SettingsTab />}
      </main>

      {/* CREATE / EDIT PRODUCT MODAL */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="font-display text-xl font-bold">
                {editingProduct ? "Edit Sticker Product" : "Add New Sticker Product"}
              </h2>
              <button onClick={() => setModalOpen(false)} className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 cursor-pointer">
                <X className="size-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-slate-700">Sticker Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Late Brake Club"
                  value={productForm.name}
                  onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                  className="mt-1 w-full h-10 rounded-xl border border-slate-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700">Category</label>
                  <select
                    value={productForm.category}
                    onChange={(e) => setProductForm({ ...productForm, category: e.target.value })}
                    className="mt-1 w-full h-10 rounded-xl border border-slate-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                  >
                    <option value="Cars & bikes">Cars & bikes</option>
                    <option value="Desi & culture">Desi & culture</option>
                    <option value="Good vibes">Good vibes</option>
                    <option value="Anime & pop">Anime & pop</option>
                    <option value="Sticker packs">Sticker packs</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700">Color Mood</label>
                  <select
                    value={productForm.background}
                    onChange={(e) => setProductForm({ ...productForm, background: e.target.value as any })}
                    className="mt-1 w-full h-10 rounded-xl border border-slate-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                  >
                    <option value="lemon">Lemon (Yellow)</option>
                    <option value="mint">Mint (Green)</option>
                    <option value="coral">Coral (Pinkish)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-bold text-slate-700">Price (₹)</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={productForm.price}
                    onChange={(e) => setProductForm({ ...productForm, price: Number(e.target.value) })}
                    className="mt-1 w-full h-10 rounded-xl border border-slate-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700">MRP (₹)</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={productForm.originalPrice}
                    onChange={(e) => setProductForm({ ...productForm, originalPrice: Number(e.target.value) })}
                    className="mt-1 w-full h-10 rounded-xl border border-slate-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700">Stock Count</label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={productForm.stock}
                    onChange={(e) => setProductForm({ ...productForm, stock: Number(e.target.value) })}
                    className="mt-1 w-full h-10 rounded-xl border border-slate-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>
              </div>

              <ImageUploader
                images={productForm.images}
                onChange={(next) => setProductForm({ ...productForm, images: next })}
                uploadConfigured={uploadConfigured}
              />

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-bold text-slate-700">Badge / Tag</label>
                  <input
                    type="text"
                    placeholder="e.g. Fan favourite"
                    value={productForm.tag}
                    onChange={(e) => setProductForm({ ...productForm, tag: e.target.value })}
                    className="mt-1 w-full h-10 rounded-xl border border-slate-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700">Rating</label>
                  <input
                    type="text"
                    placeholder="4.9"
                    value={productForm.rating}
                    onChange={(e) => setProductForm({ ...productForm, rating: e.target.value })}
                    className="mt-1 w-full h-10 rounded-xl border border-slate-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700">Reviews</label>
                  <input
                    type="number"
                    min={0}
                    value={productForm.ratingCount}
                    onChange={(e) => setProductForm({ ...productForm, ratingCount: Number(e.target.value) })}
                    className="mt-1 w-full h-10 rounded-xl border border-slate-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700">Description</label>
                <textarea
                  rows={3}
                  required
                  value={productForm.description}
                  onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-slate-200 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded-xl px-4 py-2 font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-pink-500 px-6 py-2 font-bold text-white hover:bg-pink-600 cursor-pointer shadow-sm"
                >
                  {editingProduct ? "Save changes" : "Create product"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
