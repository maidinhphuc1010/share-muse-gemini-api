import { Children, isValidElement, type ReactElement, type ReactNode } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import CopyButton from "./CopyButton";
import PromptBlock from "./PromptBlock";
import SceneCard from "./SceneCard";
import {
  findPromptPair,
  findScriptScenes,
  findScriptTitle,
  normalizeMarkdown,
  type ScriptScene,
} from "./MarkdownUtils";

type Props = { content: string; streaming?: boolean };


function plainText(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(plainText).join("");
  if (isValidElement<{ children?: ReactNode }>(node)) return plainText(node.props.children);
  return "";
}

export default function MarkdownRenderer({ content, streaming = false }: Props) {
  const markdown = normalizeMarkdown(content);
  const pair = findPromptPair(markdown);
  const scenes: ScriptScene[] = pair ? [] : findScriptScenes(markdown);
  const title = scenes.length ? findScriptTitle(markdown) : null;
  const components: Components = {
    a: ({ children, href, ...props }) => (
      <a {...props} href={href} target="_blank" rel="noopener noreferrer">
        {children}
      </a>
    ),
    table: ({ children }) => (
      <div className="chat-markdown-table-wrap">
        <table>{children}</table>
      </div>
    ),
    th: ({ children }) => <th>{children}</th>,
    td: ({ children }) => <td>{children}</td>,
    pre: ({ children }) => {
      const codeElement = Children.toArray(children).find(isValidElement) as
        | ReactElement<{ children?: ReactNode; className?: string }>
        | undefined;
      const text = codeElement
        ? plainText(codeElement.props.children)
        : plainText(children);
      const language = codeElement?.props.className?.match(/language-([\w-]+)/)?.[1];
      return (
        <div className="chat-code-block">
          <div className="chat-code-heading">
            <span>{language || "Code"}</span>
            <CopyButton text={text.replace(/\n$/, "")} label="Sao chép code" />
          </div>
          <pre>{children}</pre>
        </div>
      );
    },
  };

  return (
    <div className="chat-markdown">
      {pair && <PromptBlock pair={pair} />}
      {scenes.length > 0 ? (
        <section className="chat-script-scenes">
          {title && <h2 className="chat-script-title">{title.replace(/^#+\s*/, "")}</h2>}
          {scenes.map((scene) => <SceneCard key={`${scene.number}-${scene.heading}`} scene={scene} />)}
          <details className="chat-script-source">
            <summary>Xem kịch bản đầy đủ</summary>
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>{markdown}</ReactMarkdown>
          </details>
        </section>
      ) : (
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>{markdown}</ReactMarkdown>
      )}
      {streaming && <span className="chat-streaming-cursor" aria-label="Đang tạo câu trả lời" />}
    </div>
  );
}
