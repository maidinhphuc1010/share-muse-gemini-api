import {
  ImagePlus,
  MessageCircle,
  Plus,
  Send,
  Square,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import CopyButton from "../components/common/CopyButton";
import MarkdownRenderer from "../components/common/MarkdownRenderer";
import { normalizeMarkdown } from "../components/common/MarkdownUtils";
import "./GeminiChatPage.css";

const GEMINI_SYSTEM_PROMPT = `You are a helpful, accurate, and professional AI assistant.
- Reply in Vietnamese by default unless the user requests another language.
- Organize responses with clear headings and readable paragraphs.
- When using tables, write valid Markdown with each row on its own line and a proper separator row.
- Avoid excessive bold text and separators. Do not add unnecessary greetings or repeat introductions.
- Do not force ordinary responses into two languages.
- When creating image or video prompts, always provide both sections: Vietnamese Prompt and English Prompt. Keep both versions equivalent in every detail and instruction. Preserve line breaks and do not omit content from the English version.
- For video prompts based on a reference image, maintain consistency with the source image in character, face, lighting, composition, camera angle, and setting.
- When writing a video advertising script, provide a title and clearly separated scenes. Specify the duration, visuals, motion, and dialogue for every scene.`;

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  image?: string;
};
type Conversation = {
  id: string;
  title: string;
  updatedAt: number;
  messages: ChatMessage[];
};
type ModelInfo = { id: string; name?: string; description?: string };
const DEFAULT_API_URL =
  import.meta.env.VITE_GEMINI_API_URL || "http://localhost:5918";
const CHAT_HISTORY_KEY = "gemini-chat-history-v1";

function validMessages(value: unknown): value is ChatMessage[] {
  return (
    Array.isArray(value) &&
    value.every(
      (item) =>
        item &&
        typeof item === "object" &&
        ((item as ChatMessage).role === "user" ||
          (item as ChatMessage).role === "assistant") &&
        typeof (item as ChatMessage).content === "string",
    )
  );
}

function readConversations(): Conversation[] {
  try {
    const saved = localStorage.getItem(CHAT_HISTORY_KEY);
    if (!saved) return [];
    const parsed: unknown = JSON.parse(saved);
    if (
      Array.isArray(parsed) &&
      parsed.every(
        (item) =>
          item && typeof item.id === "string" && validMessages(item.messages),
      )
    ) {
      return parsed as Conversation[];
    }
    if (validMessages(parsed) && parsed.length) {
      return [
        {
          id: crypto.randomUUID(),
          title:
            parsed.find((item) => item.role === "user")?.content.slice(0, 48) ||
            "Cuộc trò chuyện cũ",
          updatedAt: Date.now(),
          messages: parsed,
        },
      ];
    }
    return [];
  } catch {
    return [];
  }
}

function errorMessage(payload: unknown): string {
  if (payload && typeof payload === "object") {
    const data = payload as {
      detail?: unknown;
      error?: { message?: string };
      message?: string;
    };
    if (typeof data.error?.message === "string") return data.error.message;
    if (typeof data.message === "string") return data.message;
    if (typeof data.detail === "string") return data.detail;
    if (
      data.detail &&
      typeof data.detail === "object" &&
      "error" in data.detail
    ) {
      const nested = data.detail as { error?: { message?: string } };
      if (nested.error?.message) return nested.error.message;
    }
  }
  return "Không thể kết nối Gemini. Vui lòng kiểm tra URL, API key và CORS.";
}

