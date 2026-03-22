"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Trash2, UserPlus, Search } from "lucide-react";

export interface PartyData {
  partyNumber: number;
  role: string;
  fullName: string;
  idNumber: string;
  address: string;
  phone: string;
  email: string;
  userId?: string;
}

interface StepPartiesProps {
  parties: PartyData[];
  onChange: (parties: PartyData[]) => void;
  currentUser: {
    id: string;
    name: string;
    email: string;
    phone?: string;
    organizationId?: string | null;
  } | null;
}

export function StepParties({ parties, onChange, currentUser }: StepPartiesProps) {
  const [searchEmail, setSearchEmail] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchResult, setSearchResult] = useState<{
    name: string;
    email: string;
    phone: string;
    id: string;
  } | null>(null);
  const [searchForParty, setSearchForParty] = useState<number | null>(null);

  function addParty() {
    const newParty: PartyData = {
      partyNumber: parties.length + 1,
      role: "",
      fullName: "",
      idNumber: "",
      address: "",
      phone: "",
      email: "",
    };
    onChange([...parties, newParty]);
  }

  function removeParty(index: number) {
    const updated = parties
      .filter((_, i) => i !== index)
      .map((p, i) => ({ ...p, partyNumber: i + 1 }));
    onChange(updated);
  }

  function updateParty(index: number, field: keyof PartyData, value: string) {
    const updated = [...parties];
    updated[index] = { ...updated[index], [field]: value };
    onChange(updated);
  }

  function autoFillCurrentUser(index: number) {
    if (!currentUser) return;
    const updated = [...parties];
    updated[index] = {
      ...updated[index],
      fullName: currentUser.name,
      email: currentUser.email,
      phone: currentUser.phone || "",
      userId: currentUser.id,
    };
    onChange(updated);
  }

  async function searchUser(partyIndex: number) {
    if (!searchEmail.trim()) return;
    setSearching(true);
    setSearchForParty(partyIndex);
    try {
      const res = await fetch(`/api/contracts/builder/search-user?email=${encodeURIComponent(searchEmail)}`);
      const json = await res.json();
      if (json.success && json.data) {
        setSearchResult(json.data);
      } else {
        setSearchResult(null);
        alert("Nuk u gjet asnje perdorues me kete email");
      }
    } finally {
      setSearching(false);
    }
  }

  function applySearchResult(partyIndex: number) {
    if (!searchResult) return;
    const updated = [...parties];
    updated[partyIndex] = {
      ...updated[partyIndex],
      fullName: searchResult.name,
      email: searchResult.email,
      phone: searchResult.phone || "",
      userId: searchResult.id,
    };
    onChange(updated);
    setSearchResult(null);
    setSearchEmail("");
    setSearchForParty(null);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h3 className="text-lg font-semibold">Palet Kontraktuese</h3>
          <p className="text-sm text-muted-foreground">
            Shtoni te pakten 1 pale per kontraten (mund te nenshkruani edhe vetem)
          </p>
        </div>
        <Button onClick={addParty} variant="secondary" size="sm" className="min-h-[48px] sm:min-h-[36px] w-full sm:w-auto flex-shrink-0">
          <Plus className="mr-1.5 h-4 w-4" />
          Shto Pale
        </Button>
      </div>

      {parties.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <UserPlus className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">
              Shtoni palen e pare per te filluar
            </p>
            <Button onClick={addParty} className="mt-4" size="sm">
              <Plus className="mr-1.5 h-4 w-4" />
              Shto Palen e Pare
            </Button>
          </CardContent>
        </Card>
      )}

      {parties.map((party, index) => (
        <Card key={index}>
          <CardContent className="p-4 sm:p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
              <div className="flex items-center gap-3 min-w-0">
                <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white dark:bg-slate-100 dark:text-slate-900">
                  {party.partyNumber}
                </span>
                <div className="min-w-0">
                  <span className="text-sm font-medium">Pala {party.partyNumber}</span>
                  {party.fullName && (
                    <span className="text-xs text-muted-foreground ml-2 truncate">— {party.fullName}</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {currentUser && !party.userId && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => autoFillCurrentUser(index)}
                    className="text-xs min-h-[48px] sm:min-h-[36px]"
                  >
                    <UserPlus className="mr-1 h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Ploteso nga llogaria</span>
                    <span className="sm:hidden">Ploteso</span>
                  </Button>
                )}
                <button
                  onClick={() => removeParty(index)}
                  className="p-2.5 sm:p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950 transition-colors min-h-[48px] sm:min-h-0 flex items-center justify-center"
                >
                  <Trash2 className="h-4 w-4 text-red-500" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                  Roli
                </label>
                <Input
                  value={party.role}
                  onChange={(e) => updateParty(index, "role", e.target.value)}
                  placeholder="p.sh. Punedhenesi, Punemarresi, Qiradhenes..."
                  className="mt-1 min-h-[48px] sm:min-h-[40px]"
                />
              </div>
              <div>
                <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                  Emri i plote
                </label>
                <Input
                  value={party.fullName}
                  onChange={(e) => updateParty(index, "fullName", e.target.value)}
                  placeholder="Emri dhe mbiemri"
                  className="mt-1 min-h-[48px] sm:min-h-[40px]"
                />
              </div>
              <div>
                <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                  Nr. Identifikimi (ID / NIPT)
                </label>
                <Input
                  value={party.idNumber}
                  onChange={(e) => updateParty(index, "idNumber", e.target.value)}
                  placeholder="Nr. personal ose NIPT"
                  className="mt-1 min-h-[48px] sm:min-h-[40px]"
                />
              </div>
              <div>
                <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                  Adresa
                </label>
                <Input
                  value={party.address}
                  onChange={(e) => updateParty(index, "address", e.target.value)}
                  placeholder="Adresa e plote"
                  className="mt-1 min-h-[48px] sm:min-h-[40px]"
                />
              </div>
              <div>
                <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                  Telefon
                </label>
                <Input
                  value={party.phone}
                  onChange={(e) => updateParty(index, "phone", e.target.value)}
                  placeholder="+355 6X XXX XXXX"
                  className="mt-1 min-h-[48px] sm:min-h-[40px]"
                />
              </div>
              <div>
                <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                  Email
                </label>
                <Input
                  value={party.email}
                  onChange={(e) => updateParty(index, "email", e.target.value)}
                  placeholder="email@example.com"
                  type="email"
                  className="mt-1 min-h-[48px] sm:min-h-[40px]"
                />
              </div>
            </div>

            {/* User search */}
            {!party.userId && (
              <div className="mt-4 pt-3 border-t">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Kerko perdorues me email..."
                      value={searchForParty === index ? searchEmail : ""}
                      onChange={(e) => {
                        setSearchEmail(e.target.value);
                        setSearchForParty(index);
                      }}
                      className="pl-9 min-h-[48px] sm:min-h-[36px] text-xs"
                    />
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => searchUser(index)}
                    disabled={searching}
                    className="min-h-[48px] sm:min-h-[36px] text-xs w-full sm:w-auto"
                  >
                    {searching && searchForParty === index ? "Duke kerkuar..." : "Kerko"}
                  </Button>
                </div>
                {searchResult && searchForParty === index && (
                  <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between rounded-lg bg-slate-50 dark:bg-slate-800 p-3">
                    <div className="text-xs min-w-0">
                      <span className="font-medium">{searchResult.name}</span>
                      <span className="text-muted-foreground ml-2">{searchResult.email}</span>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => applySearchResult(index)}
                      className="min-h-[48px] sm:min-h-[32px] text-xs w-full sm:w-auto flex-shrink-0"
                    >
                      Perdor
                    </Button>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
