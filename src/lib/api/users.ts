import { supabase } from "@/lib/supabase";
import type { Profile, ProfileDetails } from "@/types/database";

export interface UsersFilter {
  role?: "client" | "mitra" | "all";
  search?: string;
  isActive?: boolean | "all";
  isVerified?: boolean | "all";
  page?: number;
  limit?: number;
}

export interface CreatePartnerInput {
  id: string;
  full_name?: string | null;
  email: string;
  phone?: string | null;
  is_active?: boolean;
  is_verified?: boolean;
}

export interface CreatePartnerAccountInput {
  full_name?: string | null;
  email: string;
  phone?: string | null;
  is_active?: boolean;
  is_verified?: boolean;
}

export interface UpdatePartnerInput {
  full_name?: string | null;
  email?: string | null;
  phone?: string | null;
  is_active?: boolean;
  is_verified?: boolean;
}

export async function getUsers(filter: UsersFilter = {}) {
  const {
    role = "all",
    search,
    isActive = "all",
    isVerified = "all",
    page = 1,
    limit = 20,
  } = filter;

  let query = supabase.from("profiles").select("*", { count: "exact" });

  if (role !== "all") {
    query = query.eq("role", role);
  } else {
    query = query.in("role", ["client", "mitra"]);
  }

  if (search) {
    query = query.or(
      `full_name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`,
    );
  }

  if (isActive !== "all") {
    query = query.eq("is_active", isActive);
  }

  if (isVerified !== "all") {
    query = query.eq("is_verified", isVerified);
  }

  const from = (page - 1) * limit;
  const to = from + limit - 1;

  const { data, error, count } = await query
    .order("created_at", { ascending: false })
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
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  if (error) throw error;
  return data as Profile;
}

export async function createPartner(input: CreatePartnerInput) {
  const payload = {
    id: input.id,
    role: "mitra" as const,
    full_name: input.full_name ?? null,
    email: input.email,
    phone: input.phone ?? null,
    is_active: input.is_active ?? true,
    is_verified: input.is_verified ?? false,
  };

  const { data, error } = await supabase
    .from("profiles")
    .insert(payload as never)
    .select()
    .single();

  if (error) throw error;
  return data as Profile;
}

export async function createPartnerAccount(input: CreatePartnerAccountInput) {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error("Unauthorized. Please sign in again.");
  }

  const response = await fetch("/api/admin/partners", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify(input),
  });

  const payload = (await response.json()) as {
    error?: string;
    profile?: Profile;
    temporaryPassword?: string;
  };

  if (!response.ok || !payload.profile) {
    throw new Error(payload.error || "Failed to create partner account");
  }

  return payload;
}

export async function updatePartner(
  userId: string,
  updates: UpdatePartnerInput,
) {
  const { data, error } = await supabase
    .from("profiles")
    .update(updates as never)
    .eq("id", userId)
    .eq("role", "mitra")
    .select()
    .single();

  if (error) throw error;
  return data as Profile;
}

export type ProfileDetailsUpdate = Partial<
  Omit<
    ProfileDetails,
    | "id"
    | "profile_id"
    | "created_at"
    | "updated_at"
    | "notification_preferences"
    | "metadata"
  >
> & {
  notification_preferences?: ProfileDetails["notification_preferences"];
  metadata?: ProfileDetails["metadata"];
};

export async function getProfileDetails(userId: string) {
  const { data, error } = await supabase
    .from("profile_details")
    .select("*")
    .eq("profile_id", userId)
    .maybeSingle();

  if (error) throw error;
  return data as ProfileDetails | null;
}

export async function updateProfileDetails(
  userId: string,
  updates: ProfileDetailsUpdate,
) {
  const payload = { profile_id: userId, ...updates };

  const { data, error } = await supabase
    .from("profile_details")
    .upsert(payload as never, { onConflict: "profile_id" })
    .select()
    .single();

  if (error) throw error;
  return data as ProfileDetails;
}

