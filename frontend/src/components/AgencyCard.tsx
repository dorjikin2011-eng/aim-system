import { UsersIcon, DocumentTextIcon } from '@heroicons/react/24/outline';

interface Agency {
  id: string;
  name: string;
  sector: string;
  user_count: number;
  declaration_count: number;
  created_at: string;
}

interface AgencyCardProps {
  agency: Agency;
  onEdit: (agency: Agency) => void;
  onDelete: (agency: Agency) => void;
}

export default function AgencyCard({ agency, onEdit, onDelete }: AgencyCardProps) {
  return (
    <div className="bg-white rounded-lg shadow p-4 hover:shadow-md">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="font-bold text-gray-900">{agency.name}</h3>
          <p className="text-sm text-gray-600 mt-1">{agency.sector}</p>
          <div className="mt-3 flex space-x-4 text-sm text-gray-500">
            <div className="flex items-center">
              <UsersIcon className="h-4 w-4 mr-1" />
              {agency.user_count} users
            </div>
            <div className="flex items-center">
              <DocumentTextIcon className="h-4 w-4 mr-1" />
              {agency.declaration_count} declarations
            </div>
          </div>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => onEdit(agency)}
            className="text-blue-600 hover:text-blue-800"
          >
            Edit
          </button>
          <button
            onClick={() => onDelete(agency)}
            className="text-red-600 hover:text-red-800"
          >
            Delete
          </button>
        </div>
      </div>
      <p className="mt-2 text-xs text-gray-400">
        Added: {new Date(agency.created_at).toLocaleDateString()}
      </p>
    </div>
  );
}