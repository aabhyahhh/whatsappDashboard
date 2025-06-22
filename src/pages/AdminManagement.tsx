import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '../components/AdminLayout';
const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;

interface AdminUser {
  _id: string;
  username: string;
  email: string;
  role: string;
  createdAt: string;
  lastLogin?: string;
}

export default function AdminManagement() {
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newAdmin, setNewAdmin] = useState({
    username: '',
    password: '',
    email: '',
    role: 'admin',
  });
  const [addError, setAddError] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<AdminUser | null>(null);
  const [editForm, setEditForm] = useState<Partial<AdminUser>>({});
  const [editError, setEditError] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const navigate = useNavigate();

  const fetchAdmins = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }

    try {
      const response = await fetch(`${apiBaseUrl}/api/admin/users`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.status === 403) {
        setError('Access denied: You do not have super_admin privileges.');
        setLoading(false);
        return;
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch admin users');
      }

      const data: AdminUser[] = await response.json();
      setAdmins(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdmins();
  }, [navigate]);

  const handleAddAdminChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setNewAdmin((prev) => ({ ...prev, [name]: value }));
  };

  const handleAddAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError(null);
    setIsAdding(true);

    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }

    try {
      const response = await fetch(`${apiBaseUrl}/api/admin/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(newAdmin),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to add admin user');
      }

      setNewAdmin({ username: '', password: '', email: '', role: 'admin' });
      setShowAddForm(false);
      fetchAdmins(); // Refresh the list
      alert('Admin user added successfully!');
    } catch (err) {
      setAddError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsAdding(false);
    }
  };

  const handleEditClick = (admin: AdminUser) => {
    setEditingAdmin(admin);
    setEditForm({ username: admin.username, email: admin.email, role: admin.role });
    setShowAddForm(false); // Hide add form if showing
  };

  const handleEditAdminChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setEditForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleUpdateAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditError(null);
    setIsUpdating(true);

    const token = localStorage.getItem('token');
    if (!token || !editingAdmin?._id) {
      navigate('/login');
      return;
    }

    try {
      const response = await fetch(`${apiBaseUrl}/api/admin/users/${editingAdmin._id}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify(editForm),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update admin user');
      }

      setEditingAdmin(null);
      setEditForm({});
      fetchAdmins(); // Refresh the list
      alert('Admin user updated successfully!');
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteAdmin = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this admin user?')) {
      return;
    }

    setIsDeleting(true);
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }

    try {
      const response = await fetch(`${apiBaseUrl}/api/admin/users/${id}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (response.status === 403) {
        const errorData = await response.json();
        alert(errorData.message);
        return;
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete admin user');
      }

      fetchAdmins(); // Refresh the list
      alert('Admin user deleted successfully!');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred'); // Use main error state for delete
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading) {
    return <div className="text-center py-10">Loading admin users...</div>;
  }

  if (error) {
    return <div className="text-center py-10 text-red-600">Error: {error}</div>;
  }

  return (
    <AdminLayout>
      <div className="container mx-auto p-6">
        <h1 className="text-3xl font-bold mb-6 text-gray-800">Admin User Management</h1>

        <button
          onClick={() => { setShowAddForm(!showAddForm); setEditingAdmin(null); }} // Toggle add form, hide edit form
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded mb-6"
        >
          {showAddForm ? 'Cancel Add User' : 'Add New Admin User'}
        </button>

        {showAddForm && (
          <div className="bg-white p-6 rounded-lg shadow-md mb-6">
            <h2 className="text-2xl font-bold mb-4">Add New Admin User</h2>
            {addError && <div className="text-red-600 mb-4">Error: {addError}</div>}
            <form onSubmit={handleAddAdminSubmit} className="space-y-4">
              <div>
                <label htmlFor="newUsername" className="block text-sm font-medium text-gray-700">Username</label>
                <input
                  type="text"
                  name="username"
                  id="newUsername"
                  value={newAdmin.username}
                  onChange={handleAddAdminChange}
                  required
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>
              <div>
                <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700">Password</label>
                <input
                  type="password"
                  name="password"
                  id="newPassword"
                  value={newAdmin.password}
                  onChange={handleAddAdminChange}
                  required
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>
              <div>
                <label htmlFor="newEmail" className="block text-sm font-medium text-gray-700">Email</label>
                <input
                  type="email"
                  name="email"
                  id="newEmail"
                  value={newAdmin.email}
                  onChange={handleAddAdminChange}
                  required
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>
              <div>
                <label htmlFor="newRole" className="block text-sm font-medium text-gray-700">Role</label>
                <select
                  name="role"
                  id="newRole"
                  value={newAdmin.role}
                  onChange={handleAddAdminChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                >
                  <option value="admin">Admin</option>
                  <option value="super_admin">Super Admin</option>
                </select>
              </div>
              <button
                type="submit"
                disabled={isAdding}
                className={`bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded ${isAdding ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {isAdding ? 'Adding...' : 'Add Admin User'}
              </button>
            </form>
          </div>
        )}

        {editingAdmin && (
          <div className="bg-white p-6 rounded-lg shadow-md mb-6">
            <h2 className="text-2xl font-bold mb-4">Edit Admin User</h2>
            {editError && <div className="text-red-600 mb-4">Error: {editError}</div>}
            <form onSubmit={handleUpdateAdminSubmit} className="space-y-4">
              <div>
                <label htmlFor="editUsername" className="block text-sm font-medium text-gray-700">Username</label>
                <input
                  type="text"
                  name="username"
                  id="editUsername"
                  value={editForm.username || ''}
                  onChange={handleEditAdminChange}
                  required
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>
              <div>
                <label htmlFor="editEmail" className="block text-sm font-medium text-gray-700">Email</label>
                <input
                  type="email"
                  name="email"
                  id="editEmail"
                  value={editForm.email || ''}
                  onChange={handleEditAdminChange}
                  required
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>
              <div>
                <label htmlFor="editRole" className="block text-sm font-medium text-gray-700">Role</label>
                <select
                  name="role"
                  id="editRole"
                  value={editForm.role || 'admin'}
                  onChange={handleEditAdminChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                >
                  <option value="admin">Admin</option>
                  <option value="super_admin">Super Admin</option>
                </select>
              </div>
              <div className="flex space-x-4">
                <button
                  type="submit"
                  disabled={isUpdating}
                  className={`bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded ${isUpdating ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {isUpdating ? 'Updating...' : 'Update Admin User'}
                </button>
                <button
                  type="button"
                  onClick={() => setEditingAdmin(null)}
                  className="bg-gray-400 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}
        
        {/* Admin list table */}
        {admins.length === 0 ? (
          <p className="text-gray-600">No admin users found.</p>
        ) : (
          <div className="overflow-x-auto relative shadow-md sm:rounded-lg">
            <table className="w-full text-sm text-left text-gray-500">
              <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                <tr>
                  <th scope="col" className="py-3 px-6">Username</th>
                  <th scope="col" className="py-3 px-6">Email</th>
                  <th scope="col" className="py-3 px-6">Role</th>
                  <th scope="col" className="py-3 px-6">Created At</th>
                  <th scope="col" className="py-3 px-6">Last Login</th>
                  <th scope="col" className="py-3 px-6">Actions</th>
                </tr>
              </thead>
              <tbody>
                {admins.map((admin) => (
                  <tr key={admin._id} className="bg-white border-b hover:bg-gray-50">
                    <td className="py-4 px-6 font-medium text-gray-900 whitespace-nowrap">{admin.username}</td>
                    <td className="py-4 px-6">{admin.email}</td>
                    <td className="py-4 px-6">{admin.role}</td>
                    <td className="py-4 px-6">{new Date(admin.createdAt).toLocaleDateString()}</td>
                    <td className="py-4 px-6">{admin.lastLogin ? new Date(admin.lastLogin).toLocaleDateString() : 'N/A'}</td>
                    <td className="py-4 px-6">
                      <button 
                        onClick={() => handleEditClick(admin)}
                        className="font-medium text-blue-600 hover:underline mr-3">
                          Edit
                      </button>
                      <button 
                        onClick={() => handleDeleteAdmin(admin._id)}
                        disabled={isDeleting}
                        className={`font-medium text-red-600 hover:underline ${isDeleting ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        {isDeleting ? 'Deleting...' : 'Delete'}
                      </button>
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