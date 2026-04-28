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
  
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  // Allow both 'system_admin', 'admin', and 'viewer' roles
  if (user?.role !== 'system_admin' && user?.role !== 'admin' && user?.role !== 'viewer') {
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

  // Filter nav items for viewer role - hide Configuration and Assignments
  const visibleNavItems = user?.role === 'viewer' 
    ? navItems.filter(item => item.name !== 'Configuration' && item.name !== 'Assignments')
    : navItems;

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="w-64 bg-white shadow-md flex flex-col">
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
          
          {/* User name and View Only badge */}
          <div className="mt-2 flex items-center justify-between">
            <p className="text-sm text-gray-500">{user?.name}</p>
            {user?.role === 'viewer' && (
              <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-gray-200 text-gray-700">
                View Only
              </span>
            )}
          </div>
          
          {/* View Only Mode warning banner */}
          {user?.role === 'viewer' && (
            <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded-md">
              <p className="text-xs text-amber-700 flex items-center">
                <span className="mr-1">🔒</span> 
                You are in <strong className="mx-1">Read-Only mode</strong>. 
                You can view data but cannot make changes.
              </p>
            </div>
          )}
        </div>
        
        <nav className="flex-1 mt-4">
          {visibleNavItems.map((item) => {
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
          
          {/* Change Password option - visible to all roles */}
          <button
            onClick={() => setShowPasswordModal(true)}
            className="flex items-center px-4 py-3 text-gray-700 hover:bg-gray-100 w-full text-left"
          >
            <Cog6ToothIcon className="h-5 w-5 mr-3" />
            Change Password
          </button>
        </nav>
        
        {/* Logout button at bottom */}
        <div className="border-t p-4">
          <button
            onClick={logout}
            className="flex items-center w-full text-gray-700 hover:bg-gray-100 px-4 py-3 rounded-md"
          >
            <ArrowRightOnRectangleIcon className="h-5 w-5 mr-3" />
            Logout
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        {children}
      </div>
      
      {/* Change Password Modal */}
      <ChangePasswordModal 
        isOpen={showPasswordModal} 
        onClose={() => setShowPasswordModal(false)} 
      />
    </div>
  );
}