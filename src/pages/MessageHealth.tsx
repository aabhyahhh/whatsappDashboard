import { useEffect, useState } from 'react';
import AdminLayout from '../components/AdminLayout';

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;

interface MessageHealthData {
  stats: {
    totalOutboundMessages: number;
    totalSupportCallReminders: number;
    totalVendorUpdateLocationMessages: number;
    messageTypes: Array<{
      type: string;
      count: number;
    }>;
    unknownMessagesCount: number;
  };
  categorizedMessages: Record<string, Array<{
    to: string;
    timestamp: string;
    body: string;
  }>>;
  unknownMessages: Array<{
    to: string;
    timestamp: string;
    body: string;
  }>;
  supportCallLogs: Array<{
    contactNumber: string;
    sentAt: string;
  }>;
  vendorUpdateLocationLogs: Array<{
    contactNumber: string;
    sentAt: string;
    vendorName: string;
    minutesBefore: string;
    reminderType: string;
    openTime: string;
  }>;
  timeRange: {
    from: string;
    to: string;
  };
}

export default function MessageHealth() {
  const [data, setData] = useState<MessageHealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchHealthData() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${apiBaseUrl}/api/webhook/message-health`);
        if (!res.ok) throw new Error('Failed to fetch message health data');
        const healthData = await res.json();
        setData(healthData);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch health data');
      } finally {
        setLoading(false);
      }
    }
    fetchHealthData();
  }, []);

  const getStatusColor = (count: number) => {
    if (count === 0) return 'text-red-600';
    if (count < 10) return 'text-yellow-600';
    return 'text-green-600';
  };

  const getStatusIcon = (count: number) => {
    if (count === 0) return '❌';
    if (count < 10) return '⚠️';
    return '✅';
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="max-w-7xl mx-auto bg-white p-6 rounded-lg shadow-md mt-8 border border-gray-200">
          <div className="text-center py-8">Loading message health data...</div>
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
          <div className="text-center text-gray-500 py-8">No health data available</div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto bg-white p-6 rounded-lg shadow-md mt-8 border border-gray-200">
        <h2 className="text-2xl font-bold mb-6 text-center">Message Health Check (Last 48 Hours)</h2>
        
        {/* Time Range */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-600">
            <strong>Time Range:</strong> {new Date(data.timeRange.from).toLocaleString()} to {new Date(data.timeRange.to).toLocaleString()}
          </p>
        </div>





        {/* Detailed Message Lists */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Support Call Reminders */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Recent Support Call Reminders</h3>
            <div className="bg-gray-50 rounded-lg p-4 max-h-96 overflow-y-auto">
              {(!data.supportCallLogs || data.supportCallLogs.length === 0) ? (
                <p className="text-gray-500 text-center py-4">No support call reminders in the last 48 hours</p>
              ) : (
                <div className="space-y-2">
                  {(data.supportCallLogs || []).map((log, index) => (
                    <div key={index} className="bg-white p-3 rounded border">
                      <p 
                        className="font-medium text-blue-600 hover:text-blue-800 cursor-pointer"
                        onClick={() => window.open(`/dashboard/chat/${log.contactNumber}`, '_blank')}
                      >
                        {log.contactNumber}
                      </p>
                      <p className="text-sm text-gray-600">
                        Sent: {new Date(log.sentAt).toLocaleString()}
                      </p>
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
              {(!data.vendorUpdateLocationLogs || data.vendorUpdateLocationLogs.length === 0) ? (
                <p className="text-gray-500 text-center py-4">No vendor update location messages in the last 48 hours</p>
              ) : (
                <div className="space-y-2">
                  {(data.vendorUpdateLocationLogs || []).map((log, index) => (
                    <div key={index} className="bg-white p-3 rounded border">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="font-medium">{log.vendorName}</p>
                          <p 
                            className="text-sm text-blue-600 hover:text-blue-800 cursor-pointer"
                            onClick={() => window.open(`/dashboard/chat/${log.contactNumber}`, '_blank')}
                          >
                            {log.contactNumber}
                          </p>
                          <p className="text-xs text-gray-500">
                            Sent: {new Date(log.sentAt).toLocaleString()}
                          </p>
                          <p className="text-xs text-gray-500">
                            {log.minutesBefore} min before opening • Open time: {log.openTime}
                          </p>
                        </div>
                        <div className="text-right">
                          <span className={`text-xs px-2 py-1 rounded ${
                            log.minutesBefore === '15' ? 'bg-blue-100 text-blue-800' : 
                            log.minutesBefore === '0' ? 'bg-green-100 text-green-800' : 
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {log.minutesBefore === '15' ? '15min' : 
                             log.minutesBefore === '0' ? 'Open' : 
                             log.minutesBefore}
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



        {/* Health Summary */}
        <div className="mt-8 p-4 bg-gray-50 rounded-lg">
          <h3 className="text-lg font-semibold mb-2">Health Summary</h3>
          <div className="space-y-1 text-sm">
            <p>• <strong>Vendor Update Location Messages:</strong> {data.stats.totalVendorUpdateLocationMessages} sent</p>
            <p>• <strong>Support Call Reminders:</strong> {data.stats.totalSupportCallReminders} sent</p>
            <p>• <strong>Loan Support Messages:</strong> {(data.stats.messageTypes || []).find(t => t.type === 'Loan Support')?.count || 0} sent</p>
            <p>• <strong>Welcome Messages:</strong> {(data.stats.messageTypes || []).find(t => t.type === 'Welcome Message')?.count || 0} sent</p>
            <p>• <strong>Greeting Responses:</strong> {(data.stats.messageTypes || []).find(t => t.type === 'Greeting Response')?.count || 0} sent</p>

          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
