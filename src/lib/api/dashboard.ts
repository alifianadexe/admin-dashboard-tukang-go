import { supabase } from '@/lib/supabase';
import {
  DashboardStats,
  RevenueChartData,
  OrdersByStatusData,
  TopServicesData,
  Order,
} from '@/types/database';
import {
  startOfMonth,
  endOfMonth,
  subMonths,
  format,
  eachDayOfInterval,
  startOfDay,
  endOfDay,
} from 'date-fns';

type DashboardOrderMetrics = Pick<Order, 'status' | 'price_total' | 'commission_amount' | 'rating'>;
type RevenueOrderMetrics = Pick<Order, 'price_total' | 'commission_amount' | 'completed_at'>;
type ServiceOrderMetrics = Pick<Order, 'service_id' | 'price_total'>;

export async function getDashboardStats(): Promise<DashboardStats> {
  const now = new Date();
  const startOfCurrentMonth = startOfMonth(now);
  const endOfCurrentMonth = endOfMonth(now);

  // Get order stats
  const { data: orders, error: ordersError } = await supabase
    .from('orders')
    .select('status, price_total, commission_amount, rating');

  if (ordersError) throw ordersError;

  const typedOrders = (orders ?? []) as DashboardOrderMetrics[];

  const totalOrders = typedOrders.length;
  const completedOrders = typedOrders.filter(o => o.status === 'completed').length;
  const activeOrders =
    typedOrders.filter(o => !['completed', 'cancelled'].includes(o.status)).length;
  const cancelledOrders = typedOrders.filter(o => o.status === 'cancelled').length;

  const completedOrdersData = typedOrders.filter(o => o.status === 'completed');
  const totalRevenue = completedOrdersData.reduce((sum, o) => sum + (o.price_total || 0), 0);
  const totalCommission = completedOrdersData.reduce(
    (sum, o) => sum + (o.commission_amount || 0),
    0
  );

  const ratingsData = completedOrdersData.filter(o => o.rating !== null);
  const averageRating =
    ratingsData.length > 0
      ? ratingsData.reduce((sum, o) => sum + (o.rating || 0), 0) / ratingsData.length
      : 0;

  // Get user stats
  const { data: clients, error: clientsError } = await supabase
    .from('profiles')
    .select('id')
    .eq('role', 'client');

  if (clientsError) throw clientsError;

  const { data: mitra, error: mitraError } = await supabase
    .from('profiles')
    .select('id, is_active')
    .eq('role', 'mitra');

  if (mitraError) throw mitraError;

  const typedClients = (clients ?? []) as Array<{ id: string }>;
  const typedMitra = (mitra ?? []) as Array<{ id: string; is_active: boolean }>;

  const totalClients = typedClients.length;
  const totalMitra = typedMitra.length;
  const activeMitra = typedMitra.filter(m => m.is_active).length;

  return {
    totalOrders,
    completedOrders,
    activeOrders,
    cancelledOrders,
    totalRevenue,
    totalCommission,
    totalClients,
    totalMitra,
    activeMitra,
    averageRating: Math.round(averageRating * 10) / 10,
  };
}

export async function getRevenueChartData(days: number = 30): Promise<RevenueChartData[]> {
  const endDate = new Date();
  const startDate = subMonths(endDate, 1);

  const { data: orders, error } = await supabase
    .from('orders')
    .select('price_total, commission_amount, completed_at')
    .eq('status', 'completed')
    .gte('completed_at', startDate.toISOString())
    .lte('completed_at', endDate.toISOString());

  if (error) throw error;

  const typedOrders = (orders ?? []) as RevenueOrderMetrics[];

  // Group by date
  const dateRange = eachDayOfInterval({ start: startDate, end: endDate });

  return dateRange.map(date => {
    const dayStart = startOfDay(date);
    const dayEnd = endOfDay(date);

    const dayOrders =
      typedOrders.filter(o => {
        const completedAt = new Date(o.completed_at!);
        return completedAt >= dayStart && completedAt <= dayEnd;
      });

    return {
      date: format(date, 'MMM dd'),
      revenue: dayOrders.reduce((sum, o) => sum + (o.price_total || 0), 0),
      commission: dayOrders.reduce((sum, o) => sum + (o.commission_amount || 0), 0),
      orders: dayOrders.length,
    };
  });
}

export async function getOrdersByStatus(): Promise<OrdersByStatusData[]> {
  const { data: orders, error } = await supabase.from('orders').select('status');

  if (error) throw error;

  const typedOrders = (orders ?? []) as Pick<Order, 'status'>[];

  const statusCounts: Record<string, number> = {};
  typedOrders.forEach(order => {
    statusCounts[order.status] = (statusCounts[order.status] || 0) + 1;
  });

  const statusColors: Record<string, string> = {
    searching: '#fbbf24',
    accepted: '#60a5fa',
    arrived: '#a78bfa',
    in_progress: '#34d399',
    payment_pending: '#f97316',
    completed: '#22c55e',
    cancelled: '#ef4444',
  };

  const statusLabels: Record<string, string> = {
    searching: 'Searching',
    accepted: 'Accepted',
    arrived: 'Arrived',
    in_progress: 'In Progress',
    payment_pending: 'Payment Pending',
    completed: 'Completed',
    cancelled: 'Cancelled',
  };

  return Object.entries(statusCounts).map(([status, count]) => ({
    status: statusLabels[status] || status,
    count,
    color: statusColors[status] || '#gray',
  }));
}

export async function getTopServices(limit: number = 5): Promise<TopServicesData[]> {
  const { data: orders, error: ordersError } = await supabase
    .from('orders')
    .select('service_id, price_total')
    .eq('status', 'completed');

  if (ordersError) throw ordersError;

  const typedOrders = (orders ?? []) as ServiceOrderMetrics[];

  const { data: services, error: servicesError } = await supabase
    .from('services')
    .select('id, name');

  if (servicesError) throw servicesError;

  const typedServices = (services ?? []) as Array<{ id: string; name: string }>;

  // Group orders by service
  const serviceStats: Record<string, { orders: number; revenue: number }> = {};
  typedOrders.forEach(order => {
    if (!serviceStats[order.service_id]) {
      serviceStats[order.service_id] = { orders: 0, revenue: 0 };
    }
    serviceStats[order.service_id].orders++;
    serviceStats[order.service_id].revenue += order.price_total || 0;
  });

  // Map to service names and sort
  const servicesMap = new Map(typedServices.map(s => [s.id, s.name]));

  return Object.entries(serviceStats)
    .map(([serviceId, stats]) => ({
      name: servicesMap.get(serviceId) || 'Unknown',
      orders: stats.orders,
      revenue: stats.revenue,
    }))
    .sort((a, b) => b.orders - a.orders)
    .slice(0, limit);
}

export async function getRecentOrders(limit: number = 10): Promise<Order[]> {
  const { data, error } = await supabase
    .from('orders')
    .select(
      '*, service:services(name), client:profiles!orders_client_id_fkey(full_name), mitra:profiles!orders_mitra_id_fkey(full_name)'
    )
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data as Order[];
}
