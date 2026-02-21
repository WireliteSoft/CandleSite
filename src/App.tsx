import { useEffect, useState } from 'react';
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

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 dark:text-gray-100">
      <button
        onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        className="fixed right-4 top-4 z-50 inline-flex items-center gap-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-100 shadow-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
      >
        {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        {theme === 'dark' ? 'Light' : 'Dark'}
      </button>
      <nav className="bg-white dark:bg-gray-800 shadow-md">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <img
                src={logo}
                alt="Candle Haven"
                className="w-[280px] max-w-[45vw] h-auto object-contain shrink-0"
              />
            </div>

            <div className="flex items-center gap-4">
              <button
                onClick={() => setCurrentView('shop')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                  currentView === 'shop'
                    ? 'bg-orange-500 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Store className="w-5 h-5" />
                Shop
              </button>

              <button
                onClick={() => setCurrentView('custom')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                  currentView === 'custom'
                    ? 'bg-orange-500 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Sparkles className="w-5 h-5" />
                Custom Order
              </button>

              {profile?.is_admin && (
                <>
                  <div className="h-6 w-px bg-gray-300" />
                  <button
                    onClick={() => setCurrentView('admin-inventory')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                      currentView === 'admin-inventory'
                        ? 'bg-orange-500 text-white'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <Package className="w-5 h-5" />
                    Inventory
                  </button>

                  <button
                    onClick={() => setCurrentView('admin-orders')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                      currentView === 'admin-orders'
                        ? 'bg-orange-500 text-white'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <ShoppingBag className="w-5 h-5" />
                    Orders
                  </button>

                  <button
                    onClick={() => setCurrentView('admin-custom')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                      currentView === 'admin-custom'
                        ? 'bg-orange-500 text-white'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <FileText className="w-5 h-5" />
                    Custom Requests
                  </button>

                  <button
                    onClick={() => setCurrentView('admin-users')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                      currentView === 'admin-users'
                        ? 'bg-orange-500 text-white'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <Users className="w-5 h-5" />
                    Users
                  </button>
                </>
              )}

              <div className="h-6 w-px bg-gray-300" />

              <div className="flex items-center gap-3">
                {profile?.is_admin && (
                  <span className="flex items-center gap-1 text-sm font-medium text-orange-600">
                    <Shield className="w-4 h-4" />
                    Admin
                  </span>
                )}
                <button
                  onClick={signOut}
                  className="flex items-center gap-2 px-4 py-2 text-gray-600 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <LogOut className="w-5 h-5" />
                  Sign Out
                </button>
              </div>
            </div>
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
