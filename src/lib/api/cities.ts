import { supabase } from "@/lib/supabase";
import type { IndonesianCity } from "@/types/database";

export interface CityFilter {
  search?: string;
  province?: string;
  cityType?: "Kota" | "Kabupaten" | "all";
  isActive?: boolean | "all";
}

export interface CityPayload {
  province: string;
  city_name: string;
  city_type: "Kota" | "Kabupaten";
  is_active?: boolean;
}

export async function getIndonesianCities(filter: CityFilter = {}) {
  const { search, province, cityType = "all", isActive = "all" } = filter;

  let query = supabase
    .from("indonesian_cities")
    .select("*")
    .order("province", { ascending: true })
    .order("city_name", { ascending: true });

  if (province && province !== "all") {
    query = query.eq("province", province);
  }

  if (cityType !== "all") {
    query = query.eq("city_type", cityType);
  }

  if (isActive !== "all") {
    query = query.eq("is_active", isActive);
  }

  if (search) {
    query = query.or(`province.ilike.%${search}%,city_name.ilike.%${search}%`);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as IndonesianCity[];
}

export async function getCityProvinces() {
  const { data, error } = await supabase
    .from("indonesian_cities")
    .select("province")
    .order("province", { ascending: true });

  if (error) throw error;

  const typedRows = (data ?? []) as Array<{ province: string | null }>;
  const provinces = Array.from(
    new Set(typedRows.map((item) => item.province).filter(Boolean)),
  );

  return provinces;
}

export async function createCity(payload: CityPayload) {
  const { data, error } = await supabase
    .from("indonesian_cities")
    .insert({
      province: payload.province.trim(),
      city_name: payload.city_name.trim(),
      city_type: payload.city_type,
      is_active: payload.is_active ?? true,
    } as never)
    .select()
    .single();

  if (error) throw error;
  return data as IndonesianCity;
}

export async function updateCity(cityId: number, payload: CityPayload) {
  const { data, error } = await supabase
    .from("indonesian_cities")
    .update({
      province: payload.province.trim(),
      city_name: payload.city_name.trim(),
      city_type: payload.city_type,
      is_active: payload.is_active ?? true,
    } as never)
    .eq("id", cityId)
    .select()
    .single();

  if (error) throw error;
  return data as IndonesianCity;
}

export async function deleteCity(cityId: number) {
  const { error } = await supabase
    .from("indonesian_cities")
    .delete()
    .eq("id", cityId);
  if (error) throw error;
}
