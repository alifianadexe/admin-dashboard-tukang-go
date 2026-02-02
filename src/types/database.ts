// Database types for Tukang Go Admin
export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          phone: string | null;
          role: 'client' | 'mitra' | 'admin';
          avatar_url: string | null;
          is_verified: boolean;
          is_active: boolean;
          wallet_balance: number;
          rating: number | null;
          total_jobs: number;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['profiles']['Row'], 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>;
      };
      services: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          icon: string | null;
          base_price: number;
          commission_percentage: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<
          Database['public']['Tables']['services']['Row'],
          'id' | 'created_at' | 'updated_at'
        >;
        Update: Partial<Database['public']['Tables']['services']['Insert']>;
      };
      orders: {
        Row: {
          id: string;
          order_no: number;
          client_id: string;
          mitra_id: string | null;
          service_id: string;
          working_days: number;
          price_base: number;
          price_additional: number;
          price_total: number;
          commission_amount: number;
          address_origin: string;
          problem_description: string | null;
          photos: string[] | null;
          notes: string | null;
          payment_method: string | null;
          status: OrderStatus;
          rating: number | null;
          review: string | null;
          created_at: string;
          accepted_at: string | null;
          arrived_at: string | null;
          started_at: string | null;
          completed_at: string | null;
        };
        Insert: Omit<
          Database['public']['Tables']['orders']['Row'],
          'id' | 'order_no' | 'created_at'
        >;
        Update: Partial<Database['public']['Tables']['orders']['Insert']>;
      };
      wallet_transactions: {
        Row: {
          id: string;
          user_id: string;
          order_id: string | null;
          type: 'topup' | 'payment' | 'earning' | 'withdrawal' | 'refund';
          amount: number;
          description: string | null;
          created_at: string;
        };
        Insert: Omit<
          Database['public']['Tables']['wallet_transactions']['Row'],
          'id' | 'created_at'
        >;
        Update: Partial<Database['public']['Tables']['wallet_transactions']['Insert']>;
      };
    };
  };
};

export type OrderStatus =
  | 'searching'
  | 'accepted'
  | 'arrived'
  | 'in_progress'
  | 'payment_pending'
  | 'completed'
  | 'cancelled';

export type Profile = Database['public']['Tables']['profiles']['Row'];
export type Service = Database['public']['Tables']['services']['Row'];
export type Order = Database['public']['Tables']['orders']['Row'] & {
  client?: Profile;
  mitra?: Profile;
  service?: Service;
};
export type WalletTransaction = Database['public']['Tables']['wallet_transactions']['Row'];

// Dashboard Stats
export interface DashboardStats {
  totalOrders: number;
  completedOrders: number;
  activeOrders: number;
  cancelledOrders: number;
  totalRevenue: number;
  totalCommission: number;
  totalClients: number;
  totalMitra: number;
  activeMitra: number;
  averageRating: number;
}

// Chart Data Types
export interface RevenueChartData {
  date: string;
  revenue: number;
  commission: number;
  orders: number;
}

export interface OrdersByStatusData {
  status: string;
  count: number;
  color: string;
}

export interface TopServicesData {
  name: string;
  orders: number;
  revenue: number;
}
