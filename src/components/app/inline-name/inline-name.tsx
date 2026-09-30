import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import "./inline-name.css";

export function InlineName({
  value,
  placeholder,
  className,
  onCommit,
  onCancel,
}: {
  value: string;
  placeholder: string;
  className: string;
  onCommit: (next: string) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState(value);
  const ref = useRef<HTMLInputElement>(null);
  const done = useRef(false);

  useEffect(() => {
    ref.current?.focus();
    ref.current?.select();
  }, []);

  function finish(commit: boolean) {
    if (done.current) return;
    done.current = true;
    if (commit) onCommit(draft);
    else onCancel();
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    e.stopPropagation();
    if (e.key === "Enter") {
      e.preventDefault();
      finish(true);
    } else if (e.key === "Escape") {
      e.preventDefault();
      finish(false);
    }
  }

  return (
    <input
      ref={ref}
      data-escape-local
      value={draft}
      placeholder={placeholder}
      aria-label="Wallet name"
      spellCheck={false}
      maxLength={40}
      onChange={(e) => setDraft(e.target.value)}
      onKeyDown={onKeyDown}
      onBlur={() => finish(true)}
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
      className={className}
    />
  );
}
