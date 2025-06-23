import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import AdminLayout from '../components/AdminLayout';
const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;

interface Dish {
  name: string;
  price?: number;
}

interface User {
  _id: string;
  contactNumber: string;
  name: string;
  status: 'active' | 'inactive' | 'suspended';
  lastActive: string;
  profilePictures?: string[];
  foodType?: 'veg' | 'Nonveg' | 'Swaminarayan' | 'Jain';
  bestDishes?: Dish[];
  menuLink?: string;
  mapsLink?: string;
  operatingHours: {
    openTime: string;
    closeTime: string;
    days: string[];
  };
  createdAt: string;
  updatedAt: string;
  preferredLanguages?: string[];
  foodCategories?: string[];
  stallType?: '' | 'fixed' | 'mobile';
  whatsappConsent?: boolean;
  onboardingType?: string;
  aadharNumber?: string;
  aadharFrontUrl?: string;
  aadharBackUrl?: string;
  panNumber?: string;
}

export default function UserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newUser, setNewUser] = useState({
    contactNumber: '+91',
    name: '',
    status: 'active',
    profilePictures: [] as string[],
    foodType: 'veg',
    bestDishes: Array(6).fill({ name: '', price: '' }) as Dish[],
    menuLink: '',
    mapsLink: '',
    operatingHours: {
      openTime: '',
      closeTime: '',
      days: [] as string[],
    },
    preferredLanguages: [] as string[],
    foodCategories: [] as string[],
    stallType: '',
    whatsappConsent: false,
    onboardingType: '',
    aadharNumber: '',
    aadharFrontUrl: '',
    aadharBackUrl: '',
    panNumber: '',
  });
  const [addError, setAddError] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editForm, setEditForm] = useState<Partial<User>>({
    contactNumber: '+91',
    name: '',
    status: 'active',
    operatingHours: {
      openTime: '',
      closeTime: '',
      days: [],
    },
    foodType: 'veg',
    bestDishes: Array(6).fill({ name: '', price: '' }) as Dish[],
    menuLink: '',
    mapsLink: '',
    profilePictures: [],
    preferredLanguages: [],
    foodCategories: [],
    stallType: '',
    whatsappConsent: false,
    onboardingType: '',
    aadharNumber: '',
    aadharFrontUrl: '',
    aadharBackUrl: '',
    panNumber: '',
  });
  const [editError, setEditError] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const [isVerified, setIsVerified] = useState(false);
  const editFormRef = useRef<HTMLDivElement>(null);

  const allDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  useEffect(() => {
    if (location.state?.phone && location.state?.verified) {
      setShowAddForm(true);
      setNewUser((prev) => ({ ...prev, contactNumber: location.state.phone }));
      setIsVerified(true);
    }
  }, [location.state]);

  const fetchUsers = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }

    try {
      const response = await fetch(`${apiBaseUrl}/api/users`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch users');
      }

      const data: User[] = await response.json();
      setUsers(data);
      console.log("Fetched users data:", data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [navigate]);

  const handleAddUserChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === 'openTime' || name === 'closeTime') {
      setNewUser((prev) => ({
        ...prev,
        operatingHours: {
          ...prev.operatingHours,
          [name]: value,
        },
      }));
    } else if (name === 'days') {
      // handled in handleDayChange
    } else {
      setNewUser((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleAddDishChange = (index: number, field: keyof Dish, value: string | number) => {
    setNewUser((prev) => {
      const updatedDishes = [...(prev.bestDishes || [])];
      updatedDishes[index] = { 
        ...updatedDishes[index],
        [field]: field === 'price' && typeof value === 'string' && value === '' ? undefined : value
      };
      return { ...prev, bestDishes: updatedDishes };
    });
  };

  const handleAddUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError(null);
    setIsAdding(true);

    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }

    // Validate required fields
    if (
      !newUser.contactNumber ||
      !newUser.name ||
      !newUser.mapsLink ||
      !newUser.operatingHours.openTime ||
      !newUser.operatingHours.closeTime ||
      !newUser.operatingHours.days.length ||
      !newUser.bestDishes[0] || !newUser.bestDishes[0].name || !newUser.bestDishes[0].name.trim()
    ) {
      setAddError('Please fill all required fields and at least 1 best dish.');
      setIsAdding(false);
      return;
    }

    // Build payload for backend
    const payload = {
      contactNumber: newUser.contactNumber,
      name: newUser.name,
      mapsLink: newUser.mapsLink,
      operatingHours: newUser.operatingHours,
      bestDishes: newUser.bestDishes.filter(dish => dish.name && dish.name.trim()),
      foodType: newUser.foodType,
      profilePictures: newUser.profilePictures,
      preferredLanguages: newUser.preferredLanguages,
      foodCategories: newUser.foodCategories,
      stallType: newUser.stallType,
      whatsappConsent: newUser.whatsappConsent,
      menuLink: newUser.menuLink,
      onboardingType: newUser.onboardingType,
      aadharNumber: newUser.aadharNumber,
      aadharFrontUrl: newUser.aadharFrontUrl,
      aadharBackUrl: newUser.aadharBackUrl,
      panNumber: newUser.panNumber,
    };

    try {
      const response = await fetch(`${apiBaseUrl}/api/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to add user');
      }

      setNewUser({ contactNumber: '+91', name: '', status: 'active', profilePictures: [], foodType: 'veg', bestDishes: Array(6).fill({ name: '', price: '' }) as Dish[], menuLink: '', mapsLink: '', operatingHours: { openTime: '', closeTime: '', days: [] }, preferredLanguages: [], foodCategories: [], stallType: '', whatsappConsent: false, onboardingType: '', aadharNumber: '', aadharFrontUrl: '', aadharBackUrl: '', panNumber: '' });
      setShowAddForm(false);
      fetchUsers(); // Refresh the list
      alert('User added successfully!');
    } catch (err) {
      setAddError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsAdding(false);
    }
  };

  const handleEditClick = (user: User) => {
    setEditingUser(user);
    setEditForm({
      contactNumber: user.contactNumber,
      name: user.name,
      status: user.status,
      operatingHours: {
        openTime: user.operatingHours.openTime,
        closeTime: user.operatingHours.closeTime,
        days: user.operatingHours.days,
      },
      foodType: user.foodType,
      bestDishes: user.bestDishes ? [...user.bestDishes] : Array(6).fill({ name: '', price: '' }),
      menuLink: user.menuLink,
      mapsLink: user.mapsLink,
      profilePictures: user.profilePictures || [],
      preferredLanguages: user.preferredLanguages || [],
      foodCategories: user.foodCategories || [],
      stallType: user.stallType || '',
      whatsappConsent: user.whatsappConsent || false,
      onboardingType: user.onboardingType || '',
      aadharNumber: user.aadharNumber || '',
      aadharFrontUrl: user.aadharFrontUrl || '',
      aadharBackUrl: user.aadharBackUrl || '',
      panNumber: user.panNumber || '',
    });
    setShowAddForm(false);
    setTimeout(() => {
      if (editFormRef.current) {
        editFormRef.current.scrollIntoView({ behavior: 'smooth' });
      }
    }, 0);
  };

  const handleEditUserChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setEditForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleEditDishChange = (index: number, field: keyof Dish, value: string | number) => {
    setEditForm((prev) => {
      const updatedDishes = [...(prev.bestDishes || [])];
      updatedDishes[index] = {
        ...updatedDishes[index],
        [field]: field === 'price' && typeof value === 'string' && value === '' ? undefined : value
      };
      return { ...prev, bestDishes: updatedDishes };
    });
  };

  const handleUpdateUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditError(null);
    setIsUpdating(true);

    const token = localStorage.getItem('token');
    if (!token || !editingUser?._id) {
      navigate('/login');
      return;
    }

    try {
      const response = await fetch(`${apiBaseUrl}/api/users/${editingUser._id}`,
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
        throw new Error(errorData.message || 'Failed to update user');
      }

      setEditingUser(null);
      setEditForm({});
      fetchUsers(); // Refresh the list
      alert('User updated successfully!');
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this user?')) {
      return;
    }

    setIsDeleting(true);
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }

    try {
      const response = await fetch(`${apiBaseUrl}/api/users/${id}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete user');
      }

      fetchUsers(); // Refresh the list
      alert('User deleted successfully!');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred'); // Use main error state for delete
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSelectAllDays = (checked: boolean) => {
    setNewUser(prev => ({
      ...prev,
      operatingHours: {
        ...prev.operatingHours,
        days: checked ? [...allDays] : [],
      },
    }));
  };

  const handleDayChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value, checked } = e.target;
    setNewUser((prev) => {
      const updatedDays = checked
        ? [...prev.operatingHours.days, value]
        : prev.operatingHours.days.filter((day) => day !== value);
      return {
        ...prev,
        operatingHours: {
          ...prev.operatingHours,
          days: updatedDays,
        },
      };
    });
  };

  const generateTimeOptions = () => {
    const times = [];
    for (let hour = 0; hour < 24; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const h = hour % 12 === 0 ? 12 : hour % 12;
        const ampm = hour < 12 ? 'AM' : 'PM';
        const m = minute === 0 ? '00' : minute;
        times.push(`${h}:${m} ${ampm}`);
      }
    }
    return times;
  };

  const timeOptions = generateTimeOptions();

  if (loading) {
    return <div className="text-center py-10">Loading users...</div>;
  }

  if (error) {
    return <div className="text-center py-10 text-red-600">Error: {error}</div>;
  }

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto px-2 md:px-6 py-4 flex flex-col">
        <h1 className="text-3xl font-bold mb-6 text-gray-800">User Management</h1>

        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded mb-4 self-start"
        >
          {showAddForm ? 'Hide Add User Form' : 'Add New User'}
        </button>

        {showAddForm && (
          <div className="bg-white p-6 rounded-lg shadow-md mb-4 w-full max-w-2xl mx-auto border border-gray-200">
            <h2 className="text-2xl font-bold mb-6">Add New User</h2>
            {addError && <div className="text-red-600 mb-4">Error: {addError}</div>}
            <form onSubmit={handleAddUserSubmit} className="space-y-6">
              <div className="space-y-2">
                <label htmlFor="newContactNumber" className="block text-sm font-medium text-gray-700">Contact Number</label>
                <div className="flex items-center">
                  <input
                    type="text"
                    name="contactNumber"
                    id="newContactNumber"
                    value={newUser.contactNumber}
                    onChange={(e) => {
                      let value = e.target.value;
                      if (!value.startsWith('+91')) value = '+91' + value.replace(/^?91?/, '');
                      setNewUser((prev) => ({ ...prev, contactNumber: value }));
                    }}
                    required
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                  {isVerified && (
                    <span className="ml-2 text-green-600" title="Verified">✓</span>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <label htmlFor="newName" className="block text-sm font-medium text-gray-700">Name</label>
                <input
                  type="text"
                  name="name"
                  id="newName"
                  value={newUser.name}
                  onChange={handleAddUserChange}
                  required
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="newStatus" className="block text-sm font-medium text-gray-700">Status</label>
                <select
                  name="status"
                  id="newStatus"
                  value={newUser.status}
                  onChange={handleAddUserChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="suspended">Suspended</option>
                </select>
              </div>
              <div className="space-y-4 border border-gray-200 rounded-lg p-4 my-4 bg-gray-50">
                <div className="mb-2">
                  <label className="block font-semibold mb-1">Business Images <span className="text-xs">(min 1, max 10)</span>:</label>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="block mb-2"
                    onChange={async (e) => {
                      const files = Array.from(e.target.files || []);
                      if (files.length > 10) {
                        alert('You can upload a maximum of 10 images.');
                        return;
                      }
                      const formData = new FormData();
                      files.forEach(file => formData.append('images', file));
                      const res = await fetch(`${apiBaseUrl}/api/users/upload-images`, {
                        method: 'POST',
                        body: formData,
                        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
                      });
                      const data = await res.json();
                      setNewUser(prev => ({ ...prev, profilePictures: data.urls }));
                    }}
                  />
                  <div className="flex flex-wrap gap-2 mt-2">
                    {newUser.profilePictures && newUser.profilePictures.map(url => (
                      <img key={url} src={url} alt="Business" className="w-20 h-20 object-cover rounded border" />
                    ))}
                  </div>
                </div>
                <div className="mb-2">
                  <label className="block font-semibold mb-1">Preferred Language:</label>
                  <div className="flex gap-4">
                    {['Hindi', 'English', 'Gujarati'].map(lang => (
                      <label key={lang} className="inline-flex items-center gap-1">
                        <input
                          type="checkbox"
                          value={lang}
                          checked={newUser.preferredLanguages.includes(lang)}
                          onChange={() => {
                            setNewUser(prev => {
                              const arr = prev.preferredLanguages.includes(lang)
                                ? prev.preferredLanguages.filter(l => l !== lang)
                                : [...prev.preferredLanguages, lang];
                              return { ...prev, preferredLanguages: arr };
                            });
                          }}
                        />
                        {lang}
                      </label>
                    ))}
                  </div>
                </div>
                <div className="mb-2">
                  <label className="block font-semibold mb-1">Category of Food:</label>
                  <div className="flex flex-wrap gap-4">
                    {['Chaat','Juices','Tea/coffee','Snacks (Samosa, Vada Pav, etc.)','Dessert','Gujju Snacks','PavBhaji','Punjabi (Parathe, Lassi, etc)','Paan','Korean','Chinese','South Indian','Other'].map(cat => (
                      <label key={cat} className="inline-flex items-center gap-1">
                        <input
                          type="checkbox"
                          value={cat}
                          checked={newUser.foodCategories.includes(cat)}
                          onChange={() => {
                            setNewUser(prev => {
                              const arr = prev.foodCategories.includes(cat)
                                ? prev.foodCategories.filter(c => c !== cat)
                                : [...prev.foodCategories, cat];
                              return { ...prev, foodCategories: arr };
                            });
                          }}
                        />
                        {cat}
                      </label>
                    ))}
                  </div>
                </div>
                <div className="mb-2">
                  <label className="block font-semibold mb-1">Stall Type:</label>
                  <div className="flex gap-4">
                    <label className="inline-flex items-center gap-1">
                      <input
                        type="radio"
                        name="stallType"
                        value="fixed"
                        checked={newUser.stallType === 'fixed'}
                        onChange={() => setNewUser(prev => ({ ...prev, stallType: 'fixed' }))}
                      /> Fixed
                    </label>
                    <label className="inline-flex items-center gap-1">
                      <input
                        type="radio"
                        name="stallType"
                        value="mobile"
                        checked={newUser.stallType === 'mobile'}
                        onChange={() => setNewUser(prev => ({ ...prev, stallType: 'mobile' }))}
                      /> Mobile
                    </label>
                  </div>
                </div>
                <div className="mb-2">
                  <label className="inline-flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={newUser.whatsappConsent}
                      onChange={() => setNewUser(prev => ({ ...prev, whatsappConsent: !prev.whatsappConsent }))}
                    />
                    Consent to receive WhatsApp messages
                  </label>
                </div>
                <div className="mb-2">
                  <label className="block font-semibold mb-1">Onboarding Type <span className="text-red-500">*</span>:</label>
                  <div className="flex gap-4">
                    {['on ground', 'manual entry', 'via website'].map(type => (
                      <label key={type} className="inline-flex items-center gap-1">
                        <input
                          type="radio"
                          name="onboardingType"
                          value={type}
                          checked={newUser.onboardingType === type}
                          onChange={() => setNewUser(prev => ({ ...prev, onboardingType: type }))}
                          required
                        />
                        {type.charAt(0).toUpperCase() + type.slice(1)}
                      </label>
                    ))}
                  </div>
                </div>
                <div className="mb-2">
                  <label className="block font-semibold mb-1">Aadhar Number (optional):</label>
                  <input
                    type="text"
                    value={newUser.aadharNumber}
                    onChange={(e) => setNewUser(prev => ({ ...prev, aadharNumber: e.target.value }))}
                    className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="Enter Aadhar Number"
                  />
                </div>
                <div className="mb-2">
                  <label className="block font-semibold mb-1">Aadhar Photo (Front, optional):</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const formData = new FormData();
                      formData.append('image', file);
                      const res = await fetch(`${apiBaseUrl}/api/users/upload-images`, {
                        method: 'POST',
                        body: formData,
                        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
                      });
                      const data = await res.json();
                      setNewUser(prev => ({ ...prev, aadharFrontUrl: data.urls[0] }));
                    }}
                  />
                  {newUser.aadharFrontUrl && <img src={newUser.aadharFrontUrl} alt="Aadhar Front" className="w-20 h-20 object-cover rounded border mt-2" />}
                </div>
                <div className="mb-2">
                  <label className="block font-semibold mb-1">Aadhar Photo (Back, optional):</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const formData = new FormData();
                      formData.append('image', file);
                      const res = await fetch(`${apiBaseUrl}/api/users/upload-images`, {
                        method: 'POST',
                        body: formData,
                        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
                      });
                      const data = await res.json();
                      setNewUser(prev => ({ ...prev, aadharBackUrl: data.urls[0] }));
                    }}
                  />
                  {newUser.aadharBackUrl && <img src={newUser.aadharBackUrl} alt="Aadhar Back" className="w-20 h-20 object-cover rounded border mt-2" />}
                </div>
                <div className="mb-2">
                  <label className="block font-semibold mb-1">PAN Number (optional):</label>
                  <input
                    type="text"
                    value={newUser.panNumber}
                    onChange={(e) => setNewUser(prev => ({ ...prev, panNumber: e.target.value }))}
                    className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="Enter PAN Number"
                  />
                </div>
              </div>
              <div className="space-y-2 border border-gray-200 rounded-lg p-4 my-4 bg-gray-50">
                <label className="block text-sm font-medium text-gray-700">Operating Hours</label>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="newOpenTime" className="block text-sm font-medium text-gray-700">Open Time</label>
                    <select
                      name="openTime"
                      id="newOpenTime"
                      value={newUser.operatingHours.openTime}
                      onChange={handleAddUserChange}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    >
                      <option value="">Select Time</option>
                      {timeOptions.map((time) => (
                        <option key={time} value={time}>{time}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="newCloseTime" className="block text-sm font-medium text-gray-700">Close Time</label>
                    <select
                      name="closeTime"
                      id="newCloseTime"
                      value={newUser.operatingHours.closeTime}
                      onChange={handleAddUserChange}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    >
                      <option value="">Select Time</option>
                      {timeOptions.map((time) => (
                        <option key={time} value={time}>{time}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="mt-2">
                  <label className="block text-sm font-medium text-gray-700">Operating Days</label>
                  <div className="mb-2">
                    <label className="inline-flex items-center">
                      <input
                        type="checkbox"
                        checked={newUser.operatingHours.days.length === allDays.length}
                        onChange={(e) => handleSelectAllDays(e.target.checked)}
                        className="form-checkbox h-5 w-5 text-blue-600"
                      />
                      <span className="ml-2 text-sm font-semibold">Select All</span>
                    </label>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-1">
                    {allDays.map((day) => (
                      <label key={day} className="inline-flex items-center">
                        <input
                          type="checkbox"
                          name="days"
                          value={day}
                          checked={newUser.operatingHours.days.includes(day)}
                          onChange={(e) => handleDayChange(e)}
                          className="form-checkbox h-5 w-5 text-blue-600"
                        />
                        <span className="ml-2 text-sm text-gray-700">{day}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
              <div className="space-y-2 border border-gray-200 rounded-lg p-4 my-4 bg-gray-50">
                <label className="block text-sm font-medium text-gray-700">Best Dishes (at least 1 required)</label>
                {[...Array(6)].map((_, index) => (
                  <div key={index} className="grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor={`newBestDishName${index + 1}`} className="block text-sm font-medium text-gray-700">Best Dish {index + 1}{index === 0 && ' (Required)'}</label>
                      <input
                        type="text"
                        name={`bestDishName${index + 1}`}
                        id={`newBestDishName${index + 1}`}
                        value={newUser.bestDishes[index]?.name || ''}
                        onChange={(e) => handleAddDishChange(index, 'name', e.target.value)}
                        required={index === 0}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      />
                    </div>
                    <div>
                      <label htmlFor={`newBestDishPrice${index + 1}`} className="block text-sm font-medium text-gray-700">Price</label>
                      <input
                        type="number"
                        name={`newBestDishPrice${index + 1}`}
                        id={`newBestDishPrice${index + 1}`}
                        value={newUser.bestDishes[index]?.price || ''}
                        onChange={(e) => handleAddDishChange(index, 'price', e.target.value === '' ? '' : parseFloat(e.target.value))}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      />
                    </div>
                  </div>
                ))}
              </div>
              <div className="space-y-2 border border-gray-200 rounded-lg p-4 my-4 bg-gray-50">
                <div>
                  <label htmlFor="newMenuLink" className="block text-sm font-medium text-gray-700">Menu Link</label>
                  <input
                    type="text"
                    name="menuLink"
                    id="newMenuLink"
                    value={newUser.menuLink}
                    onChange={handleAddUserChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="newMapsLink" className="block text-sm font-medium text-gray-700">Maps Link</label>
                  <input
                    type="text"
                    name="mapsLink"
                    id="newMapsLink"
                    value={newUser.mapsLink}
                    onChange={handleAddUserChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={isAdding}
                className={`bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded ${isAdding ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {isAdding ? 'Adding...' : 'Add User'}
              </button>
            </form>
          </div>
        )}

        {editingUser && (
          <div ref={editFormRef} className="bg-white p-4 md:p-6 rounded-lg shadow-md mb-4 w-full max-w-2xl mx-auto">
            <h2 className="text-2xl font-bold mb-4">Edit User</h2>
            {editError && <div className="text-red-600 mb-4">Error: {editError}</div>}
            <form onSubmit={handleUpdateUserSubmit} className="space-y-4">
              <div>
                <label htmlFor="editContactNumber" className="block text-sm font-medium text-gray-700">Contact Number</label>
                <input
                  type="text"
                  name="contactNumber"
                  id="editContactNumber"
                  value={editForm.contactNumber || '+91'}
                  onChange={(e) => {
                    // Always keep '+91' at the start
                    let value = e.target.value;
                    if (!value.startsWith('+91')) value = '+91' + value.replace(/^\+?91?/, '');
                    setEditForm((prev) => ({ ...prev, contactNumber: value }));
                  }}
                  required
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>
              <div>
                <label htmlFor="editName" className="block text-sm font-medium text-gray-700">Name</label>
                <input
                  type="text"
                  name="name"
                  id="editName"
                  value={editForm.name || ''}
                  onChange={handleEditUserChange}
                  required
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>
              <div>
                <label htmlFor="editStatus" className="block text-sm font-medium text-gray-700">Status</label>
                <select
                  name="status"
                  id="editStatus"
                  value={editForm.status || 'active'}
                  onChange={handleEditUserChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="suspended">Suspended</option>
                </select>
              </div>
              <div>
                <label>Business Images (min 1, max 10):</label>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={async (e) => {
                    const files = Array.from(e.target.files || []);
                    if (files.length > 10) {
                      alert('You can upload a maximum of 10 images.');
                      return;
                    }
                    const formData = new FormData();
                    files.forEach(file => formData.append('images', file));
                    const res = await fetch(`${apiBaseUrl}/api/users/upload-images`, {
                      method: 'POST',
                      body: formData,
                      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
                    });
                    const data = await res.json();
                    setEditForm(prev => ({ ...prev, profilePictures: data.urls }));
                  }}
                />
                {editForm.profilePictures && editForm.profilePictures.map(url => (
                  <img key={url} src={url} alt="Business" style={{ width: 80, margin: 4 }} />
                ))}
              </div>
              <div>
                <label>Preferred Language:</label>
                {['Hindi', 'English', 'Gujarati'].map(lang => (
                  <label key={lang}>
                    <input
                      type="checkbox"
                      value={lang}
                      checked={editForm.preferredLanguages?.includes(lang) || false}
                      onChange={() => {
                        setEditForm(prev => {
                          const arr = prev.preferredLanguages?.includes(lang)
                            ? prev.preferredLanguages.filter(l => l !== lang)
                            : [...(prev.preferredLanguages || []), lang];
                          return { ...prev, preferredLanguages: arr };
                        });
                      }}
                    />
                    {lang}
                  </label>
                ))}
              </div>
              <div>
                <label>Category of Food:</label>
                <select
                  value={editForm.foodCategories?.join(', ') || ''}
                  onChange={(e) => setEditForm(prev => ({ ...prev, foodCategories: e.target.value.split(', ') }))}
                >
                  <option value="">Select</option>
                  <option>Chaat</option>
                  <option>Juices</option>
                  <option>Tea/coffee</option>
                  <option>Snacks (Samosa, Vada Pav, etc.)</option>
                  <option>Dessert</option>
                  <option>Gujju Snacks</option>
                  <option>PavBhaji</option>
                  <option>Punjabi (Parathe, Lassi, etc)</option>
                  <option>Paan</option>
                  <option>Korean</option>
                  <option>Chinese</option>
                  <option>South Indian</option>
                  <option>Other</option>
                </select>
              </div>
              <div>
                <label>Stall Type:</label>
                <label>
                  <input
                    type="radio"
                    name="stallType"
                    value="fixed"
                    checked={editForm.stallType === 'fixed'}
                    onChange={() => setEditForm(prev => ({ ...prev, stallType: 'fixed' }))}
                  /> Fixed
                </label>
                <label>
                  <input
                    type="radio"
                    name="stallType"
                    value="mobile"
                    checked={editForm.stallType === 'mobile'}
                    onChange={() => setEditForm(prev => ({ ...prev, stallType: 'mobile' }))}
                  /> Mobile
                </label>
              </div>
              <div>
                <label>
                  <input
                    type="checkbox"
                    checked={editForm.whatsappConsent || false}
                    onChange={() => setEditForm(prev => ({ ...prev, whatsappConsent: !prev.whatsappConsent }))}
                  />
                  Consent to receive WhatsApp messages
                </label>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Operating Hours</label>
                <div className="mt-1 grid grid-cols-2 gap-2">
                  <div>
                    <label htmlFor="editOpenTime" className="block text-sm font-medium text-gray-700">Open Time</label>
                    <select
                      name="openTime"
                      id="editOpenTime"
                      value={editForm.operatingHours?.openTime || ''}
                      onChange={handleEditUserChange}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    >
                      <option value="">Select Time</option>
                      {timeOptions.map((time) => (
                        <option key={time} value={time}>
                          {time}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="editCloseTime" className="block text-sm font-medium text-gray-700">Close Time</label>
                    <select
                      name="closeTime"
                      id="editCloseTime"
                      value={editForm.operatingHours?.closeTime || ''}
                      onChange={handleEditUserChange}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    >
                      <option value="">Select Time</option>
                      {timeOptions.map((time) => (
                        <option key={time} value={time}>
                          {time}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Operating Days</label>
                <div className="mt-1 grid grid-cols-2 gap-2">
                  {allDays.map((day) => (
                    <label key={day} className="inline-flex items-center">
                      <input
                        type="checkbox"
                        name="days"
                        value={day}
                        checked={(editForm.operatingHours?.days || []).includes(day)}
                        onChange={(e) => handleDayChange(e)}
                        className="form-checkbox"
                      />
                      <span className="ml-2 text-sm text-gray-700">{day}</span>
                    </label>
                  ))}
                </div>
              </div>
              {/* Best Dishes (Menu) Fields for Edit */}
              {[...Array(6)].map((_, index) => (
                <div key={index} className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor={`editBestDishName${index + 1}`} className="block text-sm font-medium text-gray-700">Best Dish {index + 1}{index === 0 && ' (Required)'}</label>
                    <input
                      type="text"
                      name={`bestDishName${index + 1}`}
                      id={`editBestDishName${index + 1}`}
                      value={editForm.bestDishes?.[index]?.name || ''}
                      onChange={(e) => handleEditDishChange(index, 'name', e.target.value)}
                      required={index === 0}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                  </div>
                  <div>
                    <label htmlFor={`editBestDishPrice${index + 1}`} className="block text-sm font-medium text-gray-700">Price</label>
                    <input
                      type="number"
                      name={`editBestDishPrice${index + 1}`}
                      id={`editBestDishPrice${index + 1}`}
                      value={editForm.bestDishes?.[index]?.price || ''}
                      onChange={(e) => handleEditDishChange(index, 'price', e.target.value === '' ? '' : parseFloat(e.target.value))}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                  </div>
                </div>
              ))}
              <div>
                <label htmlFor="editMenuLink" className="block text-sm font-medium text-gray-700">Menu Link</label>
                <input
                  type="text"
                  name="menuLink"
                  id="editMenuLink"
                  value={editForm.menuLink || ''}
                  onChange={handleEditUserChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>
              <div>
                <label htmlFor="editMapsLink" className="block text-sm font-medium text-gray-700">Maps Link</label>
                <input
                  type="text"
                  name="mapsLink"
                  id="editMapsLink"
                  value={editForm.mapsLink || ''}
                  onChange={handleEditUserChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>
              <div className="flex space-x-4">
                <button
                  type="submit"
                  disabled={isUpdating}
                  className={`bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded ${isUpdating ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {isUpdating ? 'Updating...' : 'Update User'}
                </button>
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="bg-gray-400 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}
        
        {/* User list table */}
        {users.length === 0 ? (
          <p className="text-gray-600">No users found.</p>
        ) : (
          <div className="w-full bg-white">
            <table className="w-full divide-y divide-gray-200 text-sm text-left">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 font-semibold text-gray-700 whitespace-nowrap">Contact Number</th>
                  <th className="px-4 py-3 font-semibold text-gray-700 whitespace-nowrap">Name</th>
                  <th className="px-4 py-3 font-semibold text-gray-700 whitespace-nowrap">Status</th>
                  <th className="px-4 py-3 font-semibold text-gray-700 whitespace-nowrap">Last Active</th>
                  <th className="px-4 py-3 font-semibold text-gray-700 whitespace-nowrap">Profile</th>
                  <th className="px-4 py-3 font-semibold text-gray-700 whitespace-nowrap">Open</th>
                  <th className="px-4 py-3 font-semibold text-gray-700 whitespace-nowrap">Close</th>
                  <th className="px-4 py-3 font-semibold text-gray-700 whitespace-nowrap">Days</th>
                  <th className="px-4 py-3 font-semibold text-gray-700 whitespace-nowrap">Food</th>
                  <th className="px-4 py-3 font-semibold text-gray-700 whitespace-nowrap">Best Dishes</th>
                  <th className="px-4 py-3 font-semibold text-gray-700 whitespace-nowrap">Menu</th>
                  <th className="px-4 py-3 font-semibold text-gray-700 whitespace-nowrap">Maps</th>
                  <th className="px-4 py-3 font-semibold text-gray-700 whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {users.map((user) => (
                  <tr key={user._id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap font-medium text-gray-900 truncate max-w-[140px]">{user.contactNumber}</td>
                    <td className="px-4 py-3 whitespace-nowrap truncate max-w-[180px]">{user.name}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{user.status}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{new Date(user.lastActive).toLocaleDateString()}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {user.profilePictures && user.profilePictures.length > 0 && (
                        <img src={user.profilePictures[0]} alt="Profile" className="h-8 w-8 rounded-full object-cover" />
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">{user.operatingHours.openTime || 'N/A'}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{user.operatingHours.closeTime || 'N/A'}</td>
                    <td className="px-4 py-3 whitespace-nowrap truncate max-w-[120px]">{(user.operatingHours.days && user.operatingHours.days.length > 0) ? user.operatingHours.days.join(', ') : 'N/A'}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{user.foodType || 'N/A'}</td>
                    <td className="px-4 py-3 whitespace-nowrap truncate max-w-[180px]">
                      {(user.bestDishes && user.bestDishes.filter(dish => dish.name).length > 0) ?
                        user.bestDishes.filter(dish => dish.name).map(dish => `${dish.name} (${dish.price || 'N/A'})`).join(', ') : 'N/A'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap truncate max-w-[100px]"><a href={user.menuLink} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{user.menuLink ? 'Link' : 'N/A'}</a></td>
                    <td className="px-4 py-3 whitespace-nowrap truncate max-w-[120px]"><a href={user.mapsLink} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{user.mapsLink || 'N/A'}</a></td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <button 
                        onClick={() => handleEditClick(user)}
                        className="font-medium text-blue-600 hover:underline mr-3">
                          Edit
                      </button>
                      <button 
                        onClick={() => handleDeleteUser(user._id)}
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