export default function GeminiChatPage() {
  const baseUrl = DEFAULT_API_URL;
  const [apiKey, setApiKey] = useState(
    () => sessionStorage.getItem("gemini-chat-api-key") || "",
  );
  const [model, setModel] = useState("gemini-flash");
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [prompt, setPrompt] = useState("");
  const [conversations, setConversations] =
    useState<Conversation[]>(readConversations);
  const [activeId, setActiveId] = useState(
    () => readConversations()[0]?.id || "",
  );
  const messages = useMemo(
    () =>
      conversations.find((conversation) => conversation.id === activeId)
        ?.messages || [],
    [conversations, activeId],
  );
  const [image, setImage] = useState<{ preview: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [confirmClearAll, setConfirmClearAll] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(conversations));
    } catch {
      console.warn(
        "Không thể lưu lịch sử Gemini vào localStorage; có thể đã vượt dung lượng trình duyệt.",
      );
    }
  }, [conversations]);

  function updateMessages(update: (current: ChatMessage[]) => ChatMessage[]) {
    setConversations((current) =>
      current.map((conversation) =>
        conversation.id === activeId
          ? {
              ...conversation,
              messages: update(conversation.messages),
              updatedAt: Date.now(),
            }
          : conversation,
      ),
    );
  }

  function createConversation() {
    if (busy) return;
    const conversation: Conversation = {
      id: crypto.randomUUID(),
      title: "Cuộc trò chuyện mới",
      updatedAt: new Date().getTime(),
      messages: [],
    };
    setConversations((current) => [conversation, ...current]);
    setActiveId(conversation.id);
    setError("");
    setPrompt("");
    setImage(null);
  }

  function selectConversation(id: string) {
    if (busy) return;
    setActiveId(id);
    setError("");
    setPrompt("");
    setImage(null);
  }

  function deleteConversation(id: string) {
    if (busy && id === activeId) return;
    const remaining = conversations.filter(
      (conversation) => conversation.id !== id,
    );
    setConversations(remaining);
    if (activeId === id) setActiveId(remaining[0]?.id || "");
  }

  function clearAllConversations() {
    if (busy) return;
    setConversations([]);
    setActiveId("");
    setPrompt("");
    setImage(null);
    setError("");
    setConfirmClearAll(false);
  }
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!apiKey.trim()) return;
    sessionStorage.setItem("gemini-chat-api-key", apiKey.trim());
    const controller = new AbortController();
    async function loadModels() {
      try {
        const response = await fetch(
          `${baseUrl.replace(/\/$/, "")}/v1/models`,
          {
            headers: { Authorization: `Bearer ${apiKey.trim()}` },
            signal: controller.signal,
          },
        );
        if (!response.ok) return;
        const payload = await response.json();
        const available = Array.isArray(payload.data)
          ? (payload.data as ModelInfo[])
          : [];
        if (available.length) {
          setModels(available);
          setModel((current) =>
            available.some((item) => item.id === current)
              ? current
              : available[0].id,
          );
        }
      } catch {
        // Dùng model dự phòng khi backend chưa sẵn sàng hoặc không truy cập được.
      }
    }
    void loadModels();
    return () => controller.abort();
  }, [apiKey, baseUrl]);

  function chooseImage(file?: File) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Vui lòng chọn tệp ảnh hợp lệ.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("Ảnh cần nhỏ hơn 10 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setImage({ preview: String(reader.result || "") });
      setError("");
    };
    reader.onerror = () => setError("Không đọc được ảnh đã chọn.");
    reader.readAsDataURL(file);
  }

  async function sendMessage(event: React.FormEvent) {
    event.preventDefault();
    const text = prompt.trim();
    if ((!text && !image) || busy) return;
    if (!apiKey.trim()) {
      setError("Nhập API key Gemini để bắt đầu chat.");
      return;
    }
    if (!activeId) createConversation();
    const conversationId = activeId || crypto.randomUUID();
    const userMessage: ChatMessage = {
      role: "user",
      content: text,
      ...(image ? { image: image.preview } : {}),
    };
    const history = [...messages, userMessage];
    const now = new Date().getTime();
    if (!activeId) {
      const fresh: Conversation = {
        id: conversationId,
        title: text.slice(0, 48) || "Cuộc trò chuyện mới",
        updatedAt: now,
        messages: [...history, { role: "assistant", content: "" }],
      };
      setConversations((current) => [fresh, ...current]);
      setActiveId(conversationId);
    } else {
      updateMessages(() => [...history, { role: "assistant", content: "" }]);
      setConversations((current) =>
        current.map((item) =>
          item.id === conversationId && item.messages.length === 0
            ? { ...item, title: text.slice(0, 48) || "Cuộc trò chuyện mới" }
            : item,
        ),
      );
    }
    setPrompt("");
    setImage(null);
    setBusy(true);
    setError("");
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const apiMessages = [
        { role: "system", content: GEMINI_SYSTEM_PROMPT },
        ...history.map((message) => ({
          role: message.role,
          content: message.image
            ? [
                { type: "text", text: message.content || "Hãy xem ảnh này." },
                { type: "image_url", image_url: { url: message.image } },
              ]
            : message.content,
        })),
      ];
      const response = await fetch(
        `${baseUrl.trim().replace(/\/$/, "")}/v1/chat/completions`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey.trim()}`,
          },
          body: JSON.stringify({ model, messages: apiMessages, stream: true }),
          signal: controller.signal,
        },
      );
      if (!response.ok) {
        let payload: unknown;
        try {
          payload = await response.json();
        } catch {
          payload = null;
        }
        throw new Error(errorMessage(payload));
      }
      if (!response.body)
        throw new Error("Trình duyệt không hỗ trợ đọc streaming response.");
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      const answerRef = { current: "" };
      while (true) {
        const { value, done } = await reader.read();
        buffer += decoder.decode(value, { stream: !done });
        const events = buffer.split("\n\n");
        buffer = events.pop() || "";
        for (const eventText of events)
          for (const line of eventText.split("\n")) {
            if (!line.startsWith("data:")) continue;
            const raw = line.slice(5).trim();
            if (!raw || raw === "[DONE]") continue;
            let chunk: {
              choices?: Array<{ delta?: { content?: string } }>;
              error?: { message?: string };
            };
            try {
              chunk = JSON.parse(raw);
            } catch {
              continue;
            }
            if (chunk.error?.message) throw new Error(chunk.error.message);
            const delta = chunk.choices?.[0]?.delta?.content;
            if (typeof delta === "string" && delta) {
              answerRef.current += delta;
              setConversations((current) =>
                current.map((conversation) =>
                  conversation.id === conversationId
                    ? {
                        ...conversation,
                        updatedAt: Date.now(),
                        messages: conversation.messages.map((message, index) =>
                          index === conversation.messages.length - 1
                            ? { ...message, content: answerRef.current }
                            : message,
                        ),
                      }
                    : conversation,
                ),
              );
            }
          }
        if (done) break;
      }
    } catch (caught) {
      if (caught instanceof DOMException && caught.name === "AbortError") {
        updateMessages((current) =>
          current.map((message, index) =>
            index === current.length - 1 && !message.content
              ? { ...message, content: "(Đã dừng phản hồi)" }
              : message,
          ),
        );
      } else {
        setError(
          caught instanceof Error ? caught.message : "Đã xảy ra lỗi khi chat.",
        );
        updateMessages((current) =>
          current[current.length - 1]?.content ? current : current.slice(0, -1),
        );
      }
    } finally {
      setBusy(false);
      abortRef.current = null;
    }
  }

  function stopGeneration() {
    abortRef.current?.abort();
  }

  return (
    <section className="gemini-chat-page">
      <header className="chat-heading">
        <div className="chat-heading-icon">
          <MessageCircle size={22} />
        </div>
        <div className="chat-heading-copy">
          <span className="eyebrow">TRỢ LÝ AI GEMINI</span>
          <h1>Chat Gemini</h1>
          <p>Trò chuyện streaming với Gemini, gửi prompt kèm ảnh để hỏi đáp.</p>
        </div>
        <div className="chat-top-controls">
          <label className="chat-top-key">
            <span>Gemini2API key</span>
            <input
              type="password"
              autoComplete="off"
              value={apiKey}
              onChange={(event) => setApiKey(event.target.value)}
              placeholder="Nhập API key"
              aria-label="Gemini2API key"
              disabled={busy}
            />
          </label>
          <label className="chat-inline-model chat-top-model" aria-label="Chọn model">
            <span>Model</span>
            <select
              value={model}
              onChange={(event) => setModel(event.target.value)}
              disabled={busy}
            >
              {models.length ? (
                models.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name || item.id}
                  </option>
                ))
              ) : (
                <>
                  <option value="gemini-flash">gemini-flash</option>
                  <option value="gemini-pro">gemini-pro</option>
                  <option value="gemini-flash-lite">gemini-flash-lite</option>
                </>
              )}
            </select>
          </label>
        </div>
      </header>
      <div className="chat-workspace">
        <aside className="chat-history" aria-label="Lịch sử đoạn chat">
          <button
            type="button"
            className="chat-new-conversation"
            onClick={createConversation}
            disabled={busy}
          >
            <Plus size={16} /> Đoạn chat mới
          </button>
          <button
            type="button"
            className="chat-clear-all"
            onClick={() => setConfirmClearAll(true)}
            disabled={busy || conversations.length === 0}
          >
            <Trash2 size={15} /> Xóa tất cả đoạn chat
          </button>
          <div className="chat-history-heading">LỊCH SỬ</div>
          <div className="chat-history-list">
            {conversations.map((conversation) => (
              <div
                key={conversation.id}
                className={`chat-history-item ${conversation.id === activeId ? "is-active" : ""}`}
              >
                <button
                  type="button"
                  className="chat-history-select"
                  onClick={() => selectConversation(conversation.id)}
                  disabled={busy}
                  title={conversation.title}
                >
                  <MessageCircle size={15} />
                  <span>{conversation.title}</span>
                </button>
                <button
                  type="button"
                  className="chat-history-delete"
                  aria-label={`Xóa ${conversation.title}`}
                  onClick={() => deleteConversation(conversation.id)}
                  disabled={busy && conversation.id === activeId}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
            {conversations.length === 0 && (
              <p className="chat-history-empty">Chưa có đoạn chat nào</p>
            )}
          </div>
        </aside>
        <section className="chat-panel" aria-label="Cuộc trò chuyện Gemini">
          <div className="chat-messages" aria-live="polite" aria-relevant="additions text">
            {messages.length === 0 ? (
              <div className="chat-empty">
                <div className="chat-empty-icon">
                  <MessageCircle size={26} />
                </div>
                <h2>Bạn muốn hỏi Gemini điều gì?</h2>
                <p>
                  Nhập prompt bên dưới. Bạn cũng có thể đính kèm ảnh để Gemini
                  phân tích.
                </p>
              </div>
            ) : (
              messages.map((message, index) => (
                <article
                  className={`chat-message chat-message--${message.role}`}
                  key={`${index}-${message.role}`}
                >
                  <span className="chat-message-role">
                    {message.role === "user" ? "Bạn" : "Gemini"}
                  </span>
                  {message.image && (
                    <img
                      className="chat-message-image"
                      src={message.image}
                      alt="Ảnh đính kèm"
                    />
                  )}
                  {message.role === "assistant" && message.content && (
                    <CopyButton
                      text={normalizeMarkdown(message.content)}
                      label="Sao chép câu trả lời"
                      className="chat-message-copy"
                    />
                  )}
                  {message.content ? (
                    message.role === "assistant" ? (
                      <MarkdownRenderer
                        content={message.content}
                        streaming={busy && index === messages.length - 1}
                      />
                    ) : (
                      <div className="chat-user-content">
                        {normalizeMarkdown(message.content)}
                      </div>
                    )
                  ) : busy && index === messages.length - 1 ? (
                    <div className="chat-loading" role="status">
                      <span className="chat-loading-dots" aria-hidden="true" />
                      Gemini đang suy nghĩ…
                    </div>
                  ) : null}
                </article>
              ))
            )}
            <div ref={endRef} />
          </div>
          {error && (
            <div className="chat-error" role="alert">
              {error}
              <button
                type="button"
                aria-label="Đóng thông báo"
                onClick={() => setError("")}
              >
                <X size={16} />
              </button>
            </div>
          )}
          <form className="chat-composer" onSubmit={sendMessage}>
            {image && (
              <div className="chat-image-preview">
                <img src={image.preview} alt="Ảnh sắp gửi" />
                <button
                  type="button"
                  aria-label="Bỏ ảnh"
                  onClick={() => setImage(null)}
                >
                  <X size={15} />
                </button>
              </div>
            )}
            <textarea
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  void sendMessage(event as unknown as React.FormEvent);
                }
              }}
              placeholder="Nhập prompt cho Gemini… (Enter để gửi, Shift + Enter xuống dòng)"
              rows={3}
              disabled={busy}
            />
            <div className="chat-composer-footer">
              <div>
                <button
                  className="chat-attach"
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  disabled={busy}
                >
                  <ImagePlus size={17} /> Thêm ảnh
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={(event) => chooseImage(event.target.files?.[0])}
                />
                <span>Ảnh tối đa 10 MB</span>
              </div>
              <div className="chat-submit-actions">
                {busy ? (
                  <button
                    className="chat-send chat-stop"
                    type="button"
                    onClick={stopGeneration}
                  >
                    <Square size={15} fill="currentColor" /> Dừng
                  </button>
                ) : (
                  <button
                    className="chat-send"
                    type="submit"
                    disabled={!prompt.trim() && !image}
                  >
                    <Send size={16} /> Gửi
                  </button>
                )}
              </div>
            </div>
          </form>
        </section>
      </div>
      {confirmClearAll && (
        <div
          className="chat-confirm-overlay"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setConfirmClearAll(false);
          }}
        >
          <section
            className="chat-confirm-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="chat-confirm-title"
          >
            <div className="chat-confirm-icon">
              <Trash2 size={21} />
            </div>
            <h2 id="chat-confirm-title">Xóa tất cả đoạn chat?</h2>
            <p>
              Toàn bộ lịch sử trò chuyện Gemini sẽ bị xóa khỏi thiết bị và không
              thể khôi phục.
            </p>
            <div className="chat-confirm-actions">
              <button
                type="button"
                className="chat-confirm-cancel"
                onClick={() => setConfirmClearAll(false)}
              >
                Hủy
              </button>
              <button
                type="button"
                className="chat-confirm-delete"
                onClick={clearAllConversations}
              >
                <Trash2 size={15} /> Xóa tất cả
              </button>
            </div>
          </section>
        </div>
      )}
    </section>
  );
}
