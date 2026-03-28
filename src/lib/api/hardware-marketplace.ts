import { supabase } from "@/lib/supabase";
import { HardwareMarketplaceItem } from "@/types/database";

export type HardwareMarketplaceItemInput = {
  name: string;
  category?: string;
  unit: string;
  stock_amount: number;
  price: number;
  original_price?: number | null;
  discount_label?: string;
  description?: string;
  image_url?: string;
  store_name: string;
  store_phone: string;
  store_whatsapp_phone?: string;
  store_address?: string;
  is_active?: boolean;
  display_order?: number;
};

export async function getHardwareMarketplaceItems() {
  const { data, error } = await supabase
    .from("hardware_marketplace_items")
    .select("*")
    .order("display_order", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data as HardwareMarketplaceItem[];
}

export async function createHardwareMarketplaceItem(
  item: HardwareMarketplaceItemInput,
) {
  const { data, error } = await supabase
    .from("hardware_marketplace_items")
    .insert(item as never)
    .select()
    .single();

  if (error) throw error;
  return data as HardwareMarketplaceItem;
}

export async function updateHardwareMarketplaceItem(
  itemId: string,
  updates: Partial<HardwareMarketplaceItemInput>,
) {
  const { data, error } = await supabase
    .from("hardware_marketplace_items")
    .update(updates as never)
    .eq("id", itemId)
    .select()
    .single();

  if (error) throw error;
  return data as HardwareMarketplaceItem;
}

export async function deleteHardwareMarketplaceItem(itemId: string) {
  const { error } = await supabase
    .from("hardware_marketplace_items")
    .delete()
    .eq("id", itemId);

  if (error) throw error;
}
