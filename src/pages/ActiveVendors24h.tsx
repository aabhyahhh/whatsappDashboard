/* On this page I want to add a button on top. When clicked the button downloads a pdf file with the data of all the vendors that were active this month on a given day and date. The pdf should have a title "Active Vendors Report" and a subtitle with the date range of the report. Below that, there should be a table with the following columns: Date, Number of Active Vendors. Each row should represent a day in the month and the corresponding number of active vendors on that day. At the bottom of the pdf, there should be a summary section that shows the total number of unique active vendors for the entire month. The pdf should be well-formatted and easy to read. */

import { useEffect, useMemo, useState } from 'react';
import AdminLayout from '../components/AdminLayout';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable'; // ✅ correct usage
const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;

interface Vendor {
  name: string;
  contactNumber: string;
  lastContact: string;
}

interface VendorStats {
  days: { date: string; count: number }[]; // expecting ISO date or yyyy-mm-dd
  week: { start: string; end: string; count: number };
  month: { month: string; count: number }; // e.g. "September 2025"
}

interface PDFReportData {
  month: {
    name: string;
    year: number;
    month: number;
  };
  dailyStats: {
    date: string;
    dayName: string;
    count: number;
  }[];
  weeklyStats: {
    weekStart: string;
    weekEnd: string;
    count: number;
  }[];
  totalMonthlyVendors: number;
  top10Vendors: {
    name: string;
    contactNumber: string;
    firstActivity: string;
    lastActivity: string;
    activityCount: number;
  }[];
  allVendors: number;
}

