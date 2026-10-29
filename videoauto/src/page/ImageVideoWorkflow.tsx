import { useEffect, useMemo, useState } from "react";
import { Search, SlidersHorizontal } from "lucide-react";
import { WorkflowTaskCard } from "./WorkflowTaskCard";
import {
  Button,
  Card,
  Checkbox,
  Select,
  Textarea,
} from "../components/common";
import "./ImageVideoWorkflow.css";
import {
  imageResults,
  imageUrl,
  isImageSucceeded,
  readReference,
  type Reference,
} from "../services/api/images";
import { videoError } from "../services/api/videos";
import { ProjectMerge } from "./ProjectMerge";
import {
  useImageWorkflow,
  watchImageWorkflow,
} from "../services/imageWorkflowStore";
import { useVideoStore, watchVideoTasks } from "../services/videoStore";

const field = "workflow-field";
const panel = "workflow-panel";
const active = (status: string) =>
  ["submitting", "queued", "running"].includes(status);

export default function ImageVideoWorkflow() {
  const [projects, setProjects] = useState<{ id: string; name: string }[]>(
    () => {
      try {
        const value = JSON.parse(
          localStorage.getItem("workflow-projects-v1") || "null",
        );
        if (
          Array.isArray(value) &&
          value.length &&
          value.every(
            (p) => typeof p.id === "string" && typeof p.name === "string",
          )
        )
          return value;
      } catch {
        /* Use initial projects when stored data is invalid. */
      }
      return [1, 2, 3].map((n) => ({ id: `project-${n}`, name: `Dự án ${n}` }));
    },
  );
  const [projectId, setProjectId] = useState(projects[0].id);
  const [source, setSource] = useState<Reference>();
  const [imagePrompt, setImagePrompt] = useState("");
  const [videoPrompt, setVideoPrompt] = useState("");
  const [size, setSize] = useState("9:16");
  const [duration, setDuration] = useState(10);
  const [error, setError] = useState("");
  const [merged, setMerged] = useState<string[]>([]);
  const [taskFilter, setTaskFilter] = useState("all");
  const [taskSearch, setTaskSearch] = useState("");
  const [taskSort, setTaskSort] = useState("newest");
  const [dragging, setDragging] = useState(false);
  const [mergeExpanded, setMergeExpanded] = useState(false);
  const images = useImageWorkflow((state) => state.jobs);
  const imageWarning = useImageWorkflow((state) => state.warning);
  const videos = useVideoStore((state) => state.jobs);
  const videoWarning = useVideoStore((state) => state.storageError);

  useEffect(watchImageWorkflow, []);
  useEffect(watchVideoTasks, []);
  const chainedImageIds = useMemo(
    () =>
      new Set(
        videos.map((job) => job.input.sourceImage?.taskId).filter(Boolean),
      ),
    [videos],
  );

  // Persisted video jobs are checked before starting the next step, preventing duplicates after refresh.
  useEffect(() => {
    for (const job of images) {
      if (
        !job.input.videoPrompt ||
        !job.id ||
        !isImageSucceeded(job) ||
        chainedImageIds.has(job.id)
      )
        continue;
      if (
        useVideoStore
          .getState()
          .jobs.some((video) => video.input.sourceImage?.taskId === job.id)
      )
        continue;
      const url = imageUrl(imageResults(job)[0] ?? {});
      if (!url) continue;
      void useVideoStore.getState().submit({
        projectId: job.input.projectId,
        prompt: job.input.videoPrompt ?? "",
        size: job.input.videoSize ?? job.input.size,
        duration: job.input.videoDuration ?? 10,
        locks: [],
        image: url,
        sourceImage: { taskId: job.id, index: 0, url },
      });
    }
  }, [chainedImageIds, images]);

  async function upload(file?: File) {
    if (!file) return;
    try {
      setSource(await readReference(file));
      setError("");
    } catch (reason) {
      setError(videoError(reason));
    }
  }
  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!source) return setError("Vui lòng tải lên một ảnh gốc.");
    if (!imagePrompt.trim()) return setError("Vui lòng nhập prompt tạo ảnh.");
    if (!videoPrompt.trim())
      return setError("Vui lòng nhập prompt chuyển động video.");
    setError("");
    void useImageWorkflow.getState().submit({
      projectId,
      prompt: imagePrompt,
      size,
      n: 1,
      locks: [],
      references: [source],
      videoPrompt,
      videoSize: size,
      videoDuration: duration,
    });
  }

  const projectImages = images.filter(
    (job) => (job.input.projectId || "legacy") === projectId,
  );
  const completedVideos = videos.filter(
    (job) =>
      !!job.result?.url &&
      (job.input.projectId || "legacy") === projectId &&
      !!job.input.sourceImage,
  );
  const selectedVideos = merged.flatMap((id) =>
    completedVideos.filter((job) => job.localId === id),
  );
  const filteredImages = projectImages.filter((job) => {
    const linked = videos.find((video) => video.input.sourceImage?.taskId === job.id);
    const failed = ["failed", "cancelled", "canceled"].includes(job.status.toLowerCase()) || !!linked && ["failed", "cancelled", "canceled"].includes(linked.status.toLowerCase());
    const done = isImageSucceeded(job) && !!linked && ["succeeded", "success", "completed"].includes(linked.status.toLowerCase());
    const running = active(job.status) || isImageSucceeded(job) && !!job.input.videoPrompt && (!linked || active(linked.status));
    const matches = taskFilter === "all" || taskFilter === "failed" && failed || taskFilter === "completed" && done || taskFilter === "processing" && running;
    const query = taskSearch.trim().toLowerCase();
    return matches && (!query || `${job.id} ${job.input.prompt}`.toLowerCase().includes(query));
  }).sort((a, b) => taskSort === "oldest" ? projectImages.indexOf(b) - projectImages.indexOf(a) : projectImages.indexOf(a) - projectImages.indexOf(b));
  return (
    <section className="workflow-page">
      <header className="workflow-header">
        <div>
          <h1 className="text-3xl font-bold">Ảnh &amp; Video AI</h1>
          <p>Một task: dùng ảnh gốc tạo ảnh mới, rồi tự động tạo video.</p>
        </div>
        <div className="workflow-project-picker">
          <Select
            aria-label="Dự án đang làm việc"
            value={projectId}
            onChange={(e) => { setProjectId(e.target.value); setMerged([]); }}
            options={[...projects.map((p) => ({ value: p.id, label: p.name })), { value: "legacy", label: "Chưa phân dự án (task cũ)" }]}
          />
          <Button variant="secondary" onClick={() => {
            const name = window.prompt("Tên dự án mới", `Dự án ${projects.length + 1}`)?.trim();
            if (!name) return;
            const next = [...projects, { id: crypto.randomUUID(), name }];
            try { localStorage.setItem("workflow-projects-v1", JSON.stringify(next)); setProjects(next); setProjectId(next[next.length - 1].id); setMerged([]); }
            catch { setError("Không lưu được dự án. Kiểm tra bộ nhớ trình duyệt."); }
          }}>+ Dự án</Button>
        </div>
      </header>
      {(error || imageWarning || videoWarning) && (
        <p
          role="alert"
          className="whitespace-pre-wrap bg-red-50 p-3 text-red-700"
        >
          {error || imageWarning || videoWarning}
        </p>
      )}
      <div className="workflow-layout">
        <div className="workflow-config">
          <form className={panel} onSubmit={submit}>
            <div className="workflow-form-heading">
              <div>
                <h2 className="text-xl font-semibold">Tạo ảnh rồi tạo video</h2>
                <p className="workflow-help">Ảnh AI hoàn tất sẽ tự động làm ảnh tham chiếu cho video.</p>
              </div>
            </div>
            <section className="workflow-form-grid">
              <div className="workflow-upload-column">
                <span className="workflow-label">Ảnh gốc</span>
                {source ? (
                  <div className="workflow-source workflow-source--compact">
                    <img src={source.data} alt={source.name} />
                    <div><strong>{source.name}</strong><label className="workflow-replace-button">Thay ảnh<input type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => { void upload(event.target.files?.[0]); event.target.value = ""; }} /></label></div>
                  </div>
                ) : (
                  <label className={`workflow-dropzone${dragging ? " is-dragging" : ""}`} onDragOver={(event) => { event.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={(event) => { event.preventDefault(); setDragging(false); void upload(event.dataTransfer.files[0]); }}>
                    <span>Kéo ảnh vào đây hoặc <strong>chọn ảnh</strong></span><small>PNG, JPG hoặc WEBP · tối đa 10 MB</small>
                    <input type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => { void upload(event.target.files?.[0]); event.target.value = ""; }} />
                  </label>
                )}
              </div>
              <div className="workflow-prompts-column">
                <label>Prompt tạo ảnh<Textarea className={`${field} workflow-prompt-input`} value={imagePrompt} onChange={(event) => setImagePrompt(event.target.value)} placeholder="Mô tả ảnh muốn tạo từ ảnh gốc" /></label>
                <label>Prompt chuyển động video<Textarea className={`${field} workflow-prompt-input`} value={videoPrompt} onChange={(event) => setVideoPrompt(event.target.value)} placeholder="Mô tả chuyển động, góc máy, hành động trong video" /></label>
              </div>
            </section>
            <div className="workflow-settings-row">
            <label>
              Tỷ lệ khung hình
              <Select
                className={field}
                value={size}
                onChange={(event) => setSize(event.target.value)}
              >
                <option value="9:16">9:16 — Dọc</option>
                <option value="16:9">16:9 — Ngang</option>
                <option value="1:1">1:1 — Vuông</option>
              </Select>
            </label>
            <label>
              Thời lượng video
              <Select
                className={field}
                value={duration}
                onChange={(event) => setDuration(Number(event.target.value))}
              >
                <option value={5}>5 giây</option>
                <option value={10}>10 giây</option>
              </Select>
            </label>
            </div>
            <div className="workflow-form-actions">
              <Button
                className="workflow-submit"
                type="submit"
                disabled={images.some((job) => active(job.status))}
              >
                Tạo ảnh &amp; video
              </Button>
              <Button
                className="workflow-clear"
                variant="secondary"
                type="button"
                disabled={!projectImages.length && !videos.some(
                  (job) => (job.input.projectId || "legacy") === projectId,
                )}
                onClick={() => {
                  const projectVideos = videos.filter(
                    (job) => (job.input.projectId || "legacy") === projectId,
                  );
                  if (!window.confirm(
                    `Xóa toàn bộ task ảnh và video khỏi lịch sử của dự án này? Task đang chạy trên Muse sẽ không bị hủy.`,
                  )) return;
                  useImageWorkflow.getState().remove(
                    projectImages.map((job) => job.localId),
                  );
                  useVideoStore.getState().remove(
                    projectVideos.map((job) => job.localId),
                  );
                  setMerged([]);
                }}
              >
                Xóa task dự án
              </Button>
            </div>
          </form>
          <Card className={`${panel} workflow-merge-panel`}>
            <details open={mergeExpanded} onToggle={(event) => setMergeExpanded(event.currentTarget.open)}>
            <summary className="workflow-merge-summary"><strong>Ghép video</strong><span>{completedVideos.length ? `${completedVideos.length} video sẵn sàng` : "Chưa có video hoàn tất"}</span></summary>
            <p className="workflow-help">
              Chỉ hiển thị video của dự án đang chọn. Chọn theo thứ tự muốn
              ghép; dùng cùng tỷ lệ khung hình cho các cảnh.
            </p>
            <Button
              variant="secondary"
              disabled={!completedVideos.length}
              onClick={() =>
                setMerged(
                  [...completedVideos].reverse().map((job) => job.localId),
                )
              }
            >
              Chọn tất cả (cảnh cũ trước)
            </Button>
            <ProjectMerge
              key={projectId}
              projectId={projectId}
              taskIds={selectedVideos.map((job) => job.id)}
            />
            {completedVideos.length ? (
              <div className="workflow-merge-list">
                {completedVideos.map((job) => (
                  <div className="workflow-merge-item" key={job.localId}>
                    <video
                      className="workflow-merge-thumbnail"
                      controls
                      preload="metadata"
                      src={job.result?.url}
                      aria-label={`Xem trước video ${job.id || "đã tạo"}`}
                    />
                    <Checkbox
                      label={`${job.id || "Video"} · ${job.input.duration} giây`}
                      checked={merged.includes(job.localId)}
                      onChange={(event) =>
                        setMerged((old) =>
                          event.target.checked
                            ? [...old, job.localId]
                            : old.filter((id) => id !== job.localId),
                        )
                      }
                    />
                  </div>
                ))}
              </div>
            ) : (
              <p className="workflow-help">Chưa có video hoàn tất để ghép.</p>
            )}
            {selectedVideos.length > 0 && (
              <div className="workflow-playlist">
                <strong>Danh sách ghép ({selectedVideos.length} video)</strong>
                {selectedVideos.map((job) => <video key={job.localId} controls preload="metadata" src={job.result?.url} />)}
              </div>
            )}
            </details>
          </Card>
        </div>
        <section className="workflow-results">
          <div className="workflow-results-heading"><div><h2>Task &amp; kết quả</h2><span>{filteredImages.length} / {projectImages.length} task</span></div><div className="workflow-results-tools"><div className="workflow-search"><Search size={16} /><input aria-label="Tìm task" placeholder="Tìm mã hoặc prompt…" value={taskSearch} onChange={(event) => setTaskSearch(event.target.value)} /></div><Button variant="secondary" className="workflow-delete-project" onClick={() => { if (!window.confirm(`Xóa ${projectImages.length} task và video khỏi lịch sử trình duyệt của dự án này? Task đang chạy trên Muse không bị hủy.`)) return; useImageWorkflow.getState().remove(projectImages.map((job) => job.localId)); useVideoStore.getState().remove(videos.filter((job) => (job.input.projectId || "legacy") === projectId).map((job) => job.localId)); setMerged([]); }}>Xóa task dự án</Button></div></div>
          <div className="workflow-task-toolbar"><div className="workflow-filter-tabs" aria-label="Lọc task">{[["all", "Tất cả"], ["processing", "Đang xử lý"], ["completed", "Hoàn thành"], ["failed", "Thất bại"]].map(([value, label]) => <button type="button" key={value} className={taskFilter === value ? "is-selected" : ""} onClick={() => setTaskFilter(value)}>{label}<span>{value === "all" ? projectImages.length : projectImages.filter((job) => { const v = videos.find((item) => item.input.sourceImage?.taskId === job.id); if (value === "failed") return ["failed", "cancelled", "canceled"].includes(job.status) || !!v && ["failed", "cancelled", "canceled"].includes(v.status); if (value === "completed") return isImageSucceeded(job) && !!v && ["succeeded", "success", "completed"].includes(v.status); return active(job.status) || isImageSucceeded(job) && !!job.input.videoPrompt && (!v || active(v.status)); }).length}</span></button>)}</div><label className="workflow-sort"><SlidersHorizontal size={15} /><select aria-label="Sắp xếp task" value={taskSort} onChange={(event) => setTaskSort(event.target.value)}><option value="newest">Mới nhất</option><option value="oldest">Cũ nhất</option></select></label></div>
          {filteredImages.length ? <div className="workflow-results-grid">{filteredImages.map((job) => <WorkflowTaskCard key={job.localId} imageJob={job} videoJob={videos.find((video) => video.input.sourceImage?.taskId === job.id)} onRetry={() => void useImageWorkflow.getState().submit(job.input)} />)}</div> : <div className="workflow-empty-compact">{projectImages.length ? "Không tìm thấy task phù hợp bộ lọc." : "Chưa có task trong dự án này. Tải ảnh gốc và tạo task đầu tiên."}</div>}
        </section>
      </div>
    </section>
  );
}
