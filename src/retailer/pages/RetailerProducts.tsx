import React, { useState, useEffect } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { supabase } from '../../lib/supabase';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../components/ui/tabs';
import {
  Package,
  Search,
  Edit,
  Save,
  X,
  Calendar,
  IndianRupee,
  TrendingUp,
  Tag,
  PieChart
} from 'lucide-react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

interface Product {
  id: number;
  name: string;
  description: string | null;
  price: number;
  admin_price?: number;
  stock_quantity: number;
  image_url: string | null;
  category_name: string | null;
  admin_products?: {
    category_name: string | null;
  };
}

interface ProfitData {
  productId: number;
  productName: string;
  quantitySold: number;
  totalProfit: number;
}

const RetailerProducts: React.FC = () => {
  const { isDarkMode } = useTheme();
  const [retailerProducts, setRetailerProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [categories, setCategories] = useState<string[]>([]);
  const [stockFilter, setStockFilter] = useState<'all' | 'low' | 'out'>('all');
  const [editingProduct, setEditingProduct] = useState<number | null>(null);
  const [newPrice, setNewPrice] = useState<string>('');
  const [startDate, setStartDate] = useState<Date>(new Date(new Date().setMonth(new Date().getMonth() - 1)));
  const [endDate, setEndDate] = useState<Date>(new Date());
  const [profitData, setProfitData] = useState<ProfitData[]>([]);
  const [totalStats, setTotalStats] = useState({
    totalSales: 0,
    averageMargin: 0
  });

  useEffect(() => {
    fetchProducts();
    calculateProfits();
  }, [startDate, endDate]);

  useEffect(() => {
    const uniqueCategories = Array.from(
      new Set(retailerProducts.map(product => product.category_name).filter(Boolean))
    );
    setCategories(uniqueCategories as string[]);
  }, [retailerProducts]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      setError(null);

      const userEmail = localStorage.getItem('userEmail');
      if (!userEmail) {
        throw new Error('User not authenticated');
      }

      const { data: retailer, error: retailerError } = await supabase
        .from('retailers')
        .select('id')
        .eq('email', userEmail)
        .single();

      if (retailerError || !retailer) {
        throw new Error('Retailer not found');
      }

      const { data: products, error: productsError } = await supabase
        .from('retailer_products')
        .select(`
          *,
          admin_products (
            price,
            category_name
          )
        `)
        .eq('retailer_id', retailer.id);

      if (productsError) throw productsError;

      const formattedProducts = products?.map(product => ({
        ...product,
        admin_price: product.admin_products?.price || 0,
        category_name: product.admin_products?.category_name || product.category_name
      }));

      setRetailerProducts(formattedProducts || []);
    } catch (error) {
      console.error('Error fetching retailer products:', error);
      setError('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const calculateProfits = async () => {
    try {
      const userEmail = localStorage.getItem('userEmail');
      if (!userEmail) {
        throw new Error('User not authenticated');
      }

      const { data: retailer, error: retailerError } = await supabase
        .from('retailers')
        .select('id')
        .eq('email', userEmail)
        .single();

      if (retailerError || !retailer) {
        throw new Error('Retailer not found');
      }

      const { data: billings } = await supabase
        .from('billing_items')
        .select(`
          quantity,
          unit_price,
          retailer_product:retailer_products (
            id,
            name,
            admin_products (
              price
            )
          ),
          billing:billings (
            retailer_id
          )
        `)
        .eq('billing.retailer_id', retailer.id);

      if (!billings) return;

      const profitMap = new Map<string, ProfitData>();

      billings.forEach(billing => {
        const productName = billing.retailer_product.name;
        const adminPrice = billing.retailer_product.admin_products?.price || 0;
        const retailerPrice = billing.unit_price;
        const quantity = billing.quantity;
        const profit = (retailerPrice - adminPrice) * quantity;

        if (!profitMap.has(productName)) {
          profitMap.set(productName, {
            productId: billing.retailer_product.id,
            productName,
            quantitySold: 0,
            totalProfit: 0
          });
        }

        const data = profitMap.get(productName)!;
        data.quantitySold += quantity;
        data.totalProfit += profit;
      });

      const profitArray = Array.from(profitMap.values());
      setProfitData(profitArray);

      const totalSales = billings.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0);
      const averageMargin = totalSales > 0 ? (profitArray.reduce((sum, item) => sum + item.totalProfit, 0) / totalSales) * 100 : 0;

      setTotalStats({
        totalSales,
        averageMargin
      });

    } catch (error) {
      console.error('Error calculating profits:', error);
    }
  };

  const handlePriceUpdate = async (productId: number) => {
    try {
      const price = parseFloat(newPrice);
      if (isNaN(price) || price <= 0) {
        setError('Invalid price value');
        return;
      }

      const { error: updateError } = await supabase
        .from('retailer_products')
        .update({ price })
        .eq('id', productId);

      if (updateError) throw updateError;

      setEditingProduct(null);
      setNewPrice('');
      fetchProducts();
    } catch (error) {
      console.error('Error updating price:', error);
      setError('Failed to update price');
    }
  };

  const filteredProducts = retailerProducts.filter((product) => {
    const matchesSearch =
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (product.description?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false);

    const matchesCategory =
      categoryFilter === 'all' ||
      (categoryFilter === 'uncategorized' && !product.category_name) ||
      product.category_name === categoryFilter;

    return matchesSearch && matchesCategory;
  });

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Products Management</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className={`p-6 rounded-lg shadow-md ${isDarkMode ? 'bg-slate-700' : 'bg-white'}`}>
          <div className="flex justify-between items-center">
            <div>
              <p className={`text-sm ${isDarkMode ? 'text-slate-300' : 'text-slate-500'}`}>Total Sales</p>
              <h3 className="text-2xl font-bold">₹{totalStats.totalSales.toLocaleString()}</h3>
            </div>
            <div className="p-3 rounded-full bg-blue-100 text-blue-600">
              <IndianRupee size={24} />
            </div>
          </div>
        </div>

        <div className={`p-6 rounded-lg shadow-md ${isDarkMode ? 'bg-slate-700' : 'bg-white'}`}>
          <div className="flex justify-between items-center">
            <div>
              <p className={`text-sm ${isDarkMode ? 'text-slate-300' : 'text-slate-500'}`}>Average Margin</p>
              <h3 className="text-2xl font-bold">{totalStats.averageMargin.toFixed(2)}%</h3>
            </div>
            <div className="p-3 rounded-full bg-purple-100 text-purple-600">
              <TrendingUp size={24} />
            </div>
          </div>
        </div>

        <div className={`p-6 rounded-lg shadow-md ${isDarkMode ? 'bg-slate-700' : 'bg-white'}`}>
          <div className="flex justify-between items-center">
            <div>
              <p className={`text-sm ${isDarkMode ? 'text-slate-300' : 'text-slate-500'}`}>Products</p>
              <h3 className="text-2xl font-bold">{retailerProducts.length}</h3>
            </div>
            <div className="p-3 rounded-full bg-blue-100 text-blue-600">
              <Package size={24} />
            </div>
          </div>
        </div>
      </div>

      <Tabs defaultValue="pricing" className="w-full">
        <TabsList className={`${isDarkMode ? 'bg-slate-800' : ''}`}>
          <TabsTrigger 
            value="pricing" 
            className={`flex items-center ${isDarkMode ? 'data-[state=active]:bg-slate-700' : ''}`}
          >
            <Tag size={16} className="mr-2" />
            Product Pricing
          </TabsTrigger>
          <TabsTrigger 
            value="profit" 
            className={`flex items-center ${isDarkMode ? 'data-[state=active]:bg-slate-700' : ''}`}
          >
            <PieChart size={16} className="mr-2" />
            Profit Analysis
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pricing" className="mt-6">
          <div className={`p-6 rounded-lg shadow-md ${isDarkMode ? 'bg-slate-700' : 'bg-white'}`}>
            <div className="flex items-center space-x-4 mb-6">
              <div className="flex-1">
                <div className="flex items-center">
                  <Search size={20} className={`mr-2 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`} />
                  <input
                    type="text"
                    placeholder="Search products..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className={`w-full p-2 rounded-md outline-none ${
                      isDarkMode ? 'bg-slate-600 text-white' : 'bg-slate-100 text-slate-900'
                    }`}
                  />
                </div>
              </div>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className={`p-2 rounded-md ${
                  isDarkMode ? 'bg-slate-600 text-white' : 'bg-slate-100 text-slate-900'
                } border border-slate-300`}
              >
                <option value="all">All Categories</option>
                <option value="uncategorized">Uncategorized</option>
                {categories.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className={`border-b ${isDarkMode ? 'border-slate-600' : 'border-slate-200'}`}>
                    <th className="text-left py-3 px-4">Product</th>
                    <th className="text-right py-3 px-4">Stock</th>
                    <th className="text-right py-3 px-4">Wholesaler Price</th>
                    <th className="text-right py-3 px-4">Current Price</th>
                    <th className="text-right py-3 px-4">Margin</th>
                    <th className="text-center py-3 px-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.map((product) => (
                    <tr key={product.id} className={`border-b ${isDarkMode ? 'border-slate-600' : 'border-slate-200'}`}>
                      <td className="py-3 px-4">
                        <div className="flex items-center">
                          <div className="w-10 h-10 bg-slate-200 rounded overflow-hidden mr-3">
                            {product.image_url ? (
                              <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Package size={20} className="text-slate-400" />
                              </div>
                            )}
                          </div>
                          <div>
                            <div className="font-medium">{product.name}</div>
                            <div className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                              {product.category_name || 'Uncategorized'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="text-right py-3 px-4">{product.stock_quantity}</td>
                      <td className="text-right py-3 px-4">₹{product.admin_price?.toFixed(2)}</td>
                      <td className="text-right py-3 px-4">
                        {editingProduct === product.id ? (
                          <input
                            type="number"
                            value={newPrice}
                            onChange={(e) => setNewPrice(e.target.value)}
                            className={`w-24 p-1 rounded-md ${
                              isDarkMode ? 'bg-slate-600 text-white' : 'bg-white text-slate-900'
                            } border border-slate-300`}
                            min="0"
                            step="0.01"
                          />
                        ) : (
                          `₹${product.price.toFixed(2)}`
                        )}
                      </td>
                      <td className="text-right py-3 px-4">
                        {((product.price - (product.admin_price || 0)) / (product.admin_price || 1) * 100).toFixed(2)}%
                      </td>
                      <td className="text-center py-3 px-4">
                        {editingProduct === product.id ? (
                          <div className="flex justify-center space-x-2">
                            <button
                              onClick={() => handlePriceUpdate(product.id)}
                              className="p-1 text-green-600 hover:text-green-800"
                            >
                              <Save size={18} />
                            </button>
                            <button
                              onClick={() => {
                                setEditingProduct(null);
                                setNewPrice('');
                              }}
                              className="p-1 text-red-600 hover:text-red-800"
                            >
                              <X size={18} />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              setEditingProduct(product.id);
                              setNewPrice(product.price.toString());
                            }}
                            className="p-1 text-blue-600 hover:text-blue-800"
                          >
                            <Edit size={18} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="profit" className="mt-6">
          <div className={`p-6 rounded-lg shadow-md ${isDarkMode ? 'bg-slate-700' : 'bg-white'}`}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold">Product Performance</h2>
              <div className="flex items-center space-x-4">
                <DatePicker
                  selected={startDate}
                  onChange={(date) => setStartDate(date || new Date())}
                  className={`p-2 rounded-md ${
                    isDarkMode ? 'bg-slate-600 text-white' : 'bg-white text-slate-900'
                  } border border-slate-300`}
                  dateFormat="dd/MM/yyyy"
                />
                <span>to</span>
                <DatePicker
                  selected={endDate}
                  onChange={(date) => setEndDate(date || new Date())}
                  className={`p-2 rounded-md ${
                    isDarkMode ? 'bg-slate-600 text-white' : 'bg-white text-slate-900'
                  } border border-slate-300`}
                  dateFormat="dd/MM/yyyy"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr>
                    <th className="text-left py-3">Product Name</th>
                    <th className="text-right py-3">Total Quantity</th>
                    <th className="text-right py-3">Product Profit</th>
                  </tr>
                </thead>
                <tbody>
                  {profitData.map((data) => (
                    <tr key={data.productId}>
                      <td className="py-4 px-4">{data.productName}</td>
                      <td className="py-4 px-4 text-right">{data.quantitySold}</td>
                      <td className="py-4 px-4 text-right">₹{data.totalProfit.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className={`font-bold ${isDarkMode ? 'bg-slate-600' : 'bg-slate-100'}`}>
                    <td colSpan={2} className="py-4 px-4 text-right">Total Profit:</td>
                    <td className="py-4 px-4 text-right text-lg text-blue-600">
                      ₹{profitData.reduce((sum, item) => sum + item.totalProfit, 0).toLocaleString()}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default RetailerProducts;