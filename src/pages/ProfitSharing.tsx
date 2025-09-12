import React, { useState, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';
import { supabase } from '../lib/supabase';
import {
  Store, 
  DollarSign, 
  TrendingUp,
  Calendar,
  Package,
  ArrowUpRight,
  ArrowDownRight,
  LineChart
} from 'lucide-react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
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

interface RetailerProfit {
  retailerId: number;
  retailerName: string;
  totalRevenue: number;
  totalCost: number;
  totalProfit: number;
  averageMargin: number;
  profitByDate: { [date: string]: number };
}

interface ProductProfit {
  productId: number;
  productName: string;
  wholesalePrice: number;
  retailPrice: number;
  quantitySold: number;
  totalRevenue: number;
  totalCost: number;
  profitMargin: number;
  profitPerUnit: number;
}

const ProfitSharing: React.FC = () => {
  const { isDarkMode } = useTheme();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [startDate, setStartDate] = useState<Date>(new Date(new Date().setMonth(new Date().getMonth() - 1)));
  const [endDate, setEndDate] = useState<Date>(new Date());
  const [selectedRetailer, setSelectedRetailer] = useState<string>('all');
  const [retailers, setRetailers] = useState<{ id: number; name: string }[]>([]);
  const [profitData, setProfitData] = useState<RetailerProfit[]>([]);
  const [selectedRetailerProducts, setSelectedRetailerProducts] = useState<ProductProfit[]>([]);

  useEffect(() => {
    fetchRetailers();
  }, []);

  useEffect(() => {
    fetchProfitData();
  }, [startDate, endDate, selectedRetailer]);

  const fetchRetailers = async () => {
    try {
      const { data, error } = await supabase
        .from('retailers')
        .select('id, name')
        .order('name');

      if (error) throw error;
      setRetailers(data || []);
    } catch (error) {
      console.error('Error fetching retailers:', error);
      setError('Failed to load retailers');
    }
  };

  const fetchProfitData = async () => {
    try {
      setLoading(true);
      setError(null);

      // First get retailer details
      const retailersQuery = await supabase
        .from('retailers')
        .select('id, name')
        .order('name');

      if (retailersQuery.error) throw retailersQuery.error;
      const retailersData = retailersQuery.data || [];
      const retailersMap = new Map(retailersData.map(r => [r.id, r.name]));

      let query = supabase
        .from('billing_items')
        .select(`
          quantity,
          unit_price,
          retailer_product:retailer_products (
            id,
            name,
            price,
            admin_products (
              id,
              name,
              price
            )
          ),
          billing:billings (
            id,
            retailer_id,
            created_at
          )
        `)
        .gte('billing.created_at', startDate.toISOString())
        .lte('billing.created_at', endDate.toISOString());

      if (selectedRetailer !== 'all') {
        query = query.eq('billing.retailer_id', selectedRetailer);
      }

      const { data, error } = await query;
      if (error) throw error;

      const retailerMap = new Map<number, RetailerProfit>();
      const productMap = new Map<number, ProductProfit>();

      data?.forEach(item => {
        if (!item.billing || !item.retailer_product) return; // Skip invalid entries

        const retailerId = item.billing.retailer_id;
        const retailerName = retailersMap.get(retailerId) || 'Unknown Retailer';
        const wholesalePrice = item.retailer_product.admin_products?.price || 0;
        const retailPrice = item.unit_price;
        const quantity = item.quantity;
        const revenue = retailPrice * quantity;
        const cost = wholesalePrice * quantity;
        const profit = revenue - cost;
        const date = new Date(item.billing.created_at).toISOString().split('T')[0];

        // Update retailer data
        if (!retailerMap.has(retailerId)) {
          retailerMap.set(retailerId, {
            retailerId,
            retailerName,
            totalRevenue: 0,
            totalCost: 0,
            totalProfit: 0,
            averageMargin: 0,
            profitByDate: {}
          });
        }

        const retailerData = retailerMap.get(retailerId)!;
        retailerData.totalRevenue += revenue;
        retailerData.totalCost += cost;
        retailerData.totalProfit += profit;
        retailerData.profitByDate[date] = (retailerData.profitByDate[date] || 0) + profit;
        retailerData.averageMargin = (retailerData.totalProfit / retailerData.totalCost) * 100;

        // Update product data for selected retailer
        if (selectedRetailer !== 'all' && retailerId.toString() === selectedRetailer) {
          const productId = item.retailer_product.id;
          if (!productMap.has(productId)) {
            productMap.set(productId, {
              productId,
              productName: item.retailer_product.name,
              wholesalePrice,
              retailPrice,
              quantitySold: 0,
              totalRevenue: 0,
              totalCost: 0,
              profitMargin: 0,
              profitPerUnit: retailPrice - wholesalePrice
            });
          }

          const productData = productMap.get(productId)!;
          productData.quantitySold += quantity;
          productData.totalRevenue += revenue;
          productData.totalCost += cost;
          productData.profitMargin = ((productData.totalRevenue - productData.totalCost) / productData.totalCost) * 100;
        }
      });

      setProfitData(Array.from(retailerMap.values()));
      setSelectedRetailerProducts(Array.from(productMap.values()));
    } catch (error) {
      console.error('Error fetching profit data:', error);
      setError('Failed to load profit data');
    } finally {
      setLoading(false);
    }
  };

  const chartData = {
    labels: profitData.map(retailer => retailer.retailerName),
    datasets: [
      {
        label: 'Total Profit',
        data: profitData.map(retailer => retailer.totalProfit),
        borderColor: 'rgb(99, 102, 241)',
        backgroundColor: 'rgba(99, 102, 241, 0.1)',
        tension: 0.4,
        fill: true
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
          callback: (value: any) => `₹${value.toLocaleString()}`
        }
      }
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  const totalStats = profitData.reduce((acc, retailer) => ({
    revenue: acc.revenue + retailer.totalRevenue,
    profit: acc.profit + retailer.totalProfit,
    margin: acc.margin + retailer.averageMargin
  }), { revenue: 0, profit: 0, margin: 0 });

  const averageMargin = profitData.length > 0 ? totalStats.margin / profitData.length : 0;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Profit Analysis</h1>

        <div className="flex items-center space-x-4">
          <select
            value={selectedRetailer}
            onChange={(e) => setSelectedRetailer(e.target.value)}
            className={`p-2 rounded-md ${
              isDarkMode ? 'bg-gray-700 text-white' : 'bg-white text-gray-900'
            } border border-gray-300`}
          >
            <option value="all">All Retailers</option>
            {retailers.map(retailer => (
              <option key={retailer.id} value={retailer.id}>{retailer.name}</option>
            ))}
          </select>

          <div className="flex items-center space-x-2">
            <DatePicker
              selected={startDate}
              onChange={(date) => setStartDate(date || new Date())}
              className={`p-2 rounded-md ${
                isDarkMode ? 'bg-gray-700 text-white' : 'bg-white text-gray-900'
              } border border-gray-300`}
              dateFormat="dd/MM/yyyy"
            />
            <span>to</span>
            <DatePicker
              selected={endDate}
              onChange={(date) => setEndDate(date || new Date())}
              className={`p-2 rounded-md ${
                isDarkMode ? 'bg-gray-700 text-white' : 'bg-white text-gray-900'
              } border border-gray-300`}
              dateFormat="dd/MM/yyyy"
            />
          </div>
        </div>
      </div>

      {error && (
        <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-red-900/50 text-red-200' : 'bg-red-50 text-red-800'}`}>
          {error}
        </div>
      )}

      {/* Overall Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className={`p-6 rounded-lg shadow-md ${isDarkMode ? 'bg-gray-700' : 'bg-white'}`}>
          <div className="flex justify-between items-center">
            <div>
              <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>Total Revenue</p>
              <h3 className="text-2xl font-bold">₹{totalStats.revenue.toLocaleString()}</h3>
            </div>
            <div className="p-3 rounded-full bg-blue-100 text-blue-600">
              <DollarSign size={24} />
            </div>
          </div>
        </div>

        <div className={`p-6 rounded-lg shadow-md ${isDarkMode ? 'bg-gray-700' : 'bg-white'}`}>
          <div className="flex justify-between items-center">
            <div>
              <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>Total Profit</p>
              <h3 className="text-2xl font-bold">₹{totalStats.profit.toLocaleString()}</h3>
            </div>
            <div className="p-3 rounded-full bg-green-100 text-green-600">
              <TrendingUp size={24} />
            </div>
          </div>
        </div>

        <div className={`p-6 rounded-lg shadow-md ${isDarkMode ? 'bg-gray-700' : 'bg-white'}`}>
          <div className="flex justify-between items-center">
            <div>
              <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>Average Margin</p>
              <h3 className="text-2xl font-bold">{averageMargin.toFixed(2)}%</h3>
            </div>
            <div className="p-3 rounded-full bg-purple-100 text-purple-600">
              <Store size={24} />
            </div>
          </div>
        </div>
      </div>

      {/* Profit Chart */}
      {selectedRetailer === 'all' && (
        <div className={`p-6 rounded-lg shadow-md ${isDarkMode ? 'bg-gray-700' : 'bg-white'}`}>
          <h2 className="text-lg font-semibold mb-4">Retailer Profit Distribution</h2>
          <div className="h-[400px]">
            <Line data={chartData} options={chartOptions} />
          </div>
        </div>
      )}

      {/* Retailer List or Selected Retailer Products */}
      <div className={`p-6 rounded-lg shadow-md ${isDarkMode ? 'bg-gray-700' : 'bg-white'}`}>
        {selectedRetailer === 'all' ? (
          <>
            <h2 className="text-lg font-semibold mb-4">Retailer Performance</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className={`border-b ${isDarkMode ? 'border-gray-600' : 'border-gray-200'}`}>
                    <th className="text-left py-3 px-4">Retailer</th>
                    <th className="text-right py-3 px-4">Total Revenue</th>
                    <th className="text-right py-3 px-4">Total Profit</th>
                    <th className="text-right py-3 px-4">Margin %</th>
                  </tr>
                </thead>
                <tbody>
                  {profitData.map(retailer => (
                    <tr key={retailer.retailerId} className={`border-b ${isDarkMode ? 'border-gray-600' : 'border-gray-200'}`}>
                      <td className="py-3 px-4">{retailer.retailerName}</td>
                      <td className="text-right py-3 px-4">₹{retailer.totalRevenue.toLocaleString()}</td>
                      <td className="text-right py-3 px-4">
                        <div className="flex items-center justify-end">
                          <span className={retailer.totalProfit > 0 ? 'text-green-500' : 'text-red-500'}>
                            ₹{retailer.totalProfit.toLocaleString()}
                          </span>
                          {retailer.totalProfit > 0 ? (
                            <ArrowUpRight size={16} className="ml-1 text-green-500" />
                          ) : (
                            <ArrowDownRight size={16} className="ml-1 text-red-500" />
                          )}
                        </div>
                      </td>
                      <td className="text-right py-3 px-4">
                        <span className={retailer.averageMargin > 0 ? 'text-green-500' : 'text-red-500'}>
                          {retailer.averageMargin.toFixed(2)}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <>
            <h2 className="text-lg font-semibold mb-4">Product Performance</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className={`border-b ${isDarkMode ? 'border-gray-600' : 'border-gray-200'}`}>
                    <th className="text-left py-3 px-4">Product</th>
                    <th className="text-right py-3 px-4">Wholesale Price</th>
                    <th className="text-right py-3 px-4">Retail Price</th>
                    <th className="text-right py-3 px-4">Quantity Sold</th>
                    <th className="text-right py-3 px-4">Total Revenue</th>
                    <th className="text-right py-3 px-4">Profit/Unit</th>
                    <th className="text-right py-3 px-4">Margin %</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedRetailerProducts.map(product => (
                    <tr key={product.productId} className={`border-b ${isDarkMode ? 'border-gray-600' : 'border-gray-200'}`}>
                      <td className="py-3 px-4">
                        <div className="flex items-center">
                          <div className="w-8 h-8 bg-gray-200 rounded flex items-center justify-center mr-3">
                            <Package size={16} className="text-gray-400" />
                          </div>
                          {product.productName}
                        </div>
                      </td>
                      <td className="text-right py-3 px-4">₹{product.wholesalePrice.toFixed(2)}</td>
                      <td className="text-right py-3 px-4">₹{product.retailPrice.toFixed(2)}</td>
                      <td className="text-right py-3 px-4">{product.quantitySold}</td>
                      <td className="text-right py-3 px-4">₹{product.totalRevenue.toLocaleString()}</td>
                      <td className="text-right py-3 px-4">
                        <div className="flex items-center justify-end">
                          <span className={`${product.profitPerUnit > 0 ? 'text-green-500' : 'text-red-500'}`}>
                            ₹{product.profitPerUnit.toFixed(2)}
                          </span>
                          {product.profitPerUnit > 0 ? (
                            <ArrowUpRight size={16} className="ml-1 text-green-500" />
                          ) : (
                            <ArrowDownRight size={16} className="ml-1 text-red-500" />
                          )}
                        </div>
                      </td>
                      <td className="text-right py-3 px-4">
                        <span className={`${product.profitMargin > 0 ? 'text-green-500' : 'text-red-500'}`}>
                          {product.profitMargin.toFixed(2)}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ProfitSharing;