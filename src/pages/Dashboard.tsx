import React, { useState, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';
import { supabase } from '../lib/supabase';
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
  AlertCircle,
  Info
} from 'lucide-react';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  BarElement,
  ArcElement
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

interface DashboardStats {
  totalSales: number;
  totalOrders: number;
  totalRetailers: number;
  totalProducts: number;
  lowStockItems: number;
  salesData: number[];
  profitData: number[];
  productData: {
    labels: string[];
    values: number[];
  };
}

interface RecentOrder {
  id: number;
  total_amount: number;
  status: string;
  created_at: string;
  retailer: {
    name: string;
  };
}

interface LowStockProduct {
  id: number;
  name: string;
  stock_quantity: number;
  price: number;
}

type TimeFilter = 'day' | 'week' | 'month' | 'custom';

const Dashboard: React.FC = () => {
  const { isDarkMode } = useTheme();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('day');
  const [startDate, setStartDate] = useState<Date>(() => {
    const date = new Date();
    date.setDate(date.getDate() - 1); // Previous day by default
    return date;
  });
  const [endDate, setEndDate] = useState<Date>(new Date());
  const [stats, setStats] = useState<DashboardStats>({
    totalSales: 0,
    totalOrders: 0,
    totalRetailers: 0,
    totalProducts: 0,
    lowStockItems: 0,
    salesData: [],
    profitData: [],
    productData: {
      labels: [],
      values: []
    }
  });
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [lowStockProducts, setLowStockProducts] = useState<LowStockProduct[]>([]);

  useEffect(() => {
    fetchDashboardData();
  }, [timeFilter, startDate, endDate]);

  const handleTimeFilterChange = (filter: TimeFilter) => {
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

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch total retailers
      const { data: retailers, error: retailersError } = await supabase
        .from('retailers')
        .select('id');
      
      if (retailersError) throw retailersError;

      // Fetch products and low stock items
      const { data: products, error: productsError } = await supabase
        .from('admin_products')
        .select('*');
      
      if (productsError) throw productsError;

      const lowStock = products?.filter(p => p.stock_quantity < 10) || [];

      // Fetch orders within date range
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select(`
          id,
          total_amount,
          status,
          order_date,
          order_items (
            quantity,
            admin_product_id,
            admin_products (name)
          )
        `)
        .gte('order_date', startDate.toISOString())
        .lte('order_date', endDate.toISOString())
        .order('order_date');

      if (ordersError) throw ordersError;

      // Calculate sales and profit data by day
      const salesByDay = new Map();
      const profitByDay = new Map();
      const productSales = new Map();
      
      orders?.forEach(order => {
        const date = new Date(order.order_date).toISOString().split('T')[0];
        salesByDay.set(date, (salesByDay.get(date) || 0) + order.total_amount);
        profitByDay.set(date, (profitByDay.get(date) || 0) + (order.total_amount * 0.3));

        // Calculate product distribution
        order.order_items?.forEach(item => {
          const productName = item.admin_products?.name || 'Unknown Product';
          productSales.set(
            productName,
            (productSales.get(productName) || 0) + (item.quantity || 0)
          );
        });
      });

      // Get all dates between start and end date
      const dateArray = [];
      const currentDate = new Date(startDate);
      while (currentDate <= endDate) {
        dateArray.push(new Date(currentDate).toISOString().split('T')[0]);
        currentDate.setDate(currentDate.getDate() + 1);
      }

      // Fill in missing dates with 0
      const salesData = dateArray.map(date => salesByDay.get(date) || 0);
      const profitData = dateArray.map(date => profitByDay.get(date) || 0);

      // Fetch recent orders
      const { data: recentOrdersData, error: recentOrdersError } = await supabase
        .from('orders')
        .select(`
          id,
          total_amount,
          status,
          created_at,
          retailers (name)
        `)
        .order('created_at', { ascending: false })
        .limit(5);

      if (recentOrdersError) throw recentOrdersError;
      setRecentOrders(recentOrdersData || []);

      // Fetch low stock products
      const { data: lowStockData, error: lowStockError } = await supabase
        .from('admin_products')
        .select('id, name, stock_quantity, price')
        .lt('stock_quantity', 10)
        .order('stock_quantity', { ascending: true })
        .limit(5);

      if (lowStockError) throw lowStockError;
      setLowStockProducts(lowStockData || []);

      setStats({
        totalSales: salesData.reduce((a, b) => a + b, 0),
        totalOrders: orders?.length || 0,
        totalRetailers: retailers?.length || 0,
        totalProducts: products?.length || 0,
        lowStockItems: lowStock.length,
        salesData,
        profitData,
        productData: {
          labels: Array.from(productSales.keys()),
          values: Array.from(productSales.values())
        }
      });

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
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

  const productData = {
    labels: stats.productData.labels,
    datasets: [
      {
        data: stats.productData.values,
        backgroundColor: [
          'rgba(99, 102, 241, 0.8)',  // blue
          'rgba(34, 197, 94, 0.8)',   // Green
          'rgba(234, 179, 8, 0.8)',   // Yellow
          'rgba(239, 68, 68, 0.8)',   // Red
          'rgba(168, 85, 247, 0.8)',  // Purple
          'rgba(59, 130, 246, 0.8)',  // Blue
          'rgba(249, 115, 22, 0.8)',  // Orange
          'rgba(236, 72, 153, 0.8)'   // Pink
        ],
        borderColor: [
          'rgb(99, 102, 241)',
          'rgb(34, 197, 94)',
          'rgb(234, 179, 8)',
          'rgb(239, 68, 68)',
          'rgb(168, 85, 247)',
          'rgb(59, 130, 246)',
          'rgb(249, 115, 22)',
          'rgb(236, 72, 153)'
        ],
        borderWidth: 2,
        hoverOffset: 4
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
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

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          padding: 20,
          color: isDarkMode ? '#fff' : '#333',
          font: {
            size: 12
          },
          usePointStyle: true,
          pointStyle: 'circle'
        }
      },
      tooltip: {
        backgroundColor: isDarkMode ? 'rgba(17, 24, 39, 0.8)' : 'rgba(255, 255, 255, 0.8)',
        titleColor: isDarkMode ? '#fff' : '#000',
        bodyColor: isDarkMode ? '#fff' : '#000',
        borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
        borderWidth: 1,
        padding: 12,
        displayColors: true,
        callbacks: {
          label: function(context: any) {
            const label = context.label || '';
            const value = context.raw || 0;
            const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
            const percentage = ((value / total) * 100).toFixed(1);
            return `${label}: ${value} (${percentage}%)`;
          }
        }
      }
    },
    cutout: '60%',
    radius: '90%'
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
                ? 'bg-gray-700 text-gray-200'
                : 'bg-gray-200 text-gray-700'
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
                ? 'bg-gray-700 text-gray-200'
                : 'bg-gray-200 text-gray-700'
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
                ? 'bg-gray-700 text-gray-200'
                : 'bg-gray-200 text-gray-700'
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
                ? 'bg-gray-700 text-gray-200'
                : 'bg-gray-200 text-gray-700'
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
        <div className={`p-6 rounded-lg shadow-md ${isDarkMode ? 'bg-gray-700' : 'bg-white'}`}>
          <div className="flex justify-between items-center">
            <div>
              <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>Total Sales</p>
              <h3 className="text-2xl font-bold">₹{stats.totalSales.toLocaleString()}</h3>
              <div className="flex items-center mt-2 text-green-500">
              </div>
            </div>
            <div className="p-3 rounded-full bg-blue-100 text-blue-600">
              <TrendingUp size={24} />
            </div>
          </div>
        </div>

        <div className={`p-6 rounded-lg shadow-md ${isDarkMode ? 'bg-gray-700' : 'bg-white'}`}>
          <div className="flex justify-between items-center">
            <div>
              <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>Total Orders</p>
              <h3 className="text-2xl font-bold">{stats.totalOrders}</h3>
              <div className="flex items-center mt-2 text-green-500">
              </div>
            </div>
            <div className="p-3 rounded-full bg-blue-100 text-blue-600">
              <ShoppingCart size={24} />
            </div>
          </div>
        </div>

        <div className={`p-6 rounded-lg shadow-md ${isDarkMode ? 'bg-gray-700' : 'bg-white'}`}>
          <div className="flex justify-between items-center">
            <div>
              <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>Total Retailers</p>
              <h3 className="text-2xl font-bold">{stats.totalRetailers}</h3>
            </div>
            <div className="p-3 rounded-full bg-purple-100 text-purple-600">
              <Users size={24} />
            </div>
          </div>
        </div>

        <div className={`p-6 rounded-lg shadow-md ${isDarkMode ? 'bg-gray-700' : 'bg-white'}`}>
          <div className="flex justify-between items-center">
            <div>
              <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>Low Stock Items</p>
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className={`p-6 rounded-lg shadow-md ${isDarkMode ? 'bg-gray-700' : 'bg-white'}`}>
            <h2 className="text-lg font-semibold mb-4">Sales & Profit Analysis</h2>
            <div className="h-[400px]">
              <Line data={salesData} options={chartOptions} />
            </div>
          </div>
        </div>

        <div>
          <div className={`p-6 rounded-lg shadow-md ${isDarkMode ? 'bg-gray-700' : 'bg-white'}`}>
            <h2 className="text-lg font-semibold mb-4">Product Distribution</h2>
            <div className="h-[400px] flex flex-col">
              <div className="flex-1">
                <Doughnut data={productData} options={doughnutOptions} />
              </div>
              <div className={`mt-4 text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                <p className="text-center">Total Products Sold: {stats.productData.values.reduce((a, b) => a + b, 0)}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className={`p-6 rounded-lg shadow-md ${isDarkMode ? 'bg-gray-700' : 'bg-white'}`}>
          <h2 className="text-lg font-semibold mb-4">Recent Orders</h2>
          <div className="space-y-4">
            {recentOrders.map(order => (
              <div
                key={order.id}
                className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-600' : 'bg-gray-50'}`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center">
                      <span className="font-medium mr-2">Order #{order.id}</span>
                      <span className={`px-2 py-1 rounded-full text-xs flex items-center ${
                        order.status === 'completed'
                          ? 'bg-green-100 text-green-800'
                          : order.status === 'pending'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {order.status === 'completed' ? <CheckCircle size={12} className="mr-1" /> :
                         order.status === 'pending' ? <Clock size={12} className="mr-1" /> :
                         <Info size={12} className="mr-1" />}
                        {order.status}
                      </span>
                    </div>
                    <p className={`text-sm mt-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                      {order.retailer?.name}
                    </p>
                  </div>
                  <span className="font-medium">₹{order.total_amount.toFixed(2)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className={`p-6 rounded-lg shadow-md ${isDarkMode ? 'bg-gray-700' : 'bg-white'}`}>
          <h2 className="text-lg font-semibold mb-4">Low Stock Products</h2>
          <div className="space-y-4">
            {lowStockProducts.map(product => (
              <div
                key={product.id}
                className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-600' : 'bg-gray-50'}`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-medium">{product.name}</h3>
                    <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
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
                <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
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
          <div className={`p-6 rounded-lg shadow-md ${isDarkMode ? 'bg-gray-700' : 'bg-white'} w-full max-w-md`}>
            <h2 className="text-lg font-semibold mb-4">Select Date Range</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Start Date</label>
                <input
                  type="date"
                  value={startDate.toISOString().split('T')[0]}
                  onChange={(e) => setStartDate(new Date(e.target.value))}
                  className={`w-full p-2 rounded-md ${
                    isDarkMode ? 'bg-gray-600 text-white' : 'bg-gray-100 text-gray-900'
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
                    isDarkMode ? 'bg-gray-600 text-white' : 'bg-gray-100 text-gray-900'
                  }`}
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end space-x-4">
              <button
                onClick={() => setShowDatePicker(false)}
                className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-md"
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

export default Dashboard;