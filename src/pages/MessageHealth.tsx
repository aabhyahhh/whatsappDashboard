import { useEffect, useState } from 'react';
import AdminLayout from '../components/AdminLayout';

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;

interface MessageHealthData {
  stats: {
    totalOutboundMessages: number;
    totalSupportCallReminders: number;
    totalVendorUpdateLocationMessages: number;
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

interface TodayMessageHealth {
  today: {
    total: number;
    successful: number;
    failed: number;

  };
  failedMessages: Array<{
    contactNumber: string;
    vendorName: string;
    error: string;
    timestamp: string;
  }>;
  lastUpdated: string;
}

export default function MessageHealth() {
  const [data, setData] = useState<MessageHealthData | null>(null);
  const [todayHealth, setTodayHealth] = useState<TodayMessageHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchHealthData() {
      setLoading(true);
      setError(null);
      try {
        // Fetch all data sources including Meta health data
        const [healthRes, todayRes, metaHealthRes] = await Promise.all([
          fetch(`${apiBaseUrl}/api/webhook/message-health`),
          fetch(`${apiBaseUrl}/api/messages/health`),
          fetch(`${apiBaseUrl}/api/meta-health/meta-health`)
        ]);

        if (!healthRes.ok) throw new Error('Failed to fetch message health data');
        if (!todayRes.ok) throw new Error('Failed to fetch today\'s message health data');

        const healthData = await healthRes.json();
        const todayData = await todayRes.json();
        
        // Merge Meta health data if available
        if (metaHealthRes.ok) {
          const metaHealthData = await metaHealthRes.json();
          // Merge Meta categorized messages into main data
          healthData.categorizedMessages = {
            ...healthData.categorizedMessages,
            ...metaHealthData.categorizedMessages
          };
          // Update stats to include Meta messages
          healthData.stats.totalOutboundMessages += metaHealthData.stats.totalMetaMessages;
        }

        setData(healthData);
        setTodayHealth(todayData);
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

        {/* Today's Message Health */}
        {todayHealth && (
          <div className="mb-8 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
            <h3 className="text-xl font-bold mb-4 text-gray-800">Today's Message Health</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
              <div className="bg-white p-4 rounded-lg shadow-sm border">
                <div className="text-2xl font-bold text-blue-600">{todayHealth.today.total}</div>
                <div className="text-sm text-gray-600">Total Messages</div>
              </div>
              <div className="bg-white p-4 rounded-lg shadow-sm border">
                <div className="text-2xl font-bold text-green-600">{todayHealth.today.successful}</div>
                <div className="text-sm text-gray-600">Successful</div>
              </div>
              <div className="bg-white p-4 rounded-lg shadow-sm border">
                <div className="text-2xl font-bold text-red-600">{todayHealth.today.failed}</div>
                <div className="text-sm text-gray-600">Failed</div>
              </div>

            </div>

            {/* Failed Messages Section */}
            {todayHealth.failedMessages.length > 0 && (
              <div className="bg-white rounded-lg p-4 border border-red-200">
                <h4 className="text-lg font-semibold mb-3 text-red-800">Failed Messages ({todayHealth.failedMessages.length})</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {todayHealth.failedMessages.map((msg, index) => (
                    <div 
                      key={index} 
                      className="group relative bg-red-50 p-3 rounded border border-red-200 hover:bg-red-100 transition-colors cursor-pointer"
                      title={`${msg.vendorName} (${msg.contactNumber}) - ${msg.error}`}
                    >
                      <div className="font-medium text-red-800 truncate">{msg.vendorName}</div>
                      <div className="text-sm text-red-600 truncate">{msg.contactNumber}</div>
                      <div className="text-xs text-red-500 truncate">{msg.error}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        {new Date(msg.timestamp).toLocaleTimeString()}
                      </div>
                      
                      {/* Hover Tooltip */}
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                        <div className="font-medium">{msg.vendorName}</div>
                        <div>{msg.contactNumber}</div>
                        <div className="text-red-300">{msg.error}</div>
                        <div className="text-gray-300 text-xs mt-1">
                          {new Date(msg.timestamp).toLocaleString()}
                        </div>
                        <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="text-xs text-gray-500 mt-4">
              Last updated: {new Date(todayHealth.lastUpdated).toLocaleString()}
            </div>
          </div>
        )}





        {/* Meta Integration Message Details */}
        <div className="mb-8 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
          <h3 className="text-xl font-bold mb-4 text-blue-800">Meta WhatsApp Integration Messages</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(data.categorizedMessages)
              .filter(([type]) => type.startsWith('Meta'))
              .map(([type, messages]) => (
                <div key={type} className="bg-white p-4 rounded-lg shadow-sm border">
                  <h4 className="font-semibold text-blue-600 mb-2">{type}</h4>
                  <div className="text-2xl font-bold text-blue-600 mb-1">{messages.length}</div>
                  <div className="text-sm text-gray-600">Messages Sent</div>
                  {messages.length > 0 && (
                    <div className="mt-2 text-xs text-gray-500">
                      Latest: {new Date(messages[0].timestamp).toLocaleString()}
                    </div>
                  )}
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="space-y-1">
              <h4 className="font-semibold text-blue-600">Meta WhatsApp Integration</h4>
              <p>• <strong>Location Updates:</strong> {(data.stats.messageTypes || []).find(t => t.type === 'Meta Location Update')?.count || 0} sent</p>
              <p>• <strong>Support Prompts:</strong> {(data.stats.messageTypes || []).find(t => t.type === 'Meta Support Prompt')?.count || 0} sent</p>
              <p>• <strong>Support Confirmations:</strong> {(data.stats.messageTypes || []).find(t => t.type === 'Meta Support Confirmation')?.count || 0} sent</p>
              <p>• <strong>Greeting Responses:</strong> {(data.stats.messageTypes || []).find(t => t.type === 'Meta Greeting Response')?.count || 0} sent</p>
              <p>• <strong>Loan Prompts:</strong> {(data.stats.messageTypes || []).find(t => t.type === 'Meta Loan Prompt')?.count || 0} sent</p>
              <p>• <strong>Welcome Messages:</strong> {(data.stats.messageTypes || []).find(t => t.type === 'Meta Welcome Message')?.count || 0} sent</p>
            </div>
            <div className="space-y-1">
              <h4 className="font-semibold text-gray-600">Legacy Twilio Integration</h4>
              <p>• <strong>Vendor Update Location:</strong> {(data.stats.messageTypes || []).find(t => t.type === 'Vendor Reminder')?.count || 0} sent</p>
              <p>• <strong>Support Call Reminders:</strong> {(data.stats.messageTypes || []).find(t => t.type === 'Support Call Reminder')?.count || 0} sent</p>
              <p>• <strong>Loan Support:</strong> {(data.stats.messageTypes || []).find(t => t.type === 'Loan Support')?.count || 0} sent</p>
              <p>• <strong>Welcome Messages:</strong> {(data.stats.messageTypes || []).find(t => t.type === 'Welcome Message')?.count || 0} sent</p>
              <p>• <strong>Greeting Responses:</strong> {(data.stats.messageTypes || []).find(t => t.type === 'Greeting Response')?.count || 0} sent</p>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-gray-300">
            <p className="text-sm text-gray-600">
              <strong>Total Messages:</strong> {data.stats.totalOutboundMessages} | 
              <strong> Support Calls:</strong> {data.stats.totalSupportCallReminders} | 
              <strong> Loan Replies:</strong> {data.stats.totalLoanReplies} | 
              <strong> Unknown:</strong> {data.stats.unknownMessagesCount}
            </p>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
