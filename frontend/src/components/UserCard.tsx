// frontend/src/components/UserCard.tsx
import { UserIcon, BuildingOfficeIcon } from '@heroicons/react/24/outline';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  agency_name: string | null;
  created_at: string;
}

interface UserCardProps {
  user: User;
  onEdit: (user: User) => void;
  onResetPassword: (user: User) => void;
  onDelete: (user: User) => void; // ✅ Fixed: removed duplicate "user:"
}

export default function UserCard({ user, onEdit, onResetPassword, onDelete }: UserCardProps) {
  const roleLabels: Record<string, string> = {
    system_admin: 'System Admin',
    prevention_officer: 'Prevention Officer',
    agency_head: 'Agency Head',
    focal_person: 'Focal Person',
    commissioner: 'Commissioner',
    director: 'Director'
  };

  return (
    <div className="bg-white rounded-lg shadow p-4 hover:shadow-md">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="font-bold text-gray-900">{user.name}</h3>
          <p className="text-sm text-gray-600">{user.email}</p>
          <div className="mt-2 flex items-center text-sm">
            <UserIcon className="h-4 w-4 mr-1 text-gray-500" />
            <span className="font-medium">{roleLabels[user.role] || user.role}</span>
          </div>
          {user.agency_name && (
            <div className="mt-1 flex items-center text-sm text-gray-500">
              <BuildingOfficeIcon className="h-4 w-4 mr-1" />
              {user.agency_name}
            </div>
          )}
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => onEdit(user)}
            className="text-blue-600 hover:text-blue-800 text-sm"
          >
            Edit
          </button>
          <button
            onClick={() => onResetPassword(user)}
            className="text-amber-600 hover:text-amber-800 text-sm"
          >
            Reset PW
          </button>
          <button
            onClick={() => onDelete(user)}
            className="text-red-600 hover:text-red-800 text-sm"
          >
            Delete
          </button>
        </div>
      </div>
      <p className="mt-2 text-xs text-gray-400">
        Created: {new Date(user.created_at).toLocaleDateString()}
      </p>
    </div>
  );
}