// frontend/src/pages/admin/UserList.tsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import UserCard from '../../components/UserCard';
import { UserGroupIcon, HomeIcon, UserPlusIcon } from '@heroicons/react/24/outline';
import { API_BASE } from '../../config';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  agency_name: string | null;
  created_at: string;
}

export default function UserList() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      // ✅ FIXED: Use backticks for template literal
      const res = await fetch(`${API_BASE}/api/admin/users`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        }
      });
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: 'Failed to fetch users' }));
        throw new Error(errorData.error || `HTTP ${res.status}: Failed to fetch users`);
      }
      
      const data = await res.json();
      // Handle different response formats
      const usersList = data.users || data.data || data;
      setUsers(Array.isArray(usersList) ? usersList : []);
      setError('');
    } catch (err: any) {
      console.error('Error fetching users:', err);
      setError(err.message || 'Failed to load users');
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (user: User) => {
    navigate(`/admin/users/${user.id}/edit`);
  };

  const handleResetPassword = async (user: User) => {
    if (!confirm(`Send password reset instructions to ${user.name} (${user.email})?`)) return;

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/api/admin/users/${user.id}/reset-password`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        }
      });
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: 'Failed to reset password' }));
        throw new Error(errorData.error || `HTTP ${res.status}: Failed to reset password`);
      }
      
      const data = await res.json();
      alert(data.message || `Password reset instructions sent to ${user.name}`);
    } catch (err: any) {
      console.error('Reset password error:', err);
      alert('Error: ' + err.message);
    }
  };

  const handleDelete = async (user: User) => {
    if (!confirm(`⚠️ Delete user "${user.name}"?\n\nThis action cannot be undone.`)) return;

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/api/admin/users/${user.id}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        }
      });
      
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Failed to delete user' }));
        throw new Error(err.error || `HTTP ${res.status}: Failed to delete user`);
      }
      
      const data = await res.json();
      setUsers(users.filter(u => u.id !== user.id));
      alert(data.message || `User "${user.name}" deleted successfully`);
    } catch (err: any) {
      console.error('Delete error:', err);
      alert('Error: ' + err.message);
    }
  };

  return (
    <div className="p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
          <p className="text-gray-600 mt-1">Manage system users and roles</p>
        </div>
        <div className="mt-4 sm:mt-0 flex flex-wrap gap-3">
          <button
            onClick={() => navigate('/admin')}
            className="flex items-center text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md hover:bg-gray-100"
          >
            <HomeIcon className="h-4 w-4 mr-1" />
            Dashboard
          </button>
          
          <button
            onClick={() => navigate('/admin/users/new')}
            className="flex items-center bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
          >
            <UserGroupIcon className="h-5 w-5 mr-1" />
            Add User
          </button>
          
          <button
            onClick={() => navigate('/admin/focal-nominations')}
            className="flex items-center bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors"
          >
            <UserPlusIcon className="h-5 w-5 mr-1" />
            Manage Focal Nominations
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded border border-red-200">
          <p className="font-medium">Error loading users:</p>
          <p>{error}</p>
          <button 
            onClick={() => fetchUsers()} 
            className="mt-2 text-sm underline hover:no-underline"
          >
            Try Again
          </button>
        </div>
      )}

      {loading ? (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-gray-600">Loading users...</p>
        </div>
      ) : users.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border">
          <UserGroupIcon className="h-12 w-12 text-gray-400 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No users found</h3>
          <p className="text-gray-600 mb-4">Get started by adding your first user to the system.</p>
          <button 
            onClick={() => navigate('/admin/users/new')}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
          >
            Add First User
          </button>
        </div>
      ) : (
        <>
          <div className="mb-4 flex justify-between items-center">
            <p className="text-sm text-gray-600">
              Total users: <span className="font-semibold">{users.length}</span>
            </p>
            <button
              onClick={fetchUsers}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Refresh
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {users.map(user => (
              <UserCard
                key={user.id}
                user={user}
                onEdit={handleEdit}
                onResetPassword={handleResetPassword}
                onDelete={handleDelete}
              />
            ))}
          </div>
        </>
      )}

      <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-md">
        <h3 className="font-medium text-blue-800 mb-2 flex items-center">
          <UserPlusIcon className="h-5 w-5 mr-2" />
          Focal Person Workflow
        </h3>
        <p className="text-sm text-blue-700">
          <strong>Note:</strong> Focal persons should be nominated by Heads of Agency and approved by ACC 
          through the <strong className="font-semibold">Focal Nominations</strong> workflow. Direct creation of focal persons 
          should only be used for emergency situations or system administration purposes.
        </p>
      </div>
    </div>
  );
}