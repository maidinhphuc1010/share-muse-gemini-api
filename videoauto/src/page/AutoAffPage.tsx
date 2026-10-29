import { useEffect, useState } from "react";
import {
  affApi,
  affError,
  affMedia,
  type AffCapabilities,
  type AffInput,
  type AffJob,
} from "../services/api/aff";
import { readReference } from "../services/api/images";
import { downloadVideo } from "../services/api/videos";
import {
  Badge,
  Button,
  Card,
  ConfirmDialog,
  Spinner,
  EmptyState,
  Input,
  ProgressBar,
  Select,
  Switch,
  Textarea,
} from "../components/common";
import {
  AlertCircle,
  Clapperboard,
  Download,
  ImagePlus,
  Info,
  RefreshCw,
  Sparkles,
  X,
} from "lucide-react";
import "./AutoAffPage.css";
const statuses: Record<string, string> = {
  queued: "Xếp hàng",
  running: "Đang xử lý",
  review: "Chờ duyệt",
  paused: "Tạm dừng",
  failed: "Thất bại",
  succeeded: "Hoàn thành",
  completed: "Hoàn thành",
};
export default function AutoAffPage() {
  const [input, setInput] = useState<AffInput>({
    character: "",
    products: [],
    product_url: "",
    name: "",
    facts: "",
    duration: 30,
    ratio: "9:16",
    style: "review",
    automatic: false,
  });
  const [jobs, setJobs] = useState<AffJob[]>([]);
  const [caps, setCaps] = useState<AffCapabilities>();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [connectionError, setConnectionError] = useState("");
  const [retry, setRetry] = useState(0);
  const [connecting, setConnecting] = useState(true);
  const [resumeJob, setResumeJob] = useState<AffJob | null>(null);
  const [actionBusy, setActionBusy] = useState(false);
  const [filter, setFilter] = useState("all");
  const visibleJobs = jobs.filter(
    (job) => filter === "all" || job.status === filter,
  );
  useEffect(() => {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    async function sync() {
      try {
        const [list, capabilities] = await Promise.all([
          affApi.list(controller.signal),
          affApi.capabilities(controller.signal),
        ]);
        if (!controller.signal.aborted) {
          setJobs(list);
          setCaps(capabilities);
          setConnecting(false);
          setConnectionError("");
          timer = setTimeout(() => void sync(), 3000);
        }
      } catch (e) {
        if (!controller.signal.aborted) {
          setCaps(undefined);
          setConnecting(false);
          setConnectionError(affError(e));
        }
      }
    }
    void sync();
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [retry]);
  async function upload(files: File[], character: boolean) {
    setUploading(true);
    try {
      if (!character && input.products.length + files.length > 12)
        throw new Error("Tối đa 12 ảnh sản phẩm");
      const refs = await Promise.all(files.map((file) => readReference(file)));
      setInput((old) =>
        character
          ? { ...old, character: refs[0]?.data ?? "" }
          : { ...old, products: [...old.products, ...refs.map((r) => r.data)] },
      );
    } catch (e) {
      setError(affError(e));
    } finally {
      setUploading(false);
    }
  }
  async function action(job: AffJob, kind: string) {
    if (actionBusy) return;
    setActionBusy(true);
    try {
      const updated = await affApi.action(job.id, kind);
      setJobs((old) => old.map((j) => (j.id === job.id ? updated : j)));
      setResumeJob(null);
    } catch (e) {
      setError(affError(e));
    } finally {
      setActionBusy(false);
    }
  }
  const ready =
    caps && caps.driver !== "mock" && caps.gemini_configured && caps.ffmpeg;
  return (
    <section className="aff-page">
      <header className="aff-heading">
        <span className="aff-heading__icon">
          <Clapperboard size={27} />
        </span>
        <div>
          <p className="aff-eyebrow">MUSE AI · AFFILIATE STUDIO</p>
          <h1>Auto AFF Video</h1>
          <p>Từ thông tin sản phẩm đến kịch bản và video affiliate.</p>
        </div>
      </header>
      <Card className="aff-connection">
        <div className="aff-row">
          <h2>Trạng thái hệ thống</h2>
          <Badge variant={ready ? "success" : "warning"}>
            {ready ? "Sẵn sàng tạo video" : "Chưa sẵn sàng"}
          </Badge>
        </div>
        <div className="aff-capabilities">
          <Badge
            variant={caps && caps.driver !== "mock" ? "success" : "warning"}
          >
            Driver: {caps?.driver ?? "chưa kết nối"}
          </Badge>
          <Badge variant={caps?.gemini_configured ? "success" : "warning"}>
            Gemini: {caps?.gemini_configured ? "đã cấu hình" : "chưa xác nhận"}
          </Badge>
          <Badge variant={caps?.ffmpeg ? "success" : "warning"}>
            FFmpeg: {caps?.ffmpeg ? "khả dụng" : "chưa xác nhận"}
          </Badge>
        </div>
        <p className="aff-hint">
          <Info size={16} />
          Chưa có TTS/nhạc nền. Phụ đề theo cảnh, không đồng bộ giọng nói. Khóa
          chi tiết chỉ ở mức Muse cho phép.
        </p>
      </Card>
      {connectionError && (
        <div role="alert" className="aff-alert">
          <AlertCircle size={19} />
          <div>
            <strong>Không thể kết nối Auto AFF API</strong>
            <p>{connectionError}</p>
            <p>Kiểm tra kết nối Muse và backend có hỗ trợ /v1/aff.</p>
          </div>
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              setConnectionError("");
              setConnecting(true);
              setRetry((v) => v + 1);
            }}
          >
            <RefreshCw size={15} />
            Thử kết nối lại
          </Button>
        </div>
      )}
      {error && (
        <p role="alert" className="aff-alert">
          {error}
        </p>
      )}
      <div className="aff-layout">
        <Card
          title={
            <h2 className="aff-title">
              <Sparkles size={18} />
              Thiết lập video AFF
            </h2>
          }
        >
          <form
            className="aff-form"
            onSubmit={(e) => {
              e.preventDefault();
              if (!ready || busy || uploading) return;
              setError("");
              setBusy(true);
              void affApi
                .create(input)
                .then((job) =>
                  setJobs((old) => [
                    job,
                    ...old.filter((j) => j.id !== job.id),
                  ]),
                )
                .catch((e) => setError(affError(e)))
                .finally(() => setBusy(false));
            }}
          >
            <h3 className="aff-step">
              <span>01</span>Ảnh đầu vào
            </h3>
            <div className="aff-upload-grid">
              {[true, false].map((character) => (
                <div className="aff-upload" key={String(character)}>
                  <ImagePlus size={25} />
                  <Input
                    id={character ? "aff-character" : "aff-products"}
                    label={
                      character
                        ? "Ảnh nhân vật *"
                        : `Ảnh sản phẩm (${input.products.length}/12)`
                    }
                    disabled={uploading || busy}
                    type="file"
                    multiple={!character}
                    accept="image/png,image/jpeg,image/webp"
                    onChange={(e) => {
                      if (e.target.files?.length)
                        void upload(Array.from(e.target.files), character);
                      e.target.value = "";
                    }}
                    hint="PNG, JPG, WEBP · Tối đa 10 MB/ảnh"
                  />
                </div>
              ))}
            </div>
            {uploading && (
              <p role="status" className="aff-muted">
                Đang đọc ảnh…
              </p>
            )}
            <div className="aff-thumbnails">
              {[input.character, ...input.products].map(
                (src, i) =>
                  src && (
                    <div className="aff-thumbnail" key={i}>
                      <img src={src} alt={i ? `Sản phẩm ${i}` : "Nhân vật"} />
                      <span>{i ? `Sản phẩm ${i}` : "Nhân vật"}</span>
                      <Button
                        type="button"
                        variant="secondary"
                        aria-label={
                          i ? `Xóa ảnh sản phẩm ${i}` : "Xóa ảnh nhân vật"
                        }
                        disabled={uploading || busy}
                        onClick={() =>
                          setInput((v) =>
                            i === 0
                              ? { ...v, character: "" }
                              : {
                                  ...v,
                                  products: v.products.filter(
                                    (_, j) => j !== i - 1,
                                  ),
                                },
                          )
                        }
                      >
                        <X size={14} />
                      </Button>
                    </div>
                  ),
              )}
            </div>
            <h3 className="aff-step">
              <span>02</span>Thông tin sản phẩm
            </h3>
            <Input
              id="aff-url"
              label="Link sản phẩm"
              type="url"
              placeholder="https://…"
              value={input.product_url}
              onChange={(e) =>
                setInput((v) => ({ ...v, product_url: e.target.value }))
              }
              hint="Cung cấp ảnh sản phẩm hoặc link. Hệ thống chưa tự trích xuất thông tin từ link."
            />
            <Input
              id="aff-name"
              label="Tên sản phẩm *"
              placeholder="Nhập tên sản phẩm cần giới thiệu"
              required
              maxLength={300}
              value={input.name}
              onChange={(e) =>
                setInput((v) => ({ ...v, name: e.target.value }))
              }
            />
            <Textarea
              id="aff-facts"
              label="Điểm nổi bật, thông tin và bằng chứng *"
              rows={5}
              placeholder="Mô tả tính năng, chất liệu, lợi ích và thông tin có căn cứ về sản phẩm…"
              required
              minLength={10}
              maxLength={10000}
              value={input.facts}
              onChange={(e) =>
                setInput((v) => ({ ...v, facts: e.target.value }))
              }
              hint="Tối thiểu 10 ký tự. Không bịa đánh giá hoặc trải nghiệm sử dụng."
            />
            <h3 className="aff-step">
              <span>03</span>Cấu hình video
            </h3>

            <Input
              id="aff-duration"
              label="Thời lượng (15–180 giây)"
              required
              type="number"
              min={15}
              max={180}
              value={input.duration}
              onChange={(e) =>
                setInput((v) => ({ ...v, duration: Number(e.target.value) }))
              }
            />
            <div className="aff-actions">
              {[15, 30, 60].map((n) => (
                <Button
                  type="button"
                  variant={input.duration === n ? "primary" : "secondary"}
                  aria-pressed={input.duration === n}
                  key={n}
                  onClick={() => setInput((v) => ({ ...v, duration: n }))}
                >
                  {n} giây
                </Button>
              ))}
            </div>
            <div className="aff-options">
              <Select
                id="aff-ratio"
                label="Tỷ lệ khung hình"
                value={input.ratio}
                onChange={(e) =>
                  setInput((v) => ({ ...v, ratio: e.target.value }))
                }
                options={[
                  { value: "9:16", label: "9:16 · Dọc" },
                  { value: "16:9", label: "16:9 · Ngang" },
                  { value: "1:1", label: "1:1 · Vuông" },
                ]}
              />
              <Select
                id="aff-style"
                label="Phong cách"
                value={input.style}
                onChange={(e) =>
                  setInput((v) => ({ ...v, style: e.target.value }))
                }
                options={[
                  { value: "review", label: "Review sản phẩm" },
                  ...[
                    "giới thiệu sản phẩm",
                    "trải nghiệm",
                    "quảng cáo bán hàng",
                  ].map((v) => ({ value: v, label: v })),
                ]}
              />
            </div>
            <div className="aff-automatic">
              <Switch
                label="Tự động hoàn toàn"
                checked={input.automatic}
                onChange={(e) =>
                  setInput((v) => ({ ...v, automatic: e.target.checked }))
                }
              />
              <p>Bỏ qua bước duyệt kịch bản trước khi tạo media.</p>
            </div>
            <p className="aff-hint">
              <Info size={16} />
              Tạo sẽ gọi Gemini và tiêu thụ credit Muse theo cảnh. Job chạy trên
              server khi đóng trang.
            </p>
            {!ready && (
              <p className="aff-muted">
                Cần kết nối driver, cấu hình Gemini và FFmpeg trước khi tạo.
              </p>
            )}
            <Button
              type="submit"
              loading={busy}
              className="aff-submit"
              disabled={
                !ready ||
                uploading ||
                !input.character ||
                (!input.products.length && !input.product_url)
              }
            >
              <Sparkles size={18} />
              Tạo video AFF
            </Button>
          </form>
        </Card>
        <section className="aff-results" aria-label="Hàng đợi video AFF">
          <div className="aff-stats">
            <Card>
              <span>Tổng số job</span>
              <strong>{jobs.length}</strong>
            </Card>
            <Card>
              <span>Đang xử lý</span>
              <strong>
                {
                  jobs.filter((j) => ["queued", "running"].includes(j.status))
                    .length
                }
              </strong>
            </Card>
            <Card>
              <span>Chờ duyệt</span>
              <strong>
                {jobs.filter((j) => j.status === "review").length}
              </strong>
            </Card>
          </div>
          <div className="aff-row">
            <h2 className="aff-title">
              <Clapperboard size={18} />
              Hàng đợi <Badge>{jobs.length}</Badge>
            </h2>
            <Select
              aria-label="Lọc hàng đợi AFF"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              options={[
                { value: "all", label: "Tất cả job" },
                ...Object.entries(statuses).map(([value, label]) => ({
                  value,
                  label,
                })),
              ]}
            />
          </div>
          <p className="aff-muted">
            Theo dõi tiến độ, duyệt kịch bản và tải video tại đây.
          </p>
          {connecting && (
            <Card>
              <div className="aff-hint">
                <Spinner label="Đang kết nối Auto AFF API" />
                <span>Đang kết nối và tải hàng đợi…</span>
              </div>
            </Card>
          )}
          {!connecting && !visibleJobs.length && (
            <Card className="aff-empty">
              <EmptyState
                icon={<Clapperboard size={38} />}
                title={
                  connectionError
                    ? "Chưa tải được hàng đợi"
                    : jobs.length
                      ? "Không có job phù hợp"
                      : "Chưa có video trong hàng đợi"
                }
                description={
                  connectionError
                    ? "Kết nối lại API để tải danh sách job trên server."
                    : jobs.length
                      ? "Thử chọn trạng thái khác để xem các job đã tạo."
                      : "Thêm ảnh nhân vật, thông tin sản phẩm và thiết lập video. Job mới sẽ xuất hiện tại đây."
                }
              />
            </Card>
          )}
          {visibleJobs.map((job) => (
            <Card
              key={job.id}
              className="aff-job"
              title={
                <div className="aff-row">
                  <h3>{job.name}</h3>
                  <Badge
                    variant={
                      job.error
                        ? "danger"
                        : job.output
                          ? "success"
                          : job.status === "review"
                            ? "warning"
                            : "info"
                    }
                  >
                    {statuses[job.status] ?? job.status}
                  </Badge>
                </div>
              }
            >
              <p className="aff-muted">ID: {job.id}</p>
              <ProgressBar
                value={job.progress}
                showValue
                label={job.stage || "Tiến độ"}
              />
              {job.error && (
                <p role="alert" className="aff-alert">
                  {job.error}
                </p>
              )}
              <div className="aff-actions">
                {job.status === "review" && (
                  <Button
                    type="button"
                    disabled={actionBusy}
                    onClick={() => void action(job, "approve")}
                  >
                    Duyệt và tạo media
                  </Button>
                )}
                {["paused", "failed"].includes(job.status) && (
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={actionBusy}
                    onClick={() => setResumeJob(job)}
                  >
                    <RefreshCw size={15} />
                    Tiếp tục bước lỗi
                  </Button>
                )}
                {["queued", "running"].includes(job.status) && (
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={job.pause || actionBusy}
                    onClick={() => void action(job, "pause")}
                  >
                    {job.pause ? "Chờ tạm dừng" : "Dừng sau bước hiện tại"}
                  </Button>
                )}
              </div>
              {job.scenes.map((scene, i) => (
                <div className="aff-scene" key={i}>
                  <strong>
                    Cảnh {i + 1} · {scene.duration}s
                  </strong>
                  <p>{scene.dialogue}</p>
                  <details>
                    <summary>Prompt ảnh/video</summary>
                    <p>
                      <b>Ảnh:</b> {scene.image_prompt}
                    </p>
                    <p>
                      <b>Video:</b> {scene.video_prompt}
                    </p>
                  </details>
                  {scene.image && (
                    <img src={affMedia(scene.image)} alt={`Cảnh ${i + 1}`} />
                  )}
                  {scene.video && (
                    <>
                      <video
                        controls
                        preload="none"
                        src={affMedia(scene.video)}
                      />
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() =>
                          void downloadVideo(
                            affMedia(scene.video!),
                            `${job.id}-${i}`,
                          ).catch((e) => setError(affError(e)))
                        }
                      >
                        <Download size={15} />
                        Tải cảnh
                      </Button>
                    </>
                  )}
                </div>
              ))}
              {job.output && (
                <div className="aff-output">
                  <video
                    controls
                    preload="metadata"
                    src={affMedia(job.output)}
                  />
                  <Button
                    type="button"
                    onClick={() =>
                      void downloadVideo(affMedia(job.output!), job.id).catch(
                        (e) => setError(affError(e)),
                      )
                    }
                  >
                    <Download size={16} />
                    Tải MP4 hoàn chỉnh
                  </Button>
                  <p className="aff-muted">
                    MP4 không giọng đọc; bật phụ đề trong trình phát hỗ trợ
                    subtitle track.
                  </p>
                </div>
              )}
            </Card>
          ))}
        </section>
      </div>
      <ConfirmDialog
        open={!!resumeJob}
        title="Tiếp tục tạo video?"
        message="Bước gián đoạn có thể đã tiêu thụ credit. Tiếp tục bước chưa lưu có thể phát sinh thêm chi phí."
        confirmLabel="Tiếp tục"
        cancelLabel="Quay lại"
        danger={false}
        loading={actionBusy}
        onClose={() => {
          if (!actionBusy) setResumeJob(null);
        }}
        onConfirm={() => {
          if (resumeJob) void action(resumeJob, "resume");
        }}
      />
    </section>
  );
}
