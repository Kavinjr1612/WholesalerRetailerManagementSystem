import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase'; // Remove Supabase Auth dependency
import { Candy, AlertCircle } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import bcrypt from 'bcryptjs'; // For password hashing and comparison

const Login: React.FC = () => {
  const { isDarkMode } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const isAdmin = location.pathname.startsWith('/admin');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // Fetch the user from the custom `users` table
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .single();

      if (userError || !userData) {
        throw new Error('Invalid email or password.');
      }

      // Verify the password
      const isPasswordValid = await bcrypt.compare(password, userData.password_hash);
      if (!isPasswordValid) {
        throw new Error('Invalid email or password.');
      }

      // Check if the user is an admin or retailer
      if (isAdmin) {
        // Verify admin role
        const { data: adminData, error: adminError } = await supabase
          .from('admin_users')
          .select('id')
          .eq('user_id', userData.id)
          .single();

        if (adminError || !adminData) {
          throw new Error('Unauthorized access. Admin privileges required.');
        }

        navigate('/admin/dashboard');
      } else {
        // Verify retailer role
        const { data: retailerData, error: retailerError } = await supabase
          .from('retailer_accounts')
          .select('id')
          .eq('user_id', userData.id)
          .single();

        if (retailerError || !retailerData) {
          throw new Error('No retailer account found.');
        }

        navigate('/dashboard');
      }
    } catch (error) {
      console.error('Login error:', error);
      setError(error instanceof Error ? error.message : 'Failed to login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`min-h-screen flex items-center justify-center ${
      isDarkMode ? 'bg-slate-900' : 'bg-slate-50'
    }`}>
      <div className={`max-w-md w-full mx-4 ${
        isDarkMode ? 'bg-slate-800' : 'bg-white'
      } rounded-lg shadow-lg p-8`}>
        <div className="flex justify-center mb-8">
          <div className="flex items-center">
            <Candy size={40} className="text-blue-600" />
            <span className={`ml-3 text-2xl font-bold ${
              isDarkMode ? 'text-white' : 'text-slate-900'
            }`}>
              {isAdmin ? 'Wholesaler Admin' : 'Retailer Portal'}
            </span>
          </div>
        </div>

        {error && (
          <div className={`mb-4 p-4 rounded-md ${
            isDarkMode ? 'bg-red-900/50 text-red-200' : 'bg-red-50 text-red-800'
          }`}>
            <div className="flex items-center">
              <AlertCircle size={16} className="mr-2 flex-shrink-0" />
              {error}
            </div>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className={`block text-sm font-medium ${
              isDarkMode ? 'text-slate-200' : 'text-slate-700'
            }`}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className={`mt-1 block w-full rounded-md px-3 py-2 ${
                isDarkMode 
                  ? 'bg-slate-700 border-slate-600 text-white' 
                  : 'border-slate-300 text-slate-900'
              } border focus:ring-blue-500 focus:border-blue-500`}
            />
          </div>

          <div>
            <label className={`block text-sm font-medium ${
              isDarkMode ? 'text-slate-200' : 'text-slate-700'
            }`}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className={`mt-1 block w-full rounded-md px-3 py-2 ${
                isDarkMode 
                  ? 'bg-slate-700 border-slate-600 text-white' 
                  : 'border-slate-300 text-slate-900'
              } border focus:ring-blue-500 focus:border-blue-500`}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
              loading ? 'opacity-75 cursor-not-allowed' : ''
            }`}
          >
            {loading ? (
              <div className="w-5 h-5 border-t-2 border-white rounded-full animate-spin" />
            ) : (
              'Sign In'
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;