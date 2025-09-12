import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import RetailerLayout from './retailer/components/RetailerLayout';
import Layout from './components/Layout';
import RetailerOrders from './retailer/pages/RetailerOrders';
import RetailerBilling from './retailer/pages/RetailerBilling';
import RetailerDashboard from './retailer/pages/RetailerDashboard';
import RetailerProducts from './retailer/pages/RetailerProducts';
import Dashboard from './pages/Dashboard';
import Orders from './pages/Orders';
import Products from './pages/Products';
import Retailers from './pages/Retailers';
import ProfitSharing from './pages/ProfitSharing';
import Settings from './pages/Settings';
import AdminLogin from './pages/AdminLogin';
import RetailerLogin from './pages/RetailerLogin';
import PublicRetailerPage from './pages/PublicRetailerPage';

function App() {
  return (
    <ThemeProvider>
      <Router>
        <Routes>
          {/* Login routes */}
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<RetailerLogin />} />
          <Route path="/admin/login" element={<AdminLogin />} />

          {/* Public Retailer Page */}
          <Route path="/retailers/:id" element={<PublicRetailerPage />} />

          {/* Retailer routes */}
          <Route path="/retailer" element={<RetailerLayout />}>
            <Route index element={<RetailerDashboard />} />
            <Route path="dashboard" element={<RetailerDashboard />} />
            <Route path="products" element={<RetailerProducts />} />
            <Route path="billing" element={<RetailerBilling />} />
            <Route path="orders" element={<RetailerOrders />} />
          </Route>

          {/* Admin routes */}
          <Route path="/admin" element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="orders" element={<Orders />} />
            <Route path="products" element={<Products />} />
            <Route path="retailers" element={<Retailers />} />
            <Route path="profit-sharing" element={<ProfitSharing />} />
            <Route path="settings" element={<Settings />} />
          </Route>

          {/* Catch all route */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Router>
    </ThemeProvider>
  );
}

export default App;