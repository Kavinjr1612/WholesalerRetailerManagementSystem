import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, Search, Edit, Trash2, TruckIcon, PackageCheck, Filter, Calendar, ArrowUpRight, ArrowDownRight, Clock, CheckCircle2, AlertTriangle, Download, FileText, CreditCard, DollarSign, ShoppingBag, Truck, History } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

interface Retailer {
  id: number;
  name: string;
  shop_image?: string;
  address: string;
  contact_person: string;
  phone: string;
  email?: string;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at?: string;
}

interface Product {
  id: number;
  name: string;
  description?: string;
  price: number;
  stock_quantity: number;
  image_url?: string;
  created_at: string;
  updated_at?: string;
}

interface Order {
  id: number;
  retailer_id: number;
  retailer?: Retailer;
  order_date: string;
  total_amount: number;
  status: 'pending' | 'processing' | 'completed' | 'cancelled';
  payment_status: 'unpaid' | 'paid' | 'failed';
  shipping_date?: string;
  payment_date?: string;
  created_at: string;
  updated_at?: string;
}

interface OrderItem {
  id: number;
  order_id: number;
  admin_product_id: number;
  product?: Product;
  quantity: number;
  unit_price: number;
  created_at: string;
}

const Orders: React.FC = () => {
  const { isDarkMode } = useTheme();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [currentOrder, setCurrentOrder] = useState<Order | null>(null);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [retailers, setRetailers] = useState<Retailer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('requests');
  const [orderStats, setOrderStats] = useState({
    total: 0,
    pending: 0,
    processing: 0,
    shipped: 0,
    completed: 0,
    totalValue: 0
  });

  const [formData, setFormData] = useState({
    retailer_id: '',
    status: 'pending' as Order['status'],
    payment_status: 'unpaid' as Order['payment_status']
  });

  const [formItems, setFormItems] = useState<{
    admin_product_id: string;
    quantity: string;
    unit_price: string;
  }[]>([]);

  const fetchOrders = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select(`*, retailers (*), order_items (*, admin_products:admin_product_id (*))`)
        .order('created_at', { ascending: false });

      if (ordersError) throw ordersError;

      const formattedOrders = ordersData?.map(order => ({
        ...order,
        retailer: order.retailers,
        order_items: order.order_items.map(item => ({
          ...item,
          product: item.admin_products
        }))
      })) || [];

      setOrders(formattedOrders);

      const stats = {
        total: formattedOrders.length,
        pending: formattedOrders.filter(o => o.status === 'pending').length,
        processing: formattedOrders.filter(o => o.status === 'processing').length,
        shipped: formattedOrders.filter(o => o.status === 'shipped').length,
        completed: formattedOrders.filter(o => o.status === 'completed').length,
        totalValue: formattedOrders.reduce((sum, order) => sum + order.total_amount, 0)
      };

      setOrderStats(stats);
    } catch (error) {
      console.error('Error fetching orders:', error);
      setError('Failed to load orders. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fetchRetailers = async () => {
    try {
      const { data, error } = await supabase
        .from('retailers')
        .select('*')
        .order('name');

      if (error) throw error;
      setRetailers(data || []);
    } catch (error) {
      console.error('Error fetching retailers:', error);
    }
  };

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('admin_products')
        .select('*')
        .order('name');

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const fetchOrderItems = async (orderId: number) => {
    try {
      const { data, error } = await supabase
        .from('order_items')
        .select(`*, products:admin_product_id (*)`)
        .eq('order_id', orderId);

      if (error) throw error;

      const formattedItems = data?.map(item => ({
        ...item,
        product: item.products
      })) || [];

      setOrderItems(formattedItems);
      return formattedItems;
    } catch (error) {
      console.error('Error fetching order items:', error);
      return [];
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleItemChange = (index: number, field: string, value: string) => {
    const updatedItems = [...formItems];
    updatedItems[index] = {
      ...updatedItems[index],
      [field]: value
    };

    if (field === 'admin_product_id') {
      const product = products.find(p => p.id === parseInt(value));
      if (product) {
        updatedItems[index].unit_price = product.price.toString();
      }
    }

    setFormItems(updatedItems);
  };

  const addOrderItem = () => {
    setFormItems([
      ...formItems,
      { admin_product_id: '', quantity: '1', unit_price: '' }
    ]);
  };

  const removeOrderItem = (index: number) => {
    const updatedItems = [...formItems];
    updatedItems.splice(index, 1);
    setFormItems(updatedItems);
  };

  const calculateTotal = () => {
    return formItems.reduce((total, item) => {
      const quantity = parseInt(item.quantity) || 0;
      const price = parseFloat(item.unit_price) || 0;
      return total + (quantity * price);
    }, 0);
  };

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      if (!formData.retailer_id) {
        setError('Please select a retailer');
        return;
      }

      if (formItems.length === 0) {
        setError('Please add at least one product to the order');
        return;
      }

      for (const item of formItems) {
        if (!item.admin_product_id || !item.quantity || !item.unit_price) {
          setError('Please complete all product information');
          return;
        }
      }

      const totalAmount = calculateTotal();

      if (isEditing && currentOrder) {
        const { error: updateError } = await supabase
          .from('orders')
          .update({
            retailer_id: parseInt(formData.retailer_id),
            status: formData.status,
            payment_status: formData.payment_status,
            total_amount: totalAmount,
            updated_at: new Date().toISOString()
          })
          .eq('id', currentOrder.id);

        if (updateError) throw updateError;

        const { error: deleteError } = await supabase
          .from('order_items')
          .delete()
          .eq('order_id', currentOrder.id);

        if (deleteError) throw deleteError;

        const orderItemsToInsert = formItems.map(item => ({
          order_id: currentOrder.id,
          admin_product_id: parseInt(item.admin_product_id),
          quantity: parseInt(item.quantity),
          unit_price: parseFloat(item.unit_price)
        }));

        const { error: insertError } = await supabase
          .from('order_items')
          .insert(orderItemsToInsert);

        if (insertError) throw insertError;
      } else {
        const { data: orderData, error: orderError } = await supabase
          .from('orders')
          .insert([
            {
              retailer_id: parseInt(formData.retailer_id),
              order_date: new Date().toISOString(),
              total_amount: totalAmount,
              status: formData.status,
              payment_status: formData.payment_status
            }
          ])
          .select();

        if (orderError) throw orderError;

        if (orderData && orderData.length > 0) {
          const newOrderId = orderData[0].id;

          const orderItemsToInsert = formItems.map(item => ({
            order_id: newOrderId,
            admin_product_id: parseInt(item.admin_product_id),
            quantity: parseInt(item.quantity),
            unit_price: parseFloat(item.unit_price)
          }));

          const { error: insertError } = await supabase
            .from('order_items')
            .insert(orderItemsToInsert);

          if (insertError) throw insertError;
        }
      }

      fetchOrders();
      resetForm();
    } catch (error) {
      console.error('Error saving order:', error);
      setError('Failed to save order. Please try again.');
    }
  };

  const resetForm = () => {
    setFormData({
      retailer_id: '',
      status: 'pending',
      payment_status: 'unpaid'
    });
    setFormItems([]);
    setIsEditing(false);
    setShowOrderModal(false);
    setCurrentOrder(null);
  };

  const openOrderModal = async (order?: Order) => {
    if (order) {
      setCurrentOrder(order);
      setFormData({
        retailer_id: order.retailer_id.toString(),
        status: order.status,
        payment_status: order.payment_status || 'unpaid'
      });

      const items = await fetchOrderItems(order.id);

      setFormItems(items.map(item => ({
        admin_product_id: item.admin_product_id.toString(),
        quantity: item.quantity.toString(),
        unit_price: item.unit_price.toString()
      })));

      setIsEditing(true);
    } else {
      setCurrentOrder(null);
      setFormData({
        retailer_id: '',
        status: 'pending',
        payment_status: 'unpaid'
      });
      setFormItems([{ admin_product_id: '', quantity: '1', unit_price: '' }]);
      setIsEditing(false);
    }

    setShowOrderModal(true);
  };

  const openDeleteModal = (order: Order) => {
    setCurrentOrder(order);
    setShowDeleteModal(true);
  };

  const handleDeleteOrder = async () => {
    if (!currentOrder) return;

    try {
      setError(null);

      const { error: itemsError } = await supabase
        .from('order_items')
        .delete()
        .eq('order_id', currentOrder.id);

      if (itemsError) throw itemsError;

      const { error: orderError } = await supabase
        .from('orders')
        .delete()
        .eq('id', currentOrder.id);

      if (orderError) throw orderError;

      setShowDeleteModal(false);
      setCurrentOrder(null);
      fetchOrders();
    } catch (error) {
      console.error('Error deleting order:', error);
      setError('Failed to delete order. Please try again.');
    }
  };

  const updateOrderStatus = async (orderId: number, status: Order['status']) => {
    try {
      const { data: currentOrder, error: fetchError } = await supabase
        .from('orders')
        .select('status')
        .eq('id', orderId)
        .single();

      if (fetchError) throw fetchError;

      const { error: orderError } = await supabase
        .from('orders')
        .update({ 
          status,
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId);

      if (orderError) throw orderError;

      if (status === 'shipped' && currentOrder.status !== 'shipped') {
        const { data: orderItems, error: itemsError } = await supabase
          .from('order_items')
          .select('*')
          .eq('order_id', orderId);

        if (itemsError) throw itemsError;

        for (const item of orderItems) {
          const { data: product, error: productError } = await supabase
            .from('admin_products')
            .select('stock_quantity')
            .eq('id', item.admin_product_id)
            .single();

          if (productError) throw productError;

          const newStockQuantity = product.stock_quantity - item.quantity;

          const { error: updateError } = await supabase
            .from('admin_products')
            .update({ stock_quantity: newStockQuantity })
            .eq('id', item.admin_product_id);

          if (updateError) throw updateError;
        }
      }

      fetchOrders();
    } catch (error) {
      console.error('Error updating order status:', error);
      setError('Failed to update order status. Please try again.');
    }
  };

  const updatePaymentStatus = async (orderId: number, paymentStatus: Order['payment_status']) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ 
          payment_status: paymentStatus,
          payment_date: paymentStatus === 'paid' ? new Date().toISOString() : null,
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId);

      if (error) throw error;

      fetchOrders();
    } catch (error) {
      console.error('Error updating payment status:', error);
      setError('Failed to update payment status. Please try again.');
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'pending':
        return `bg-yellow-100 text-yellow-800`;
      case 'processing':
        return `bg-blue-100 text-blue-800`;
      case 'shipped':
        return `bg-purple-100 text-purple-800`;
      case 'completed':
        return `bg-green-100 text-green-800`;
      default:
        return `bg-gray-100 text-gray-800`;
    }
  };

  const getPaymentStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'paid':
        return `bg-green-100 text-green-800`;
      case 'unpaid':
        return `bg-red-100 text-red-800`;
      case 'partial':
        return `bg-amber-100 text-amber-800`;
      default:
        return `bg-gray-100 text-gray-800`;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock size={14} className="mr-1" />;
      case 'processing':
        return <PackageCheck size={14} className="mr-1" />;
      case 'shipped':
        return <TruckIcon size={14} className="mr-1" />;
      case 'completed':
        return <CheckCircle2 size={14} className="mr-1" />;
      default:
        return null;
    }
  };

  const downloadOrderReport = (order: Order) => {
    const itemsContent = orderItems.map(item => `
      Product: ${item.product?.name || 'N/A'}
      Quantity: ${item.quantity}
      Unit Price: ₹${item.unit_price.toFixed(2)}
      Total: ₹${(item.quantity * item.unit_price).toFixed(2)}
    `).join('\n');

    const reportContent = `
Order Report
-----------
Order ID: ${order.id}
Retailer: ${order.retailer?.name || 'N/A'}
Date: ${new Date(order.order_date).toLocaleDateString()}
Status: ${order.status}
Payment Status: ${order.payment_status || 'N/A'}
Total Amount: ₹${order.total_amount.toFixed(2)}

Order Items:
${itemsContent}
    `;

    const blob = new Blob([reportContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `order-${order.id}-report.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const filteredOrders = orders.filter(order => {
    const matchesSearch = 
      order.retailer?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.id.toString().includes(searchTerm);

    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;

    let matchesDate = true;
    const orderDate = new Date(order.order_date);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const lastWeek = new Date(today);
    lastWeek.setDate(lastWeek.getDate() - 7);
    const lastMonth = new Date(today);
    lastMonth.setMonth(lastMonth.getMonth() - 1);

    if (dateFilter === 'today') {
      matchesDate = orderDate.toDateString() === today.toDateString();
    } else if (dateFilter === 'yesterday') {
      matchesDate = orderDate.toDateString() === yesterday.toDateString();
    } else if (dateFilter === 'week') {
      matchesDate = orderDate >= lastWeek;
    } else if (dateFilter === 'month') {
      matchesDate = orderDate >= lastMonth;
    }

    return matchesSearch && matchesStatus && matchesDate;
  });

  const pendingOrders = filteredOrders.filter(order => order.status === 'pending');
  const processingOrders = filteredOrders.filter(order => order.status === 'processing');
  const shippedOrders = filteredOrders.filter(order => order.status === 'shipped');
  const completedOrders = filteredOrders.filter(order => order.status === 'completed');

  useEffect(() => {
    fetchOrders();
    fetchRetailers();
    fetchProducts();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Orders Management</h1>
        <button 
          onClick={() => openOrderModal()}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center"
        >
          <Plus size={18} className="mr-1" />
          New Order
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className={`p-4 rounded-lg shadow-md ${isDarkMode ? 'bg-gray-700' : 'bg-white'}`}>
          <div className="flex justify-between items-start">
            <div>
              <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>Total Orders</p>
              <h3 className="text-2xl font-bold">{orderStats.total}</h3>
            </div>
            <div className="p-2 rounded-full bg-blue-100 text-blue-600">
              <PackageCheck size={20} />
            </div>
          </div>
        </div>

        <div className={`p-4 rounded-lg shadow-md ${isDarkMode ? 'bg-gray-700' : 'bg-white'}`}>
          <div className="flex justify-between items-start">
            <div>
              <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>Pending</p>
              <h3 className="text-2xl font-bold">{orderStats.pending}</h3>
            </div>
            <div className="p-2 rounded-full bg-yellow-100 text-yellow-600">
              <Clock size={20} />
            </div>
          </div>
        </div>

        <div className={`p-4 rounded-lg shadow-md ${isDarkMode ? 'bg-gray-700' : 'bg-white'}`}>
          <div className="flex justify-between items-start">
            <div>
              <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>Processing</p>
              <h3 className="text-2xl font-bold">{orderStats.processing}</h3>
            </div>
            <div className="p-2 rounded-full bg-blue-100 text-blue-600">
              <PackageCheck size={20} />
            </div>
          </div>
        </div>

        <div className={`p-4 rounded-lg shadow-md ${isDarkMode ? 'bg-gray-700' : 'bg-white'}`}>
          <div className="flex justify-between items-start">
            <div>
              <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>Shipped</p>
              <h3 className="text-2xl font-bold">{orderStats.shipped}</h3>
            </div>
            <div className="p-2 rounded-full bg-purple-100 text-purple-600">
              <TruckIcon size={20} />
            </div>
          </div>
        </div>

        <div className={`p-4 rounded-lg shadow-md ${isDarkMode ? 'bg-gray-700' : 'bg-white'}`}>
          <div className="flex justify-between items-start">
            <div>
              <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>Total Value</p>
              <h3 className="text-2xl font-bold">₹{orderStats.totalValue.toLocaleString()}</h3>
              <div className="flex items-center mt-1 text-green-500 text-xs">
                <ArrowUpRight size={12} />
                <span className="ml-1">8% from last month</span>
              </div>
            </div>
            <div className="p-2 rounded-full bg-green-100 text-green-600">
              <CheckCircle2 size={20} />
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-red-900 text-red-200' : 'bg-red-100 text-red-700'}`}>
          {error}
        </div>
      )}

      <div className={`p-4 rounded-lg shadow-md ${isDarkMode ? 'bg-gray-700' : 'bg-white'}`}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center">
            <Search size={20} className={`mr-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} />
            <input
              type="text"
              placeholder="Search orders..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`w-full p-2 rounded-md outline-none ${
                isDarkMode ? 'bg-gray-600 text-white' : 'bg-gray-100 text-gray-900'
              }`}
            />
          </div>

          <div>
            <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              <Filter size={16} className="inline mr-1" /> Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className={`w-full p-2 rounded-md ${
                isDarkMode ? 'bg-gray-600 text-white border-gray-700' : 'bg-gray-100 text-gray-900 border-gray-200'
              }`}
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="processing">Processing</option>
              <option value="shipped">Shipped</option>
              <option value="completed">Completed</option>
            </select>
          </div>

          <div>
            <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              <Calendar size={16} className="inline mr-1" /> Date Range
            </label>
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className={`w-full p-2 rounded-md ${
                isDarkMode ? 'bg-gray-600 text-white border-gray-700' : 'bg-gray-100 text-gray-900 border-gray-200'
              }`}
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="yesterday">Yesterday</option>
              <option value="week">Last 7 Days</option>
              <option value="month">Last 30 Days</option>
            </select>
          </div>
        </div>
      </div>

      <div className={`border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
        <nav className="flex -mb-px">
          <button
            onClick={() => setActiveTab('requests')}
            className={`py-4 px-6 font-medium text-sm border-b-2 ${
              activeTab === 'requests'
                ? `${isDarkMode ? 'border-blue-500 text-blue-400' : 'border-blue-500 text-blue-600'}`
                : `${isDarkMode ? 'border-transparent text-gray-400 hover:text-gray-300' : 'border-transparent text-gray-500 hover:text-gray-700'}`
            }`}
          >
            <ShoppingBag size={16} className="inline mr-2" />
            Order Requests
          </button>
          <button
            onClick={() => setActiveTab('shipments')}
            className={`py-4 px-6 font-medium text-sm border-b-2 ${
              activeTab === 'shipments'
                ? `${isDarkMode ? 'border-blue-500 text-blue-400' : 'border-blue-500 text-blue-600'}`
                : `${isDarkMode ? 'border-transparent text-gray-400 hover:text-gray-300' : 'border-transparent text-gray-500 hover:text-gray-700'}`
            }`}
          >
            <Truck size={16} className="inline mr-2" />
            Shipments
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`py-4 px-6 font-medium text-sm border-b-2 ${
              activeTab === 'history'
                ? `${isDarkMode ? 'border-blue-500 text-blue-400' : 'border-blue-500 text-blue-600'}`
                : `${isDarkMode ? 'border-transparent text-gray-400 hover:text-gray-300' : 'border-transparent text-gray-500 hover:text-gray-700'}`
            }`}
          >
            <History size={16} className="inline mr-2" />
            Order History
          </button>
          <button
            onClick={() => setActiveTab('summary')}
            className={`py-4 px-6 font-medium text-sm border-b-2 ${
              activeTab === 'summary'
                ? `${isDarkMode ? 'border-blue-500 text-blue-400' : 'border-blue-500 text-blue-600'}`
                : `${isDarkMode ? 'border-transparent text-gray-400 hover:text-gray-300' : 'border-transparent text-gray-500 hover:text-gray-700'}`
            }`}
          >
            <FileText size={16} className="inline mr-2" />
            Order Summary
          </button>
        </nav>
      </div>

      <div>
        {activeTab === 'requests' && (
          <div className={`rounded-lg shadow-md overflow-hidden ${isDarkMode ? 'bg-gray-700' : 'bg-white'}`}>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className={`${isDarkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Order ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Retailer</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Amount</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-4 text-center">
                        <div className="flex justify-center">
                          <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-blue-500"></div>
                        </div>
                      </td>
                    </tr>
                  ) : pendingOrders.length > 0 ? (
                    pendingOrders.map((order) => (
                      <tr key={order.id} className={`${isDarkMode ? 'hover:bg-gray-600' : 'hover:bg-gray-50'}`}>
                        <td className="px-6 py-4 whitespace-nowrap">#{order.id}</td>
                        <td className="px-6 py-4 whitespace-nowrap">{order.retailer?.name}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {new Date(order.order_date).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">₹{order.total_amount.toLocaleString()}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 rounded-full text-xs flex items-center inline-flex ${getStatusBadgeClass(order.status)}`}>
                            {getStatusIcon(order.status)}
                            {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button 
                            onClick={() => updateOrderStatus(order.id, 'processing')}
                            className="text-blue-600 hover:text-blue-900 dark:hover:text-blue-400 mr-3"
                            title="Process Order"
                          >
                            <PackageCheck size={18} />
                          </button>
                          <button 
                            onClick={() => openOrderModal(order)}
                            className="text-blue-600 hover:text-blue-900 dark:hover:text-blue-400 mr-3"
                            title="Edit Order"
                          >
                            <Edit size={18} />
                          </button>
                          <button 
                            onClick={() => openDeleteModal(order)}
                            className="text-red-600 hover:text-red-900 dark:hover:text-red-400"
                            title="Delete Order"
                          >
                            <Trash2 size={18} />
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="px-6 py-4 text-center">
                        <div className="flex flex-col items-center py-6">
                          <AlertTriangle size={48} className="text-gray-400 mb-4" />
                          <p className={`${isDarkMode ? 'text-gray-300' : 'text-gray-600'} mb-2`}>No pending orders found</p>
                          <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                            All order requests have been processed or no new orders have been placed.
                          </p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'shipments' && (
          <div className={`rounded-lg shadow-md overflow-hidden ${isDarkMode ? 'bg-gray-700' : 'bg-white'}`}>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className={`${isDarkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Order ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Retailer</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Amount</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Payment Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Shipping Status</th>
                    <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-4 text-center">
                        <div className="flex justify-center">
                          <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-blue-500"></div>
                        </div>
                      </td>
                    </tr>
                  ) : processingOrders.length > 0 ? (
                    processingOrders.map((order) => (
                      <tr key={order.id} className={`${isDarkMode ? 'hover:bg-gray-600' : 'hover:bg-gray-50'}`}>
                        <td className="px-6 py-4 whitespace-nowrap">#{order.id}</td>
                        <td className="px-6 py-4 whitespace-nowrap">{order.retailer?.name}</td>
                        <td className="px-6 py-4 whitespace-nowrap">₹{order.total_amount.toLocaleString()}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 rounded-full text-xs flex items-center inline-flex ${getPaymentStatusBadgeClass(order.payment_status || 'unpaid')}`}>       
                            {order.payment_status === 'paid' ? <CheckCircle2 size={14} className="mr-1" /> : <span className="mr-1" style={{ fontSize: '14px' }}>₹</span>}
                            {order.payment_status || 'Unpaid'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 rounded-full text-xs flex items-center inline-flex ${getStatusBadgeClass(order.status)}`}>
                            {getStatusIcon(order.status)}
                            {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          {order.payment_status !== 'paid' ? (
                            <button 
                              onClick={() => updatePaymentStatus(order.id, 'paid')}
                              className="text-green-600 hover:text-green-900 dark:hover:text-green-400 mr-3"
                              title="Mark as Paid"
                            >
                              <CreditCard size={18} />
                            </button>
                          ) : (
                            <button 
                              onClick={() => updateOrderStatus(order.id, 'shipped')}
                              className="text-purple-600 hover:text-purple-900 dark:hover:text-purple-400 mr-3"
                              title="Mark as Shipped"
                            >
                              <TruckIcon size={18} />
                            </button>
                          )}
                          <button 
                            onClick={() => openOrderModal(order)}
                            className="text-blue-600 hover:text-blue-900 dark:hover:text-blue-400 mr-3"
                            title="Edit Order"
                          >
                            <Edit size={18} />
                          </button>
                          <button 
                            onClick={async () => {
                              setCurrentOrder(order);
                              await fetchOrderItems(order.id);
                            }}
                            className="text-blue-600 hover:text-blue-900 dark:hover:text-blue-400"
                            title="View Details"
                          >
                            <FileText size={18} />
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="px-6 py-4 text-center">
                        <div className="flex flex-col items-center py-6">
                          <AlertTriangle size={48} className="text-gray-400 mb-4" />
                          <p className={`${isDarkMode ? 'text-gray-300' : 'text-gray-600'} mb-2`}>No orders ready for shipment</p>
                          <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                            There are no orders currently being processed or awaiting shipment.
                          </p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <div className={`rounded-lg shadow-md overflow-hidden ${isDarkMode ? 'bg-gray-700' : 'bg-white'}`}>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className={`${isDarkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Order ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Retailer</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Amount</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-4 text-center">
                        <div className="flex justify-center">
                          <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-blue-500"></div>
                        </div>
                      </td>
                    </tr>
                  ) : filteredOrders.length > 0 ? (
                    filteredOrders.map((order) => (
                      <tr key={order.id} className={`${isDarkMode ? 'hover:bg-gray-600' : 'hover:bg-gray-50'}`}>
                        <td className="px-6 py-4 whitespace-nowrap">#{order.id}</td>
                        <td className="px-6 py-4 whitespace-nowrap">{order.retailer?.name}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {new Date(order.order_date).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">₹{order.total_amount.toLocaleString()}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 rounded-full text-xs flex items-center inline-flex ${getStatusBadgeClass(order.status)}`}>
                            {getStatusIcon(order.status)}
                            {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button 
                            onClick={async () => {
                              setCurrentOrder(order);
                              await fetchOrderItems(order.id);
                            }}
                            className="text-blue-600 hover:text-blue-900 dark:hover:text-blue-400 mr-3"
                            title="View Details"
                          >
                            <FileText size={18} />
                          </button>
                          <button 
                            onClick={() => downloadOrderReport(order)}
                            className="text-green-600 hover:text-green-900 dark:hover:text-green-400"
                            title="Download Report"
                          >
                            <Download size={18} />
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="px-6 py-4 text-center">
                        <div className="flex flex-col items-center py-6">
                          <AlertTriangle size={48} className="text-gray-400 mb-4" />
                          <p className={`${isDarkMode ? 'text-gray-300' : 'text-gray-600'} mb-2`}>No orders found</p>
                          <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                            Try adjusting your search or filters, or add a new order.
                          </p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'summary' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className={`rounded-lg shadow-md overflow-hidden ${isDarkMode ? 'bg-gray-700' : 'bg-white'}`}>
              <div className={`px-6 py-4 border-b ${isDarkMode ? 'border-gray-600' : 'border-gray-200'}`}>
                <h2 className="text-lg font-semibold">Order Status Summary</h2>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>Pending Orders</span>
                      <span className="text-sm font-medium">{orderStats.pending}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-600">
                      <div className="bg-yellow-500 h-2.5 rounded-full" style={{ width: `${(orderStats.pending / orderStats.total) * 100}%` }}></div>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between mb-1">
                      <span className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>Processing Orders</span>
                      <span className="text-sm font-medium">{orderStats.processing}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-600">
                      <div className="bg-blue-500 h-2.5 rounded-full" style={{ width: `${(orderStats.processing / orderStats.total) * 100}%` }}></div>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between mb-1">
                      <span className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>Shipped Orders</span>
                      <span className="text-sm font-medium">{orderStats.shipped}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-600">
                      <div className="bg-purple-500 h-2.5 rounded-full" style={{ width: `${(orderStats.shipped / orderStats.total) * 100}%` }}></div>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between mb-1">
                      <span className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>Completed Orders</span>
                      <span className="text-sm font-medium">{orderStats.completed}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-600">
                      <div className="bg-blue-500 h-2.5 rounded-full" style={{ width: `${(orderStats.completed / orderStats.total) * 100}%` }}></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className={`rounded-lg shadow-md overflow-hidden ${isDarkMode ? 'bg-gray-700' : 'bg-white'}`}>
              <div className={`px-6 py-4 border-b ${isDarkMode ? 'border-gray-600' : 'border-gray-200'}`}>
                <h2 className="text-lg font-semibold">Most Ordered Products</h2>
              </div>
              <div className="p-6">
                {loading ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {products.slice(0, 5).map((product) => (
                      <div key={product.id} className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-600' : 'bg-gray-50'}`}>
                        <div className="flex justify-between items-center">
                          <div>
                            <h3 className="font-medium">{product.name}</h3>
                            <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                              ₹{product.price.toFixed(2)} per unit
                            </p>
                          </div>
                          <div className="text-right">
                            <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                              Stock: {product.stock_quantity}
                            </p>
                            {product.stock_quantity < 10 && (
                              <p className="text-xs text-red-500">Low stock</p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {showOrderModal && (
        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>

            <div className={`inline-block align-bottom rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-3xl sm:w-full ${
              isDarkMode ? 'bg-gray-800' : 'bg-white'
            }`}>
              <div className="px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                    <h3 className="text-lg leading-6 font-medium">
                      {isEditing ? 'Edit Order' : 'Create New Order'}
                    </h3>
                    <div className="mt-4">
                      <form onSubmit={handleSubmitOrder}>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                          <div>
                            <label className="block text-sm font-medium mb-1">
                              Retailer
                            </label>
                            <select
                              name="retailer_id"
                              value={formData.retailer_id}
                              onChange={handleInputChange}
                              required
                              className={`w-full p-2 border rounded-md ${
                                isDarkMode 
                                  ? 'bg-gray-700 border-gray-600 text-white' 
                                  : 'bg-white border-gray-300'
                              }`}
                            >
                              <option value="">Select Retailer</option>
                              {retailers.map(retailer => (
                                <option key={retailer.id} value={retailer.id}>
                                  {retailer.name}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="block text-sm font-medium mb-1">
                              Status
                            </label>
                            <select
                              name="status"
                              value={formData.status}
                              onChange={handleInputChange}
                              required
                              className={`w-full p-2 border rounded-md ${
                                isDarkMode 
                                  ? 'bg-gray-700 border-gray-600 text-white' 
                                  : 'bg-white border-gray-300'
                              }`}
                            >
                              <option value="pending">Pending</option>
                              <option value="processing">Processing</option>
                              <option value="shipped">Shipped</option>
                              <option value="completed">Completed</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-sm font-medium mb-1">
                              Payment Status
                            </label>
                            <select
                              name="payment_status"
                              value={formData.payment_status}
                              onChange={handleInputChange}
                              required
                              className={`w-full p-2 border rounded-md ${
                                isDarkMode 
                                  ? 'bg-gray-700 border-gray-600 text-white' 
                                  : 'bg-white border-gray-300'
                              }`}
                            >
                              <option value="unpaid">Unpaid</option>
                              <option value="paid">Paid</option>
                              <option value="failed">Failed</option>
                            </select>
                          </div>
                        </div>

                        <div className="mb-4">
                          <div className="flex justify-between items-center mb-2">
                            <h4 className="font-medium">Order Items</h4>
                            <button
                              type="button"
                              onClick={addOrderItem}
                              className="text-blue-600 hover:text-blue-900 text-sm flex items-center"
                            >
                              <Plus size={16} className="mr-1" />
                              Add Item
                            </button>
                          </div>

                          {formItems.length > 0 ? (
                            <div className="overflow-x-auto">
                              <table className="w-full">
                                <thead className={`${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                                  <tr>
                                    <th className="px-4 py-2 text-left text-xs font-medium">Product</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium">Quantity</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium">Unit Price</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium">Total</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium"></th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {formItems.map((item, index) => (
                                    <tr key={index} className={`border-b ${isDarkMode ? 'border-gray-600' : 'border-gray-200'}`}>
                                      <td className="px-4 py-2">
                                        <select
                                          value={item.admin_product_id}
                                          onChange={(e) => handleItemChange(index, 'admin_product_id', e.target.value)}
                                          required
                                          className={`w-full p-2 border rounded-md ${
                                            isDarkMode 
                                              ? 'bg-gray-700 border-gray-600 text-white' 
                                              : 'bg-white border-gray-300'
                                          }`}
                                        >
                                          <option value="">Select Product</option>
                                          {products.map(product => (
                                            <option key={product.id} value={product.id}>
                                              {product.name} (₹{product.price.toFixed(2)})
                                            </option>
                                          ))}
                                        </select>
                                      </td>
                                      <td className="px-4 py-2">
                                        <input
                                          type="number"
                                          min="1"
                                          value={item.quantity}
                                          onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                                          required
                                          className={`w-full p-2 border rounded-md ${
                                            isDarkMode 
                                              ? 'bg-gray-700 border-gray-600 text-white' 
                                              : 'bg-white border-gray-300'
                                          }`}
                                        />
                                      </td>
                                      <td className="px-4 py-2">
                                        <input
                                          type="number"
                                          min="0.01"
                                          step="0.01"
                                          value={item.unit_price}
                                          onChange={(e) => handleItemChange(index, 'unit_price', e.target.value)}
                                          required
                                          className={`w-full p-2 border rounded-md ${
                                            isDarkMode 
                                              ? 'bg-gray-700 border-gray-600 text-white' 
                                              : 'bg-white border-gray-300'
                                          }`}
                                        />
                                      </td>
                                      <td className="px-4 py-2">
                                        ₹{((parseFloat(item.unit_price) || 0) * (parseInt(item.quantity) || 0)).toFixed(2)}
                                      </td>
                                      <td className="px-4 py-2">
                                        <button
                                          type="button"
                                          onClick={() => removeOrderItem(index)}
                                          className="text-red-600 hover:text-red-900"
                                        >
                                          <Trash2 size={16} />
                                        </button>
                                      </td>
                                    </tr>
                                  ))}
                                  <tr className={`font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                                    <td colSpan={3} className="px-4 py-2 text-right">Total:</td>
                                    <td className="px-4 py-2">₹{calculateTotal().toFixed(2)}</td>
                                    <td></td>
                                  </tr>
                                </tbody>
                              </table>
                            </div>
                          ) : (
                            <div className={`p-4 text-center rounded-md ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                              <p className={`${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                                No items added yet. Click "Add Item" to add products to this order.
                              </p>
                            </div>
                          )}
                        </div>

                        <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                          <button
                            type="submit"
                            className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none sm:ml-3 sm:w-auto sm:text-sm"
                          >
                            {isEditing ? 'Update Order' : 'Create Order'}
                          </button>
                          <button
                            type="button"
                            onClick={resetForm}
                            className={`mt-3 w-full inline-flex justify-center rounded-md border shadow-sm px-4 py-2 text-base font-medium focus:outline-none sm:mt-0 sm:w-auto sm:text-sm ${
                              isDarkMode 
                                ? 'border-gray-600 bg-gray-700 text-gray-300 hover:bg-gray-600' 
                                : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                            }`}
                          >
                            Cancel
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showDeleteModal && currentOrder && (
        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>

            <div className={`inline-block align-bottom rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full ${
              isDarkMode ? 'bg-gray-800' : 'bg-white'
            }`}>
              <div className="px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                    <Trash2 className="h-6 w-6 text-red-600" />
                  </div>
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                    <h3 className="text-lg leading-6 font-medium">
                      Delete Order
                    </h3>
                    <div className="mt-2">
                      <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                        Are you sure you want to delete order #{currentOrder.id} for {currentOrder.retailer?.name}? This action cannot be undone.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  onClick={handleDeleteOrder}
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Delete
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowDeleteModal(false);
                    setCurrentOrder(null);
                  }}
                  className={`mt-3 w-full inline-flex justify-center rounded-md border shadow-sm px-4 py-2 text-base font-medium focus:outline-none sm:mt-0 sm:w-auto sm:text-sm ${
                    isDarkMode 
                      ? 'border-gray-600 bg-gray-700 text-gray-300 hover:bg-gray-600' 
                      : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {currentOrder && orderItems.length > 0 && !showOrderModal && !showDeleteModal && (
        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>

            <div className={`inline-block align-bottom rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-3xl sm:w-full ${
              isDarkMode ? 'bg-gray-800' : 'bg-white'
            }`}>
              <div className="px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                    <h3 className="text-lg leading-6 font-medium">
                      Order #{currentOrder.id} Details
                    </h3>
                    <div className="mt-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                          <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                            <strong>Retailer:</strong> {currentOrder.retailer?.name || 'N/A'}
                          </p>
                          <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                            <strong>Order Date:</strong> {new Date(currentOrder.order_date).toLocaleDateString()}
                          </p>
                          <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                            <strong>Status:</strong> {currentOrder.status}
                          </p>
                          <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                            <strong>Payment Status:</strong> {currentOrder.payment_status || 'Not specified'}
                          </p>
                        </div>
                        <div>
                          <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                            <strong>Total Amount:</strong> ₹{currentOrder.total_amount.toLocaleString()}
                          </p>
                          <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                            <strong>Created:</strong> {new Date(currentOrder.created_at).toLocaleDateString()}
                          </p>
                          <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                            <strong>Last Updated:</strong> {currentOrder.updated_at ? new Date(currentOrder.updated_at).toLocaleDateString() : 'N/A'}
                          </p>
                        </div>
                      </div>

                      <div className="mb-4">
                        <h4 className="font-medium mb-2">Order Items</h4>
                        <div className="overflow-x-auto">
                          <table className="w-full">
                            <thead className={`${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                              <tr>
                                <th className="px-4 py-2 text-left text-xs font-medium">Product</th>
                                <th className="px-4 py-2 text-left text-xs font-medium">Quantity</th>
                                <th className="px-4 py-2 text-left text-xs font-medium">Unit Price</th>
                                <th className="px-4 py-2 text-left text-xs font-medium">Total</th>
                              </tr>
                            </thead>
                            <tbody>
                              {orderItems.map((item) => (
                                <tr key={item.id} className={`border-b ${isDarkMode ? 'border-gray-600' : 'border-gray-200'}`}>
                                  <td className="px-4 py-2">{item.product?.name}</td>
                                  <td className="px-4 py-2">{item.quantity}</td>
                                  <td className="px-4 py-2">₹{item.unit_price.toFixed(2)}</td>
                                  <td className="px-4 py-2">₹{(item.quantity * item.unit_price).toFixed(2)}</td>
                                </tr>
                              ))}
                              <tr className={`font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                                <td colSpan={3} className="px-4 py-2 text-right">Total:</td>
                                <td className="px-4 py-2">₹{currentOrder.total_amount.toFixed(2)}</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  onClick={() => downloadOrderReport(currentOrder)}
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none sm:ml-3 sm:w-auto sm:text-sm"
                >
                  <Download size={16} className="mr-2" />
                  Download Report
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCurrentOrder(null);
                    setOrderItems([]);
                  }}
                  className={`mt-3 w-full inline-flex justify-center rounded-md border shadow-sm px-4 py-2 text-base font-medium focus:outline-none sm:mt-0 sm:w-auto sm:text-sm ${
                    isDarkMode 
                      ? 'border-gray-600 bg-gray-700 text-gray-300 hover:bg-gray-600' 
                      : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Orders;