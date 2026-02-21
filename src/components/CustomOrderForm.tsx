import { useState } from 'react';
import { apiPost } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { Sparkles } from 'lucide-react';

export default function CustomOrderForm() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState({
    customer_name: '',
    customer_email: '',
    customer_phone: '',
    scent_preference: '',
    size: '',
    color_preference: '',
    container_type: '',
    special_instructions: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);

    try {
      await apiPost('/api/custom-orders', formData);

      setSuccess(true);
      setFormData({
        customer_name: '',
        customer_email: '',
        customer_phone: '',
        scent_preference: '',
        size: '',
        color_preference: '',
        container_type: '',
        special_instructions: '',
      });

      setTimeout(() => setSuccess(false), 3000);
    } catch (error) {
      console.error('Error submitting custom order:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-md p-8">
        <div className="flex items-center gap-3 mb-6">
          <Sparkles className="w-8 h-8 text-orange-500" />
          <h1 className="text-3xl font-bold text-gray-800">Custom Candle Order</h1>
        </div>

        <p className="text-gray-600 mb-6">
          Create your perfect candle! Fill out the form below and we'll get back to you with a custom quote.
        </p>

        {success && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <p className="text-green-800 font-medium">
              Custom order submitted successfully! We'll contact you soon.
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Your Name *
              </label>
              <input
                type="text"
                value={formData.customer_name}
                onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email *
              </label>
              <input
                type="email"
                value={formData.customer_email}
                onChange={(e) => setFormData({ ...formData, customer_email: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Phone Number
            </label>
            <input
              type="tel"
              value={formData.customer_phone}
              onChange={(e) => setFormData({ ...formData, customer_phone: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Preferred Scent
              </label>
              <input
                type="text"
                value={formData.scent_preference}
                onChange={(e) => setFormData({ ...formData, scent_preference: e.target.value })}
                placeholder="e.g., Lavender, Vanilla, Citrus"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Preferred Size
              </label>
              <select
                value={formData.size}
                onChange={(e) => setFormData({ ...formData, size: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              >
                <option value="">Select a size</option>
                <option value="4oz">4oz</option>
                <option value="8oz">8oz</option>
                <option value="12oz">12oz</option>
                <option value="16oz">16oz</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Color Preference
              </label>
              <input
                type="text"
                value={formData.color_preference}
                onChange={(e) => setFormData({ ...formData, color_preference: e.target.value })}
                placeholder="e.g., White, Cream, Pink"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Container Type
              </label>
              <select
                value={formData.container_type}
                onChange={(e) => setFormData({ ...formData, container_type: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              >
                <option value="">Select container</option>
                <option value="Glass Jar">Glass Jar</option>
                <option value="Tin">Tin</option>
                <option value="Ceramic">Ceramic</option>
                <option value="Wood Bowl">Wood Bowl</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Special Instructions
            </label>
            <textarea
              value={formData.special_instructions}
              onChange={(e) => setFormData({ ...formData, special_instructions: e.target.value })}
              placeholder="Any additional details or special requests..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              rows={4}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-orange-500 text-white py-3 rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {loading ? 'Submitting...' : 'Submit Custom Order Request'}
          </button>
        </form>
      </div>
    </div>
  );
}
