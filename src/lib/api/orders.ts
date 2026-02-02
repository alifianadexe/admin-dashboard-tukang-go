import { supabase } from '@/lib/supabase';
import { Order, OrderStatus } from '@/types/database';

export interface OrdersFilter {
  status?: OrderStatus | 'all';
  search?: string;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  limit?: number;
}

export async function getOrders(filter: OrdersFilter = {}) {
  const { status = 'all', search, startDate, endDate, page = 1, limit = 20 } = filter;

  let query = supabase
    .from('orders')
    .select(
      '*, service:services(id, name), client:profiles!orders_client_id_fkey(id, full_name, phone, email), mitra:profiles!orders_mitra_id_fkey(id, full_name, phone, email)',
      { count: 'exact' }
    );

  if (status !== 'all') {
    query = query.eq('status', status);
  }

  if (search) {
    query = query.or(`order_no.eq.${parseInt(search) || 0},address_origin.ilike.%${search}%`);
  }

  if (startDate) {
    query = query.gte('created_at', startDate.toISOString());
  }

  if (endDate) {
    query = query.lte('created_at', endDate.toISOString());
  }

  const from = (page - 1) * limit;
  const to = from + limit - 1;

  const { data, error, count } = await query
    .order('created_at', { ascending: false })
    .range(from, to);

  if (error) throw error;

  return {
    orders: data as Order[],
    total: count || 0,
    page,
    limit,
    totalPages: Math.ceil((count || 0) / limit),
  };
}

export async function getOrderById(orderId: string) {
  const { data, error } = await supabase
    .from('orders')
    .select(
      '*, service:services(*), client:profiles!orders_client_id_fkey(*), mitra:profiles!orders_mitra_id_fkey(*)'
    )
    .eq('id', orderId)
    .single();

  if (error) throw error;
  return data as Order;
}

export async function updateOrderStatus(orderId: string, status: OrderStatus) {
  const updates: Record<string, any> = { status };

  if (status === 'completed') {
    updates.completed_at = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from('orders')
    .update(updates)
    .eq('id', orderId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function cancelOrder(orderId: string, reason?: string) {
  const { data, error } = await supabase
    .from('orders')
    .update({
      status: 'cancelled',
      notes: reason,
    })
    .eq('id', orderId)
    .select()
    .single();

  if (error) throw error;
  return data;
}
