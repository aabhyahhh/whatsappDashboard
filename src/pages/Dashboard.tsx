import React, { useState, useEffect } from 'react';
import AdminLayout from '../components/AdminLayout';

interface DashboardStats {
  totalContacts: number;
  totalMessages: number;
  recentMessages: number;
  activeContacts: number;
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalContacts: 0,
    totalMessages: 0,
    recentMessages: 0,
    activeContacts: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // TODO: Fetch actual stats from API
    // For now, using mock data
    setTimeout(() => {
      setStats({
        totalContacts: 25,
        totalMessages: 156,
        recentMessages: 12,
        activeContacts: 8
      });
      setLoading(false);
    }, 1000);
  }, []);

  const StatCard = ({ title, value, icon, color }: { title: string; value: number; icon: string; color: string }) => (
    <div className={`bg-white rounded-lg shadow-md p-6 border-l-4 ${color}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-3xl font-bold text-gray-900">{value}</p>
        </div>
        <div className="text-3xl">{icon}</div>
      </div>
    </div>
  );

  const QuickActionCard = ({ title, description, icon, onClick }: { 
    title: string; 
    description: string; 
    icon: string; 
    onClick: () => void;
  }) => (
    <button
      onClick={onClick}
      className="bg-white rounded-lg shadow-md p-6 text-left hover:shadow-lg transition-shadow duration-200 border border-gray-200 hover:border-blue-300"
    >
      <div className="flex items-center mb-4">
        <span className="text-2xl mr-3">{icon}</span>
        <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
      </div>
      <p className="text-gray-600">{description}</p>
    </button>
  );

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Welcome Section */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-6 text-white">
          <h1 className="text-3xl font-bold mb-2">Welcome to WhatsApp Admin Dashboard</h1>
          <p className="text-blue-100">Manage your WhatsApp conversations and contacts efficiently</p>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Total Contacts"
            value={stats.totalContacts}
            icon="👥"
            color="border-blue-500"
          />
          <StatCard
            title="Total Messages"
            value={stats.totalMessages}
            icon="💬"
            color="border-green-500"
          />
          <StatCard
            title="Recent Messages"
            value={stats.recentMessages}
            icon="🆕"
            color="border-yellow-500"
          />
          <StatCard
            title="Active Contacts"
            value={stats.activeContacts}
            icon="��"
            color="border-purple-500"
          />
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <QuickActionCard
              title="View Contacts"
              description="Browse and manage your contact list"
              icon="👥"
              onClick={() => window.location.href = '/dashboard/contacts'}
            />
            <QuickActionCard
              title="OTP Verification"
              description="Send and verify WhatsApp OTP codes"
              icon="🔐"
              onClick={() => window.location.href = '/dashboard/otp'}
            />
            <QuickActionCard
              title="Recent Messages"
              description="View latest conversations"
              icon="💬"
              onClick={() => window.location.href = '/dashboard/contacts'}
            />
            <QuickActionCard
              title="User Management"
              description="Manage system users and permissions"
              icon="👤"
              onClick={() => window.location.href = '/users'}
            />
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Recent Activity</h2>
          <div className="space-y-3">
            <div className="flex items-center p-3 bg-gray-50 rounded-lg">
              <span className="text-green-500 mr-3">🟢</span>
              <div>
                <p className="font-medium text-gray-800">New message received</p>
                <p className="text-sm text-gray-600">From +1234567890 - "Hello, how are you?"</p>
              </div>
              <span className="ml-auto text-xs text-gray-500">2 min ago</span>
            </div>
            <div className="flex items-center p-3 bg-gray-50 rounded-lg">
              <span className="text-blue-500 mr-3">📍</span>
              <div>
                <p className="font-medium text-gray-800">Location shared</p>
                <p className="text-sm text-gray-600">From +9876543210 - Location coordinates received</p>
              </div>
              <span className="ml-auto text-xs text-gray-500">5 min ago</span>
            </div>
            <div className="flex items-center p-3 bg-gray-50 rounded-lg">
              <span className="text-purple-500 mr-3">👥</span>
              <div>
                <p className="font-medium text-gray-800">New contact added</p>
                <p className="text-sm text-gray-600">Contact +5556667777 started conversation</p>
              </div>
              <span className="ml-auto text-xs text-gray-500">10 min ago</span>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
} 