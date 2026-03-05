import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { Button } from "@/admin/components/ui/button";
import { Card, CardContent, CardHeader } from "@/admin/components/ui/card";
import { Badge } from "@/admin/components/ui/badge";
import { cn } from "@/admin/components/ui/utils";
import { LoadingKitchen } from "@/admin/components/ui/loading-spinner";
import {
  Clock,
  CheckCircle2,
  AlertCircle,
  ChefHat,
  Users,
  Flame,
  Play,
  Check,
  X,
  ArrowRight,
  Timer,
  Search,
  Utensils,
  ShoppingBag,
  LayoutGrid,
  Map as MapIcon,
  Layers,
  BarChart3,
  AlertTriangle,
  Delete,
  Hash,
  Target,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";
import { ordersApi, menuApi } from "@/admin/utils/api";

type OrderStatus = "NEW" | "COOKING" | "READY" | "DELIVERED";
type OrderType = "DINE_IN" | "PARCEL";
type StationType = "FRY" | "CURRY" | "RICE" | "PREP" | "GRILL" | "DESSERT" | "HEAD_CHEF";
type ViewMode = "ORDERS" | "BATCH" | "STATS";

interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  station: StationType;
  status: "PENDING" | "PREPARING" | "COMPLETED";
  specialInstructions?: string;
  preparationTime: number;
  startedAt?: Date;
}

interface KitchenOrder {
  id: string;
  orderNumber: string;
  tableNumber: string;
  orderType: OrderType;
  guestCount: number;
  items: OrderItem[];
  status: OrderStatus;
  priority: "normal" | "high" | "urgent";
  createdAt: Date;
  totalPrepTime: number;
}

interface KDSProductionQueueProps {
  station: StationType;
  onLogout: () => void;
}

// Map menu category to a KDS station (used as primary routing when category is available)
const CATEGORY_TO_STATION: Record<string, StationType> = {
  // Fried / starter items
  'starters': 'FRY',
  'appetizers': 'FRY',
  'snacks': 'FRY',
  // Main course — default CURRY (gravies, sabzis)
  'main-course': 'CURRY',
  'main course': 'CURRY',
  'curries': 'CURRY',
  'gravies': 'CURRY',
  'soups': 'CURRY',
  // Breads — tandoor / grill station
  'breads': 'GRILL',
  'bread': 'GRILL',
  'rotis': 'GRILL',
  'tandoor': 'GRILL',
  // Rice dishes
  'rice': 'RICE',
  'biryani': 'RICE',
  'pulao': 'RICE',
  // Desserts & beverages
  'desserts': 'DESSERT',
  'dessert': 'DESSERT',
  'sweets': 'DESSERT',
  'beverages': 'DESSERT',
  'drinks': 'DESSERT',
  // Cold / prep items
  'salads': 'PREP',
  'sides': 'PREP',
  'accompaniments': 'PREP',
  'condiments': 'PREP',
  'raita': 'PREP',
};

// Get station for an item — priority: explicit cookingStation > category mapping > name patterns
const getItemStation = (itemName: string, itemCategory?: string, itemCookingStation?: string): StationType => {
  // 0) Highest priority: explicit cookingStation set on the menu item
  if (itemCookingStation) {
    const station = itemCookingStation.toUpperCase().trim() as StationType;
    if (['FRY', 'CURRY', 'RICE', 'PREP', 'GRILL', 'DESSERT'].includes(station)) {
      return station;
    }
  }

  // 1) Try category-based routing (set by admin in menu)
  if (itemCategory) {
    const catKey = itemCategory.toLowerCase().trim();
    const catStation = CATEGORY_TO_STATION[catKey];
    if (catStation) {
      // For main-course, refine with name patterns since it's a broad category
      if (catStation === 'CURRY') {
        const name = (itemName || '').toLowerCase();
        // Rice dishes inside main-course
        if (name.includes('rice') || name.includes('biryani') || name.includes('pulao') ||
            name.includes('khichdi') || name.includes('jeera rice')) return 'RICE';
        // Fried items inside main-course
        if (name.includes('fry') || name.includes('fried') || name.includes('65') ||
            name.includes('manchurian') || name.includes('crispy')) return 'FRY';
        // Grilled / tandoor items inside main-course
        if (name.includes('tikka') || name.includes('tandoor') || name.includes('kebab') ||
            name.includes('grill') || name.includes('seekh')) return 'GRILL';
      }
      return catStation;
    }
  }

  // 2) Fallback: name-pattern matching for orders without category data
  if (!itemName) return 'CURRY';
  const name = itemName.toLowerCase();
  
  // FRY Station - fried items, dosa, samosa, pakora, vada
  if (name.includes('fry') || name.includes('fries') || name.includes('fried') ||
      name.includes('dosa') || name.includes('samosa') || name.includes('pakora') ||
      name.includes('vada') || name.includes('spring roll') || name.includes('65') ||
      name.includes('manchurian') || name.includes('crispy') || name.includes('onion ring') ||
      name.includes('bajji') || name.includes('bonda') || name.includes('poori') ||
      name.includes('tempura') || name.includes('fritter') || name.includes('nugget')) {
    return 'FRY';
  }
  
  // GRILL Station - tandoor, tikka, kebab, grilled items, breads
  if (name.includes('tikka') || name.includes('tandoor') || name.includes('kebab') ||
      name.includes('grill') || name.includes('seekh') || name.includes('malai') ||
      name.includes('naan') || name.includes('roti') || name.includes('paratha') ||
      name.includes('kulcha') || name.includes('uttapam') || name.includes('appam') ||
      name.includes('chapati') || name.includes('pizza') || name.includes('roast') ||
      name.includes('bbq') || name.includes('barbecue') || name.includes('steak')) {
    return 'GRILL';
  }
  
  // RICE Station - rice dishes, biryani, pulao
  if (name.includes('rice') || name.includes('biryani') || name.includes('pulao') ||
      name.includes('khichdi') || name.includes('jeera') || name.includes('risotto') ||
      name.includes('pongal') || name.includes('noodle') || name.includes('chow') ||
      name.includes('hakka') || name.includes('fried rice')) {
    return 'RICE';
  }

  // CURRY Station - curries, gravies, masala dishes
  if (name.includes('curry') || name.includes('masala') || name.includes('butter') ||
      name.includes('paneer') || name.includes('kadai') || name.includes('korma') ||
      name.includes('dal') || name.includes('gravy') || name.includes('palak') ||
      name.includes('shahi') || name.includes('makhani') || name.includes('chole') ||
      name.includes('rajma') || name.includes('soup') || name.includes('stew') ||
      name.includes('sambar') || name.includes('rasam') || name.includes('avial')) {
    return 'CURRY';
  }
  
  // DESSERT Station - sweets, ice cream, beverages
  if (name.includes('gulab') || name.includes('jamun') || name.includes('ice cream') ||
      name.includes('kulfi') || name.includes('kheer') || name.includes('rasmalai') ||
      name.includes('halwa') || name.includes('brownie') || name.includes('cake') ||
      name.includes('sweet') || name.includes('dessert') || name.includes('lassi') ||
      name.includes('shake') || name.includes('juice') || name.includes('coffee') ||
      name.includes('tea') || name.includes('chai') || name.includes('payasam') ||
      name.includes('kesari') || name.includes('mysore pak') || name.includes('jangiri') ||
      name.includes('badusha') || name.includes('milk') || name.includes('sharbat') ||
      name.includes('jigarthanda') || name.includes('buttermilk')) {
    return 'DESSERT';
  }
  
  // PREP Station - salads, cold items, chutneys
  if (name.includes('salad') || name.includes('raita') || name.includes('chutney') ||
      name.includes('pickle') || name.includes('papad') || name.includes('cold') ||
      name.includes('curd rice') || name.includes('yogurt')) {
    return 'PREP';
  }
  
  // Default to CURRY for most cooked dishes
  return 'CURRY';
};

