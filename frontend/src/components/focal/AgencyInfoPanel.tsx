import { BuildingOfficeIcon } from '@heroicons/react/24/outline';

export default function AgencyInfoPanel() {
  // TODO: Fetch actual agency data from API
  const agency = {
    name: 'Ministry of Finance',
    sector: 'Government',
    contactEmail: 'finance@acc.org.bt',
    contactPhone: '+975-2-123456'
  };

  return (
    <div className="bg-white rounded-lg shadow p-6 mb-6">
      <div className="flex items-center mb-4">
        <BuildingOfficeIcon className="h-8 w-8 text-blue-600 mr-3" />
        <h2 className="text-xl font-bold text-gray-900">{agency.name}</h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <p className="text-sm text-gray-600">Sector</p>
          <p className="font-medium">{agency.sector}</p>
        </div>
        <div>
          <p className="text-sm text-gray-600">Contact Email</p>
          <p className="font-medium">{agency.contactEmail}</p>
        </div>
        <div>
          <p className="text-sm text-gray-600">Contact Phone</p>
          <p className="font-medium">{agency.contactPhone}</p>
        </div>
      </div>
    </div>
  );
}
