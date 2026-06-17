-- ==========================================
-- OPTIONAL: Clear existing data before seeding
-- UNCOMMENT the line below if you want to wipe all data before inserting this demo data
-- TRUNCATE users CASCADE;
-- ==========================================

-- 1. Insert Users (Admin and 2 Retailers)
-- We use fixed UUIDs so we can reference them in other tables
INSERT INTO users (id, email, password_hash, role) VALUES 
('11111111-1111-1111-1111-111111111111', 'admin123@gmail.com', '12345678', 'admin'),
('22222222-2222-2222-2222-222222222222', 'retailer@gmail.com', '12345678', 'retailer'),
('33333333-3333-3333-3333-333333333333', 'retailer2@gmail.com', '12345678', 'retailer')
ON CONFLICT (email) DO NOTHING;

-- 2. Insert Retailers
-- Linking them to the user UUIDs created above
INSERT INTO retailers (id, user_id, name, address, contact_person, phone, email, status) VALUES
(1, '22222222-2222-2222-2222-222222222222', 'Downtown Market', '123 Main St, Cityville', 'John Doe', '555-0101', 'retailer@gmail.com', 'active'),
(2, '33333333-3333-3333-3333-333333333333', 'Uptown Groceries', '456 High St, Townsville', 'Jane Smith', '555-0202', 'retailer2@gmail.com', 'active')
ON CONFLICT (id) DO NOTHING;

-- Adjust sequence so future inserts work correctly
SELECT setval('retailers_id_seq', (SELECT MAX(id) FROM retailers));

-- 3. Insert Admin Products (The Wholesaler's Catalog)
INSERT INTO admin_products (id, name, description, category_name, price, stock_quantity, image_url) VALUES
(1, 'Premium Chocolate Bar', 'Rich dark chocolate with 70% cocoa.', 'Sweets', 2.50, 500, 'https://images.unsplash.com/photo-1548907040-4baa42d10919?w=500&q=80'),
(2, 'Gummy Bears Bulk', '5kg bag of assorted fruit gummy bears.', 'Sweets', 15.00, 100, 'https://images.unsplash.com/photo-1582058091505-f87a2e55a40f?w=500&q=80'),
(3, 'Spicy Potato Chips', 'Family size bag of spicy potato chips.', 'Snacks', 3.00, 300, 'https://images.unsplash.com/photo-1566478989037-e1d20435b2fa?w=500&q=80'),
(4, 'Roasted Almonds', 'Salted and roasted premium almonds (1kg).', 'Snacks', 12.50, 150, 'https://images.unsplash.com/photo-1508061253366-f7da158b6d46?w=500&q=80'),
(5, 'Caramel Popcorn', 'Gourmet caramel coated popcorn.', 'Snacks', 4.50, 200, 'https://images.unsplash.com/photo-1578849278619-e73505e9610f?w=500&q=80'),
(6, 'Assorted Lollipops', 'Box of 100 colorful fruit lollipops.', 'Sweets', 8.00, 250, 'https://images.unsplash.com/photo-1575224300306-1b8da36134ec?w=500&q=80')
ON CONFLICT (id) DO NOTHING;

SELECT setval('admin_products_id_seq', (SELECT MAX(id) FROM admin_products));

-- 4. Insert Orders
INSERT INTO orders (id, retailer_id, total_amount, status, payment_status, shipping_method) VALUES
(1, 1, 65.00, 'shipped', 'paid', 'Standard Delivery'),
(2, 1, 45.00, 'pending', 'unpaid', 'Express Delivery'),
(3, 2, 120.00, 'processing', 'paid', 'Standard Delivery')
ON CONFLICT (id) DO NOTHING;

SELECT setval('orders_id_seq', (SELECT MAX(id) FROM orders));

-- 5. Insert Order Items
INSERT INTO order_items (id, order_id, admin_product_id, quantity, unit_price) VALUES
(1, 1, 1, 10, 2.50), -- 10 Chocolates for Order 1
(2, 1, 3, 10, 3.00), -- 10 Chips for Order 1
(3, 1, 4, 1, 10.00), -- 1 Almonds for Order 1
(4, 2, 2, 3, 15.00), -- 3 Gummy Bears for Order 2
(5, 3, 6, 15, 8.00)  -- 15 Lollipops for Order 3
ON CONFLICT (id) DO NOTHING;

SELECT setval('order_items_id_seq', (SELECT MAX(id) FROM order_items));

-- 6. Insert Retailer Products (Inventory for Retailer 1)
-- (Simulating that Order 1 was already received and added to their inventory)
INSERT INTO retailer_products (id, retailer_id, admin_product_id, name, description, category_name, price, stock_quantity, image_url) VALUES
(1, 1, 1, 'Premium Chocolate Bar', 'Rich dark chocolate with 70% cocoa.', 'Sweets', 3.50, 10, 'https://images.unsplash.com/photo-1548907040-4baa42d10919?w=500&q=80'),
(2, 1, 3, 'Spicy Potato Chips', 'Family size bag of spicy potato chips.', 'Snacks', 4.50, 10, 'https://images.unsplash.com/photo-1566478989037-e1d20435b2fa?w=500&q=80')
ON CONFLICT (id) DO NOTHING;

SELECT setval('retailer_products_id_seq', (SELECT MAX(id) FROM retailer_products));

-- 7. Add User Preferences for the new users
INSERT INTO user_preferences (user_id, theme_color) VALUES 
('11111111-1111-1111-1111-111111111111', 'green'),
('22222222-2222-2222-2222-222222222222', 'green'),
('33333333-3333-3333-3333-333333333333', 'green')
ON CONFLICT (user_id) DO NOTHING;