// API order status type
type APIOrderStatus = 'placed' | 'preparing' | 'ready' | 'served' | 'completed' | 'cancelled';

// Map API order status to kitchen order status
const mapOrderStatus = (status: string): OrderStatus => {
  switch (status) {
    case 'placed':
      return 'NEW';
    case 'preparing':
      return 'COOKING';
    case 'ready':
      return 'READY';
    case 'served':
    case 'completed':
    case 'cancelled':
      return 'DELIVERED';
    default:
      return 'NEW';
  }
};

// API Order type
interface APIOrder {
  _id: string;
  id?: string;
  orderNumber: string;
  tableNumber?: number;
  type: string;
  items: Array<{
    name?: string;
    dishName?: string;
    quantity?: number;
    price?: number;
    menuItemId?: string;
    category?: string;
    cookingStation?: string;
  }>;
  total: number;
  status: string;
  createdAt: string;
  statusUpdatedAt?: string;
  customerName?: string;
  notes?: string;
}

// Convert API Order to KitchenOrder
const convertToKitchenOrder = (
  order: APIOrder,
  itemStatuses: Map<string, "PENDING" | "PREPARING" | "COMPLETED">,
  itemStartTimes: Map<string, Date>,
  menuCategoryMap: Map<string, string>,
  menuStationMap: Map<string, string>
): KitchenOrder => {
  const kdsStatus = mapOrderStatus(order.status);
  const orderId = order._id || order.id || '';
  
  // Determine order type from type field
  let orderType: OrderType = "DINE_IN";
  const orderTypeStr = (order.type || '').toLowerCase();
  if (orderTypeStr === 'takeaway' || orderTypeStr === 'parcel') {
    orderType = "PARCEL";
  }

  // Calculate total prep time (5 minutes per item as default)
  const totalPrepTime = order.items.reduce((acc, item) => acc + ((item.quantity || 1) * 300), 0);
  const tableNum = order.tableNumber?.toString() || order.customerName || 'N/A';

  return {
    id: orderId,
    orderNumber: order.orderNumber || `#${orderId.slice(-4).toUpperCase()}`,
    tableNumber: tableNum,
    orderType,
    guestCount: Math.max(1, Math.ceil(order.items.length / 2)),
    status: kdsStatus,
    priority: kdsStatus === 'NEW' && (Date.now() - new Date(order.createdAt).getTime() > 300000) ? 'urgent' : 'normal',
    createdAt: new Date(order.createdAt),
    totalPrepTime,
    items: order.items.map((item, index) => {
      const itemId = `${orderId}-${index}`;
      const savedStatus = itemStatuses.get(itemId);
      const savedStartTime = itemStartTimes.get(itemId);
      const itemName = item.name || item.dishName || 'Unknown Item';
      
      // Determine item status based on order status and saved state
      let itemStatus: "PENDING" | "PREPARING" | "COMPLETED" = savedStatus || "PENDING";
      if (kdsStatus === 'READY' || kdsStatus === 'DELIVERED') {
        itemStatus = "COMPLETED";
      } else if (kdsStatus === 'COOKING' && !savedStatus) {
        itemStatus = "PREPARING";
      }

      return {
        id: itemId,
        name: itemName,
        quantity: item.quantity || 1,
        station: getItemStation(
          itemName,
          item.category || menuCategoryMap.get(item.menuItemId || '') || undefined,
          item.cookingStation || menuStationMap.get(item.menuItemId || '') || undefined
        ),
        status: itemStatus,
        preparationTime: 300, // 5 minutes default
        startedAt: savedStartTime || (itemStatus === "PREPARING" ? new Date() : undefined),
        specialInstructions: undefined
      };
    })
  };
};

