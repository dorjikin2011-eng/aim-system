import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function Unauthorized() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleGoHome = () => {
    if (!user) {
      navigate('/login');
      return;
    }
    
    // Redirect to appropriate dashboard based on role
    switch (user.role) {
      case 'commissioner':
        navigate('/commission');
        break;
      case 'director':
        navigate('/director');
        break;
      case 'system_admin':
        navigate('/admin');
        break;
      case 'prevention_officer':
        navigate('/prevention');
        break;
      case 'agency_head':
        navigate('/hoa');
        break;
      case 'focal_person':
        navigate('/focal');
        break;
      default:
        navigate('/login');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-md max-w-md text-center">
        <h2 className="text-2xl font-bold text-red-600 mb-4">Access Denied</h2>
        <p className="text-gray-600 mb-6">
          You don't have permission to access this page.
        </p>
        <button
          onClick={handleGoHome}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Go to Dashboard
        </button>
      </div>
    </div>
  );
}