export async function getUserOrders(userId: string, role: "client" | "mitra") {
  const column = role === "client" ? "client_id" : "mitra_id";

  const { data, error } = await supabase
    .from("orders")
    .select("*, service:services(name)")
    .eq(column, userId)
    .order("created_at", { ascending: false })
    .limit(10);

  if (error) throw error;
  return data;
}

export async function updateUserStatus(
  userId: string,
  updates: { is_active?: boolean; is_verified?: boolean },
) {
  const { data, error } = await supabase
    .from("profiles")
    .update(updates as never)
    .eq("id", userId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getUserStats(userId: string, role: "client" | "mitra") {
  const column = role === "client" ? "client_id" : "mitra_id";

  const { data: orders, error } = await supabase
    .from("orders")
    .select("status, price_total, commission_amount, rating")
    .eq(column, userId);

  if (error) throw error;

  const typedOrders = (orders ?? []) as Array<{
    status: string;
    price_total: number;
    commission_amount: number;
    rating: number | null;
  }>;

  const totalOrders = typedOrders.length;
  const completedOrders = typedOrders.filter(
    (o) => o.status === "completed",
  ).length;
  const totalSpent = typedOrders
    .filter((o) => o.status === "completed")
    .reduce((sum, o) => sum + o.price_total, 0);
  const totalEarnings =
    role === "mitra"
      ? typedOrders
          ?.filter((o) => o.status === "completed")
          .reduce((sum, o) => sum + (o.price_total - o.commission_amount), 0) ||
        0
      : 0;

  const ratingsData = typedOrders.filter((o) => o.rating !== null);
  const averageRating =
    ratingsData && ratingsData.length > 0
      ? ratingsData.reduce((sum, o) => sum + (o.rating || 0), 0) /
        ratingsData.length
      : 0;

  return {
    totalOrders,
    completedOrders,
    totalSpent,
    totalEarnings,
    averageRating: Math.round(averageRating * 10) / 10,
  };
}

// Partner Services Management
export async function updatePartnerServices(
  userId: string,
  serviceIds: string[],
) {
  const { data, error } = await supabase
    .from("profiles")
    .update({ service_ids: serviceIds } as never)
    .eq("id", userId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getPartnerServices(userId: string) {
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("service_ids")
    .eq("id", userId)
    .single();

  if (profileError) throw profileError;

  const typedProfile = (profile ?? { service_ids: [] }) as {
    service_ids: string[] | null;
  };

  if (!typedProfile.service_ids || typedProfile.service_ids.length === 0) {
    return [];
  }

  const { data: services, error: servicesError } = await supabase
    .from("services")
    .select("*")
    .in("id", typedProfile.service_ids);

  if (servicesError) throw servicesError;
  return services;
}

// Partner Referrals
export async function getPartnerReferrals(userId: string) {
  const { data, error } = await supabase
    .from("partner_referrals")
    .select(
      `
      *,
      referrer:referrer_id(id, full_name, email, phone, referral_code),
      referred:referred_id(id, full_name, email, phone, is_verified, created_at)
    `,
    )
    .eq("referrer_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data;
}

export async function getAllReferrals() {
  const { data, error } = await supabase
    .from("partner_referrals")
    .select(
      `
      *,
      referrer:referrer_id(id, full_name, email, phone, referral_code),
      referred:referred_id(id, full_name, email, phone, is_verified, created_at)
    `,
    )
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data;
}

export async function updateReferralBonus(
  referralId: string,
  bonusAmount: number,
  bonusPaidAt?: string,
) {
  const updates: any = { bonus_amount: bonusAmount };
  if (bonusPaidAt) {
    updates.bonus_paid_at = bonusPaidAt;
  }

  const { data, error } = await supabase
    .from("partner_referrals")
    .update(updates as never)
    .eq("id", referralId)
    .select()
    .single();

  if (error) throw error;
  return data;
}
