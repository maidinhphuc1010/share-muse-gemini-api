import { useEffect, useState } from "react";
import axios from "axios";
import {
  AlertCircle,
  CheckCircle2,
  Heart,
  Plus,
  RefreshCw,
  Trash2,
} from "lucide-react";

type Account = {
  id: string;
  label?: string;
  status?: string;
  email?: string;
  last_error?: string;
};
const API_URL = import.meta.env.VITE_GEMINI_API_URL ?? "http://localhost:5918";
const ACCOUNTS_CACHE_KEY = "gemini-accounts-cache";

function readCachedAccounts(): Account[] {
  try {
    const cached = localStorage.getItem(ACCOUNTS_CACHE_KEY);
    return cached ? (JSON.parse(cached) as Account[]) : [];
  } catch {
    return [];
  }
}
const field =
  "mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200";

function apiErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const payload = error.response?.data as
      | {
          detail?: unknown;
          error?: { message?: unknown };
          message?: unknown;
        }
      | undefined;
    const detail = payload?.detail;
    if (typeof detail === "string") return detail;
    if (detail && typeof detail === "object" && "error" in detail) {
      const nested = (detail as { error?: { message?: unknown } }).error;
      if (typeof nested?.message === "string") return nested.message;
    }
    if (typeof payload?.error?.message === "string")
      return payload.error.message;
    if (typeof payload?.message === "string") return payload.message;
    return error.message;
  }
  return error instanceof Error ? error.message : String(error);
}

