import { Modal } from "../components/common/modal";
import {
  createImage,
  getImage,
  listImageTasks,
  isImagePollingErrorTerminal,
  downloadImage,
  imageUrl,
  imageError as msg,
  imageResults,
  isImageFailed,
  isImageSucceeded,
  readReference,
} from "../services/api/images";
import {
  AlertCircle,
  Download,
  Eye,
  ImagePlus,
  Sparkles,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import "./CreateImagePage.css";

type Img = { url?: string; b64_json?: string };
type Ref = { name: string; data: string };
type Job = {
  id: string;
  taskId?: string;
  prompt: string;
  size: string;
  n: number;
  created: number;
  status:
    | "submitting"
    | "queued"
    | "running"
    | "succeeded"
    | "failed"
    | "interrupted";
  progress?: number;
  images: Img[];
  error?: string;
};
const KEY = "muse-image-jobs-v1";
const DELETED_KEY = "muse-image-deleted-jobs-v1";
function deletedJobs(): Set<string> {
  try {
    const value: unknown = JSON.parse(
      localStorage.getItem(DELETED_KEY) ?? "[]",
    );
    return new Set(
      Array.isArray(value)
        ? value.filter((id): id is string => typeof id === "string")
        : [],
    );
  } catch {
    return new Set();
  }
}
function isDeleted(job: { id: string; taskId?: string }) {
  const deleted = deletedJobs();
  return deleted.has(job.id) || (!!job.taskId && deleted.has(job.taskId));
}
function rememberDeleted(...ids: string[]) {
  const deleted = deletedJobs();
  ids.forEach((id) => deleted.add(id));
  localStorage.setItem(DELETED_KEY, JSON.stringify([...deleted]));
}
const DATA = imageUrl;
const keep = [
  "Giữ nguyên nhân vật",
  "Giữ nguyên khuôn mặt và tỷ lệ cơ thể",
  "Giữ nguyên trang phục, tóc và phụ kiện",
  "Giữ nguyên ánh sáng, màu sắc và bóng đổ",
  "Giữ nguyên bối cảnh và bố cục",
  "Giữ nguyên sản phẩm, logo và các chi tiết quan trọng",
];
function fromStorage(): Job[] {
  try {
    const stored: Job[] = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    return stored.filter((job) => !isDeleted(job));
  } catch {
    return [];
  }
}
export default function CreateImageFinal() {
  const [prompt, P] = useState("");
  const [size, S] = useState("9:16");
  const [n, N] = useState(1);
  const [refs, R] = useState<Ref[]>([]);
  const [locks, L] = useState<number[]>([]);
  const [jobs, J] = useState<Job[]>(fromStorage);
  const [err, E] = useState("");
  const [busy, B] = useState(false);
  const [modal, M] = useState<{ image: Img; prompt: string } | null>(null);
  const [details, setDetails] = useState<Job | null>(null);
  const [drag, D] = useState(false);
  const replace = useRef<number | null>(null);
  const file = useRef<HTMLInputElement>(null);
  const ctl = useRef(new Map<string, AbortController>());
  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(jobs));
    } catch {
      E("Không thể lưu lịch sử trong trình duyệt.");
    }
  }, [jobs]);
  useEffect(() => {
    const controllers = ctl.current;
    const historyController = new AbortController();
    void listImageTasks(historyController.signal)
      .then((tasks) => {
        if (historyController.signal.aborted) return;
        const restored: Job[] = tasks.map((task) => ({
          id: task.id,
          taskId: task.id,
          prompt: task.request.prompt ?? "",
          size: task.request.size ?? "9:16",
          n: task.request.n ?? 1,
          created: task.created_at * 1000,
          status: isImageSucceeded(task)
            ? "succeeded"
            : isImageFailed(task)
              ? "failed"
              : task.status === "queued"
                ? "queued"
                : "running",
          progress: task.progress,
          images: imageResults(task),
          error: task.error?.message,
        }));
        J((current) => {
          const merged = current.map((job) => {
            const remote = restored.find((item) => item.taskId === job.taskId);
            return remote ? { ...remote, id: job.id } : job;
          });
          return [
            ...merged,
            ...restored.filter(
              (item) => !current.some((job) => job.taskId === item.taskId),
            ),
          ]
            .filter((job) => !isDeleted(job))
            .sort((a, b) => b.created - a.created);
        });
        for (const job of restored) {
          const local = jobs.find((item) => item.taskId === job.taskId);
          const target = { ...job, id: local?.id ?? job.id };
          if (
            isDeleted(target) ||
            !["queued", "running"].includes(job.status) ||
            controllers.has(target.id)
          )
            continue;
          const controller = new AbortController();
          controllers.set(target.id, controller);
          void poll(target, controller).finally(() => {
            if (controllers.get(target.id) === controller)
              controllers.delete(target.id);
          });
        }
      })
      .catch((error) => {
        if (!historyController.signal.aborted)
          E(`Không tải được lịch sử từ Muse: ${msg(error)}`);
      });
    for (const job of jobs) {
      if (
        job.taskId &&
        ["queued", "running"].includes(job.status) &&
        !ctl.current.has(job.id)
      ) {
        const controller = new AbortController();
        ctl.current.set(job.id, controller);
        void poll(job, controller).finally(() => {
          if (ctl.current.get(job.id) === controller)
            ctl.current.delete(job.id);
        });
      }
    }
    return () => {
      historyController.abort();
      controllers.forEach((controller) => controller.abort());
      controllers.clear();
    };
    // Start polling restored tasks once on mount. New tasks start their own poller in submit().
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  async function add(fs: FileList | null) {
    if (!fs) return;
    const index = replace.current;
    replace.current = null;
    const picked = Array.from(fs).slice(
      0,
      index === null ? 4 - refs.length : 1,
    );
    try {
      const data = await Promise.all(
        picked
          .filter(
            (f) =>
              /^image\/(png|jpeg|webp|gif)$/.test(f.type) &&
              f.size <= 10 * 1024 * 1024,
          )
          .map((file) => readReference(file, true)),
      );
      if (data.length !== picked.length)
        E("Chỉ nhận PNG/JPG/WEBP/GIF tối đa 10 MB mỗi ảnh.");
      R((old) => {
        const next = [...old];
        data.forEach((r, i) =>
          index === null ? next.push(r) : next.splice(index + i, 1, r),
        );
        return next.slice(0, 4);
      });
    } catch {
      E("Không đọc được ảnh tham chiếu.");
    }
    if (file.current) file.current.value = "";
  }
  async function poll(job: Job, controller: AbortController) {
    while (!controller.signal.aborted) {
      await new Promise((r) => setTimeout(r, 3000));
      if (controller.signal.aborted) return;
      try {
        const t = await getImage(job.taskId!, controller.signal);
        if (isImageSucceeded(t)) {
          const images = imageResults(t);
          J((a) =>
            a.map((x) =>
              x.id === job.id
                ? {
                    ...x,
                    status: "succeeded",
                    progress: t.progress ?? 100,
                    images,
                    error: images.length
                      ? undefined
                      : "Muse báo task hoàn tất nhưng không trả về ảnh. Hãy kiểm tra response task trên backend.",
                  }
                : x,
            ),
          );
          return;
        }
        if (isImageFailed(t)) {
          J((a) =>
            a.map((x) =>
              x.id === job.id
                ? {
                    ...x,
                    status: t.status === "failed" ? "failed" : "interrupted",
                    error: t.error?.message ?? "Task bị gián đoạn.",
                  }
                : x,
            ),
          );
          return;
        }
        J((a) =>
          a.map((x) =>
            x.id === job.id
              ? {
                  ...x,
                  status: t.status === "queued" ? "queued" : "running",
                  progress: t.progress,
                }
              : x,
          ),
        );
      } catch (e) {
        if (controller.signal.aborted) return;
        const terminal = isImagePollingErrorTerminal(e);
        J((a) =>
          a.map((x) =>
            x.id === job.id
              ? {
                  ...x,
                  status: terminal ? "interrupted" : x.status,
                  error: msg(e),
                }
              : x,
          ),
        );
        if (terminal) return;
      }
    }
  }
  function removeJob(id: string) {
    const job = jobs.find((item) => item.id === id);
    if (!job) return;
    try {
      rememberDeleted(id, ...(job.taskId ? [job.taskId] : []));
    } catch {
      E("Không thể lưu thao tác xóa trong trình duyệt. Vui lòng thử lại.");
      return;
    }
    if (details?.id === id) setDetails(null);
    ctl.current.get(id)?.abort();
    ctl.current.delete(id);
    J((items) => items.filter((job) => job.id !== id));
    E("");
  }
  function removeAllJobs() {
    if (
      !jobs.length ||
      !window.confirm(
        `Xóa toàn bộ ${jobs.length} task khỏi lịch sử trên trình duyệt này? Dữ liệu trên Muse không bị xóa và tác vụ đang chạy trên máy chủ không bị hủy.`,
      )
    )
      return;
    try {
      rememberDeleted(
        ...jobs.flatMap((job) =>
          job.taskId ? [job.id, job.taskId] : [job.id],
        ),
      );
    } catch {
      E("Không thể lưu thao tác xóa trong trình duyệt. Vui lòng thử lại.");
      return;
    }
    ctl.current.forEach((controller) => controller.abort());
    ctl.current.clear();
    J([]);
    setDetails(null);
    M(null);
    E("");
  }
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    if (!prompt.trim()) {
      E("Vui lòng nhập prompt.");
      return;
    }
    const key = sessionStorage.getItem("muse-admin-key")?.trim();
    if (!key) {
      E("Chưa có khóa Muse API. Hãy nhập tại trang Tài khoản Muse.");
      return;
    }
    B(true);
    E("");
    const job: Job = {
      id: crypto.randomUUID(),
      prompt: prompt.trim(),
      size,
      n,
      created: Date.now(),
      status: "submitting",
      images: [],
    };
    J((a) => [job, ...a]);
    try {
      const promptOut =
        job.prompt +
        (refs.length && locks.length
          ? `\n\nReference consistency (best effort):\n${locks.map((i) => `- ${keep[i]}`).join("\n")}`
          : "");
      const t = await createImage({
        prompt: promptOut,
        size,
        n,
        locks: [],
        references: refs.map((r, i) => ({ ...r, id: String(i) })),
      });
      if (isDeleted(job)) {
        rememberDeleted(t.id);
        return;
      }
      J((a) =>
        a.map((x) =>
          x.id === job.id
            ? { ...x, taskId: t.id, status: "queued", progress: t.progress }
            : x,
        ),
      );
      const c = new AbortController();
      ctl.current.set(job.id, c);
      void poll({ ...job, taskId: t.id }, c).finally(() =>
        ctl.current.delete(job.id),
      );
      P("");
      R([]);
      L([]);
    } catch (e) {
      J((a) =>
        a.map((x) =>
          x.id === job.id ? { ...x, status: "failed", error: msg(e) } : x,
        ),
      );
    } finally {
      B(false);
    }
  }

  return (
    <section className="image-page">
      <header className="image-page__header">
        <span className="image-page__eyebrow">
          <Sparkles size={15} /> MUSE AI
        </span>
        <h1>Tạo ảnh AI</h1>
        <p>Tạo ảnh từ prompt hoặc ảnh tham chiếu.</p>
      </header>
      <form className="image-form" onSubmit={submit}>
        <div className="image-form__top">
          <div className="image-form__prompt">
            <label htmlFor="img-prompt">Prompt</label>
            <textarea
              id="img-prompt"
              required
              maxLength={4000}
              rows={5}
              value={prompt}
              onChange={(e) => P(e.target.value)}
              placeholder="Mô tả hình ảnh muốn tạo…"
            />
            <div className="image-prompt__meta">
              <span>Chỉnh sửa mô tả trước khi tạo.</span>
              <span>{prompt.length}/4000</span>
            </div>
          </div>
          <div
            className={`image-reference${drag ? " image-reference--dragging" : ""}`}
            onDragOver={(e) => {
              e.preventDefault();
              D(true);
            }}
            onDragLeave={() => D(false)}
            onDrop={(e) => {
              e.preventDefault();
              D(false);
              void add(e.dataTransfer.files);
            }}
          >
            <strong>Ảnh tham chiếu ({refs.length}/4)</strong>
            <p>PNG, JPG, WEBP, GIF · tối đa 10 MB/ảnh</p>
            <div className="image-reference__list">
              {refs.map((r, i) => (
                <div className="image-reference__item" key={i}>
                  <img src={r.data} alt={r.name} />
                  <span>{r.name}</span>
                  <button
                    type="button"
                    onClick={() => {
                      replace.current = i;
                      file.current?.click();
                    }}
                  >
                    Thay
                  </button>
                  <button
                    type="button"
                    onClick={() => R((a) => a.filter((_, j) => j !== i))}
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
              {refs.length < 4 && (
                <button
                  type="button"
                  className="image-reference__add"
                  onClick={() => {
                    replace.current = null;
                    file.current?.click();
                  }}
                >
                  <Upload /> Kéo thả hoặc chọn ảnh
                </button>
              )}
            </div>
            <input
              hidden
              ref={file}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              multiple
              onChange={(e) => void add(e.target.files)}
            />
            <small>
              {refs.length
                ? "Tạo ảnh với tham chiếu; Muse không đảm bảo khóa tuyệt đối."
                : "Không ảnh tham chiếu = Text-to-Image."}
            </small>
          </div>
        </div>
        {refs.length > 0 && (
          <fieldset className="image-locks">
            <legend>Giữ chi tiết tham chiếu</legend>
            {keep.map((label, i) => (
              <label key={label}>
                <input
                  type="checkbox"
                  checked={locks.includes(i)}
                  onChange={(e) =>
                    L((a) =>
                      e.target.checked ? [...a, i] : a.filter((x) => x !== i),
                    )
                  }
                />
                {label}
              </label>
            ))}
            <p>Các yêu cầu được thêm vào prompt gốc trước khi gửi.</p>
          </fieldset>
        )}
        <div className="image-form__bottom">
          <div className="image-form__controls">
            <label>
              Tỷ lệ
              <select value={size} onChange={(e) => S(e.target.value)}>
                <option value="9:16">9:16</option>
                <option value="16:9">16:9</option>
                <option value="1:1">1:1</option>
              </select>
            </label>
            <label>
              Số ảnh
              <select value={n} onChange={(e) => N(+e.target.value)}>
                {[1, 2, 3, 4].map((x) => (
                  <option key={x} value={x}>
                    {x} ảnh
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="image-form__actions">
            <button
              type="button"
              className="image-form__clear"
              disabled={!jobs.length}
              onClick={removeAllJobs}
            >
              <Trash2 size={18} />
              Xóa toàn bộ task
            </button>
            <button
              className="image-form__submit"
              disabled={!prompt.trim() || busy}
            >
              <ImagePlus />
              {busy ? "Đang gửi…" : "Tạo ảnh"}
            </button>
          </div>
        </div>
      </form>
      {err && (
        <div className="image-error" role="alert">
          <AlertCircle />
          {err}
        </div>
      )}
      <section className="image-results">
        <h2>Kết quả tạo ảnh</h2>
        <div className="image-job-list">
          {jobs.map((job) => (
            <article className="image-job" key={job.id}>
              <header>
                <strong>{job.prompt}</strong>
                <span>
                  {job.taskId ?? "Đang gửi"} ·{" "}
                  {new Date(job.created).toLocaleString("vi-VN")} · {job.size} ·{" "}
                  {job.n} ảnh · {job.status}
                </span>
              </header>
              <div className={`image-progress image-progress--${job.status}`}>
                <span>
                  {job.status}{" "}
                  {typeof job.progress === "number"
                    ? `${job.progress}%`
                    : job.status === "succeeded"
                      ? "100%"
                      : ""}
                </span>
                <div className="image-progress__track">
                  <i
                    style={{
                      width: `${job.status === "succeeded" ? 100 : Math.max(0, Math.min(100, job.progress ?? 0))}%`,
                    }}
                  />
                </div>
              </div>
              {job.error && <p className="image-job__error">{job.error}</p>}
              {job.images.length > 0 && (
                <div className="image-grid">
                  {job.images.map((im, i) => (
                    <article className="image-card" key={i}>
                      <button
                        className="image-card__preview"
                        type="button"
                        onClick={() => M({ image: im, prompt: job.prompt })}
                      >
                        <img src={DATA(im)} alt={job.prompt} />
                      </button>
                      <div className="image-card__footer">
                        <span>
                          Ảnh {i + 1}
                          <small>{job.prompt}</small>
                        </span>
                      </div>
                    </article>
                  ))}
                </div>
              )}
              <footer className="image-job__footer">
                {job.images.map((image, index) => (
                  <button
                    key={index}
                    className="image-job__download"
                    type="button"
                    title={
                      job.images.length > 1 ? `Tải ảnh ${index + 1}` : "Tải ảnh"
                    }
                    aria-label={`Tải ảnh ${index + 1}`}
                    onClick={() => {
                      void downloadImage(
                        DATA(image),
                        `muse-${job.taskId ?? job.id}-${index + 1}`,
                      ).catch((e) => E(msg(e)));
                    }}
                  >
                    <Download size={17} />
                  </button>
                ))}
                <button
                  className="image-job__details"
                  type="button"
                  onClick={() => setDetails(job)}
                  title="Chi tiết"
                  aria-label="Chi tiết"
                >
                  <Eye size={17} />
                </button>
                <button
                  className="image-job__delete"
                  type="button"
                  onClick={() => removeJob(job.id)}
                  aria-label={`Xóa kết quả: ${job.prompt}`}
                  title="Xóa"
                >
                  <Trash2 size={17} />
                </button>
              </footer>
            </article>
          ))}
        </div>
      </section>
      {details && (
        <Modal
          open
          onClose={() => setDetails(null)}
          title="Chi tiết tác vụ tạo ảnh"
          className="image-details-modal"
        >
          <div className="image-details">
            <p>
              <strong>Prompt:</strong> {details.prompt}
            </p>
            <p>
              <strong>Task ID:</strong> {details.taskId ?? "Đang gửi"}
            </p>
            <p>
              <strong>Trạng thái:</strong> {details.status}
            </p>
            <p>
              <strong>Thời gian:</strong>{" "}
              {new Date(details.created).toLocaleString("vi-VN")}
            </p>
            <p>
              <strong>Tỷ lệ:</strong> {details.size} · <strong>Số ảnh:</strong>{" "}
              {details.n}
            </p>
            {typeof details.progress === "number" && (
              <p>
                <strong>Tiến độ:</strong> {details.progress}%
              </p>
            )}
            {details.error && (
              <p className="image-job__error">{details.error}</p>
            )}
            {details.images.length > 0 && (
              <div className="image-details__images">
                {details.images.map((image, index) => (
                  <img
                    key={index}
                    src={DATA(image)}
                    alt={`Kết quả ${index + 1}`}
                  />
                ))}
              </div>
            )}
          </div>
        </Modal>
      )}
      {modal && (
        <Modal
          open
          onClose={() => M(null)}
          title="Xem ảnh"
          className="image-preview-modal"
        >
          <img src={DATA(modal.image)} alt={modal.prompt} />
          <p>{modal.prompt}</p>
        </Modal>
      )}
    </section>
  );
}
