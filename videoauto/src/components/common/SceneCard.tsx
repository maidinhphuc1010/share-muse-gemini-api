import CopyButton from "./CopyButton";
import type { ScriptScene } from "./MarkdownUtils";

export default function SceneCard({ scene }: { scene: ScriptScene }) {
  const text = `${scene.heading}\n${scene.content.trim()}`;
  return (
    <article className="chat-scene-card">
      <header>
        <h3>{scene.heading || `Cảnh ${scene.number}`}</h3>
        <CopyButton text={text} label="Sao chép cảnh" />
      </header>
      <div>{scene.content}</div>
    </article>
  );
}
