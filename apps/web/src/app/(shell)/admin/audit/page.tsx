"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import {
  Search,
  Download,
  ShieldCheck,
  ChevronDown,
  ChevronRight,
  Shield,
  Loader2,
} from "lucide-react";
import { apiGet } from "@/lib/api";

interface AuditEntry {
  id: string;
  timestamp: string;
  action: string;
  actor: string;
  resource: string;
  details: string;
  metadata: Record<string, unknown>;
}

const actionTypes = [
  { value: "all", label: "Toutes les actions" },
  { value: "auth.login", label: "Connexion" },
  { value: "auth.logout", label: "Deconnexion" },
  { value: "user.create", label: "Creation utilisateur" },
  { value: "user.update", label: "Modification utilisateur" },
  { value: "user.delete", label: "Suppression utilisateur" },
  { value: "tenant.create", label: "Creation organisation" },
  { value: "tenant.update", label: "Modification organisation" },
  { value: "privacy.request", label: "Demande Loi 25" },
  { value: "privacy.export", label: "Export donnees" },
];

export default function AuditPage() {
  const { data: session } = useSession();
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [verifyResult, setVerifyResult] = useState<"idle" | "valid" | "invalid" | "loading">("idle");

  const token = (session as Record<string, unknown> | null)?.accessToken as string | undefined;

  const fetchLogs = useCallback(async () => {
    if (!token) return;
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (dateFrom) params.set("from", new Date(dateFrom).toISOString());
      if (dateTo) params.set("to", new Date(dateTo).toISOString());
      if (actionFilter !== "all") params.set("action", actionFilter);
      params.set("limit", "100");

      const data = await apiGet<Array<{
        id: string; createdAt: string; action: string;
        actorId: string; resourceType: string; resourceId: string;
        metadata: Record<string, unknown>;
      }>>(`/v1/audit/logs?${params.toString()}`, token);

      setEntries(data.map((e) => ({
        id: e.id,
        timestamp: e.createdAt,
        action: e.action,
        actor: e.actorId,
        resource: `${e.resourceType}/${e.resourceId}`,
        details: e.action,
        metadata: e.metadata ?? {},
      })));
    } catch {
      // Non-blocking
    } finally {
      setLoading(false);
    }
  }, [token, dateFrom, dateTo, actionFilter]);

  useEffect(() => { void fetchLogs(); }, [fetchLogs]);

  const handleVerify = async () => {
    if (!token) return;
    setVerifyResult("loading");
    try {
      const result = await apiGet<{ valid: boolean }>("/v1/audit/verify", token);
      setVerifyResult(result.valid ? "valid" : "invalid");
    } catch {
      setVerifyResult("invalid");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">
            Journal d&apos;audit
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Historique immutable des actions dans le systeme.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleVerify}
            className="inline-flex items-center gap-2 rounded-md border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <ShieldCheck className="h-4 w-4" />
            Verifier l&apos;integrite
          </button>
          {verifyResult !== "idle" && (
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                verifyResult === "valid"
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-red-50 text-red-700"
              }`}
            >
              {verifyResult === "valid" ? "Integrite OK" : "Erreur d'integrite"}
            </span>
          )}
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-md border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <Download className="h-4 w-4" />
            Exporter
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:flex-wrap">
        <div>
          <label
            htmlFor="audit-date-from"
            className="block text-xs font-medium text-gray-600 mb-1"
          >
            Date debut
          </label>
          <input
            id="audit-date-from"
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="rounded-md border border-gray-200 bg-white px-3 py-2 text-sm focus:border-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-400"
          />
        </div>
        <div>
          <label
            htmlFor="audit-date-to"
            className="block text-xs font-medium text-gray-600 mb-1"
          >
            Date fin
          </label>
          <input
            id="audit-date-to"
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="rounded-md border border-gray-200 bg-white px-3 py-2 text-sm focus:border-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-400"
          />
        </div>
        <div>
          <label htmlFor="audit-action-filter" className="sr-only">
            Type d&apos;action
          </label>
          <select
            id="audit-action-filter"
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="rounded-md border border-gray-200 bg-white px-3 py-2 text-sm focus:border-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-400"
          >
            {actionTypes.map((a) => (
              <option key={a.value} value={a.value}>
                {a.label}
              </option>
            ))}
          </select>
        </div>
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <label htmlFor="search-audit" className="sr-only">
            Rechercher dans les logs
          </label>
          <input
            id="search-audit"
            type="search"
            placeholder="Rechercher..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-md border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm placeholder:text-gray-400 focus:border-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-400"
          />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th scope="col" className="w-8 px-2 py-3" />
              <th
                scope="col"
                className="px-4 py-3 text-left font-medium text-gray-600"
              >
                Horodatage
              </th>
              <th
                scope="col"
                className="px-4 py-3 text-left font-medium text-gray-600"
              >
                Action
              </th>
              <th
                scope="col"
                className="px-4 py-3 text-left font-medium text-gray-600"
              >
                Acteur
              </th>
              <th
                scope="col"
                className="px-4 py-3 text-left font-medium text-gray-600"
              >
                Ressource
              </th>
              <th
                scope="col"
                className="px-4 py-3 text-left font-medium text-gray-600"
              >
                Details
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center">
                  <Loader2 className="mx-auto h-6 w-6 animate-spin text-gray-400" />
                  <p className="mt-2 text-sm text-gray-500">Chargement...</p>
                </td>
              </tr>
            ) : entries.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center">
                  <Shield className="mx-auto h-10 w-10 text-gray-300" />
                  <p className="mt-2 text-sm font-medium text-gray-900">
                    Aucun événement d&apos;audit
                  </p>
                  <p className="mt-1 text-sm text-gray-500">
                    Les événements apparaîtront ici automatiquement.
                  </p>
                </td>
              </tr>
            ) : (
              entries.map((entry) => (
                <>
                  <tr
                    key={entry.id}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-2 py-3">
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedRow(
                            expandedRow === entry.id ? null : entry.id,
                          )
                        }
                        className="text-gray-400 hover:text-gray-600"
                        aria-label={`${expandedRow === entry.id ? "Masquer" : "Afficher"} les details`}
                        aria-expanded={expandedRow === entry.id}
                      >
                        {expandedRow === entry.id ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                      {new Date(entry.timestamp).toLocaleString("fr-CA")}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-900">
                      {entry.action}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{entry.actor}</td>
                    <td className="px-4 py-3 text-gray-600">{entry.resource}</td>
                    <td className="px-4 py-3 text-gray-500 truncate max-w-[200px]">
                      {entry.details}
                    </td>
                  </tr>
                  {expandedRow === entry.id && (
                    <tr key={`${entry.id}-meta`}>
                      <td colSpan={6} className="bg-gray-50 px-6 py-4">
                        <pre className="text-xs text-gray-600 overflow-x-auto whitespace-pre-wrap">
                          {JSON.stringify(entry.metadata, null, 2)}
                        </pre>
                      </td>
                    </tr>
                  )}
                </>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
