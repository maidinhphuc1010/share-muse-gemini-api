import { useEffect, useState } from "react";
import {
  Badge,
  Button,
  Card,
  Checkbox,
  EmptyState,
  Modal,
  ProgressBar,
  Select,
  Textarea,
} from "../components/common";
import {
  Clapperboard,
  Download,
  Eye,
  Trash2,
  Sparkles,
  Upload,
  Settings2,
} from "lucide-react";
import "./CreateVideoPage.css";
import {
  downloadVideo,
  videoError,
  type VideoInput,
} from "../services/api/videos";
import { useVideoStore, watchVideoTasks } from "../services/videoStore";
const locks = ["nhân vật", "ánh sáng", "trang phục", "bối cảnh", "góc máy"];
const labels: Record<string, string> = {
  submitting: "Đang gửi",
  queued: "Xếp hàng",
  running: "Đang tạo",
  succeeded: "Hoàn thành",
  failed: "Thất bại",
  cancelled: "Đã hủy",
  unknown: "Chưa xác nhận",
};
const active = (status: string) =>
  ["submitting", "queued", "running"].includes(status);
export default function CreateVideoPage() {
  const [input, setInput] = useState<VideoInput>(() => ({
    prompt: "",
    size: "9:16",
    duration: 10,
    locks: sessionStorage.getItem("autovideo-image-input-v1") ? [...locks] : [],
    image: sessionStorage.getItem("autovideo-image-input-v1") || undefined,
  }));
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all");
  const [dragging, setDragging] = useState(false);
  const [fileName, setFileName] = useState("Ảnh tham chiếu đã chọn");
  const jobs = useVideoStore((s) => s.jobs);
  const remove = useVideoStore((s) => s.remove);
  const [detailsId, setDetailsId] = useState<string | null>(null);
  const details = jobs.find((job) => job.localId === detailsId);
  function deleteTasks(ids: string[]) {
    if (
      !ids.length ||
      !window.confirm(
        `Xóa ${ids.length} task khỏi lịch sử trình duyệt? Thao tác này không xóa dữ liệu hoặc hủy tác vụ trên máy chủ.`,
      )
    )
      return;
    remove(ids);
  }
  const visibleJobs = jobs.filter(
    (job) =>
      filter === "all" ||
      (filter === "active" ? active(job.status) : job.status === filter),
  );
  const storageError = useVideoStore((s) => s.storageError);
  const submit = useVideoStore((s) => s.submit);
  useEffect(watchVideoTasks, []);
  function upload(file?: File) {
    if (!file) return;
    if (
      !/^image\/(png|jpeg|webp)$/.test(file.type) ||
      file.size > 10 * 1024 * 1024
    ) {
      setError("Chọn PNG/JPG/WEBP tối đa 10 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setInput((i) => ({
        ...i,
        image: String(reader.result),
        locks: i.image ? i.locks : [...locks],
      }));
      setFileName(file.name);
      setError("");
    };
    reader.onerror = () => setError("Không đọc được ảnh.");
    reader.readAsDataURL(file);
  }
  return (
    <section className="video-page">
      <header className="video-heading">
        <span className="video-heading__icon">
          <Clapperboard size={27} />
        </span>
        <div>
          <p className="video-eyebrow">MUSE AI · VIDEO STUDIO</p>
          <h1>Tạo Video AI</h1>
          <p>Biến ý tưởng và hình ảnh của bạn thành những thước phim.</p>
        </div>
      </header>
      {(error || storageError) && (
        <div role="alert" className="video-alert">
          {error && <p>{error}</p>}
          {storageError && <p>{storageError}</p>}
        </div>
      )}
      <div className="video-layout">
        <Card className="video-form-card">
          <form
            className="video-form"
            onSubmit={(e) => {
              e.preventDefault();
              if (input.prompt.trim() || input.image) void submit(input);
            }}
          >
            <Textarea
              id="video-prompt"
              label="Mô tả video"
              rows={5}
              onInput={(e) => {
                e.currentTarget.style.height = "auto";
                e.currentTarget.style.height = `${e.currentTarget.scrollHeight}px`;
              }}
              value={input.prompt}
              onChange={(e) =>
                setInput((i) => ({ ...i, prompt: e.target.value }))
              }
              placeholder="Ví dụ: Cô gái bước đi giữa vườn hoa, ánh nắng buổi sáng, máy quay di chuyển chậm…"
              hint="Mô tả chủ thể, chuyển động, bối cảnh và góc máy."
            />
            <div
              className={`video-upload${dragging ? " video-upload--active" : ""}`}
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragging(false);
                upload(e.dataTransfer.files[0]);
              }}
            >
              <Upload size={24} />
              <label className="video-upload__label">
                {input.image ? "Thay ảnh tham chiếu" : "Chọn ảnh tham chiếu"}
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={(e) => {
                    upload(e.target.files?.[0]);
                    e.target.value = "";
                  }}
                />
              </label>
              {!input.image && (
                <p className="text-xs">Kéo thả · PNG/JPG/WEBP · ≤10 MB</p>
              )}

              {input.image && (
                <>
                  <img
                    className="max-h-60 w-full object-contain"
                    src={input.image}
                    alt="Ảnh tham chiếu"
                  />
                  <span className="video-file-name" title={fileName}>
                    {fileName}
                  </span>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      setInput((i) => ({ ...i, image: undefined }));
                      sessionStorage.removeItem("autovideo-image-input-v1");
                    }}
                  >
                    Xóa ảnh
                  </Button>
                </>
              )}
            </div>
            <div className="video-config">
              <div className="video-options">
                <Select
                  id="video-size"
                  label="Tỷ lệ khung hình"
                  value={input.size}
                  onChange={(e) =>
                    setInput((i) => ({ ...i, size: e.target.value }))
                  }
                  options={[
                    { value: "9:16", label: "9:16 · Dọc" },
                    { value: "16:9", label: "16:9 · Ngang" },
                    { value: "1:1", label: "1:1 · Vuông" },
                  ]}
                />
                <Select
                  id="video-duration"
                  label="Thời lượng"
                  value={input.duration}
                  onChange={(e) =>
                    setInput((i) => ({
                      ...i,
                      duration: Number(e.target.value),
                    }))
                  }
                  options={[
                    { value: "5", label: "5 giây" },
                    { value: "10", label: "10 giây" },
                  ]}
                />
              </div>
              <details
                className="video-lock-popover"
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    e.currentTarget.open = false;
                    e.currentTarget.querySelector("summary")?.focus();
                  }
                }}
              >
                <summary>
                  <Settings2 size={16} /> Khóa tham chiếu{" "}
                  <span>{input.locks.length}/5 khóa</span>
                </summary>
                <fieldset className="video-locks">
                  <legend>Giữ nhất quán</legend>
                  <div>
                    {locks.map((lock) => (
                      <Checkbox
                        key={lock}
                        label={`Khóa ${lock}`}
                        checked={input.locks.includes(lock)}
                        onChange={(e) =>
                          setInput((i) => ({
                            ...i,
                            locks: e.target.checked
                              ? [...i.locks, lock]
                              : i.locks.filter((v) => v !== lock),
                          }))
                        }
                      />
                    ))}
                  </div>
                  <p>Thêm vào prompt, không đảm bảo khóa tuyệt đối.</p>
                </fieldset>
              </details>
              <Button
                type="submit"
                disabled={!input.prompt.trim() && !input.image}
                className="video-submit"
              >
                <Sparkles size={18} />
                {jobs.some((job) => job.status === "submitting")
                  ? "Đang gửi · Tạo thêm"
                  : "Tạo video"}
              </Button>
            </div>
          </form>
        </Card>
        <section className="video-results">
          <div className="video-stats">
            <Card>
              <span>Tổng số task</span>
              <strong>{jobs.length}</strong>
            </Card>
            <Card>
              <span>Đang xử lý</span>
              <strong>{jobs.filter((j) => active(j.status)).length}</strong>
            </Card>
            <Card>
              <span>Hoàn thành</span>
              <strong>
                {jobs.filter((j) => j.status === "succeeded").length}
              </strong>
            </Card>
          </div>
          <div className="video-results__toolbar">
            <h2 className="video-section-title">
              <Clapperboard size={19} />
              Task và kết quả <Badge>{jobs.length}</Badge>
            </h2>
            <div className="video-results__actions">
              <Button
                type="button"
                variant="secondary"
                danger
                className="video-icon-button video-icon-button--delete"
                title="Xóa toàn bộ task"
                aria-label="Xóa toàn bộ task"
                disabled={!jobs.length}
                onClick={() => deleteTasks(jobs.map((job) => job.localId))}
              >
                <Trash2 size={18} />
              </Button>
              <Select
                aria-label="Lọc task"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                options={[
                  { value: "all", label: "Tất cả task" },
                  { value: "active", label: "Đang xử lý" },
                  { value: "succeeded", label: "Hoàn thành" },
                  { value: "failed", label: "Thất bại" },
                  { value: "unknown", label: "Chưa xác nhận" },
                  { value: "cancelled", label: "Đã hủy" },
                ]}
              />
            </div>
          </div>
          <p className="video-results__note">
            Lịch sử lưu trên trình duyệt và đồng bộ theo ID. Backend chưa có API
            danh sách video.
          </p>
          {!visibleJobs.length && (
            <Card className="video-empty">
              <EmptyState
                icon={<Clapperboard size={38} />}
                title={
                  jobs.length
                    ? "Không có task phù hợp"
                    : "Video đầu tiên bắt đầu từ ý tưởng của bạn"
                }
                description={
                  jobs.length
                    ? "Chọn bộ lọc khác để xem các task đã tạo."
                    : "Nhập mô tả hoặc chọn ảnh tham chiếu và nhấn Tạo video mới. Tiến độ và kết quả sẽ xuất hiện tại đây."
                }
                action={
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      if (jobs.length) setFilter("all");
                      else document.getElementById("video-prompt")?.focus();
                    }}
                  >
                    {jobs.length ? "Xem tất cả task" : "Bắt đầu sáng tạo"}
                  </Button>
                }
              />
            </Card>
          )}
          <div className="video-job-list">
            {visibleJobs.map((job) => (
              <Card key={job.localId} className="video-job">
                <Badge
                  variant={
                    job.status === "succeeded"
                      ? "success"
                      : job.status === "failed"
                        ? "danger"
                        : active(job.status)
                          ? "info"
                          : "warning"
                  }
                >
                  {labels[job.status] ?? job.status}
                </Badge>
                <p className="break-all text-xs">
                  {job.id || job.localId} · {job.input.size} ·{" "}
                  {job.input.duration} giây
                </p>
                <p
                  className="video-job__prompt"
                  title={job.input.prompt || "Tạo chuyển động từ ảnh"}
                >
                  {job.input.prompt || "Tạo chuyển động từ ảnh"}
                </p>
                {(job.input.prompt || "Tạo chuyển động từ ảnh").length >
                  100 && (
                  <button
                    type="button"
                    className="video-job__prompt-more"
                    onClick={() => setDetailsId(job.localId)}
                    aria-label="Xem đầy đủ prompt"
                  >
                    Xem thêm
                  </button>
                )}
                {job.input.image && (
                  <img
                    src={job.input.image}
                    alt="Ảnh đầu vào task"
                    className="video-job__thumbnail h-24 w-24 rounded-lg object-cover"
                  />
                )}
                <p className="text-xs">
                  Giữ: {job.input.locks.join(", ") || "Không"}
                </p>
                {typeof job.progress === "number" && (
                  <ProgressBar value={job.progress} showValue label="Tiến độ" />
                )}
                {job.notice && (
                  <p role="status" className="text-red-600">
                    {job.notice}
                  </p>
                )}
                {job.result?.url && (
                  <>
                    <video
                      controls
                      preload="metadata"
                      src={job.result.url}
                      className="max-h-96 w-full rounded-lg bg-black"
                    />
                  </>
                )}
                <div className="video-job__actions">
                  {job.result?.url && (
                    <Button
                      type="button"
                      variant="secondary"
                      className="video-icon-button video-icon-button--download"
                      title="Tải video"
                      aria-label="Tải video"
                      onClick={() => {
                        void downloadVideo(job.result!.url!, job.id).catch(
                          (e) => setError(videoError(e)),
                        );
                      }}
                    >
                      <Download size={18} />
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="secondary"
                    className="video-icon-button video-icon-button--details"
                    title="Xem chi tiết"
                    aria-label="Xem chi tiết"
                    onClick={() => setDetailsId(job.localId)}
                  >
                    <Eye size={18} />
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    danger
                    className="video-icon-button video-icon-button--delete"
                    title="Xóa task"
                    aria-label="Xóa task"
                    onClick={() => deleteTasks([job.localId])}
                  >
                    <Trash2 size={18} />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </section>
      </div>
      {details && (
        <Modal
          open
          onClose={() => setDetailsId(null)}
          title="Chi tiết task video"
        >
          <div className="video-task-details">
            <p>
              <strong>Task ID:</strong> {details.id || details.localId}
            </p>
            <p>
              <strong>Trạng thái:</strong>{" "}
              {labels[details.status] ?? details.status}
            </p>
            <p>
              <strong>Thời gian tạo:</strong>{" "}
              {new Date(details.created).toLocaleString("vi-VN")}
            </p>
            <p>
              <strong>Prompt:</strong>{" "}
              {details.input.prompt || "Tạo chuyển động từ ảnh"}
            </p>
            <p>
              <strong>Tỷ lệ:</strong> {details.input.size} ·{" "}
              <strong>Thời lượng:</strong> {details.input.duration} giây
            </p>
            <p>
              <strong>Giữ nhất quán:</strong>{" "}
              {details.input.locks.join(", ") || "Không"}
            </p>
            {typeof details.progress === "number" && (
              <p>
                <strong>Tiến độ:</strong> {details.progress}%
              </p>
            )}
            {details.notice && <p role="status">{details.notice}</p>}
            {details.input.image && (
              <img src={details.input.image} alt="Ảnh tham chiếu" />
            )}
            {details.result?.url && (
              <video controls preload="metadata" src={details.result.url} />
            )}
          </div>
        </Modal>
      )}
    </section>
  );
}
