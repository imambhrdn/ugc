'use client';

import { useState, useEffect } from 'react';
import { useUser, useAuth } from '@clerk/nextjs';

export default function AdminPage() {
  const { userId } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  interface User {
    id: string;
    email: string;
    credits: number;
  }

  const [users, setUsers] = useState<User[]>([]);
  const [apiToken, setApiToken] = useState('');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [checkingAuth, setCheckingAuth] = useState(true);

  // Check if current user is admin by calling the API
  useEffect(() => {
    if (userId) {
      checkAdminStatus();
    }
  }, [userId]);

  const checkAdminStatus = async () => {
    try {
      const response = await fetch('/api/admin/users');
      if (response.status === 403) {
        setIsAdmin(false);
      } else if (response.status === 200) {
        setIsAdmin(true);
        loadUserData();
      } else if (response.status === 401) {
        setIsAdmin(false);
      }
    } catch (error) {
      console.error('Error checking admin status:', error);
      setIsAdmin(false);
    } finally {
      setCheckingAuth(false);
    }
  };

  const loadUserData = async () => {
    try {
      setLoading(true);

      // Load users
      const usersResponse = await fetch('/api/admin/users');
      if (usersResponse.ok) {
        const usersData = await usersResponse.json();
        setUsers(usersData);
      }

      // Load API token
      const tokenResponse = await fetch('/api/admin/token');
      if (tokenResponse.ok) {
        const tokenData = await tokenResponse.json();
        setApiToken(tokenData.token || '');
      }
    } catch (error) {
      console.error('Error loading admin data:', error);
      setMessage('Error loading data');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateCredits = async (userId: string, credits: number) => {
    try {
      const response = await fetch('/api/admin/update-credits', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId, credits }),
      });

      if (response.ok) {
        setMessage('Credits updated successfully');
        loadUserData(); // Reload users to show updated credit count
      } else {
        const errorData = await response.json();
        setMessage(errorData.error || 'Failed to update credits');
      }
    } catch (error) {
      console.error('Error updating credits:', error);
      setMessage('Error updating credits');
    }
  };

  const handleUpdateApiToken = async () => {
    try {
      const response = await fetch('/api/admin/update-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token: apiToken }),
      });

      if (response.ok) {
        setMessage('API token updated successfully');
      } else {
        const errorData = await response.json();
        setMessage(errorData.error || 'Failed to update API token');
      }
    } catch (error) {
      console.error('Error updating API token:', error);
      setMessage('Error updating API token');
    }
  };

  if (checkingAuth) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50">Checking admin status...</div>;
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white p-8 rounded-lg shadow-md text-center">
          <h1 className="text-xl font-bold text-red-600">Access Denied</h1>
          <p className="mt-2 text-gray-600">You must be an admin to access this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-6">Admin Dashboard</h1>

        {message && (
          <div className="mb-4 p-3 bg-blue-100 text-blue-700 rounded-md">
            {message}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* API Token Management */}
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4">API Token Management</h2>
            <div className="space-y-4">
              <div>
                <label htmlFor="apiToken" className="block text-sm font-medium text-gray-700 mb-1">
                  Kie.ai API Token
                </label>
                <input
                  id="apiToken"
                  type="password"
                  value={apiToken}
                  onChange={(e) => setApiToken(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Enter API token"
                />
              </div>
              <button
                onClick={handleUpdateApiToken}
                className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Update API Token
              </button>
            </div>
          </div>

          {/* User Management */}
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4">User Management</h2>
            {loading ? (
              <div className="text-center py-4">Loading users...</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Credits</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {users.map((user) => (
                      <tr key={user.id}>
                        <td className="px-6 py-4 whitespace-nowrap">{user.email}</td>
                        <td className="px-6 py-4 whitespace-nowrap">{user.credits}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <button
                            onClick={() => handleUpdateCredits(user.id, user.credits + 10)}
                            className="text-sm bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 mr-2"
                          >
                            +10
                          </button>
                          <button
                            onClick={() => handleUpdateCredits(user.id, user.credits + 100)}
                            className="text-sm bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 mr-2"
                          >
                            +100
                          </button>
                          <button
                            onClick={() => handleUpdateCredits(user.id, 0)}
                            className="text-sm bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700"
                          >
                            Reset
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}