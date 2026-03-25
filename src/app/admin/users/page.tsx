"use client";

import { useState, useEffect, useCallback, Fragment } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Alert } from "@/components/ui/alert";
import { PageSpinner, Spinner } from "@/components/ui/spinner";
import { Download } from "lucide-react";
import { ROLE_BADGE, KYC_STATUS } from "@/lib/constants/status";
import { formatDate } from "@/lib/utils/date";
import { cn } from "@/lib/cn";

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  kycStatus: string;
  totpEnabled: boolean;
  emailVerified: string | null;
  createdAt: string;
  organization: { id: string; name: string } | null;
  _count: { documents: number; signatures: number; certificates: number; apiKeys: number };
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [kycFilter, setKycFilter] = useState("");
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [generatingCert, setGeneratingCert] = useState<string | null>(null);
  const [deletingUser, setDeletingUser] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [resetting2FA, setResetting2FA] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<string>("");

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchUsers = useCallback(async () => {
    const params = new URLSearchParams({ page: page.toString(), limit: "20" });
    if (search) params.set("search", search);
    if (roleFilter) params.set("role", roleFilter);
    if (kycFilter) params.set("kycStatus", kycFilter);

    const res = await fetch(`/api/admin/users?${params}`);
    const data = await res.json();
    if (data.success) {
      setUsers(data.data.users);
      setTotal(data.data.pagination.total);
    }
    setLoading(false);
  }, [page, search, roleFilter, kycFilter]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    fetch("/api/auth/session").then((r) => r.json()).then((data) => {
      if (data?.user?.role) setCurrentUserRole(data.user.role);
    }).catch(() => {});
  }, []);

  async function updateUser(userId: string, field: string, value: string) {
    const res = await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, [field]: value }),
    });
    const data = await res.json();
    if (data.success) {
      fetchUsers();
      setEditingUser(null);
    }
  }

  async function generateCertificate(userId: string) {
    setGeneratingCert(userId);
    try {
      const res = await fetch("/api/admin/users/generate-certificate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Certifikata u gjenerua me sukses per ${data.data.userName}`, "success");
        fetchUsers();
      } else {
        showToast(data.error || "Gabim gjate gjenerimit te certifikates", "error");
      }
    } catch {
      showToast("Gabim gjate gjenerimit te certifikates", "error");
    } finally {
      setGeneratingCert(null);
    }
  }

  async function verifyAndGenerateCertificate(userId: string) {
    setGeneratingCert(userId);
    try {
      const verifyRes = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, kycStatus: "VERIFIED" }),
      });
      const verifyData = await verifyRes.json();
      if (!verifyData.success) {
        showToast("Gabim gjate verifikimit te KYC", "error");
        setGeneratingCert(null);
        return;
      }

      const certRes = await fetch("/api/admin/users/generate-certificate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      const certData = await certRes.json();
      if (certData.success) {
        showToast(`KYC u verifikua dhe certifikata u gjenerua per ${certData.data.userName}`, "success");
        fetchUsers();
      } else {
        showToast(certData.error || "KYC u verifikua por certifikata deshtoi", "error");
        fetchUsers();
      }
    } catch {
      showToast("Gabim gjate procesit", "error");
    } finally {
      setGeneratingCert(null);
    }
  }

  async function reset2FA(userId: string) {
    setResetting2FA(userId);
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, action: "reset-2fa" }),
      });
      const data = await res.json();
      if (data.success) {
        showToast("2FA u rivendos me sukses", "success");
        fetchUsers();
      } else {
        showToast(data.error || "Gabim gjate rivendosjes se 2FA", "error");
      }
    } catch {
      showToast("Gabim gjate rivendosjes se 2FA", "error");
    } finally {
      setResetting2FA(null);
    }
  }

  async function deleteUser(userId: string) {
    setDeletingUser(userId);
    try {
      const res = await fetch(`/api/admin/users?userId=${userId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message, "success");
        fetchUsers();
      } else {
        showToast(data.error || "Gabim gjate fshirjes", "error");
      }
    } catch {
      showToast("Gabim gjate fshirjes se perdoruesit", "error");
    } finally {
      setDeletingUser(null);
      setConfirmDelete(null);
    }
  }

  if (loading) {
    return <PageSpinner />;
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6 lg:p-8">
      {/* Toast notification */}
      {toast && (
        <Alert
          variant={toast.type === "success" ? "success" : "destructive"}
          title={toast.message}
          className="fixed right-6 top-6 z-50 max-w-md shadow-lg"
        />
      )}

      <PageHeader
        title="Users Management"
        subtitle={`${total} total users`}
        actions={
          <Button
            variant="secondary"
            onClick={() => {
              const params = new URLSearchParams({ format: "csv", limit: "10000" });
              if (search) params.set("search", search);
              if (roleFilter) params.set("role", roleFilter);
              if (kycFilter) params.set("kycStatus", kycFilter);
              window.open(`/api/admin/users?${params}`, "_blank");
            }}
          >
            <Download className="mr-2 h-4 w-4" />
            Eksporto CSV
          </Button>
        }
      />

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Input
          type="text"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          placeholder="Search by name or email..."
          className="min-w-[200px] flex-1"
        />
        <select
          value={roleFilter}
          onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
          className="rounded-xl border border-border bg-muted px-3 py-2 text-sm text-foreground"
        >
          <option value="">All Roles</option>
          <option value="SUPER_ADMIN">Super Admin</option>
          <option value="ADMIN">Admin</option>
          <option value="USER">User</option>
          <option value="API_USER">API User</option>
        </select>
        <select
          value={kycFilter}
          onChange={(e) => { setKycFilter(e.target.value); setPage(1); }}
          className="rounded-xl border border-border bg-muted px-3 py-2 text-sm text-foreground"
        >
          <option value="">All KYC Status</option>
          <option value="VERIFIED">Verified</option>
          <option value="PENDING">Pending</option>
          <option value="REJECTED">Rejected</option>
        </select>
      </div>

      {/* Users Table */}
      <div className="rounded-2xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8" />
              <TableHead>User</TableHead>
              <TableHead>Organization</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>KYC</TableHead>
              <TableHead>Cert</TableHead>
              <TableHead>2FA</TableHead>
              <TableHead>Stats</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => {
              const roleCfg = ROLE_BADGE[user.role];
              const kycCfg = KYC_STATUS[user.kycStatus];
              return (
                <Fragment key={user.id}>
                  <TableRow
                    className={cn(
                      "cursor-pointer",
                      expandedUser === user.id ? "bg-muted/50" : "hover:bg-muted/50"
                    )}
                    onClick={() => setExpandedUser(expandedUser === user.id ? null : user.id)}
                  >
                    <TableCell className="text-center text-muted-foreground">
                      <span className={cn("inline-block transition-transform", expandedUser === user.id && "rotate-90")}>
                        &#9656;
                      </span>
                    </TableCell>
                    <TableCell>
                      <p className="font-medium text-foreground">{user.name}</p>
                      <p className="text-xs text-muted-foreground">{user.email}</p>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{user.organization?.name || "\u2014"}</TableCell>
                    <TableCell>
                      {editingUser === user.id ? (
                        <select
                          defaultValue={user.role}
                          onChange={(e) => updateUser(user.id, "role", e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          className="rounded border border-border bg-muted px-2 py-1 text-xs text-foreground"
                        >
                          <option value="USER">USER</option>
                          <option value="ADMIN">ADMIN</option>
                          <option value="SUPER_ADMIN">SUPER_ADMIN</option>
                          <option value="API_USER">API_USER</option>
                        </select>
                      ) : (
                        roleCfg && <Badge variant={roleCfg.variant}>{roleCfg.label}</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {editingUser === user.id ? (
                        <select
                          defaultValue={user.kycStatus}
                          onChange={(e) => updateUser(user.id, "kycStatus", e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          className="rounded border border-border bg-muted px-2 py-1 text-xs text-foreground"
                        >
                          <option value="PENDING">PENDING</option>
                          <option value="VERIFIED">VERIFIED</option>
                          <option value="REJECTED">REJECTED</option>
                        </select>
                      ) : (
                        kycCfg && <Badge variant={kycCfg.variant}>{kycCfg.label}</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {user._count.certificates > 0 ? (
                        <Badge variant="success">
                          Ka Certifikate
                          <span className="ml-1 rounded-full bg-green-800 px-1.5 text-[10px]">{user._count.certificates}</span>
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">0</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {user.totpEnabled ? (
                        <span className="text-green-400">Enabled</span>
                      ) : (
                        <span className="text-muted-foreground">Off</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-3 text-xs text-muted-foreground">
                        <span title="Documents">{user._count.documents} docs</span>
                        <span title="Signatures">{user._count.signatures} sigs</span>
                      </div>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                      {formatDate(user.createdAt)}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant={editingUser === user.id ? "secondary" : "ghost"}
                        size="sm"
                        onClick={(e) => { e.stopPropagation(); setEditingUser(editingUser === user.id ? null : user.id); }}
                      >
                        {editingUser === user.id ? "Done" : "Edit"}
                      </Button>
                    </TableCell>
                  </TableRow>

                  {/* Expanded row */}
                  {expandedUser === user.id && (
                    <tr className="border-b border-border">
                      <td colSpan={10} className="bg-background px-6 py-5">
                        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                          {/* User details */}
                          <div className="space-y-3">
                            <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground">User Details</h3>
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">ID</span>
                                <span className="font-mono text-xs text-foreground">{user.id.slice(0, 16)}...</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Email</span>
                                <span className="text-foreground">{user.email}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Name</span>
                                <span className="text-foreground">{user.name}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Email Verified</span>
                                <span className="text-foreground">{user.emailVerified ? "Yes" : "No"}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">2FA</span>
                                <span className={user.totpEnabled ? "text-green-400" : "text-muted-foreground"}>
                                  {user.totpEnabled ? "Enabled" : "Disabled"}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Stats */}
                          <div className="space-y-3">
                            <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground">Statistics</h3>
                            <div className="grid grid-cols-2 gap-3">
                              <div className="rounded-lg border border-border bg-muted p-3 text-center">
                                <p className="text-2xl font-bold text-foreground">{user._count.documents}</p>
                                <p className="text-xs text-muted-foreground">Documents</p>
                              </div>
                              <div className="rounded-lg border border-border bg-muted p-3 text-center">
                                <p className="text-2xl font-bold text-foreground">{user._count.signatures}</p>
                                <p className="text-xs text-muted-foreground">Signatures</p>
                              </div>
                              <div className="rounded-lg border border-border bg-muted p-3 text-center">
                                <p className="text-2xl font-bold text-foreground">{user._count.certificates}</p>
                                <p className="text-xs text-muted-foreground">Certificates</p>
                              </div>
                              <div className="rounded-lg border border-border bg-muted p-3 text-center">
                                <p className="text-2xl font-bold text-foreground">{user._count.apiKeys}</p>
                                <p className="text-xs text-muted-foreground">API Keys</p>
                              </div>
                            </div>
                            {user.organization && (
                              <div className="rounded-lg border border-border bg-muted p-3">
                                <p className="text-xs text-muted-foreground">Organization</p>
                                <p className="text-sm font-medium text-foreground">{user.organization.name}</p>
                                <p className="font-mono text-[10px] text-muted-foreground">{user.organization.id}</p>
                              </div>
                            )}
                          </div>

                          {/* Certificate Actions */}
                          <div className="space-y-3">
                            <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground">Certificate Actions</h3>

                            {user.kycStatus === "VERIFIED" && user._count.certificates === 0 && (
                              <Button
                                variant="primary"
                                onClick={(e) => { e.stopPropagation(); generateCertificate(user.id); }}
                                disabled={generatingCert === user.id}
                                className="w-full"
                              >
                                {generatingCert === user.id ? (
                                  <span className="flex items-center justify-center gap-2">
                                    <Spinner size="sm" />
                                    Duke gjeneruar...
                                  </span>
                                ) : (
                                  "Gjenero Certifikate"
                                )}
                              </Button>
                            )}

                            {user.kycStatus === "PENDING" && (
                              <Button
                                variant="primary"
                                onClick={(e) => { e.stopPropagation(); verifyAndGenerateCertificate(user.id); }}
                                disabled={generatingCert === user.id}
                                className="w-full"
                              >
                                {generatingCert === user.id ? (
                                  <span className="flex items-center justify-center gap-2">
                                    <Spinner size="sm" />
                                    Duke procesuar...
                                  </span>
                                ) : (
                                  "Verifiko KYC + Gjenero Certifikate"
                                )}
                              </Button>
                            )}

                            {user._count.certificates > 0 && (
                              <Alert
                                variant="success"
                                title={`${user._count.certificates} certifikate aktive`}
                                description="Perdoruesi ka certifikate te gjeneruara."
                              />
                            )}

                            {user.kycStatus === "REJECTED" && (
                              <Alert
                                variant="destructive"
                                title="KYC i refuzuar"
                                description="Ndryshoni statusin e KYC ne VERIFIED per te gjeneruar certifikate."
                              />
                            )}

                            {/* Reset 2FA - SUPER_ADMIN only */}
                            {currentUserRole === "SUPER_ADMIN" && user.totpEnabled && (
                              <Button
                                variant="secondary"
                                size="sm"
                                className="w-full"
                                onClick={(e) => { e.stopPropagation(); reset2FA(user.id); }}
                                disabled={resetting2FA === user.id}
                              >
                                {resetting2FA === user.id ? (
                                  <span className="flex items-center justify-center gap-2">
                                    <Spinner size="sm" />
                                    Duke rivendosur 2FA...
                                  </span>
                                ) : (
                                  "Rivendos 2FA"
                                )}
                              </Button>
                            )}

                            {/* Delete User - SUPER_ADMIN only */}
                            {currentUserRole === "SUPER_ADMIN" && (
                            <div className="mt-6 border-t border-border pt-4">
                              <h4 className="text-xs font-semibold uppercase tracking-wider text-red-400 mb-2">Zona e Rrezikshme</h4>
                              {confirmDelete === user.id ? (
                                <div className="space-y-2">
                                  <p className="text-sm text-muted-foreground">
                                    Jeni te sigurt qe doni te fshini <strong>{user.name}</strong> ({user.email})?
                                    Ky veprim nuk mund te kthehet mbrapsht.
                                  </p>
                                  <div className="flex gap-2">
                                    <Button
                                      variant="destructive"
                                      size="sm"
                                      className="flex-1"
                                      onClick={(e) => { e.stopPropagation(); deleteUser(user.id); }}
                                      disabled={deletingUser === user.id}
                                    >
                                      {deletingUser === user.id ? (
                                        <span className="flex items-center justify-center gap-2">
                                          <Spinner size="sm" />
                                          Duke fshire...
                                        </span>
                                      ) : (
                                        "Po, Fshije"
                                      )}
                                    </Button>
                                    <Button
                                      variant="secondary"
                                      size="sm"
                                      className="flex-1"
                                      onClick={(e) => { e.stopPropagation(); setConfirmDelete(null); }}
                                    >
                                      Anulo
                                    </Button>
                                  </div>
                                </div>
                              ) : (
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  className="w-full"
                                  onClick={(e) => { e.stopPropagation(); setConfirmDelete(user.id); }}
                                >
                                  Fshi Perdoruesin
                                </Button>
                              )}
                            </div>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {total > 20 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {page} of {Math.ceil(total / 20)}
          </p>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
            >
              Previous
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setPage(page + 1)}
              disabled={page >= Math.ceil(total / 20)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
