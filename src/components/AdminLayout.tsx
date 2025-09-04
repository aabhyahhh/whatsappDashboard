import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  


  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const decodedToken: unknown = jwtDecode(token);
        if (
          typeof decodedToken === 'object' &&
          decodedToken !== null &&
          'role' in decodedToken &&
          typeof (decodedToken as { role: unknown }).role === 'string'
        ) {
          setUserRole((decodedToken as { role: string }).role);
        } else {
          setUserRole(null);
        }
      } catch (error) {
        console.error('Error decoding token:', error);
        localStorage.removeItem('token');
        navigate('/login');
      }
    } else {
      navigate('/login');
    }
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  const isActiveRoute = (path: string) => {
    return location.pathname === path;
  };



  const navItems = [
    {
      name: 'Dashboard',
      path: '/dashboard',
      icon: '📊',
      show: true
    },
    {
      name: 'Contacts',
      path: '/dashboard/contacts',
      icon: '👥',
      show: true
    },
    {
      name: 'OTP Verification',
      path: '/dashboard/otp',
      icon: '🔐',
      show: userRole === 'admin' || userRole === 'super_admin' || userRole === 'onground'
    },
    {
      name: 'User Management',
      path: '/users',
      icon: '👤',
      show: userRole === 'admin' || userRole === 'super_admin' || userRole === 'onground'
    },
    {
      name: 'Admin Management',
      path: '/admin/users',
      icon: '🔧',
      show: userRole === 'super_admin'
    },
    {
      name: 'Loan Reply Log',
      path: '/loan-replies',
      icon: '💸',
      show: userRole === 'admin' || userRole === 'super_admin'
    },
    {
      name: 'Support Calls',
      path: '/support-calls',
      icon: '📞',
      show: userRole === 'admin' || userRole === 'onground' || userRole === 'super_admin'
    },
    {
      name: 'Inactive Vendors',
      path: '/inactive-vendors',
      icon: '⏸️',
      show: userRole === 'admin' || userRole === 'onground' || userRole === 'super_admin'
    },
    {
      name: 'Active Vendors (24h)',
      path: '/dashboard/active-vendors-24h',
      icon: '⏰',
      show: true
    },
    {
      name: 'Message Health',
      path: '/message-health',
      icon: '🏥',
      show: userRole === 'admin' || userRole === 'super_admin'
    },
    {
      name: 'Conversation Management',
      path: '/conversation-management',
      icon: '💬',
      show: userRole === 'admin' || userRole === 'super_admin'
    },
  ];

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col md:flex-row">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-30 md:hidden" onClick={() => setSidebarOpen(false)}>
          <div className="absolute inset-0 bg-black opacity-30" />
        </div>
      )}
      {/* Sidebar */}
      <div
        className={`bg-white shadow-lg flex flex-col w-64 transition-all duration-300 ease-in-out z-40
          fixed top-0 left-0 h-screen
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          md:translate-x-0
        `}
        style={{ minWidth: '256px', height: '100vh' }}
      >
        {/* Sidebar Header */}
        <div className="p-4 border-b border-gray-200 flex-shrink-0 h-16 flex items-center justify-between md:block">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold text-gray-800">WhatsApp Admin</h1>
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 rounded-lg hover:bg-gray-100 md:hidden ml-2"
            >
              {sidebarOpen ? '◀' : '▶'}
            </button>
          </div>
        </div>
        {/* Navigation Menu */}
        <nav className="mt-4 flex-1">
          <ul className="space-y-2">
            {navItems.map((item) => {
              if (!item.show) return null;
              return (
                <li key={item.path}>
                  <button
                    onClick={() => { navigate(item.path); setSidebarOpen(false); }}
                    className={`w-full flex items-center px-4 py-3 text-left transition-colors duration-200 ${
                      isActiveRoute(item.path)
                        ? 'bg-blue-100 text-blue-700 border-r-2 border-blue-700'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <span className="text-lg mr-3">{item.icon}</span>
                    {sidebarOpen && <span className="font-medium">{item.name}</span>}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Sidebar Footer (Logout) */}
        <div className="p-4 border-t border-gray-200 hidden md:block">
          <button
            onClick={handleLogout}
            className={`w-full flex items-center px-4 py-3 text-left text-red-600 hover:bg-red-50 transition-colors duration-200 ${
              sidebarOpen ? 'justify-start' : 'justify-center'
            }`}
          >
            <span className="text-lg mr-3">🚪</span>
            {sidebarOpen && <span className="font-medium">Logout</span>}
          </button>
        </div>
      </div>
      {/* Main Content */}
      <div className="flex-1 flex flex-col md:ml-64">
        {/* Mobile Topbar */}
        <header className="bg-white shadow-sm border-b border-gray-200 px-4 py-3 flex md:hidden items-center justify-between sticky top-0 z-10">
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 rounded-lg hover:bg-gray-100">
            {sidebarOpen ? '◀' : '▶'}
          </button>
          <h2 className="text-xl font-semibold text-gray-800">
            {navItems.find(item => isActiveRoute(item.path))?.name || 'Dashboard'}
          </h2>
          <span className="text-sm text-gray-600">
            {userRole === 'super_admin' ? 'Super Admin' : userRole === 'onground' ? 'Onground' : 'Admin'}
          </span>
        </header>
        {/* Desktop Topbar */}
        <header className="bg-white shadow-sm border-b border-gray-200 px-6 py-4 hidden md:flex items-center justify-between sticky top-0 z-10">
          <h2 className="text-2xl font-semibold text-gray-800">
            {navItems.find(item => isActiveRoute(item.path))?.name || 'Dashboard'}
          </h2>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-600">
              Welcome, {userRole === 'super_admin' ? 'Super Admin' : userRole === 'onground' ? 'Onground' : 'Admin'}
            </span>
          </div>
        </header>
        {/* Page Content */}
        <main className="flex-1 p-2 md:p-6 overflow-x-auto">
          {children}
        </main>
      </div>
    </div>
  );
} 