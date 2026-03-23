import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import UserCard from '../../components/UserCard';
import { UserGroupIcon, HomeIcon, UserPlusIcon } from '@heroicons/react/24/outline';

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
      const res = await fetch('/api/admin/users', {
        credentials: 'include' // ✅ Added for consistency
      });
      if (!res.ok) throw new Error('Failed to fetch users');
      const data = await res.json();
      setUsers(data.users);
      setError('');
    } catch (err: any) {
      setError(err.message || 'Failed to load users');
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
      const res = await fetch(`/api/admin/users/${user.id}/reset-password`, {
        method: 'POST',
        credentials: 'include', // ✅ CRITICAL FIX
        headers: {
          'Content-Type': 'application/json'
        }
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to reset password');
      }
      alert(`Password reset instructions sent to ${user.name}`);
    } catch (err: any) {
      alert('Error: ' + err.message);
    }
  };

  const handleDelete = async (user: User) => {
    if (!confirm(`Delete user "${user.name}"? This cannot be undone.`)) return;

    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: 'DELETE',
        credentials: 'include' // ✅ Added for consistency
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to delete user');
      }
      setUsers(users.filter(u => u.id !== user.id));
    } catch (err: any) {
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
            className="flex items-center bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
          >
            <UserGroupIcon className="h-5 w-5 mr-1" />
            Add User
          </button>
          
          <button
            onClick={() => navigate('/admin/focal-nominations')}
            className="flex items-center bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700"
          >
            <UserPlusIcon className="h-5 w-5 mr-1" />
            Manage Focal Nominations
          </button>
        </div>
      </div>

      {error && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">{error}</div>}

      {loading ? (
        <div className="text-center py-8">Loading users...</div>
      ) : users.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          No users found. 
          <button 
            onClick={() => navigate('/admin/users/new')}
            className="ml-1 text-blue-600 font-medium hover:underline"
          >
            Add your first user
          </button>
        </div>
      ) : (
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
      )}

      <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-md">
        <h3 className="font-medium text-blue-800 mb-2">Focal Person Workflow</h3>
        <p className="text-sm text-blue-700">
          <strong>Note:</strong> Focal persons should be nominated by Heads of Agency and approved by ACC 
          through the <strong>Focal Nominations</strong> workflow. Direct creation of focal persons 
          should only be used for emergency situations.
        </p>
      </div>
    </div>
  );
}