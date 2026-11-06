import { useState } from "react";
import { KeyRound, Loader2 } from "lucide-react";

import { adminFetch, setAdminKey } from "../api";

/**
 * Simple access gate: prompts for the admin key, verifies it against the
 * backend (via an authenticated call), and stores it for the session.
 */
export function AdminGate({ onUnlock }: { onUnlock: () => void }) {
  const [key, setKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    // Store the key first so adminFetch sends it, then verify with an admin-only call.
    setAdminKey(key.trim());
    try {
      await adminFetch("/admin/orders");
      onUnlock();
    } catch (err: any) {
      setError("That key was not accepted. Please check and try again.");
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-3xl border border-slate-200 bg-white p-8 shadow-xl"
      >
        <div className="mb-6 flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-xl bg-pink-500 text-white">
            <KeyRound className="size-5" />
          </span>
          <div>
            <h1 className="font-display text-lg font-bold">StickerHub Admin</h1>
            <p className="text-xs text-slate-500">Enter your access key to continue</p>
          </div>
        </div>

        <label className="text-xs font-bold text-slate-700">Admin access key</label>
        <input
          type="password"
          autoFocus
          required
          value={key}
          onChange={(e) => setKey(e.target.value)}
          placeholder="••••••••••••"
          className="mt-1 w-full h-11 rounded-xl border border-slate-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
        />

        {error && <p className="mt-3 text-xs font-semibold text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={loading || !key.trim()}
          className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white hover:bg-slate-800 disabled:opacity-50"
        >
          {loading ? <Loader2 className="size-4 animate-spin" /> : null}
          {loading ? "Verifying…" : "Unlock dashboard"}
        </button>
      </form>
    </div>
  );
}
