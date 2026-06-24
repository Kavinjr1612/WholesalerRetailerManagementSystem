import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import RetailerDashboard from '../retailer/pages/RetailerDashboard';
import RetailerProducts from '../retailer/pages/RetailerProducts';
import RetailerOrders from '../retailer/pages/RetailerOrders';
import RetailerBilling from '../retailer/pages/RetailerBilling';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs';
import { useTheme } from '../context/ThemeContext';

interface Retailer {
  id: number;
  name: string;
  address: string;
  contact_person: string;
  phone: string;
  email: string;
  status: string;
}

const PublicRetailerPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [retailer, setRetailer] = useState<Retailer | null>(null);
  const [loading, setLoading] = useState(true);
  const { isDarkMode } = useTheme();

  useEffect(() => {
    const fetchRetailer = async () => {
      try {
        const { data, error } = await supabase
          .from('retailers')
          .select('*')
          .eq('id', id)
          .single();

        if (error) throw error;
        setRetailer(data);
      } catch (error) {
        console.error('Error fetching retailer:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchRetailer();
  }, [id]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!retailer) {
    return (
      <div className={`flex justify-center items-center h-screen ${
        isDarkMode ? 'text-slate-200' : 'text-slate-800'
      }`}>
        Retailer not found.
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-slate-900 text-slate-200' : 'bg-slate-50 text-slate-800'}`}>
      <div className="max-w-7xl mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">{retailer.name}</h1>
          <div className={`mt-2 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
            <p>{retailer.address}</p>
            <p>Contact: {retailer.contact_person}</p>
            <p>Phone: {retailer.phone}</p>
          </div>
        </div>

        <Tabs defaultValue="dashboard" className="space-y-6">
          <TabsList>
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="products">Products</TabsTrigger>
            <TabsTrigger value="orders">Orders</TabsTrigger>
            <TabsTrigger value="billing">Billing</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard">
            <div className={`p-6 rounded-lg ${isDarkMode ? 'bg-slate-800' : 'bg-white'} shadow-lg`}>
              <RetailerDashboard />
            </div>
          </TabsContent>

          <TabsContent value="products">
            <div className={`p-6 rounded-lg ${isDarkMode ? 'bg-slate-800' : 'bg-white'} shadow-lg`}>
              <RetailerProducts />
            </div>
          </TabsContent>

          <TabsContent value="orders">
            <div className={`p-6 rounded-lg ${isDarkMode ? 'bg-slate-800' : 'bg-white'} shadow-lg`}>
              <RetailerOrders />
            </div>
          </TabsContent>

          <TabsContent value="billing">
            <div className={`p-6 rounded-lg ${isDarkMode ? 'bg-slate-800' : 'bg-white'} shadow-lg`}>
              <RetailerBilling />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default PublicRetailerPage;