import { useState, useEffect } from 'react';
import { apiGet, apiPut } from '../lib/api';
import { Package, Eye } from 'lucide-react';

interface Order {
  id: string;
  user_id: string | null;
  status: string;
  total_amount: number;
  shipping_address: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  created_at: string;
}

interface OrderItem {
  id: string;
  candle_name: string;
  quantity: number;
  price_at_time: number;
}

export default function AdminOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void loadOrders();
  }, []);

  const loadOrders = async () => {
    try {
      const response = await apiGet<{ data: Order[] }>('/api/orders/admin');
      setOrders(response.data);
    } finally {
      setLoading(false);
    }
  };

  const loadOrderItems = async (orderId: string) => {
    const response = await apiGet<{ data: OrderItem[] }>(`/api/orders/admin/${orderId}/items`);
    setOrderItems(response.data);
  };

  const handleViewOrder = async (order: Order) => {
    setSelectedOrder(order);
    await loadOrderItems(order.id);
  };

  const updateOrderStatus = async (orderId: string, status: string) => {
    await apiPut(`/api/orders/admin/${orderId}/status`, { status });

    await loadOrders();
    if (selectedOrder && selectedOrder.id === orderId) {
      setSelectedOrder({ ...selectedOrder, status });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'processing': return 'bg-blue-100 text-blue-800';
      case 'shipped': return 'bg-purple-100 text-purple-800';
      case 'delivered': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return <div className="text-center py-12">Loading orders...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="flex items-center gap-3 mb-8">
        <Package className="w-8 h-8 text-orange-500" />
        <h1 className="text-3xl font-bold text-gray-800">Order Management</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="p-4 bg-gray-50 border-b">
            <h2 className="text-xl font-bold">All Orders ({orders.length})</h2>
          </div>
          <div className="overflow-y-auto max-h-[600px]">
            {orders.map((order) => (
              <div
                key={order.id}
                className={`p-4 border-b hover:bg-gray-50 cursor-pointer ${
                  selectedOrder?.id === order.id ? 'bg-orange-50' : ''
                }`}
                onClick={() => void handleViewOrder(order)}
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="font-semibold">{order.customer_name}</p>
                    <p className="text-sm text-gray-600">{order.customer_email}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                    {order.status}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-lg font-bold text-orange-500">
                    ${order.total_amount.toFixed(2)}
                  </span>
                  <span className="text-sm text-gray-500">
                    {new Date(order.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md">
          {selectedOrder ? (
            <div>
              <div className="p-4 bg-gray-50 border-b">
                <h2 className="text-xl font-bold">Order Details</h2>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <h3 className="font-semibold text-gray-700 mb-2">Customer Information</h3>
                  <div className="space-y-1 text-sm">
                    <p><span className="font-medium">Name:</span> {selectedOrder.customer_name}</p>
                    <p><span className="font-medium">Email:</span> {selectedOrder.customer_email}</p>
                    {selectedOrder.customer_phone && (
                      <p><span className="font-medium">Phone:</span> {selectedOrder.customer_phone}</p>
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-700 mb-2">Shipping Address</h3>
                  <p className="text-sm whitespace-pre-line">{selectedOrder.shipping_address}</p>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-700 mb-2">Order Items</h3>
                  <div className="space-y-2">
                    {orderItems.map((item) => (
                      <div key={item.id} className="flex justify-between text-sm p-2 bg-gray-50 rounded">
                        <span>{item.candle_name} x {item.quantity}</span>
                        <span className="font-medium">${(item.price_at_time * item.quantity).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between mt-4 pt-4 border-t">
                    <span className="font-bold">Total:</span>
                    <span className="font-bold text-orange-500">${selectedOrder.total_amount.toFixed(2)}</span>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-700 mb-2">Update Status</h3>
                  <select
                    value={selectedOrder.status}
                    onChange={(e) => void updateOrderStatus(selectedOrder.id, e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="pending">Pending</option>
                    <option value="processing">Processing</option>
                    <option value="shipped">Shipped</option>
                    <option value="delivered">Delivered</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>

                <div className="text-xs text-gray-500">
                  <p>Order ID: {selectedOrder.id}</p>
                  <p>Created: {new Date(selectedOrder.created_at).toLocaleString()}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-12 text-center text-gray-500">
              <Eye className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Select an order to view details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
