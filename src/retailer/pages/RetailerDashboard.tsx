import React, { useState, useEffect } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { supabase } from '../../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { 
  CreditCard, 
  Package, 
  ShoppingCart,
  Users, 
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  CheckCircle,
  Info
} from 'lucide-react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const RetailerDashboard: React.FC = () => {
  const { isDarkMode } = useTheme();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeFilter, setTimeFilter] = useState<'day' | 'week' | 'month' | 'custom'>('day');
  const [startDate, setStartDate] = useState<Date>(() => {
    const date = new Date();
    date.setDate(date.getDate() - 1);
    return date;
  });
  const [endDate, setEndDate] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [stats, setStats] = useState({
    totalCustomers: 0,
    totalOrders: 0,
    totalSales: 0,
    lowStockItems: 0,
    salesData: [] as number[],
    profitData: [] as number[],
    customerVisits: [] as number[]
  });
  const [recentBillings, setRecentBillings] = useState<any[]>([]);
  const [lowStockProducts, setLowStockProducts] = useState<any[]>([]);
  const [customerVisitsByDay, setCustomerVisitsByDay] = useState<{ date: string; count: number }[]>([]);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const userEmail = localStorage.getItem('userEmail');
        if (!userEmail) {
          navigate('/login');
          return;
        }

        const { data: user, error: userError } = await supabase
          .from('users')
          .select('*')
          .eq('email', userEmail)
          .eq('role', 'retailer')
          .single();

        if (userError || !user) {
          navigate('/login');
          return;
        }

        fetchDashboardData(user.id);
      } catch (error) {
        console.error('Auth check error:', error);
        navigate('/login');
      }
    };

    checkAuth();
  }, [timeFilter, startDate, endDate, navigate]);

  const handleTimeFilterChange = (filter: 'day' | 'week' | 'month' | 'custom') => {
    const now = new Date();
    let start = new Date();

    switch (filter) {
      case 'day':
        start.setDate(now.getDate() - 1);
        break;
      case 'week':
        start.setDate(now.getDate() - 7);
        break;
      case 'month':
        start.setMonth(now.getMonth() - 1);
        break;
      case 'custom':
        setShowDatePicker(true);
        return;
    }

    setTimeFilter(filter);
    setStartDate(start);
    setEndDate(now);
  };

  const fetchDashboardData = async (userId: string) => {
    try {
      setLoading(true);
      setError(null);

      const { data: retailer, error: retailerError } = await supabase
        .from('retailers')
        .select('id')
        .eq('user_id', userId)
        .single();

      if (retailerError || !retailer) {
        throw new Error('Retailer not found');
      }

      const { data: billings, error: billingsError } = await supabase
        .from('billings')
        .select(`
          *,
          items:billing_items(
            quantity,
            unit_price
          )
        `)
        .eq('retailer_id', retailer.id)
        .gte('billing_date', startDate.toISOString())
        .lte('billing_date', endDate.toISOString())
        .order('billing_date', { ascending: true });

      if (billingsError) throw billingsError;

      const salesByDay = new Map();
      const profitByDay = new Map();
      const visitsByDay = new Map();
      
      billings?.forEach(billing => {
        const date = new Date(billing.billing_date).toISOString().split('T')[0];
        const totalAmount = billing.total_amount;
        const profit = totalAmount * 0.3;

        salesByDay.set(date, (salesByDay.get(date) || 0) + totalAmount);
        profitByDay.set(date, (profitByDay.get(date) || 0) + profit);
        visitsByDay.set(date, (visitsByDay.get(date) || 0) + 1);
      });

      const dateArray = [];
      const currentDate = new Date(startDate);
      while (currentDate <= endDate) {
        dateArray.push(new Date(currentDate).toISOString().split('T')[0]);
        currentDate.setDate(currentDate.getDate() + 1);
      }

      const salesData = dateArray.map(date => salesByDay.get(date) || 0);
      const profitData = dateArray.map(date => profitByDay.get(date) || 0);
      const customerVisits = dateArray.map(date => visitsByDay.get(date) || 0);

      const visitsData = dateArray.map(date => ({
        date,
        count: visitsByDay.get(date) || 0
      }));
      setCustomerVisitsByDay(visitsData);

      const uniqueCustomerDates = new Set(billings?.map(b => b.billing_date.split('T')[0]));

      const { data: products, error: productsError } = await supabase
        .from('retailer_products')
        .select('*')
        .eq('retailer_id', retailer.id)
        .lt('stock_quantity', 10)
        .order('stock_quantity', { ascending: true });

      if (productsError) throw productsError;

      setStats({
        totalCustomers: uniqueCustomerDates.size,
        totalOrders: billings?.length || 0,
        totalSales: salesData.reduce((a, b) => a + b, 0),
        lowStockItems: products?.length || 0,
        salesData,
        profitData,
        customerVisits
      });

      setRecentBillings(billings?.slice(0, 5) || []);
      setLowStockProducts(products?.slice(0, 5) || []);

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const customerVisitsChartData = {
    labels: customerVisitsByDay.map(visit => {
      const date = new Date(visit.date);
      return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    }),
    datasets: [
      {
        label: 'Customer Visits',
        data: customerVisitsByDay.map(visit => visit.count),
        borderColor: 'rgb(99, 102, 241)',
        backgroundColor: 'rgba(99, 102, 241, 0.1)',
        tension: 0.4,
        fill: true
      }
    ]
  };

  const customerVisitsOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          color: isDarkMode ? '#fff' : '#333'
        }
      },
      title: {
        display: true,
        text: 'Daily Customer Visits',
        color: isDarkMode ? '#fff' : '#333'
      }
    },
    scales: {
      x: {
        grid: {
          color: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
        },
        ticks: {
          color: isDarkMode ? '#fff' : '#333'
        }
      },
      y: {
        grid: {
          color: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
        },
        ticks: {
          color: isDarkMode ? '#fff' : '#333',
          stepSize: 1,
          beginAtZero: true
        }
      }
    }
  };

  const salesData = {
    labels: Array.from({ length: stats.salesData.length }, (_, i) => {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }),
    datasets: [
      {
        label: 'Sales',
        data: stats.salesData,
        borderColor: 'rgb(99, 102, 241)',
        backgroundColor: 'rgba(99, 102, 241, 0.1)',
        tension: 0.4,
        fill: true
      },
      {
        label: 'Profit',
        data: stats.profitData,
        borderColor: 'rgb(34, 197, 94)',
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        tension: 0.4,
        fill: true
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          color: isDarkMode ? '#fff' : '#333'
        }
      }
    },
    scales: {
      x: {
        grid: {
          color: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
        },
        ticks: {
          color: isDarkMode ? '#fff' : '#333'
        }
      },
      y: {
        grid: {
          color: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
        },
        ticks: {
          color: isDarkMode ? '#fff' : '#333',
          callback: (value: any) => `₹${value}`
        }
      }
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        
        <div className="flex space-x-2">
          <button
            onClick={() => handleTimeFilterChange('day')}
            className={`px-4 py-2 rounded-md ${
              timeFilter === 'day'
                ? 'bg-blue-600 text-white'
                : isDarkMode
                ? 'bg-slate-700 text-slate-200'
                : 'bg-slate-200 text-slate-700'
            }`}
          >
            Day
          </button>
          <button
            onClick={() => handleTimeFilterChange('week')}
            className={`px-4 py-2 rounded-md ${
              timeFilter === 'week'
                ? 'bg-blue-600 text-white'
                : isDarkMode
                ? 'bg-slate-700 text-slate-200'
                : 'bg-slate-200 text-slate-700'
            }`}
          >
            Week
          </button>
          <button
            onClick={() => handleTimeFilterChange('month')}
            className={`px-4 py-2 rounded-md ${
              timeFilter === 'month'
                ? 'bg-blue-600 text-white'
                : isDarkMode
                ? 'bg-slate-700 text-slate-200'
                : 'bg-slate-200 text-slate-700'
            }`}
          >
            Month
          </button>
          <button
            onClick={() => handleTimeFilterChange('custom')}
            className={`px-4 py-2 rounded-md flex items-center ${
              timeFilter === 'custom'
                ? 'bg-blue-600 text-white'
                : isDarkMode
                ? 'bg-slate-700 text-slate-200'
                : 'bg-slate-200 text-slate-700'
            }`}
          >
            <Calendar size={16} className="mr-2" />
            Custom
          </button>
        </div>
      </div>

      {error && (
        <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-red-900/50 text-red-200' : 'bg-red-50 text-red-800'}`}>
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className={`p-6 rounded-lg shadow-md ${isDarkMode ? 'bg-slate-700' : 'bg-white'}`}>
          <div className="flex justify-between items-center">
            <div>
              <p className={`text-sm ${isDarkMode ? 'text-slate-300' : 'text-slate-500'}`}>Total Sales</p>
              <h3 className="text-2xl font-bold">₹{stats.totalSales.toLocaleString()}</h3>
              <div className="flex items-center mt-2 text-green-500">
              </div>
            </div>
            <div className="p-3 rounded-full bg-blue-100 text-blue-600">
              <TrendingUp size={24} />
            </div>
          </div>
        </div>

        <div className={`p-6 rounded-lg shadow-md ${isDarkMode ? 'bg-slate-700' : 'bg-white'}`}>
          <div className="flex justify-between items-center">
            <div>
              <p className={`text-sm ${isDarkMode ? 'text-slate-300' : 'text-slate-500'}`}>Total Billings</p>
              <h3 className="text-2xl font-bold">{stats.totalOrders}</h3>
              <div className="flex items-center mt-2 text-green-500">
              </div>
            </div>
            <div className="p-3 rounded-full bg-blue-100 text-blue-600">
              <ShoppingCart size={24} />
            </div>
          </div>
        </div>

        <div className={`p-6 rounded-lg shadow-md ${isDarkMode ? 'bg-slate-700' : 'bg-white'}`}>
          <div className="flex justify-between items-center">
            <div>
              <p className={`text-sm ${isDarkMode ? 'text-slate-300' : 'text-slate-500'}`}>Total Orders</p>
              <h3 className="text-2xl font-bold">{stats.totalCustomers}</h3>
            </div>
            <div className="p-3 rounded-full bg-purple-100 text-purple-600">
              <Users size={24} />
            </div>
          </div>
        </div>

        <div className={`p-6 rounded-lg shadow-md ${isDarkMode ? 'bg-slate-700' : 'bg-white'}`}>
          <div className="flex justify-between items-center">
            <div>
              <p className={`text-sm ${isDarkMode ? 'text-slate-300' : 'text-slate-500'}`}>Low Stock Items</p>
              <h3 className="text-2xl font-bold">{stats.lowStockItems}</h3>
              <div className="flex items-center mt-2 text-red-500">
                <AlertTriangle size={16} />
                <span className="text-xs ml-1">Needs attention</span>
              </div>
            </div>
            <div className="p-3 rounded-full bg-red-100 text-red-600">
              <Package size={24} />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className={`p-6 rounded-lg shadow-md ${isDarkMode ? 'bg-slate-700' : 'bg-white'}`}>
          <h2 className="text-lg font-semibold mb-4">Customer Visits</h2>
          <div className="h-[400px]">
            <Line data={customerVisitsChartData} options={customerVisitsOptions} />
          </div>
        </div>

        <div className={`p-6 rounded-lg shadow-md ${isDarkMode ? 'bg-slate-700' : 'bg-white'}`}>
          <h2 className="text-lg font-semibold mb-4">Sales & Profit Analysis</h2>
          <div className="h-[400px]">
            <Line data={salesData} options={chartOptions} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className={`p-6 rounded-lg shadow-md ${isDarkMode ? 'bg-slate-700' : 'bg-white'}`}>
          <h2 className="text-lg font-semibold mb-4">Recent Billings</h2>
          <div className="space-y-4">
            {recentBillings.map(billing => (
              <div
                key={billing.id}
                className={`p-4 rounded-lg ${isDarkMode ? 'bg-slate-600' : 'bg-slate-50'}`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center">
                      <span className="font-medium mr-2">Billing #{billing.id}</span>
                      <span className={`px-2 py-1 rounded-full text-xs flex items-center ${
                        billing.status === 'completed'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {billing.status === 'completed' ? <CheckCircle size={12} className="mr-1" /> :
                         <Clock size={12} className="mr-1" />}
                        {billing.status}
                      </span>
                    </div>
                    <p className={`text-sm mt-1 ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                      {new Date(billing.billing_date).toLocaleDateString()}
                    </p>
                  </div>
                  <span className="font-medium">₹{billing.total_amount.toFixed(2)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className={`p-6 rounded-lg shadow-md ${isDarkMode ? 'bg-slate-700' : 'bg-white'}`}>
          <h2 className="text-lg font-semibold mb-4">Low Stock Products</h2>
          <div className="space-y-4">
            {lowStockProducts.map(product => (
              <div
                key={product.id}
                className={`p-4 rounded-lg ${isDarkMode ? 'bg-slate-600' : 'bg-slate-50'}`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-medium">{product.name}</h3>
                    <p className={`text-sm ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                      ₹{product.price.toFixed(2)}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className={`inline-block px-2 py-1 rounded-full text-xs ${
                      product.stock_quantity === 0
                        ? 'bg-red-100 text-red-800'
                        : product.stock_quantity < 5
                        ? 'bg-orange-100 text-orange-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {product.stock_quantity} units left
                    </span>
                  </div>
                </div>
                <div className="mt-2 w-full bg-slate-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${
                      product.stock_quantity === 0
                        ? 'bg-red-500'
                        : product.stock_quantity < 5
                        ? 'bg-orange-500'
                        : 'bg-yellow-500'
                    }`}
                    style={{ width: `${Math.min((product.stock_quantity / 10) * 100, 100)}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {showDatePicker && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className={`p-6 rounded-lg shadow-md ${isDarkMode ? 'bg-slate-700' : 'bg-white'} w-full max-w-md`}>
            <h2 className="text-lg font-semibold mb-4">Select Date Range</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Start Date</label>
                <input
                  type="date"
                  value={startDate.toISOString().split('T')[0]}
                  onChange={(e) => setStartDate(new Date(e.target.value))}
                  className={`w-full p-2 rounded-md ${
                    isDarkMode ? 'bg-slate-600 text-white' : 'bg-slate-100 text-slate-900'
                  }`}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">End Date</label>
                <input
                  type="date"
                  value={endDate.toISOString().split('T')[0]}
                  onChange={(e) => setEndDate(new Date(e.target.value))}
                  className={`w-full p-2 rounded-md ${
                    isDarkMode ? 'bg-slate-600 text-white' : 'bg-slate-100 text-slate-900'
                  }`}
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end space-x-4">
              <button
                onClick={() => setShowDatePicker(false)}
                className="px-4 py-2 bg-slate-500 hover:bg-slate-600 text-white rounded-md"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setTimeFilter('custom');
                  setShowDatePicker(false);
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RetailerDashboard;