"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { MessageSquarePlus, Ticket, Loader2 } from "lucide-react";
import { apiGet, apiPost } from "@/lib/api";

interface SupportTicket {
  id: string;
  subject: string;
  status: string;
  priority: string;
  createdAt: string;
}

export default function SupportPage() {
  const { data: session } = useSession();
  const t = useTranslations("common");
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");

  const token = (session as unknown as Record<string, unknown> | null)?.accessToken as string | undefined;

  const fetchTickets = useCallback(async () => {
    if (!token) return;
    try {
      setLoading(true);
      const data = await apiGet<SupportTicket[]>("/v1/support/tickets/mine", token);
      setTickets(Array.isArray(data) ? data : []);
    } catch { /* empty */ } finally { setLoading(false); }
  }, [token]);

  useEffect(() => { void fetchTickets(); }, [fetchTickets]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !subject.trim()) return;
    setSubmitting(true);
    try {
      await apiPost("/v1/support/tickets", { subject, description, priority: "medium" }, token);
      setSubject(""); setDescription(""); setShowForm(false);
      await fetchTickets();
    } catch { /* empty */ } finally { setSubmitting(false); }
  };

  const statusLabels: Record<string, string> = { open: "Ouvert", in_progress: "En cours", resolved: "Résolu", closed: "Fermé" };
  const statusClasses: Record<string, string> = { open: "bg-amber-50 text-amber-700", in_progress: "bg-blue-50 text-blue-700", resolved: "bg-emerald-50 text-emerald-700", closed: "bg-gray-100 text-gray-600" };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">Soutien</h1>
          <p className="mt-1 text-sm text-gray-500">Soumettez et suivez vos demandes.</p>
        </div>
        <button type="button" onClick={() => setShowForm(!showForm)}
          className="inline-flex items-center gap-2 rounded-md bg-gray-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-800 transition-colors">
          <MessageSquarePlus className="h-4 w-4" />
          Nouvelle demande
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="rounded-lg border border-gray-200 bg-white p-6 space-y-4">
          <div>
            <label htmlFor="ticket-subject" className="block text-sm font-medium text-gray-700 mb-1">Sujet</label>
            <input id="ticket-subject" type="text" required value={subject} onChange={(e) => setSubject(e.target.value)}
              className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-400"
              placeholder="Décrivez brièvement votre problème" />
          </div>
          <div>
            <label htmlFor="ticket-desc" className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea id="ticket-desc" rows={4} value={description} onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-400"
              placeholder="Donnez le plus de détails possible..." />
          </div>
          <div className="flex gap-3">
            <button type="submit" disabled={submitting}
              className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50">
              {submitting ? "Envoi..." : "Soumettre"}
            </button>
            <button type="button" onClick={() => setShowForm(false)}
              className="rounded-md border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
              {t("cancel")}
            </button>
          </div>
        </form>
      )}

      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th scope="col" className="px-4 py-3 text-left font-medium text-gray-600">Sujet</th>
              <th scope="col" className="px-4 py-3 text-left font-medium text-gray-600">{t("status")}</th>
              <th scope="col" className="px-4 py-3 text-left font-medium text-gray-600">{t("createdAt")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={3} className="px-4 py-12 text-center">
                <Loader2 className="mx-auto h-6 w-6 animate-spin text-gray-400" />
                <p className="mt-2 text-sm text-gray-500">{t("loading")}</p>
              </td></tr>
            ) : tickets.length === 0 ? (
              <tr><td colSpan={3} className="px-4 py-12 text-center">
                <Ticket className="mx-auto h-10 w-10 text-gray-300" />
                <p className="mt-2 text-sm font-medium text-gray-900">Aucune demande</p>
                <p className="mt-1 text-sm text-gray-500">Vos demandes apparaîtront ici.</p>
              </td></tr>
            ) : tickets.map((ticket) => (
              <tr key={ticket.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 font-medium text-gray-900">{ticket.subject}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusClasses[ticket.status] ?? "bg-gray-100 text-gray-600"}`}>
                    {statusLabels[ticket.status] ?? ticket.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-500">{new Date(ticket.createdAt).toLocaleDateString("fr-CA")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
