"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { Search, UserPlus, MoreHorizontal, Users, Loader2 } from "lucide-react";
import { apiGet, apiPatch } from "@/lib/api";

type UserStatus = "active" | "inactive";

interface AppUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  roles: string[];
  status: UserStatus;
  lastLoginAt: string | null;
}

const roleLabels: Record<string, string> = {
  super_admin: "Super admin",
  tenant_admin: "Admin",
  instructor: "Instructeur",
  student: "Etudiant",
  auditor: "Auditeur",
  privacy_officer: "Responsable Loi 25",
};

const roleClasses: Record<string, string> = {
  super_admin: "bg-red-50 text-red-700",
  tenant_admin: "bg-purple-50 text-purple-700",
  instructor: "bg-blue-50 text-blue-700",
  student: "bg-gray-100 text-gray-700",
  auditor: "bg-amber-50 text-amber-700",
  privacy_officer: "bg-teal-50 text-teal-700",
};

const statusLabels: Record<UserStatus, string> = {
  active: "Actif",
  inactive: "Inactif",
};

const statusClasses: Record<UserStatus, string> = {
  active: "bg-emerald-50 text-emerald-700",
  inactive: "bg-gray-100 text-gray-600",
};

export default function UsersPage() {
  const { data: session } = useSession();
  const t = useTranslations("users");
  const tc = useTranslations("common");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openActions, setOpenActions] = useState<string | null>(null);

  const token = (session as Record<string, unknown> | null)?.accessToken as string | undefined;

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiGet<{ data: AppUser[] } | AppUser[]>("/v1/users", token);
      // API may return { data: [...], meta: {} } or [...]
      const list = Array.isArray(response) ? response : (response as { data: AppUser[] }).data ?? [];
      setUsers(list.map((u) => ({
        ...u,
        status: ((u as unknown as { isActive?: boolean }).isActive !== false ? "active" : "inactive") as UserStatus,
      })));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur de chargement");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) void fetchUsers();
  }, [token, fetchUsers]);

  const toggleUser = async (id: string, currentStatus: UserStatus) => {
    try {
      await apiPatch(`/v1/users/${id}/toggle`, { isActive: currentStatus !== "active" }, token);
      setUsers((prev) =>
        prev.map((u) => (u.id === id ? { ...u, status: currentStatus === "active" ? "inactive" as const : "active" as const } : u)),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    }
    setOpenActions(null);
  };

  const filtered = users.filter((u) => {
    if (roleFilter !== "all" && !u.roles.includes(roleFilter)) return false;
    if (search) {
      const q = search.toLowerCase();
      if (
        !u.firstName.toLowerCase().includes(q) &&
        !u.lastName.toLowerCase().includes(q) &&
        !u.email.toLowerCase().includes(q)
      )
        return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">
            {t("title")}
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            {t("subtitle")}
          </p>
        </div>
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-md bg-gray-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-800 transition-colors"
        >
          <UserPlus className="h-4 w-4" />
          {t("invite")}
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <label htmlFor="search-users" className="sr-only">
            Rechercher un utilisateur
          </label>
          <input
            id="search-users"
            type="search"
            placeholder="Rechercher..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-md border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm placeholder:text-gray-400 focus:border-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-400"
          />
        </div>
        <label htmlFor="filter-role" className="sr-only">
          Filtrer par role
        </label>
        <select
          id="filter-role"
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="rounded-md border border-gray-200 bg-white px-3 py-2 text-sm focus:border-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-400"
        >
          <option value="all">Tous les roles</option>
          {Object.entries(roleLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {/* Error */}
      {error && (
        <div role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th scope="col" className="px-4 py-3 text-left font-medium text-gray-600">
                Nom
              </th>
              <th scope="col" className="px-4 py-3 text-left font-medium text-gray-600">
                Courriel
              </th>
              <th scope="col" className="px-4 py-3 text-left font-medium text-gray-600">
                Role(s)
              </th>
              <th scope="col" className="px-4 py-3 text-left font-medium text-gray-600">
                Statut
              </th>
              <th scope="col" className="px-4 py-3 text-left font-medium text-gray-600">
                Derniere connexion
              </th>
              <th scope="col" className="px-4 py-3 text-right font-medium text-gray-600">
                Actions
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
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center">
                  <Users className="mx-auto h-10 w-10 text-gray-300" />
                  <p className="mt-2 text-sm font-medium text-gray-900">
                    {t("noUsers")}
                  </p>
                  <p className="mt-1 text-sm text-gray-500">
                    {t("noUsersHint")}
                  </p>
                </td>
              </tr>
            ) : (
              filtered.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {user.firstName} {user.lastName}
                  </td>
                  <td className="px-4 py-3 text-gray-500">{user.email}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {user.roles.map((role) => (
                        <span
                          key={role}
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${roleClasses[role] ?? "bg-gray-100 text-gray-700"}`}
                        >
                          {roleLabels[role] ?? role}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusClasses[user.status]}`}
                    >
                      {statusLabels[user.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {user.lastLoginAt
                      ? new Date(user.lastLoginAt).toLocaleDateString("fr-CA")
                      : "Jamais"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="relative inline-block">
                      <button
                        type="button"
                        onClick={() =>
                          setOpenActions(
                            openActions === user.id ? null : user.id,
                          )
                        }
                        className="rounded-md p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                        aria-label={`Actions pour ${user.firstName} ${user.lastName}`}
                        aria-expanded={openActions === user.id}
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </button>
                      {openActions === user.id && (
                        <div className="absolute right-0 top-full z-10 mt-1 w-44 rounded-md border border-gray-200 bg-white py-1 shadow-lg">
                          <button
                            type="button"
                            className="block w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                            onClick={() => setOpenActions(null)}
                          >
                            Modifier le role
                          </button>
                          <button
                            type="button"
                            className="block w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                            onClick={() => toggleUser(user.id, user.status)}
                          >
                            {user.status === "active" ? "Désactiver" : "Activer"}
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
