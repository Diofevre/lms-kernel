"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { Clock, AlertTriangle, CheckCircle2, Lock, Loader2 } from "lucide-react";
import { apiGet, apiPatch } from "@/lib/api";

type RequestType = "access" | "correction" | "deletion" | "portability";
type RequestStatus = "pending" | "in_progress" | "completed" | "denied";

interface PrivacyRequest {
  id: string;
  type: RequestType;
  userId: string;
  requestedAt: string;
  deadline: string;
  status: RequestStatus;
  completedAt: string | null;
  denialReason: string | null;
}

const typeLabels: Record<string, string> = {
  access: "Accès",
  correction: "Rectification",
  deletion: "Suppression",
  portability: "Portabilité",
};

const typeClasses: Record<string, string> = {
  access: "bg-blue-50 text-blue-700",
  correction: "bg-amber-50 text-amber-700",
  deletion: "bg-red-50 text-red-700",
  portability: "bg-purple-50 text-purple-700",
};

const statusLabels: Record<string, string> = {
  pending: "En attente",
  in_progress: "En cours",
  completed: "Traitée",
  denied: "Refusée",
};

const statusClasses: Record<string, string> = {
  pending: "bg-amber-50 text-amber-700",
  in_progress: "bg-blue-50 text-blue-700",
  completed: "bg-emerald-50 text-emerald-700",
  denied: "bg-red-50 text-red-700",
};

function isOverdue(deadline: string): boolean {
  return new Date(deadline) < new Date();
}

type TabValue = "requests" | "consents";

export default function PrivacyPage() {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState<TabValue>("requests");
  const [requests, setRequests] = useState<PrivacyRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const token = (session as unknown as Record<string, unknown> | null)?.accessToken as string | undefined;

  const fetchRequests = useCallback(async () => {
    if (!token) return;
    try {
      setLoading(true);
      const data = await apiGet<PrivacyRequest[]>("/v1/privacy/requests", token);
      setRequests(data);
    } catch {
      // Non-blocking
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { void fetchRequests(); }, [fetchRequests]);

  const handleProcess = async (id: string, action: "complete" | "deny") => {
    if (!token) return;
    setProcessingId(id);
    try {
      const body: Record<string, string> = { action };
      if (action === "deny") {
        const reason = prompt("Raison du refus :");
        if (!reason) { setProcessingId(null); return; }
        body["denialReason"] = reason;
      }
      await apiPatch(`/v1/privacy/requests/${id}`, body, token);
      await fetchRequests();
    } catch {
      // Error handled by API client
    } finally {
      setProcessingId(null);
    }
  };

  // Computed stats
  const pending = requests.filter((r) => r.status === "pending").length;
  const overdue = requests.filter((r) => r.status === "pending" && isOverdue(r.deadline)).length;
  const now = new Date();
  const completedThisMonth = requests.filter((r) =>
    r.status === "completed" && r.completedAt && new Date(r.completedAt).getMonth() === now.getMonth() && new Date(r.completedAt).getFullYear() === now.getFullYear()
  ).length;

  const statCards = [
    { label: "En attente", value: loading ? "—" : String(pending), icon: Clock, color: "text-amber-600 bg-amber-50" },
    { label: "En retard", value: loading ? "—" : String(overdue), icon: AlertTriangle, color: "text-red-600 bg-red-50" },
    { label: "Traitées ce mois", value: loading ? "—" : String(completedThisMonth), icon: CheckCircle2, color: "text-emerald-600 bg-emerald-50" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">
          Confidentialité — Loi 25
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Gestion des demandes de droits et des consentements.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${stat.color}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xl font-semibold text-gray-900">{stat.value}</p>
                  <p className="text-sm text-gray-500">{stat.label}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200" role="tablist" aria-label="Sections de confidentialité">
        <div className="flex gap-6">
          <button type="button" role="tab" aria-selected={activeTab === "requests"} aria-controls="panel-requests" onClick={() => setActiveTab("requests")}
            className={`pb-3 text-sm font-medium transition-colors border-b-2 ${activeTab === "requests" ? "border-gray-900 text-gray-900" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
            Demandes
          </button>
          <button type="button" role="tab" aria-selected={activeTab === "consents"} aria-controls="panel-consents" onClick={() => setActiveTab("consents")}
            className={`pb-3 text-sm font-medium transition-colors border-b-2 ${activeTab === "consents" ? "border-gray-900 text-gray-900" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
            Consentements
          </button>
        </div>
      </div>

      {/* Requests panel */}
      {activeTab === "requests" && (
        <div id="panel-requests" role="tabpanel">
          <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th scope="col" className="px-4 py-3 text-left font-medium text-gray-600">Type</th>
                  <th scope="col" className="px-4 py-3 text-left font-medium text-gray-600">Utilisateur</th>
                  <th scope="col" className="px-4 py-3 text-left font-medium text-gray-600">Date</th>
                  <th scope="col" className="px-4 py-3 text-left font-medium text-gray-600">Échéance</th>
                  <th scope="col" className="px-4 py-3 text-left font-medium text-gray-600">Statut</th>
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
                ) : requests.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center">
                      <Lock className="mx-auto h-10 w-10 text-gray-300" />
                      <p className="mt-2 text-sm font-medium text-gray-900">Aucune demande en cours</p>
                      <p className="mt-1 text-sm text-gray-500">Les demandes de droits apparaîtront ici.</p>
                    </td>
                  </tr>
                ) : (
                  requests.map((req) => (
                    <tr key={req.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${typeClasses[req.type] ?? "bg-gray-100 text-gray-700"}`}>
                          {typeLabels[req.type] ?? req.type}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600 font-mono text-xs">{req.userId}</td>
                      <td className="px-4 py-3 text-gray-500">{new Date(req.requestedAt).toLocaleDateString("fr-CA")}</td>
                      <td className="px-4 py-3">
                        <span className={isOverdue(req.deadline) && req.status === "pending" ? "text-red-600 font-medium" : "text-gray-500"}>
                          {new Date(req.deadline).toLocaleDateString("fr-CA")}
                          {isOverdue(req.deadline) && req.status === "pending" && <span className="ml-1 text-xs">(en retard)</span>}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusClasses[req.status] ?? "bg-gray-100 text-gray-700"}`}>
                          {statusLabels[req.status] ?? req.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {req.status === "pending" && (
                          <div className="flex items-center justify-end gap-2">
                            <button type="button" disabled={processingId === req.id}
                              onClick={() => handleProcess(req.id, "complete")}
                              className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 transition-colors disabled:opacity-50">
                              {processingId === req.id ? "..." : "Approuver"}
                            </button>
                            <button type="button" disabled={processingId === req.id}
                              onClick={() => handleProcess(req.id, "deny")}
                              className="rounded-md border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50">
                              Refuser
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Consents panel */}
      {activeTab === "consents" && (
        <div id="panel-consents" role="tabpanel">
          <div className="rounded-lg border border-gray-200 bg-white p-12 text-center">
            <Lock className="mx-auto h-10 w-10 text-gray-300" />
            <p className="mt-3 text-sm font-medium text-gray-900">Fonctionnalité à venir</p>
            <p className="mt-1 text-sm text-gray-500">La gestion des consentements sera disponible prochainement.</p>
          </div>
        </div>
      )}
    </div>
  );
}
