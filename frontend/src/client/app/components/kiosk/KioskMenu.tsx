import { useEffect, useMemo, useRef, useState } from 'react';
import { Plus, Minus, Search, X, Flame, Clock, Tag, Sparkles, ShoppingBag, ChevronUp, ChevronDown, RotateCcw } from 'lucide-react';
import type { MenuItem } from '@/client/app/data/menuData';
import { categories as sampleCategories, menuData } from '@/client/app/data/menuData';
import { fetchMenuCategories, fetchMenuItems } from '@/client/api/menu';
import { MenuItemImage } from '@/client/app/components/MenuItemImage';
import type { CartItem } from '@/client/app/App';

interface KioskMenuProps {
  onAddToCart: (item: Omit<CartItem, 'quantity'> & { quantity?: number }) => void;
  onGoToCart: () => void;
  cartCount: number;
  cart: CartItem[];
  onUpdateQuantity: (id: string, quantity: number) => void;
  onRemoveItem: (id: string) => void;
}

/* ---------- category emoji map ---------- */
const categoryIcons: Record<string, string> = {
  'All': '🍽️',
  'Starters': '🥗',
  'Main Course': '🍛',
  'Breads': '🫓',
  'Desserts': '🍰',
  'Beverages': '☕',
  'Sides': '🥘',
  'Salads': '🥬',
};

