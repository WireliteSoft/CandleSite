import { useState, useEffect } from 'react';
import { apiGet, apiPut } from '../lib/api';
import { Sparkles, Eye } from 'lucide-react';

interface CustomOrder {
  id: string;
  user_id: string | null;
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  scent_preference: string | null;
  size: string | null;
  color_preference: string | null;
  container_type: string | null;
  special_instructions: string | null;
  status: string;
  estimated_price: number | null;
  created_at: string;
}

export default function AdminCustomOrders() {
  const [orders, setOrders] = useState<CustomOrder[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<CustomOrder | null>(null);
  const [estimatedPrice, setEstimatedPrice] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void loadOrders();
  }, []);

  const loadOrders = async () => {
    try {
      const response = await apiGet<{ data: CustomOrder[] }>('/api/custom-orders/admin');
      setOrders(response.data);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (orderId: string, status: string) => {
    await apiPut(`/api/custom-orders/admin/${orderId}/status`, { status });

    await loadOrders();
    if (selectedOrder && selectedOrder.id === orderId) {
      setSelectedOrder({ ...selectedOrder, status });
    }
  };

  const updatePrice = async (orderId: string) => {
    if (!estimatedPrice) return;

    await apiPut(`/api/custom-orders/admin/${orderId}/price`, {
      estimated_price: parseFloat(estimatedPrice),
    });

    await loadOrders();
    if (selectedOrder && selectedOrder.id === orderId) {
      setSelectedOrder({
        ...selectedOrder,
        estimated_price: parseFloat(estimatedPrice),
      });
    }
    setEstimatedPrice('');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return <div className="text-center py-12">Loading custom orders...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="flex items-center gap-3 mb-8">
        <Sparkles className="w-8 h-8 text-orange-500" />
        <h1 className="text-3xl font-bold text-gray-800">Custom Candle Orders</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="p-4 bg-gray-50 border-b">
            <h2 className="text-xl font-bold">All Custom Requests ({orders.length})</h2>
          </div>
          <div className="overflow-y-auto max-h-[600px]">
            {orders.map((order) => (
              <div
                key={order.id}
                className={`p-4 border-b hover:bg-gray-50 cursor-pointer ${
                  selectedOrder?.id === order.id ? 'bg-orange-50' : ''
                }`}
                onClick={() => {
                  setSelectedOrder(order);
                  setEstimatedPrice(order.estimated_price?.toString() || '');
                }}
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="font-semibold">{order.customer_name}</p>
                    <p className="text-sm text-gray-600">{order.customer_email}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                    {order.status.replace('_', ' ')}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <div className="text-sm text-gray-600">
                    {order.scent_preference && <span>{order.scent_preference}</span>}
                    {order.size && <span> | {order.size}</span>}
                  </div>
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
                <h2 className="text-xl font-bold">Request Details</h2>
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
                  <h3 className="font-semibold text-gray-700 mb-2">Candle Specifications</h3>
                  <div className="space-y-2 text-sm">
                    {selectedOrder.scent_preference && (
                      <div className="flex justify-between p-2 bg-gray-50 rounded">
                        <span className="text-gray-600">Scent:</span>
                        <span className="font-medium">{selectedOrder.scent_preference}</span>
                      </div>
                    )}
                    {selectedOrder.size && (
                      <div className="flex justify-between p-2 bg-gray-50 rounded">
                        <span className="text-gray-600">Size:</span>
                        <span className="font-medium">{selectedOrder.size}</span>
                      </div>
                    )}
                    {selectedOrder.color_preference && (
                      <div className="flex justify-between p-2 bg-gray-50 rounded">
                        <span className="text-gray-600">Color:</span>
                        <span className="font-medium">{selectedOrder.color_preference}</span>
                      </div>
                    )}
                    {selectedOrder.container_type && (
                      <div className="flex justify-between p-2 bg-gray-50 rounded">
                        <span className="text-gray-600">Container:</span>
                        <span className="font-medium">{selectedOrder.container_type}</span>
                      </div>
                    )}
                  </div>
                </div>

                {selectedOrder.special_instructions && (
                  <div>
                    <h3 className="font-semibold text-gray-700 mb-2">Special Instructions</h3>
                    <p className="text-sm p-3 bg-gray-50 rounded whitespace-pre-line">
                      {selectedOrder.special_instructions}
                    </p>
                  </div>
                )}

                <div>
                  <h3 className="font-semibold text-gray-700 mb-2">Estimated Price</h3>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      step="0.01"
                      value={estimatedPrice}
                      onChange={(e) => setEstimatedPrice(e.target.value)}
                      placeholder="Enter price"
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg"
                    />
                    <button
                      onClick={() => void updatePrice(selectedOrder.id)}
                      className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
                    >
                      Update
                    </button>
                  </div>
                  {selectedOrder.estimated_price && (
                    <p className="text-sm text-gray-600 mt-1">
                      Current: ${selectedOrder.estimated_price.toFixed(2)}
                    </p>
                  )}
                </div>

                <div>
                  <h3 className="font-semibold text-gray-700 mb-2">Update Status</h3>
                  <select
                    value={selectedOrder.status}
                    onChange={(e) => void updateStatus(selectedOrder.id, e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="pending">Pending</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>

                <div className="text-xs text-gray-500 pt-4 border-t">
                  <p>Order ID: {selectedOrder.id}</p>
                  <p>Submitted: {new Date(selectedOrder.created_at).toLocaleString()}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-12 text-center text-gray-500">
              <Eye className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Select a custom order to view details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
