import { create } from "zustand";
import {
  createVideo,
  getVideo,
  taskError,
  videoError,
  validateVideoInput,
  isVideoPollingErrorTerminal,
  type VideoInput,
  type VideoTask,
} from "./api/videos";
export type VideoJob = VideoTask & {
  localId: string;
  input: VideoInput;
  created: number;
  notice?: string;
};
const KEY = "autovideo-video-jobs-v1";
function restore(): VideoJob[] {
  try {
    const data: unknown = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    if (!Array.isArray(data)) return [];
    return data
      .filter(
        (x): x is VideoJob =>
          !!x &&
          typeof x.localId === "string" &&
          typeof x.id === "string" &&
          typeof x.input?.prompt === "string" &&
          Array.isArray(x.input?.locks),
      )
      .map((x) =>
        x.status === "submitting"
          ? {
              ...x,
              status: "unknown",
              notice:
                "Chưa nhận được ID trước khi tải lại. Kiểm tra backend trước khi tạo lại.",
            }
          : x,
      );
  } catch {
    return [];
  }
}
type State = {
  jobs: VideoJob[];
  storageError: string;
  submit: (input: VideoInput) => Promise<void>;
  patch: (localId: string, update: Partial<VideoJob>) => void;
  remove: (localIds: string[]) => void;
};
export const useVideoStore = create<State>((set, get) => ({
  jobs: restore(),
  storageError: "",
  remove: (localIds) => {
    const ids = new Set(localIds);
    const jobs = get().jobs.filter((job) => !ids.has(job.localId));
    try {
      localStorage.setItem(KEY, JSON.stringify(jobs));
    } catch {
      set({ storageError: "Không thể lưu thao tác xóa. Vui lòng thử lại." });
      return;
    }
    ids.forEach((id) => {
      workers.get(id)?.abort();
      workers.delete(id);
    });
    set({ jobs, storageError: "" });
  },
  patch: (localId, update) =>
    set({
      jobs: get().jobs.map((j) =>
        j.localId === localId ? { ...j, ...update } : j,
      ),
    }),
  submit: async (input) => {
    if (get().jobs.some((job) => job.status === "submitting")) return;
    const localId = crypto.randomUUID();
    const snapshot = { ...input, locks: [...input.locks] };
    set({
      jobs: [
        {
          localId,
          id: "",
          status: "submitting",
          input: snapshot,
          created: Date.now(),
        },
        ...get().jobs,
      ],
    });
    try {
      validateVideoInput(snapshot);
    } catch (error) {
      get().patch(localId, { status: "failed", notice: videoError(error) });
      return;
    }
    try {
      get().patch(localId, {
        ...(await createVideo(snapshot)),
        notice: undefined,
      });
    } catch (error) {
      get().patch(localId, { status: "unknown", notice: videoError(error) });
    }
  },
}));
useVideoStore.subscribe((state, previous) => {
  if (state.jobs === previous.jobs) return;
  try {
    localStorage.setItem(KEY, JSON.stringify(state.jobs));
  } catch {
    useVideoStore.setState({
      storageError:
        "Không đủ bộ nhớ lưu lịch sử. Task vẫn chạy trên backend; không tải lại trang để tránh mất ID.",
    });
  }
});
// One worker per task; all mounted consumers share this registry.
const workers = new Map<string, AbortController>();
let consumers = 0;
let unsubscribe: (() => void) | undefined;
const active = (j: VideoJob) =>
  !!j.id && ["queued", "running"].includes(j.status);
function sync() {
  for (const job of useVideoStore.getState().jobs.filter(active)) {
    if (workers.has(job.localId)) continue;
    const controller = new AbortController();
    workers.set(job.localId, controller);
    void (async () => {
      try {
        while (!controller.signal.aborted) {
          try {
            const task = await getVideo(job.id, controller.signal);
            if (controller.signal.aborted) break;
            useVideoStore.getState().patch(job.localId, {
              ...task,
              notice: task.status === "failed" ? taskError(task) : undefined,
            });
            if (!["queued", "running"].includes(task.status)) break;
          } catch (error) {
            if (controller.signal.aborted) break;
            const terminal = isVideoPollingErrorTerminal(error);
            useVideoStore.getState().patch(job.localId, {
              notice: videoError(error),
              ...(terminal ? { status: "unknown" } : {}),
            });
            if (terminal) break;
          }
          await new Promise<void>((resolve) => {
            const finish = () => {
              clearTimeout(timer);
              controller.signal.removeEventListener("abort", finish);
              resolve();
            };
            const timer = setTimeout(finish, 3000);
            controller.signal.addEventListener("abort", finish, { once: true });
          });
        }
      } finally {
        if (workers.get(job.localId) === controller)
          workers.delete(job.localId);
      }
    })();
  }
}
export function watchVideoTasks() {
  if (++consumers === 1) {
    unsubscribe = useVideoStore.subscribe(sync);
    sync();
  }
  return () => {
    if (--consumers === 0) {
      unsubscribe?.();
      workers.forEach((c) => c.abort());
      workers.clear();
    }
  };
}