export default function ActiveVendors24h() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [messageMap, setMessageMap] = useState<{ [contact: string]: string }>({});
  const [sending, setSending] = useState<{ [contact: string]: boolean }>({});

  // Stats state
  const [stats, setStats] = useState<VendorStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState<string | null>(null);

  // PDF Report state
  const [pdfReportData, setPdfReportData] = useState<PDFReportData | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);

  // Helpers
  const pageWidth = (doc: jsPDF) => doc.internal.pageSize.getWidth();
  const fmtDate = (d: Date) =>
    d.toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: '2-digit' });

  // Derive a nice month date range for the subtitle from stats.days
  const monthDateRange = useMemo(() => {
    if (!stats?.days?.length) return null;

    // Parse and sort the days that belong to the reported month
    // If stats.month.month is like "September 2025", constrain to that month
    const [reportMonthName, reportYearStr] = (stats.month.month || '').split(' ');
    const reportYear = Number(reportYearStr);
    const monthIndex = isNaN(reportYear)
      ? null
      : new Date(`${reportMonthName} 1, ${reportYear}`).getMonth();

    const parsed = stats.days
      .map((d) => {
        const dt = new Date(d.date);
        return { ...d, _dt: dt };
      })
      .filter((d) =>
        monthIndex === null
          ? true
          : d._dt.getMonth() === monthIndex && d._dt.getFullYear() === reportYear
      )
      .sort((a, b) => a._dt.getTime() - b._dt.getTime());

    if (!parsed.length) return null;

    const start = parsed[0]._dt;
    const end = parsed[parsed.length - 1]._dt;

    return { start, end };
  }, [stats]);

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
    setSending((prev) => ({ ...prev, [contactNumber]: true }));
    try {
      const res = await fetch(`${apiBaseUrl}/api/messages/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: contactNumber, body: message }),
      });
      if (!res.ok) throw new Error('Failed to send message');
      setMessageMap((prev) => ({ ...prev, [contactNumber]: '' }));
      alert('Message sent!');
    } catch (err: any) {
      alert(err.message || 'Failed to send message');
    } finally {
      setSending((prev) => ({ ...prev, [contactNumber]: false }));
    }
  };

  // Fetch PDF report data
  const fetchPDFReportData = async () => {
    setPdfLoading(true);
    setPdfError(null);
    try {
      const res = await fetch(`${apiBaseUrl}/api/messages/active-vendors-pdf-report`);
      if (!res.ok) throw new Error('Failed to fetch PDF report data');
      const data = await res.json();
      setPdfReportData(data);
      return data;
    } catch (err: any) {
      setPdfError(err.message || 'Failed to fetch PDF report data');
      throw err;
    } finally {
      setPdfLoading(false);
    }
  };

  // Comprehensive PDF generator
  const handleGeneratePDF = async () => {
    try {
      const reportData = await fetchPDFReportData();
      if (!reportData) return;

      const doc = new jsPDF({ unit: 'mm', format: 'a4' });
      const centerX = pageWidth(doc) / 2;
      let currentY = 20;

      // Title
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(20);
      doc.text('Active Vendors Monthly Report', centerX, currentY, { align: 'center' });
      currentY += 8;

      // Subtitle
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(14);
      doc.text(`Report for ${reportData.month.name}`, centerX, currentY, { align: 'center' });
      currentY += 15;

      // Daily Activity Table
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.text('Daily Activity Summary', 14, currentY);
      currentY += 8;

      const dailyTableData = reportData.dailyStats.map(day => [
        new Date(day.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
        day.dayName,
        day.count.toString()
      ]);

      autoTable(doc, {
        startY: currentY,
        head: [['Date', 'Day', 'Active Vendors']],
        body: dailyTableData,
        headStyles: { fillColor: [66, 66, 66], halign: 'center', valign: 'middle' },
        styles: { halign: 'center', cellPadding: 3, fontSize: 9 },
        alternateRowStyles: { fillColor: [245, 245, 245] },
        margin: { left: 14, right: 14 },
        tableLineColor: [200, 200, 200],
        tableLineWidth: 0.1,
      });

      currentY = (doc as any).lastAutoTable?.finalY + 15 || currentY + 50;

      // Weekly Statistics
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.text('Weekly Statistics (Sunday to Sunday)', 14, currentY);
      currentY += 8;

      const weeklyTableData = reportData.weeklyStats.map(week => [
        new Date(week.weekStart).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
        new Date(week.weekEnd).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
        week.count.toString()
      ]);

      autoTable(doc, {
        startY: currentY,
        head: [['Week Start', 'Week End', 'Active Vendors']],
        body: weeklyTableData,
        headStyles: { fillColor: [66, 66, 66], halign: 'center', valign: 'middle' },
        styles: { halign: 'center', cellPadding: 3, fontSize: 9 },
        alternateRowStyles: { fillColor: [245, 245, 245] },
        margin: { left: 14, right: 14 },
        tableLineColor: [200, 200, 200],
        tableLineWidth: 0.1,
      });

      currentY = (doc as any).lastAutoTable?.finalY + 15 || currentY + 50;

      // Top 10 Most Active Vendors
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.text('Top 10 Most Active Vendors', 14, currentY);
      currentY += 8;

      const topVendorsData = reportData.top10Vendors.map((vendor, index) => [
        (index + 1).toString(),
        vendor.name || 'Unknown',
        vendor.contactNumber,
        new Date(vendor.lastActivity).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
        vendor.activityCount.toString()
      ]);

      autoTable(doc, {
        startY: currentY,
        head: [['Rank', 'Name', 'Contact Number', 'Last Activity', 'Messages']],
        body: topVendorsData,
        headStyles: { fillColor: [34, 139, 34], halign: 'center', valign: 'middle' },
        styles: { halign: 'center', cellPadding: 3, fontSize: 8 },
        alternateRowStyles: { fillColor: [240, 248, 255] },
        margin: { left: 14, right: 14 },
        tableLineColor: [200, 200, 200],
        tableLineWidth: 0.1,
        columnStyles: {
          0: { cellWidth: 15 },
          1: { cellWidth: 35 },
          2: { cellWidth: 35 },
          3: { cellWidth: 30 },
          4: { cellWidth: 20 }
        }
      });

      currentY = (doc as any).lastAutoTable?.finalY + 15 || currentY + 50;

      // Summary Section
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.text('Monthly Summary', 14, currentY);
      currentY += 10;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(12);
      doc.text(`Total Unique Active Vendors this Month: ${reportData.totalMonthlyVendors}`, 14, currentY);
      currentY += 6;
      doc.text(`Total Vendors with Activity: ${reportData.allVendors}`, 14, currentY);
      currentY += 6;
      doc.text(`Average Daily Active Vendors: ${Math.round(reportData.dailyStats.reduce((sum, day) => sum + day.count, 0) / reportData.dailyStats.length)}`, 14, currentY);
      currentY += 6;
      doc.text(`Average Weekly Active Vendors: ${Math.round(reportData.weeklyStats.reduce((sum, week) => sum + week.count, 0) / reportData.weeklyStats.length)}`, 14, currentY);

      // Footer
      doc.setFontSize(9);
      doc.text(`Generated on ${new Date().toLocaleDateString('en-IN')} at ${new Date().toLocaleTimeString('en-IN')}`, centerX, doc.internal.pageSize.getHeight() - 10, { align: 'center' });

      // Download
      doc.save(`active-vendors-report-${reportData.month.name.replace(' ', '-').toLowerCase()}.pdf`);
    } catch (err: any) {
      alert(err.message || 'Failed to generate PDF report');
    }
  };

  return (
    <AdminLayout>
      <div className="w-full max-w-6xl mx-auto bg-white p-6 rounded-lg shadow-md mt-8 border border-gray-200">
        {/* ✅ New top bar with Download button */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold">Vendors Active in Last 24 Hours</h2>
          <button
            onClick={handleGeneratePDF}
            disabled={pdfLoading}
            className={`px-4 py-2 rounded text-white ${
              pdfLoading
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-indigo-600 hover:bg-indigo-700'
            }`}
            title={
              pdfLoading
                ? 'Generating PDF report...'
                : 'Download comprehensive monthly report as PDF'
            }
          >
            {pdfLoading ? 'Generating PDF...' : 'Download Monthly Report PDF'}
          </button>
        </div>

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
                  {stats.days.map((day) => (
                    <li key={day.date} className="text-sm">
                      <span className="font-medium">
                        {fmtDate(new Date(day.date))}:
                      </span>{' '}
                      {day.count}
                    </li>
                  ))}
                </ul>
                <div className="mb-1 text-sm font-medium">
                  Total active this week: <span className="font-bold">{stats.week.count}</span>
                </div>
                <div className="text-sm font-medium">
                  Total active this month: <span className="font-bold">{stats.month.count}</span>
                </div>
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
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Timestamp
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contact Number
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {vendors.map((vendor) => (
                  <tr key={vendor.contactNumber}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {new Date(vendor.lastContact).toLocaleString('en-IN')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {vendor.name || <span className="text-gray-400">(No Name)</span>}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">{vendor.contactNumber}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col md:flex-row md:items-center gap-2">
                        <button
                          className="text-blue-600 hover:text-blue-900 mr-4 underline"
                          onClick={() => (window.location.href = `/dashboard/chat/${vendor.contactNumber}`)}
                        >
                          View Chat
                        </button>
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            className="border rounded px-2 py-1 text-sm"
                            placeholder="Type a message..."
                            value={messageMap[vendor.contactNumber] || ''}
                            onChange={(e) =>
                              setMessageMap((prev) => ({ ...prev, [vendor.contactNumber]: e.target.value }))
                            }
                            disabled={sending[vendor.contactNumber]}
                            style={{ minWidth: 180 }}
                          />
                          <button
                            className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm"
                            onClick={() => handleSendMessage(vendor.contactNumber)}
                            disabled={
                              sending[vendor.contactNumber] || !(messageMap[vendor.contactNumber] || '').trim()
                            }
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
