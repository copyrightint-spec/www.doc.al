"use client";

import { useState, useEffect, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { PageSpinner } from "@/components/ui/spinner";
import { EmptyState } from "@/components/ui/empty-state";
import { Scale, ChevronDown, ChevronUp, Check, Search } from "lucide-react";

interface LegalBasis {
  id: string;
  title: string;
  lawReference: string;
  description: string;
  suggestedTerms: string;
  category: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  employment: "Pune",
  general: "Civile",
  rental: "Qira",
  commercial: "Tregtare",
  data_protection: "Te Dhena",
  digital: "Dixhitale",
};

interface StepLegalBasisProps {
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  onLegalBasesLoaded?: (bases: LegalBasis[]) => void;
}

export function StepLegalBasis({ selectedIds, onChange, onLegalBasesLoaded }: StepLegalBasisProps) {
  const [legalBases, setLegalBases] = useState<LegalBasis[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function fetchBases() {
      try {
        const res = await fetch("/api/legal-bases");
        if (!res.ok) {
          console.warn("[legal-bases] API returned", res.status);
          return;
        }
        const json = await res.json();
        if (json.success) {
          setLegalBases(json.data);
          onLegalBasesLoaded?.(json.data);
        }
      } catch (e) {
        console.warn("[legal-bases] fetch error:", e);
      } finally {
        setLoading(false);
      }
    }
    fetchBases();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function toggleSelection(id: string) {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((x) => x !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  }

  // Filter by search
  const filtered = useMemo(() => {
    if (!search.trim()) return legalBases;
    const q = search.toLowerCase();
    return legalBases.filter(
      (lb) =>
        lb.title.toLowerCase().includes(q) ||
        lb.lawReference.toLowerCase().includes(q) ||
        lb.description.toLowerCase().includes(q) ||
        lb.category.toLowerCase().includes(q) ||
        lb.suggestedTerms.toLowerCase().includes(q),
    );
  }, [legalBases, search]);

  // Group by category
  const grouped = filtered.reduce(
    (acc, lb) => {
      const cat = lb.category || "general";
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(lb);
      return acc;
    },
    {} as Record<string, LegalBasis[]>,
  );

  if (loading) return <PageSpinner />;

  if (legalBases.length === 0) {
    return (
      <EmptyState
        icon={Scale}
        title="Asnje baze ligjore"
        description="Administratori nuk ka shtuar baza ligjore ende"
      />
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">Baza Ligjore</h3>
        <p className="text-sm text-muted-foreground">
          Zgjidhni bazat ligjore qe mbulohen nga kontrata ({selectedIds.length} te zgjedhura)
        </p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Kerko ligje, terma, fjale kyçe..."
          className="pl-9 min-h-[48px] sm:min-h-[40px]"
        />
      </div>

      {filtered.length === 0 && search.trim() && (
        <p className="text-sm text-muted-foreground text-center py-4">
          Asnje rezultat per &ldquo;{search}&rdquo;
        </p>
      )}

      {Object.entries(grouped).map(([category, bases]) => (
        <div key={category}>
          <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
            {CATEGORY_LABELS[category] || category}
          </h4>
          <div className="space-y-2">
            {bases.map((lb) => {
              const isSelected = selectedIds.includes(lb.id);
              return (
                <Card
                  key={lb.id}
                  className={`cursor-pointer transition-all ${
                    isSelected
                      ? "ring-2 ring-blue-500 border-blue-200 dark:border-blue-800"
                      : "hover:border-slate-300 dark:hover:border-slate-600"
                  }`}
                  onClick={() => toggleSelection(lb.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div
                        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition-colors ${
                          isSelected
                            ? "border-blue-500 bg-blue-500 text-white"
                            : "border-slate-300 dark:border-slate-600"
                        }`}
                      >
                        {isSelected && <Check className="h-3 w-3" />}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h5 className="text-sm font-semibold">{lb.title}</h5>
                          <Badge variant="default" className="text-[10px]">
                            {CATEGORY_LABELS[lb.category] || lb.category}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{lb.lawReference}</p>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{lb.description}</p>
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setExpandedId(expandedId === lb.id ? null : lb.id);
                        }}
                        className="p-2 sm:p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 shrink-0 min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 flex items-center justify-center"
                      >
                        {expandedId === lb.id ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </button>
                    </div>

                    {expandedId === lb.id && (
                      <div className="mt-3 pt-3 border-t" onClick={(e) => e.stopPropagation()}>
                        <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-2">
                          Termat e sugjeruara (do te shtohen ne hapin e ardhshem)
                        </p>
                        <div
                          className="prose prose-sm max-w-none dark:prose-invert text-xs max-h-60 overflow-y-auto"
                          dangerouslySetInnerHTML={{ __html: lb.suggestedTerms.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "").replace(/\s*on\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]*)/gi, "") }}
                        />
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
