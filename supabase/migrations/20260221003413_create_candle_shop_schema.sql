/*
  # Candle Shop Database Schema

  ## Overview
  Creates a complete database schema for a candle e-commerce platform with inventory management,
  standard orders, and custom candle requests.

  ## New Tables

  ### 1. profiles
  - `id` (uuid, primary key) - Links to auth.users
  - `email` (text) - User email
  - `full_name` (text) - User's full name
  - `is_admin` (boolean) - Admin flag for inventory/order management
  - `created_at` (timestamptz) - Account creation timestamp

  ### 2. candles
  - `id` (uuid, primary key) - Unique candle ID
  - `name` (text) - Candle name
  - `description` (text) - Detailed description
  - `price` (decimal) - Price per unit
  - `stock_quantity` (integer) - Available inventory
  - `scent` (text) - Scent profile
  - `size` (text) - Size (e.g., "8oz", "12oz")
  - `burn_time` (integer) - Burn time in hours
  - `image_url` (text) - Product image URL
  - `is_active` (boolean) - Whether product is available for sale
  - `created_at` (timestamptz) - Product creation date
  - `updated_at` (timestamptz) - Last update timestamp

  ### 3. orders
  - `id` (uuid, primary key) - Unique order ID
  - `user_id` (uuid) - References profiles(id)
  - `status` (text) - Order status: pending, processing, shipped, delivered, cancelled
  - `total_amount` (decimal) - Total order amount
  - `shipping_address` (text) - Delivery address
  - `customer_name` (text) - Customer name
  - `customer_email` (text) - Customer email
  - `customer_phone` (text) - Customer phone
  - `created_at` (timestamptz) - Order creation time
  - `updated_at` (timestamptz) - Last status update

  ### 4. order_items
  - `id` (uuid, primary key) - Unique item ID
  - `order_id` (uuid) - References orders(id)
  - `candle_id` (uuid) - References candles(id)
  - `quantity` (integer) - Number of units
  - `price_at_time` (decimal) - Price when ordered
  - `candle_name` (text) - Candle name snapshot

  ### 5. custom_candle_orders
  - `id` (uuid, primary key) - Unique custom order ID
  - `user_id` (uuid) - References profiles(id), nullable for guest orders
  - `customer_name` (text) - Customer name
  - `customer_email` (text) - Customer email
  - `customer_phone` (text) - Customer phone
  - `scent_preference` (text) - Desired scent
  - `size` (text) - Desired size
  - `color_preference` (text) - Desired color
  - `container_type` (text) - Container preference
  - `special_instructions` (text) - Additional requests
  - `status` (text) - Status: pending, in_progress, completed, cancelled
  - `estimated_price` (decimal) - Quoted price
  - `created_at` (timestamptz) - Request creation time
  - `updated_at` (timestamptz) - Last update

  ## Security
  - RLS enabled on all tables
  - Public can view active candles
  - Authenticated users can create orders and custom requests
  - Users can view their own orders
  - Admins can manage all inventory, orders, and custom requests
*/

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text,
  is_admin boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create candles table
CREATE TABLE IF NOT EXISTS candles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  price decimal(10,2) NOT NULL,
  stock_quantity integer DEFAULT 0,
  scent text,
  size text,
  burn_time integer,
  image_url text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE candles ENABLE ROW LEVEL SECURITY;

-- Create orders table
CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  status text DEFAULT 'pending',
  total_amount decimal(10,2) NOT NULL,
  shipping_address text NOT NULL,
  customer_name text NOT NULL,
  customer_email text NOT NULL,
  customer_phone text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Create order_items table
CREATE TABLE IF NOT EXISTS order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE NOT NULL,
  candle_id uuid REFERENCES candles(id) ON DELETE SET NULL,
  quantity integer NOT NULL,
  price_at_time decimal(10,2) NOT NULL,
  candle_name text NOT NULL
);

ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- Create custom_candle_orders table
CREATE TABLE IF NOT EXISTS custom_candle_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  customer_name text NOT NULL,
  customer_email text NOT NULL,
  customer_phone text,
  scent_preference text,
  size text,
  color_preference text,
  container_type text,
  special_instructions text,
  status text DEFAULT 'pending',
  estimated_price decimal(10,2),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE custom_candle_orders ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- RLS Policies for candles
CREATE POLICY "Anyone can view active candles"
  ON candles FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can view all candles"
  ON candles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Admins can insert candles"
  ON candles FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Admins can update candles"
  ON candles FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Admins can delete candles"
  ON candles FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- RLS Policies for orders
CREATE POLICY "Users can view own orders"
  ON orders FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all orders"
  ON orders FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Authenticated users can create orders"
  ON orders FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can update orders"
  ON orders FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- RLS Policies for order_items
CREATE POLICY "Users can view own order items"
  ON order_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_items.order_id
      AND orders.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all order items"
  ON order_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Authenticated users can create order items"
  ON order_items FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_items.order_id
      AND orders.user_id = auth.uid()
    )
  );

-- RLS Policies for custom_candle_orders
CREATE POLICY "Users can view own custom orders"
  ON custom_candle_orders FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all custom orders"
  ON custom_candle_orders FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Authenticated users can create custom orders"
  ON custom_candle_orders FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Admins can update custom orders"
  ON custom_candle_orders FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_candles_is_active ON candles(is_active);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_custom_orders_user_id ON custom_candle_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_custom_orders_status ON custom_candle_orders(status);