import axios from "axios";
export const affBase = (
  import.meta.env.VITE_MUSE_API_URL ?? "http://localhost:18610"
).replace(/\/$/, "");
export type AffScene = {
  image_prompt: string;
  video_prompt: string;
  dialogue: string;
  duration: number;
  products: number[];
  image?: string;
  video?: string;
};
export type AffJob = {
  id: string;
  name: string;
  status: string;
  stage: string;
  progress: number;
  error: string;
  pause: boolean;
  script: { scenes: AffScene[] } | null;
  scenes: AffScene[];
  output?: string;
};
export type AffInput = {
  character: string;
  products: string[];
  product_url: string;
  name: string;
  facts: string;
  duration: number;
  ratio: string;
  style: string;
  automatic: boolean;
};
export type AffCapabilities = {
  driver: string;
  gemini_configured: boolean;
  ffmpeg: boolean;
  tts: boolean;
  music: boolean;
};
const client = axios.create({ baseURL: `${affBase}/v1/aff`, timeout: 60000 });
client.interceptors.request.use((config) => {
  const key = sessionStorage.getItem("muse-admin-key")?.trim();
  if (!key) throw new Error("Kết nối tại trang Tài khoản Muse trước.");
  config.headers.Authorization = `Bearer ${key}`;
  return config;
});
export const affApi = {
  list: async (signal?: AbortSignal) =>
    (await client.get<AffJob[]>("/jobs", { signal })).data,
  capabilities: async (signal?: AbortSignal) =>
    (await client.get<AffCapabilities>("/capabilities", { signal })).data,
  create: async (input: AffInput) =>
    (await client.post<AffJob>("/jobs", input)).data,
  action: async (id: string, action: string, script?: unknown) =>
    (
      await client.post<AffJob>(`/jobs/${encodeURIComponent(id)}/actions`, {
        action,
        script,
      })
    ).data,
};
export function affError(error: unknown) {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status;
    const data = error.response?.data as
      { detail?: unknown; error?: { message?: string } } | undefined;
    if (status === 401 || status === 403)
      return "Auto AFF yêu cầu khóa quản trị Muse. Kết nối lại tại trang Tài khoản Muse bằng admin key.";
    if (status === 404 && (!data?.detail || data.detail === "Not Found"))
      return `Backend tại ${affBase} chưa nạp API /v1/aff. Khởi động lại Muse2API từ mã nguồn có Auto AFF, sau đó bấm Thử kết nối lại.`;
    if (typeof data?.detail === "string") return data.detail;
    if (data?.error?.message) return data.error.message;
    return `Lỗi API ${status ?? "kết nối"}. Không tự gửi lại để tránh trùng job.`;
  }
  return error instanceof Error ? error.message : "Không xử lý được yêu cầu";
}
export const affMedia = (name: string) =>
  `${affBase}/v1/media/${encodeURIComponent(name)}`;
