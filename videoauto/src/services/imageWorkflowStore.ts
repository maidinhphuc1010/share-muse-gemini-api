import { create } from "zustand";
import {
  createImage,
  getImage,
  imageError,
  isImagePollingErrorTerminal,
  type ImageInput,
  type ImageTask,
} from "./api/images";

export type ImageJob = ImageTask & {
  localId: string;
  input: ImageInput;
  notice?: string;
};
const KEY = "autovideo-workflow-images-v1";
function restore(): ImageJob[] {
  try {
    const data: unknown = JSON.parse(localStorage.getItem(KEY) || "[]");
    if (!Array.isArray(data)) return [];
    return data
      .filter(
        (j): j is ImageJob =>
          !!j &&
          typeof j.localId === "string" &&
          typeof j.id === "string" &&
          typeof j.input?.prompt === "string" &&
          Array.isArray(j.input?.references) &&
          Array.isArray(j.input?.locks),
      )
      .map((j) =>
        j.status === "submitting"
          ? {
              ...j,
              status: "unknown",
              notice:
                "Chưa nhận được ID trước khi tải lại. Kiểm tra backend trước khi gửi lại.",
            }
          : j,
      );
  } catch {
    return [];
  }
}
type State = {
  jobs: ImageJob[];
  warning: string;
  patch: (id: string, data: Partial<ImageJob>) => void;
  remove: (localIds: string[]) => void;
  submit: (input: ImageInput) => Promise<void>;
};
export const useImageWorkflow = create<State>((set, get) => ({
  jobs: restore(),
  warning: "",
  patch: (id, data) =>
    set({
      jobs: get().jobs.map((j) => (j.localId === id ? { ...j, ...data } : j)),
    }),
  remove: (localIds) => {
    const ids = new Set(localIds);
    set({ jobs: get().jobs.filter((job) => !ids.has(job.localId)) });
  },
  submit: async (input) => {
    if (get().jobs.some((job) => job.status === "submitting")) return;
    const localId = crypto.randomUUID();
    const snapshot = {
      ...input,
      locks: [...input.locks],
      references: input.references.map((r) => ({ ...r })),
    };
    set({
      jobs: [
        { localId, id: "", status: "submitting", input: snapshot },
        ...get().jobs,
      ],
    });
    try {
      get().patch(localId, await createImage(snapshot));
    } catch (error) {
      get().patch(localId, {
        status: "unknown",
        notice: imageError(error),
      });
    }
  },
}));
useImageWorkflow.subscribe((state, prev) => {
  if (state.jobs === prev.jobs) return;
  try {
    localStorage.setItem(KEY, JSON.stringify(state.jobs));
  } catch {
    useImageWorkflow.setState({
      warning:
        "Không đủ bộ nhớ lưu lịch sử ảnh. Giữ trang mở để không mất ID task.",
    });
  }
});
export function watchImageWorkflow() {
  const controllers = new Map<string, AbortController>();
  const sync = () => {
    for (const job of useImageWorkflow.getState().jobs) {
      if (
        !job.id ||
        !["queued", "running"].includes(job.status) ||
        controllers.has(job.localId)
      )
        continue;
      const controller = new AbortController();
      controllers.set(job.localId, controller);
      void (async () => {
        try {
          while (!controller.signal.aborted) {
            try {
              const task = await getImage(job.id, controller.signal);
              if (controller.signal.aborted) return;
              useImageWorkflow.getState().patch(job.localId, {
                ...task,
                notice:
                  task.status === "failed"
                    ? (task.error?.message ??
                      "Backend không tạo được ảnh. Kiểm tra tài khoản và hạn mức.")
                    : undefined,
              });
              if (!["queued", "running"].includes(task.status)) return;
            } catch (error) {
              if (controller.signal.aborted) return;
              useImageWorkflow.getState().patch(job.localId, {
                notice: imageError(error),
                ...(isImagePollingErrorTerminal(error)
                  ? { status: "unknown" }
                  : {}),
              });
              if (isImagePollingErrorTerminal(error)) return;
            }
            await new Promise<void>((resolve) => {
              const finish = () => {
                clearTimeout(timer);
                controller.signal.removeEventListener("abort", finish);
                resolve();
              };
              const timer = setTimeout(finish, 3000);
              controller.signal.addEventListener("abort", finish, {
                once: true,
              });
            });
          }
        } finally {
          controllers.delete(job.localId);
        }
      })();
    }
  };
  const unsubscribe = useImageWorkflow.subscribe(sync);
  sync();
  return () => {
    unsubscribe();
    controllers.forEach((c) => c.abort());
    controllers.clear();
  };
}
