"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  User,
  Mail,
  Phone,
  Building2,
  Shield,
  ShieldCheck,
  Lock,
  Calendar,
  Bell,
  Award,
  Check,
  Pencil,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { PageSpinner, Spinner } from "@/components/ui/spinner";
import { Alert } from "@/components/ui/alert";
import { KYC_STATUS, ROLE_BADGE } from "@/lib/constants/status";

interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  image: string | null;
  role: string;
  kycStatus: string;
  totpEnabled: boolean;
  emailVerified: string | null;
  organizationName: string | null;
  preferredNotificationChannel: string;
  createdAt: string;
  hasCertificate: boolean;
  hasPassword: boolean;
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingName, setEditingName] = useState(false);
  const [editingPhone, setEditingPhone] = useState(false);
  const [editingChannel, setEditingChannel] = useState(false);
  const [nameValue, setNameValue] = useState("");
  const [phoneValue, setPhoneValue] = useState("");
  const [channelValue, setChannelValue] = useState("EMAIL");
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");

  const loadProfile = useCallback(async () => {
    try {
      // Fetch session data
      const sessionRes = await fetch("/api/auth/session");
      const sessionData = await sessionRes.json();

      // Fetch KYC data for extra info
      const kycRes = await fetch("/api/settings/kyc");
      const kycData = await kycRes.json();

      // Fetch profile details
      const profileRes = await fetch("/api/settings/profile");
      const profileData = await profileRes.json();

      if (sessionData?.user) {
        const merged: UserProfile = {
          id: sessionData.user.id,
          name: sessionData.user.name || "",
          email: sessionData.user.email || "",
          phone: profileData?.phone || kycData?.phone || null,
          image: sessionData.user.image || null,
          role: sessionData.user.role || "USER",
          kycStatus: sessionData.user.kycStatus || kycData?.kycStatus || "PENDING",
          totpEnabled: sessionData.user.totpEnabled || false,
          emailVerified: profileData?.emailVerified || null,
          organizationName: profileData?.organizationName || null,
          preferredNotificationChannel: profileData?.preferredNotificationChannel || "EMAIL",
          createdAt: profileData?.createdAt || new Date().toISOString(),
          hasCertificate: profileData?.hasCertificate || false,
          hasPassword: profileData?.hasPassword || false,
        };
        setProfile(merged);
        setNameValue(merged.name);
        setPhoneValue(merged.phone || "");
        setChannelValue(merged.preferredNotificationChannel);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  async function saveField(field: string, value: string) {
    setSaving(true);
    setSaveMessage("");
    try {
      const res = await fetch("/api/settings/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: value }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSaveMessage("U ruajt me sukses");
      setEditingName(false);
      setEditingPhone(false);
      setEditingChannel(false);
      // Refresh profile
      loadProfile();
      setTimeout(() => setSaveMessage(""), 3000);
    } catch (err) {
      setSaveMessage(err instanceof Error ? err.message : "Gabim");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <PageSpinner />;
  }

  if (!profile) {
    return (
      <div className="mx-auto max-w-2xl p-8">
        <p className="text-muted-foreground">Nuk u gjet profili. Ju lutem identifikohuni.</p>
      </div>
    );
  }

  const initials = profile.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const channelLabels: Record<string, string> = {
    EMAIL: "Email",
    SMS: "SMS",
    SMS_VOICE: "Thirrje zanore (SMS Voice)",
  };

  const roleLabels: Record<string, string> = {
    USER: "Perdorues",
    ADMIN: "Administrator",
    SUPER_ADMIN: "Super Administrator",
    API_USER: "API Perdorues",
  };

  const kycConfig = KYC_STATUS[profile.kycStatus] || KYC_STATUS.PENDING;
  const roleConfig = ROLE_BADGE[profile.role];

  return (
    <div className="mx-auto max-w-2xl p-4 sm:p-6 lg:p-8">
      <PageHeader
        title="Profili im"
        subtitle="Menaxhoni te dhenat tuaja personale dhe preferencat e llogarise."
      />

      {saveMessage && (
        <div className="mt-4">
          <Alert
            variant={saveMessage.includes("sukses") ? "success" : "destructive"}
            icon={saveMessage.includes("sukses") ? <Check className="h-4 w-4" /> : undefined}
            title={saveMessage}
          />
        </div>
      )}

      {/* Avatar section */}
      <div className="mt-8 flex flex-col items-center">
        {profile.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={profile.image}
            alt={profile.name}
            className="h-24 w-24 rounded-full ring-4 ring-border"
          />
        ) : (
          <div className="flex h-24 w-24 items-center justify-center rounded-full bg-primary/10 text-2xl font-bold text-primary ring-4 ring-border">
            {initials}
          </div>
        )}
        <h2 className="mt-3 text-lg font-semibold text-foreground">
          {profile.name}
        </h2>
        <p className="text-sm text-muted-foreground">{profile.email}</p>
        <div className="mt-2">
          <Badge variant={roleConfig?.variant || "default"}>
            {roleLabels[profile.role] || profile.role}
          </Badge>
        </div>
      </div>

      {/* Profile Section */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground">
            Informacioni i Profilit
          </CardTitle>
        </CardHeader>
        <CardContent className="divide-y divide-border p-0">
          {/* Name */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between px-4 sm:px-6 py-4 gap-2">
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">Emri</p>
              {editingName ? (
                <div className="mt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <Input
                    type="text"
                    value={nameValue}
                    onChange={(e) => setNameValue(e.target.value)}
                    className="w-full sm:max-w-xs"
                  />
                  <div className="flex gap-2">
                    <Button
                      onClick={() => saveField("name", nameValue)}
                      disabled={saving}
                      size="sm"
                      className="flex-1 sm:flex-none min-h-[44px]"
                    >
                      {saving ? <Spinner size="sm" /> : "Ruaj"}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => { setEditingName(false); setNameValue(profile.name); }}
                      className="flex-1 sm:flex-none min-h-[44px]"
                    >
                      Anulo
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-sm font-medium text-foreground">{profile.name}</p>
              )}
            </div>
            {!editingName && (
              <Button variant="link" size="sm" onClick={() => setEditingName(true)} className="self-start sm:self-center min-h-[44px]">
                <Pencil className="mr-1 h-3 w-3" />
                Ndrysho
              </Button>
            )}
          </div>

          {/* Email */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between px-4 sm:px-6 py-4">
            <div>
              <p className="text-sm text-muted-foreground">Email</p>
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm font-medium text-foreground break-all">{profile.email}</p>
                {profile.emailVerified && (
                  <Badge variant="success">
                    <Check className="mr-1 h-3 w-3" />
                    Verifikuar
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* Phone */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between px-4 sm:px-6 py-4 gap-2">
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">Telefoni</p>
              {editingPhone ? (
                <div className="mt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <Input
                    type="tel"
                    value={phoneValue}
                    onChange={(e) => setPhoneValue(e.target.value)}
                    placeholder="+355 6X XXX XXXX"
                    className="w-full sm:max-w-xs"
                  />
                  <div className="flex gap-2">
                    <Button
                      onClick={() => saveField("phone", phoneValue)}
                      disabled={saving}
                      size="sm"
                      className="flex-1 sm:flex-none min-h-[44px]"
                    >
                      {saving ? <Spinner size="sm" /> : "Ruaj"}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => { setEditingPhone(false); setPhoneValue(profile.phone || ""); }}
                      className="flex-1 sm:flex-none min-h-[44px]"
                    >
                      Anulo
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-sm font-medium text-foreground">
                  {profile.phone || "Nuk eshte vendosur"}
                </p>
              )}
            </div>
            {!editingPhone && (
              <Button variant="link" size="sm" onClick={() => setEditingPhone(true)} className="self-start sm:self-center min-h-[44px]">
                <Pencil className="mr-1 h-3 w-3" />
                Ndrysho
              </Button>
            )}
          </div>

          {/* Organization */}
          <div className="px-4 sm:px-6 py-4">
            <p className="text-sm text-muted-foreground">Organizata</p>
            <p className="text-sm font-medium text-foreground">
              {profile.organizationName || "Individ"}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Security Section */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground">
            Siguria
          </CardTitle>
        </CardHeader>
        <CardContent className="divide-y divide-border p-0">
          {/* KYC Status */}
          <div className="flex items-center justify-between px-4 sm:px-6 py-4">
            <div>
              <p className="text-sm text-muted-foreground">Verifikimi i Identitetit (KYC)</p>
              <div className="mt-1">
                <Badge variant={kycConfig.variant}>{kycConfig.label}</Badge>
              </div>
            </div>
            <Button variant="link" size="sm" asChild>
              <Link href="/settings/kyc">
                {profile.kycStatus === "VERIFIED" ? "Shiko" : "Verifiko"}
              </Link>
            </Button>
          </div>

          {/* 2FA */}
          <div className="flex items-center justify-between px-4 sm:px-6 py-4">
            <div>
              <p className="text-sm text-muted-foreground">Autentifikimi me dy faktor (2FA)</p>
              <div className="mt-1">
                <Badge variant={profile.totpEnabled ? "success" : "default"}>
                  {profile.totpEnabled ? "Aktivizuar" : "Jo aktiv"}
                </Badge>
              </div>
            </div>
            <Button variant="link" size="sm" asChild>
              <Link href="/settings/security">
                {profile.totpEnabled ? "Menaxho" : "Aktivizo"}
              </Link>
            </Button>
          </div>

          {/* Certificate */}
          <div className="px-4 sm:px-6 py-4">
            <div>
              <p className="text-sm text-muted-foreground">Certifikata Dixhitale</p>
              <div className="mt-1">
                <Badge variant={profile.hasCertificate ? "success" : "default"}>
                  {profile.hasCertificate ? "Aktive" : "Nuk ka certifikate"}
                </Badge>
              </div>
              {!profile.hasCertificate && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Admini do t&apos;ju gjeneroje certifikaten pasi te verifikoheni me sukses.
                </p>
              )}
            </div>
          </div>

          {/* Change password - only for credentials users */}
          {profile.hasPassword && (
            <div className="flex items-center justify-between px-4 sm:px-6 py-4">
              <div>
                <p className="text-sm text-muted-foreground">Fjalekalimi</p>
                <p className="text-sm text-muted-foreground">********</p>
              </div>
              <Button variant="link" size="sm" asChild>
                <Link href="/settings/security">
                  Ndrysho
                </Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Account Section */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground">
            Llogaria
          </CardTitle>
        </CardHeader>
        <CardContent className="divide-y divide-border p-0">
          {/* Account created */}
          <div className="px-4 sm:px-6 py-4">
            <p className="text-sm text-muted-foreground">Llogaria u krijua me</p>
            <p className="text-sm font-medium text-foreground">
              {new Date(profile.createdAt).toLocaleDateString("sq-AL", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>

          {/* Role */}
          <div className="px-4 sm:px-6 py-4">
            <p className="text-sm text-muted-foreground">Roli</p>
            <div className="mt-1">
              <Badge variant={roleConfig?.variant || "default"}>
                {roleLabels[profile.role] || profile.role}
              </Badge>
            </div>
          </div>

          {/* Notification channel */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between px-4 sm:px-6 py-4 gap-2">
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">Kanali i njoftimeve</p>
              {editingChannel ? (
                <div className="mt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <select
                    value={channelValue}
                    onChange={(e) => setChannelValue(e.target.value)}
                    className="rounded-xl border border-border bg-muted px-4 py-3 sm:py-2.5 text-base sm:text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring min-h-[48px] sm:min-h-0 w-full sm:w-auto"
                  >
                    <option value="EMAIL">Email</option>
                    <option value="SMS">SMS</option>
                    <option value="SMS_VOICE">Thirrje zanore (SMS Voice)</option>
                  </select>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => saveField("preferredNotificationChannel", channelValue)}
                      disabled={saving}
                      size="sm"
                      className="flex-1 sm:flex-none min-h-[44px]"
                    >
                      {saving ? <Spinner size="sm" /> : "Ruaj"}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => { setEditingChannel(false); setChannelValue(profile.preferredNotificationChannel); }}
                      className="flex-1 sm:flex-none min-h-[44px]"
                    >
                      Anulo
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-sm font-medium text-foreground">
                  {channelLabels[profile.preferredNotificationChannel] || profile.preferredNotificationChannel}
                </p>
              )}
            </div>
            {!editingChannel && (
              <Button variant="link" size="sm" onClick={() => setEditingChannel(true)} className="self-start sm:self-center min-h-[44px]">
                <Pencil className="mr-1 h-3 w-3" />
                Ndrysho
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
