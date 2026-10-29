import type { TabItem } from "./types";
import { useState } from "react";
import "./common.css";

export function Tabs({
  items,
  defaultTab,
  activeTab,
  onChange,
  className = "",
}: {
  items: TabItem[];
  defaultTab?: string;
  activeTab?: string;
  onChange?: (id: string) => void;
  className?: string;
}) {
  const [internal, setInternal] = useState(defaultTab ?? items[0]?.id ?? "");
  const selected = activeTab ?? internal;
  const change = (id: string) => {
    if (activeTab === undefined) setInternal(id);
    onChange?.(id);
  };
  const active = items.find((item) => item.id === selected);
  return (
    <div className={`ui-tabs${className ? ` ${className}` : ""}`}>
      <div role="tablist" className="ui-tab-list">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            id={`tab-${item.id}`}
            aria-controls={`panel-${item.id}`}
            aria-selected={selected === item.id}
            disabled={item.disabled}
            className="ui-tab"
            onClick={() => change(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>
      {active && (
        <div
          role="tabpanel"
          id={`panel-${active.id}`}
          aria-labelledby={`tab-${active.id}`}
          className="ui-tab-panel"
        >
          {active.content}
        </div>
      )}
    </div>
  );
}
