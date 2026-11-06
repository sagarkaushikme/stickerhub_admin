import { useEffect, useState } from "react";
import { Loader2, Megaphone, Save } from "lucide-react";

import { adminFetch } from "../api";

type Banner = { text: string; active: boolean };
type Settings = { announcement?: Banner; marquee?: Banner };

const EMPTY: Banner = { text: "", active: true };

export function SettingsTab() {
  const [announcement, setAnnouncement] = useState<Banner>(EMPTY);
  const [marquee, setMarquee] = useState<Banner>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [savedKey, setSavedKey] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await adminFetch<{ success: boolean; data: Settings }>("/settings");
        if (res.data.announcement) setAnnouncement(res.data.announcement);
        if (res.data.marquee) setMarquee(res.data.marquee);
      } catch {
        // keep defaults
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const save = async (key: "announcement" | "marquee", value: Banner) => {
    setSaving(key);
    setSavedKey(null);
    try {
      await adminFetch(`/admin/settings/${key}`, {
        method: "POST",
        body: JSON.stringify(value),
      });
      setSavedKey(key);
      setTimeout(() => setSavedKey(null), 2500);
    } catch (err: any) {
      alert("Failed to save: " + err.message);
    } finally {
      setSaving(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-slate-400">
        <Loader2 className="size-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <BannerCard
        title="Announcement bar"
        hint="The thin highlighted strip at the very top of the shop."
        banner={announcement}
        onChange={setAnnouncement}
        onSave={() => save("announcement", announcement)}
        saving={saving === "announcement"}
        saved={savedKey === "announcement"}
      />
      <BannerCard
        title="Scrolling marquee"
        hint="The scrolling strip of highlights. Separate phrases with ·"
        banner={marquee}
        onChange={setMarquee}
        onSave={() => save("marquee", marquee)}
        saving={saving === "marquee"}
        saved={savedKey === "marquee"}
      />
    </div>
  );
}

function BannerCard({
  title,
  hint,
  banner,
  onChange,
  onSave,
  saving,
  saved,
}: {
  title: string;
  hint: string;
  banner: Banner;
  onChange: (b: Banner) => void;
  onSave: () => void;
  saving: boolean;
  saved: boolean;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
      <div className="flex items-center gap-2">
        <span className="flex size-8 items-center justify-center rounded-lg bg-pink-50 text-pink-600">
          <Megaphone className="size-4" />
        </span>
        <div>
          <h3 className="font-display text-sm font-bold">{title}</h3>
          <p className="text-[11px] text-slate-400">{hint}</p>
        </div>
      </div>

      <label className="mt-4 block text-xs font-bold text-slate-700">Text</label>
      <textarea
        rows={2}
        value={banner.text}
        onChange={(e) => onChange({ ...banner, text: e.target.value })}
        className="mt-1 w-full rounded-xl border border-slate-200 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
      />

      <label className="mt-3 flex items-center gap-2 text-xs font-semibold text-slate-700">
        <input
          type="checkbox"
          checked={banner.active}
          onChange={(e) => onChange({ ...banner, active: e.target.checked })}
          className="size-4 rounded border-slate-300"
        />
        Show on the storefront
      </label>

      <div className="mt-4 flex items-center gap-3">
        <button
          type="button"
          onClick={onSave}
          disabled={saving}
          className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800 disabled:opacity-50"
        >
          {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
          Save
        </button>
        {saved && <span className="text-xs font-semibold text-emerald-600">Saved ✓</span>}
      </div>
    </div>
  );
}
