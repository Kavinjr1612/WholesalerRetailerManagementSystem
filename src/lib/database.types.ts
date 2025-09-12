// Base user type for auth.users table
export interface User {
  id: string; // UUID
  email: string;
  password_hash: string;
  role: 'admin' | 'retailer';
  created_at: string; // ISO timestamp
  updated_at: string; // ISO timestamp
}

// Admin user type for admin_users table
export interface AdminUser {
  id: string; // UUID
  user_id: string; // References auth.users.id
  created_at: string; // ISO timestamp
  updated_at: string; // ISO timestamp
}

// Retailer business details type for retailers table
export interface Retailer {
  id: number; // Serial
  name: string;
  shop_image?: string; // Optional
  address: string;
  contact_person: string;
  phone: string;
  email?: string; // Optional
  status: 'active' | 'inactive';
  created_at: string; // ISO timestamp
  updated_at: string; // ISO timestamp
}

// Retailer account type for retailer_accounts table
export interface RetailerAccount {
  id: string; // UUID
  user_id: string; // References auth.users.id
  retailer_id: number; // References retailers.id
  created_at: string; // ISO timestamp
  updated_at: string; // ISO timestamp
}

// Product category type for product_categories table
export interface ProductCategory {
  id: number; // Serial
  name: string;
  description?: string; // Optional
  created_at: string; // ISO timestamp
  updated_at: string; // ISO timestamp
}

// Admin product type for admin_products table
export interface AdminProduct {
  id: number; // Serial
  name: string;
  description?: string; // Optional
  category_id?: number; // References product_categories.id (optional)
  price: number; // Decimal
  stock_quantity: number; // Integer
  image_url?: string; // Optional
  created_at: string; // ISO timestamp
  updated_at: string; // ISO timestamp
}

// Retailer product type for retailer_products table
export interface RetailerProduct {
  id: number; // Serial
  retailer_id: number; // References retailers.id
  admin_product_id?: number; // References admin_products.id (optional)
  name: string;
  description?: string; // Optional
  price: number; // Decimal
  stock_quantity: number; // Integer
  created_at: string; // ISO timestamp
  updated_at: string; // ISO timestamp
}

// Order type for orders table
export interface Order {
  id: number; // Serial
  retailer_id: number; // References retailers.id
  order_date: string; // ISO timestamp
  total_amount: number; // Decimal
  status: 'pending' | 'processing' | 'completed' | 'cancelled';
  payment_status: 'unpaid' | 'paid' | 'failed';
  created_at: string; // ISO timestamp
  updated_at: string; // ISO timestamp
}

// Order item type for order_items table
export interface OrderItem {
  id: number; // Serial
  order_id: number; // References orders.id
  admin_product_id?: number; // References admin_products.id (optional)
  quantity: number; // Integer
  unit_price: number; // Decimal
  created_at: string; // ISO timestamp
}

// Transaction type for transactions table
export interface Transaction {
  id: string; // UUID
  user_id?: string; // References auth.users.id (optional)
  items: any[]; // JSONB array
  total: number; // Decimal
  payment_method: 'cash' | 'card';
  status: 'completed' | 'pending' | 'failed';
  created_at: string; // ISO timestamp
}