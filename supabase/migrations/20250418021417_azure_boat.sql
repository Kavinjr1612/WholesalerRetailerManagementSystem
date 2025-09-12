/*
  # Complete Database Schema

  1. Tables
    - admin_users
    - retailers
    - admin_products
    - orders
    - order_items
    - retailer_products
    - notifications

  2. Relationships
    - Foreign key relationships between tables
    - Unique constraints
    - Check constraints

  3. Triggers
    - Update inventory trigger for orders
*/

-- Create extension for UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(), -- Unique ID for each user
  email text UNIQUE NOT NULL CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z]{2,}$'),
  password_hash text NOT NULL, -- Password hash (or plain text for testing)
  role text NOT NULL CHECK (role IN ('admin', 'retailer')), -- Role of the user
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Retailers table (stores retailer-specific data)
CREATE TABLE IF NOT EXISTS retailers (
  id SERIAL PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE, -- Link to users table
  retailer_id integer REFERENCES retailers(id) ON DELETE CASCADE, -- Link to retailers table
  name text NOT NULL,
  shop_image text,
  address text NOT NULL,
  contact_person text NOT NULL,
  phone text NOT NULL,
  email text CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z]{2,}$'),
  status text DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id) -- Ensure one user can only have one retailer account
);

-- Admin Products table
CREATE TABLE IF NOT EXISTS admin_products (
  id SERIAL PRIMARY KEY,
  name text NOT NULL,
  description text,
  category_name text,
  price numeric(10,2) NOT NULL CHECK (price >= 0),
  stock_quantity integer NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
  image_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz
);

-- Orders table
CREATE TABLE IF NOT EXISTS orders (
  id SERIAL PRIMARY KEY,
  retailer_id integer REFERENCES retailers(id) ON DELETE CASCADE,
  order_date timestamptz DEFAULT now(),
  total_amount numeric(10,2) NOT NULL CHECK (total_amount >= 0),
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'shipped', 'completed', 'cancelled')),
  payment_status text DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'paid', 'failed')),
  shipping_method text,
  tracking_number text,
  shipping_date timestamptz,
  payment_date timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz
);

-- Order Items table
CREATE TABLE IF NOT EXISTS order_items (
  id SERIAL PRIMARY KEY,
  order_id integer REFERENCES orders(id) ON DELETE CASCADE,
  admin_product_id integer REFERENCES admin_products(id),
  quantity integer NOT NULL CHECK (quantity > 0),
  unit_price numeric(10,2) NOT NULL CHECK (unit_price >= 0),
  created_at timestamptz DEFAULT now()
);

-- Retailer Products table
CREATE TABLE IF NOT EXISTS retailer_products (
  id SERIAL PRIMARY KEY,
  retailer_id integer REFERENCES retailers(id) ON DELETE CASCADE,
  admin_product_id integer REFERENCES admin_products(id),
  name text,
  category_name text,
  description text,
  price numeric(10,2) CHECK (price >= 0),
  stock_quantity integer NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz,
  image_url text,
  UNIQUE(retailer_id, admin_product_id)
);

-- Create the billings table
CREATE TABLE IF NOT EXISTS billings (
  id SERIAL PRIMARY KEY,
  retailer_id INTEGER NOT NULL REFERENCES retailers(id) ON DELETE CASCADE,
  total_amount NUMERIC(10, 2) NOT NULL CHECK (total_amount >= 0),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed')),
  billing_date TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);

-- Create the billing_items table
CREATE TABLE IF NOT EXISTS billing_items (
  id SERIAL PRIMARY KEY,
  billing_id INTEGER NOT NULL REFERENCES billings(id) ON DELETE CASCADE,
  retailer_product_id INTEGER NOT NULL REFERENCES retailer_products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price NUMERIC(10, 2) NOT NULL CHECK (unit_price >= 0),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  message text NOT NULL,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- admin settings table
CREATE TABLE IF NOT EXISTS admin_settings (
  id integer PRIMARY KEY DEFAULT 1,
  shop_name text DEFAULT 'Sweet & Snacks Wholesaler',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Insert default settings
INSERT INTO admin_settings (id, shop_name)
VALUES (1, 'Sweet & Snacks Wholesaler')
ON CONFLICT (id) DO NOTHING;

-- Drop existing trigger and function if they exist
DROP TRIGGER IF EXISTS update_inventory_on_shipment ON orders;
DROP FUNCTION IF EXISTS update_retailer_inventory();

-- Create improved trigger function
CREATE OR REPLACE FUNCTION update_retailer_inventory()
RETURNS TRIGGER AS $$
DECLARE
  item RECORD;  -- Declare item as a record variable
BEGIN
  -- Only proceed if the order status is changing to 'shipped'
  IF NEW.status = 'shipped' AND OLD.status != 'shipped' THEN
    -- For each order item
    FOR item IN (
      SELECT 
        oi.admin_product_id,
        oi.quantity,
        ap.name,
        ap.description,
        ap.price,
        ap.image_url
      FROM order_items oi
      JOIN admin_products ap ON ap.id = oi.admin_product_id
      WHERE oi.order_id = NEW.id
    ) LOOP
      -- Insert or update retailer products
      INSERT INTO retailer_products (
        retailer_id,
        admin_product_id,
        name,
        description,
        price,
        stock_quantity,
        image_url
      )
      VALUES (
        NEW.retailer_id,
        item.admin_product_id,
        item.name,
        item.description,
        item.price,
        item.quantity,  -- Initial stock is the ordered quantity
        item.image_url
      )
      ON CONFLICT (retailer_id, admin_product_id) DO UPDATE
      SET 
        stock_quantity = retailer_products.stock_quantity + item.quantity,
        updated_at = now();
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for inventory update
CREATE TRIGGER update_inventory_on_shipment
  AFTER UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION update_retailer_inventory();

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_retailer_products_retailer_id ON retailer_products(retailer_id);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_orders_retailer_id ON orders(retailer_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_products_category ON admin_products(category_name);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON orders(payment_status);

-- Note: RLS is disabled by default for all tables


CREATE TABLE IF NOT EXISTS user_preferences (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  theme_color text NOT NULL DEFAULT 'green',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

-- Add trigger for updating the updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_preferences_updated_at
  BEFORE UPDATE ON user_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_user_preferences_updated_at();

-- Insert default preferences for existing users
INSERT INTO user_preferences (user_id, theme_color)
SELECT id, 'green' FROM users
ON CONFLICT (user_id) DO NOTHING;