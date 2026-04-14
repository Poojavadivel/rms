import { ArrowRight, Star, Clock, MapPin, ChefHat, Sparkles, Users, UtensilsCrossed, CalendarCheck, ShoppingBag, Loader2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { Module } from "@/client/app/App";
import type { MenuItem } from "@/client/app/data/menuData";
import { menuData } from "@/client/app/data/menuData";
import { fetchMenuItems } from "@/client/api/menu";
import { ImageWithFallback } from "@/client/app/components/figma/ImageWithFallback";
import { MenuItemImage } from "@/client/app/components/MenuItemImage";
import { useSystemConfig } from "@/client/context/SystemConfigContext";
import heroImage from '@/client/assets/8fa912dede0bd681dd44e46c538c6cbb3492342b.png';
import quoteBgImage from '@/client/assets/11b317025b5248eac9baeb9967cf61a1383601ed.png';
import aboutBgImage from '@/client/assets/451f83ee2533052ab60bf543996c6b8187cd16b6.png';
import { apiRequest } from '@/client/api/client';

interface RestaurantStats {
  totalDishes: number;
  happyCustomers: number;
  tablesAvailable: number;
  ordersToday: number;
}

interface HomeProps {
  isLoggedIn: boolean;
  onNavigate: (module: Module) => void;
}

export default function Home({
  isLoggedIn,
  onNavigate,
}: HomeProps) {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [stats, setStats] = useState<RestaurantStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const { config: sysConfig } = useSystemConfig();;

  useEffect(() => {
    let cancelled = false;
    apiRequest<RestaurantStats>('/stats')
      .then((data) => { if (!cancelled) setStats(data); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setStatsLoading(false); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetchMenuItems()
      .then((items) => {
        if (!cancelled) setMenuItems(items);
      })
      .catch(() => {
        if (!cancelled) setMenuItems(menuData);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const popularItems = useMemo(() => {
    return menuItems.filter((item) => item.popular).slice(0, 6);
  }, [menuItems]);

  // Customer reviews data
  const reviews = [
    {
      id: 1,
      name: "Priya Sharma",
      rating: 5,
      comment: "The best Indian restaurant I've been to! The Dal Makhani is absolutely divine.",
      avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop"
    },
    {
      id: 2,
      name: "Rahul Patel",
      rating: 5,
      comment: "Exceptional service and authentic flavors. The Butter Chicken is a must-try!",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop"
    },
    {
      id: 3,
      name: "Anjali Reddy",
      rating: 5,
      comment: "Love the ambiance and the food quality. Their biryani is outstanding!",
      avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop"
    }
  ];

  return (
    <div className="min-h-screen bg-[#FAF7F2]">
      {/* SECTION 1 G�� HERO HEADER */}
      <section className="relative w-full min-h-[85vh] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0">
          <ImageWithFallback
            src={heroImage}
            alt="Royal Cuisine Indian Food"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/60 to-black/50"></div>
        </div>
        
        <div className="relative z-10 max-w-5xl mx-auto text-center px-6">
          <h1 
            className="text-3xl sm:text-5xl md:text-7xl font-bold mb-4 sm:mb-6 text-white drop-shadow-2xl leading-tight" 
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            RMS by Movi Cloud Labs
          </h1>
          <p className="text-base sm:text-xl md:text-2xl text-white/90 font-light mb-8 sm:mb-12 max-w-3xl mx-auto leading-relaxed italic">
            "Home of taste where food is prepared with care, quality ingredients, and attention to taste."
          </p>
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <button
              onClick={() => onNavigate(isLoggedIn ? "menu" : "login")}
              className="px-6 sm:px-12 py-3 sm:py-5 bg-gradient-to-r from-[#8B5A2B] to-[#C8A47A] text-white rounded-2xl hover:shadow-[0_15px_30px_-10px_rgba(200,164,122,0.6)] transition-all duration-300 text-sm sm:text-lg font-black uppercase tracking-[0.15em] inline-flex items-center gap-3 active:scale-95"
            >
              {isLoggedIn ? "Explore Menu" : "Get Started"}
              <ArrowRight className="w-6 h-6" />
            </button>
            <a
              href="/kiosk"
              className="px-6 sm:px-12 py-3 sm:py-5 bg-white/10 backdrop-blur-sm border-2 border-[#C8A47A] text-white rounded-2xl hover:bg-white/20 hover:shadow-[0_15px_30px_-10px_rgba(200,164,122,0.4)] transition-all duration-300 text-sm sm:text-lg font-black uppercase tracking-[0.15em] inline-flex items-center gap-3 active:scale-95"
            >
              <ShoppingBag className="w-6 h-6" />
              Order with Kiosk
            </a>
          </div>
        </div>
      </section>

      {/* SECTION 2 G�� ABOUT US / SUBHEADER */}
      <section className="relative w-full py-16 sm:py-32 overflow-hidden">
        <div className="absolute inset-0">
          <ImageWithFallback
            src={aboutBgImage}
            alt="Royal Cuisine Dining Experience"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#2D1B10]/95 via-[#2D1B10]/80 to-[#2D1B10]/40"></div>
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16 items-center">
            <div className="hidden lg:block"></div>

            <div>
              <div className="inline-block mb-4 sm:mb-6 px-5 py-2 bg-[#C8A47A]/20 backdrop-blur-sm rounded-full border border-[#C8A47A]/30">
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[#C8A47A]">About Royal Cuisine</span>
              </div>
              <h2
                className="text-3xl sm:text-5xl md:text-6xl font-bold text-white mb-4 sm:mb-8 leading-tight"
                style={{ fontFamily: "'Playfair Display', serif" }}
              >
                Seamless Dining Experience
              </h2>
              <p className="text-xl text-white/90 leading-relaxed font-light mb-6">
                We provide a seamless restaurant experience with easy ordering and flexible customization based on user preferences.
              </p>
              <p className="text-xl text-white/80 leading-relaxed font-light">
                Our system is designed to deliver quality service while keeping the dining process simple and efficient.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION: QUOTE HIGHLIGHT */}
      <section className="relative w-full py-16 sm:py-32 overflow-hidden">
        <div className="absolute inset-0">
          <ImageWithFallback
            src={quoteBgImage}
            alt="Inspirational Food Quote"
            className="w-full h-full object-cover blur-[1px]"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#2D1B10]/95 to-[#2D1B10]/75"></div>
        </div>

        <div className="relative z-10 max-w-4xl mx-auto text-center px-6">
          <p
            className="text-2xl sm:text-4xl md:text-6xl text-white mb-6 sm:mb-10 leading-tight"
            style={{ fontFamily: "'Great Vibes', cursive" }}
          >
            Destroy the world if even a single person does not have food.
          </p>
          <p
            className="text-[#C8A47A] text-sm font-bold uppercase tracking-[0.4em] inline-block border-t border-[#C8A47A]/30 pt-4"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            Bharathiyar
          </p>
        </div>
      </section>

      {/* SECTION 3 G�� FEATURES / WHAT WE DO */}
      <section className="py-12 sm:py-24 px-4 sm:px-6 bg-[#FAF7F2]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-block mb-6 p-1 bg-[#C8A47A] rounded-full px-4">
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[#3E2723]">What We Offer</span>
            </div>
            <h2
              className="text-3xl sm:text-5xl md:text-6xl font-bold text-[#3E2723] mb-4"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              Our Specialties
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            <div className="group relative bg-[#2D1B10] rounded-[24px] overflow-hidden border border-[#C8A47A]/30 shadow-2xl hover:shadow-[#C8A47A]/20 transition-all duration-500 hover:-translate-y-2">
              <div className="absolute inset-0 bg-gradient-to-b from-[#3E2723] to-[#2D1B10] opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

              <div className="relative z-10 p-6 sm:p-10 text-center">
                <div className="w-16 h-16 sm:w-24 sm:h-24 mx-auto mb-5 sm:mb-8 bg-gradient-to-br from-[#C8A47A] to-[#8B5A2B] rounded-full flex items-center justify-center shadow-xl">
                  <Sparkles className="w-8 h-8 sm:w-12 sm:h-12 text-[#FAF7F2]" strokeWidth={1.5} />
                </div>
                <h3
                  className="text-xl sm:text-3xl font-bold text-[#FAF7F2] mb-3 sm:mb-4 group-hover:text-[#C8A47A] transition-colors"
                  style={{ fontFamily: "'Playfair Display', serif" }}
                >
                  Quality Ingredients
                </h3>
                <p className="text-[#EADBC8]/70 text-sm sm:text-lg leading-relaxed font-light">
                  We source only the finest and freshest ingredients to ensure every dish is a masterpiece of flavor and quality.
                </p>
              </div>
            </div>

            <div className="group relative bg-[#2D1B10] rounded-[24px] overflow-hidden border border-[#C8A47A]/30 shadow-2xl hover:shadow-[#C8A47A]/20 transition-all duration-500 hover:-translate-y-2">
              <div className="absolute inset-0 bg-gradient-to-b from-[#3E2723] to-[#2D1B10] opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

              <div className="relative z-10 p-6 sm:p-10 text-center">
                <div className="w-16 h-16 sm:w-24 sm:h-24 mx-auto mb-5 sm:mb-8 bg-gradient-to-br from-[#C8A47A] to-[#8B5A2B] rounded-full flex items-center justify-center shadow-xl">
                  <Clock className="w-8 h-8 sm:w-12 sm:h-12 text-[#FAF7F2]" strokeWidth={1.5} />
                </div>
                <h3
                  className="text-xl sm:text-3xl font-bold text-[#FAF7F2] mb-3 sm:mb-4 group-hover:text-[#C8A47A] transition-colors"
                  style={{ fontFamily: "'Playfair Display', serif" }}
                >
                  Fast Service
                </h3>
                <p className="text-[#EADBC8]/70 text-sm sm:text-lg leading-relaxed font-light">
                  Swift and efficient service that respects your time without ever compromising on the quality of your meal.
                </p>
              </div>
            </div>

            <div className="group relative bg-[#2D1B10] rounded-[24px] overflow-hidden border border-[#C8A47A]/30 shadow-2xl hover:shadow-[#C8A47A]/20 transition-all duration-500 hover:-translate-y-2">
              <div className="absolute inset-0 bg-gradient-to-b from-[#3E2723] to-[#2D1B10] opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

              <div className="relative z-10 p-6 sm:p-10 text-center">
                <div className="w-16 h-16 sm:w-24 sm:h-24 mx-auto mb-5 sm:mb-8 bg-gradient-to-br from-[#C8A47A] to-[#8B5A2B] rounded-full flex items-center justify-center shadow-xl">
                  <MapPin className="w-8 h-8 sm:w-12 sm:h-12 text-[#FAF7F2]" strokeWidth={1.5} />
                </div>
                <h3
                  className="text-xl sm:text-3xl font-bold text-[#FAF7F2] mb-3 sm:mb-4 group-hover:text-[#C8A47A] transition-colors"
                  style={{ fontFamily: "'Playfair Display', serif" }}
                >
                  Prime Location
                </h3>
                <p className="text-[#EADBC8]/70 text-sm sm:text-lg leading-relaxed font-light">
                  Strategically located for your convenience, offering both premium dine-in and efficient takeaway services.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 4 G�� POPULAR DISHES (Exact Menu Card Reuse) */}
      <section className="py-12 sm:py-24 px-4 sm:px-6 bg-[#F5F0E8]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-block mb-6 p-1 bg-[#C8A47A] rounded-full px-4">
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[#3E2723]">Customer Favorites</span>
            </div>
            <h2
              className="text-3xl sm:text-5xl md:text-6xl font-bold text-[#3E2723] mb-4"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              Popular Dishes
            </h2>
            <p className="text-xl text-[#6D4C41] font-light">
              Discover the dishes our guests can't stop talking about
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10">
            {popularItems.map((item) => (
              <div
                key={item.id}
                className="group relative bg-[#2D1B10] rounded-[24px] overflow-hidden border border-[#C8A47A]/30 shadow-2xl hover:shadow-[#C8A47A]/20 transition-all duration-500 flex flex-col hover:-translate-y-2"
              >
                <div className="absolute inset-0 bg-gradient-to-b from-[#3E2723] to-[#2D1B10] opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

                <div className="relative h-60 bg-[#1A110D] overflow-hidden">
                  <MenuItemImage
                    src={item.image}
                    alt={item.name}
                    className="w-full h-full object-cover group-hover:scale-110 group-hover:rotate-1 transition-transform duration-700 ease-out"
                  />

                  <div className="absolute top-5 left-5 z-10">
                    <span
                      className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] shadow-lg ${
                        item.isVeg
                          ? 'bg-green-600/90 text-white backdrop-blur-md'
                          : 'bg-red-600/90 text-white backdrop-blur-md'
                      }`}
                    >
                      {item.isVeg ? 'Vegetarian' : 'Non-Veg'}
                    </span>
                  </div>

                  <div className="absolute top-5 right-5 z-10 flex flex-col gap-2">
                    {item.todaysSpecial && (
                      <span className="bg-[#C8A47A] text-[#2D1B10] px-4 py-1.5 rounded-full text-[10px] font-black shadow-xl flex items-center gap-2 uppercase tracking-widest animate-pulse">
                        <Sparkles className="w-3 h-3" />
                        Today's Special
                      </span>
                    )}
                  </div>
                </div>

                <div className="relative z-10 p-8 flex flex-col flex-grow">
                  <div className="mb-3">
                    <h3 className="font-bold text-2xl text-[#FAF7F2] group-hover:text-[#C8A47A] transition-colors duration-300" style={{ fontFamily: "'Playfair Display', serif" }}>
                      {item.name}
                    </h3>
                  </div>
                  <p className="text-sm text-[#EADBC8]/70 mb-6 line-clamp-2 leading-relaxed font-light">
                    {item.description}
                  </p>

                  <div className="mt-auto flex items-center justify-between border-t border-[#C8A47A]/20 pt-6">
                    <div className="flex flex-col">
                      <span className="text-[10px] text-[#C8A47A] uppercase tracking-[0.2em] font-black mb-1">Price</span>
                      <span className="text-3xl font-black text-[#FAF7F2]">₹{item.price}</span>
                    </div>

                    {!isLoggedIn && (
                      <button
                        onClick={() => onNavigate('login')}
                        className="px-6 py-3 bg-[#3E2723] text-[#C8A47A] border border-[#C8A47A]/50 rounded-xl text-xs font-black uppercase tracking-[0.2em] hover:bg-[#C8A47A] hover:text-[#2D1B10] transition-all duration-300 active:scale-95 shadow-xl"
                      >
                        Login
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* SECTION 5 G�� CUSTOMER REVIEWS */}
      <section className="py-12 sm:py-24 px-4 sm:px-6 bg-[#FAF7F2]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-10 sm:mb-16">
            <div className="inline-block mb-4 sm:mb-6 p-1 bg-[#C8A47A] rounded-full px-4">
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[#3E2723]">Testimonials</span>
            </div>
            <h2
              className="text-3xl sm:text-5xl md:text-6xl font-bold text-[#3E2723] mb-4"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              What Our Guests Say
            </h2>
            <p className="text-base sm:text-xl text-[#6D4C41] font-light">
              Real experiences from our valued customers
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            {reviews.map((review) => (
              <div
                key={review.id}
                className="group relative bg-[#2D1B10] rounded-[24px] overflow-hidden border border-[#C8A47A]/30 shadow-2xl hover:shadow-[#C8A47A]/20 transition-all duration-500 hover:-translate-y-2"
              >
                <div className="absolute inset-0 bg-gradient-to-b from-[#3E2723] to-[#2D1B10] opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

                <div className="relative z-10 p-10">
                  <div className="flex items-center mb-6">
                    <div className="w-16 h-16 rounded-full overflow-hidden bg-[#C8A47A] mr-4 border-4 border-[#C8A47A]/30">
                      <ImageWithFallback
                        src={review.avatar}
                        alt={review.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div>
                      <h4 className="text-xl font-bold text-[#FAF7F2]" style={{ fontFamily: "'Playfair Display', serif" }}>
                        {review.name}
                      </h4>
                      <div className="flex gap-1 mt-1">
                        {[...Array(review.rating)].map((_, i) => (
                          <Star key={i} className="w-4 h-4 fill-[#C8A47A] text-[#C8A47A]" />
                        ))}
                      </div>
                    </div>
                  </div>
                  <p className="text-[#EADBC8]/80 text-base leading-relaxed font-light italic">
                    "{review.comment}"
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION: LIVE RESTAURANT STATS */}
      <section className="py-12 sm:py-24 px-4 sm:px-6 bg-[#F5F0E8]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-10 sm:mb-16">
            <div className="inline-block mb-4 sm:mb-6 p-1 bg-[#C8A47A] rounded-full px-4">
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[#3E2723]">By The Numbers</span>
            </div>
            <h2
              className="text-3xl sm:text-4xl md:text-5xl font-bold text-[#3E2723] mb-4"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              Our Restaurant Today
            </h2>
            <p className="text-lg text-[#6D4C41] font-light max-w-2xl mx-auto">
              Real-time numbers straight from our kitchen
            </p>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                icon: UtensilsCrossed,
                label: 'Dishes on Menu',
                value: stats?.totalDishes,
                suffix: '+',
                color: '#8B5A2B',
                bg: 'from-amber-50 to-amber-100/50',
                border: '#C8A47A',
              },
              {
                icon: Users,
                label: 'Happy Customers',
                value: stats?.happyCustomers,
                suffix: '+',
                color: '#6D4C41',
                bg: 'from-orange-50 to-orange-100/50',
                border: '#D4956A',
              },
              {
                icon: CalendarCheck,
                label: 'Tables Available',
                value: stats?.tablesAvailable,
                suffix: '',
                color: '#3E7A4A',
                bg: 'from-green-50 to-green-100/50',
                border: '#7ABF8E',
              },
              {
                icon: ShoppingBag,
                label: 'Orders Today',
                value: stats?.ordersToday,
                suffix: '',
                color: '#1A5276',
                bg: 'from-blue-50 to-blue-100/50',
                border: '#7EB0D4',
              },
            ].map((stat) => (
              <div
                key={stat.label}
                className="group relative bg-white rounded-[24px] overflow-hidden border-2 shadow-lg hover:shadow-2xl hover:-translate-y-2 transition-all duration-500"
                style={{ borderColor: stat.border }}
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${stat.bg} opacity-50 group-hover:opacity-70 transition-opacity duration-500`} />
                <div className="relative z-10 p-4 sm:p-8 flex flex-col items-center text-center">
                  <div
                    className="w-12 h-12 sm:w-16 sm:h-16 mb-4 sm:mb-5 rounded-2xl flex items-center justify-center shadow-md group-hover:scale-110 transition-transform duration-500"
                    style={{ backgroundColor: `${stat.color}18` }}
                  >
                    <stat.icon className="w-6 h-6 sm:w-8 sm:h-8" style={{ color: stat.color }} />
                  </div>
                  <div
                    className="text-2xl sm:text-4xl font-black mb-2 tabular-nums"
                    style={{ color: stat.color, fontFamily: "'Playfair Display', serif" }}
                  >
                    {statsLoading ? (
                      <Loader2 className="w-8 h-8 animate-spin mx-auto" style={{ color: stat.color }} />
                    ) : (
                      <>{stat.value ?? 'G��'}{stat.value !== undefined && stat.suffix}</>
                    )}
                  </div>
                  <p className="text-[#6D4C41] text-sm font-medium">{stat.label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 6 G�� FOOTER */}
      <footer className="bg-[#2D1B10] text-[#FAF7F2] py-10 sm:py-16 px-4 sm:px-6 border-t border-[#C8A47A]/20">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 sm:gap-12 mb-8 sm:mb-12">
            {/* Brand */}
            <div>
              <h3 
                className="text-3xl font-bold mb-4 text-[#C8A47A]" 
                style={{ fontFamily: "'Playfair Display', serif" }}
              >
                {sysConfig.restaurantName || 'Royal Cuisine'}
              </h3>
              <p className="text-[#EADBC8]/70 font-light leading-relaxed">
                Experience authentic cuisine with royal hospitality and premium service.
              </p>
            </div>

            {/* Contact */}
            <div>
              <h4 className="text-xl font-bold mb-4 text-[#C8A47A]" style={{ fontFamily: "'Playfair Display', serif" }}>
                Contact
              </h4>
              <ul className="space-y-3 text-[#EADBC8]/70 font-light">
                {sysConfig.contactNumber && <li>Phone: {sysConfig.contactNumber}</li>}
                {sysConfig.email && <li>Email: {sysConfig.email}</li>}
                {sysConfig.operatingHours && <li>Hours: {sysConfig.operatingHours}</li>}
              </ul>
            </div>

            {/* Address */}
            <div>
              <h4 className="text-xl font-bold mb-4 text-[#C8A47A]" style={{ fontFamily: "'Playfair Display', serif" }}>
                Address
              </h4>
              <p className="text-[#EADBC8]/70 font-light leading-relaxed">
                {sysConfig.address ? (
                  <>
                    {sysConfig.address}{sysConfig.city || sysConfig.state ? ',' : ''}<br />
                    {[sysConfig.city, sysConfig.state, sysConfig.pincode].filter(Boolean).join(', ')}
                  </>
                ) : (
                  'Address not configured'
                )}
              </p>
            </div>

            {/* Quick Links */}
            <div>
              <h4 className="text-xl font-bold mb-4 text-[#C8A47A]" style={{ fontFamily: "'Playfair Display', serif" }}>
                Quick Links
              </h4>
              <ul className="space-y-3">
                <li>
                  <button 
                    onClick={() => onNavigate('menu')}
                    className="text-[#EADBC8]/70 hover:text-[#C8A47A] transition-colors font-light"
                  >
                    Menu
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => onNavigate('reservation')}
                    className="text-[#EADBC8]/70 hover:text-[#C8A47A] transition-colors font-light"
                  >
                    Reservations
                  </button>
                </li>
                <li>
                  <a href="#" className="text-[#EADBC8]/70 hover:text-[#C8A47A] transition-colors font-light">
                    Terms & Conditions
                  </a>
                </li>
                <li>
                  <a href="#" className="text-[#EADBC8]/70 hover:text-[#C8A47A] transition-colors font-light">
                    Privacy Policy
                  </a>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="pt-8 border-t border-[#C8A47A]/20 text-center">
            <p className="text-[#EADBC8]/60 text-sm font-light">
              &copy; {new Date().getFullYear()} {sysConfig.restaurantName || 'Restaurant'}. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
