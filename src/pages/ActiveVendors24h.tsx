import { useEffect, useState } from 'react';
import AdminLayout from '../components/AdminLayout';
const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;

interface Vendor {
  name: string;
  contactNumber: string;
  lastContact: string;
}

interface VendorStats {
  days: { date: string; count: number }[];
  week: { start: string; end: string; count: number };
  month: { month: string; count: number };
}

export default function ActiveVendors24h() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [messageMap, setMessageMap] = useState<{ [contact: string]: string }>({});
  const [sending, setSending] = useState<{ [contact: string]: boolean }>({});

  // New state for stats
  const [stats, setStats] = useState<VendorStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchVendors() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${apiBaseUrl}/api/messages/active-vendor-list-24h`);
        if (!res.ok) throw new Error('Failed to fetch active vendors');
        const data = await res.json();
        setVendors(data);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch vendors');
      } finally {
        setLoading(false);
      }
    }
    fetchVendors();
  }, []);

  useEffect(() => {
    async function fetchStats() {
      setStatsLoading(true);
      setStatsError(null);
      try {
        const res = await fetch(`${apiBaseUrl}/api/messages/active-vendors-stats`);
        if (!res.ok) throw new Error('Failed to fetch vendor stats');
        const data = await res.json();
        setStats(data);
      } catch (err: any) {
        setStatsError(err.message || 'Failed to fetch vendor stats');
      } finally {
        setStatsLoading(false);
      }
    }
    fetchStats();
  }, []);

  const handleSendMessage = async (contactNumber: string) => {
    const message = messageMap[contactNumber];
    if (!message) return;
    setSending(prev => ({ ...prev, [contactNumber]: true }));
    try {
      const res = await fetch(`${apiBaseUrl}/api/messages/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: contactNumber, body: message })
      });
      if (!res.ok) throw new Error('Failed to send message');
      setMessageMap(prev => ({ ...prev, [contactNumber]: '' }));
      alert('Message sent!');
    } catch (err: any) {
      alert(err.message || 'Failed to send message');
    } finally {
      setSending(prev => ({ ...prev, [contactNumber]: false }));
    }
  };

  return (
    <AdminLayout>
      <div className="w-full max-w-6xl mx-auto bg-white p-6 rounded-lg shadow-md mt-8 border border-gray-200">
        <h2 className="text-2xl font-bold mb-6 text-center">Vendors Active in Last 24 Hours</h2>
        {/* Vendor stats summary */}
        <div className="mb-6 flex justify-center">
          <div className="w-full max-w-2xl">
            {statsLoading ? (
              <div className="text-center text-gray-500">Loading vendor stats...</div>
            ) : statsError ? (
              <div className="text-center text-red-600">{statsError}</div>
            ) : stats ? (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
                <div className="mb-2 font-semibold">Active Vendors (Current Week, Monday to Monday):</div>
                <ul className="mb-2 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2 justify-center">
                  {stats.days.map(day => (
                    <li key={day.date} className="text-sm">
                      <span className="font-medium">{day.date}:</span> {day.count}
                    </li>
                  ))}
                </ul>
                <div className="mb-1 text-sm font-medium">Total active this week: <span className="font-bold">{stats.week.count}</span></div>
                <div className="text-sm font-medium">Total active this month: <span className="font-bold">{stats.month.count}</span></div>
              </div>
            ) : null}
          </div>
        </div>
        {loading ? (
          <div className="text-center py-8">Loading...</div>
        ) : error ? (
          <div className="text-center text-red-600 py-8">{error}</div>
        ) : vendors.length === 0 ? (
          <div className="text-center py-8 text-gray-500">No vendors have contacted in the last 24 hours.</div>
        ) : (
          <div>
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Timestamp</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact Number</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {vendors.map((vendor) => (
                  <tr key={vendor.contactNumber}>
                    <td className="px-6 py-4 whitespace-nowrap">{new Date(vendor.lastContact).toLocaleString()}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{vendor.name || <span className="text-gray-400">(No Name)</span>}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{vendor.contactNumber}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col md:flex-row md:items-center gap-2">
                        <button
                          className="text-blue-600 hover:text-blue-900 mr-4 underline"
                          onClick={() => window.location.href = `/dashboard/chat/${vendor.contactNumber}`}
                        >
                          View Chat
                        </button>
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            className="border rounded px-2 py-1 text-sm"
                            placeholder="Type a message..."
                            value={messageMap[vendor.contactNumber] || ''}
                            onChange={e => setMessageMap(prev => ({ ...prev, [vendor.contactNumber]: e.target.value }))}
                            disabled={sending[vendor.contactNumber]}
                            style={{ minWidth: 180 }}
                          />
                          <button
                            className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm"
                            onClick={() => handleSendMessage(vendor.contactNumber)}
                            disabled={sending[vendor.contactNumber] || !(messageMap[vendor.contactNumber] || '').trim()}
                          >
                            {sending[vendor.contactNumber] ? 'Sending...' : 'Send'}
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminLayout>
  );
} 