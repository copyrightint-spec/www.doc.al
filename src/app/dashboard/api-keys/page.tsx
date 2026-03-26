"use client";

import { useState, useEffect } from "react";
import { Key, Plus, AlertTriangle, Copy, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Spinner } from "@/components/ui/spinner";
import { formatDate } from "@/lib/utils/date";

interface ApiKey {
  id: string;
  name: string;
  active: boolean;
  rateLimit: number;
  lastUsedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
}

export default function ApiKeysPage() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => { fetchKeys(); }, []);

  async function fetchKeys() {
    const res = await fetch("/api/settings/api-keys");
    const data = await res.json();
    if (data.success) setKeys(data.data);
    setLoading(false);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name) return;
    setCreating(true);
    setError("");
    try {
      const res = await fetch("/api/settings/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setNewKey(data.data.key);
      setName("");
      fetchKeys();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gabim");
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(id: string) {
    setDeleting(true);
    try {
      const res = await fetch("/api/settings/api-keys", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setConfirmDeleteId(null);
      fetchKeys();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gabim");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">
      <PageHeader
        title="API Keys"
        subtitle={`${keys.length} key(s) aktive`}
        actions={
          <Button onClick={() => { setShowCreate(!showCreate); setNewKey(null); }}>
            <Plus className="h-4 w-4" />
            Krijo API Key
          </Button>
        }
      />

      {/* New key display */}
      {newKey && (
        <Alert
          variant="success"
          icon={<AlertTriangle className="h-5 w-5" />}
          title="Ruajeni kete key! Nuk do te shfaqet perseri."
        />
      )}
      {newKey && (
        <Card className="p-5">
          <div className="flex items-center gap-2 rounded-lg bg-muted px-4 py-3">
            <code className="flex-1 break-all font-mono text-sm text-foreground">{newKey}</code>
            <Button variant="ghost" size="sm" onClick={() => navigator.clipboard.writeText(newKey)}>
              <Copy className="h-4 w-4" />
              Kopjo
            </Button>
          </div>
        </Card>
      )}

      {/* Create form */}
      {showCreate && !newKey && (
        <Card>
          <CardHeader>
            <CardTitle>Krijo API Key te Re</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="flex gap-3">
              <Input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Emri i key (p.sh. Production, Test)"
                className="flex-1"
                required
              />
              <Button type="submit" disabled={creating}>
                {creating ? "..." : "Krijo"}
              </Button>
            </form>
            {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
          </CardContent>
        </Card>
      )}

      {/* API Docs */}
      <Card>
        <CardHeader>
          <CardTitle>Si ta perdorni</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="rounded-lg bg-muted p-3">
            <p className="mb-1 text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">Header</p>
            <code className="font-mono text-xs text-foreground">X-API-Key: docal_live_xxxxx</code>
          </div>
          <div className="grid gap-2 md:grid-cols-2">
            {[
              { label: "Krijo Timestamp", endpoint: "POST /api/v1/timestamp" },
              { label: "Verifiko Timestamp", endpoint: "POST /api/v1/timestamp/verify" },
              { label: "Ngarko Dokument", endpoint: "POST /api/v1/documents" },
              { label: "Status Dokumenti", endpoint: "GET /api/v1/documents/:id/status" },
            ].map((api) => (
              <div key={api.label} className="rounded-lg bg-muted p-3">
                <p className="mb-1 text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">{api.label}</p>
                <code className="font-mono text-[11px] text-muted-foreground">{api.endpoint}</code>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Keys table */}
      {loading ? (
        <div className="flex h-40 items-center justify-center"><Spinner /></div>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Emri</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Rate Limit</TableHead>
                <TableHead>Perdorur</TableHead>
                <TableHead>Krijuar</TableHead>
                <TableHead>Skadon</TableHead>
                <TableHead>Veprime</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {keys.map((key) => (
                <TableRow key={key.id}>
                  <TableCell className="font-medium text-foreground">{key.name}</TableCell>
                  <TableCell>
                    <Badge variant={key.active ? "success" : "destructive"}>
                      {key.active ? "Aktiv" : "Joaktiv"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{key.rateLimit} req/ore</TableCell>
                  <TableCell className="text-muted-foreground">
                    {key.lastUsedAt ? formatDate(key.lastUsedAt) : "Asnjehere"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(key.createdAt)}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {key.expiresAt ? formatDate(key.expiresAt) : "Pa afat"}
                  </TableCell>
                  <TableCell>
                    {confirmDeleteId === key.id ? (
                      <div className="flex items-center gap-1">
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDelete(key.id)}
                          disabled={deleting}
                        >
                          {deleting ? "..." : "Konfirmo"}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setConfirmDeleteId(null)}
                        >
                          Anulo
                        </Button>
                      </div>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setConfirmDeleteId(key.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                        Revoko
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {keys.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="py-12 text-center text-muted-foreground">
                    Nuk keni API keys akoma
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
