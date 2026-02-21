import { useEffect, useState } from 'react';
import { apiGet, apiPut } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { Shield, Users } from 'lucide-react';

interface ManagedUser {
  id: string;
  email: string;
  full_name: string | null;
  is_admin: boolean;
  created_at: string;
}

export default function AdminUsers() {
  const { user } = useAuth();
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    void loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const response = await apiGet<{ data: ManagedUser[] }>('/api/users/admin');
      setUsers(response.data);
    } finally {
      setLoading(false);
    }
  };

  const toggleAdmin = async (target: ManagedUser) => {
    setSavingId(target.id);
    try {
      await apiPut(`/api/users/admin/${target.id}`, { is_admin: !target.is_admin });
      await loadUsers();
    } catch (error) {
      console.error('Failed to update role:', error);
    } finally {
      setSavingId(null);
    }
  };

  if (loading) {
    return <div className="text-center py-12">Loading users...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="flex items-center gap-3 mb-8">
        <Users className="w-8 h-8 text-orange-500" />
        <h1 className="text-3xl font-bold text-gray-800">User Management</h1>
      </div>

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Joined</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {users.map((item) => {
              const isCurrentUser = item.id === user?.id;
              return (
                <tr key={item.id}>
                  <td className="px-6 py-4 whitespace-nowrap font-medium">{item.full_name || 'N/A'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{item.email}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {new Date(item.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {item.is_admin ? (
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                        <Shield className="w-3 h-3" />
                        Admin
                      </span>
                    ) : (
                      <span className="inline-flex px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                        User
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <button
                      onClick={() => void toggleAdmin(item)}
                      disabled={savingId === item.id || isCurrentUser}
                      className={`px-3 py-2 rounded-lg text-white ${
                        item.is_admin ? 'bg-red-500 hover:bg-red-600' : 'bg-orange-500 hover:bg-orange-600'
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      {savingId === item.id
                        ? 'Saving...'
                        : item.is_admin
                          ? 'Remove Admin'
                          : 'Make Admin'}
                    </button>
                    {isCurrentUser && (
                      <p className="text-xs text-gray-500 mt-1">You cannot change your own role.</p>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
