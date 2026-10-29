import axios from "axios";

export type VideoInput = {
  projectId?: string;
  prompt: string;
  size: string;
  duration: number;
  image?: string;
  locks: string[];
  sourceImage?: { taskId: string; index: number; url: string };
};
export type VideoTask = {
  id: string;
  status: string;
  progress?: number;
  result?: { url?: string };
  error?: { code?: string; message?: string };
};
const client = axios.create({
  baseURL: (
    import.meta.env.VITE_MUSE_API_URL ?? "http://localhost:18610"
  ).replace(/\/$/, ""),
  timeout: 30000,
});
function auth() {
  const key = sessionStorage.getItem("muse-admin-key")?.trim();
  if (!key)
    throw new Error("Chưa có khóa Muse. Hãy kết nối tại trang Tài khoản Muse.");
  return { Authorization: `Bearer ${key}` };
}
export function validateVideoInput(input: VideoInput) {
  auth();
  if (!input.prompt.trim() && !input.image)
    throw new Error("Nhập mô tả hoặc chọn ảnh tham chiếu.");
  if (
    !Number.isInteger(input.duration) ||
    input.duration < 1 ||
    input.duration > 60
  )
    throw new Error("Backend hỗ trợ thời lượng từ 1 đến 60 giây.");
  if (!["9:16", "16:9", "1:1"].includes(input.size))
    throw new Error("Tỷ lệ video không hợp lệ.");
}
export function isVideoPollingErrorTerminal(error: unknown) {
  return (
    axios.isAxiosError(error) &&
    [401, 403, 404].includes(error.response?.status ?? 0)
  );
}
export async function createVideo(input: VideoInput) {
  validateVideoInput(input);
  const prompt =
    input.prompt.trim() || "Animate the reference image naturally.";
  const response = await client.post<VideoTask>(
    "/v1/videos",
    {
      prompt:
        prompt +
        (input.locks.length
          ? `\nPreserve consistently: ${input.locks.join(", ")}.`
          : ""),
      model: "muse-video",
      size: input.size,
      duration: input.duration,
      image: input.image,
    },
    { headers: auth() },
  );
  if (!response.data.id)
    throw new Error(
      "Backend không trả mã task. Không tự gửi lại để tránh tạo trùng.",
    );
  return response.data;
}
export async function mergeProjectVideos(projectId: string, taskIds: string[]) {
  return (
    await client.post<VideoTask>(
      "/v1/videos/merge",
      {
        project_id: projectId,
        task_ids: taskIds,
      },
      { headers: auth() },
    )
  ).data;
}
export async function getVideo(id: string, signal: AbortSignal) {
  return (
    await client.get<VideoTask>(`/v1/videos/${encodeURIComponent(id)}`, {
      headers: auth(),
      signal,
    })
  ).data;
}
export function videoError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status;
    if (status === 401 || status === 403)
      return "Khóa Muse không hợp lệ hoặc đã hết hạn.";
    if (status === 404)
      return "Không tìm thấy endpoint hoặc task video trên backend. Kiểm tra địa chỉ Muse API.";
    const body = error.response?.data as
      | { error?: { message?: string; code?: string }; detail?: unknown }
      | undefined;
    if (body?.error?.code === "no_account_available")
      return "Không có tài khoản Muse khả dụng. Kiểm tra trang Tài khoản Muse.";
    if (status === 429)
      return "Backend đang giới hạn yêu cầu hoặc tài khoản hết quota. Vui lòng kiểm tra hạn mức.";
    if (body?.error?.message) return body.error.message;
    if (status === 422)
      return "Dữ liệu tạo video không hợp lệ. Kiểm tra prompt, ảnh và thời lượng (1–60 giây).";
    if (typeof body?.detail === "string") return body.detail;
    return "Không kết nối được Muse. Kiểm tra backend; không tự gửi lại yêu cầu tạo video.";
  }
  return error instanceof Error ? error.message : "Không thể xử lý video.";
}
export function taskError(task: VideoTask) {
  const code = `${task.error?.code ?? ""} ${task.error?.message ?? ""}`;
  if (/quota|credit/i.test(code)) return "Tài khoản đã hết hạn mức tạo video.";
  if (/account|session|cookie/i.test(code))
    return "Không có tài khoản khả dụng hoặc phiên Muse đã hết hạn.";
  if (/timeout/i.test(code)) return "Quá thời gian chờ tạo video.";
  if (/interrupt/i.test(code))
    return "Task gián đoạn do backend khởi động lại.";
  return "Backend không hoàn thành video. Bạn có thể tạo lại task.";
}
export async function downloadVideo(url: string, id: string) {
  const response = await axios.get<Blob>(url, {
    responseType: "blob",
    timeout: 120000,
  });
  const objectUrl = URL.createObjectURL(response.data);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = `${id}.mp4`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(objectUrl), 10000);
}
