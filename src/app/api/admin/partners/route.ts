import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import type { Database, Profile } from "@/types/database";

type CreatePartnerBody = {
  full_name?: string | null;
  email?: string;
  phone?: string | null;
  is_active?: boolean;
  is_verified?: boolean;
};

function normalizeOptionalText(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function buildTemporaryPassword(): string {
  return "P@ssw0rd123";
}

export async function POST(request: NextRequest) {
  try {
    const supabaseUrl =
      process.env.NEXT_PUBLIC_SUPABASE_URL ||
      process.env.EXPO_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey =
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_KEY ||
      process.env.EXPO_PUBLIC_SUPABASE_KEY;
    const serviceRoleKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.EXPO_SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
      return NextResponse.json(
        {
          error:
            "Missing Supabase env vars. Required: NEXT_PUBLIC_SUPABASE_URL (or EXPO_PUBLIC_SUPABASE_URL), NEXT_PUBLIC_SUPABASE_ANON_KEY/NEXT_PUBLIC_SUPABASE_KEY (or EXPO_PUBLIC_SUPABASE_KEY), and SUPABASE_SERVICE_ROLE_KEY.",
        },
        { status: 500 },
      );
    }

    const authHeader = request.headers.get("authorization") || "";
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.slice(7).trim()
      : null;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userClient = createClient<Database>(supabaseUrl, supabaseAnonKey);
    const { data: userData, error: userError } =
      await userClient.auth.getUser(token);

    if (userError || !userData.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const adminClient = createClient<Database>(supabaseUrl, serviceRoleKey);

    const { data: requesterProfile, error: requesterError } = await adminClient
      .from("profiles")
      .select("role")
      .eq("id", userData.user.id)
      .maybeSingle();

    const requesterRole = (requesterProfile as { role?: string } | null)?.role;

    if (requesterError || requesterRole !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = (await request.json()) as CreatePartnerBody;
    const email = normalizeOptionalText(body.email);
    const fullName = normalizeOptionalText(body.full_name);
    const phone = normalizeOptionalText(body.phone);

    if (!email) {
      return NextResponse.json(
        { error: "Email is required." },
        { status: 400 },
      );
    }

    const temporaryPassword = buildTemporaryPassword();

    const { data: createdAuthUser, error: createUserError } =
      await adminClient.auth.admin.createUser({
        email,
        password: temporaryPassword,
        email_confirm: true,
        user_metadata: {
          role: "mitra",
          full_name: fullName,
          phone,
        },
      });

    if (createUserError || !createdAuthUser.user) {
      const message = createUserError?.message || "Failed to create auth user.";
      return NextResponse.json({ error: message }, { status: 400 });
    }

    const upsertPayload = {
      id: createdAuthUser.user.id,
      role: "mitra" as const,
      full_name: fullName,
      email,
      phone,
      is_active: body.is_active ?? true,
      is_verified: body.is_verified ?? false,
    };

    const { data: profile, error: profileError } = await adminClient
      .from("profiles")
      .upsert(upsertPayload as never, { onConflict: "id" })
      .select("*")
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        {
          error:
            profileError?.message ||
            "Auth user created, but profile creation failed.",
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      profile: profile as Profile,
      temporaryPassword,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected server error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
