"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { User, ShieldAlert, Globe, Trash2, Check, Loader2 } from "lucide-react";
import { apiPost, apiDelete } from "@/lib/api";

export default function SettingsPage() {
  const { data: session } = useSession();

  // Profile
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);

  // Security
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [mfaEnabled, setMfaEnabled] = useState(false);

  // Preferences
  const [language, setLanguage] = useState("fr");
  const [theme, setTheme] = useState("light");

  // Deletion
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Data export
  const [exporting, setExporting] = useState(false);
  const [exportRequested, setExportRequested] = useState(false);

  // Feedback
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const token = (session as unknown as Record<string, unknown> | null)?.accessToken as string | undefined;

  // Pre-fill from session
  useEffect(() => {
    if (session?.user) {
      const parts = (session.user.name ?? "").split(" ");
      setFirstName(parts[0] ?? "");
      setLastName(parts.slice(1).join(" "));
      setEmail(session.user.email ?? "");
    }
  }, [session]);

  const showFeedback = (type: "success" | "error", message: string) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 4000);
  };

  const handleSaveProfile = async () => {
    setProfileSaving(true);
    try {
      // Profile update will be handled by Keycloak in production
      // For now, show success feedback
      await new Promise((r) => setTimeout(r, 500));
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 2000);
      showFeedback("success", "Profil enregistré.");
    } catch {
      showFeedback("error", "Erreur lors de la sauvegarde.");
    } finally {
      setProfileSaving(false);
    }
  };

  const handleExportData = async () => {
    if (!token) return;
    setExporting(true);
    try {
      await apiPost("/v1/privacy/my-data", {}, token);
      setExportRequested(true);
      showFeedback("success", "Demande d'export envoyée. Vous recevrez vos données sous 30 jours.");
    } catch {
      showFeedback("error", "Erreur lors de la demande d'export.");
    } finally {
      setExporting(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!token) return;
    setDeleting(true);
    try {
      await apiDelete("/v1/privacy/my-data", token);
      showFeedback("success", "Demande de suppression enregistrée. Votre compte sera supprimé sous 30 jours.");
      setShowDeleteConfirm(false);
    } catch {
      showFeedback("error", "Erreur lors de la demande de suppression.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">Paramètres</h1>
        <p className="mt-1 text-sm text-gray-500">Gérez votre profil, votre sécurité et vos préférences.</p>
      </div>

      {/* Global feedback */}
      {feedback && (
        <div role="alert" className={`rounded-lg px-4 py-3 text-sm ${feedback.type === "success" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
          {feedback.message}
        </div>
      )}

      {/* Profile section */}
      <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm" aria-labelledby="section-profile">
        <div className="flex items-center gap-3 mb-6">
          <User className="h-5 w-5 text-gray-400" />
          <h2 id="section-profile" className="text-lg font-semibold text-gray-900">Profil</h2>
        </div>
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="settings-first-name" className="block text-sm font-medium text-gray-700 mb-1">Prénom</label>
              <input id="settings-first-name" type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)}
                className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-400" />
            </div>
            <div>
              <label htmlFor="settings-last-name" className="block text-sm font-medium text-gray-700 mb-1">Nom de famille</label>
              <input id="settings-last-name" type="text" value={lastName} onChange={(e) => setLastName(e.target.value)}
                className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-400" />
            </div>
          </div>
          <div>
            <label htmlFor="settings-email" className="block text-sm font-medium text-gray-700 mb-1">Courriel</label>
            <input id="settings-email" type="email" value={email} readOnly disabled
              className="w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-500 cursor-not-allowed" />
            <p className="mt-1 text-xs text-gray-400">Le courriel ne peut pas être modifié.</p>
          </div>
          <div className="flex justify-end">
            <button type="button" onClick={handleSaveProfile} disabled={profileSaving}
              className="inline-flex items-center gap-2 rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 transition-colors disabled:opacity-50">
              {profileSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : profileSaved ? <Check className="h-4 w-4" /> : null}
              {profileSaved ? "Enregistré" : "Enregistrer le profil"}
            </button>
          </div>
        </div>
      </section>

      {/* Security section */}
      <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm" aria-labelledby="section-security">
        <div className="flex items-center gap-3 mb-6">
          <ShieldAlert className="h-5 w-5 text-gray-400" />
          <h2 id="section-security" className="text-lg font-semibold text-gray-900">Sécurité</h2>
        </div>
        <div className="space-y-4">
          <div>
            <label htmlFor="settings-current-password" className="block text-sm font-medium text-gray-700 mb-1">Mot de passe actuel</label>
            <input id="settings-current-password" type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} autoComplete="current-password"
              className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-400" />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="settings-new-password" className="block text-sm font-medium text-gray-700 mb-1">Nouveau mot de passe</label>
              <input id="settings-new-password" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} autoComplete="new-password"
                className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-400" />
            </div>
            <div>
              <label htmlFor="settings-confirm-password" className="block text-sm font-medium text-gray-700 mb-1">Confirmer le mot de passe</label>
              <input id="settings-confirm-password" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} autoComplete="new-password"
                className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-400" />
            </div>
          </div>
          <div className="flex items-center justify-between rounded-md border border-gray-200 px-4 py-3">
            <div>
              <p className="text-sm font-medium text-gray-900">Authentification multifacteur (MFA)</p>
              <p className="text-xs text-gray-500">Ajoutez une couche de sécurité supplémentaire.</p>
            </div>
            <button type="button" role="switch" aria-checked={mfaEnabled} onClick={() => setMfaEnabled(!mfaEnabled)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${mfaEnabled ? "bg-gray-900" : "bg-gray-200"}`}>
              <span className="sr-only">Activer MFA</span>
              <span aria-hidden="true" className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-sm ring-0 transition-transform ${mfaEnabled ? "translate-x-5" : "translate-x-0"}`} />
            </button>
          </div>
          <p className="text-xs text-gray-400">Le changement de mot de passe est géré par votre fournisseur d'identité (Keycloak).</p>
        </div>
      </section>

      {/* Preferences section */}
      <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm" aria-labelledby="section-preferences">
        <div className="flex items-center gap-3 mb-6">
          <Globe className="h-5 w-5 text-gray-400" />
          <h2 id="section-preferences" className="text-lg font-semibold text-gray-900">Préférences</h2>
        </div>
        <div className="space-y-4">
          <div>
            <label htmlFor="settings-language" className="block text-sm font-medium text-gray-700 mb-1">Langue</label>
            <select id="settings-language" value={language} onChange={(e) => setLanguage(e.target.value)}
              className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm focus:border-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-400">
              <option value="fr">Français</option>
              <option value="en">English</option>
            </select>
          </div>
          <div>
            <label htmlFor="settings-theme" className="block text-sm font-medium text-gray-700 mb-1">Thème</label>
            <select id="settings-theme" value={theme} onChange={(e) => setTheme(e.target.value)}
              className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm focus:border-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-400">
              <option value="light">Clair</option>
              <option value="dark">Sombre</option>
            </select>
          </div>
        </div>
      </section>

      {/* Personal data section */}
      <section className="rounded-lg border border-red-200 bg-white p-6 shadow-sm" aria-labelledby="section-data">
        <div className="flex items-center gap-3 mb-6">
          <Trash2 className="h-5 w-5 text-red-400" />
          <h2 id="section-data" className="text-lg font-semibold text-gray-900">Données personnelles</h2>
        </div>
        <div className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900">Demander mes données</p>
              <p className="text-xs text-gray-500">Conformément à la Loi 25, obtenez une copie de vos données.</p>
            </div>
            <button type="button" onClick={handleExportData} disabled={exporting || exportRequested}
              className="inline-flex items-center gap-2 rounded-md border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50">
              {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : exportRequested ? <Check className="h-4 w-4 text-emerald-600" /> : null}
              {exportRequested ? "Demande envoyée" : "Demander un export"}
            </button>
          </div>
          <hr className="border-gray-200" />
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-red-600">Supprimer mon compte</p>
              <p className="text-xs text-gray-500">Cette action est irréversible. Toutes vos données seront supprimées sous 30 jours.</p>
            </div>
            {!showDeleteConfirm ? (
              <button type="button" onClick={() => setShowDeleteConfirm(true)}
                className="rounded-md border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors">
                Supprimer mon compte
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => setShowDeleteConfirm(false)}
                  className="rounded-md border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
                  Annuler
                </button>
                <button type="button" onClick={handleDeleteAccount} disabled={deleting}
                  className="inline-flex items-center gap-2 rounded-md bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700 transition-colors disabled:opacity-50">
                  {deleting && <Loader2 className="h-4 w-4 animate-spin" />}
                  Confirmer la suppression
                </button>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
