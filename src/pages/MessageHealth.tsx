import { useEffect, useState } from 'react';
import AdminLayout from '../components/AdminLayout';

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;

interface SupportCallReminder {
  contactNumber: string;
  vendorName: string;
  timestamp: string;
  messageId?: string;
  meta?: any;
}

interface LocationUpdateMessage {
  contactNumber: string;
  vendorName: string;
  timestamp: string;
  messageId?: string;
  reminderType: string;
  dispatchType: string;
  openTime: string;
  meta?: any;
}

interface RecentActivityData {
  success: boolean;
  timeRange: {
    from: string;
    to: string;
  };
  supportCallReminders: SupportCallReminder[];
  locationUpdateMessages: LocationUpdateMessage[];
  summary: {
    totalSupportReminders: number;
    totalLocationUpdates: number;
    uniqueVendorsContacted: number;
  };
}

export default function MessageHealth() {
  const [data, setData] = useState<RecentActivityData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchRecentActivity() {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`${apiBaseUrl}/api/message-health/recent-activity`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch recent activity data');
        }
        
        const activityData = await response.json();
        setData(activityData);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch recent activity data');
      } finally {
        setLoading(false);
      }
    }
    
    fetchRecentActivity();
  }, []);

  const handleChatClick = (contactNumber: string) => {
    window.open(`/dashboard/chat/${contactNumber}`, '_blank');
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="max-w-7xl mx-auto bg-white p-6 rounded-lg shadow-md mt-8 border border-gray-200">
          <div className="text-center py-8">Loading recent activity data...</div>
        </div>
      </AdminLayout>
    );
  }

  if (error) {
    return (
      <AdminLayout>
        <div className="max-w-7xl mx-auto bg-white p-6 rounded-lg shadow-md mt-8 border border-gray-200">
          <div className="text-center text-red-600 py-8">{error}</div>
        </div>
      </AdminLayout>
    );
  }

  if (!data) {
    return (
      <AdminLayout>
        <div className="max-w-7xl mx-auto bg-white p-6 rounded-lg shadow-md mt-8 border border-gray-200">
          <div className="text-center text-gray-500 py-8">No recent activity data available</div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto bg-white p-6 rounded-lg shadow-md mt-8 border border-gray-200">
        <h2 className="text-2xl font-bold mb-6 text-center">Recent Message Activity (Last 24 Hours)</h2>
        
        {/* Time Range */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-600">
            <strong>Time Range:</strong> {new Date(data.timeRange.from).toLocaleString()} to {new Date(data.timeRange.to).toLocaleString()}
          </p>
        </div>

        {/* Summary Stats */}
        <div className="mb-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <div className="text-2xl font-bold text-blue-600">{data.summary.totalSupportReminders}</div>
            <div className="text-sm text-gray-600">Support Call Reminders</div>
          </div>
          <div className="bg-green-50 p-4 rounded-lg border border-green-200">
            <div className="text-2xl font-bold text-green-600">{data.summary.totalLocationUpdates}</div>
            <div className="text-sm text-gray-600">Location Update Messages</div>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
            <div className="text-2xl font-bold text-purple-600">{data.summary.uniqueVendorsContacted}</div>
            <div className="text-sm text-gray-600">Unique Vendors Contacted</div>
          </div>
        </div>

        {/* Detailed Message Lists */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Support Call Reminders */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Recent Support Call Reminders</h3>
            <div className="bg-gray-50 rounded-lg p-4 max-h-96 overflow-y-auto">
              {data.supportCallReminders.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No support call reminders in the last 24 hours</p>
              ) : (
                <div className="space-y-2">
                  {data.supportCallReminders.map((reminder, index) => (
                    <div 
                      key={index} 
                      className="bg-white p-3 rounded border hover:bg-blue-50 transition-colors cursor-pointer"
                      onClick={() => handleChatClick(reminder.contactNumber)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">{reminder.vendorName}</p>
                          <p className="text-sm text-blue-600 hover:text-blue-800">
                            {reminder.contactNumber}
                          </p>
                          <p className="text-xs text-gray-500">
                            Sent: {new Date(reminder.timestamp).toLocaleString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <span className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-800">
                            Support
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Vendor Update Location Messages */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Recent Vendor Update Location Messages</h3>
            <div className="bg-gray-50 rounded-lg p-4 max-h-96 overflow-y-auto">
              {data.locationUpdateMessages.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No vendor update location messages in the last 24 hours</p>
              ) : (
                <div className="space-y-2">
                  {data.locationUpdateMessages.map((message, index) => (
                    <div 
                      key={index} 
                      className="bg-white p-3 rounded border hover:bg-green-50 transition-colors cursor-pointer"
                      onClick={() => handleChatClick(message.contactNumber)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">{message.vendorName}</p>
                          <p className="text-sm text-blue-600 hover:text-blue-800">
                            {message.contactNumber}
                          </p>
                          <p className="text-xs text-gray-500">
                            Sent: {new Date(message.timestamp).toLocaleString()}
                          </p>
                          <p className="text-xs text-gray-500">
                            Open time: {message.openTime}
                          </p>
                        </div>
                        <div className="text-right">
                          <span className={`text-xs px-2 py-1 rounded ${
                            message.dispatchType === 'preOpen' ? 'bg-blue-100 text-blue-800' : 
                            message.dispatchType === 'open' ? 'bg-green-100 text-green-800' : 
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {message.dispatchType === 'preOpen' ? '15min' : 
                             message.dispatchType === 'open' ? 'Open' : 
                             message.dispatchType}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}