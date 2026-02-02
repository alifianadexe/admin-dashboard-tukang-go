import { supabase } from '@/lib/supabase';
import { Service } from '@/types/database';

export async function getServices() {
  const { data, error } = await supabase
    .from('services')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as Service[];
}

export async function getServiceById(serviceId: string) {
  const { data, error } = await supabase.from('services').select('*').eq('id', serviceId).single();

  if (error) throw error;
  return data as Service;
}

export async function createService(service: {
  name: string;
  description?: string;
  icon?: string;
  base_price: number;
  commission_percentage: number;
  is_active?: boolean;
}) {
  const { data, error } = await supabase.from('services').insert(service).select().single();

  if (error) throw error;
  return data as Service;
}

export async function updateService(
  serviceId: string,
  updates: Partial<{
    name: string;
    description: string;
    icon: string;
    base_price: number;
    commission_percentage: number;
    is_active: boolean;
  }>
) {
  const { data, error } = await supabase
    .from('services')
    .update(updates)
    .eq('id', serviceId)
    .select()
    .single();

  if (error) throw error;
  return data as Service;
}

export async function deleteService(serviceId: string) {
  const { error } = await supabase.from('services').delete().eq('id', serviceId);

  if (error) throw error;
}

export async function getServiceStats(serviceId: string) {
  const { data: orders, error } = await supabase
    .from('orders')
    .select('status, price_total, commission_amount')
    .eq('service_id', serviceId);

  if (error) throw error;

  const totalOrders = orders?.length || 0;
  const completedOrders = orders?.filter(o => o.status === 'completed').length || 0;
  const totalRevenue =
    orders?.filter(o => o.status === 'completed').reduce((sum, o) => sum + o.price_total, 0) || 0;
  const totalCommission =
    orders
      ?.filter(o => o.status === 'completed')
      .reduce((sum, o) => sum + o.commission_amount, 0) || 0;

  return {
    totalOrders,
    completedOrders,
    totalRevenue,
    totalCommission,
  };
}
