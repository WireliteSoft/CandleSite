import { FormEvent, useEffect, useState } from 'react';
import { apiGet, apiPost } from '../lib/api';
import { Star } from 'lucide-react';

interface Review {
  id: string;
  customer_name: string | null;
  rating: number;
  title: string | null;
  comment: string;
  created_at: string;
}

export default function Reviews() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    rating: '5',
    title: '',
    comment: '',
  });

  useEffect(() => {
    void loadReviews();
  }, []);

  const loadReviews = async () => {
    try {
      const res = await apiGet<{ data: Review[] }>('/api/reviews');
      setReviews(res.data);
    } finally {
      setLoading(false);
    }
  };

  const submitReview = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSubmitting(true);
    try {
      await apiPost('/api/reviews', {
        rating: Number(form.rating),
        title: form.title,
        comment: form.comment,
      });
      setSuccess('Review submitted. It will appear once approved by admin.');
      setForm({ rating: '5', title: '', comment: '' });
      await loadReviews();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit review');
    } finally {
      setSubmitting(false);
    }
  };

  const renderStars = (count: number) => (
    <div className="flex items-center gap-1">
      {Array.from({ length: 5 }).map((_, idx) => (
        <Star
          key={idx}
          className={`w-4 h-4 ${idx < count ? 'fill-orange-400 text-orange-400' : 'text-gray-300'}`}
        />
      ))}
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold mb-4">Customer Reviews</h1>
        <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
          Share your experience. Reviews are published after admin approval.
        </p>
        {success && <p className="text-green-600 text-sm mb-3">{success}</p>}
        {error && <p className="text-red-600 text-sm mb-3">{error}</p>}
        <form onSubmit={submitReview} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Rating</label>
            <select
              value={form.rating}
              onChange={(e) => setForm({ ...form, rating: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white dark:bg-gray-800"
            >
              <option value="5">5 Stars</option>
              <option value="4">4 Stars</option>
              <option value="3">3 Stars</option>
              <option value="2">2 Stars</option>
              <option value="1">1 Star</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Title (optional)</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              maxLength={120}
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-1">Review</label>
            <textarea
              value={form.comment}
              onChange={(e) => setForm({ ...form, comment: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              rows={4}
              required
            />
          </div>
          <div className="md:col-span-2">
            <button
              type="submit"
              disabled={submitting}
              className="bg-orange-500 text-white px-5 py-2 rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50"
            >
              {submitting ? 'Submitting...' : 'Submit Review'}
            </button>
          </div>
        </form>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <h2 className="text-xl font-bold mb-4">Published Reviews</h2>
        {loading ? (
          <p>Loading reviews...</p>
        ) : reviews.length === 0 ? (
          <p className="text-gray-500">No approved reviews yet.</p>
        ) : (
          <div className="space-y-4">
            {reviews.map((review) => (
              <div key={review.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <p className="font-semibold">{review.customer_name || 'Customer'}</p>
                  {renderStars(review.rating)}
                </div>
                {review.title && <p className="font-medium mb-1">{review.title}</p>}
                <p className="text-gray-700 dark:text-gray-200">{review.comment}</p>
                <p className="text-xs text-gray-500 mt-2">
                  {new Date(review.created_at).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

