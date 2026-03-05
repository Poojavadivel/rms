import { useState, useEffect, useRef, lazy, Suspense } from 'react';
const AdminDashboard = lazy(() => import('@/admin/components/admin-dashboard').then(m => ({ default: m.AdminDashboard })));
const MenuManagement = lazy(() => import('@/admin/components/menu-management').then(m => ({ default: m.MenuManagement })));
const OrderManagement = lazy(() => import('@/admin/components/order-management').then(m => ({ default: m.OrderManagement })));
const MochaKDS = lazy(() => import('@/admin/components/mocha-kds').then(m => ({ default: m.MochaKDS })));
const TableManagementComprehensive = lazy(() => import('@/admin/components/table-management-comprehensive').then(m => ({ default: m.TableManagementComprehensive })));
const InventoryManagement = lazy(() => import('@/admin/components/inventory-management').then(m => ({ default: m.InventoryManagement })));
const StaffManagement = lazy(() => import('@/admin/components/staff-management').then(m => ({ default: m.StaffManagement })));
const BillingPayment = lazy(() => import('@/admin/components/billing-payment').then(m => ({ default: m.BillingPayment })));
const SecuritySettings = lazy(() => import('@/admin/components/security-settings').then(m => ({ default: m.SecuritySettings })));
const OffersLoyalty = lazy(() => import('@/admin/components/offers-loyalty').then(m => ({ default: m.OffersLoyalty })));
const ReportsAnalytics = lazy(() => import('@/admin/components/reports-analytics').then(m => ({ default: m.ReportsAnalytics })));
const NotificationManagement = lazy(() => import('@/admin/components/notification-management').then(m => ({ default: m.NotificationManagement })));
import { LoginPage } from '@/admin/components/login-page';
import { Button } from '@/admin/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/admin/components/ui/tabs';
import { Toaster } from '@/admin/components/ui/sonner';
import { SystemConfigProvider, useSystemConfig } from '@/admin/utils/system-config-context';
import { AuthProvider, useAuth, DEFAULT_TAB } from '@/admin/utils/auth-context';
import {
  LayoutDashboard,
  UtensilsCrossed,
  ShoppingCart,
  ChefHat,
  Users,
  Package,
  UserCog,
  Bell,
  Settings,
  User,
  Shield,
  FileText,
  Database,
  Wrench,
  LogOut,
  CreditCard,
  Tag,
  BarChart3,
  BellRing,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/admin/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/admin/components/ui/avatar";
import { Badge } from "@/admin/components/ui/badge";
import { notificationsApi, backupApi } from '@/admin/utils/api';
import { toast as backupToast } from 'sonner';

function triggerBackupDownload(data: any, filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.style.display = 'none';
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

const ALL_TABS = [
  { value: 'dashboard',     icon: LayoutDashboard, label: 'Dashboard'  },
  { value: 'orders',        icon: ShoppingCart,    label: 'Orders'     },
  { value: 'kitchen',       icon: ChefHat,         label: 'Kitchen'    },
  { value: 'tables',        icon: Users,           label: 'Tables'     },
  { value: 'menu',          icon: UtensilsCrossed, label: 'Menu'       },
  { value: 'inventory',     icon: Package,         label: 'Inventory'  },
  { value: 'staff',         icon: UserCog,         label: 'Staff'      },
  { value: 'billing',       icon: CreditCard,      label: 'Billing'    },
  { value: 'offers',        icon: Tag,             label: 'Offers'     },
  { value: 'reports',       icon: BarChart3,       label: 'Reports'    },
  { value: 'notifications', icon: BellRing,        label: 'Alerts'     },
  { value: 'settings',      icon: Settings,        label: 'Settings'   },
] as const;

const TAB_CLASS =
  'gap-2 px-4 py-2.5 rounded-xl font-medium text-[#6B5B4F] transition-all duration-300 ' +
  'hover:bg-[#F5EDE5] hover:text-[#8B5A2B] ' +
  'data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#8B5A2B] data-[state=active]:to-[#A0694B] ' +
  'data-[state=active]:!text-white data-[state=active]:shadow-md data-[state=active]:shadow-[#8B5A2B]/25';

function AppContent() {
  const { config } = useSystemConfig();
  const { user, isAuthenticated, logout, hasPermission } = useAuth();
  const [activeTab, setActiveTab] = useState(() => {
    const savedUser = localStorage.getItem('rms_current_user');
    if (savedUser) {
      try {
        const userData = JSON.parse(savedUser);
        return DEFAULT_TAB[userData.role as keyof typeof DEFAULT_TAB] || 'dashboard';
      } catch {
        return 'dashboard';
      }
    }
    return 'dashboard';
  });
  const [notificationCount, setNotificationCount] = useState(0);
  const [triggerStockManagement, setTriggerStockManagement] = useState(false);
  const lastAutoBackupIdRef = useRef<string | null>(null);

  // Fetch real unread notification count scoped to the current user's role
  useEffect(() => {
    const fetchUnreadCount = async () => {
      try {
        const result = await notificationsApi.list({ status: 'unread', limit: 500 });
        const data = result.data || [];
        const role = user?.role ?? 'admin';
        const privileged = role === 'admin' || role === 'manager';
        const roleScoped = privileged
          ? data
          : data.filter((n: any) =>
              n.recipient?.toLowerCase().includes(role)
            );
        setNotificationCount(roleScoped.length);
      } catch {
        // silently ignore
      }
    };
    if (user) {
      fetchUnreadCount();
      const iv = setInterval(fetchUnreadCount, 30_000);
      return () => clearInterval(iv);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      const defaultTab = DEFAULT_TAB[user.role];
      if (defaultTab && !hasPermission(activeTab)) {
        setActiveTab(defaultTab);
      }
    }
  }, [user]);

  // ─── Global auto-backup poller ────────────────────────────────────────
  useEffect(() => {
    if (!user) return;

    let autoBackupEnabled = true;

    const runPoller = async () => {
      try {
        const cfg = await backupApi.getConfig();
        autoBackupEnabled = cfg?.autoBackupEnabled ?? true;
      } catch { /* ignore */ }

      if (!autoBackupEnabled) return;

      // Seed so we don't re-download a backup that already existed
      try {
        const initial = await backupApi.list();
        const initialList = Array.isArray(initial) ? initial : [];
        const seed = initialList.find((b: any) => b.type === 'automatic' && b.status === 'completed');
        if (seed && lastAutoBackupIdRef.current === null) {
          lastAutoBackupIdRef.current = seed._id || seed.id;
        }
      } catch { /* ignore */ }
    };

    runPoller();

    const pollInterval = setInterval(async () => {
      try {
        const cfg = await backupApi.getConfig();
        autoBackupEnabled = cfg?.autoBackupEnabled ?? true;
      } catch { /* ignore */ }

      if (!autoBackupEnabled) return;

      try {
        const raw = await backupApi.list();
        const list = Array.isArray(raw) ? raw : [];
        const newestAuto = list.find((b: any) => b.type === 'automatic' && b.status === 'completed');
        if (!newestAuto) return;

        const id = newestAuto._id || newestAuto.id;
        if (id !== lastAutoBackupIdRef.current) {
          lastAutoBackupIdRef.current = id;
          const data = await backupApi.downloadData(id);
          const filename = `RMS-Backup_${newestAuto.date}_${newestAuto.time.replace(/:/g, '-')}.json`;
          triggerBackupDownload(data, filename);
          backupToast.success(`Automatic backup downloaded: ${newestAuto.name}`, {
            description: `${newestAuto.date} at ${newestAuto.time} · ${newestAuto.size}`,
          });
        }
      } catch (e) {
        console.error('Global auto-backup download failed', e);
      }
    }, 60_000);

    return () => clearInterval(pollInterval);
  }, [user]);

  useEffect(() => {
    const handleStock = () => {
      setActiveTab('inventory');
      setTriggerStockManagement(true);
      setTimeout(() => setTriggerStockManagement(false), 100);
    };
    const handleTab = (e: Event) => {
      const next = (e as CustomEvent<string>).detail;
      if (typeof next === 'string' && hasPermission(next)) setActiveTab(next);
    };
    const handleNotif = () => {
      // Re-fetch real count instead of blindly incrementing
      notificationsApi.list({ status: 'unread', limit: 500 }).then((result) => {
        const data = result.data || [];
        const role = user?.role ?? 'admin';
        const privileged = role === 'admin' || role === 'manager';
        const roleScoped = privileged
          ? data
          : data.filter((n: any) => n.recipient?.toLowerCase().includes(role));
        setNotificationCount(roleScoped.length);
      }).catch(() => {});
    };

    window.addEventListener('navigate:stock-management' as any, handleStock);
    window.addEventListener('rms:navigate-tab' as any, handleTab);
    window.addEventListener('new-admin-notification' as any, handleNotif);
    return () => {
      window.removeEventListener('navigate:stock-management' as any, handleStock);
      window.removeEventListener('rms:navigate-tab' as any, handleTab);
      window.removeEventListener('new-admin-notification' as any, handleNotif);
    };
  }, [hasPermission]);

  if (!isAuthenticated) {
    return (
      <>
        <Toaster position="top-right" />
        <LoginPage />
      </>
    );
  }

  const isChef = user?.role === 'chef';
  const permittedTabs = ALL_TABS.filter(t =>
    hasPermission(t.value) && !(isChef && t.value === 'dashboard')
  );

  const navigate = (value: string) => {
    setActiveTab(value);
  };

  // Chef lands directly on kitchen � skips dashboard cards
  if (isChef && activeTab === 'dashboard') {
    setActiveTab('kitchen');
  }

  return (
    <div className="min-h-screen bg-background overflow-x-hidden w-full">
      <Toaster position="top-right" />

      {/* Header */}
      <header className="border-b bg-white shadow-sm sticky top-0 z-50">
        <div className="container mx-auto px-3 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1 overflow-hidden">
              <img src="/favicon.png" alt="logo" className="h-10 w-10 sm:h-12 sm:w-12 flex-shrink-0 rounded-lg object-contain" />
              <div className="min-w-0 overflow-hidden">
                <h1 className="text-base font-bold tracking-tight leading-tight sm:hidden" style={{ color: '#000000' }}>RMS</h1>
                <h1 className="hidden sm:block text-xl font-semibold tracking-tight leading-tight truncate" style={{ color: '#000000' }}>{config.restaurantName}</h1>
                <p className="text-xs text-muted-foreground hidden sm:block">Powered by Movicloud Labs</p>
              </div>
            </div>

            <div className="flex items-center gap-1 sm:gap-3 flex-shrink-0">
              <Button
                variant="ghost"
                size="icon"
                className="relative"
                onClick={() => navigate('notifications')}
              >
                <Bell className="h-5 w-5" style={{ color: '#000000' }} />
                {notificationCount > 0 && (
                  <Badge className="absolute -top-1 -right-1 h-5 min-w-5 flex items-center justify-center p-0 px-1 text-xs">
                    {notificationCount > 99 ? '99+' : notificationCount}
                  </Badge>
                )}
              </Button>

              {hasPermission('settings') && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <Settings className="h-5 w-5" style={{ color: '#000000' }} />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel>Settings &amp; Configuration</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => navigate('settings')}><Shield className="mr-2 h-4 w-4" />Security &amp; Settings</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate('settings')}><Users className="mr-2 h-4 w-4" />Role &amp; Permissions</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate('settings')}><FileText className="mr-2 h-4 w-4" />Audit Logs</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate('settings')}><Database className="mr-2 h-4 w-4" />Backup &amp; Recovery</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate('settings')}><Wrench className="mr-2 h-4 w-4" />System Configuration</DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-red-600" onClick={logout}><LogOut className="mr-2 h-4 w-4" />Logout</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-8 w-8 sm:h-10 sm:w-10 rounded-full">
                    <Avatar>
                      <AvatarImage src="" alt={user?.name} />
                      <AvatarFallback className="bg-primary text-primary-foreground text-xs sm:text-sm">
                        {user?.name?.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) || 'U'}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium">{user?.name}</p>
                      <p className="text-xs text-muted-foreground">{user?.email}</p>
                      <p className="text-xs text-muted-foreground capitalize">Role: {user?.role}</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {hasPermission('settings') && (
                    <DropdownMenuItem onClick={() => navigate('settings')}><Settings className="mr-2 h-4 w-4" />Preferences</DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-red-600" onClick={logout}><LogOut className="mr-2 h-4 w-4" />Logout</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => hasPermission(v) && setActiveTab(v)} className="container mx-auto">

        {/* Desktop top nav � hidden on mobile */}
        <div className="hidden sm:block sticky top-[73px] z-40">
          <div className="mx-4 my-3 rounded-2xl bg-gradient-to-r from-[#FDFBF9] via-white to-[#FDFBF9] shadow-lg border border-[#E8E0D8] overflow-x-auto scrollbar-hide">
            <TabsList className="min-w-max w-full justify-center gap-1 flex-nowrap h-auto p-2 bg-transparent border-0">
              {ALL_TABS.map(({ value, icon: Icon, label }) =>
                hasPermission(value) ? (
                  <TabsTrigger key={value} value={value} className={TAB_CLASS} style={{ fontFamily: 'Inter, sans-serif' }}>
                    <Icon className="h-4 w-4" />
                    <span>{label}</span>
                  </TabsTrigger>
                ) : null
              )}
            </TabsList>
          </div>
        </div>

        {/* Content */}
        <Suspense fallback={null}>
        <TabsContent value="dashboard"     className="mt-0 pb-24 sm:pb-6"><AdminDashboard /></TabsContent>
        <TabsContent value="menu"          className="mt-0 pb-24 sm:pb-6"><MenuManagement /></TabsContent>
        <TabsContent value="orders"        className="mt-0 pb-24 sm:pb-6"><OrderManagement /></TabsContent>
        <TabsContent value="kitchen"       className="mt-0 pb-24 sm:pb-6"><MochaKDS /></TabsContent>
        <TabsContent value="tables"        className="mt-0 pb-24 sm:pb-6"><TableManagementComprehensive /></TabsContent>
        <TabsContent value="inventory"     className="mt-0 pb-24 sm:pb-6"><InventoryManagement triggerStockManagement={triggerStockManagement} /></TabsContent>
        <TabsContent value="staff"         className="mt-0 pb-24 sm:pb-6"><StaffManagement /></TabsContent>
        <TabsContent value="billing"       className="mt-0 pb-24 sm:pb-6"><BillingPayment /></TabsContent>
        <TabsContent value="offers"        className="mt-0 pb-24 sm:pb-6"><OffersLoyalty /></TabsContent>
        <TabsContent value="reports"       className="mt-0 pb-24 sm:pb-6"><ReportsAnalytics /></TabsContent>
        <TabsContent value="notifications" className="mt-0 pb-24 sm:pb-6"><NotificationManagement /></TabsContent>
        <TabsContent value="settings"      className="mt-0 pb-24 sm:pb-6"><SecuritySettings /></TabsContent>
        </Suspense>
      </Tabs>

      {/* Footer � desktop only */}
      <footer className="border-t mt-8 py-4 bg-white hidden sm:block">
        <div className="container mx-auto px-6 text-center">
          <p className="text-sm text-muted-foreground">{config.restaurantName}  Movicloud Labs</p>
        </div>
      </footer>

      {/* Mobile bottom navigation � scrollable, shows all tabs */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 shadow-[0_-4px_20px_rgba(0,0,0,0.08)]"
           style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <div className="flex overflow-x-auto scrollbar-hide">
          {permittedTabs.map(({ value, icon: Icon, label }) => {
            const isActive = activeTab === value;
            return (
              <button
                key={value}
                onClick={() => navigate(value)}
                style={{ WebkitTapHighlightColor: 'transparent', minWidth: '64px' }}
                className={`flex-shrink-0 flex flex-col items-center justify-center gap-0.5 px-2 py-2 min-h-[56px] transition-colors ${
                  isActive ? 'text-[#8B5A2B]' : 'text-gray-500'
                }`}
              >
                <span className={`flex flex-col items-center justify-center rounded-full px-2 py-1 ${isActive ? 'bg-[#F5EDE5]' : ''}`}>
                  <Icon className={`h-5 w-5 ${isActive ? 'text-[#8B5A2B]' : 'text-gray-500'}`} />
                </span>
                <span className={`text-[10px] font-medium leading-none whitespace-nowrap ${isActive ? 'text-[#8B5A2B]' : 'text-gray-500'}`}>
                  {label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <SystemConfigProvider>
        <AppContent />
      </SystemConfigProvider>
    </AuthProvider>
  );
}
