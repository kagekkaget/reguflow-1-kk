import { useMemo, useState } from "react";
import { Card, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/input";
import { Table, type Column } from "@/components/ui/table";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingState } from "@/components/ui/loading";
import { supabase } from "@/lib/supabase/client";
import { ROLE_LABELS } from "@/lib/constants";
import { formatDateID, debounce } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";

interface AdminUser {
  id: string;
  full_name: string;
  default_role: string;
  created_at: string;
}

export default function AdminUsersPage() {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, default_role, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as AdminUser[];
    },
  });

  const handleSearch = debounce((v: string) => setSearch(v), 300);

  const filtered = useMemo(() => {
    return users.filter((u) => {
      if (roleFilter && u.default_role !== roleFilter) return false;
      if (search) return (u.full_name ?? "").toLowerCase().includes(search.toLowerCase());
      return true;
    });
  }, [users, search, roleFilter]);

  const columns: Column<AdminUser>[] = [
    { key: "name", header: "Nama", cell: (u) => u.full_name || "Tanpa nama" },
    {
      key: "role",
      header: "Role Default",
      cell: (u) => <Badge tone="gray">{ROLE_LABELS[u.default_role as keyof typeof ROLE_LABELS] ?? u.default_role}</Badge>,
    },
    { key: "id", header: "User ID", hideOnMobile: true, cell: (u) => <code className="text-xs text-slate-500">{u.id.slice(0, 8)}</code> },
    { key: "created", header: "Bergabung", hideOnMobile: true, cell: (u) => formatDateID(u.created_at) },
  ];

  return (
    <div>
      <PageHeader
        title="Pengguna"
        description="Daftar semua pengguna platform ReguFlow."
      />

      <Card className="mb-5">
        <CardBody className="grid gap-4 sm:grid-cols-3">
          <div className="sm:col-span-2">
            <label htmlFor="user-search" className="label-text">Cari pengguna</label>
            <Input
              id="user-search"
              placeholder="Nama..."
              onChange={(e) => handleSearch(e.target.value)}
              className="mt-1.5"
            />
          </div>
          <div>
            <label htmlFor="user-role" className="label-text">Role</label>
            <Select
              id="user-role"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="mt-1.5"
            >
              <option value="">Semua role</option>
              {Object.entries(ROLE_LABELS).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </Select>
          </div>
        </CardBody>
      </Card>

      {isLoading ? (
        <LoadingState label="Memuat pengguna..." />
      ) : filtered.length === 0 ? (
        <Card>
          <EmptyState title="Tidak ada pengguna" />
        </Card>
      ) : (
        <Table
          columns={columns}
          data={filtered}
          rowKey={(u) => u.id}
          empty={<EmptyState title="Tidak ada pengguna" />}
        />
      )}
    </div>
  );
}
