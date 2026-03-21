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

export interface ReferralPartner {
  id: string;
  full_name: string | null;
  email: string;
  phone: string | null;
  is_verified: boolean;
  created_at: string;
  referred_by: string | null;
  referral_code: string | null;
}

export interface ReferralGroupMember extends ReferralPartner {
  depth: number;
  is_current: boolean;
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

async function getAllMitraPartners() {
  const { data, error } = await supabase
    .from("profiles")
    .select(
      "id, full_name, email, phone, is_verified, created_at, referred_by, referral_code",
    )
    .eq("role", "mitra");

  if (error) throw error;
  return (data ?? []) as ReferralPartner[];
}

export async function getDirectReferredPartners(userId: string) {
  const { data, error } = await supabase
    .from("profiles")
    .select(
      "id, full_name, email, phone, is_verified, created_at, referred_by, referral_code",
    )
    .eq("role", "mitra")
    .eq("referred_by", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as ReferralPartner[];
}

export async function getReferralPartnerOptions(currentPartnerId: string) {
  const { data, error } = await supabase
    .from("profiles")
    .select(
      "id, full_name, email, phone, is_verified, created_at, referred_by, referral_code",
    )
    .eq("role", "mitra")
    .neq("id", currentPartnerId)
    .order("full_name", { ascending: true });

  if (error) throw error;
  return (data ?? []) as ReferralPartner[];
}

export async function getReferralGroupMembers(currentPartnerId: string) {
  const partners = await getAllMitraPartners();
  const byId = new Map(partners.map((partner) => [partner.id, partner]));

  const currentPartner = byId.get(currentPartnerId);
  if (!currentPartner) {
    return [] as ReferralGroupMember[];
  }

  let rootId = currentPartnerId;
  const seen = new Set<string>([rootId]);
  let cursor = currentPartner.referred_by;

  while (cursor) {
    if (seen.has(cursor)) {
      break;
    }

    const parent = byId.get(cursor);
    if (!parent) {
      break;
    }

    rootId = parent.id;
    seen.add(parent.id);
    cursor = parent.referred_by;
  }

  const childrenByParent = new Map<string, ReferralPartner[]>();
  for (const partner of partners) {
    if (!partner.referred_by) {
      continue;
    }

    const siblings = childrenByParent.get(partner.referred_by) ?? [];
    siblings.push(partner);
    childrenByParent.set(partner.referred_by, siblings);
  }

  const result: ReferralGroupMember[] = [];
  const queue: Array<{ partnerId: string; depth: number }> = [
    { partnerId: rootId, depth: 0 },
  ];
  const visited = new Set<string>();

  while (queue.length > 0) {
    const item = queue.shift();
    if (!item) {
      break;
    }

    if (visited.has(item.partnerId)) {
      continue;
    }

    const partner = byId.get(item.partnerId);
    if (!partner) {
      continue;
    }

    visited.add(item.partnerId);
    result.push({
      ...partner,
      depth: item.depth,
      is_current: partner.id === currentPartnerId,
    });

    const children = childrenByParent.get(item.partnerId) ?? [];
    children.sort((a, b) =>
      (a.full_name || a.email).localeCompare(b.full_name || b.email),
    );
    for (const child of children) {
      queue.push({ partnerId: child.id, depth: item.depth + 1 });
    }
  }

  return result;
}

export async function upsertReferralRelation(
  referredPartnerId: string,
  newReferrerId: string | null,
) {
  if (newReferrerId === referredPartnerId) {
    throw new Error("A partner cannot refer themselves.");
  }

  const partners = await getAllMitraPartners();
  const byId = new Map(partners.map((partner) => [partner.id, partner]));

  const referredPartner = byId.get(referredPartnerId);
  if (!referredPartner) {
    throw new Error("Referred partner not found.");
  }

  if (newReferrerId) {
    const newReferrer = byId.get(newReferrerId);
    if (!newReferrer) {
      throw new Error("Referrer partner not found.");
    }

    // Prevent cycles by ensuring the referred partner is not an ancestor of new referrer.
    let cursor: string | null = newReferrerId;
    const seen = new Set<string>();
    while (cursor) {
      if (cursor === referredPartnerId) {
        throw new Error("This relation creates a referral cycle.");
      }
      if (seen.has(cursor)) {
        break;
      }

      seen.add(cursor);
      cursor = byId.get(cursor)?.referred_by ?? null;
    }
  }

  const { error: updateError } = await supabase
    .from("profiles")
    .update({ referred_by: newReferrerId } as never)
    .eq("id", referredPartnerId)
    .eq("role", "mitra");

  if (updateError) throw updateError;

  const { error: cleanupError } = await supabase
    .from("partner_referrals")
    .delete()
    .eq("referred_id", referredPartnerId);

  if (cleanupError) throw cleanupError;

  if (newReferrerId) {
    const referrer = byId.get(newReferrerId);
    if (!referrer?.referral_code) {
      throw new Error("Referrer does not have a referral code yet.");
    }

    const status = referredPartner.is_verified ? "active" : "pending";
    const { error: insertError } = await supabase
      .from("partner_referrals")
      .insert({
        referrer_id: newReferrerId,
        referred_id: referredPartnerId,
        referral_code: referrer.referral_code,
        status,
      } as never);

    if (insertError) throw insertError;
  }
}

export async function moveReferralSubtree(
  subtreeRootPartnerId: string,
  newParentPartnerId: string | null,
) {
  await upsertReferralRelation(subtreeRootPartnerId, newParentPartnerId);
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
