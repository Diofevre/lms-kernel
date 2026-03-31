"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Palette, Check } from "lucide-react";

const presetColors = [
  "#0f172a", "#1e3a5f", "#003366", "#1B0C25",
  "#059669", "#dc2626", "#7c3aed", "#2563eb",
];

export default function BrandingPage() {
  const t = useTranslations("common");
  const [primaryColor, setPrimaryColor] = useState("#0f172a");
  const [appName, setAppName] = useState("");
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    // Will call API PATCH /v1/tenants/:id with { primaryColor, name }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">Apparence</h1>
        <p className="mt-1 text-sm text-gray-500">
          Personnalisez l&apos;apparence de votre organisation.
        </p>
      </div>

      {/* Color picker */}
      <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <Palette className="h-5 w-5 text-gray-400" />
          <h2 className="text-lg font-semibold text-gray-900">Couleur primaire</h2>
        </div>
        <div className="space-y-4">
          <div className="flex flex-wrap gap-3">
            {presetColors.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => setPrimaryColor(color)}
                className={`h-10 w-10 rounded-lg border-2 transition-all ${primaryColor === color ? "border-gray-900 scale-110" : "border-transparent"}`}
                style={{ backgroundColor: color }}
                aria-label={color}
              />
            ))}
          </div>
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={primaryColor}
              onChange={(e) => setPrimaryColor(e.target.value)}
              className="h-10 w-10 rounded-lg border border-gray-200 cursor-pointer"
            />
            <input
              type="text"
              value={primaryColor}
              onChange={(e) => setPrimaryColor(e.target.value)}
              className="rounded-md border border-gray-200 px-3 py-2 text-sm font-mono w-28 focus:border-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-400"
            />
          </div>

          {/* Preview */}
          <div className="mt-4 p-4 rounded-lg border border-gray-100 bg-gray-50">
            <p className="text-xs text-gray-500 mb-3">Aperçu :</p>
            <div className="flex items-center gap-3">
              <div className="h-4 w-4 rounded" style={{ backgroundColor: primaryColor }} />
              <button type="button" className="px-4 py-2 rounded-lg text-sm font-medium text-white" style={{ backgroundColor: primaryColor }}>
                Bouton exemple
              </button>
              <span className="text-sm font-medium" style={{ color: primaryColor }}>Lien exemple</span>
            </div>
          </div>
        </div>
      </section>

      {/* App name */}
      <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Nom affiché</h2>
        <input
          type="text"
          value={appName}
          onChange={(e) => setAppName(e.target.value)}
          placeholder="Nom de votre organisation"
          className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-400"
        />
        <p className="mt-2 text-xs text-gray-400">Ce nom apparaîtra dans la sidebar et les emails.</p>
      </section>

      {/* Save */}
      <div className="flex justify-end">
        <button type="button" onClick={handleSave}
          className="inline-flex items-center gap-2 rounded-md bg-gray-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-gray-800 transition-colors">
          {saved ? <Check className="h-4 w-4" /> : null}
          {saved ? t("save") + " ✓" : t("save")}
        </button>
      </div>
    </div>
  );
}
