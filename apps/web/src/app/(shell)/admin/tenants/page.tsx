"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { Search, Plus, MoreHorizontal, Building2, Loader2 } from "lucide-react";
import { apiGet, apiPatch } from "@/lib/api";

interface Tenant {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  enabledSsoProviders: string[];
  createdAt: string;
  _count?: { users: number };
}

type FilterValue = "all" | "active" | "inactive";

export default function TenantsPage() {
  const { data: session } = useSession();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterValue>("all");
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openActions, setOpenActions] = useState<string | null>(null);

  const token = (session as Record<string, unknown> | null)?.accessToken as string | undefined;

  const fetchTenants = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiGet<Tenant[]>("/v1/tenants", token);
      setTenants(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur de chargement");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) void fetchTenants();
  }, [token, fetchTenants]);

  const toggleTenant = async (id: string, isActive: boolean) => {
    try {
      await apiPatch(`/v1/tenants/${id}/toggle`, { isActive: !isActive }, token);
      setTenants((prev) =>
        prev.map((t) => (t.id === id ? { ...t, isActive: !isActive } : t)),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    }
    setOpenActions(null);
  };

  const filtered = tenants.filter((t) => {
    if (filter === "active" && !t.isActive) return false;
    if (filter === "inactive" && t.isActive) return false;
    if (search && !t.name.toLowerCase().includes(search.toLowerCase()) && !t.slug.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">
            Organisations
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Gestion des organisations multi-tenant.
          </p>
        </div>
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-md bg-gray-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-800 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Nouvelle organisation
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <label htmlFor="search-tenants" className="sr-only">Rechercher une organisation</label>
          <input
            id="search-tenants"
            type="search"
            placeholder="Rechercher..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-md border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm placeholder:text-gray-400 focus:border-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-400"
          />
        </div>
        <label htmlFor="filter-status" className="sr-only">Filtrer par statut</label>
        <select
          id="filter-status"
          value={filter}
          onChange={(e) => setFilter(e.target.value as FilterValue)}
          className="rounded-md border border-gray-200 bg-white px-3 py-2 text-sm focus:border-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-400"
        >
          <option value="all">Tous les statuts</option>
          <option value="active">Actif</option>
          <option value="inactive">Inactif</option>
        </select>
      </div>

      {/* Error */}
      {error && (
        <div role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th scope="col" className="px-4 py-3 text-left font-medium text-gray-600">Nom</th>
              <th scope="col" className="px-4 py-3 text-left font-medium text-gray-600">Slug</th>
              <th scope="col" className="px-4 py-3 text-left font-medium text-gray-600">Statut</th>
              <th scope="col" className="px-4 py-3 text-left font-medium text-gray-600">SSO</th>
              <th scope="col" className="px-4 py-3 text-left font-medium text-gray-600">Créé le</th>
              <th scope="col" className="px-4 py-3 text-right font-medium text-gray-600">Actions</th>
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
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center">
                  <Building2 className="mx-auto h-10 w-10 text-gray-300" />
                  <p className="mt-2 text-sm font-medium text-gray-900">Aucune organisation trouvée</p>
                  <p className="mt-1 text-sm text-gray-500">Les organisations apparaîtront ici une fois créées.</p>
                </td>
              </tr>
            ) : (
              filtered.map((tenant) => (
                <tr key={tenant.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-900">{tenant.name}</td>
                  <td className="px-4 py-3 text-gray-500 font-mono text-xs">{tenant.slug}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${tenant.isActive ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-600"}`}>
                      {tenant.isActive ? "Actif" : "Inactif"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600 text-xs">
                    {tenant.enabledSsoProviders?.filter((p) => p !== "credentials").join(", ") || "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-500">{new Date(tenant.createdAt).toLocaleDateString("fr-CA")}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="relative inline-block">
                      <button
                        type="button"
                        onClick={() => setOpenActions(openActions === tenant.id ? null : tenant.id)}
                        className="rounded-md p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                        aria-label={`Actions pour ${tenant.name}`}
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </button>
                      {openActions === tenant.id && (
                        <div className="absolute right-0 top-full z-10 mt-1 w-40 rounded-md border border-gray-200 bg-white py-1 shadow-lg">
                          <button type="button" className="block w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50" onClick={() => setOpenActions(null)}>
                            Modifier
                          </button>
                          <button
                            type="button"
                            className="block w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                            onClick={() => toggleTenant(tenant.id, tenant.isActive)}
                          >
                            {tenant.isActive ? "Désactiver" : "Activer"}
                          </button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
