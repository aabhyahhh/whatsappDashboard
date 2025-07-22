// Page to display vendors who have requested support calls in the last 24 hours, with a timer for each vendor until 24 hours are up.
// Accessible to both admin and onground users.
import { useEffect, useState } from 'react';
import AdminLayout from '../components/AdminLayout';

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;

interface SupportCallEntry {
  _id: string;
  vendorName: string;
  contactNumber: string;
  timestamp: string;
}

function getTimeLeft(timestamp: string) {
  const now = new Date();
  const received = new Date(timestamp);
  const expires = new Date(received.getTime() + 24 * 60 * 60 * 1000);
  const diff = expires.getTime() - now.getTime();
  if (diff <= 0) return 'Expired';
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);
  return `${hours}h ${minutes}m ${seconds}s`;
}

export default function SupportCalls() {
  const [calls, setCalls] = useState<SupportCallEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchCalls() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${apiBaseUrl}/api/webhook/support-calls`);
        if (!res.ok) throw new Error('Failed to fetch support call requests');
        const data = await res.json();
        setCalls(data);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to fetch support calls');
      } finally {
        setLoading(false);
      }
    }
    fetchCalls();
  }, []);

  // Update timers every second
  useEffect(() => {
    const interval = setInterval(() => {
      // Force re-render for timers
      setCalls((calls) => [...calls]);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <AdminLayout>
      <div className="max-w-3xl mx-auto bg-white p-6 rounded-lg shadow-md mt-8 border border-gray-200">
        <h2 className="text-2xl font-bold mb-6 text-center">Vendors Requesting Support Calls (Next 24h)</h2>
        {loading ? (
          <div className="text-center py-8">Loading...</div>
        ) : error ? (
          <div className="text-center text-red-600 py-8">{error}</div>
        ) : calls.length === 0 ? (
          <div className="text-center text-gray-500 py-8">No vendors have requested support calls in the last 24 hours.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm text-left">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 font-semibold text-gray-700 whitespace-nowrap">#</th>
                  <th className="px-4 py-3 font-semibold text-gray-700 whitespace-nowrap">Vendor Name</th>
                  <th className="px-4 py-3 font-semibold text-gray-700 whitespace-nowrap">Contact Number</th>
                  <th className="px-4 py-3 font-semibold text-gray-700 whitespace-nowrap">Request Time</th>
                  <th className="px-4 py-3 font-semibold text-gray-700 whitespace-nowrap">Time Left</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {calls.map((call, idx) => (
                  <tr key={call._id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap">{idx + 1}</td>
                    <td className="px-4 py-3 whitespace-nowrap font-medium text-gray-900">{call.vendorName}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{call.contactNumber}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-gray-500">{new Date(call.timestamp).toLocaleString()}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-blue-700 font-semibold">
                      {getTimeLeft(call.timestamp)}
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