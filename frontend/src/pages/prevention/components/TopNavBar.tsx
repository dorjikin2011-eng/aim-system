// frontend/src/pages/prevention/components/TopNavBar.tsx

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import ChangePasswordModal from '../../../components/ChangePasswordModal';
// Use ?url to force Vite to handle it as an asset
import accLogo from "../../../assets/acclogo.png";

interface Props {
  fiscalYear: string;
  onFiscalYearChange: (fy: string) => void;
}

export default function TopNavBar({ fiscalYear, onFiscalYearChange }: Props) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const fiscalYears = ['2024-25', '2025-26', '2026-27', '2027-28'];

  return (
    <nav className="bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Left: Logo + AIMS Title */}
          <div className="flex items-center">
            <div className="flex-shrink-0 flex items-center">
              {/* ACC Logo */}
              <img 
                src={accLogo} 
                alt="ACC Logo" 
                className="h-10 w-auto mr-3"
              />
              <div className="flex flex-col">
                <span className="text-blue-800 font-bold text-xl leading-tight">AIMS</span>
                <span className="text-xs text-gray-600 leading-tight">Agency Integrity Maturity System</span>
              </div>
            </div>
          </div>

          {/* Center: FY Selector */}
          <div className="flex items-center">
            <span className="text-sm text-gray-600 mr-2">FY:</span>
            <select
              value={fiscalYear}
              onChange={(e) => onFiscalYearChange(e.target.value)}
              className="text-sm border border-gray-300 rounded px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {fiscalYears.map(fy => (
                <option key={fy} value={fy}>{fy}</option>
              ))}
            </select>
          </div>

          {/* Right: Icons + User */}
          <div className="flex items-center space-x-4">
            <button className="p-1 text-gray-500 hover:text-gray-700">
              <span className="sr-only">Notifications</span>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.653V5a2 2 0 10-4 0v.347C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </button>
            
            <div className="relative">
              <button 
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center text-sm focus:outline-none"
              >
                <span className="text-gray-700 mr-2">
                  👤 {user?.name || 'User'}
                </span>
                <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                  <span className="text-blue-800 font-medium">
                    {(user?.name?.charAt(0) || 'U').toUpperCase()}
                  </span>
                </div>
              </button>

              {dropdownOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-10">
                  <a href="#" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">Profile</a>
                  <button 
                    onClick={() => {
                      setDropdownOpen(false);
                      setShowPasswordModal(true);
                    }}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    Change Password
                  </button>
                  <button 
                    onClick={() => {
                      localStorage.removeItem('authToken');
                      navigate('/login');
                    }}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      <ChangePasswordModal 
        isOpen={showPasswordModal} 
        onClose={() => setShowPasswordModal(false)} 
      />
    </nav>
  );
}