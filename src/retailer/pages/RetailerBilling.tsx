import React, { useState, useEffect } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { supabase } from '../../lib/supabase';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../components/ui/tabs';
import { Notification } from '../../components/ui/notification';
import jsPDF from 'jspdf';
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
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

interface RetailerProduct {
  id: number;
  name: string;
  description: string | null;
  price: number;
  stock_quantity: number;
  image_url: string | null;
  category_name: string | null;
}

interface CartItem extends RetailerProduct {
  quantity: number;
}

interface BillingItem {
  id: number;
  billing_id: number;
  retailer_product_id: number;
  quantity: number;
  unit_price: number;
  product: RetailerProduct;
}

interface Billing {
  id: number;
  retailer_id: number;
  total_amount: number;
  status: 'pending' | 'completed';
  billing_date: string;
  created_at: string;
  updated_at?: string;
  items?: BillingItem[];
  expanded?: boolean;
}

interface Notification {
  type: 'success' | 'error' | 'info';
  message: string;
}

const RetailerBilling: React.FC = () => {
  const { isDarkMode } = useTheme();
  const [retailerId, setRetailerId] = useState<number | null>(null);
  const [retailerProducts, setRetailerProducts] = useState<RetailerProduct[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [billings, setBillings] = useState<Billing[]>([]);
  const [activeTab, setActiveTab] = useState('billing');
  const [notification, setNotification] = useState<Notification | null>(null);
  const [showBillingModal, setShowBillingModal] = useState(false);
  const [retailerName, setRetailerName] = useState('Retailer Name');
  const [retailerAddress, setRetailerAddress] = useState('Retailer Address');
  const [retailerPhone, setRetailerPhone] = useState('+91 1234567890');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [manualStartDate, setManualStartDate] = useState<string>('');
  const [manualEndDate, setManualEndDate] = useState<string>('');
  const [dateSelectionMode, setDateSelectionMode] = useState<'calendar' | 'manual'>('calendar');

  useEffect(() => {
    initializeRetailer();
  }, []);

  useEffect(() => {
    if (retailerId) {
      fetchRetailerDetails();
      fetchRetailerProducts();
      fetchBillings();
    }
  }, [retailerId]);

  const initializeRetailer = async () => {
    try {
      const userEmail = localStorage.getItem('userEmail');
      if (!userEmail) {
        throw new Error('User email not found');
      }

      const { data: retailer, error: retailerError } = await supabase
        .from('retailers')
        .select('id')
        .eq('email', userEmail)
        .single();

      if (retailerError || !retailer) {
        throw new Error('Retailer not found');
      }

      setRetailerId(retailer.id);
    } catch (error) {
      console.error('Error initializing retailer:', error);
      setError('Failed to initialize retailer data');
    }
  };

  const fetchRetailerDetails = async () => {
    if (!retailerId) return;

    try {
      const { data: retailer, error: retailerError } = await supabase
        .from('retailers')
        .select('name, address, phone')
        .eq('id', retailerId)
        .single();

      if (retailerError) throw retailerError;

      if (retailer) {
        setRetailerName(retailer.name);
        setRetailerAddress(retailer.address);
        setRetailerPhone(retailer.phone);
      }
    } catch (error) {
      console.error('Error fetching retailer details:', error);
      setError('Failed to load retailer details');
    }
  };

  const fetchRetailerProducts = async () => {
    if (!retailerId) return;

    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('retailer_products')
        .select('*')
        .eq('retailer_id', retailerId)
        .order('name');

      if (error) throw error;
      setRetailerProducts(data || []);
    } catch (error) {
      console.error('Error fetching retailer products:', error);
      setError('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const fetchBillings = async () => {
    if (!retailerId) return;

    try {
      const { data: billingsData, error: billingsError } = await supabase
        .from('billings')
        .select(`
          *,
          items:billing_items(
            id,
            quantity,
            unit_price,
            product:retailer_products(*)
          )
        `)
        .eq('retailer_id', retailerId)
        .order('created_at', { ascending: false });

      if (billingsError) throw billingsError;

      // Remove any potential duplicates by using a Map with billing ID as key
      const uniqueBillings = new Map();
      billingsData?.forEach(billing => {
        if (!uniqueBillings.has(billing.id)) {
          uniqueBillings.set(billing.id, {
            ...billing,
            expanded: false,
            items: billing.items || []
          });
        }
      });
      
      setBillings(Array.from(uniqueBillings.values()));
    } catch (error) {
      console.error('Error in fetchBillings:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch billings');
    }
  };

  const addToCart = (product: RetailerProduct) => {
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
    if (isNaN(quantity)) return;

    setCart(currentCart =>
      currentCart.map(item =>
        item.id === productId
          ? { ...item, quantity }
          : item
      )
    );
  };

  const calculateTotal = () => {
    return cart.reduce((total, item) => {
      const itemTotal = item.price * item.quantity;
      return total + itemTotal;
    }, 0);
  };

  const handleCheckout = async () => {
    if (!retailerId) {
      showNotification('error', 'Retailer not initialized');
      return;
    }

    if (cart.length === 0) {
      showNotification('error', 'Your cart is empty');
      return;
    }

    try {
      const { data: billing, error: billingError } = await supabase
        .from('billings')
        .insert({
          retailer_id: retailerId,
          total_amount: calculateTotal(),
          status: 'completed',
          billing_date: new Date().toISOString()
        })
        .select()
        .single();

      if (billingError || !billing) throw billingError;

      const billingItems = cart.map(item => ({
        billing_id: billing.id,
        retailer_product_id: item.id,
        quantity: item.quantity,
        unit_price: item.price
      }));

      const { error: itemsError } = await supabase
        .from('billing_items')
        .insert(billingItems);

      if (itemsError) throw itemsError;

      for (const item of cart) {
        const { error: productError } = await supabase
          .from('retailer_products')
          .update({ stock_quantity: item.stock_quantity - item.quantity })
          .eq('id', item.id);

        if (productError) throw productError;
      }

      showNotification('success', 'Billing completed successfully!');
      setCart([]);
      setShowBillingModal(false);
      fetchBillings();
      fetchRetailerProducts();
    } catch (error) {
      console.error('Error completing billing:', error);
      showNotification('error', 'Failed to complete billing');
    }
  };

  const showNotification = (type: 'success' | 'error' | 'info', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3000);
  };

  const toggleBillingExpansion = (billingId: number) => {
    setBillings(prevBillings =>
      prevBillings.map(billing =>
        billing.id === billingId
          ? { ...billing, expanded: !billing.expanded }
          : billing
      )
    );
  };
  
const parseManualDate = (dateString: string): Date | null => {
  const parts = dateString.split(' ');
  if (parts.length !== 3) return null;
  
  const day = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1; // Months are 0-based
  const year = parseInt(parts[2], 10);

  if (isNaN(day) || isNaN(month) || isNaN(year)) return null;
  
  const date = new Date(year, month, day);
  // Validate the parsed date
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month ||
    date.getDate() !== day
  ) {
    return null;
  }
  
  return date;
};
  
const handleDownloadReceipt = () => {
  // Parse dates based on selection mode
  let start: Date | null = null;
  let end: Date | null = null;

  if (dateSelectionMode === 'calendar') {
    start = startDate;
    end = endDate;
  } else {
    start = parseManualDate(manualStartDate);
    end = parseManualDate(manualEndDate);

    // Validate manual dates
    if (manualStartDate && !start) {
      showNotification('error', 'Invalid start date format. Use DD MM YYYY');
      return;
    }
    if (manualEndDate && !end) {
      showNotification('error', 'Invalid end date format. Use DD MM YYYY');
      return;
    }
  }

  // Check if at least one date is provided
  if (!start && !end) {
    showNotification('error', 'Please select a date range');
    return;
  }

  // Set time boundaries for date filtering
  if (start) start.setHours(0, 0, 0, 0);
  if (end) end.setHours(23, 59, 59, 999);

  // Filter billings within date range
  const filteredBillings = billings.filter(billing => {
    const billingDate = new Date(billing.billing_date);
    return (
      (!start || billingDate >= start) &&
      (!end || billingDate <= end)
    );
  });

  if (filteredBillings.length === 0) {
    showNotification('info', 'No billings found in selected date range');
    return;
  }

  // Generate PDF
  const doc = new jsPDF();
  let yPos = 30; // Starting Y position for content
  const pageWidth = doc.internal.pageSize.getWidth();
  const columnPositions = {
    product: 15,    // Left-aligned for product names
    quantity: 110,  // Right-aligned for quantity
    unitPrice: 145, // Right-aligned for unit price
    total: 180      // Right-aligned for total price
  };

  // Add retailer information at the top
  doc.setFontSize(18).setFont("helvetica", "bold");
  doc.text(retailerName, pageWidth / 2, 10, { align: 'center' });
  doc.setFontSize(12).setFont("helvetica", "normal");
  doc.text(`Address: ${retailerAddress}`, pageWidth / 2, 18, { align: 'center' });
  doc.text(`Contact: ${retailerPhone}`, pageWidth / 2, 24, { align: 'center' });

  // Report period
  doc.setFont("helvetica", "bold").text(
    `Report Period: ${start?.toLocaleDateString() || 'Start'} - ${end?.toLocaleDateString() || 'End'}`,
    pageWidth / 2,
    32,
    { align: 'center' }
  );

  yPos = 40; // Reset Y position for billing items

  // Add billing items in a table format
  filteredBillings.forEach((billing, index) => {
    // Billing header
    doc.setFontSize(14).setFont("helvetica", "bold");
    doc.text(`Billing #${billing.id}`, 15, yPos);
    doc.setFont("helvetica", "normal").setFontSize(12);
    doc.text(`Date: ${new Date(billing.billing_date).toLocaleDateString()}`, 15, yPos + 6);
    yPos += 16;

    // Table headers
    doc.setFont("helvetica", "bold");
    doc.text("Product", columnPositions.product, yPos);
    doc.text("Quantity", columnPositions.quantity, yPos, { align: 'right' });
    doc.text("Unit Price", columnPositions.unitPrice, yPos, { align: 'right' });
    doc.text("Total", columnPositions.total, yPos, { align: 'right' });

    // Draw header underline
    yPos += 4;
    doc.setLineWidth(0.2);
    doc.line(15, yPos, pageWidth - 15, yPos);
    yPos += 8;

    // Billing items
    doc.setFont("helvetica", "normal");
    if (billing.items && billing.items.length > 0) {
      billing.items.forEach(item => {
        doc.text(
          item.product.name,
          columnPositions.product,
          yPos
        );
        doc.text(
          item.quantity.toString(),
          columnPositions.quantity,
          yPos,
          { align: 'right' }
        );
        doc.text(
          `Rs.${item.unit_price.toFixed(2)}`,
          columnPositions.unitPrice,
          yPos,
          { align: 'right' }
        );
        doc.text(
          `Rs.${(item.quantity * item.unit_price).toFixed(2)}`,
          columnPositions.total,
          yPos,
          { align: 'right' }
        );
        yPos += 8; // Move to next row
      });
    }

    // Billing total
    yPos += 4;
    doc.setFont("helvetica", "bold");
    doc.text(
      `Total:   Rs.${billing.total_amount.toFixed(2)}`,
      columnPositions.total,
      yPos,
      { align: 'right' }
    );
    yPos += 12; // Add spacing between billings

    // Add new page if content exceeds page height
    if (yPos > 280) {
      doc.addPage();
      yPos = 30; // Reset Y position for new page
    }
  });

  // Save the PDF
  doc.save(`billing-report-${new Date().toISOString().split('T')[0]}.pdf`);

  // Show success notification
  showNotification('success', 'Receipt downloaded successfully!');
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
        <h1 className="text-2xl font-bold">Billing</h1>
      </div>

      {notification && (
        <Notification
          type={notification.type}
          message={notification.message}
          isOpen={!!notification}
          onClose={() => setNotification(null)}
        />
      )}

      {showBillingModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className={`p-6 rounded-lg shadow-md ${isDarkMode ? 'bg-gray-700' : 'bg-white'} w-full max-w-md`}>
            <h2 className="text-lg font-semibold mb-4">Confirm Billing</h2>
            <div id="receipt" className="space-y-4">
              <div className="text-center">
                <h3 className="text-xl font-bold">{retailerName}</h3>
                <p className="text-sm text-gray-500">{retailerAddress}</p>
                <p className="text-sm text-gray-500">Contact: {retailerPhone}</p>
              </div>

              <div className="mt-4">
                <div className="flex justify-between border-b pb-2">
                  <span className="font-bold">Product</span>
                  <span className="font-bold">Total</span>
                </div>
                {cart.map((item) => (
                  <div key={item.id} className="flex justify-between py-2 border-b">
                    <span>{item.name} (x{item.quantity})</span>
                    <span>₹{(item.price * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
                <div className="flex justify-between font-bold pt-4">
                  <span>Total</span>
                  <span>₹{calculateTotal().toFixed(2)}</span>
                </div>
              </div>

              <div className="text-center text-sm text-gray-500 mt-4">
                <p>Thank you for your purchase!</p>
                <p>Date: {new Date().toLocaleDateString()}</p>
              </div>
            </div>
            <div className="mt-6 flex justify-end space-x-4">
              <button
                onClick={() => setShowBillingModal(false)}
                className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-md"
              >
                Cancel
              </button>
              <button
                onClick={handleCheckout}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md"
              >
                Confirm & Print
              </button>
            </div>
          </div>
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className={`${isDarkMode ? 'bg-gray-800' : ''}`}>
          <TabsTrigger 
            value="billing" 
            className={`flex items-center ${isDarkMode ? 'data-[state=active]:bg-gray-700' : ''}`}
          >
            <ShoppingCart size={16} className="mr-2" />
            New Billing
          </TabsTrigger>
          <TabsTrigger 
            value="history" 
            className={`flex items-center ${isDarkMode ? 'data-[state=active]:bg-gray-700' : ''}`}
          >
            <History size={16} className="mr-2" />
            Billing History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="billing" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <div className={`p-6 rounded-lg shadow-md ${isDarkMode ? 'bg-gray-700' : 'bg-white'}`}>
                <div className="flex items-center mb-6">
                  <Search size={20} className={`mr-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                  <input
                    type="text"
                    placeholder="Search products..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className={`w-full p-2 rounded-md outline-none ${
                      isDarkMode ? 'bg-gray-600 text-white' : 'bg-gray-100 text-gray-900'
                    }`}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {retailerProducts
                    .filter(product =>
                      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      (product.description?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false)
                    )
                    .map(product => (
                      <div
                        key={product.id}
                        className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-600' : 'bg-gray-50'}`}
                      >
                        <div className="flex items-start space-x-4">
                          <div className="w-24 h-24 bg-gray-200 rounded-lg overflow-hidden flex-shrink-0">
                            {product.image_url ? (
                              <img
                                src={product.image_url}
                                alt={product.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Package size={32} className="text-gray-400" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1">
                            <div className="flex justify-between">
                              <h3 className="font-medium">{product.name}</h3>
                              <span className="font-bold text-blue-600">₹{product.price.toFixed(2)}</span>
                            </div>
                            <p className={`text-sm mt-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                              {product.description || 'No description available'}
                            </p>
                            <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                              Stock: {product.stock_quantity}
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
              <div className={`p-6 rounded-lg shadow-md ${isDarkMode ? 'bg-gray-700' : 'bg-white'}`}>
                <h2 className="text-lg font-semibold mb-4">Shopping Cart</h2>

                {cart.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8">
                    <ShoppingCart size={48} className={`${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`} />
                    <p className={`mt-4 text-center ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      Your cart is empty
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="space-y-4 mb-4">
                      {cart.map(item => (
                        <div
                          key={item.id}
                          className={`p-3 rounded ${isDarkMode ? 'bg-gray-600' : 'bg-gray-50'}`}
                        >
                          <div className="flex items-start space-x-3">
                            <div className="w-16 h-16 bg-gray-200 rounded overflow-hidden flex-shrink-0">
                              {item.image_url ? (
                                <img
                                  src={item.image_url}
                                  alt={item.name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <Package size={24} className="text-gray-400" />
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
                              <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                                ₹{item.price.toFixed(2)} each
                              </p>
                              <div className="mt-2 flex items-center justify-between">
                                <input
                                  type="number"
                                  value={item.quantity}
                                  onChange={(e) => updateQuantity(item.id, e.target.value)}
                                  min="1"
                                  className={`w-20 p-1 text-center rounded ${
                                    isDarkMode ? 'bg-gray-700 text-white' : 'bg-white text-gray-900'
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

                    <div className={`p-4 rounded ${isDarkMode ? 'bg-gray-600' : 'bg-gray-100'}`}>
                      <div className="flex justify-between items-center text-lg font-bold mb-4">
                        <span>Total</span>
                        <span>₹{calculateTotal().toFixed(2)}</span>
                      </div>

                      <button
                        onClick={() => setShowBillingModal(true)}
                        className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md flex items-center justify-center"
                      >
                        <ShoppingCart size={20} className="mr-2" />
                        Complete Billing
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="history" className="mt-6">
          <div className={`p-6 rounded-lg shadow-md ${isDarkMode ? 'bg-gray-700' : 'bg-white'}`}>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-semibold">Billing History</h2>
              <button
                onClick={() => setShowDatePicker(true)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md flex items-center"
              >
                <Calendar size={16} className="mr-2" />
                Download Receipt
              </button>
            </div>

            <div className="space-y-4">
              {billings.map(billing => (
                <div
                  key={billing.id}
                  className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-600' : 'bg-gray-50'}`}
                >
                  <div 
                    className="flex justify-between items-start cursor-pointer"
                    onClick={() => toggleBillingExpansion(billing.id)}
                  >
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
                      <div className="flex items-center mt-2 text-sm text-gray-500">
                        <Calendar size={14} className="mr-1" />
                        {new Date(billing.billing_date).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-lg">₹{billing.total_amount.toFixed(2)}</div>
                      {billing.expanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                    </div>
                  </div>

                  {billing.expanded && billing.items && (
                    <div className="mt-4 border-t pt-4">
                      <h3 className="font-medium mb-2">Billing Items</h3>
                      <div className="space-y-3">
                        {billing.items.map((item) => (
                          <div key={item.id} className="flex items-center space-x-3">
                            <div className="w-16 h-16 bg-gray-200 rounded overflow-hidden">
                              {item.product.image_url ? (
                                <img
                                  src={item.product.image_url}
                                  alt={item.product.name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <Package size={24} className="text-gray-400" />
                                </div>
                              )}
                            </div>
                            <div className="flex-1">
                              <h4 className="font-medium">{item.product.name}</h4>
                              <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
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

      {showDatePicker && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className={`p-6 rounded-lg shadow-md ${isDarkMode ? 'bg-gray-700' : 'bg-white'} w-full max-w-md`}>
            <h2 className="text-lg font-semibold mb-4">Select Date Range</h2>
            <div className="flex space-x-4 mb-4">
              <button
                onClick={() => setDateSelectionMode('calendar')}
                className={`px-4 py-2 rounded-md ${
                  dateSelectionMode === 'calendar'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700'
                }`}
              >
                By Calendar
              </button>
              <button
                onClick={() => setDateSelectionMode('manual')}
                className={`px-4 py-2 rounded-md ${
                  dateSelectionMode === 'manual'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700'
                }`}
              >
                By Type
              </button>
            </div>

            {dateSelectionMode === 'calendar' ? (
              <DatePicker
                selectsRange
                startDate={startDate}
                endDate={endDate}
                onChange={([start, end]) => {
                  setStartDate(start);
                  setEndDate(end);
                }}
                isClearable
                inline
              />
            ) : (
              <div className="space-y-4">
                <div className="flex flex-col space-y-2">
                  <label htmlFor="startDate" className="text-sm font-medium">
                    From Date (DD MM YYYY)
                  </label>
                  <input
                    type="text"
                    id="startDate"
                    value={manualStartDate}
                    onChange={(e) => setManualStartDate(e.target.value)}
                    placeholder="DD MM YYYY"
                    className={`p-2 rounded-md outline-none ${
                      isDarkMode ? 'bg-gray-600 text-white' : 'bg-gray-100 text-gray-900'
                    }`}
                  />
                </div>
                <div className="flex flex-col space-y-2">
                  <label htmlFor="endDate" className="text-sm font-medium">
                    To Date (DD MM YYYY)
                  </label>
                  <input
                    type="text"
                    id="endDate"
                    value={manualEndDate}
                    onChange={(e) => setManualEndDate(e.target.value)}
                    placeholder="DD MM YYYY"
                    className={`p-2 rounded-md outline-none ${
                      isDarkMode ? 'bg-gray-600 text-white' : 'bg-gray-100 text-gray-900'
                    }`}
                  />
                </div>
              </div>
            )}

            <div className="mt-6 flex justify-end space-x-4">
              <button
                onClick={() => setShowDatePicker(false)}
                className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-md"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  handleDownloadReceipt();
                  setShowDatePicker(false);
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md"
              >
                Generate Report
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RetailerBilling;