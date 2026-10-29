import axios from "axios";
export type Reference = { id: string; name: string; data: string };
export type ImageInput = {
  projectId?: string;
  prompt: string;
  size: string;
  n: number;
  locks: string[];
  references: Reference[];
  /** Settings for the video step automatically started after this image task. */
  videoPrompt?: string;
  videoSize?: string;
  videoDuration?: number;
};
export type ImageResult = { url?: string; b64_json?: string };
export type ImageTask = {
  id: string;
  status: string;
  progress?: number;
  result?: { data?: ImageResult[] };
  /** OpenAI-compatible task responses may expose the result directly. */
  data?: ImageResult[];
  url?: string;
  b64_json?: string;
  error?: { code?: string; message?: string };
};

const successfulStatuses = new Set(["succeeded", "success", "completed"]);
const failedStatuses = new Set(["failed", "cancelled", "canceled"]);
export function isImageSucceeded(task: ImageTask) {
  return successfulStatuses.has(task.status.toLowerCase());
}
export function isImageFailed(task: ImageTask) {
  return failedStatuses.has(task.status.toLowerCase());
}
export function imageResults(task: ImageTask): ImageResult[] {
  const result = task.result;
  if (Array.isArray(result)) return result;
  if (result?.data?.length) return result.data;
  if (task.data?.length) return task.data;
  return task.url || task.b64_json
    ? [{ url: task.url, b64_json: task.b64_json }]
    : [];
}
const client = axios.create({
  baseURL: (
    import.meta.env.VITE_MUSE_API_URL ?? "http://localhost:18610"
  ).replace(/\/$/, ""),
  timeout: 30000,
});
function headers() {
  const key = sessionStorage.getItem("muse-admin-key")?.trim();
  if (!key)
    throw new Error("Hãy kết nối tại trang Tài khoản Muse trước khi tạo ảnh.");
  return { Authorization: `Bearer ${key}` };
}
export function imageError(error: unknown): string {
  if (!axios.isAxiosError(error))
    return error instanceof Error ? error.message : "Không thể xử lý ảnh.";
  const status = error.response?.status;
  if (status === 401 || status === 403)
    return "Khóa Muse không hợp lệ. Kết nối lại tại trang Tài khoản Muse.";
  if (status === 404)
    return "Không tìm thấy task hoặc endpoint tạo ảnh. Kiểm tra địa chỉ Muse API.";
  const body = error.response?.data as
    { error?: { message?: string } } | undefined;
  if (body?.error?.message) return body.error.message;
  if (status === 429) return "Muse đang giới hạn yêu cầu hoặc hết quota.";
  return "Không nhận được phản hồi Muse. Không tự gửi lại yêu cầu tạo ảnh để tránh tạo trùng.";
}
export function isImagePollingErrorTerminal(error: unknown) {
  return (
    axios.isAxiosError(error) &&
    [401, 403, 404].includes(error.response?.status ?? 0)
  );
}
export async function createImage(input: ImageInput) {
  if (!input.prompt.trim()) throw new Error("Vui lòng nhập prompt tạo ảnh.");
  if (input.references.length > 4)
    throw new Error(
      "Mỗi lượt chỉ nhận tối đa 4 ảnh; hãy chọn lại nhóm sản phẩm.",
    );
  const { data } = await client.post<ImageTask>(
    "/v1/images/generations",
    {
      prompt:
        input.prompt.trim() +
        (input.locks.length
          ? `\nPreserve consistently: ${input.locks.join(", ")}.`
          : ""),
      size: input.size,
      n: input.n,
      image: input.references.map((r) => r.data),
      async: true,
      response_format: "url",
    },
    { headers: headers() },
  );
  if (!data.id)
    throw new Error(
      "Không nhận được ID. Kiểm tra backend trước khi gửi lại để tránh tạo trùng.",
    );
  return data;
}
export type StoredImageTask = ImageTask & {
  kind: string;
  created_at: number;
  request: { prompt?: string; size?: string; n?: number };
};
export async function listImageTasks(signal?: AbortSignal) {
  const { data } = await client.get<{ data: StoredImageTask[] }>(
    "/admin/tasks",
    {
      headers: headers(),
      signal,
      params: { limit: 100 },
    },
  );
  return data.data.filter((task) => task.kind === "image");
}
export async function getImage(id: string, signal: AbortSignal) {
  return (
    await client.get<ImageTask>(
      `/v1/images/generations/${encodeURIComponent(id)}`,
      { headers: headers(), signal },
    )
  ).data;
}
export function imageUrl(image: { url?: string; b64_json?: string }) {
  return (
    image.url ||
    (image.b64_json ? `data:image/png;base64,${image.b64_json}` : "")
  );
}
export async function downloadImage(url: string, name: string) {
  const { data } = await axios.get<Blob>(url, {
    responseType: "blob",
    timeout: 60000,
  });
  const blob = URL.createObjectURL(data);
  const a = document.createElement("a");
  a.href = blob;
  a.download = `${name}.png`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(blob), 10000);
}
export function readReference(
  file: File,
  allowGif = false,
): Promise<Reference> {
  return new Promise((resolve, reject) => {
    if (
      !(
        /^image\/(png|jpeg|webp)$/.test(file.type) ||
        (allowGif && file.type === "image/gif")
      ) ||
      file.size > 10 * 1024 * 1024
    ) {
      reject(new Error(`${file.name}: chỉ nhận PNG/JPG/WEBP tối đa 10 MB.`));
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => reject(new Error(`Không đọc được ${file.name}.`));
    reader.onload = () =>
      resolve({
        id: crypto.randomUUID(),
        name: file.name,
        data: String(reader.result),
      });
    reader.readAsDataURL(file);
  });
}
