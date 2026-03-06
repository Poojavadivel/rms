import { useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { Badge } from '@/admin/components/ui/badge';
import { cn } from '@/admin/components/ui/utils';
import { useAuth } from '@/admin/utils/auth-context';
import { LoadingKitchen } from '@/admin/components/ui/loading-spinner';
import {
  ChefHat,
  Flame,
  UtensilsCrossed,
  Soup,
  Coffee,
  Salad,
  Crown,
} from 'lucide-react';
import { toast } from 'sonner';
import { API_BASE_URL } from '@/admin/utils/api';

export type KitchenTerminalStation =
  | 'FRY'
  | 'CURRY'
  | 'RICE'
  | 'PREP'
  | 'GRILL'
  | 'DESSERT'
  | 'HEAD_CHEF';

interface StationCard {
  id: KitchenTerminalStation;
  name: string;
  icon: ReactNode;
  color: string;
  description: string;
  isHeadChef?: boolean;
}

interface ChefRecord {
  _id: string;
  name: string;
  kitchenStation?: string;
  shift?: string;
}

export const TERMINAL_STATIONS: StationCard[] = [
  { id: 'FRY', name: 'Fry Station', icon: <Flame className="h-10 w-10" />, color: '#FF6B35', description: 'Deep-fry, saute, tempura' },
  { id: 'CURRY', name: 'Curry Station', icon: <Soup className="h-10 w-10" />, color: '#D4A574', description: 'Gravies, curries, sauces' },
  { id: 'RICE', name: 'Rice Station', icon: <UtensilsCrossed className="h-10 w-10" />, color: '#8B7355', description: 'Biryani, pulao, fried rice' },
  { id: 'PREP', name: 'Prep Station', icon: <Salad className="h-10 w-10" />, color: '#4CAF50', description: 'Salads, cold items, plating' },
  { id: 'GRILL', name: 'Grill Station', icon: <ChefHat className="h-10 w-10" />, color: '#E63946', description: 'Tandoor, BBQ, grills' },
  { id: 'DESSERT', name: 'Dessert Station', icon: <Coffee className="h-10 w-10" />, color: '#F4A261', description: 'Sweets, beverages, desserts' },
  { id: 'HEAD_CHEF', name: 'Head Chef', icon: <Crown className="h-10 w-10" />, color: '#8B5A2B', description: 'Global oversight across all stations', isHeadChef: true },
];

interface KDSTerminalLoginProps {
  onLogin: (station: KitchenTerminalStation) => void;
}

export function KDSTerminalLogin({ onLogin }: KDSTerminalLoginProps) {
  const { user } = useAuth();
  const [chefs, setChefs] = useState<ChefRecord[]>([]);
  const [loadingChefs, setLoadingChefs] = useState(true);

  useEffect(() => {
    const fetchChefs = async () => {
      try {
        const resp = await fetch(`${API_BASE_URL}/staff/chefs`);
        if (resp.ok) {
          const data = await resp.json();
          setChefs(data);
        }
      } catch {
        // Silently fail � all stations stay visible
      } finally {
        setLoadingChefs(false);
      }
    };
    fetchChefs();
  }, []);

  const getChefsForStation = (stationId: string): ChefRecord[] =>
    chefs.filter((c) => (c.kitchenStation || '').toUpperCase() === stationId.toUpperCase());

  const isPrivileged = user?.role === 'admin' || user?.role === 'manager';
  const visibleStations = TERMINAL_STATIONS.filter((station) => {
    if (isPrivileged) return true; // Admin/manager sees all stations
    if (station.isHeadChef) return true;
    if (loadingChefs) return true;
    return chefs.some((c) => c.kitchenStation === station.id);
  });

  const handleEnterStation = (station: StationCard) => {
    const assignedChefs = getChefsForStation(station.id);
    const chefLabel = assignedChefs.length > 0 ? assignedChefs.map((c) => c.name).join(', ') : station.name;
    toast.success(`Entered ${station.name}`, {
      description: `Welcome${assignedChefs.length > 0 ? `, ${chefLabel}` : ''}! Your terminal is ready.`,
    });
    onLogin(station.id);
  };

  return (
    <div className="bg-kitchen-display-module min-h-screen flex items-center justify-center p-8 max-w-full overflow-x-hidden">
      <div className="w-full max-w-5xl">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center p-4 bg-[#8B5A2B] rounded-2xl mb-4 shadow-2xl">
            <ChefHat className="h-14 w-14 text-white" />
          </div>
          <h1 className="text-4xl font-bold mb-2" style={{ color: '#F5E6D3' }}>
            Kitchen Display System
          </h1>
          <p className="text-lg text-white/70">Tap the station to enter</p>
        </div>

        {loadingChefs ? (
          <LoadingKitchen />
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
            {visibleStations.map((station) => {
              const assignedChefs = getChefsForStation(station.id);
              return (
                <button
                  key={station.id}
                  onClick={() => handleEnterStation(station)}
                  className={cn(
                    'group relative flex flex-col items-center justify-center gap-3 p-6 rounded-2xl border-2 border-white/10',
                    'bg-white/10 backdrop-blur-sm hover:bg-white/20 hover:border-white/30',
                    'transition-all duration-200 hover:scale-[1.03] hover:shadow-2xl active:scale-[0.98]',
                    'text-white cursor-pointer'
                  )}
                >
                  <div
                    className="p-4 rounded-xl flex items-center justify-center shadow-lg transition-transform duration-200 group-hover:scale-110"
                    style={{ backgroundColor: station.color }}
                  >
                    {station.icon}
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1.5 mb-0.5">
                      <h3 className="font-bold text-base leading-tight">{station.name}</h3>
                      {station.isHeadChef && (
                        <Badge className="bg-amber-500 text-white text-[10px] px-1.5 py-0">SENIOR</Badge>
                      )}
                    </div>
                    <p className="text-xs text-white/60">{station.description}</p>
                  </div>
                  {assignedChefs.length > 0 && (
                    <p className="text-xs text-emerald-300 font-medium text-center leading-snug">
                      ????? {assignedChefs.map((c) => c.name).join(', ')}
                    </p>
                  )}
                  <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <span className="text-white font-semibold text-sm tracking-wide">Tap to Enter</span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
