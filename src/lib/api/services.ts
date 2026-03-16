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
  const { data, error } = await supabase
    .from('services')
    .insert(service as never)
    .select()
    .single();

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
    .update(updates as never)
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

  const typedOrders =
    (orders ?? []) as Array<{ status: string; price_total: number; commission_amount: number }>;

  const totalOrders = typedOrders.length;
  const completedOrders = typedOrders.filter(o => o.status === 'completed').length;
  const totalRevenue =
    typedOrders
      .filter(o => o.status === 'completed')
      .reduce((sum, o) => sum + o.price_total, 0);
  const totalCommission =
    typedOrders
      ?.filter(o => o.status === 'completed')
      .reduce((sum, o) => sum + o.commission_amount, 0) || 0;

  return {
    totalOrders,
    completedOrders,
    totalRevenue,
    totalCommission,
  };
}
