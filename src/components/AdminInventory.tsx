import { useState, useEffect } from 'react';
import { apiDelete, apiGet, apiPost, apiPut, Candle } from '../lib/api';
import { Plus, Edit2, Trash2, Save, X } from 'lucide-react';

export default function AdminInventory() {
  const [candles, setCandles] = useState<Candle[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageError, setImageError] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    stock_quantity: '',
    scent: '',
    size: '',
    burn_time: '',
    image_url: '',
    is_active: true,
  });

  useEffect(() => {
    void loadCandles();
  }, []);

  const loadCandles = async () => {
    try {
      const response = await apiGet<{ data: Candle[] }>('/api/candles/admin');
      setCandles(response.data);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      price: '',
      stock_quantity: '',
      scent: '',
      size: '',
      burn_time: '',
      image_url: '',
      is_active: true,
    });
    setEditingId(null);
    setShowForm(false);
  };

  const handleEdit = (candle: Candle) => {
    setFormData({
      name: candle.name,
      description: candle.description || '',
      price: candle.price.toString(),
      stock_quantity: candle.stock_quantity.toString(),
      scent: candle.scent || '',
      size: candle.size || '',
      burn_time: candle.burn_time?.toString() || '',
      image_url: candle.image_url || '',
      is_active: Boolean(candle.is_active),
    });
    setEditingId(candle.id);
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const candleData = {
      name: formData.name,
      description: formData.description || null,
      price: parseFloat(formData.price),
      stock_quantity: parseInt(formData.stock_quantity, 10),
      scent: formData.scent || null,
      size: formData.size || null,
      burn_time: formData.burn_time ? parseInt(formData.burn_time, 10) : null,
      image_url: formData.image_url || null,
      is_active: formData.is_active,
    };

    if (editingId) {
      await apiPut(`/api/candles/admin/${editingId}`, candleData);
    } else {
      await apiPost('/api/candles/admin', candleData);
    }

    await loadCandles();
    resetForm();
  };

  const toDataUrl = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error('Failed to read image file'));
      reader.readAsDataURL(file);
    });

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImageError('');
    if (!file.type.startsWith('image/')) {
      setImageError('Please choose an image file.');
      return;
    }

    // Keep payload sizes reasonable for D1 text storage.
    if (file.size > 2 * 1024 * 1024) {
      setImageError('Image is too large. Use a file under 2MB.');
      return;
    }

    setUploadingImage(true);
    try {
      const dataUrl = await toDataUrl(file);
      setFormData((prev) => ({ ...prev, image_url: dataUrl }));
    } catch (error) {
      console.error('Image upload failed:', error);
      setImageError('Failed to process image.');
    } finally {
      setUploadingImage(false);
      e.target.value = '';
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this candle?')) {
      await apiDelete(`/api/candles/admin/${id}`);
      await loadCandles();
    }
  };

  const toggleActive = async (id: string, isActive: boolean) => {
    const candle = candles.find((c) => c.id === id);
    if (!candle) return;
    await apiPut(`/api/candles/admin/${id}`, {
      ...candle,
      is_active: !isActive,
    });
    await loadCandles();
  };

  if (loading) {
    return <div className="text-center py-12">Loading inventory...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Inventory Management</h1>
        <button
          onClick={() => setShowForm(true)}
          className="bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 transition-colors flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Add Candle
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold">
              {editingId ? 'Edit Candle' : 'Add New Candle'}
            </h2>
            <button onClick={resetForm} className="text-gray-500 hover:text-gray-700">
              <X className="w-6 h-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Price *</label>
              <input
                type="number"
                step="0.01"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Stock Quantity *</label>
              <input
                type="number"
                value={formData.stock_quantity}
                onChange={(e) => setFormData({ ...formData, stock_quantity: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Scent</label>
              <input
                type="text"
                value={formData.scent}
                onChange={(e) => setFormData({ ...formData, scent: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Size</label>
              <input
                type="text"
                value={formData.size}
                onChange={(e) => setFormData({ ...formData, size: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                placeholder="e.g., 8oz, 12oz"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Burn Time (hours)</label>
              <input
                type="number"
                value={formData.burn_time}
                onChange={(e) => setFormData({ ...formData, burn_time: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                rows={3}
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Image URL</label>
              <input
                type="url"
                value={formData.image_url}
                onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                placeholder="https://example.com/image.jpg"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Upload Image</label>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white"
              />
              <p className="text-xs text-gray-500 mt-1">
                Upload an image or paste an image URL above. Max file size: 2MB.
              </p>
              {uploadingImage && <p className="text-sm text-orange-600 mt-1">Processing image...</p>}
              {imageError && <p className="text-sm text-red-600 mt-1">{imageError}</p>}
              {formData.image_url && (
                <img
                  src={formData.image_url}
                  alt="Candle preview"
                  className="mt-3 h-24 w-24 object-cover rounded-lg border border-gray-200"
                />
              )}
            </div>

            <div className="md:col-span-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-4 h-4"
                />
                <span className="text-sm font-medium text-gray-700">Active (visible in shop)</span>
              </label>
            </div>

            <div className="md:col-span-2 flex gap-4">
              <button
                type="submit"
                className="flex-1 bg-orange-500 text-white py-2 rounded-lg hover:bg-orange-600 transition-colors flex items-center justify-center gap-2"
              >
                <Save className="w-5 h-5" />
                {editingId ? 'Update' : 'Create'} Candle
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Scent</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Size</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Price</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stock</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {candles.map((candle) => (
              <tr key={candle.id}>
                <td className="px-6 py-4 whitespace-nowrap font-medium">{candle.name}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{candle.scent || '-'}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{candle.size || '-'}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">${candle.price.toFixed(2)}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <span className={candle.stock_quantity === 0 ? 'text-red-600 font-medium' : ''}>
                    {candle.stock_quantity}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <button
                    onClick={() => void toggleActive(candle.id, Boolean(candle.is_active))}
                    className={`px-3 py-1 rounded-full text-xs font-medium ${
                      candle.is_active
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {candle.is_active ? 'Active' : 'Inactive'}
                  </button>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(candle)}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => void handleDelete(candle.id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
