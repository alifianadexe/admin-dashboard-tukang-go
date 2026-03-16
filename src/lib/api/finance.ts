import { supabase } from '@/lib/supabase';
import {
  startOfMonth,
  endOfMonth,
  subMonths,
  format,
  eachDayOfInterval,
  startOfDay,
  endOfDay,
  eachMonthOfInterval,
  startOfYear,
  endOfYear,
} from 'date-fns';
import type { Profile, WalletTransaction } from '@/types/database';

type FinanceOrderMetrics = {
  price_total: number;
  commission_amount: number;
  completed_at: string | null;
  payment_method?: string | null;
};

export interface FinanceStats {
  totalRevenue: number;
  totalCommission: number;
  totalPayouts: number;
  pendingPayouts: number;
  monthlyRevenue: number;
  monthlyCommission: number;
  revenueGrowth: number;
  commissionGrowth: number;
}

export async function getFinanceStats(): Promise<FinanceStats> {
  const now = new Date();
  const startOfCurrentMonth = startOfMonth(now);
  const endOfCurrentMonth = endOfMonth(now);
  const startOfLastMonth = startOfMonth(subMonths(now, 1));
  const endOfLastMonth = endOfMonth(subMonths(now, 1));

  // Get all completed orders
  const { data: allOrders, error: allOrdersError } = await supabase
    .from('orders')
    .select('price_total, commission_amount, completed_at')
    .eq('status', 'completed');

  if (allOrdersError) throw allOrdersError;

  // Get current month orders
  const { data: currentMonthOrders, error: currentError } = await supabase
    .from('orders')
    .select('price_total, commission_amount')
    .eq('status', 'completed')
    .gte('completed_at', startOfCurrentMonth.toISOString())
    .lte('completed_at', endOfCurrentMonth.toISOString());

  if (currentError) throw currentError;

  // Get last month orders
  const { data: lastMonthOrders, error: lastError } = await supabase
    .from('orders')
    .select('price_total, commission_amount')
    .eq('status', 'completed')
    .gte('completed_at', startOfLastMonth.toISOString())
    .lte('completed_at', endOfLastMonth.toISOString());

  if (lastError) throw lastError;

  // Get wallet transactions for payouts
  const { data: withdrawals, error: withdrawalError } = await supabase
    .from('wallet_transactions')
    .select('amount')
    .eq('type', 'withdrawal');

  if (withdrawalError) throw withdrawalError;

  const typedAllOrders = (allOrders ?? []) as FinanceOrderMetrics[];
  const typedCurrentMonthOrders = (currentMonthOrders ?? []) as FinanceOrderMetrics[];
  const typedLastMonthOrders = (lastMonthOrders ?? []) as FinanceOrderMetrics[];
  const typedWithdrawals = (withdrawals ?? []) as Array<Pick<WalletTransaction, 'amount'>>;

  // Calculate stats
  const totalRevenue = typedAllOrders.reduce((sum, o) => sum + o.price_total, 0);
  const totalCommission = typedAllOrders.reduce((sum, o) => sum + o.commission_amount, 0);
  const totalPayouts = typedWithdrawals.reduce((sum, t) => sum + Math.abs(t.amount), 0);

  const monthlyRevenue = typedCurrentMonthOrders.reduce((sum, o) => sum + o.price_total, 0);
  const monthlyCommission = typedCurrentMonthOrders.reduce(
    (sum, o) => sum + o.commission_amount,
    0
  );
  const lastMonthRevenue = typedLastMonthOrders.reduce((sum, o) => sum + o.price_total, 0);
  const lastMonthCommission = typedLastMonthOrders.reduce(
    (sum, o) => sum + o.commission_amount,
    0
  );

  const revenueGrowth =
    lastMonthRevenue > 0 ? ((monthlyRevenue - lastMonthRevenue) / lastMonthRevenue) * 100 : 0;
  const commissionGrowth =
    lastMonthCommission > 0
      ? ((monthlyCommission - lastMonthCommission) / lastMonthCommission) * 100
      : 0;

  // Get pending payouts (mitra earnings not yet withdrawn)
  const { data: mitraProfiles, error: mitraError } = await supabase
    .from('profiles')
    .select('wallet_balance')
    .eq('role', 'mitra');

  if (mitraError) throw mitraError;

  const typedMitraProfiles = (mitraProfiles ?? []) as Array<Pick<Profile, 'wallet_balance'>>;

  const pendingPayouts = typedMitraProfiles.reduce((sum, p) => sum + (p.wallet_balance || 0), 0);

  return {
    totalRevenue,
    totalCommission,
    totalPayouts,
    pendingPayouts,
    monthlyRevenue,
    monthlyCommission,
    revenueGrowth: Math.round(revenueGrowth * 10) / 10,
    commissionGrowth: Math.round(commissionGrowth * 10) / 10,
  };
}

export interface MonthlyRevenueData {
  month: string;
  revenue: number;
  commission: number;
  orders: number;
}

export async function getMonthlyRevenueData(months: number = 12): Promise<MonthlyRevenueData[]> {
  const now = new Date();
  const startDate = startOfMonth(subMonths(now, months - 1));
  const endDate = endOfMonth(now);

  const { data: orders, error } = await supabase
    .from('orders')
    .select('price_total, commission_amount, completed_at')
    .eq('status', 'completed')
    .gte('completed_at', startDate.toISOString())
    .lte('completed_at', endDate.toISOString());

  if (error) throw error;

  const typedOrders = (orders ?? []) as FinanceOrderMetrics[];

  // Group by month
  const monthRange = eachMonthOfInterval({ start: startDate, end: endDate });

  return monthRange.map(date => {
    const monthStart = startOfMonth(date);
    const monthEnd = endOfMonth(date);

    const monthOrders =
      typedOrders.filter(o => {
        const completedAt = new Date(o.completed_at!);
        return completedAt >= monthStart && completedAt <= monthEnd;
      });

    return {
      month: format(date, 'MMM yyyy'),
      revenue: monthOrders.reduce((sum, o) => sum + o.price_total, 0),
      commission: monthOrders.reduce((sum, o) => sum + o.commission_amount, 0),
      orders: monthOrders.length,
    };
  });
}

export interface PaymentMethodData {
  method: string;
  count: number;
  amount: number;
}

export type RecentTransaction = WalletTransaction & {
  user: Pick<Profile, 'full_name' | 'role'> | null;
};

export async function getPaymentMethodStats(): Promise<PaymentMethodData[]> {
  const { data: orders, error } = await supabase
    .from('orders')
    .select('payment_method, price_total')
    .eq('status', 'completed')
    .not('payment_method', 'is', null);

  if (error) throw error;

  const typedOrders = (orders ?? []) as FinanceOrderMetrics[];

  const methodStats: Record<string, { count: number; amount: number }> = {};

  typedOrders.forEach(order => {
    const method = order.payment_method || 'unknown';
    if (!methodStats[method]) {
      methodStats[method] = { count: 0, amount: 0 };
    }
    methodStats[method].count++;
    methodStats[method].amount += order.price_total;
  });

  const methodLabels: Record<string, string> = {
    wallet: 'Wallet',
    bank_transfer: 'Bank Transfer',
    cash: 'Cash',
  };

  return Object.entries(methodStats).map(([method, stats]) => ({
    method: methodLabels[method] || method,
    count: stats.count,
    amount: stats.amount,
  }));
}

export async function getRecentTransactions(limit: number = 20): Promise<RecentTransaction[]> {
  const { data, error } = await supabase
    .from('wallet_transactions')
    .select('*, user:profiles(full_name, role)')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data ?? []) as RecentTransaction[];
}