export function KDSProductionQueue({ station, onLogout }: KDSProductionQueueProps) {
  const [orders, setOrders] = useState<KitchenOrder[]>([]);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [activeFilter, setActiveFilter] = useState<OrderType | "ALL">("ALL");
  const [viewMode, setViewMode] = useState<ViewMode>("ORDERS");
  const [isRecallOpen, setIsRecallOpen] = useState(false);
  const [recallInput, setRecallInput] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<KitchenOrder | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const isInitialLoad = useRef(true);
  
  // Track item statuses and start times locally (for KDS-specific state)
  const [itemStatuses, setItemStatuses] = useState<Map<string, "PENDING" | "PREPARING" | "COMPLETED">>(new Map());
  const [itemStartTimes, setItemStartTimes] = useState<Map<string, Date>>(new Map());

  // Menu item ID → category lookup (fetched once on mount)
  const [menuCategoryMap, setMenuCategoryMap] = useState<Map<string, string>>(new Map());
  // Menu item ID → cookingStation lookup (fetched once on mount)
  const [menuStationMap, setMenuStationMap] = useState<Map<string, string>>(new Map());

  const isHeadChef = station === "HEAD_CHEF";

  // Fetch menu items once to build category lookup
  useEffect(() => {
    const fetchMenu = async () => {
      try {
        const result = await menuApi.list();
        const items: any[] = Array.isArray(result) ? result : (result as any).data || [];
        const catMap = new Map<string, string>();
        const stationMap = new Map<string, string>();
        for (const item of items) {
          const id = item._id || item.id;
          if (id && item.category) catMap.set(id, item.category);
          if (id && item.cookingStation) stationMap.set(id, item.cookingStation);
        }
        setMenuCategoryMap(catMap);
        setMenuStationMap(stationMap);
      } catch {
        // Silently fail — name-pattern fallback still works
      }
    };
    fetchMenu();
  }, []);

  // Load orders from API
  const loadOrders = useCallback(async () => {
    try {
      setIsLoading(true);
      const result = await ordersApi.list();
      const allOrders: APIOrder[] = result.data || [];
      
      // Filter orders that should show in kitchen (not completed/cancelled/served)
      const activeOrders = allOrders.filter(order => 
        order.status !== 'completed' && order.status !== 'cancelled' && order.status !== 'served'
      );

      // Convert to kitchen orders
      let kitchenOrders = activeOrders.map(order => 
        convertToKitchenOrder(order, itemStatuses, itemStartTimes, menuCategoryMap, menuStationMap)
      );

      // Filter by station: only show orders with items for this station (except head chef sees all)
      if (!isHeadChef) {
        kitchenOrders = kitchenOrders.filter(order => 
          order.items.some(item => item.station === station)
        );
      }

      // Sort by creation time (oldest first for kitchen processing)
      kitchenOrders.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

      setOrders(kitchenOrders);
    } catch (error) {
      console.error('Error loading orders:', error);
      toast.error('Failed to load orders');
    } finally {
      setIsLoading(false);
      isInitialLoad.current = false;
    }
  }, [itemStatuses, itemStartTimes, station, isHeadChef, menuCategoryMap, menuStationMap]);

  useEffect(() => {
    // Load initial orders
    loadOrders();
    
    // Timer for updating elapsed times
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    // Refresh orders periodically from API
    const refreshInterval = setInterval(() => {
      loadOrders();
    }, 5000);

    return () => {
      clearInterval(timer);
      clearInterval(refreshInterval);
    };
  }, [station, loadOrders]);

  // Filter orders by type
  const filteredOrders = useMemo(() => {
    if (activeFilter === "ALL") return orders;
    return orders.filter(o => o.orderType === activeFilter);
  }, [orders, activeFilter]);

  const getElapsedTime = (createdAt: Date): string => {
    const elapsed = Math.floor((currentTime.getTime() - createdAt.getTime()) / 1000);
    const mins = Math.floor(elapsed / 60);
    const secs = elapsed % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Returns elapsed time since the item was started (count-up). Stops once item is COMPLETED.
  const getItemElapsed = (item: OrderItem): string => {
    if (!item.startedAt) return "--:--";
    const stopAt = item.status === "COMPLETED" ? item.startedAt : currentTime;
    const elapsed = Math.floor((stopAt.getTime() - item.startedAt.getTime()) / 1000);
    const mins = Math.floor(elapsed / 60);
    const secs = elapsed % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Color for item elapsed clock: green <5m, orange 5–10m, red >=10m
  const getItemElapsedColor = (item: OrderItem): string => {
    if (!item.startedAt) return "#9CA3AF";
    const elapsed = Math.floor((currentTime.getTime() - item.startedAt.getTime()) / 1000);
    if (elapsed < 300) return "#4CAF50";
    if (elapsed < 600) return "#FFA500";
    return "#E63946";
  };

  const getTimeColor = (createdAt: Date): string => {
    const elapsed = Math.floor((currentTime.getTime() - createdAt.getTime()) / 1000);
    if (elapsed < 300) return "#4CAF50"; // Green < 5 mins
    if (elapsed < 600) return "#FFA500"; // Orange < 10 mins
    return "#E63946"; // Red >= 10 mins
  };

  const getPriorityColor = (priority: string): string => {
    switch (priority) {
      case "urgent": return "#E63946";
      case "high": return "#FFA500";
      default: return "#4CAF50";
    }
  };

  const handleStartCooking = async (orderId: string) => {
    try {
      // Update via API - placed ÔåÆ preparing
      await ordersApi.updateStatus(orderId, 'preparing');
      
      // Update local item states - only for items at this station (or all if head chef)
      const order = orders.find(o => o.id === orderId);
      if (order) {
        const newStatuses = new Map(itemStatuses);
        const newStartTimes = new Map(itemStartTimes);
        order.items.forEach(item => {
          if (isHeadChef || item.station === station) {
            newStatuses.set(item.id, "PREPARING");
            newStartTimes.set(item.id, new Date());
          }
        });
        setItemStatuses(newStatuses);
        setItemStartTimes(newStartTimes);
      }
      
      setOrders(prev => prev.map(order => {
        if (order.id === orderId) {
          return {
            ...order,
            status: "COOKING" as OrderStatus,
            items: order.items.map(item => ({
              ...item,
              ...((isHeadChef || item.station === station) ? {
                status: "PREPARING" as const,
                startedAt: new Date()
              } : {})
            }))
          };
        }
        return order;
      }));
      toast.success("Order Accepted & Preparing", {
        description: `Now cooking order ${orders.find(o => o.id === orderId)?.orderNumber}`
      });
    } catch (error) {
      console.error('Error starting cooking:', error);
      toast.error('Failed to start cooking');
    }
  };

  const handleStartItem = async (orderId: string, itemId: string) => {
    // Update local item state tracking
    setItemStatuses(prev => new Map(prev).set(itemId, "PREPARING"));
    setItemStartTimes(prev => new Map(prev).set(itemId, new Date()));
    
    // Update API if this is the first item being started
    const order = orders.find(o => o.id === orderId);
    if (order && order.status === "NEW") {
      try {
        await ordersApi.updateStatus(orderId, 'preparing');
      } catch (error) {
        console.error('Error updating order status:', error);
      }
    }
    
    setOrders(prev => prev.map(order => {
      if (order.id !== orderId) return order;
      const updatedItems = order.items.map(item =>
        item.id === itemId && item.status === "PENDING"
          ? { ...item, status: "PREPARING" as const, startedAt: new Date() }
          : item
      );
      const hasPreparingItems = updatedItems.some(i => i.status === "PREPARING");
      return { ...order, items: updatedItems, status: hasPreparingItems ? "COOKING" : order.status };
    }));
    toast.success("Item Started");
  };

  const handleFinishItem = async (orderId: string, itemId: string) => {
    // Update local item state tracking
    setItemStatuses(prev => new Map(prev).set(itemId, "COMPLETED"));
    
    setOrders(prev => prev.map(order => {
      if (order.id !== orderId) return order;
      const updatedItems = order.items.map(item =>
        item.id === itemId ? { ...item, status: "COMPLETED" as const } : item
      );
      const allDone = updatedItems.every(i => i.status === "COMPLETED");
      
      // Update API if all items are done
      if (allDone) {
        ordersApi.updateStatus(orderId, 'ready').catch(err => {
          console.error('Error marking order ready:', err);
        });
      }
      
      return { ...order, items: updatedItems, status: allDone ? "READY" : order.status };
    }));
    toast.success("Item Completed");
  };

  const handleMarkReady = async (orderId: string) => {
    const order = orders.find(o => o.id === orderId);
    
    try {
      // Mark this station's items (or all items if head chef) as COMPLETED locally
      if (order) {
        const newStatuses = new Map(itemStatuses);
        order.items.forEach(item => {
          if (isHeadChef || item.station === station) {
            newStatuses.set(item.id, "COMPLETED");
          }
        });
        setItemStatuses(newStatuses);
      }

      // Always push 'ready' to the API.
      // Each station's item statuses are tracked purely in local memory — the
      // "allDone" check used to fail because other stations' items defaulted to
      // PENDING in this instance's local state.  Clicking "Mark Ready" is an
      // explicit declaration that this order is ready for serving, so we always
      // update the backend regardless of local item state.
      await ordersApi.updateStatus(orderId, 'ready');

      // Move the order to the READY column in local state immediately so both
      // the station chef and the head chef (who polls every 5 s) see it as ready.
      setOrders(prev => prev.map(o =>
        o.id === orderId
          ? {
              ...o,
              status: "READY" as OrderStatus,
              items: o.items.map(i =>
                (isHeadChef || i.station === station)
                  ? { ...i, status: "COMPLETED" as const }
                  : i
              )
            }
          : o
      ));

      toast.success("Order Ready!", {
        description: `Order ${order?.orderNumber} is ready for serving`
      });
    } catch (error) {
      console.error('Error marking order ready:', error);
      toast.error('Failed to mark order as ready');
    }
  };

  const handleDeliverOrder = async (orderId: string) => {
    const order = orders.find(o => o.id === orderId);
    
    try {
      // Update API - ready ÔåÆ served
      await ordersApi.updateStatus(orderId, 'served');
      
      setOrders(prev => prev.filter(o => o.id !== orderId));
      toast.success("Order Served!", {
        description: `Order ${order?.orderNumber} has been served`
      });
    } catch (error) {
      console.error('Error serving order:', error);
      toast.error('Failed to serve order');
    }
  };

  const handleRejectOrder = async (orderId: string) => {
    const order = orders.find(o => o.id === orderId);
    
    try {
      // Update API - cancel order
      await ordersApi.updateStatus(orderId, 'cancelled');
      
      setOrders(prev => prev.filter(o => o.id !== orderId));
      toast.error("Order Cancelled", {
        description: `Order ${order?.orderNumber} has been cancelled`
      });
    } catch (error) {
      console.error('Error cancelling order:', error);
      toast.error('Failed to cancel order');
    }
  };

  const handleRecallSearch = (orderNum: string) => {
    const found = orders.find(o => 
      o.orderNumber.includes(orderNum) || 
      o.id.includes(orderNum) || 
      o.tableNumber.includes(orderNum)
    );
    if (found) { 
      setSelectedOrder(found); 
      setIsRecallOpen(false); 
      setRecallInput("");
    } else { 
      toast.error(`Order "${orderNum}" not found.`);
    }
  };

  // Batch view aggregated items
  const batchedItems = useMemo(() => {
    const map = new Map<string, { 
      name: string; 
      total: number; 
      pendingCount: number;
      preparingCount: number;
      instances: { orderId: string; itemId: string; status: string }[];
      station: StationType;
    }>();
    
    filteredOrders.forEach(order => {
      if (order.status === "NEW" || order.status === "COOKING") {
        order.items
          .filter(item => isHeadChef || item.station === station)
          .forEach(item => {
          if (item.status !== "COMPLETED") {
            const key = `${item.name}-${item.station}`;
            const existing = map.get(key) || { 
              name: item.name, 
              total: 0, 
              pendingCount: 0,
              preparingCount: 0,
              instances: [], 
              station: item.station 
            };
            existing.total += item.quantity;
            if (item.status === "PENDING") existing.pendingCount += item.quantity;
            if (item.status === "PREPARING") existing.preparingCount += item.quantity;
            existing.instances.push({ orderId: order.id, itemId: item.id, status: item.status });
            map.set(key, existing);
          }
        });
      }
    });

    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [filteredOrders]);

  const handleStartBatch = (instances: { orderId: string; itemId: string; status: string }[]) => {
    instances.filter(i => i.status === "PENDING").forEach(inst => {
      handleStartItem(inst.orderId, inst.itemId);
    });
  };

  const handleFinishBatch = (instances: { orderId: string; itemId: string; status: string }[]) => {
    instances.filter(i => i.status !== "COMPLETED").forEach(inst => {
      handleFinishItem(inst.orderId, inst.itemId);
    });
  };

  const newOrders = filteredOrders.filter(o => o.status === "NEW");
  const cookingOrders = filteredOrders.filter(o => o.status === "COOKING");
  const readyOrders = filteredOrders.filter(o => o.status === "READY");

  const stationColors: Record<StationType, string> = {
    FRY: "#FF6B35",
    CURRY: "#D4A574",
    RICE: "#8B7355",
    PREP: "#4CAF50",
    GRILL: "#E63946",
    DESSERT: "#F4A261",
    HEAD_CHEF: "#8B5A2B"
  };

  if (isLoading && isInitialLoad.current) {
    return <LoadingKitchen />;
  }

  return (
    <div className="min-h-screen bg-kitchen-display-module max-w-full overflow-x-hidden">
      <style>{`
        @keyframes pulse-border {
          0%, 100% { border-color: rgba(230, 57, 70, 0.5); }
          50% { border-color: rgba(230, 57, 70, 1); }
        }
        .urgent-pulse {
          animation: pulse-border 1.5s ease-in-out infinite;
        }
        @keyframes blink {
          0%, 50%, 100% { opacity: 1; }
          25%, 75% { opacity: 0.3; }
        }
        .blink {
          animation: blink 2s infinite;
        }
      `}</style>

      {/* Header */}
      <div className="bg-white border-b shadow-sm sticky top-0 z-50">
        <div className="container mx-auto px-3 sm:px-6 py-3 sm:py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3 sm:gap-4">
              <div 
                className="p-2 sm:p-3 rounded-xl flex items-center justify-center flex-shrink-0" 
                style={{ backgroundColor: stationColors[station] }}
              >
                <ChefHat className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
              </div>
              <div>
                <h1 className="text-lg sm:text-2xl font-bold text-gray-900" style={{ fontFamily: 'Poppins, sans-serif' }}>
                  {station} STATION
                </h1>
                <p className="text-xs sm:text-sm text-gray-500" style={{ fontFamily: 'Inter, sans-serif' }}>
                  Production Queue • Live Orders
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 sm:gap-4">
              {/* Order Type Filters */}
              <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg">
                <Button
                  variant={activeFilter === "ALL" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setActiveFilter("ALL")}
                  className={cn("gap-1", activeFilter === "ALL" && "bg-[#8B5A2B] text-white")}
                >
                  <LayoutGrid className="h-4 w-4" />
                  All
                </Button>
                <Button
                  variant={activeFilter === "DINE_IN" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setActiveFilter("DINE_IN")}
                  className={cn("gap-1", activeFilter === "DINE_IN" && "bg-[#8B5A2B] text-white")}
                >
                  <Utensils className="h-4 w-4" />
                  Dine In
                </Button>
                <Button
                  variant={activeFilter === "PARCEL" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setActiveFilter("PARCEL")}
                  className={cn("gap-1", activeFilter === "PARCEL" && "bg-[#8B5A2B] text-white")}
                >
                  <ShoppingBag className="h-4 w-4" />
                  Parcel
                </Button>
              </div>

              {/* View Mode Tabs */}
              <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg">
                <Button
                  variant={viewMode === "ORDERS" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("ORDERS")}
                  className={cn(viewMode === "ORDERS" && "bg-[#8B5A2B] text-white")}
                >
                  Orders
                </Button>
                <Button
                  variant={viewMode === "BATCH" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("BATCH")}
                  className={cn(viewMode === "BATCH" && "bg-[#8B5A2B] text-white")}
                >
                  <Layers className="h-4 w-4 mr-1" />
                  Batch
                </Button>
              </div>

              {/* Recall Search */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsRecallOpen(true)}
                className="gap-2 border-2"
              >
                <Search className="h-4 w-4" />
                Recall
              </Button>

              {/* Stats */}
              <div className="flex items-center gap-3 sm:gap-6 px-3 sm:px-6 py-2 sm:py-3 bg-gray-100 rounded-lg">
                <div>
                  <p className="text-xs text-black mb-1" style={{ fontFamily: 'Inter, sans-serif' }}>NEW</p>
                  <p className="text-2xl font-bold text-blue-600" style={{ fontFamily: 'Poppins, sans-serif' }}>{newOrders.length}</p>
                </div>
                <div className="w-px h-10 bg-gray-300" />
                <div>
                  <p className="text-xs text-black mb-1" style={{ fontFamily: 'Inter, sans-serif' }}>COOKING</p>
                  <p className="text-2xl font-bold text-orange-600" style={{ fontFamily: 'Poppins, sans-serif' }}>{cookingOrders.length}</p>
                </div>
                <div className="w-px h-10 bg-gray-300" />
                <div>
                  <p className="text-xs text-black mb-1" style={{ fontFamily: 'Inter, sans-serif' }}>READY</p>
                  <p className="text-2xl font-bold text-green-600" style={{ fontFamily: 'Poppins, sans-serif' }}>{readyOrders.length}</p>
                </div>
              </div>

              {/* Logout */}
              <Button 
                onClick={onLogout}
                variant="outline"
                className="h-11 px-6 border-2 border-gray-300 hover:border-[#8B5A2B] hover:bg-[#8B5A2B]/10 hover:text-[#8B5A2B]"
              >
                Logout
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Recall Search Modal */}
      {isRecallOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-xl p-6 w-96 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-800">Recall Order</h3>
              <Button variant="ghost" size="sm" onClick={() => { setIsRecallOpen(false); setRecallInput(""); }}>
                <X className="h-5 w-5" />
              </Button>
            </div>
            <input
              type="text"
              value={recallInput}
              onChange={(e) => setRecallInput(e.target.value)}
              placeholder="Order # or Table #"
              className="w-full p-3 border-2 rounded-lg mb-4 text-lg font-mono"
              autoFocus
            />
            <div className="grid grid-cols-3 gap-2 mb-4">
              {[1,2,3,4,5,6,7,8,9,'C',0,'Ôî½'].map((key) => (
                <Button
                  key={key}
                  variant="outline"
                  className="h-14 text-xl font-bold"
                  onClick={() => {
                    if (key === 'C') setRecallInput("");
                    else if (key === 'Ôî½') setRecallInput(prev => prev.slice(0, -1));
                    else setRecallInput(prev => prev + key);
                  }}
                >
                  {key}
                </Button>
              ))}
            </div>
            <Button
              className="w-full h-12 bg-[#8B5A2B] hover:bg-[#6D421E] text-white text-lg"
              onClick={() => handleRecallSearch(recallInput)}
            >
              <Search className="h-5 w-5 mr-2" />
              Search
            </Button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="container mx-auto px-3 sm:px-6 py-4 sm:py-8">
        {viewMode === "ORDERS" ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          
          {/* NEW ORDERS */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white" style={{ fontFamily: 'Poppins, sans-serif' }}>
                New Orders
              </h2>
              <Badge className="bg-[#8B5A2B] text-white">{newOrders.length}</Badge>
            </div>
            <div className="space-y-4">
              {newOrders.map((order) => (
                <Card 
                  key={order.id} 
                  className={cn(
                    "border-l-4 shadow-md hover:shadow-lg transition-all duration-200",
                    order.priority === "urgent" && "urgent-pulse border-l-red-600"
                  )}
                  style={{ 
                    borderLeftColor: order.priority !== "urgent" ? getPriorityColor(order.priority) : undefined
                  }}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge 
                          className="text-white font-bold"
                          style={{ backgroundColor: stationColors[station] }}
                        >
                          {order.orderNumber}
                        </Badge>
                        {order.priority === "urgent" && (
                          <Badge className="bg-red-600 text-white blink">
                            URGENT
                          </Badge>
                        )}
                        {order.priority === "high" && (
                          <Badge className="bg-orange-600 text-white">
                            HIGH
                          </Badge>
                        )}
                        {/* Order Type Badge */}
                        <Badge variant="outline" className={cn(
                          "text-xs",
                          order.orderType === "DINE_IN" && "border-blue-400 text-blue-600",
                          order.orderType === "PARCEL" && "border-purple-400 text-purple-600"
                        )}>
                          {order.orderType === "DINE_IN" && <Utensils className="h-3 w-3 mr-1" />}
                          {order.orderType === "PARCEL" && <ShoppingBag className="h-3 w-3 mr-1" />}
                          {order.orderType.replace("_", " ")}
                        </Badge>
                      </div>
                      <div 
                        className="flex items-center gap-1 font-bold text-sm"
                        style={{ color: getTimeColor(order.createdAt) }}
                      >
                        <Clock className="h-4 w-4" />
                        {getElapsedTime(order.createdAt)}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                      <span className="flex items-center gap-1" style={{ fontFamily: 'Inter, sans-serif' }}>
                        <Users className="h-4 w-4" />
                        {order.tableNumber}
                      </span>
                      <span style={{ fontFamily: 'Inter, sans-serif' }}>
                        {order.guestCount} guests
                      </span>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-3">
                    {order.items.filter(item => isHeadChef || item.station === station).map((item) => (
                      <div key={item.id} className="p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-start justify-between mb-1">
                          <p className="font-semibold text-gray-800" style={{ fontFamily: 'Poppins, sans-serif' }}>
                            {item.quantity}x {item.name}
                          </p>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs bg-gray-100">
                              {item.station}
                            </Badge>
                          </div>
                        </div>
                        {item.specialInstructions && (
                          <p className="text-xs text-amber-700 flex items-center gap-1 mt-1">
                            <AlertCircle className="h-3 w-3" />
                            {item.specialInstructions}
                          </p>
                        )}
                        {/* Item-level START button */}
                        {item.status === "PENDING" && (
                          <Button
                            size="sm"
                            className="mt-2 w-full bg-[#8B5A2B] hover:bg-[#6D421E] text-white"
                            onClick={() => handleStartItem(order.id, item.id)}
                          >
                            <Play className="h-3 w-3 mr-1" />
                            Accept & Prepare
                          </Button>
                        )}
                      </div>
                    ))}

                    <div className="flex gap-2 pt-2">
                      {/* Accept Order button - available to head chef and station chefs with items for their station */}
                      {(isHeadChef || order.items.some(item => item.station === station)) && (
                        <Button
                          onClick={() => handleStartCooking(order.id)}
                          className="flex-1 bg-[#8B5A2B] hover:bg-[#6D421E] text-white"
                        >
                          <Check className="h-4 w-4 mr-2" />
                          Accept Order
                        </Button>
                      )}
                      <Button
                        onClick={() => handleRejectOrder(order.id)}
                        variant="outline"
                        className="border-[#8B5A2B]/30 text-[#8B5A2B] hover:bg-[#8B5A2B]/10"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
              
              {newOrders.length === 0 && (
                <Card className="p-8 text-center border-dashed">
                  <p className="text-gray-400" style={{ fontFamily: 'Inter, sans-serif' }}>
                    No new orders
                  </p>
                </Card>
              )}
            </div>
          </div>

          {/* COOKING */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white" style={{ fontFamily: 'Poppins, sans-serif' }}>
                In Progress
              </h2>
              <Badge className="bg-[#8B5A2B] text-white">{cookingOrders.length}</Badge>
            </div>
            <div className="space-y-4">
              {cookingOrders.map((order) => (
                <Card key={order.id} className="border-l-4 border-l-orange-600 shadow-md">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge 
                          className="text-white font-bold"
                          style={{ backgroundColor: stationColors[station] }}
                        >
                          {order.orderNumber}
                        </Badge>
                        <Badge variant="outline" className={cn(
                          "text-xs",
                          order.orderType === "DINE_IN" && "border-blue-400 text-blue-600",
                          order.orderType === "PARCEL" && "border-purple-400 text-purple-600"
                        )}>
                          {order.orderType.replace("_", " ")}
                        </Badge>
                      </div>
                      <div 
                        className="flex items-center gap-1 font-bold text-sm"
                        style={{ color: getTimeColor(order.createdAt) }}
                      >
                        <Flame className="h-4 w-4" />
                        {getElapsedTime(order.createdAt)}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        {order.tableNumber}
                      </span>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-3">
                    {order.items.filter(item => isHeadChef || item.station === station).map((item) => (
                      <div 
                        key={item.id} 
                        className={cn(
                          "p-3 rounded-lg border",
                          item.status === "PENDING" && "bg-gray-50 border-gray-200",
                          item.status === "PREPARING" && "bg-orange-50 border-orange-200",
                          item.status === "COMPLETED" && "bg-green-50 border-green-200"
                        )}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <p className="font-semibold text-gray-800" style={{ fontFamily: 'Poppins, sans-serif' }}>
                            {item.status === "COMPLETED" && <Check className="h-4 w-4 inline mr-1 text-green-600" />}
                            {item.quantity}x {item.name}
                          </p>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs bg-white">
                              {item.station}
                            </Badge>
                            {item.startedAt && (
                              <div
                                className="flex items-center gap-1 font-bold text-sm"
                                style={{ color: item.status === "COMPLETED" ? "#4CAF50" : getItemElapsedColor(item) }}
                              >
                                <Clock className="h-4 w-4" />
                                {getItemElapsed(item)}
                              </div>
                            )}
                          </div>
                        </div>
                        
                        {/* Progress bar for PREPARING items — fills over 10 minutes, colour shifts green→orange→red */}
                        {item.status === "PREPARING" && item.startedAt && (
                          <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                            <div
                              className="h-2 rounded-full transition-all duration-1000"
                              style={{
                                width: `${Math.min(100, ((currentTime.getTime() - item.startedAt.getTime()) / 1000 / 600) * 100)}%`,
                                backgroundColor: getItemElapsedColor(item),
                              }}
                            />
                          </div>
                        )}

                        {/* Item-level actions */}
                        <div className="flex gap-2 mt-2">
                          {item.status === "PENDING" && (
                            <Button
                              size="sm"
                              className="flex-1 bg-[#8B5A2B] hover:bg-[#6D421E] text-white"
                              onClick={() => handleStartItem(order.id, item.id)}
                            >
                              <Play className="h-3 w-3 mr-1" />
                              Prepare
                            </Button>
                          )}
                          {item.status === "PREPARING" && (
                            <Button
                              size="sm"
                              className="flex-1 bg-[#8B5A2B] hover:bg-[#6D421E] text-white"
                              onClick={() => handleFinishItem(order.id, item.id)}
                            >
                              <Check className="h-3 w-3 mr-1" />
                              Done
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}

                    {/* Mark Ready button - available to head chef and station chefs */}
                    {(isHeadChef || order.items.some(item => item.station === station)) && (
                      <Button
                        onClick={() => handleMarkReady(order.id)}
                        className="w-full bg-[#8B5A2B] hover:bg-[#6D421E] text-white"
                      >
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        Mark Ready
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))}
              
              {cookingOrders.length === 0 && (
                <Card className="p-8 text-center border-dashed">
                  <p className="text-gray-400" style={{ fontFamily: 'Inter, sans-serif' }}>
                    No orders in progress
                  </p>
                </Card>
              )}
            </div>
          </div>

          {/* READY */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white" style={{ fontFamily: 'Poppins, sans-serif' }}>
                Ready to Serve
              </h2>
              <Badge className="bg-[#8B5A2B] text-white">{readyOrders.length}</Badge>
            </div>
            <div className="space-y-4">
              {readyOrders.map((order) => (
                <Card key={order.id} className="border-l-4 border-l-green-600 shadow-md bg-green-50">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge 
                          className="text-white font-bold"
                          style={{ backgroundColor: stationColors[station] }}
                        >
                          {order.orderNumber}
                        </Badge>
                        <Badge variant="outline" className={cn(
                          "text-xs",
                          order.orderType === "DINE_IN" && "border-blue-400 text-blue-600",
                          order.orderType === "PARCEL" && "border-purple-400 text-purple-600"
                        )}>
                          {order.orderType.replace("_", " ")}
                        </Badge>
                      </div>
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                    </div>
                    
                    <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        {order.tableNumber}
                      </span>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-2">
                    {order.items.filter(item => isHeadChef || item.station === station).map((item) => (
                      <div key={item.id} className="p-3 bg-white rounded-lg border border-green-200">
                        <p className="font-semibold text-gray-800 flex items-center gap-2" style={{ fontFamily: 'Poppins, sans-serif' }}>
                          <Check className="h-4 w-4 text-green-600" />
                          {item.quantity}x {item.name}
                        </p>
                      </div>
                    ))}

                    <div className="pt-2 flex gap-2">
                      <div className="flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-green-50 border border-green-200 text-green-700 text-sm font-medium">
                        <Utensils className="h-4 w-4" />
                        Awaiting waiter pickup
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              
              {readyOrders.length === 0 && (
                <Card className="p-8 text-center border-dashed">
                  <p className="text-gray-400" style={{ fontFamily: 'Inter, sans-serif' }}>
                    No ready orders
                  </p>
                </Card>
              )}
            </div>
          </div>

        </div>
        ) : (
          /* BATCH VIEW */
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white" style={{ fontFamily: 'Poppins, sans-serif' }}>
                Batch Production View
              </h2>
              <Badge className="bg-[#8B5A2B] text-white px-4 py-2 text-lg">
                {batchedItems.length} Items to Prepare
              </Badge>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {batchedItems.map((batch, index) => (
                <Card 
                  key={index} 
                  className={cn(
                    "border-l-4 shadow-md hover:shadow-lg transition-all",
                    batch.preparingCount > 0 && "border-l-orange-600 bg-orange-50"
                  )}
                  style={{ 
                    borderLeftColor: batch.preparingCount === 0 ? stationColors[batch.station] : undefined 
                  }}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <Badge 
                        className="text-white font-bold"
                        style={{ backgroundColor: stationColors[batch.station] }}
                      >
                        {batch.station}
                      </Badge>
                      <Badge className="bg-gray-800 text-white text-lg px-3">
                        x{batch.total}
                      </Badge>
                    </div>
                    <p className="text-lg font-bold text-gray-800 mt-2" style={{ fontFamily: 'Poppins, sans-serif' }}>
                      {batch.name}
                    </p>
                  </CardHeader>

                  <CardContent className="space-y-3">
                    <div className="flex gap-2 text-sm">
                      <Badge variant="outline" className="bg-gray-100">
                        {batch.pendingCount} pending
                      </Badge>
                      {batch.preparingCount > 0 && (
                        <Badge variant="outline" className="bg-orange-100 text-orange-700 border-orange-300">
                          {batch.preparingCount} cooking
                        </Badge>
                      )}
                    </div>

                    {/* Batch action buttons */}
                    {(isHeadChef || batch.station === station) && (
                      <div className="flex gap-2">
                        {batch.pendingCount > 0 && (
                          <Button
                            size="sm"
                            className="flex-1 bg-[#8B5A2B] hover:bg-[#6D421E] text-white"
                            onClick={() => handleStartBatch(batch.instances)}
                          >
                            <Play className="h-3 w-3 mr-1" />
                            START ALL
                          </Button>
                        )}
                        {batch.preparingCount > 0 && (
                          <Button
                            size="sm"
                            className="flex-1 bg-[#8B5A2B] hover:bg-[#6D421E] text-white"
                            onClick={() => handleFinishBatch(batch.instances)}
                          >
                            <Check className="h-3 w-3 mr-1" />
                            FINISH ALL
                          </Button>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}

              {batchedItems.length === 0 && (
                <Card className="col-span-full p-12 text-center border-dashed">
                  <ChefHat className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <p className="text-xl text-gray-400" style={{ fontFamily: 'Inter, sans-serif' }}>
                    No items to prepare
                  </p>
                </Card>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
