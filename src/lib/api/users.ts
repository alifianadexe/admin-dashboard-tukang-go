import { supabase } from '@/lib/supabase';
import { Profile } from '@/types/database';

export interface UsersFilter {
  role?: 'client' | 'mitra' | 'all';
  search?: string;
  isActive?: boolean | 'all';
  isVerified?: boolean | 'all';
  page?: number;
  limit?: number;
}

export async function getUsers(filter: UsersFilter = {}) {
  const {
    role = 'all',
    search,
    isActive = 'all',
    isVerified = 'all',
    page = 1,
    limit = 20,
  } = filter;

  let query = supabase.from('profiles').select('*', { count: 'exact' });

  if (role !== 'all') {
    query = query.eq('role', role);
  } else {
    query = query.in('role', ['client', 'mitra']);
  }

  if (search) {
    query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`);
  }

  if (isActive !== 'all') {
    query = query.eq('is_active', isActive);
  }

  if (isVerified !== 'all') {
    query = query.eq('is_verified', isVerified);
  }

  const from = (page - 1) * limit;
  const to = from + limit - 1;

  const { data, error, count } = await query
    .order('created_at', { ascending: false })
    .range(from, to);

  if (error) throw error;

  return {
    users: data as Profile[],
    total: count || 0,
    page,
    limit,
    totalPages: Math.ceil((count || 0) / limit),
  };
}

export async function getUserById(userId: string) {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();

  if (error) throw error;
  return data as Profile;
}

export async function getUserOrders(userId: string, role: 'client' | 'mitra') {
  const column = role === 'client' ? 'client_id' : 'mitra_id';

  const { data, error } = await supabase
    .from('orders')
    .select('*, service:services(name)')
    .eq(column, userId)
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) throw error;
  return data;
}

export async function updateUserStatus(
  userId: string,
  updates: { is_active?: boolean; is_verified?: boolean }
) {
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getUserStats(userId: string, role: 'client' | 'mitra') {
  const column = role === 'client' ? 'client_id' : 'mitra_id';

  const { data: orders, error } = await supabase
    .from('orders')
    .select('status, price_total, commission_amount, rating')
    .eq(column, userId);

  if (error) throw error;

  const totalOrders = orders?.length || 0;
  const completedOrders = orders?.filter(o => o.status === 'completed').length || 0;
  const totalSpent =
    orders?.filter(o => o.status === 'completed').reduce((sum, o) => sum + o.price_total, 0) || 0;
  const totalEarnings =
    role === 'mitra'
      ? orders
          ?.filter(o => o.status === 'completed')
          .reduce((sum, o) => sum + (o.price_total - o.commission_amount), 0) || 0
      : 0;

  const ratingsData = orders?.filter(o => o.rating !== null);
  const averageRating =
    ratingsData && ratingsData.length > 0
      ? ratingsData.reduce((sum, o) => sum + (o.rating || 0), 0) / ratingsData.length
      : 0;

  return {
    totalOrders,
    completedOrders,
    totalSpent,
    totalEarnings,
    averageRating: Math.round(averageRating * 10) / 10,
  };
}
