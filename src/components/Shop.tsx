import { useState, useEffect } from 'react';
import { apiGet, apiPost, Candle } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { ShoppingCart, Plus, Minus, Flame, Package } from 'lucide-react';

interface CartItem extends Candle {
  quantity: number;
}

export default function Shop() {
  const [candles, setCandles] = useState<Candle[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCart, setShowCart] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const [shippingAddress, setShippingAddress] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [orderLoading, setOrderLoading] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);

  useEffect(() => {
    void loadCandles();
  }, []);

  const loadCandles = async () => {
    try {
      const response = await apiGet<{ data: Candle[] }>('/api/candles');
      setCandles(response.data);
    } catch (error) {
      console.error('Failed to load candles:', error);
    } finally {
      setLoading(false);
    }
  };

  const addToCart = (candle: Candle) => {
    const existing = cart.find((item) => item.id === candle.id);
    if (existing) {
      if (existing.quantity < candle.stock_quantity) {
        setCart(
          cart.map((item) =>
            item.id === candle.id
              ? { ...item, quantity: item.quantity + 1 }
              : item
          )
        );
      }
    } else {
      setCart([...cart, { ...candle, quantity: 1 }]);
    }
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart(
      cart
        .map((item) => {
          if (item.id === id) {
            const newQuantity = item.quantity + delta;
            return newQuantity > 0 ? { ...item, quantity: newQuantity } : item;
          }
          return item;
        })
        .filter((item) => item.quantity > 0)
    );
  };

  const removeFromCart = (id: string) => {
    setCart(cart.filter((item) => item.id !== id));
  };

  const totalAmount = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setOrderLoading(true);

    try {
      await apiPost<{ id: string; total_amount: number }>('/api/orders', {
        shipping_address: shippingAddress,
        customer_name: customerName,
        customer_email: customerEmail,
        customer_phone: customerPhone,
        items: cart.map((item) => ({
          candle_id: item.id,
          quantity: item.quantity,
        })),
      });

      setOrderSuccess(true);
      setCart([]);
      setTimeout(() => {
        setShowCheckout(false);
        setOrderSuccess(false);
        void loadCandles();
      }, 2000);
    } catch (error) {
      console.error('Order error:', error);
    } finally {
      setOrderLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-12">Loading products...</div>;
  }

  if (showCheckout) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <button
          onClick={() => setShowCheckout(false)}
          className="mb-4 text-orange-600 hover:text-orange-700"
        >
          Back to Cart
        </button>

        {orderSuccess ? (
          <div className="bg-green-50 border border-green-200 rounded-lg p-8 text-center">
            <h2 className="text-2xl font-bold text-green-800 mb-2">Order Placed Successfully!</h2>
            <p className="text-green-600">Thank you for your purchase.</p>
          </div>
        ) : (
          <form onSubmit={handleCheckout} className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-bold mb-6">Checkout</h2>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                required
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                required
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input
                type="tel"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              />
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-1">Shipping Address</label>
              <textarea
                value={shippingAddress}
                onChange={(e) => setShippingAddress(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                rows={3}
                required
              />
            </div>

            <div className="border-t pt-4 mb-6">
              <div className="flex justify-between text-lg font-bold">
                <span>Total:</span>
                <span>${totalAmount.toFixed(2)}</span>
              </div>
            </div>

            <button
              type="submit"
              disabled={orderLoading}
              className="w-full bg-orange-500 text-white py-3 rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50"
            >
              {orderLoading ? 'Processing...' : 'Place Order'}
            </button>
          </form>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Our Candles</h1>
        <button
          onClick={() => setShowCart(!showCart)}
          className="relative bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 transition-colors flex items-center gap-2"
        >
          <ShoppingCart className="w-5 h-5" />
          {cart.length > 0 && (
            <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs w-6 h-6 rounded-full flex items-center justify-center">
              {cart.reduce((sum, item) => sum + item.quantity, 0)}
            </span>
          )}
        </button>
      </div>

      {showCart && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-2xl font-bold mb-4">Shopping Cart</h2>
          {cart.length === 0 ? (
            <p className="text-gray-500">Your cart is empty</p>
          ) : (
            <>
              {cart.map((item) => (
                <div key={item.id} className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 py-4 border-b">
                  <div>
                    <h3 className="font-semibold">{item.name}</h3>
                    <p className="text-sm text-gray-600">${item.price.toFixed(2)} each</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateQuantity(item.id, -1)}
                        className="p-1 hover:bg-gray-100 rounded"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="w-8 text-center">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.id, 1)}
                        className="p-1 hover:bg-gray-100 rounded"
                        disabled={item.quantity >= item.stock_quantity}
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                    <span className="font-semibold w-20 text-right">
                      ${(item.price * item.quantity).toFixed(2)}
                    </span>
                    <button
                      onClick={() => removeFromCart(item.id)}
                      className="text-red-500 hover:text-red-700"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mt-6">
                <span className="text-xl font-bold">Total: ${totalAmount.toFixed(2)}</span>
                <button
                  onClick={() => setShowCheckout(true)}
                  className="bg-orange-500 text-white px-6 py-2 rounded-lg hover:bg-orange-600 transition-colors"
                >
                  Proceed to Checkout
                </button>
              </div>
            </>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {candles.map((candle) => (
          <div key={candle.id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
            <div className="h-48 bg-gradient-to-br from-orange-100 to-amber-100 flex items-center justify-center">
              {candle.image_url ? (
                <img src={candle.image_url} alt={candle.name} className="w-full h-full object-cover" />
              ) : (
                <Flame className="w-20 h-20 text-orange-400" />
              )}
            </div>
            <div className="p-6">
              <h3 className="text-xl font-bold mb-2">{candle.name}</h3>
              <p className="text-gray-600 text-sm mb-4">{candle.description}</p>
              <div className="space-y-1 text-sm text-gray-600 mb-4">
                {candle.scent && <p>Scent: {candle.scent}</p>}
                {candle.size && <p>Size: {candle.size}</p>}
                {candle.burn_time && <p>Burn Time: {candle.burn_time}hrs</p>}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold text-orange-500">${candle.price.toFixed(2)}</span>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Package className="w-4 h-4" />
                  <span>{candle.stock_quantity} in stock</span>
                </div>
              </div>
              <button
                onClick={() => addToCart(candle)}
                disabled={candle.stock_quantity === 0}
                className="w-full mt-4 bg-orange-500 text-white py-2 rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {candle.stock_quantity === 0 ? 'Out of Stock' : 'Add to Cart'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
