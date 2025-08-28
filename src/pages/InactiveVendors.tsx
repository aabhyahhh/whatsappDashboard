import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '../components/AdminLayout';

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;

interface InactiveVendor {
  _id: string;
  contactNumber: string;
  name: string;
  lastSeen?: string;
  daysInactive: number;
  reminderSentAt?: string;
  reminderStatus?: string;
  // Handle old API response format
  lastMessage?: string;
  templateReceivedAt?: string;
}

interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  totalCount: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

interface ApiResponse {
  vendors: InactiveVendor[];
  pagination: PaginationInfo;
  performance?: {
    duration: string;
    optimized: boolean;
  };
}

export default function InactiveVendors() {
  const [vendors, setVendors] = useState<InactiveVendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sendingReminders, setSendingReminders] = useState<Set<string>>(new Set());
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [performance, setPerformance] = useState<string>('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchInactiveVendors(currentPage);
  }, [currentPage]);

  const fetchInactiveVendors = async (page: number = 1) => {
    try {
      setLoading(true);
      setError(null);
      const startTime = Date.now();
      
      // Add timeout to prevent hanging requests
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
      
      const response = await fetch(`${apiBaseUrl}/api/webhook/inactive-vendors?page=${page}&limit=50`, {
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch inactive vendors: ${response.status}`);
      }
      
      const data: ApiResponse = await response.json();
      const endTime = Date.now();
      
      // Handle both old and new API formats
      if (data.vendors && data.pagination) {
        // New optimized API format
        setVendors(data.vendors);
        setPagination(data.pagination);
        setPerformance(data.performance?.duration || `${endTime - startTime}ms`);
        
        console.log(`📊 Fetched ${data.vendors.length} vendors in ${data.performance?.duration || endTime - startTime}ms`);
        
        if (data.performance?.optimized) {
          console.log('🚀 Using optimized query');
        }
      } else {
        // Old API format - transform the data
        const transformedData = (data as any).map((vendor: any) => ({
          ...vendor,
          reminderStatus: vendor.reminderStatus || (vendor.templateReceivedAt ? 'Sent' : 'Not sent'),
          reminderSentAt: vendor.reminderSentAt || vendor.templateReceivedAt
        }));
        
        setVendors(transformedData);
        setPagination(null);
        setPerformance(`${endTime - startTime}ms`);
        
        console.log(`📊 Fetched ${transformedData.length} vendors in ${endTime - startTime}ms (legacy format)`);
      }
      
    } catch (err) {
      if (err instanceof Error) {
        if (err.name === 'AbortError') {
          setError('Request timed out. Please try again.');
        } else {
          setError(err.message);
        }
      } else {
        setError('An unexpected error occurred');
      }
      console.error('Error fetching inactive vendors:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSendReminder = async (vendorId: string) => {
    try {
      setSendingReminders(prev => new Set(prev).add(vendorId));
      
      const response = await fetch(`${apiBaseUrl}/api/webhook/send-reminder/${vendorId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log('Reminder sent successfully:', result);
        
        // Update the local state to show the reminder was sent
        setVendors(prev => prev.map(vendor => 
          vendor._id === vendorId 
            ? { 
                ...vendor, 
                reminderStatus: 'Sent', 
                reminderSentAt: new Date().toISOString() 
              }
            : vendor
        ));
        
        // Show success message
        alert('Reminder sent successfully!');
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('Failed to send reminder:', errorData);
        alert(`Failed to send reminder: ${errorData.error || 'Unknown error'}`);
      }
    } catch (err) {
      console.error('Error sending reminder:', err);
      alert('Error sending reminder. Please try again.');
    } finally {
      setSendingReminders(prev => {
        const newSet = new Set(prev);
        newSet.delete(vendorId);
        return newSet;
      });
    }
  };

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-IN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Calculate days inactive if not provided by API
  const getDaysInactive = (lastSeen: string) => {
    const lastSeenDate = new Date(lastSeen);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - lastSeenDate.getTime());
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  };

  if (loading) {
    return (
      <AdminLayout>
        {/* Header Skeleton */}
        <div className="mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex-1">
              <div className="h-6 lg:h-8 bg-gray-200 rounded w-48 lg:w-64 mb-2 animate-pulse"></div>
              <div className="h-3 lg:h-4 bg-gray-200 rounded w-72 lg:w-96 mb-1 animate-pulse"></div>
              <div className="h-3 lg:h-4 bg-gray-200 rounded w-24 lg:w-32 animate-pulse"></div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 lg:gap-4">
              <div className="h-8 lg:h-10 bg-gray-200 rounded w-28 lg:w-32 animate-pulse"></div>
              <div className="h-8 lg:h-10 bg-gray-200 rounded w-16 lg:w-20 animate-pulse"></div>
            </div>
          </div>
        </div>

        {/* Stats Skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6 mb-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className={`bg-white rounded-lg shadow p-4 lg:p-6 ${i === 3 ? 'sm:col-span-2 lg:col-span-1' : ''}`}>
              <div className="flex items-center">
                <div className="p-2 bg-gray-200 rounded-lg w-8 h-8 lg:w-10 lg:h-10 animate-pulse"></div>
                <div className="ml-3 lg:ml-4">
                  <div className="h-3 lg:h-4 bg-gray-200 rounded w-20 lg:w-24 mb-2 animate-pulse"></div>
                  <div className="h-6 lg:h-8 bg-gray-200 rounded w-12 lg:w-16 animate-pulse"></div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Table Skeleton */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-4 lg:px-6 py-3 lg:py-4 border-b border-gray-200">
            <div className="h-5 lg:h-6 bg-gray-200 rounded w-36 lg:w-48 mb-2 animate-pulse"></div>
            <div className="h-3 lg:h-4 bg-gray-200 rounded w-48 lg:w-64 animate-pulse"></div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {['Vendor', 'Phone', 'Last Seen', 'Days Inactive', 'Reminder Status', 'Actions'].map((header) => (
                    <th key={header} className="px-3 lg:px-6 py-2 lg:py-3 text-left">
                      <div className="h-3 lg:h-4 bg-gray-200 rounded w-16 lg:w-20 animate-pulse"></div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {Array.from({ length: 10 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 6 }).map((_, j) => (
                      <td key={j} className="px-3 lg:px-6 py-3 lg:py-4">
                        <div className="h-3 lg:h-4 bg-gray-200 rounded w-20 lg:w-24 animate-pulse"></div>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">Error: {error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <AdminLayout>
        {/* Header */}
        <div className="mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex-1">
              <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Inactive Vendors</h1>
              <p className="text-gray-600 mt-1 lg:mt-2 text-sm lg:text-base">
                Vendors who haven't interacted with the WhatsApp business account for 3 or more consecutive days
              </p>
              {performance && (
                <p className="text-xs lg:text-sm text-green-600 mt-1">
                  ⚡ Loaded in {performance} (optimized)
                </p>
              )}
            </div>
            <div className="flex flex-col sm:flex-row gap-2 lg:gap-4">
              <button
                onClick={() => navigate('/support-calls')}
                className="px-3 py-2 lg:px-4 lg:py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm lg:text-base"
              >
                View Support Calls
              </button>
              <button
                onClick={() => fetchInactiveVendors(currentPage)}
                className="px-3 py-2 lg:px-4 lg:py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm lg:text-base"
              >
                Refresh
              </button>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6 mb-6">
          <div className="bg-white rounded-lg shadow p-4 lg:p-6">
            <div className="flex items-center">
              <div className="p-2 bg-red-100 rounded-lg">
                <svg className="w-5 h-5 lg:w-6 lg:h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div className="ml-3 lg:ml-4">
                <p className="text-xs lg:text-sm font-medium text-gray-600">Total Inactive</p>
                <p className="text-xl lg:text-2xl font-bold text-gray-900">
                  {pagination ? pagination.totalCount : vendors.length}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-4 lg:p-6">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <svg className="w-5 h-5 lg:w-6 lg:h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-3 lg:ml-4">
                <p className="text-xs lg:text-sm font-medium text-gray-600">Reminder Sent</p>
                <p className="text-xl lg:text-2xl font-bold text-gray-900">
                  {vendors.filter(v => v.reminderStatus === 'Sent').length}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-4 lg:p-6 sm:col-span-2 lg:col-span-1">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <svg className="w-5 h-5 lg:w-6 lg:h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-3 lg:ml-4">
                <p className="text-xs lg:text-sm font-medium text-gray-600">No Reminder</p>
                <p className="text-xl lg:text-2xl font-bold text-gray-900">
                  {vendors.filter(v => v.reminderStatus !== 'Sent').length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Vendors Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-4 lg:px-6 py-3 lg:py-4 border-b border-gray-200">
            <h2 className="text-base lg:text-lg font-medium text-gray-900">Inactive Vendor List</h2>
            {pagination && (
              <p className="text-xs lg:text-sm text-gray-500 mt-1">
                {pagination.totalCount > 0 ? (
                  `Showing ${((pagination.currentPage - 1) * 50) + 1} - ${Math.min(pagination.currentPage * 50, pagination.totalCount)} of ${pagination.totalCount} vendors`
                ) : (
                  'No vendors found'
                )}
              </p>
            )}
          </div>
          
          {vendors.length === 0 ? (
            <div className="px-4 lg:px-6 py-8 lg:py-12 text-center">
              <svg className="mx-auto h-8 w-8 lg:h-12 lg:w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3 className="mt-2 text-sm lg:text-base font-medium text-gray-900">No inactive vendors</h3>
              <p className="mt-1 text-xs lg:text-sm text-gray-500">All vendors are active or have responded to reminders.</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 lg:px-6 py-2 lg:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Vendor
                      </th>
                      <th className="px-3 lg:px-6 py-2 lg:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Phone
                      </th>
                      <th className="px-3 lg:px-6 py-2 lg:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Last Seen
                      </th>
                      <th className="px-3 lg:px-6 py-2 lg:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Days Inactive
                      </th>
                      <th className="px-3 lg:px-6 py-2 lg:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Reminder Status
                      </th>
                      <th className="px-3 lg:px-6 py-2 lg:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {vendors.map((vendor) => (
                      <tr key={vendor._id} className="hover:bg-gray-50">
                        <td className="px-3 lg:px-6 py-3 lg:py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-8 w-8 lg:h-10 lg:w-10">
                              <div className="h-8 w-8 lg:h-10 lg:w-10 rounded-full bg-gray-300 flex items-center justify-center">
                                <span className="text-xs lg:text-sm font-medium text-gray-700">
                                  {vendor.name ? vendor.name.charAt(0).toUpperCase() : 'V'}
                                </span>
                              </div>
                            </div>
                            <div className="ml-2 lg:ml-4">
                              <div className="text-xs lg:text-sm font-medium text-gray-900 truncate max-w-24 lg:max-w-32">
                                {vendor.name || 'Unknown Vendor'}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 lg:px-6 py-3 lg:py-4 whitespace-nowrap text-xs lg:text-sm text-gray-900">
                          <span className="truncate block max-w-20 lg:max-w-32">
                            {vendor.contactNumber}
                          </span>
                        </td>
                        <td className="px-3 lg:px-6 py-3 lg:py-4 whitespace-nowrap text-xs lg:text-sm text-gray-500">
                          <span className="truncate block max-w-20 lg:max-w-32">
                            {vendor.lastSeen ? formatDate(vendor.lastSeen) : 'Never active'}
                          </span>
                        </td>
                        <td className="px-3 lg:px-6 py-3 lg:py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            vendor.daysInactive > 7 
                              ? 'bg-red-100 text-red-800' 
                              : vendor.daysInactive > 3 
                              ? 'bg-yellow-100 text-yellow-800' 
                              : 'bg-green-100 text-green-800'
                          }`}>
                            {vendor.daysInactive} days
                          </span>
                        </td>
                        <td className="px-3 lg:px-6 py-3 lg:py-4 whitespace-nowrap">
                          {vendor.reminderStatus === 'Sent' ? (
                            <div className="flex items-center">
                              <svg className="w-3 h-3 lg:w-4 lg:h-4 text-green-500 mr-1 lg:mr-2" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                              <span className="text-xs lg:text-sm text-gray-900">Sent</span>
                              {vendor.reminderSentAt && (
                                <span className="text-xs text-gray-500 ml-1 hidden lg:inline">
                                  {formatDate(vendor.reminderSentAt)}
                                </span>
                              )}
                            </div>
                          ) : (
                            <div className="flex items-center">
                              <svg className="w-3 h-3 lg:w-4 lg:h-4 text-gray-400 mr-1 lg:mr-2" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                              </svg>
                              <span className="text-xs lg:text-sm text-gray-500">Not sent</span>
                            </div>
                          )}
                        </td>
                        <td className="px-3 lg:px-6 py-3 lg:py-4 whitespace-nowrap text-xs lg:text-sm font-medium">
                          <button
                            onClick={() => handleSendReminder(vendor._id)}
                            disabled={vendor.reminderStatus === 'Sent' || sendingReminders.has(vendor._id)}
                            className={`px-2 py-1 lg:px-3 lg:py-1 rounded-md text-xs lg:text-sm font-medium transition-colors ${
                              vendor.reminderStatus === 'Sent' || sendingReminders.has(vendor._id)
                                ? 'text-gray-400 bg-gray-100 cursor-not-allowed'
                                : 'text-blue-600 hover:text-blue-900 bg-blue-50 hover:bg-blue-100'
                            }`}
                          >
                            {sendingReminders.has(vendor._id) 
                              ? 'Sending...' 
                              : vendor.reminderStatus === 'Sent' 
                              ? 'Reminder Sent' 
                              : 'Send Reminder'
                            }
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {/* Pagination */}
              {pagination && pagination.totalPages > 1 && (
                <div className="px-4 lg:px-6 py-3 lg:py-4 border-t border-gray-200">
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
                    <div className="text-xs lg:text-sm text-gray-700">
                      Page {pagination.currentPage} of {pagination.totalPages}
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handlePageChange(pagination.currentPage - 1)}
                        disabled={!pagination.hasPrevPage}
                        className={`px-2 py-1 lg:px-3 lg:py-1 rounded-md text-xs lg:text-sm font-medium ${
                          pagination.hasPrevPage
                            ? 'text-blue-600 hover:text-blue-900 bg-blue-50 hover:bg-blue-100'
                            : 'text-gray-400 bg-gray-100 cursor-not-allowed'
                        }`}
                      >
                        Previous
                      </button>
                      <button
                        onClick={() => handlePageChange(pagination.currentPage + 1)}
                        disabled={!pagination.hasNextPage}
                        className={`px-2 py-1 lg:px-3 lg:py-1 rounded-md text-xs lg:text-sm font-medium ${
                          pagination.hasNextPage
                            ? 'text-blue-600 hover:text-blue-900 bg-blue-50 hover:bg-blue-100'
                            : 'text-gray-400 bg-gray-100 cursor-not-allowed'
                        }`}
                      >
                        Next
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
    </AdminLayout>
  );
} 