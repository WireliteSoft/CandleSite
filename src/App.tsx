import { ReactNode, useEffect, useState } from 'react';
import { useAuth } from './contexts/AuthContext';
import Auth from './components/Auth';
import Shop from './components/Shop';
import CustomOrderForm from './components/CustomOrderForm';
import AdminInventory from './components/AdminInventory';
import AdminOrders from './components/AdminOrders';
import AdminCustomOrders from './components/AdminCustomOrders';
import AdminUsers from './components/AdminUsers';
import { Flame, Store, Sparkles, Package, ShoppingBag, FileText, LogOut, Shield, Users, Moon, Sun } from 'lucide-react';
import logo from '../logo.png';

type View = 'shop' | 'custom' | 'admin-inventory' | 'admin-orders' | 'admin-custom' | 'admin-users';

function App() {
  const { user, profile, loading, signOut } = useAuth();
  const [currentView, setCurrentView] = useState<View>('shop');
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const stored = localStorage.getItem('theme');
    if (stored === 'light' || stored === 'dark') return stored;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('theme', theme);
  }, [theme]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <Flame className="w-16 h-16 text-orange-500 dark:text-orange-400 mx-auto mb-4 animate-pulse" />
          <p className="text-gray-600 dark:text-gray-300">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Auth />;
  }

  const navItems: Array<{ view: View; label: string; icon: ReactNode; adminOnly?: boolean }> = [
    { view: 'shop', label: 'Shop', icon: <Store className="w-5 h-5" /> },
    { view: 'custom', label: 'Custom Order', icon: <Sparkles className="w-5 h-5" /> },
    { view: 'admin-inventory', label: 'Inventory', icon: <Package className="w-5 h-5" />, adminOnly: true },
    { view: 'admin-orders', label: 'Orders', icon: <ShoppingBag className="w-5 h-5" />, adminOnly: true },
    { view: 'admin-custom', label: 'Custom Requests', icon: <FileText className="w-5 h-5" />, adminOnly: true },
    { view: 'admin-users', label: 'Users', icon: <Users className="w-5 h-5" />, adminOnly: true },
  ];
  const visibleNavItems = navItems.filter((item) => !item.adminOnly || profile?.is_admin);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 dark:text-gray-100">
      <nav className="bg-white dark:bg-gray-800 shadow-md">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-3 space-y-3">
          <div className="flex justify-between items-center gap-3">
            <div className="flex items-center">
              <img
                src={logo}
                alt="Candle Haven"
                className="w-[180px] sm:w-[240px] md:w-[280px] h-auto object-contain shrink-0"
              />
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              <button
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className="inline-flex items-center gap-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-100 shadow-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                <span className="hidden sm:inline">{theme === 'dark' ? 'Light' : 'Dark'}</span>
              </button>
              <div className="hidden sm:flex items-center gap-3">
                {profile?.is_admin && (
                  <span className="flex items-center gap-1 text-sm font-medium text-orange-600">
                    <Shield className="w-4 h-4" />
                    Admin
                  </span>
                )}
              </div>
              <button
                onClick={signOut}
                className="flex items-center gap-2 px-3 sm:px-4 py-2 text-gray-600 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <LogOut className="w-5 h-5" />
                <span className="hidden sm:inline">Sign Out</span>
              </button>
            </div>
          </div>

          <div className="md:hidden">
            <label className="sr-only" htmlFor="mobile-view">Select view</label>
            <select
              id="mobile-view"
              value={currentView}
              onChange={(e) => setCurrentView(e.target.value as View)}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100"
            >
              {visibleNavItems.map((item) => (
                <option key={item.view} value={item.view}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>

          <div className="hidden md:flex flex-wrap items-center gap-2">
            {visibleNavItems.map((item) => (
              <button
                key={item.view}
                onClick={() => setCurrentView(item.view)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                  currentView === item.view
                    ? 'bg-orange-500 text-white'
                    : 'text-gray-600 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                {item.icon}
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </nav>

      <main>
        {currentView === 'shop' && <Shop />}
        {currentView === 'custom' && <CustomOrderForm />}
        {currentView === 'admin-inventory' && profile?.is_admin && <AdminInventory />}
        {currentView === 'admin-orders' && profile?.is_admin && <AdminOrders />}
        {currentView === 'admin-custom' && profile?.is_admin && <AdminCustomOrders />}
        {currentView === 'admin-users' && profile?.is_admin && <AdminUsers />}
      </main>
    </div>
  );
}

export default App;
