// frontend/src/pages/admin/AgencyCreationWizard.tsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BuildingOfficeIcon,
  UserIcon,
  CheckCircleIcon,
  EnvelopeIcon
} from '@heroicons/react/24/outline';

interface AgencyData {
  name: string;
  sector: string;
  contactEmail: string;
  contactPhone: string;
  address: string;
  website?: string;
}

interface HeadOfAgency {
  email: string;
  name: string;
  phone: string;
  position: string;
  existingUserId?: string;
}

interface PotentialUser {
  id: string;
  email: string;
  name: string;
  phone: string;
  position: string;
  currentAgency: string;
  role: string;
  createdAt: string;
}

export default function AgencyCreationWizard() {
  const [step, setStep] = useState(1);
  const [agency, setAgency] = useState<AgencyData>({
    name: '',
    sector: '',
    contactEmail: '',
    contactPhone: '',
    address: '',
    website: ''
  });
  const [hoa, setHoa] = useState<HeadOfAgency>({
    email: '',
    name: '',
    phone: '',
    position: ''
  });
  const [useExistingUser, setUseExistingUser] = useState(false);
  const [sendEmailNotification, setSendEmailNotification] = useState(false); // Default to false for testing
  const [existingUsers, setExistingUsers] = useState<PotentialUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchingUsers, setFetchingUsers] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  // Fetch potential HoAs when needed
  useEffect(() => {
    if (useExistingUser && step === 2) {
      fetchPotentialHoAs();
    }
  }, [useExistingUser, step]);

  const fetchPotentialHoAs = async () => {
    setFetchingUsers(true);
    setError('');
    try {
      const res = await fetch('${API_BASE}/api/admin/agencies/users/potential-hoas', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!res.ok) {
        throw new Error('Failed to fetch users');
      }
      
      const data = await res.json();
      if (data.success) {
        setExistingUsers(data.users);
      } else {
        throw new Error(data.error || 'Failed to fetch users');
      }
    } catch (err: any) {
      setError(`Failed to load existing users: ${err.message}`);
      console.error('Error fetching users:', err);
    } finally {
      setFetchingUsers(false);
    }
  };

  // Step 1: Agency Details
  const Step1 = () => (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Agency Name *
        </label>
        <input
          type="text"
          required
          className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          value={agency.name}
          onChange={e => {
            setAgency({ ...agency, name: e.target.value });
            setError('');
          }}
          placeholder="e.g., Ministry of Health"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Sector/Ministry *
        </label>
        <select
          required
          className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          value={agency.sector}
          onChange={e => {
            setAgency({ ...agency, sector: e.target.value });
            setError('');
          }}
        >
          <option value="">Select Sector</option>
          <option value="health">Health</option>
          <option value="education">Education</option>
          <option value="finance">Finance</option>
          <option value="transport">Transport</option>
          <option value="energy">Energy</option>
          <option value="agriculture">Agriculture</option>
          <option value="tourism">Tourism</option>
          <option value="justice">Justice</option>
          <option value="defense">Defense</option>
          <option value="other">Other</option>
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Contact Email *
          </label>
          <input
            type="email"
            required
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            value={agency.contactEmail}
            onChange={e => {
              setAgency({ ...agency, contactEmail: e.target.value });
              setError('');
            }}
            placeholder="agency@government.bt"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Contact Phone *
          </label>
          <input
            type="tel"
            required
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            value={agency.contactPhone}
            onChange={e => {
              setAgency({ ...agency, contactPhone: e.target.value });
              setError('');
            }}
            placeholder="+975-XXXXXXXX"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Address *
        </label>
        <textarea
          required
          rows={2}
          className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          value={agency.address}
          onChange={e => {
            setAgency({ ...agency, address: e.target.value });
            setError('');
          }}
          placeholder="Full agency address"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Website (Optional)
        </label>
        <input
          type="url"
          className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          value={agency.website}
          onChange={e => {
            setAgency({ ...agency, website: e.target.value });
            setError('');
          }}
          placeholder="https://example.gov.bt"
        />
      </div>
    </div>
  );

  // Step 2: Head of Agency Selection
  const Step2 = () => (
    <div className="space-y-6">
      <div className="mb-4">
        <h3 className="text-lg font-medium text-gray-900 mb-2">Head of Agency Selection</h3>
        <p className="text-sm text-gray-600">
          Choose whether to assign an existing user or create a new Head of Agency
        </p>
      </div>

      <div className="flex items-center space-x-4 mb-6">
        <button
          type="button"
          onClick={() => {
            setUseExistingUser(false);
            setError('');
          }}
          className={`px-4 py-3 rounded-md text-sm font-medium transition-colors ${
            !useExistingUser 
              ? 'bg-blue-100 text-blue-700 border border-blue-300' 
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Create New HoA
        </button>
        <button
          type="button"
          onClick={() => {
            setUseExistingUser(true);
            setError('');
          }}
          className={`px-4 py-3 rounded-md text-sm font-medium transition-colors ${
            useExistingUser 
              ? 'bg-blue-100 text-blue-700 border border-blue-300' 
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Assign Existing User
        </button>
      </div>

      {fetchingUsers && useExistingUser && (
        <div className="p-4 bg-gray-50 rounded-md">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
            <span className="ml-2 text-gray-600">Loading available users...</span>
          </div>
        </div>
      )}

      {useExistingUser ? (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Existing User as HoA *
          </label>
          <select
            required
            className="w-full p-3 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            value={hoa.existingUserId || ''}
            onChange={e => {
              const selectedUser = existingUsers.find(u => u.id === e.target.value);
              if (selectedUser) {
                setHoa({
                  ...hoa,
                  existingUserId: selectedUser.id,
                  email: selectedUser.email,
                  name: selectedUser.name,
                  phone: selectedUser.phone || '',
                  position: selectedUser.position || ''
                });
              }
              setError('');
            }}
            disabled={fetchingUsers}
          >
            <option value="">Select an existing user...</option>
            {existingUsers.map(user => (
              <option key={user.id} value={user.id}>
                {user.name} ({user.email}) - {user.currentAgency} - {user.role}
              </option>
            ))}
          </select>
          
          {hoa.existingUserId && (
            <div className="mt-3 p-3 bg-blue-50 rounded-md">
              <p className="text-sm text-blue-700">
                <strong>Note:</strong> This user will be assigned as Head of Agency for <strong>{agency.name}</strong>. 
                In the next step, you can choose whether to send them an email notification.
              </p>
            </div>
          )}

          {existingUsers.length === 0 && !fetchingUsers && (
            <div className="mt-3 p-3 bg-yellow-50 rounded-md">
              <p className="text-sm text-yellow-700">
                No suitable users found. You may need to create a new Head of Agency.
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              HoA Full Name *
            </label>
            <input
              type="text"
              required
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              value={hoa.name}
              onChange={e => {
                setHoa({ ...hoa, name: e.target.value });
                setError('');
              }}
              placeholder="Full name of Head of Agency"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                HoA Email *
              </label>
              <input
                type="email"
                required
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                value={hoa.email}
                onChange={e => {
                  setHoa({ ...hoa, email: e.target.value });
                  setError('');
                }}
                placeholder="hoa.email@government.bt"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                HoA Phone *
              </label>
              <input
                type="tel"
                required
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                value={hoa.phone}
                onChange={e => {
                  setHoa({ ...hoa, phone: e.target.value });
                  setError('');
                }}
                placeholder="+975-XXXXXXXX"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              HoA Position/Title *
            </label>
            <input
              type="text"
              required
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              value={hoa.position}
              onChange={e => {
                setHoa({ ...hoa, position: e.target.value });
                setError('');
              }}
              placeholder="e.g., Minister, Director General, Secretary"
            />
          </div>

          <div className="p-3 bg-yellow-50 rounded-md">
            <p className="text-sm text-yellow-700">
              <strong>Note:</strong> A new user account will be created for the Head of Agency. 
              In the confirmation step, you can choose whether to send login credentials via email.
            </p>
          </div>
        </div>
      )}
    </div>
  );

  // Step 3: Confirmation
  const Step3 = () => (
    <div className="space-y-6">
      <div className="bg-gray-50 p-4 rounded-md">
        <h3 className="font-medium text-gray-900 mb-2">Agency Details</h3>
        <div className="space-y-1 text-sm">
          <p><span className="text-gray-600">Name:</span> {agency.name}</p>
          <p><span className="text-gray-600">Sector:</span> {agency.sector}</p>
          <p><span className="text-gray-600">Contact Email:</span> {agency.contactEmail}</p>
          <p><span className="text-gray-600">Contact Phone:</span> {agency.contactPhone}</p>
          <p><span className="text-gray-600">Address:</span> {agency.address}</p>
          {agency.website && <p><span className="text-gray-600">Website:</span> {agency.website}</p>}
        </div>
      </div>

      <div className="bg-gray-50 p-4 rounded-md">
        <h3 className="font-medium text-gray-900 mb-2">Head of Agency</h3>
        <div className="space-y-1 text-sm">
          <p><span className="text-gray-600">Name:</span> {hoa.name}</p>
          <p><span className="text-gray-600">Email:</span> {hoa.email}</p>
          <p><span className="text-gray-600">Phone:</span> {hoa.phone}</p>
          <p><span className="text-gray-600">Position:</span> {hoa.position}</p>
          <p className="text-gray-600">
            <span className="font-medium">Type:</span> {useExistingUser ? 'Existing user assigned' : 'New user will be created'}
          </p>
        </div>
      </div>

      {/* Email Notification Checkbox */}
      <div className="p-4 bg-blue-50 rounded-md border border-blue-200">
        <div className="flex items-start">
          <div className="flex items-center h-5">
            <input
              id="send-email-notification"
              type="checkbox"
              checked={sendEmailNotification}
              onChange={(e) => setSendEmailNotification(e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
          </div>
          <div className="ml-3">
            <label htmlFor="send-email-notification" className="font-medium text-gray-900">
              <span className="flex items-center">
                <EnvelopeIcon className="h-4 w-4 mr-1" />
                Email Notification to Head of Agency
              </span>
            </label>
            <div className="mt-1 text-sm text-gray-600">
              <p className="mb-1">
                {sendEmailNotification ? (
                  <span className="text-green-600 font-medium">
                    ✓ Email will be sent to {hoa.email}
                  </span>
                ) : (
                  <span className="text-yellow-600 font-medium">
                    ✗ Email notification will be skipped
                  </span>
                )}
              </p>
              <p className="text-xs">
                {useExistingUser ? (
                  sendEmailNotification 
                    ? 'User will receive notification about their new role as Head of Agency.'
                    : 'User will be assigned without email notification.'
                ) : (
                  sendEmailNotification
                    ? 'New user account will be created and login credentials will be emailed.'
                    : 'New user will be created but no email will be sent. You must manually provide login credentials.'
                )}
              </p>
            </div>
          </div>
        </div>

        {!sendEmailNotification && !useExistingUser && (
          <div className="mt-3 p-3 bg-yellow-50 border border-yellow-100 rounded">
            <p className="text-sm text-yellow-700">
              <strong>Manual Steps Required:</strong> You must provide the temporary password to {hoa.name} 
              at {hoa.email} and instruct them to change it on first login.
            </p>
          </div>
        )}
      </div>

      <div className="p-4 bg-green-50 rounded-md">
        <h4 className="font-medium text-green-900 mb-2">What happens next?</h4>
        <ul className="text-sm text-green-700 space-y-1">
          <li className="flex items-start">
            <CheckCircleIcon className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
            Agency will be added to the system
          </li>
          <li className="flex items-start">
            <CheckCircleIcon className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
            Head of Agency account will be {useExistingUser ? 'updated' : 'created'}
            <span className={`ml-1 font-medium ${sendEmailNotification ? 'text-green-600' : 'text-yellow-600'}`}>
              ({sendEmailNotification ? 'Email will be sent' : 'Email will NOT be sent'})
            </span>
          </li>
          <li className="flex items-start">
            <CheckCircleIcon className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
            HoA will be able to login and nominate focal persons
          </li>
          <li className="flex items-start">
            <CheckCircleIcon className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
            You can assign prevention officers to assess this agency
          </li>
        </ul>
      </div>
    </div>
  );

  const handleSubmit = async () => {
    setLoading(true);
    setError('');

    try {
      const payload = {
        agency,
        hoa,
        useExistingUser,
        sendEmailNotification, // Add email notification flag
      };

      const token = localStorage.getItem('token');
      const res = await fetch('${API_BASE}/api/admin/agencies/create-with-hoa', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to create agency');
      }

      if (!data.success) {
        throw new Error(data.error || 'Operation failed');
      }

      // Success - redirect to agencies list
      navigate('/admin/agencies', {
        state: {
          message: `Successfully created agency "${agency.name}" with Head of Agency "${hoa.name}"`,
          type: 'success',
          emailNotification: data.data?.emailNotification || 'unknown'
        }
      });

    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  const validateStep1 = (): boolean => {
    if (!agency.name.trim()) {
      setError('Agency name is required');
      return false;
    }
    if (!agency.sector.trim()) {
      setError('Sector is required');
      return false;
    }
    if (!agency.contactEmail.trim()) {
      setError('Contact email is required');
      return false;
    }
    if (!agency.contactPhone.trim()) {
      setError('Contact phone is required');
      return false;
    }
    if (!agency.address.trim()) {
      setError('Address is required');
      return false;
    }
    return true;
  };

  const validateStep2 = (): boolean => {
    if (!hoa.name.trim()) {
      setError('Head of Agency name is required');
      return false;
    }
    if (!hoa.email.trim()) {
      setError('Head of Agency email is required');
      return false;
    }
    if (!hoa.phone.trim()) {
      setError('Head of Agency phone is required');
      return false;
    }
    if (!hoa.position.trim()) {
      setError('Head of Agency position is required');
      return false;
    }
    if (useExistingUser && !hoa.existingUserId) {
      setError('Please select an existing user');
      return false;
    }
    return true;
  };

  const nextStep = () => {
    setError('');
    
    if (step === 1) {
      if (!validateStep1()) return;
    } else if (step === 2) {
      if (!validateStep2()) return;
    }
    
    setStep(step + 1);
  };

  const prevStep = () => {
    setStep(step - 1);
    setError('');
  };

  const steps = [
    { number: 1, name: 'Agency Details', icon: BuildingOfficeIcon },
    { number: 2, name: 'Head of Agency', icon: UserIcon },
    { number: 3, name: 'Confirmation', icon: CheckCircleIcon }
  ];

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <button
          onClick={() => navigate('/admin/agencies')}
          className="text-gray-600 hover:text-gray-900 font-medium flex items-center"
        >
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Agencies
        </button>
        <h1 className="text-2xl font-bold mt-2">Create New Agency</h1>
        <p className="text-gray-600 mt-1">Add a new agency and assign its Head of Agency</p>
      </div>

      {/* Step Indicator */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {steps.map((s, index) => (
            <div key={s.number} className="flex items-center">
              <div className={`flex items-center justify-center w-10 h-10 rounded-full ${
                step >= s.number 
                  ? 'bg-blue-600 text-white border-2 border-blue-600' 
                  : 'bg-white text-gray-400 border-2 border-gray-300'
              }`}>
                {step > s.number ? (
                  <CheckCircleIcon className="w-5 h-5" />
                ) : (
                  <s.icon className="w-5 h-5" />
                )}
              </div>
              <span className={`ml-2 text-sm ${step >= s.number ? 'text-blue-600 font-medium' : 'text-gray-500'}`}>
                {s.name}
              </span>
              {index < steps.length - 1 && (
                <div className={`mx-4 w-16 h-0.5 ${step > s.number ? 'bg-blue-600' : 'bg-gray-300'}`} />
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        {error && (
          <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        {/* Step Content */}
        <div className="mb-8">
          {step === 1 && <Step1 />}
          {step === 2 && <Step2 />}
          {step === 3 && <Step3 />}
        </div>

        {/* Navigation Buttons */}
        <div className="flex justify-between pt-6 border-t">
          <div>
            {step > 1 && (
              <button
                type="button"
                onClick={prevStep}
                disabled={loading}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                ← Previous
              </button>
            )}
          </div>

          <div className="flex space-x-3">
            {step < 3 ? (
              <button
                type="button"
                onClick={nextStep}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Next Step →
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 transition-colors flex items-center"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Creating...
                  </>
                ) : (
                  <>
                    <CheckCircleIcon className="w-4 h-4 mr-2" />
                    Create Agency & HoA
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}