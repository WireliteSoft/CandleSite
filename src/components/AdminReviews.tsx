import { useEffect, useState } from 'react';
import { apiGet, apiPut } from '../lib/api';
import { CheckCircle, XCircle } from 'lucide-react';

interface AdminReview {
  id: string;
  customer_name: string | null;
  customer_email: string | null;
  rating: number;
  title: string | null;
  comment: string;
  status: 'pending' | 'approved' | 'rejected';
  admin_note: string | null;
  created_at: string;
}

export default function AdminReviews() {
  const [reviews, setReviews] = useState<AdminReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    void loadReviews();
  }, []);

  const loadReviews = async () => {
    try {
      const response = await apiGet<{ data: AdminReview[] }>('/api/reviews/admin');
      setReviews(response.data);
    } finally {
      setLoading(false);
    }
  };

  const setStatus = async (id: string, status: AdminReview['status']) => {
    setSavingId(id);
    try {
      await apiPut(`/api/reviews/admin/${id}/status`, { status });
      await loadReviews();
    } catch (error) {
      console.error('Failed to update review status:', error);
    } finally {
      setSavingId(null);
    }
  };

  if (loading) return <div className="text-center py-12">Loading reviews...</div>;

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100">Review Moderation</h1>
      </div>

      <div className="space-y-4">
        {reviews.map((review) => (
          <div key={review.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-5">
            <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
              <div>
                <p className="font-semibold">{review.customer_name || 'Customer'}</p>
                <p className="text-sm text-gray-500">{review.customer_email || '-'}</p>
              </div>
              <span
                className={`px-3 py-1 rounded-full text-xs font-medium ${
                  review.status === 'approved'
                    ? 'bg-green-100 text-green-700'
                    : review.status === 'rejected'
                      ? 'bg-red-100 text-red-700'
                      : 'bg-yellow-100 text-yellow-700'
                }`}
              >
                {review.status}
              </span>
            </div>
            <p className="text-sm text-gray-600 mb-2">Rating: {review.rating}/5</p>
            {review.title && <p className="font-medium mb-1">{review.title}</p>}
            <p className="text-gray-700 dark:text-gray-200">{review.comment}</p>
            <p className="text-xs text-gray-500 mt-2">{new Date(review.created_at).toLocaleString()}</p>
            <div className="flex flex-wrap gap-2 mt-4">
              <button
                onClick={() => void setStatus(review.id, 'approved')}
                disabled={savingId === review.id || review.status === 'approved'}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-green-500 text-white hover:bg-green-600 disabled:opacity-50"
              >
                <CheckCircle className="w-4 h-4" />
                Approve
              </button>
              <button
                onClick={() => void setStatus(review.id, 'rejected')}
                disabled={savingId === review.id || review.status === 'rejected'}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500 text-white hover:bg-red-600 disabled:opacity-50"
              >
                <XCircle className="w-4 h-4" />
                Reject
              </button>
              <button
                onClick={() => void setStatus(review.id, 'pending')}
                disabled={savingId === review.id || review.status === 'pending'}
                className="px-3 py-2 rounded-lg bg-gray-200 text-gray-700 hover:bg-gray-300 disabled:opacity-50"
              >
                Reset Pending
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

