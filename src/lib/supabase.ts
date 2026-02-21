import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          is_admin: boolean;
          created_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          is_admin?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string | null;
          is_admin?: boolean;
          created_at?: string;
        };
      };
      candles: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          price: number;
          stock_quantity: number;
          scent: string | null;
          size: string | null;
          burn_time: number | null;
          image_url: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
      };
      orders: {
        Row: {
          id: string;
          user_id: string | null;
          status: string;
          total_amount: number;
          shipping_address: string;
          customer_name: string;
          customer_email: string;
          customer_phone: string | null;
          created_at: string;
          updated_at: string;
        };
      };
      order_items: {
        Row: {
          id: string;
          order_id: string;
          candle_id: string | null;
          quantity: number;
          price_at_time: number;
          candle_name: string;
        };
      };
      custom_candle_orders: {
        Row: {
          id: string;
          user_id: string | null;
          customer_name: string;
          customer_email: string;
          customer_phone: string | null;
          scent_preference: string | null;
          size: string | null;
          color_preference: string | null;
          container_type: string | null;
          special_instructions: string | null;
          status: string;
          estimated_price: number | null;
          created_at: string;
          updated_at: string;
        };
      };
    };
  };
}
