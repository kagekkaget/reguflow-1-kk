// ============================================================================
// ReguFlow - Auth store (Zustand) + Supabase Auth
// ----------------------------------------------------------------------------
// Menyimpan: session, profile, memberships (org + role), active org.
// State ringan ini HANYA untuk UX routing/guard. Otoritas sebenarnya adalah
// Supabase Auth + RLS di database (never trust client).
// ============================================================================

import { create } from "zustand";
import { supabase, isSupabaseConfigured } from "@/lib/supabase/client";
import type {
  MemberRole,
  Organization,
  OrganizationMember,
  Profile,
} from "@/types";
import { logAudit } from "@/lib/security/audit";

interface Membership extends OrganizationMember {
  organization: Organization;
}

interface AuthState {
  loading: boolean;
  initialized: boolean;
  session: import("@supabase/supabase-js").Session | null;
  profile: Profile | null;
  memberships: Membership[];
  activeOrganizationId: string | null;

  init: () => Promise<void>;
  refresh: () => Promise<void>;
  setActiveOrganizationId: (orgId: string) => void;
  signOut: () => Promise<void>;

  // derived helpers
  activeRole: () => MemberRole | null;
  activeOrganization: () => Organization | null;
  isPlatformAdmin: () => boolean;
}

const ACTIVE_ORG_KEY = "reguflow.activeOrgId";

export const useAuthStore = create<AuthState>((set, get) => ({
  loading: true,
  initialized: false,
  session: null,
  profile: null,
  memberships: [],
  activeOrganizationId: null,

  activeRole: () => {
    const { memberships, activeOrganizationId, profile } = get();
    if (!profile) return null;
    const m = memberships.find((x) => x.organization_id === activeOrganizationId);
    return m?.role ?? profile.default_role ?? null;
  },

  activeOrganization: () => {
    const { memberships, activeOrganizationId } = get();
    return memberships.find((m) => m.organization_id === activeOrganizationId)
      ?.organization ?? null;
  },

  isPlatformAdmin: () => {
    const { memberships, profile } = get();
    if (profile?.default_role === "admin") return true;
    return memberships.some(
      (m) => m.organization.type === "platform" && m.role === "admin"
    );
  },

  refresh: async () => {
    if (!isSupabaseConfigured) {
      set({ loading: false, initialized: true });
      return;
    }
    try {
      const [
        { data: sessionData },
        { data: userData },
      ] = await Promise.all([
        supabase.auth.getSession(),
        supabase.auth.getUser(),
      ]);

      const user = userData.user;
      if (!user) {
        set({
          session: null,
          profile: null,
          memberships: [],
          activeOrganizationId: null,
          loading: false,
          initialized: true,
        });
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      const { data: members } = await supabase
        .from("organization_members")
        .select("*, organization:organizations(*)")
        .eq("user_id", user.id)
        .eq("status", "active")
        .order("created_at", { ascending: true });

      const memberships = (members ?? []) as unknown as Membership[];

      // Pilih active org: dari storage, lalu default_role match, lalu pertama
      let storedOrgId: string | null = null;
      try {
        storedOrgId = localStorage.getItem(ACTIVE_ORG_KEY);
      } catch {
        storedOrgId = null;
      }

      const validIds = memberships.map((m) => m.organization_id);
      let activeOrgId =
        storedOrgId && validIds.includes(storedOrgId)
          ? storedOrgId
          : validIds[0] ?? null;

      // Prioritas: jika ada org platform & default_role admin, pilih itu
      if (profile?.default_role === "admin" && !activeOrgId) {
        const platformOrg = memberships.find(
          (m) => m.organization.type === "platform"
        );
        activeOrgId = platformOrg?.organization_id ?? activeOrgId;
      }

      set({
        session: sessionData.session,
        profile: (profile as Profile | null) ?? null,
        memberships,
        activeOrganizationId: activeOrgId,
        loading: false,
        initialized: true,
      });
    } catch {
      set({
        loading: false,
        initialized: true,
        session: null,
        profile: null,
        memberships: [],
      });
    }
  },

  init: async () => {
    await get().refresh();

    supabase.auth.onAuthStateChange(async (event) => {
      if (event === "SIGNED_OUT") {
        set({
          session: null,
          profile: null,
          memberships: [],
          activeOrganizationId: null,
        });
        try {
          localStorage.removeItem(ACTIVE_ORG_KEY);
        } catch {
          /* ignore */
        }
      } else if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        await get().refresh();
        if (event === "SIGNED_IN") {
          await logAudit({ action: "user_login" });
        }
      }
    });
  },

  setActiveOrganizationId: (orgId: string) => {
    try {
      localStorage.setItem(ACTIVE_ORG_KEY, orgId);
    } catch {
      /* ignore */
    }
    set({ activeOrganizationId: orgId });
  },

  signOut: async () => {
    await logAudit({ action: "user_logout" });
    try {
      localStorage.removeItem(ACTIVE_ORG_KEY);
    } catch {
      /* ignore */
    }
    await supabase.auth.signOut();
    set({
      session: null,
      profile: null,
      memberships: [],
      activeOrganizationId: null,
    });
  },
}));
