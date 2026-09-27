import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, type Column } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingState } from "@/components/ui/loading";
import { useToast } from "@/components/ui/toast";
import { supabase } from "@/lib/supabase/client";
import { getSafeErrorMessage } from "@/lib/utils";
import { DOMAIN_CODE_LABELS } from "@/lib/constants";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { ComplianceRule } from "@/types";
import { useState } from "react";

export default function AdminRulesPage() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    code: "",
    domainCode: "halal",
    title: "",
    description: "",
    priority: "50",
  });

  const { data: rules = [], isLoading } = useQuery({
    queryKey: ["admin-rules"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("compliance_rules")
        .select("*")
        .order("priority", { ascending: false });
      if (error) throw error;
      return (data ?? []) as ComplianceRule[];
    },
  });

  const handleCreate = async () => {
    if (!form.code || !form.title) {
      toast.error("Lengkapi data", "Kode dan judul wajib diisi.");
      return;
    }
    setSaving(true);
    try {
      const { data: domain } = await supabase
        .from("compliance_domains")
        .select("id")
        .eq("code", form.domainCode)
        .maybeSingle();

      const { error } = await supabase.from("compliance_rules").insert({
        code: form.code,
        domain_id: domain?.id ?? null,
        title: form.title,
        description: form.description || null,
        priority: Number(form.priority) || 50,
        condition_json: {},
        action_json: {},
        is_active: true,
      });
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["admin-rules"] });
      toast.success("Rule dibuat", form.title);
      setModalOpen(false);
      setForm({ code: "", domainCode: "halal", title: "", description: "", priority: "50" });
    } catch (error) {
      toast.error("Gagal membuat rule", getSafeErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (rule: ComplianceRule) => {
    try {
      const { error } = await supabase
        .from("compliance_rules")
        .update({ is_active: !rule.is_active })
        .eq("id", rule.id);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["admin-rules"] });
      toast.success("Rule diperbarui", `${rule.title}: ${!rule.is_active ? "aktif" : "nonaktif"}`);
    } catch (error) {
      toast.error("Gagal memperbarui", getSafeErrorMessage(error));
    }
  };

  const columns: Column<ComplianceRule>[] = [
    { key: "code", header: "Kode", cell: (r) => <code className="text-xs">{r.code}</code> },
    { key: "title", header: "Judul", cell: (r) => r.title },
    {
      key: "domain",
      header: "Domain",
      hideOnMobile: true,
      cell: () => <Badge tone="blue">Compliance Rule</Badge>,
    },
    { key: "priority", header: "Prioritas", hideOnMobile: true, cell: (r) => r.priority },
    {
      key: "active",
      header: "Status",
      cell: (r) => (
        <button
          type="button"
          onClick={() => handleToggle(r)}
          className="inline-flex"
        >
          <Badge tone={r.is_active ? "green" : "gray"}>
            {r.is_active ? "Aktif" : "Nonaktif"}
          </Badge>
        </button>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Aturan Compliance"
        description="Kelola rule engine yang dipakai scanner compliance."
        actions={<Button onClick={() => setModalOpen(true)}>+ Tambah Rule</Button>}
      />

      {isLoading ? (
        <LoadingState label="Memuat rules..." />
      ) : rules.length === 0 ? (
        <Card>
          <EmptyState
            title="Belum ada rule"
            description="Buat rule pertama untuk scanner compliance."
            actionLabel="+ Tambah Rule"
            onAction={() => setModalOpen(true)}
          />
        </Card>
      ) : (
        <Table
          columns={columns}
          data={rules}
          rowKey={(r) => r.id}
          empty={<EmptyState title="Belum ada rule" />}
        />
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Tambah Rule Compliance"
        description="Rule akan dipakai scanner untuk menentukan rekomendasi."
        footer={
          <>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Batal</Button>
            <Button onClick={handleCreate} loading={saving}>Simpan Rule</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Kode rule" required htmlFor="rule-code">
            <Input
              id="rule-code"
              value={form.code}
              onChange={(e) => setForm((p) => ({ ...p, code: e.target.value }))}
              placeholder="RUL-XXX-001"
            />
          </Field>
          <Field label="Domain" htmlFor="rule-domain">
            <Select
              id="rule-domain"
              value={form.domainCode}
              onChange={(e) => setForm((p) => ({ ...p, domainCode: e.target.value }))}
            >
              {Object.entries(DOMAIN_CODE_LABELS).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </Select>
          </Field>
          <Field label="Judul" required htmlFor="rule-title">
            <Input
              id="rule-title"
              value={form.title}
              onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
              placeholder="Judul rule"
            />
          </Field>
          <Field label="Deskripsi" htmlFor="rule-desc">
            <Textarea
              id="rule-desc"
              rows={3}
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
            />
          </Field>
          <Field label="Prioritas" htmlFor="rule-priority" hint="Makin tinggi makin didahulukan">
            <Input
              id="rule-priority"
              type="number"
              value={form.priority}
              onChange={(e) => setForm((p) => ({ ...p, priority: e.target.value }))}
            />
          </Field>
        </div>
      </Modal>
    </div>
  );
}
