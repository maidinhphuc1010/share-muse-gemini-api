import CopyButton from "./CopyButton";
import type { PromptPair } from "./MarkdownUtils";

export default function PromptBlock({ pair }: { pair: PromptPair }) {
  const both = `## Prompt tiếng Việt\n\n${pair.vietnamese}\n\n## English Prompt\n\n${pair.english}`;
  return (
    <section className="chat-prompt-pair" aria-label="Prompt song ngữ">
      <div className="chat-prompt-pair-heading">
        <strong>Prompt song ngữ</strong>
        <CopyButton text={both} label="Sao chép cả hai" />
      </div>
      {([
        ["Tiếng Việt", pair.vietnamese],
        ["English Prompt", pair.english],
      ] as const).map(([title, text]) => (
        <article className="chat-prompt-block" key={title}>
          <div className="chat-prompt-block-heading">
            <h3>{title}</h3>
            <CopyButton text={text} label="Sao chép prompt" />
          </div>
          <pre>{text}</pre>
        </article>
      ))}
    </section>
  );
}