export default function GeminiAccountsPage() {
  const [key, setKey] = useState(
    () => sessionStorage.getItem("gemini-admin-key") ?? "",
  );
  const [accounts, setAccounts] = useState<Account[]>(readCachedAccounts);
  useEffect(() => {
    localStorage.setItem(ACCOUNTS_CACHE_KEY, JSON.stringify(accounts));
  }, [accounts]);
  const [label, setLabel] = useState("");
  const [psid, setPsid] = useState("");
  const [psidts, setPsidts] = useState("");
  const [busy, setBusy] = useState(false);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  async function api(path: string, method = "GET", data?: unknown) {
    const response = await axios.request({
      baseURL: API_URL.replace(/\/$/, ""),
      url: path,
      method,
      data,
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      timeout: 20000,
    });
    return response.data;
  }
  async function load() {
    if (!key.trim()) {
      setError("Nhập khóa quản trị để kết nối API.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      sessionStorage.setItem("gemini-admin-key", key.trim());
      const data = await api("/admin/accounts");
      setAccounts(data.accounts ?? []);
      setMessage("Đã tải danh sách tài khoản.");
    } catch (e) {
      setError(apiErrorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  async function add(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await api("/admin/accounts", "POST", {
        label,
        psid: psid.trim(),
        psidts: psidts.trim(),
      });
      const data = await api("/admin/accounts");
      setAccounts(data.accounts ?? []);
      setLabel("");
      setPsid("");
      setPsidts("");
      setAddModalOpen(false);
      setMessage("Đã thêm tài khoản. Tải danh sách để đồng bộ tài khoản mới.");
    } catch (e) {
      setError(apiErrorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  async function remove(id: string) {
    if (!confirm("Bạn có chắc muốn xóa tài khoản này?")) return;
    setBusy(true);
    setError("");
    try {
      await api(`/admin/accounts/${encodeURIComponent(id)}`, "DELETE");
      setAccounts((items) => items.filter((item) => item.id !== id));
      setMessage("Đã xóa tài khoản.");
    } catch (e) {
      setError(apiErrorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  async function check(id: string) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await api(`/admin/accounts/${encodeURIComponent(id)}/check`);
      const data = await api("/admin/accounts");
      setAccounts(data.accounts ?? []);
      setMessage("Đã kiểm tra trạng thái tài khoản và cập nhật danh sách.");
    } catch (e) {
      setError(apiErrorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="my-4 w-full min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:my-6 sm:p-6 lg:p-8">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Quản lý tài khoản Gemini
          </h1>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setAddModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white"
          >
            <Plus size={16} /> Thêm tài khoản
          </button>
          <button
            onClick={load}
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50"
          >
            <RefreshCw size={16} /> Tải danh sách
          </button>
        </div>
      </header>
      <label className="mb-5 block rounded-xl bg-slate-50 p-4 text-sm font-medium text-slate-700">
        Khóa quản trị API
        <input
          className={field}
          type="password"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          placeholder="Nhập admin key Gemini"
          autoComplete="off"
        />
      </label>
      {addModalOpen && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !busy)
              setAddModalOpen(false);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="gemini-add-title"
            className="w-full max-w-xl rounded-2xl bg-white p-5 shadow-2xl sm:p-7"
          >
            <div className="mb-5 flex items-center justify-between">
              <h2
                id="gemini-add-title"
                className="flex items-center gap-2 text-lg font-semibold text-slate-900"
              >
                <Plus size={19} /> Thêm tài khoản Gemini
              </h2>
              <button
                type="button"
                onClick={() => setAddModalOpen(false)}
                disabled={busy}
                aria-label="Đóng"
                className="rounded-lg px-3 py-2 text-slate-500 hover:bg-slate-100"
              >
                ✕
              </button>
            </div>
            <form onSubmit={add} className="space-y-4">
              <label className="block text-sm font-medium text-slate-700">
                Tên hiển thị
                <input
                  className={field}
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder="Ví dụ: Tài khoản cá nhân"
                />
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-sm font-medium text-slate-700">
                  PSID
                  <input
                    className={field}
                    value={psid}
                    onChange={(e) => setPsid(e.target.value)}
                    required
                    type="password"
                    autoComplete="off"
                    placeholder="Cookie __Secure-1PSID"
                  />
                </label>
                <label className="block text-sm font-medium text-slate-700">
                  PSIDTS (không bắt buộc)
                  <input
                    className={field}
                    value={psidts}
                    onChange={(e) => setPsidts(e.target.value)}
                    type="password"
                    autoComplete="off"
                    placeholder="Cookie __Secure-1PSIDTS"
                  />
                </label>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setAddModalOpen(false)}
                  disabled={busy}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
                >
                  Hủy
                </button>
                <button
                  disabled={busy || !key.trim()}
                  className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                >
                  <Plus size={16} /> Thêm tài khoản
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="mb-4 flex gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700"
        >
          <AlertCircle size={18} />
          {error}
        </div>
      )}
      {message && (
        <div
          role="status"
          className="mb-4 flex gap-2 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700"
        >
          <CheckCircle2 size={18} />
          {message}
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[600px] text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-xs uppercase text-slate-500">
              <th className="px-3 py-3">Tài khoản</th>
              <th className="px-3 py-3">Trạng thái</th>
              <th className="px-3 py-3">Chi tiết</th>
              <th className="px-3 py-3 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {accounts.map((account) => (
              <tr key={account.id} className="border-b border-slate-100">
                <td className="px-3 py-3">
                  <div className="font-semibold text-slate-800">
                    {account.label || account.email || "Tài khoản"}
                  </div>
                  <div className="mt-1 font-mono text-xs text-slate-500">
                    {account.id}
                  </div>
                </td>
                <td className="px-3 py-3">
                  <span
                    className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${/disabled|inactive|off/i.test(account.status ?? "") ? "bg-slate-100 text-slate-600" : /error|expired|invalid|failed|lỗi|hết hạn/i.test(account.status ?? "") || account.last_error ? "bg-red-100 text-red-700" : /active|healthy|ready|running|hoạt động/i.test(account.status ?? "") ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}
                  >
                    {account.status || "Không rõ"}
                  </span>
                </td>
                <td className="max-w-xs truncate px-3 py-3 text-xs text-red-600">
                  {account.last_error || "—"}
                </td>
                <td className="px-3 py-3">
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => check(account.id)}
                      disabled={busy}
                      title="Kiểm tra trạng thái tài khoản"
                      aria-label="Kiểm tra trạng thái tài khoản"
                      className="rounded-md border border-pink-200 p-2 text-pink-600 transition-colors hover:bg-pink-50"
                    >
                      <Heart size={15} />
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(account.id)}
                      disabled={busy}
                      title="Xóa"
                      className="rounded-md border border-red-200 p-2 text-red-600"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {accounts.length === 0 && (
              <tr>
                <td
                  colSpan={4}
                  className="px-3 py-10 text-center text-slate-500"
                >
                  Chưa có dữ liệu. Nhập khóa quản trị và tải danh sách.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
