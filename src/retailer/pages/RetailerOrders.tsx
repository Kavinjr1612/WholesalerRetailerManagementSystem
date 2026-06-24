import React, { useState, useEffect } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { supabase } from '../../lib/supabase';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../components/ui/tabs';
import { Notification } from '../../components/ui/notification';
import {
  ShoppingCart,
  Plus,
  Package,
  Search,
  Trash2,
  History,
  Clock,
  Calendar,
  CheckCircle,
  XCircle,
  TruckIcon,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

interface Product {
  id: number;
  name: string;
  description: string | null;
  price: number;
  stock_quantity: number;
  image_url: string | null;
  category_name: string | null;
}

interface CartItem extends Product {
  quantity: number;
}

interface OrderItem {
  id: number;
  order_id: number;
  admin_product_id: number;
  quantity: number;
  unit_price: number;
  product: Product;
}

interface Order {
  id: number;
  retailer_id: number;
  total_amount: number;
  status: 'pending' | 'processing' | 'shipped' | 'completed' | 'cancelled';
  payment_status: 'unpaid' | 'paid' | 'failed';
  order_date: string;
  created_at: string;
  updated_at?: string;
  items?: OrderItem[];
  expanded?: boolean;
}

interface Notification {
  type: 'success' | 'error' | 'info';
  message: string;
}

const RetailerOrders: React.FC = () => {
  const { isDarkMode } = useTheme();
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [orders, setOrders] = useState<Order[]>([]);
  const [activeTab, setActiveTab] = useState('order');
  const [orderStatusFilter, setOrderStatusFilter] = useState<'all' | 'pending' | 'shipped' | 'completed'>('all');
  const [notification, setNotification] = useState<Notification | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [categories, setCategories] = useState<string[]>([]);

  useEffect(() => {
    fetchProducts();
    fetchOrders();
  }, []);

  useEffect(() => {
    const uniqueCategories = Array.from(
      new Set(products.map(product => product.category_name).filter(Boolean))
    );
    setCategories(uniqueCategories as string[]);
  }, [products]);

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
  };

  const fetchProducts = async () => {
    try {
      setLoading(true);
      setError(null);
      const { data, error } = await supabase
        .from('admin_products')
        .select('*')
        .order('name');

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
      setError('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const fetchOrders = async () => {
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

      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select(`
          *,
          items:order_items(
            id,
            quantity,
            unit_price,
            product:admin_products(*)
          )
        `)
        .eq('retailer_id', retailer.id)
        .order('created_at', { ascending: false });

      if (ordersError) throw ordersError;

      setOrders(ordersData?.map(order => ({
        ...order,
        expanded: false,
        items: order.items
      })) || []);
    } catch (error) {
      console.error('Error fetching orders:', error);
      setError(error instanceof Error ? error.message : 'Failed to load orders');
    }
  };

  const addToCart = (product: Product) => {
    setCart(currentCart => {
      const existingItem = currentCart.find(item => item.id === product.id);
      
      if (existingItem) {
        return currentCart.map(item =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      
      return [...currentCart, { ...product, quantity: 1 }];
    });
  };

  const removeFromCart = (productId: number) => {
    setCart(currentCart =>
      currentCart.filter(item => item.id !== productId)
    );
  };

  const updateQuantity = (productId: number, value: string) => {
    const quantity = parseInt(value);
    if (isNaN(quantity) || quantity < 1) return;

    setCart(currentCart =>
      currentCart.map(item =>
        item.id === productId
          ? { ...item, quantity }
          : item
      )
    );
  };

  const calculateTotal = () => {
    return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  const handleCheckout = async () => {
    if (cart.length === 0) {
      showNotification('error', 'Your cart is empty');
      return;
    }

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

      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          retailer_id: retailer.id,
          total_amount: calculateTotal(),
          status: 'pending',
          payment_status: 'unpaid',
          order_date: new Date().toISOString()
        })
        .select()
        .single();

      if (orderError || !order) throw orderError;

      const orderItems = cart.map(item => ({
        order_id: order.id,
        admin_product_id: item.id,
        quantity: item.quantity,
        unit_price: item.price
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) throw itemsError;

      showNotification('success', 'Order placed successfully!');
      setCart([]);
      fetchOrders();
    } catch (error) {
      console.error('Error placing order:', error);
      showNotification('error', 'Failed to place order');
    }
  };

  const toggleOrderExpansion = (orderId: number) => {
    setOrders(prevOrders =>
      prevOrders.map(order =>
        order.id === orderId
          ? { ...order, expanded: !order.expanded }
          : order
      )
    );
  };
  
  const filteredProducts = products.filter((product) => {
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
      <h1 className="text-2xl font-bold">My Orders</h1>

      {notification && (
        <Notification
          type={notification.type}
          message={notification.message}
          isOpen={!!notification}
          onClose={() => setNotification(null)}
        />
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className={`${isDarkMode ? 'bg-slate-800' : ''}`}>
          <TabsTrigger 
            value="order" 
            className={`flex items-center ${isDarkMode ? 'data-[state=active]:bg-slate-700' : ''}`}
          >
            <ShoppingCart size={16} className="mr-2" />
            New Order
          </TabsTrigger>
          <TabsTrigger 
            value="history" 
            className={`flex items-center ${isDarkMode ? 'data-[state=active]:bg-slate-700' : ''}`}
          >
            <History size={16} className="mr-2" />
            Order History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="order" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
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

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredProducts.map(product => (
                    <div
                      key={product.id}
                      className={`p-4 rounded-lg ${isDarkMode ? 'bg-slate-600' : 'bg-slate-50'}`}
                    >
                      <div className="flex items-start space-x-4">
                        <div className="w-24 h-24 bg-slate-200 rounded-lg overflow-hidden flex-shrink-0">
                          {product.image_url ? (
                            <img
                              src={product.image_url}
                              alt={product.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Package size={32} className="text-slate-400" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex justify-between">
                            <h3 className="font-medium">{product.name}</h3>
                            <span className="font-bold text-blue-600">₹{product.price.toFixed(2)}</span>
                          </div>
                          <p className={`text-sm mt-1 ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                            {product.description || 'No description available'}
                          </p>
                          <button
                            onClick={() => addToCart(product)}
                            className="mt-2 w-full py-1 px-3 rounded bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center"
                          >
                            <Plus size={16} className="mr-2" />
                            Add to Cart
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <div className={`p-6 rounded-lg shadow-md ${isDarkMode ? 'bg-slate-700' : 'bg-white'}`}>
                <h2 className="text-lg font-semibold mb-4">Shopping Cart</h2>

                {cart.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8">
                    <ShoppingCart size={48} className={`${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`} />
                    <p className={`mt-4 text-center ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                      Your cart is empty
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="space-y-4 mb-4">
                      {cart.map(item => (
                        <div
                          key={item.id}
                          className={`p-3 rounded ${isDarkMode ? 'bg-slate-600' : 'bg-slate-50'}`}
                        >
                          <div className="flex items-start space-x-3">
                            <div className="w-16 h-16 bg-slate-200 rounded overflow-hidden flex-shrink-0">
                              {item.image_url ? (
                                <img
                                  src={item.image_url}
                                  alt={item.name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <Package size={24} className="text-slate-400" />
                                </div>
                              )}
                            </div>
                            <div className="flex-1">
                              <div className="flex justify-between">
                                <h3 className="font-medium">{item.name}</h3>
                                <button
                                  onClick={() => removeFromCart(item.id)}
                                  className="text-red-500 hover:text-red-700"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                              <p className={`text-sm ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                                ₹{item.price.toFixed(2)} each
                              </p>
                              <div className="mt-2 flex items-center justify-between">
                                <input
                                  type="number"
                                  value={item.quantity}
                                  onChange={(e) => updateQuantity(item.id, e.target.value)}
                                  min="1"
                                  className={`w-20 p-1 text-center rounded ${
                                    isDarkMode ? 'bg-slate-700 text-white' : 'bg-white text-slate-900'
                                  }`}
                                />
                                <span className="font-medium">
                                  ₹{(item.price * item.quantity).toFixed(2)}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className={`p-4 rounded ${isDarkMode ? 'bg-slate-600' : 'bg-slate-100'}`}>
                      <div className="flex justify-between items-center text-lg font-bold mb-4">
                        <span>Total</span>
                        <span>₹{calculateTotal().toFixed(2)}</span>
                      </div>

                      <button
                        onClick={handleCheckout}
                        className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md flex items-center justify-center"
                      >
                        <ShoppingCart size={20} className="mr-2" />
                        Place Order
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="history" className="mt-6">
          <div className={`p-6 rounded-lg shadow-md ${isDarkMode ? 'bg-slate-700' : 'bg-white'}`}>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-semibold">Order History</h2>
              <select
                value={orderStatusFilter}
                onChange={(e) => setOrderStatusFilter(e.target.value as any)}
                className={`p-2 rounded-md ${
                  isDarkMode ? 'bg-slate-600 text-white' : 'bg-slate-100 text-slate-900'
                }`}
              >
                <option value="all">All Orders</option>
                <option value="pending">Pending</option>
                <option value="shipped">Shipped</option>
                <option value="completed">Completed</option>
              </select>
            </div>

            <div className="space-y-4">
              {orders
                .filter(order => orderStatusFilter === 'all' || order.status === orderStatusFilter)
                .map(order => (
                  <div
                    key={order.id}
                    className={`p-4 rounded-lg ${isDarkMode ? 'bg-slate-600' : 'bg-slate-50'}`}
                  >
                    <div 
                      className="flex justify-between items-start cursor-pointer"
                      onClick={() => toggleOrderExpansion(order.id)}
                    >
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
                             <TruckIcon size={12} className="mr-1" />}
                            {order.status}
                          </span>
                        </div>
                        <div className="flex items-center mt-2 text-sm text-slate-500">
                          <Calendar size={14} className="mr-1" />
                          {new Date(order.created_at).toLocaleDateString()}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-lg">₹{order.total_amount.toFixed(2)}</div>
                        <div className={`text-sm ${
                          order.payment_status === 'paid'
                            ? 'text-green-500'
                            : order.payment_status === 'failed'
                            ? 'text-red-500'
                            : 'text-yellow-500'
                        }`}>
                          {order.payment_status}
                        </div>
                        {order.expanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                      </div>
                    </div>

                    {order.expanded && order.items && (
                      <div className="mt-4 border-t pt-4">
                        <h3 className="font-medium mb-2">Order Items</h3>
                        <div className="space-y-3">
                          {order.items.map((item) => (
                            <div key={item.id} className="flex items-center space-x-3">
                              <div className="w-16 h-16 bg-slate-200 rounded overflow-hidden">
                                {item.product.image_url ? (
                                  <img
                                    src={item.product.image_url}
                                    alt={item.product.name}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center">
                                    <Package size={24} className="text-slate-400" />
                                  </div>
                                )}
                              </div>
                              <div className="flex-1">
                                <h4 className="font-medium">{item.product.name}</h4>
                                <p className={`text-sm ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                                  Quantity: {item.quantity} × ₹{item.unit_price.toFixed(2)}
                                </p>
                              </div>
                              <div className="font-medium">
                                ₹{(item.quantity * item.unit_price).toFixed(2)}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default RetailerOrders;