import { useState, useEffect } from 'react';
import AdminLayout from '../components/AdminLayout';
const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;

interface Contact {
  _id: string;
  phone: string;
  lastSeen: string;
  createdAt: string;
  updatedAt: string;
  name?: string;
}

interface UserContact {
  contactNumber: string;
  name: string;
}

export default function Contacts() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [userContacts, setUserContacts] = useState<UserContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchContacts = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${apiBaseUrl}/api/contacts`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch contacts');
        }
        
        const data = await response.json();
        setContacts(data);
      } catch (error) {
        console.error('Error fetching contacts:', error);
        setError('Failed to load contacts');
      } finally {
        setLoading(false);
      }
    };

    const fetchUserContacts = async () => {
      try {
        const response = await fetch(`${apiBaseUrl}/api/users/user-contacts`);
        if (!response.ok) throw new Error('Failed to fetch user contacts');
        const data = await response.json();
        setUserContacts(data);
      } catch (error) {
        console.error('Error fetching user contacts:', error);
      }
    };

    fetchContacts();
    fetchUserContacts();
  }, []);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const formatLastSeen = (lastSeen: string) => {
    const date = new Date(lastSeen);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return date.toLocaleDateString();
  };

  // Add send message handler
  const handleSendMessage = async (phone: string) => {
    const message = window.prompt('Enter the message to send:');
    if (!message) return;
    try {
      const response = await fetch(`${apiBaseUrl}/api/messages/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: phone, body: message })
      });
      const data = await response.json();
      if (response.ok) {
        alert('Message sent successfully!');
      } else {
        alert('Failed to send message: ' + (data.error || 'Unknown error'));
      }
    } catch (err) {
      alert('Failed to send message: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </AdminLayout>
    );
  }

  if (error) {
    return (
      <AdminLayout>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">Error: {error}</p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Contacts</h1>
          <p className="text-gray-600">Manage your WhatsApp contacts and view conversation history</p>
        </div>

        {/* Incoming Contacts (Blue) */}
        {contacts.length > 0 && (
          <div className="bg-white rounded-lg shadow-md">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-blue-700">Incoming Contacts</h2>
              <p className="text-gray-600 mt-1">Total incoming: {contacts.length}</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Phone Number
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Last Seen
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Created
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {contacts.map((contact) => (
                    <tr key={contact._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            <div className="h-10 w-10 rounded-full bg-blue-500 flex items-center justify-center">
                              <span className="text-white font-medium">
                                {contact.phone ? contact.phone.slice(-2) : ''}
                              </span>
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {contact.phone}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatLastSeen(contact.lastSeen)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(contact.createdAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => window.location.href = `/dashboard/chat/${contact.phone}`}
                          className="text-blue-600 hover:text-blue-900 mr-4"
                        >
                          View Chat
                        </button>
                        <button className="text-green-600 hover:text-green-900" onClick={() => handleSendMessage(contact.phone)}>
                          Send Message
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Outgoing Contacts (Green) */}
        {userContacts.length > 0 && (
          <div className="bg-white rounded-lg shadow-md">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-green-700">Outgoing Contacts</h2>
              <p className="text-gray-600 mt-1">Total outgoing: {userContacts.length}</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Phone Number
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {userContacts.map((user) => (
                    <tr key={user.contactNumber} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            <div className="h-10 w-10 rounded-full bg-green-500 flex items-center justify-center">
                              <span className="text-white font-medium">
                                {user.contactNumber ? user.contactNumber.slice(-2) : ''}
                              </span>
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {user.name}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {user.contactNumber}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => window.location.href = `/dashboard/chat/${user.contactNumber}`}
                          className="text-blue-600 hover:text-blue-900 mr-4"
                        >
                          View Chat
                        </button>
                        <button className="text-green-600 hover:text-green-900" onClick={() => handleSendMessage(user.contactNumber)}>
                          Send Message
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* No contacts fallback */}
        {(contacts.length === 0 && userContacts.length === 0) && (
          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <p className="text-gray-500">No contacts found.</p>
          </div>
        )}
      </div>
    </AdminLayout>
  );
} 