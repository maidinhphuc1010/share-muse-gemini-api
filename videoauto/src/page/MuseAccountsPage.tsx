import { useEffect, useState } from "react";
import axios from "axios";
import {
  AlertCircle,
  CheckCircle2,
  HeartPulse,
  Plus,
  RefreshCw,
  Trash2,
} from "lucide-react";

type Account = {
  id: string;
  label?: string;
  status?: string;
  enabled?: boolean;
  last_error?: string | null;
  meta?: {
    quota?: {
      checked_at?: number | null;
      plan?: string | null;
      weekly_used_pct?: number | null;
      resets_at?: number | null;
      extra_left?: number | null;
      found?: boolean;
      source?: string;
    };
    vm_state?: string;
    session_status?: string;
  };
};
type AccountQuota = NonNullable<Account["meta"]>["quota"];
const API_URL = import.meta.env.VITE_MUSE_API_URL ?? "http://localhost:18610";
const ACCOUNTS_CACHE_KEY = "muse-accounts-cache";

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

export default function MuseAccountsPage() {
  const [key, setKey] = useState(
    () => sessionStorage.getItem("muse-admin-key") ?? "",
  );
  const [accounts, setAccounts] = useState<Account[]>(readCachedAccounts);
  useEffect(() => {
    localStorage.setItem(ACCOUNTS_CACHE_KEY, JSON.stringify(accounts));
  }, [accounts]);
  const [label, setLabel] = useState("");
  const [cookies, setCookies] = useState("");
  const [busy, setBusy] = useState(false);
  const [checkingId, setCheckingId] = useState<string | null>(null);
  const [quotas, setQuotas] = useState<Record<string, AccountQuota>>({});
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
      sessionStorage.setItem("muse-admin-key", key.trim());
      const data = await api("/admin/accounts");
      setAccounts(data.data ?? []);
      setQuotas(
        Object.fromEntries(
          (data.data ?? []).flatMap((account: Account) =>
            account.meta?.quota
              ? [[account.id, account.meta.quota]]
              : [],
          ),
        ),
      );
      setMessage("Đã tải danh sách tài khoản.");
    } catch (e) {
      setError(
        axios.isAxiosError(e)
          ? String(
              e.response?.data?.detail ??
                e.response?.data?.error?.message ??
                e.message,
            )
          : String(e),
      );
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
      let parsed:
        string | Record<string, string> | Array<Record<string, unknown>> =
        cookies.trim();
      if (parsed.startsWith("{") || parsed.startsWith("["))
        parsed = JSON.parse(parsed);
      await api("/admin/accounts", "POST", {
        label,
        cookies: parsed,
        enabled: true,
      });
      setLabel("");
      setCookies("");
      setAddModalOpen(false);
      setMessage("Đã thêm tài khoản. Tải danh sách để đồng bộ tài khoản mới.");
    } catch (e) {
      setError(
        axios.isAxiosError(e)
          ? String(
              e.response?.data?.detail ??
                e.response?.data?.error?.message ??
                e.message,
            )
          : e instanceof Error
            ? e.message
            : String(e),
      );
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
      setError(
        axios.isAxiosError(e)
          ? String(
              e.response?.data?.detail ??
                e.response?.data?.error?.message ??
                e.message,
            )
          : String(e),
      );
    } finally {
      setBusy(false);
    }
  }
  async function checkQuota(id: string, refresh = false) {
    if (busy) return;
    if (!key.trim()) {
      setError("Nhập khóa quản trị để kiểm tra quota tài khoản.");
      return;
    }
    setBusy(true);
    setCheckingId(id);
    setError("");
    setMessage("");
    try {
      const result = await api(
        `/admin/accounts/${encodeURIComponent(id)}/quota${refresh ? "?refresh=1" : ""}`,
      );
      const quota = result.quota as AccountQuota | undefined;
      if (!quota) throw new Error("Muse API không trả về dữ liệu quota.");
      setQuotas((items) => ({ ...items, [id]: quota }));
      setAccounts((items) =>
        items.map((account) =>
          account.id === id
            ? { ...account, meta: { ...account.meta, quota } }
            : account,
        ),
      );
      setMessage(
        quota.found
          ? `Đã cập nhật quota tài khoản ${id}.`
          : `Đã kết nối Muse API nhưng chưa tìm thấy thông tin quota cho ${id}.`,
      );
    } catch (e) {
      setError(
        axios.isAxiosError(e)
          ? String(
              e.response?.data?.detail ??
                e.response?.data?.error?.message ??
                e.message,
            )
          : e instanceof Error
            ? e.message
            : String(e),
      );
    } finally {
      setBusy(false);
      setCheckingId(null);
    }
  }

  function formatQuotaDate(value?: number | null) {
    if (value == null) return null;
    const date = new Date(value * 1000);
    return Number.isNaN(date.getTime()) ? null : date.toLocaleDateString("vi-VN");
  }

  return (
    <section className="my-4 w-full min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:my-6 sm:p-6 lg:p-8">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Quản lý tài khoản Muse
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
          placeholder="Nhập admin key Muse"
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
            aria-labelledby="muse-add-title"
            className="w-full max-w-xl rounded-2xl bg-white p-5 shadow-2xl sm:p-7"
          >
            <div className="mb-5 flex items-center justify-between">
              <h2
                id="muse-add-title"
                className="flex items-center gap-2 text-lg font-semibold text-slate-900"
              >
                <Plus size={19} /> Thêm tài khoản Muse
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
              <label className="block text-sm font-medium text-slate-700">
                Cookie Muse
                <textarea
                  className={`${field} min-h-32 font-mono`}
                  value={cookies}
                  onChange={(e) => setCookies(e.target.value)}
                  required
                  placeholder={
                    'Dán Cookie header (name=value; ...) hoặc JSON cookie\nVí dụ: {"session":"..."}'
                  }
                />
                <span className="mt-1 block text-xs text-slate-500">
                  Nhận Cookie header, JSON object hoặc danh sách cookie export
                  từ trình duyệt.
                </span>
              </label>
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
              <th className="px-3 py-3">Quota / chi tiết</th>
              <th className="px-3 py-3 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {accounts.map((account) => (
              <tr key={account.id} className="border-b border-slate-100">
                <td className="px-3 py-3">
                  <div className="font-semibold text-slate-800">
                    {account.label || "Tài khoản"}
                  </div>
                  <div className="mt-1 font-mono text-xs text-slate-500">
                    {account.id}
                  </div>
                </td>
                <td className="px-3 py-3">
                  <span
                    className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${account.enabled === false || /disabled|inactive|off|tắt/i.test(account.status ?? "") ? "bg-slate-100 text-slate-600" : /error|expired|invalid|failed|lỗi|hết hạn/i.test(account.status ?? "") || account.last_error ? "bg-red-100 text-red-700" : /active|healthy|ready|running|hoạt động/i.test(account.status ?? "") || !account.status ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}
                  >
                    {account.status ||
                      (account.enabled === false ? "Đã tắt" : "Đang hoạt động")}
                  </span>
                </td>
                <td className="max-w-xs px-3 py-3 text-xs">
                  {(() => {
                    const quota = quotas[account.id] ?? account.meta?.quota;
                    const checkedAt = formatQuotaDate(quota?.checked_at);
                    const resetsAt = formatQuotaDate(quota?.resets_at);
                    return (
                      <div className="space-y-1">
                        {account.last_error && (
                          <div className="truncate text-red-600" title={account.last_error}>
                            {account.last_error}
                          </div>
                        )}
                        {quota?.found ? (
                          <>
                            {quota.plan && (
                              <div className="font-medium text-slate-700">
                                {quota.plan}
                              </div>
                            )}
                            {quota.weekly_used_pct != null && (
                              <div className="text-slate-600">
                                Tuần: {quota.weekly_used_pct}% đã dùng
                              </div>
                            )}
                            {quota.extra_left != null && (
                              <div className="text-slate-600">
                                Lượt bổ sung: {quota.extra_left}
                              </div>
                            )}
                            {resetsAt && (
                              <div className="text-slate-500">
                                Đặt lại: {resetsAt}
                              </div>
                            )}
                          </>
                        ) : quota ? (
                          <div className="text-slate-500">Chưa tìm thấy quota</div>
                        ) : (
                          <div className="text-slate-400">Chưa kiểm tra quota</div>
                        )}
                        {checkedAt && (
                          <div className="text-slate-400">
                            Cập nhật: {checkedAt}
                          </div>
                        )}
                        {account.meta?.vm_state && (
                          <div className="text-slate-500">
                            VM: {account.meta.vm_state}
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </td>
                <td className="px-3 py-3">
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => void checkQuota(account.id)}
                      disabled={busy}
                      title="Xem quota (dùng bản lưu nếu còn hạn)"
                      aria-label={`Xem quota ${account.label || account.id}`}
                      aria-busy={busy && checkingId === account.id}
                      className="rounded-md border border-rose-200 p-2 text-rose-600 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <HeartPulse
                        size={15}
                        className={
                          busy && checkingId === account.id
                            ? "animate-pulse"
                            : undefined
                        }
                      />
                    </button>
                    <button
                      type="button"
                      onClick={() => void checkQuota(account.id, true)}
                      disabled={busy}
                      title="Làm mới quota từ Muse"
                      aria-label={`Làm mới quota ${account.label || account.id}`}
                      className="rounded-md border border-slate-200 p-2 text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <RefreshCw size={15} />
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
