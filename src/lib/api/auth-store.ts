// ============================================================================
// ReguFlow - Auth store (Zustand) + REST API backend
// ----------------------------------------------------------------------------
// Menyimpan: profile, memberships (org + role), active org, access token.
// State ringan ini HANYA untuk UX routing/guard. Otoritas sebenarnya ada di
// backend (JWT + cek ownership per request). Never trust client.
// ============================================================================

import { create } from "zustand";
import { api, setAccessToken, getAccessToken } from "@/lib/api/client";
import type {
  MemberRole,
  Organization,
  OrganizationMember,
  Profile,
} from "@/types";

interface Membership extends OrganizationMember {
  organization: Organization;
}

interface MeResponse {
  id: string;
  email: string;
  full_name: string;
  role: MemberRole;
  phone: string | null;
  onboarding_completed: boolean;
}

interface OrganizationsResponse {
  id: string;
  name: string;
  type: Organization["type"];
  role: MemberRole;
  createdAt: string;
}

interface AuthState {
  loading: boolean;
  initialized: boolean;
  profile: Profile | null;
  email: string | null;
  memberships: Membership[];
  activeOrganizationId: string | null;

  init: () => Promise<void>;
  refresh: () => Promise<void>;
  setActiveOrganizationId: (orgId: string) => void;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (input: {
    email: string;
    password: string;
    full_name: string;
    phone?: string;
  }) => Promise<void>;
  signOut: () => Promise<void>;

  // derived helpers
  activeRole: () => MemberRole | null;
  activeOrganization: () => Organization | null;
  isPlatformAdmin: () => boolean;
}

const ACTIVE_ORG_KEY = "reguflow.activeOrgId";

function profileFromMe(me: MeResponse): Profile {
  return {
    id: me.id,
    full_name: me.full_name,
    phone: me.phone,
    avatar_url: null,
    default_role: me.role,
    onboarding_completed: me.onboarding_completed,
    onboarding_step: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

export const useAuthStore = create<AuthState>((set, get) => ({
  loading: true,
  initialized: false,
  profile: null,
  email: null,
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
    return (
      memberships.find((m) => m.organization_id === activeOrganizationId)
        ?.organization ?? null
    );
  },

  isPlatformAdmin: () => {
    const { profile } = get();
    return profile?.default_role === "admin";
  },

  refresh: async () => {
    // Tidak ada access token → tidak perlu cek /me.
    if (!getAccessToken()) {
      set({
        profile: null,
        memberships: [],
        activeOrganizationId: null,
        loading: false,
        initialized: true,
      });
      return;
    }

    try {
      const me = await api.get<MeResponse>("/api/auth/me");
      const orgs = await api.get<OrganizationsResponse[]>("/api/organizations");

      const memberships: Membership[] = orgs.map((o) => ({
        id: `${o.id}`,
        organization_id: o.id,
        user_id: me.id,
        role: o.role,
        status: "active",
        created_at: o.createdAt,
        updated_at: o.createdAt,
        organization: {
          id: o.id,
          name: o.name,
          type: o.type,
          created_by: null,
          created_at: o.createdAt,
          updated_at: o.createdAt,
        },
      }));

      let storedOrgId: string | null = null;
      try {
        storedOrgId = localStorage.getItem(ACTIVE_ORG_KEY);
      } catch {
        storedOrgId = null;
      }

      const validIds = memberships.map((m) => m.organization_id);
      const activeOrgId =
        storedOrgId && validIds.includes(storedOrgId)
          ? storedOrgId
          : (validIds[0] ?? null);

      set({
        profile: profileFromMe(me),
        email: me.email,
        memberships,
        activeOrganizationId: activeOrgId,
        loading: false,
        initialized: true,
      });
    } catch {
      set({
        profile: null,
        email: null,
        memberships: [],
        activeOrganizationId: null,
        loading: false,
        initialized: true,
      });
    }
  },

  init: async () => {
    await get().refresh();
  },

  setActiveOrganizationId: (orgId: string) => {
    try {
      localStorage.setItem(ACTIVE_ORG_KEY, orgId);
    } catch {
      /* ignore */
    }
    set({ activeOrganizationId: orgId });
  },

  signIn: async (email: string, password: string) => {
    const result = await api.post<{
      access_token: string;
      user: MeResponse & { organization_id: string | null };
    }>("/api/auth/login", { email, password });
    setAccessToken(result.access_token);
    await get().refresh();
  },

  signUp: async (input) => {
    const result = await api.post<{
      access_token: string;
      user: MeResponse & { organization_id: string | null };
    }>("/api/auth/register", input);
    setAccessToken(result.access_token);
    await get().refresh();
  },

  signOut: async () => {
    try {
      await api.post("/api/auth/logout");
    } catch {
      /* abaikan error logout */
    }
    setAccessToken(null);
    try {
      localStorage.removeItem(ACTIVE_ORG_KEY);
    } catch {
      /* ignore */
    }
    set({
      profile: null,
      email: null,
      memberships: [],
      activeOrganizationId: null,
    });
  },
}));
