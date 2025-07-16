import React, { useEffect, useState } from 'react';
import AdminLayout from '../components/AdminLayout';

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;

interface LoanReplyLogEntry {
  _id: string;
  vendorName: string;
  contactNumber: string;
  timestamp: string;
}

export default function LoanReplyLog() {
  const [logs, setLogs] = useState<LoanReplyLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchLogs() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${apiBaseUrl}/api/webhook/loan-replies`);
        if (!res.ok) throw new Error('Failed to fetch loan reply logs');
        const data = await res.json();
        setLogs(data);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch logs');
      } finally {
        setLoading(false);
      }
    }
    fetchLogs();
  }, []);

  return (
    <AdminLayout>
      <div className="max-w-3xl mx-auto bg-white p-6 rounded-lg shadow-md mt-8 border border-gray-200">
        <h2 className="text-2xl font-bold mb-6 text-center">Vendors Who Replied with "Loan"</h2>
        {loading ? (
          <div className="text-center py-8">Loading...</div>
        ) : error ? (
          <div className="text-center text-red-600 py-8">{error}</div>
        ) : logs.length === 0 ? (
          <div className="text-center text-gray-500 py-8">No vendors have replied with "loan" yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm text-left">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 font-semibold text-gray-700 whitespace-nowrap">#</th>
                  <th className="px-4 py-3 font-semibold text-gray-700 whitespace-nowrap">Vendor Name</th>
                  <th className="px-4 py-3 font-semibold text-gray-700 whitespace-nowrap">Contact Number</th>
                  <th className="px-4 py-3 font-semibold text-gray-700 whitespace-nowrap">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {logs.map((log, idx) => (
                  <tr key={log._id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap">{idx + 1}</td>
                    <td className="px-4 py-3 whitespace-nowrap font-medium text-gray-900">{log.vendorName}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{log.contactNumber}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-gray-500">{new Date(log.timestamp).toLocaleString()}</td>
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