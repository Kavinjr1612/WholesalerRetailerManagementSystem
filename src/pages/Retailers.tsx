import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Eye, Plus, Search, Edit, Trash2, ChevronLeft, ChevronRight, Mail, Lock } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useNavigate } from 'react-router-dom';
import { Notification } from '../components/ui/notification';

interface Retailer {
  id: number;
  user_id: string;
  name: string;
  address: string;
  contact_person: string;
  phone: string;
  email: string;
  status: string;
  created_at: string;
}

const Retailers: React.FC = () => {
  const { isDarkMode } = useTheme();
  const [retailers, setRetailers] = useState<Retailer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showCredentialsModal, setShowCredentialsModal] = useState(false);
  const [currentRetailer, setCurrentRetailer] = useState<Retailer | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    contact_person: '',
    phone: '',
    email: '',
    password: '',
    status: 'active'
  });
  const [credentialsData, setCredentialsData] = useState({
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [isEditing, setIsEditing] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const itemsPerPage = 10;
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchRetailers();
  }, [page]);

  const fetchRetailers = async () => {
    setLoading(true);
    try {
      const { count } = await supabase
        .from('retailers')
        .select('*', { count: 'exact', head: true });

      setTotalPages(Math.ceil((count || 1) / itemsPerPage));

      const { data, error } = await supabase
        .from('retailers')
        .select('*')
        .order('created_at', { ascending: false })
        .range((page - 1) * itemsPerPage, page * itemsPerPage - 1);

      if (error) throw error;
      setRetailers(data || []);
    } catch (error) {
      setError('Failed to load retailers');
    } finally {
      setLoading(false);
    }
  };

  const handleAddRetailer = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Create user first
      const { data: user, error: userError } = await supabase
        .from('users')
        .insert([{
          email: formData.email,
          password_hash: formData.password,
          role: 'retailer'
        }])
        .select()
        .single();

      if (userError) throw userError;

      // Create retailer with user_id
      const { data: retailer, error: retailerError } = await supabase
        .from('retailers')
        .insert([{
          name: formData.name,
          address: formData.address,
          contact_person: formData.contact_person,
          phone: formData.phone,
          email: formData.email,
          status: formData.status,
          user_id: user.id
        }])
        .select()
        .single();

      if (retailerError) throw retailerError;

      resetForm();
      fetchRetailers();
      showNotification('success', 'Retailer created successfully');
    } catch (error) {
      showNotification('error', error.message || 'Failed to create retailer');
    }
  };

  const handleEditRetailer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentRetailer) return;

    try {
      const { error } = await supabase
        .from('retailers')
        .update({
          name: formData.name,
          address: formData.address,
          contact_person: formData.contact_person,
          phone: formData.phone,
          status: formData.status
        })
        .eq('id', currentRetailer.id);

      if (error) throw error;

      resetForm();
      fetchRetailers();
      showNotification('success', 'Retailer updated successfully');
    } catch (error) {
      showNotification('error', error.message || 'Failed to update retailer');
    }
  };

  const handleUpdateCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentRetailer) return;

    try {
      if (credentialsData.password !== credentialsData.confirmPassword) {
        throw new Error('Passwords do not match');
      }

      // Update user email and password
      const { error: userError } = await supabase
        .from('users')
        .update({
          email: credentialsData.email,
          password_hash: credentialsData.password
        })
        .eq('id', currentRetailer.user_id);

      if (userError) throw userError;

      // Update retailer email
      const { error: retailerError } = await supabase
        .from('retailers')
        .update({ email: credentialsData.email })
        .eq('id', currentRetailer.id);

      if (retailerError) throw retailerError;

      setShowCredentialsModal(false);
      showNotification('success', 'Credentials updated successfully');
      fetchRetailers();
    } catch (error) {
      showNotification('error', error.message || 'Failed to update credentials');
    }
  };

  const handleDeleteRetailer = async () => {
    if (!currentRetailer) return;

    try {
      // Delete retailer account link
      await supabase
        .from('retailer_accounts')
        .delete()
        .eq('retailer_id', currentRetailer.id);

      // Delete retailer
      await supabase
        .from('retailers')
        .delete()
        .eq('id', currentRetailer.id);

      // Delete user
      await supabase
        .from('users')
        .delete()
        .eq('id', currentRetailer.user_id);

      setShowDeleteModal(false);
      fetchRetailers();
      showNotification('success', 'Retailer deleted successfully');
    } catch (error) {
      showNotification('error', error.message || 'Failed to delete retailer');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      address: '',
      contact_person: '',
      phone: '',
      email: '',
      password: '',
      status: 'active'
    });
    setCredentialsData({
      email: '',
      password: '',
      confirmPassword: ''
    });
    setIsEditing(false);
    setShowAddModal(false);
    setShowCredentialsModal(false);
    setCurrentRetailer(null);
  };

  const openEditModal = (retailer: Retailer) => {
    setCurrentRetailer(retailer);
    setFormData({
      name: retailer.name,
      address: retailer.address,
      contact_person: retailer.contact_person,
      phone: retailer.phone,
      email: retailer.email,
      password: '', // Password is not editable in edit mode
      status: retailer.status
    });
    setIsEditing(true);
    setShowAddModal(true);
  };

  const openCredentialsModal = (retailer: Retailer) => {
    setCurrentRetailer(retailer);
    setCredentialsData({
      email: retailer.email,
      password: '',
      confirmPassword: ''
    });
    setShowCredentialsModal(true);
  };

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3000);
  };

  const filteredRetailers = retailers.filter(retailer =>
    retailer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    retailer.contact_person.toLowerCase().includes(searchTerm.toLowerCase()) ||
    retailer.phone.includes(searchTerm)
  );

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Retailers</h1>

      {notification && (
        <Notification
          type={notification.type}
          message={notification.message}
          isOpen={!!notification}
          onClose={() => setNotification(null)}
        />
      )}

      <div className="flex justify-between items-center">
        <div className="relative">
          <input
            type="text"
            placeholder="Search retailers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={`pl-10 pr-4 py-2 rounded-lg border ${
              isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-200'
            }`}
          />
          <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          <Plus size={18} className="mr-2" />
          Add Retailer
        </button>
      </div>

      <div className={`rounded-lg shadow-md overflow-hidden ${isDarkMode ? 'bg-gray-700' : 'bg-white'}`}>
        <table className="w-full">
          <thead>
            <tr className={`border-b ${isDarkMode ? 'border-gray-600' : 'border-gray-200'}`}>
              <th className="text-left py-3 px-4">Shop Name</th>
              <th className="text-left py-3 px-4">Contact Person</th>
              <th className="text-left py-3 px-4">Phone</th>
              <th className="text-left py-3 px-4">Email</th>
              <th className="text-left py-3 px-4">Status</th>
              <th className="text-left py-3 px-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredRetailers.map(retailer => (
              <tr key={retailer.id} className={`border-b ${isDarkMode ? 'border-gray-600' : 'border-gray-200'}`}>
                <td className="py-3 px-4">{retailer.name}</td>
                <td className="py-3 px-4">{retailer.contact_person}</td>
                <td className="py-3 px-4">{retailer.phone}</td>
                <td className="py-3 px-4">{retailer.email}</td>
                <td className="py-3 px-4">
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    retailer.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {retailer.status}
                  </span>
                </td>
                <td className="py-3 px-4">
                  <div className="flex space-x-2">
                    <button onClick={() => openEditModal(retailer)} className="text-green-600 hover:text-green-800">
                      <Edit size={18} />
                    </button>
                    <button onClick={() => openCredentialsModal(retailer)} className="text-blue-600 hover:text-blue-800">
                      <Lock size={18} />
                    </button>
                    <button onClick={() => {
                      setCurrentRetailer(retailer);
                      setShowDeleteModal(true);
                    }} className="text-red-600 hover:text-red-800">
                      <Trash2 size={18} />
                    </button>
                    <button onClick={() => navigate(`/retailers/${retailer.id}`)} className="text-blue-600 hover:text-blue-800">
                      <Eye size={18} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex justify-between items-center">
        <button
          onClick={() => setPage(prev => Math.max(prev - 1, 1))}
          disabled={page === 1}
          className="flex items-center bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          <ChevronLeft size={18} className="mr-2" />
          Previous
        </button>
        <span>Page {page} of {totalPages}</span>
        <button
          onClick={() => setPage(prev => prev + 1)}
          disabled={page === totalPages}
          className="flex items-center bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          Next
          <ChevronRight size={18} className="ml-2" />
        </button>
      </div>

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center">
          <div className={`p-6 rounded-lg w-full max-w-md ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <h2 className="text-lg font-semibold mb-4">{isEditing ? 'Edit Retailer' : 'Add Retailer'}</h2>
            <form onSubmit={isEditing ? handleEditRetailer : handleAddRetailer}>
              <div className="space-y-4">
                <input
                  type="text"
                  name="name"
                  placeholder="Shop Name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className={`w-full px-4 py-2 rounded-lg border ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-200'}`}
                  required
                />
                <input
                  type="text"
                  name="address"
                  placeholder="Address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className={`w-full px-4 py-2 rounded-lg border ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-200'}`}
                  required
                />
                <input
                  type="text"
                  name="contact_person"
                  placeholder="Contact Person"
                  value={formData.contact_person}
                  onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                  className={`w-full px-4 py-2 rounded-lg border ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-200'}`}
                  required
                />
                <input
                  type="text"
                  name="phone"
                  placeholder="Phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className={`w-full px-4 py-2 rounded-lg border ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-200'}`}
                  required
                />
                <input
                  type="email"
                  name="email"
                  placeholder="Email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className={`w-full px-4 py-2 rounded-lg border ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-200'}`}
                  required
                  disabled={isEditing}
                />
                {!isEditing && (
                  <input
                    type="password"
                    name="password"
                    placeholder="Password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className={`w-full px-4 py-2 rounded-lg border ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-200'}`}
                    required
                  />
                )}
                <select
                  name="status"
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className={`w-full px-4 py-2 rounded-lg border ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-200'}`}
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
              <div className="flex justify-end mt-6">
                <button
                  type="button"
                  onClick={resetForm}
                  className="mr-2 px-4 py-2 rounded-lg bg-gray-200 hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`px-4 py-2 rounded-lg text-white ${isEditing ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-600 hover:bg-blue-700'}`}
                >
                  {isEditing ? 'Save Changes' : 'Add Retailer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Credentials Modal */}
      {showCredentialsModal && currentRetailer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center">
          <div className={`p-6 rounded-lg w-full max-w-md ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <h2 className="text-lg font-semibold mb-4">Update Credentials</h2>
            <form onSubmit={handleUpdateCredentials}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Email</label>
                  <input
                    type="email"
                    value={credentialsData.email}
                    onChange={(e) => setCredentialsData({ ...credentialsData, email: e.target.value })}
                    className={`w-full px-4 py-2 rounded-lg border ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-200'}`}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">New Password</label>
                  <input
                    type="password"
                    value={credentialsData.password}
                    onChange={(e) => setCredentialsData({ ...credentialsData, password: e.target.value })}
                    className={`w-full px-4 py-2 rounded-lg border ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-200'}`}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Confirm Password</label>
                  <input
                    type="password"
                    value={credentialsData.confirmPassword}
                    onChange={(e) => setCredentialsData({ ...credentialsData, confirmPassword: e.target.value })}
                    className={`w-full px-4 py-2 rounded-lg border ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-200'}`}
                    required
                  />
                </div>
              </div>
              <div className="flex justify-end mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowCredentialsModal(false);
                    setCredentialsData({ email: '', password: '', confirmPassword: '' });
                  }}
                  className="mr-2 px-4 py-2 rounded-lg bg-gray-200 hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
                >
                  Update Credentials
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {showDeleteModal && currentRetailer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center">
          <div className={`p-6 rounded-lg w-full max-w-md ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <h2 className="text-lg font-semibold mb-4">Delete Retailer</h2>
            <p className="mb-6">Are you sure you want to delete {currentRetailer.name}?</p>
            <div className="flex justify-end">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="mr-2 px-4 py-2 rounded-lg bg-gray-200 hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteRetailer}
                className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Retailers;