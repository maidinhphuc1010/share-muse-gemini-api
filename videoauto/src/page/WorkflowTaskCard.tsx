import { useState } from "react";
import { Download, Eye, RotateCw } from "lucide-react";
import { Button, Drawer, ProgressBar } from "../components/common";
import CopyButton from "../components/common/CopyButton";
import { downloadImage, imageResults, imageUrl, isImageSucceeded } from "../services/api/images";
import { downloadVideo, videoError } from "../services/api/videos";
import type { ImageJob } from "../services/imageWorkflowStore";
import type { VideoJob } from "../services/videoStore";

const labels: Record<string, string> = {
  submitting: "Đang gửi", queued: "Đang chờ", running: "Đang tạo",
  succeeded: "Hoàn thành", success: "Hoàn thành", completed: "Hoàn thành",
  failed: "Thất bại", cancelled: "Đã hủy", canceled: "Đã hủy", unknown: "Chưa xác nhận",
};
const succeeded = (status: string) => ["succeeded", "success", "completed"].includes(status.toLowerCase());
const failed = (status: string) => ["failed", "cancelled", "canceled"].includes(status.toLowerCase());
const busy = (status: string) => ["submitting", "queued", "running"].includes(status.toLowerCase());

export function WorkflowTaskCard({ imageJob, videoJob, onRetry }: {
  imageJob: ImageJob; videoJob?: VideoJob; onRetry: () => void;
}) {
  const [details, setDetails] = useState(false);
  const [error, setError] = useState("");
  const [promptExpanded, setPromptExpanded] = useState(false);
  const prompt = imageJob.input.prompt;
  const hasLongPrompt = prompt.length > 150;
  const generated = imageUrl(imageResults(imageJob)[0] ?? {});
  const videoUrl = videoJob?.result?.url;
  const source = imageJob.input.references[0];
  const id = imageJob.id || imageJob.localId;
  const taskFailed = failed(imageJob.status) || (!!videoJob && failed(videoJob.status));
  const progress = videoJob && !succeeded(videoJob.status) ? videoJob.progress : imageJob.progress;
  const statusLabel = taskFailed ? "Thất bại" : videoJob && succeeded(videoJob.status) && isImageSucceeded(imageJob)
    ? "Hoàn thành" : videoJob ? labels[videoJob.status] ?? videoJob.status
      : isImageSucceeded(imageJob) && imageJob.input.videoPrompt ? "Đang tạo video" : labels[imageJob.status] ?? imageJob.status;

  return (
    <>
      <article className="workflow-task-card">
        <header className="workflow-task-card__header">
          <div className="workflow-task-card__identity">
            <strong title={id}>Task {id.length > 18 ? `${id.slice(0, 8)}…${id.slice(-5)}` : id}</strong>
            <small>{videoJob?.created ? new Date(videoJob.created).toLocaleString() : ""}</small>
          </div>
          <span className={`workflow-status ${taskFailed ? "is-failed" : statusLabel === "Hoàn thành" ? "is-done" : "is-active"}`}>{statusLabel}</span>
        </header>
        <div className="workflow-task-card__media">
          {videoUrl ? <video src={videoUrl} controls preload="metadata" aria-label="Video đã tạo" />
            : generated ? <img src={generated} alt="Ảnh AI đã tạo" />
              : source ? <img src={source.data} alt="Ảnh gốc" />
                : <div className="workflow-task-card__placeholder">Chưa có ảnh</div>}
        </div>
        <div className="workflow-task-card__body">
          <div className="workflow-stages">
            <span className={isImageSucceeded(imageJob) ? "is-done" : busy(imageJob.status) ? "is-active" : taskFailed ? "is-failed" : ""}>Ảnh</span><i aria-hidden="true" />
            <span className={videoJob && succeeded(videoJob.status) ? "is-done" : videoJob && busy(videoJob.status) ? "is-active" : videoJob && failed(videoJob.status) ? "is-failed" : ""}>Video</span>
          </div>
          {typeof progress === "number" && <ProgressBar value={progress} showValue className="workflow-compact-progress" />}
          {(imageJob.notice || videoJob?.notice) && <p className="workflow-task-error">{imageJob.notice || videoJob?.notice}</p>}
          {error && <p className="workflow-task-error">{error}</p>}
          <div className="workflow-task-prompt-wrap">
            <p className={`workflow-task-prompt ${promptExpanded ? "is-expanded" : ""}`}>{prompt}</p>
            {hasLongPrompt && <button type="button" className="workflow-task-prompt-toggle" onClick={() => setPromptExpanded((expanded) => !expanded)} aria-expanded={promptExpanded}>
              {promptExpanded ? "Thu gọn" : "Xem thêm"}
            </button>}
          </div>
          <footer className="workflow-task-actions">
            <Button variant="secondary" onClick={() => setDetails(true)}><Eye size={14} /> Chi tiết</Button>
            <Button variant="secondary" onClick={onRetry}><RotateCw size={14} /> Tạo lại</Button>
            {videoUrl && <Button variant="secondary" onClick={() => void downloadVideo(videoUrl, videoJob?.id || id).catch((reason) => setError(videoError(reason)))}><Download size={14} /> Tải</Button>}
          </footer>
        </div>
      </article>

      <Drawer open={details} onClose={() => setDetails(false)} title={`Chi tiết task ${id}`} className="workflow-task-drawer">
        <div className="workflow-detail-content">
          <section><h3>Trạng thái</h3><p>Ảnh: {labels[imageJob.status] ?? imageJob.status} · Video: {videoJob ? labels[videoJob.status] ?? videoJob.status : "Chưa tạo"}</p>{typeof progress === "number" && <ProgressBar value={progress} showValue />}{(imageJob.notice || videoJob?.notice) && <p className="workflow-task-error">{imageJob.notice || videoJob?.notice}</p>}</section>
          <section><h3>Prompt tạo ảnh</h3><CopyButton text={imageJob.input.prompt} /><p className="workflow-detail-prompt">{imageJob.input.prompt}</p></section>
          <section><h3>Prompt tạo video</h3><CopyButton text={imageJob.input.videoPrompt || videoJob?.input.prompt || ""} /><p className="workflow-detail-prompt">{imageJob.input.videoPrompt || videoJob?.input.prompt || "Chưa có prompt video."}</p></section>
          {source && <section><h3>Ảnh gốc</h3><img className="workflow-detail-image" src={source.data} alt="Ảnh gốc" /></section>}
          {generated && <section><h3>Ảnh AI</h3><img className="workflow-detail-image" src={generated} alt="Ảnh đã tạo" /><Button variant="secondary" onClick={() => void downloadImage(generated, `${id}-image`).catch((reason) => setError(String(reason)))}><Download size={14} /> Tải ảnh</Button></section>}
          {videoUrl && <section><h3>Video</h3><video className="workflow-detail-video" src={videoUrl} controls /><Button variant="secondary" onClick={() => void downloadVideo(videoUrl, videoJob?.id || id).catch((reason) => setError(videoError(reason)))}><Download size={14} /> Tải video</Button></section>}
          <Button onClick={onRetry}><RotateCw size={14} /> Tạo lại task</Button>
        </div>
      </Drawer>
    </>
  );
}