export default function KioskMenu({ onAddToCart, onGoToCart, cartCount, cart, onUpdateQuantity, onRemoveItem }: KioskMenuProps) {
  const [categories, setCategories] = useState<string[]>(['All']);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [filterVeg, setFilterVeg] = useState<'all' | 'veg' | 'non-veg' | 'special'>('all');
  const [filterCuisine, setFilterCuisine] = useState<'all' | 'North Indian' | 'South Indian' | 'Chinese' | 'Italian' | 'Continental'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [showBasket, setShowBasket] = useState(false);
  const [mounted, setMounted] = useState(false);
  const mainRef = useRef<HTMLDivElement>(null);
  const [customization, setCustomization] = useState({
    spiceLevel: 'medium',
    addons: [] as string[],
    specialInstructions: '',
    quantity: 1,
  });

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    let cancelled = false;
    const cuisineLookup = new Map<string, MenuItem['cuisine']>(
      menuData.map((m) => [m.name.toLowerCase(), m.cuisine]),
    );
    Promise.all([fetchMenuCategories(), fetchMenuItems()])
      .then(([cats, items]) => {
        if (cancelled) return;
        setCategories(cats);
        const enriched = items.map((item) =>
          item.cuisine ? item : { ...item, cuisine: cuisineLookup.get(item.name.toLowerCase()) },
        );
        setMenuItems(enriched);
      })
      .catch(() => {
        if (cancelled) return;
        setCategories(sampleCategories);
        setMenuItems(menuData);
      });
    return () => { cancelled = true; };
  }, []);

  const filteredItems = useMemo(() => {
    return menuItems.filter((item) => {
      const categoryMatch = selectedCategory === 'All' || item.category === selectedCategory;
      const vegMatch =
        filterVeg === 'all' ||
        (filterVeg === 'veg' && item.isVeg) ||
        (filterVeg === 'non-veg' && !item.isVeg) ||
        (filterVeg === 'special' && item.todaysSpecial);
      const cuisineMatch =
        filterCuisine === 'all' || item.cuisine === filterCuisine;
      const searchMatch =
        searchQuery === '' ||
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description.toLowerCase().includes(searchQuery.toLowerCase());
      return categoryMatch && vegMatch && cuisineMatch && searchMatch && item.available;
    });
  }, [filterCuisine, filterVeg, menuItems, searchQuery, selectedCategory]);

  /* representative image per category for sidebar */
  const categoryImages = useMemo(() => {
    const map: Record<string, string> = {};
    for (const item of menuItems) {
      if (item.image && !map[item.category]) map[item.category] = item.image;
    }
    return map;
  }, [menuItems]);

  const cartTotal = useMemo(() => cart.reduce((sum, c) => sum + c.price * c.quantity, 0), [cart]);

  const addons = [
    { id: 'extra-cheese', name: 'Extra Cheese', price: 50 },
    { id: 'extra-paneer', name: 'Extra Paneer', price: 80 },
    { id: 'extra-chicken', name: 'Extra Chicken', price: 100 },
    { id: 'butter-on-top', name: 'Butter on Top', price: 30 },
  ];

  const handleAddToCart = () => {
    if (!selectedItem) return;
    const cartItem: Omit<CartItem, 'quantity'> & { quantity?: number } = {
      id: `${selectedItem.id}-${Date.now()}`,
      name: selectedItem.name,
      price: selectedItem.price,
      image: selectedItem.image,
      isVeg: selectedItem.isVeg,
      spiceLevel: customization.spiceLevel,
      addons: customization.addons,
      specialInstructions: customization.specialInstructions,
      quantity: customization.quantity,
    };
    onAddToCart(cartItem);
    setSelectedItem(null);
    setCustomization({ spiceLevel: 'medium', addons: [], specialInstructions: '', quantity: 1 });
  };

  const handleQuickAdd = (item: MenuItem) => {
    onAddToCart({
      id: item.id,
      name: item.name,
      price: item.price,
      image: item.image,
      isVeg: item.isVeg,
      quantity: 1,
    });
  };

  const getCartQuantity = (itemId: string) => {
    const c = cart.find(ci => ci.id === itemId);
    return c ? c.quantity : 0;
  };

  const handleCategoryClick = (cat: string) => {
    setSelectedCategory(cat);
    mainRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className={`h-screen flex flex-col bg-[#FAF7F2] overflow-hidden transition-opacity duration-700 ${mounted ? 'opacity-100' : 'opacity-0'}`}>

      {/* ====== TOP BAR ====== */}
      <div className="flex-shrink-0 bg-[#3E2723] text-white px-4 py-3 flex items-center justify-between shadow-lg z-30">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#C8A47A] flex items-center justify-center text-lg font-black text-[#3E2723]" style={{ fontFamily: "'Playfair Display', serif" }}>R</div>
          <div>
            <h1 className="text-lg font-bold leading-tight" style={{ fontFamily: "'Playfair Display', serif" }}>Self-Order Kiosk</h1>
            <p className="text-[10px] text-white/50 uppercase tracking-widest">Touch to begin</p>
          </div>
        </div>
        {/* Search */}
        <div className="relative w-64 hidden md:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search menu…"
            className="w-full pl-9 pr-8 py-2 bg-white/10 border border-white/10 rounded-full text-sm text-white placeholder-white/30 focus:outline-none focus:bg-white/20 transition-colors"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2">
              <X className="w-4 h-4 text-white/50" />
            </button>
          )}
        </div>
      </div>

      {/* ====== MAIN AREA: SIDEBAR + CONTENT ====== */}
      <div className="flex flex-1 min-h-0">

        {/* ---- LEFT SIDEBAR ---- */}
        <aside className="w-[100px] md:w-[120px] flex-shrink-0 bg-white border-r border-[#E8DED0] overflow-y-auto scrollbar-hide flex flex-col py-2">
          {categories.map((cat, i) => {
            const isActive = selectedCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => handleCategoryClick(cat)}
                className={`relative flex flex-col items-center gap-1.5 px-2 py-3 transition-all duration-300 border-l-4 ${
                  isActive
                    ? 'border-[#8B5A2B] bg-[#FAF0E4]'
                    : 'border-transparent hover:bg-[#FAF7F2]'
                }`}
                style={{ animationDelay: `${i * 60}ms` }}
              >
                {/* Category thumbnail */}
                <div className={`w-14 h-14 md:w-16 md:h-16 rounded-2xl overflow-hidden border-2 transition-all duration-300 ${
                  isActive ? 'border-[#8B5A2B] shadow-lg shadow-[#8B5A2B]/20 scale-105' : 'border-[#E8DED0]'
                }`}>
                  {cat === 'All' ? (
                    <div className="w-full h-full bg-gradient-to-br from-[#3E2723] to-[#8B5A2B] flex items-center justify-center text-2xl">
                      {categoryIcons['All']}
                    </div>
                  ) : categoryImages[cat] ? (
                    <MenuItemImage src={categoryImages[cat]} alt={cat} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-[#E8DED0] flex items-center justify-center text-2xl">
                      {categoryIcons[cat] || '🍴'}
                    </div>
                  )}
                </div>
                <span className={`text-[10px] md:text-xs font-bold text-center leading-tight uppercase tracking-wider transition-colors ${
                  isActive ? 'text-[#8B5A2B]' : 'text-[#6D4C41]'
                }`}>
                  {cat}
                </span>
                {/* item count badge */}
                <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full ${
                  isActive ? 'bg-[#8B5A2B] text-white' : 'bg-[#E8DED0] text-[#6D4C41]'
                }`}>
                  {cat === 'All' ? menuItems.filter(i => i.available).length : menuItems.filter(i => i.category === cat && i.available).length}
                </span>
              </button>
            );
          })}
        </aside>

        {/* ---- MAIN CONTENT ---- */}
        <main ref={mainRef} className="flex-1 overflow-y-auto scrollbar-hide pb-28">
          {/* Category Header */}
          <div className="sticky top-0 z-20 bg-[#FAF7F2]/95 backdrop-blur-sm border-b border-[#E8DED0] px-4 py-3">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-2xl font-black text-[#3E2723] uppercase tracking-wide" style={{ fontFamily: "'Playfair Display', serif" }}>
                {selectedCategory}
              </h2>
              <span className="text-xs text-[#8B5A2B] font-semibold bg-[#8B5A2B]/10 px-3 py-1 rounded-full">
                {filteredItems.length} items
              </span>
            </div>
            {/* Sub-filters row */}
            <div className="flex gap-2 overflow-x-auto scrollbar-hide">
              {(['all', 'veg', 'non-veg', 'special'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilterVeg(f)}
                  className={`px-3 py-1.5 rounded-full text-[11px] font-bold border-2 whitespace-nowrap transition-all duration-200 ${
                    filterVeg === f
                      ? f === 'veg' ? 'bg-green-600 text-white border-green-600'
                      : f === 'non-veg' ? 'bg-red-600 text-white border-red-600'
                      : f === 'special' ? 'bg-[#C8A47A] text-[#2D1B10] border-[#C8A47A]'
                      : 'bg-[#3E2723] text-white border-[#3E2723]'
                      : 'bg-white text-[#6D4C41] border-[#E8DED0] hover:border-[#8B5A2B]'
                  }`}
                >
                  {f === 'all' ? 'ALL' : f === 'veg' ? '● VEG' : f === 'non-veg' ? '● NON-VEG' : '✦ SPECIAL'}
                </button>
              ))}
              <div className="w-px bg-[#E8DED0] mx-1" />
              {(['all', 'North Indian', 'South Indian', 'Chinese', 'Italian', 'Continental'] as const).map((c) => (
                <button
                  key={c}
                  onClick={() => setFilterCuisine(c)}
                  className={`px-3 py-1.5 rounded-full text-[11px] font-bold border-2 whitespace-nowrap transition-all duration-200 ${
                    filterCuisine === c
                      ? 'bg-[#8B5A2B] text-white border-[#8B5A2B]'
                      : 'bg-white text-[#6D4C41] border-[#E8DED0] hover:border-[#8B5A2B]'
                  }`}
                >
                  {c === 'all' ? 'ALL CUISINES' : c.toUpperCase()}
                </button>
              ))}
            </div>
            {/* Mobile search */}
            <div className="relative mt-2 md:hidden">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8B5A2B]/40" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search…"
                className="w-full pl-9 pr-8 py-2 bg-white border border-[#E8D5B5] rounded-lg text-sm text-[#3E2723] placeholder-[#8B5A2B]/30 focus:outline-none focus:ring-2 focus:ring-[#C8A47A]"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2">
                  <X className="w-4 h-4 text-gray-400" />
                </button>
              )}
            </div>
          </div>

          {/* ---- ITEMS GRID ---- */}
          <div className="px-3 py-3">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2.5">
              {filteredItems.map((item, idx) => {
                const qty = getCartQuantity(item.id);
                return (
                  <div
                    key={item.id}
                    className="group bg-white rounded-xl border border-[#E8DED0] overflow-hidden hover:shadow-lg hover:shadow-[#8B5A2B]/10 transition-all duration-300 hover:-translate-y-0.5 flex flex-col animate-[fadeSlideUp_0.4s_ease-out_both]"
                    style={{ animationDelay: `${idx * 50}ms` }}
                  >
                    {/* Image */}
                    <div className="relative aspect-[5/3] overflow-hidden cursor-pointer" onClick={() => setSelectedItem(item)}>
                      <MenuItemImage
                        src={item.image}
                        alt={item.name}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      />
                      {/* Badges */}
                      {item.todaysSpecial && (
                        <div className="absolute top-1.5 left-1.5 bg-[#C8A47A] text-[#2D1B10] text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider flex items-center gap-0.5 animate-pulse">
                          <Sparkles className="w-2.5 h-2.5" /> Special
                        </div>
                      )}
                      {/* Veg indicator */}
                      <div className={`absolute bottom-1.5 left-1.5 w-4 h-4 rounded border-2 flex items-center justify-center bg-white ${item.isVeg ? 'border-green-600' : 'border-red-600'}`}>
                        <div className={`w-2 h-2 rounded-full ${item.isVeg ? 'bg-green-600' : 'bg-red-600'}`} />
                      </div>
                    </div>

                    {/* Info */}
                    <div className="p-2 flex flex-col flex-1">
                      <h3 className="font-bold text-[#3E2723] text-sm leading-tight line-clamp-1">{item.name}</h3>
                      <div className="flex items-center gap-2 text-xs text-[#5D4037] font-medium mt-0.5">
                        <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5 text-[#8B5A2B]" />{item.prepTime}</span>
                        <span className="text-[#C8A47A]">•</span>
                        <span className="flex items-center gap-1"><Flame className="w-3.5 h-3.5 text-[#8B5A2B]" />{item.calories} kcal</span>
                      </div>
                      <div className="mt-auto">
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className="text-sm font-black text-[#3E2723]">₹{item.price}</span>
                          {/* Quantity control or Add button */}
                          {qty > 0 ? (
                            <div className="flex items-center bg-[#3E2723] rounded-lg overflow-hidden shadow-sm animate-[scaleIn_0.2s_ease-out]">
                              <button
                                onClick={() => qty <= 1 ? onRemoveItem(item.id) : onUpdateQuantity(item.id, qty - 1)}
                                className="w-7 h-7 flex items-center justify-center text-[#C8A47A] hover:bg-[#5D4037] transition-colors active:scale-90"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <span className="w-5 text-center text-white font-bold text-xs">{qty}</span>
                              <button
                                onClick={() => onUpdateQuantity(item.id, qty + 1)}
                                className="w-7 h-7 flex items-center justify-center text-[#C8A47A] hover:bg-[#5D4037] transition-colors active:scale-90"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => handleQuickAdd(item)}
                              className="w-7 h-7 flex items-center justify-center bg-[#8B5A2B] text-white rounded-lg hover:bg-[#3E2723] transition-all duration-200 active:scale-90 shadow-sm"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            onClick={() => setSelectedItem(item)}
                            className="flex-1 min-w-0 px-1.5 py-1.5 bg-gradient-to-r from-[#8B5A2B] to-[#C8A47A] text-white rounded-lg hover:shadow-md transition-all duration-200 active:scale-95 text-[10px] font-bold uppercase tracking-wider truncate"
                          >
                            Customize
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {filteredItems.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <Search className="w-12 h-12 text-[#E8DED0] mb-4" />
                <p className="text-lg font-bold text-[#3E2723]">No items found</p>
                <p className="text-sm text-[#8B5A2B]/60 mt-1">Try adjusting your filters</p>
                <button
                  onClick={() => { setSelectedCategory('All'); setFilterVeg('all'); setFilterCuisine('all'); setSearchQuery(''); }}
                  className="mt-4 flex items-center gap-2 px-4 py-2 text-sm font-semibold text-[#8B5A2B] bg-[#FAF0E4] rounded-full hover:bg-[#E8D5B5] transition-colors"
                >
                  <RotateCcw className="w-4 h-4" /> Reset Filters
                </button>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* ====== BOTTOM BAR ====== */}
      <div className={`flex-shrink-0 bg-[#3E2723] text-white shadow-[0_-8px_30px_rgba(0,0,0,0.2)] z-30 transition-all duration-500 ${mounted ? 'translate-y-0' : 'translate-y-full'}`}>
        {/* Mini basket preview */}
        {showBasket && cartCount > 0 && (
          <div className="border-b border-white/10 px-4 py-3 max-h-40 overflow-y-auto animate-[slideUp_0.3s_ease-out]">
            {cart.map(ci => (
              <div key={ci.id} className="flex items-center justify-between py-1.5 text-sm">
                <span className="text-white/80 truncate flex-1">{ci.quantity}× {ci.name}</span>
                <span className="text-[#C8A47A] font-bold ml-2">₹{ci.price * ci.quantity}</span>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between px-4 py-3">
          {/* Show Basket toggle */}
          <button
            onClick={() => cartCount > 0 && setShowBasket(!showBasket)}
            className="flex items-center gap-3 group"
          >
            <div className="relative">
              <ShoppingBag className="w-7 h-7 text-[#C8A47A]" />
              {cartCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white text-[10px] font-black rounded-full flex items-center justify-center animate-[bounceIn_0.3s_ease-out]">
                  {cartCount}
                </span>
              )}
            </div>
            <div className="text-left">
              <span className="font-bold text-sm flex items-center gap-1">
                SHOW BASKET {showBasket ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
              </span>
              {cartCount > 0 && <p className="text-[10px] text-white/50">{cartCount} item{cartCount !== 1 ? 's' : ''}</p>}
            </div>
          </button>

          {/* Place Order button */}
          <button
            onClick={onGoToCart}
            disabled={cartCount === 0}
            className={`px-6 py-3 rounded-xl font-black text-sm uppercase tracking-wider transition-all duration-300 active:scale-95 ${
              cartCount > 0
                ? 'bg-[#C8A47A] text-[#2D1B10] hover:bg-[#D4AF37] shadow-lg shadow-[#C8A47A]/30'
                : 'bg-white/10 text-white/30 cursor-not-allowed'
            }`}
          >
            PLACE ORDER {cartCount > 0 && <span className="ml-1">₹{cartTotal}</span>}
          </button>
        </div>

        {/* Restart */}
        <div className="px-4 pb-2">
          <button
            onClick={() => {
              setSelectedCategory('All');
              setFilterVeg('all');
              setFilterCuisine('all');
              setSearchQuery('');
            }}
            className="text-[#C8A47A]/60 text-xs font-semibold flex items-center gap-1 hover:text-[#C8A47A] transition-colors"
          >
            <RotateCcw className="w-3 h-3" /> RESTART
          </button>
        </div>
      </div>

      {/* ====== CUSTOMIZATION MODAL ====== */}
      {selectedItem && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-[fadeIn_0.2s_ease-out]">
          <div className="bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl max-h-[90vh] overflow-y-auto animate-[slideUp_0.3s_ease-out]">
            {/* Item Image */}
            <div className="relative h-48 sm:h-56 overflow-hidden sm:rounded-t-2xl">
              <MenuItemImage
                src={selectedItem.image}
                alt={selectedItem.name}
                className="w-full h-full object-cover"
              />
              <button
                onClick={() => setSelectedItem(null)}
                className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm rounded-full p-2 hover:bg-white transition-colors"
              >
                <X className="w-5 h-5 text-[#3E2723]" />
              </button>
              <div className={`absolute bottom-3 left-3 w-5 h-5 rounded-sm border-2 flex items-center justify-center bg-white ${selectedItem.isVeg ? 'border-green-600' : 'border-red-600'}`}>
                <div className={`w-2.5 h-2.5 rounded-full ${selectedItem.isVeg ? 'bg-green-600' : 'bg-red-600'}`} />
              </div>
            </div>

            <div className="p-5">
              <div className="flex items-start justify-between mb-2">
                <h2 className="text-xl font-bold text-[#3E2723]" style={{ fontFamily: "'Playfair Display', serif" }}>
                  {selectedItem.name}
                </h2>
                <span className="text-lg font-bold text-[#8B5A2B]">₹{selectedItem.price}</span>
              </div>
              <p className="text-sm text-gray-500 mb-4">{selectedItem.description}</p>
              <div className="flex items-center gap-4 text-xs text-gray-400 mb-5">
                <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{selectedItem.prepTime}</span>
                <span>{selectedItem.calories} kcal</span>
              </div>

              {/* Spice Level */}
              <div className="mb-4">
                <p className="text-sm font-semibold text-[#3E2723] mb-2">Spice Level</p>
                <div className="flex gap-2">
                  {['mild', 'medium', 'spicy', 'extra-spicy'].map((level) => (
                    <button
                      key={level}
                      onClick={() => setCustomization((p) => ({ ...p, spiceLevel: level }))}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold capitalize border transition-all ${
                        customization.spiceLevel === level
                          ? 'bg-[#8B5A2B] text-white border-[#8B5A2B]'
                          : 'bg-white text-[#5D4037] border-[#E8D5B5] hover:bg-[#FAF0E4]'
                      }`}
                    >
                      {level.replace('-', ' ')}
                    </button>
                  ))}
                </div>
              </div>

              {/* Add-ons */}
              <div className="mb-4">
                <p className="text-sm font-semibold text-[#3E2723] mb-2">Add-ons</p>
                <div className="space-y-2">
                  {addons.map((addon) => (
                    <label key={addon.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-[#FAF0E4] cursor-pointer transition-colors">
                      <input
                        type="checkbox"
                        checked={customization.addons.includes(addon.name)}
                        onChange={() => {
                          setCustomization((p) => ({
                            ...p,
                            addons: p.addons.includes(addon.name)
                              ? p.addons.filter((a) => a !== addon.name)
                              : [...p.addons, addon.name],
                          }));
                        }}
                        className="w-4 h-4 rounded border-[#E8D5B5] text-[#8B5A2B] focus:ring-[#C8A47A]"
                      />
                      <span className="text-sm text-[#3E2723] flex-1">{addon.name}</span>
                      <span className="text-xs text-[#8B5A2B] font-semibold">+₹{addon.price}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Special Instructions */}
              <div className="mb-5">
                <p className="text-sm font-semibold text-[#3E2723] mb-2">Special Instructions</p>
                <textarea
                  value={customization.specialInstructions}
                  onChange={(e) => setCustomization((p) => ({ ...p, specialInstructions: e.target.value }))}
                  placeholder="Any special requests? (optional)"
                  rows={2}
                  className="w-full px-3 py-2 border border-[#E8D5B5] rounded-lg text-sm text-[#3E2723] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#C8A47A] resize-none"
                />
              </div>

              {/* Quantity & Add */}
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-3 bg-[#FAF0E4] rounded-xl px-3 py-2">
                  <button
                    onClick={() => setCustomization((p) => ({ ...p, quantity: Math.max(1, p.quantity - 1) }))}
                    className="w-8 h-8 flex items-center justify-center rounded-lg bg-white text-[#8B5A2B] font-bold hover:bg-[#E8D5B5] transition-colors"
                  >
                    -
                  </button>
                  <span className="w-8 text-center font-bold text-[#3E2723]">{customization.quantity}</span>
                  <button
                    onClick={() => setCustomization((p) => ({ ...p, quantity: p.quantity + 1 }))}
                    className="w-8 h-8 flex items-center justify-center rounded-lg bg-white text-[#8B5A2B] font-bold hover:bg-[#E8D5B5] transition-colors"
                  >
                    +
                  </button>
                </div>
                <button
                  onClick={handleAddToCart}
                  className="flex-1 py-3 bg-[#3E2723] text-white rounded-xl font-bold text-sm hover:bg-[#5D4037] transition-all active:scale-95 shadow-lg"
                >
                  Add to Cart — ₹{selectedItem.price * customization.quantity}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ====== KEYFRAME STYLES ====== */}
      <style>{`
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(40px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes scaleIn {
          from { transform: scale(0.8); opacity: 0; }
          to   { transform: scale(1); opacity: 1; }
        }
        @keyframes bounceIn {
          0%   { transform: scale(0); }
          60%  { transform: scale(1.2); }
          100% { transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
