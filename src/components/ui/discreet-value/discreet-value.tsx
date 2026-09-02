import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type PointerEvent,
} from "react";
import { useMasked } from "@/lib/discreet";
import { animationsEnabled } from "@/lib/motion";
import "./discreet-value.css";


export type DiscreetKind =
  | "zec"
  | "usd"
  | "date"
  | "block"
  | "txid"
  | "address"
  | "memo"
  | "label";

const MASKS: Record<DiscreetKind, string> = {
  zec: "█████",
  usd: "$█████",
  date: "██████",
  block: "#███████",
  txid: "████████████",
  address: "████████████████████",
  memo: "███████████████",
  label: "████████",
};

export function maskFor(kind: DiscreetKind): string {
  return MASKS[kind];
}

const frames = new Set<(now: number) => void>();
let raf = 0;

function pump(now: number) {
  for (const cb of Array.from(frames)) cb(now);
  raf = frames.size > 0 ? requestAnimationFrame(pump) : 0;
}

function onFrame(cb: (now: number) => void): () => void {
  frames.add(cb);
  if (raf === 0) raf = requestAnimationFrame(pump);
  return () => {
    frames.delete(cb);
    if (frames.size === 0 && raf !== 0) {
      cancelAnimationFrame(raf);
      raf = 0;
    }
  };
}

const SCRAMBLE_MS = 500;
const ROLL_MS = 40;
const GLYPHS = "0123456789█";

const easeOut = (t: number) => 1 - (1 - t) ** 3;

function scrambleGlyphs(to: string): string {
  return Array.from(to, (c) =>
    c === " " ? " " : GLYPHS.charAt(Math.floor(Math.random() * GLYPHS.length)),
  ).join("");
}

function runScramble(
  to: string,
  set: (text: string) => void,
  done: () => void,
): () => void {
  const t0 = performance.now();
  let lastRoll = -Infinity;
  let glyphs: string[] = [];
  const stop = onFrame((now) => {
    const p = Math.min((now - t0) / SCRAMBLE_MS, 1);
    if (p >= 1) {
      stop();
      done();
      return;
    }
    if (now - lastRoll >= ROLL_MS) {
      glyphs = Array.from(scrambleGlyphs(to));
      lastRoll = now;
    }
    const resolved = Math.floor(easeOut(p) * to.length);
    set(
      Array.from(to, (c, i) => (i < resolved || c === " " ? c : glyphs[i])).join(
        "",
      ),
    );
  });
  return stop;
}

const HOLD_MS = 250;

export function DiscreetMask({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={`discreet-mask${className ? ` ${className}` : ""}`}
    >
      {Array.from(text).map((glyph, i) => (
        <span
          key={i}
          className={glyph === "█" ? "discreet-mask-block" : undefined}
          style={{ animationDelay: `${i * 70}ms` }}
        >
          {glyph}
        </span>
      ))}
    </span>
  );
}

export function DiscreetPeek({
  value,
  mask,
  className,
}: {
  value: string;
  mask: string;
  className?: string;
}) {
  const [peeked, setPeeked] = useState(false);
  const wrap = useRef<HTMLSpanElement>(null);
  const holdTimer = useRef(0);
  const prevWidth = useRef<number | null>(null);
  const widthAnim = useRef<Animation | null>(null);
  const peekedOnce = useRef(false);

  useEffect(
    () => () => {
      widthAnim.current?.cancel();
      window.clearTimeout(holdTimer.current);
    },
    [],
  );

  function press(e: PointerEvent) {
    if (e.button !== 0) return;
    window.clearTimeout(holdTimer.current);
    holdTimer.current = window.setTimeout(() => {
      peekedOnce.current = true;
      prevWidth.current = wrap.current?.offsetWidth ?? null;
      setPeeked(true);
    }, HOLD_MS);
  }

  function release() {
    window.clearTimeout(holdTimer.current);
    if (peeked) prevWidth.current = wrap.current?.offsetWidth ?? null;
    setPeeked(false);
  }

  useLayoutEffect(() => {
    const el = wrap.current;
    const from = prevWidth.current;
    prevWidth.current = null;
    if (!el || from == null || !animationsEnabled()) return;
    const to = el.offsetWidth;
    if (from === to) return;
    widthAnim.current?.cancel();
    el.style.whiteSpace = "nowrap";
    el.style.clipPath = "inset(0)";
    const run = el.animate([{ width: `${from}px` }, { width: `${to}px` }], {
      duration: 200,
      easing: "cubic-bezier(0.22, 1, 0.36, 1)",
    });
    widthAnim.current = run;
    run.onfinish = () => {
      if (widthAnim.current !== run) return;
      widthAnim.current = null;
      el.style.whiteSpace = "";
      el.style.clipPath = "";
    };
  }, [peeked]);

  return (
    <span
      ref={wrap}
      className={`tabular-nums discreet-peekable ${className ?? ""}`}
      aria-label="Hidden"
      onPointerDown={press}
      onPointerUp={release}
      onPointerLeave={release}
      onPointerCancel={release}
      style={{ touchAction: "none" }}
    >
      {peeked ? (
        <span
          aria-hidden
          key="peek"
          className={animationsEnabled() ? "discreet-peek-edge" : undefined}
        >
          {value}
        </span>
      ) : (
        <DiscreetMask
          key="mask"
          text={mask}
          className={
            peekedOnce.current && animationsEnabled()
              ? "discreet-peek-edge"
              : undefined
          }
        />
      )}
    </span>
  );
}

export function DiscreetValue({
  kind,
  children,
  className,
  peekable = true,
}: {
  kind: DiscreetKind;
  children: string;
  className?: string;
  peekable?: boolean;
}) {
  const masked = useMasked();
  const target = masked ? MASKS[kind] : children;
  const [frame, setFrame] = useState<string | null>(null);
  const [prev, setPrev] = useState(masked);

  if (prev !== masked) {
    setPrev(masked);
    setFrame(animationsEnabled() ? scrambleGlyphs(target) : null);
  }

  const prevMasked = useRef(masked);
  const cancel = useRef<(() => void) | null>(null);

  useEffect(() => () => cancel.current?.(), []);

  useEffect(() => {
    const flipped = prevMasked.current !== masked;
    prevMasked.current = masked;
    if (!flipped) return;
    cancel.current?.();
    if (!animationsEnabled()) {
      setFrame(null);
      return;
    }
    cancel.current = runScramble(target, setFrame, () => {
      cancel.current = null;
      setFrame(null);
    });
  }, [masked, target]);

  const text = frame ?? target;
  if (!masked) {
    return <span className={`tabular-nums ${className ?? ""}`}>{text}</span>;
  }
  if (!peekable) {
    return (
      <span className={`tabular-nums ${className ?? ""}`} aria-label="Hidden">
        <DiscreetMask text={text} />
      </span>
    );
  }
  return <DiscreetPeek value={children} mask={text} className={className} />;
}