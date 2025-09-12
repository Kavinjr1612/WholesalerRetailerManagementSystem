import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { User, AlertCircle, Lock, Mail, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { sendEmail } from '../lib/emailService';

const RetailerLogin: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .maybeSingle();

      if (userError || !userData) {
        throw new Error('User not found. Please check your email or password.');
      }

      if (password !== userData.password_hash) {
        throw new Error('Invalid email or password.');
      }

      if (userData.role !== 'retailer') {
        throw new Error('Unauthorized access. Invalid role.');
      }

      localStorage.setItem('userEmail', email);
      navigate('/retailer/dashboard');
      
    } catch (error) {
      console.error('Login error:', error);
      setError(error instanceof Error ? error.message : 'Failed to login');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .eq('role', 'retailer')
        .single();

      if (userError || !user) {
        throw new Error('No retailer account found with this email.');
      }

      const tempPassword = Math.random().toString(36).slice(-8);

      const { error: updateError } = await supabase
        .from('users')
        .update({ password_hash: tempPassword })
        .eq('id', user.id);

      if (updateError) throw updateError;

      await sendEmail({
        to: email,
        subject: 'Password Reset - Sweet & Snacks Wholesaler',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Password Reset</h2>
            <p>Dear Retailer,</p>
            <p>Your password has been reset. Here are your temporary credentials:</p>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Temporary Password:</strong> ${tempPassword}</p>
            <p>Please login with these credentials and change your password immediately.</p>
            <p>If you didn't request this password reset, please contact support immediately.</p>
            <p>Best regards,<br>Sweet & Snacks Wholesaler Team</p>
          </div>
        `
      });

      setResetEmailSent(true);
    } catch (error) {
      console.error('Password reset error:', error);
      setError(error instanceof Error ? error.message : 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-900 to-emerald-800"
      style={{
        backgroundImage: `url('/images/retailerbackground.jpg')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      }}
    >
      <div className="max-w-md w-full mx-4 bg-emerald-800/50 backdrop-blur-lg rounded-lg shadow-2xl p-8 border border-emerald-700">
        {showForgotPassword ? (
          <>
            <div className="flex items-center mb-6">
              <button
                onClick={() => setShowForgotPassword(false)}
                className="text-gray-400 hover:text-white mr-4"
              >
                <ArrowLeft size={20} />
              </button>
              <h2 className="text-2xl font-bold text-white">Reset Password</h2>
            </div>

            {resetEmailSent ? (
              <div className="text-center">
                <div className="mb-4 text-green-400">
                  <Mail size={48} className="mx-auto mb-4" />
                  <p>Password reset email sent!</p>
                </div>
                <p className="text-gray-300 mb-4">
                  Please check your email for your temporary password.
                </p>
                <button
                  onClick={() => {
                    setShowForgotPassword(false);
                    setResetEmailSent(false);
                  }}
                  className="text-emerald-400 hover:text-emerald-300"
                >
                  Return to login
                </button>
              </div>
            ) : (
              <form onSubmit={handleForgotPassword} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-200 mb-2">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail size={20} className="absolute left-3 top-2.5 text-gray-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="pl-10 pr-4 py-2 w-full rounded-md bg-emerald-700/50 border-emerald-600 text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      placeholder="Enter your email"
                    />
                  </div>
                </div>

                {error && (
                  <div className="p-4 rounded-md bg-red-900/50 text-red-200">
                    <div className="flex items-center">
                      <AlertCircle size={16} className="mr-2 flex-shrink-0" />
                      {error}
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-t-2 border-white rounded-full animate-spin" />
                  ) : (
                    'Reset Password'
                  )}
                </button>
              </form>
            )}
          </>
        ) : (
          <>
            <div className="flex justify-center mb-8">
              <div className="w-20 h-20 rounded-full bg-emerald-600/20 flex items-center justify-center overflow-hidden">
                <img 
                  src="/images/logo.png"
                  alt="Retailer Logo"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>

            <h1 className="text-2xl font-bold text-center text-white mb-8">Retailer Login</h1>

            {error && (
              <div className="mb-4 p-4 rounded-md bg-red-900/50 text-red-200">
                <div className="flex items-center">
                  <AlertCircle size={16} className="mr-2 flex-shrink-0" />
                  {error}
                </div>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-200 mb-2">
                  Email
                </label>
                <div className="relative">
                  <Mail size={20} className="absolute left-3 top-2.5 text-gray-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="pl-10 pr-4 py-2 w-full rounded-md bg-emerald-700/50 border-emerald-600 text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    placeholder="Enter your email"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-200 mb-2">
                  Password
                </label>
                <div className="relative">
                  <Lock size={20} className="absolute left-3 top-2.5 text-gray-400" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="pl-10 pr-12 py-2 w-full rounded-md bg-emerald-700/50 border-emerald-600 text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    placeholder="Enter your password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-300"
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setShowForgotPassword(true)}
                  className="text-sm text-emerald-400 hover:text-emerald-300"
                >
                  Forgot password?
                </button>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50"
              >
                {loading ? (
                  <div className="w-5 h-5 border-t-2 border-white rounded-full animate-spin" />
                ) : (
                  'Sign In'
                )}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
};

export default RetailerLogin;