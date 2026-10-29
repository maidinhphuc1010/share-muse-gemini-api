import { useEffect, useState } from "react";
import { Button } from "../components/common";
import {
  downloadVideo,
  getVideo,
  mergeProjectVideos,
  videoError,
  type VideoTask,
} from "../services/api/videos";

export function ProjectMerge({
  projectId,
  taskIds,
}: {
  projectId: string;
  taskIds: string[];
}) {
  const storageKey = `workflow-merge-v1-${projectId}`;
  const [task, setTask] = useState<VideoTask | null>(() => {
    try {
      return JSON.parse(localStorage.getItem(storageKey) || "null");
    } catch {
      return null;
    }
  });
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const busy =
    !!task && ["queued", "running", "submitting"].includes(task.status);
  const taskId = task?.id;
  useEffect(() => {
    if (!busy || !taskId) return;
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    async function poll() {
      try {
        const next = await getVideo(taskId!, controller.signal);
        if (controller.signal.aborted) return;
        setTask(next);
        try {
          localStorage.setItem(storageKey, JSON.stringify(next));
        } catch {
          setError("Không lưu được trạng thái ghép vào trình duyệt.");
        }
        if (["queued", "running", "submitting"].includes(next.status))
          timer = setTimeout(() => void poll(), 2500);
      } catch (reason) {
        if (!controller.signal.aborted) {
          setError(videoError(reason));
          timer = setTimeout(() => void poll(), 5000);
        }
      }
    }
    void poll();
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [busy, taskId, storageKey]);
  return (
    <div className="workflow-playlist">
      <Button
        disabled={sending || busy || !taskIds.length}
        onClick={async () => {
          setSending(true);
          setError("");
          try {
            const next = await mergeProjectVideos(projectId, taskIds);
            setTask(next);
            try {
              localStorage.setItem(storageKey, JSON.stringify(next));
            } catch {
              setError("Task đã gửi nhưng không lưu được lịch sử ghép.");
            }
          } catch (reason) {
            setError(videoError(reason));
          } finally {
            setSending(false);
          }
        }}
      >
        {sending || busy
          ? "Đang ghép video…"
          : `Xuất MP4 (${taskIds.length} cảnh)`}
      </Button>
      {error && <p role="alert">{error}</p>}
      {task?.error?.message && <p role="alert">{task.error.message}</p>}
      {task?.result?.url && (
        <>
          <video controls src={task.result.url} preload="metadata" />
          <Button
            variant="secondary"
            onClick={() =>
              void downloadVideo(
                task.result!.url!,
                `project-${projectId}`,
              ).catch((reason) => setError(videoError(reason)))
            }
          >
            Tải video dự án
          </Button>
        </>
      )}
    </div>
  );
}
