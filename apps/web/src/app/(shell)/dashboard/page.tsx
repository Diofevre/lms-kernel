"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { Users, AlertTriangle, Activity, Loader2 } from "lucide-react";
import { apiGet } from "@/lib/api";

interface StatCard {
  label: string;
  value: string;
  icon: React.ElementType;
  color: string;
}

export default function DashboardPage() {
  const { data: session } = useSession();
  const t = useTranslations("dashboard");
  const [stats, setStats] = useState<StatCard[]>([
    { label: t("userCount"), value: "—", icon: Users, color: "text-blue-600 bg-blue-50" },
    { label: t("loi25Pending"), value: "—", icon: AlertTriangle, color: "text-amber-600 bg-amber-50" },
    { label: t("auditEvents"), value: "—", icon: Activity, color: "text-emerald-600 bg-emerald-50" },
  ]);
  const [loading, setLoading] = useState(true);
  const token = session?.accessToken;

  useEffect(() => {
    if (!token) return;

    async function loadStats() {
      try {
        // Fetch all stats in parallel
        // Helper: extract array from API response (handles { data: [] } or [])
        function extractArray(response: unknown): unknown[] {
          if (Array.isArray(response)) return response;
          if (response && typeof response === "object" && "data" in response) {
            const d = (response as { data: unknown }).data;
            if (Array.isArray(d)) return d;
          }
          return [];
        }

        const [users, requests, auditLogs] = await Promise.allSettled([
          apiGet<unknown>("/v1/users", token),
          apiGet<unknown>("/v1/privacy/requests", token),
          apiGet<unknown>("/v1/audit/logs?limit=500", token),
        ]);

        setStats((prev) => prev.map((s, i) => {
          if (i === 0 && users.status === "fulfilled") return { ...s, value: String(extractArray(users.value).length) };
          if (i === 1 && requests.status === "fulfilled") {
            const list = extractArray(requests.value) as Array<{ status: string }>;
            const pending = list.filter((r) => r.status === "pending").length;
            return { ...s, value: String(pending) };
          }
          if (i === 2 && auditLogs.status === "fulfilled") return { ...s, value: String(extractArray(auditLogs.value).length) };
          return s;
        }));
      } catch {
        // Stats are non-critical — keep showing "—"
      } finally {
        setLoading(false);
      }
    }

    void loadStats();
  }, [token]);

  const userName = session?.user?.name ?? "";

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">
          {t("title")}
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          {t("welcome", { name: userName })}.
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-4">
                <div className={`flex h-12 w-12 items-center justify-center rounded-lg ${stat.color}`}>
                  <Icon className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-2xl font-semibold text-gray-900">
                    {loading ? <Loader2 className="h-5 w-5 animate-spin text-gray-400" /> : stat.value}
                  </p>
                  <p className="text-sm text-gray-500">{stat.label}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
