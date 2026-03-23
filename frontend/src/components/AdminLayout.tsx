// frontend/src/components/AdminLayout.tsx
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import accLogo from '../assets/acclogo.png';
import { 
  BuildingOfficeIcon,
  UserGroupIcon,
  Cog6ToothIcon,
  ShieldCheckIcon,
  DocumentTextIcon,
  ClipboardDocumentCheckIcon,
  ArrowRightOnRectangleIcon
} from '@heroicons/react/24/outline';
import ChangePasswordModal from '../components/ChangePasswordModal';

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  
  // ✅ Add state for password modal
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  // ✅ FIXED: Allow both 'system_admin' and 'admin' roles
  if (user?.role !== 'system_admin' && user?.role !== 'admin') {
    navigate('/unauthorized');
    return null;
  }

  const navItems = [
    { name: 'Dashboard', href: '/admin', icon: BuildingOfficeIcon },
    { name: 'Agencies', href: '/admin/agencies', icon: BuildingOfficeIcon },
    { name: 'Users', href: '/admin/users', icon: UserGroupIcon },
    { name: 'Configuration', href: '/admin/config', icon: Cog6ToothIcon },
    { name: 'Audit Logs', href: '/admin/logs', icon: ShieldCheckIcon },
    { name: 'Reports', href: '/admin/reports', icon: DocumentTextIcon },
    { name: 'Assignments', href: '/admin/assignments', icon: ClipboardDocumentCheckIcon },
  ];

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="w-64 bg-white shadow-md">
        <div className="p-4 border-b">
  <div className="flex items-center">
    {/* Logo */}
    <img 
      src={accLogo} 
      alt="ACC Logo" 
      className="h-10 w-auto mr-3"
    />

    {/* Text */}
    <div className="flex flex-col">
      <span className="text-blue-800 font-bold text-lg leading-tight">
        AIMS
      </span>
      <span className="text-xs text-gray-600 leading-tight">
        Agency Integrity Maturity System
      </span>
    </div>
  </div>

  {/* User name below */}
  <p className="text-sm text-gray-500 mt-2">
    {user?.name}
  </p>
</div>
        
        <nav className="mt-4">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                to={item.href}
                className="flex items-center px-4 py-3 text-gray-700 hover:bg-gray-100"
              >
                <Icon className="h-5 w-5 mr-3" />
                {item.name}
              </Link>
            );
          })}
          
          {/* ✅ Add Change Password option */}
          <button
            onClick={() => setShowPasswordModal(true)}
            className="flex items-center px-4 py-3 text-gray-700 hover:bg-gray-100 w-full text-left"
          >
            <Cog6ToothIcon className="h-5 w-5 mr-3" />
            Change Password
          </button>
          
          <div className="absolute bottom-0 w-64 border-t p-4">
            <button
              onClick={logout}
              className="flex items-center w-full text-gray-700 hover:bg-gray-100 px-4 py-3"
            >
              <ArrowRightOnRectangleIcon className="h-5 w-5 mr-3" />
              Logout
            </button>
          </div>
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        {children}
      </div>
      
      {/* ✅ Add ChangePasswordModal */}
      <ChangePasswordModal 
        isOpen={showPasswordModal} 
        onClose={() => setShowPasswordModal(false)} 
      />
    </div>
  );
}