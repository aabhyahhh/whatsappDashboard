import { useEffect, useState } from 'react';
import AdminLayout from '../components/AdminLayout';

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;

interface MessageHealthData {
  stats: {
    totalOutboundMessages: number;
    totalSupportCallReminders: number;
    totalLoanReplies: number;
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
  loanReplyLogs: Array<{
    vendorName: string;
    contactNumber: string;
    timestamp: string;
    aadharVerified: boolean;
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

        {/* Overall Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600 font-medium">Total Outbound Messages</p>
                <p className={`text-2xl font-bold ${getStatusColor(data.stats.totalOutboundMessages)}`}>
                  {data.stats.totalOutboundMessages}
                </p>
              </div>
              <span className="text-2xl">{getStatusIcon(data.stats.totalOutboundMessages)}</span>
            </div>
          </div>

          <div className="bg-green-50 p-4 rounded-lg border border-green-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-600 font-medium">Support Call Reminders</p>
                <p className={`text-2xl font-bold ${getStatusColor(data.stats.totalSupportCallReminders)}`}>
                  {data.stats.totalSupportCallReminders}
                </p>
              </div>
              <span className="text-2xl">{getStatusIcon(data.stats.totalSupportCallReminders)}</span>
            </div>
          </div>

          <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-purple-600 font-medium">Loan Replies</p>
                <p className={`text-2xl font-bold ${getStatusColor(data.stats.totalLoanReplies)}`}>
                  {data.stats.totalLoanReplies}
                </p>
              </div>
              <span className="text-2xl">{getStatusIcon(data.stats.totalLoanReplies)}</span>
            </div>
          </div>

          <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-orange-600 font-medium">Unknown Messages</p>
                <p className={`text-2xl font-bold ${getStatusColor(data.stats.unknownMessagesCount)}`}>
                  {data.stats.unknownMessagesCount}
                </p>
              </div>
              <span className="text-2xl">{getStatusIcon(data.stats.unknownMessagesCount)}</span>
            </div>
          </div>
        </div>

        {/* Message Types Breakdown */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold mb-4">Message Types Breakdown</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.stats.messageTypes.map((type) => (
              <div key={type.type} className="bg-gray-50 p-4 rounded-lg border">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{type.type}</p>
                    <p className={`text-lg font-bold ${getStatusColor(type.count)}`}>
                      {type.count} messages
                    </p>
                  </div>
                  <span className="text-xl">{getStatusIcon(type.count)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Detailed Message Lists */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Support Call Reminders */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Recent Support Call Reminders</h3>
            <div className="bg-gray-50 rounded-lg p-4 max-h-96 overflow-y-auto">
              {data.supportCallLogs.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No support call reminders in the last 48 hours</p>
              ) : (
                <div className="space-y-2">
                  {data.supportCallLogs.map((log, index) => (
                    <div key={index} className="bg-white p-3 rounded border">
                      <p className="font-medium">{log.contactNumber}</p>
                      <p className="text-sm text-gray-600">
                        Sent: {new Date(log.sentAt).toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Loan Replies */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Recent Loan Replies</h3>
            <div className="bg-gray-50 rounded-lg p-4 max-h-96 overflow-y-auto">
              {data.loanReplyLogs.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No loan replies in the last 48 hours</p>
              ) : (
                <div className="space-y-2">
                  {data.loanReplyLogs.map((log, index) => (
                    <div key={index} className="bg-white p-3 rounded border">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{log.vendorName}</p>
                          <p className="text-sm text-gray-600">{log.contactNumber}</p>
                          <p className="text-xs text-gray-500">
                            {new Date(log.timestamp).toLocaleString()}
                          </p>
                        </div>
                        {log.aadharVerified && (
                          <span className="text-green-600 text-lg">✅</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Unknown Messages */}
        {data.unknownMessages.length > 0 && (
          <div className="mt-8">
            <h3 className="text-lg font-semibold mb-4">Unknown Messages (First 10)</h3>
            <div className="bg-yellow-50 rounded-lg p-4 max-h-96 overflow-y-auto">
              <div className="space-y-2">
                {data.unknownMessages.map((msg, index) => (
                  <div key={index} className="bg-white p-3 rounded border">
                    <p className="font-medium">{msg.to}</p>
                    <p className="text-sm text-gray-600">
                      {new Date(msg.timestamp).toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">{msg.body}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Health Summary */}
        <div className="mt-8 p-4 bg-gray-50 rounded-lg">
          <h3 className="text-lg font-semibold mb-2">Health Summary</h3>
          <div className="space-y-1 text-sm">
            <p>• <strong>Vendor Reminders:</strong> {data.stats.messageTypes.find(t => t.type === 'Vendor Reminder')?.count || 0} sent</p>
            <p>• <strong>Support Call Reminders:</strong> {data.stats.totalSupportCallReminders} sent</p>
            <p>• <strong>Loan Support Messages:</strong> {data.stats.messageTypes.find(t => t.type === 'Loan Support')?.count || 0} sent</p>
            <p>• <strong>Welcome Messages:</strong> {data.stats.messageTypes.find(t => t.type === 'Welcome Message')?.count || 0} sent</p>
            <p>• <strong>Greeting Responses:</strong> {data.stats.messageTypes.find(t => t.type === 'Greeting Response')?.count || 0} sent</p>
            <p>• <strong>Unknown Messages:</strong> {data.stats.unknownMessagesCount} (need investigation)</p>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
