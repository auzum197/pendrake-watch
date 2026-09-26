import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import pendrakeLogo from "@/assets/pendrake-logo.svg";
import { OnboardingBackdrop } from "./backdrop/onboarding-backdrop";
import "./onboarding-card.css";

export function OnboardingCard({
  stepKey = "single",
  progress,
  children,
}: {
  stepKey?: string;
  progress?: { step: number; total: number };
  children: ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-ink text-white">
      <OnboardingBackdrop className="onboarding-fade-in scale-[1.08] blur-[12px]" />
      <div className="absolute inset-0 bg-gradient-to-b from-ink/20 via-ink/40 to-ink/80" />
      <div className="relative flex h-full flex-col items-center overflow-y-auto px-10 py-12">
        <img
          src={pendrakeLogo}
          alt="Pendrake"
          className="onboarding-rise h-[27px]"
        />
        <div className="flex w-full flex-1 flex-col justify-center py-10">
          <div className="onboarding-card-arrive relative mx-auto w-full max-w-xl rounded-[32px] border border-white/15 bg-[#141416] p-10 shadow-[0_40px_90px_-30px_rgba(0,0,0,0.85)]">
            <HeightGlide>
              <StepSwitch stepKey={stepKey}>{children}</StepSwitch>
            </HeightGlide>
          </div>
          {progress && (
            <div className="mx-auto mt-6 w-full max-w-xl px-10">
              <QuietTrack {...progress} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StepSwitch({
  stepKey,
  children,
}: {
  stepKey: string;
  children: ReactNode;
}) {
  const [committed, setCommitted] = useState(stepKey);
  const [leaving, setLeaving] = useState<{
    key: string;
    content: ReactNode;
  } | null>(null);
  const previous = useRef({ key: stepKey, content: children });
  const incoming = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (previous.current.key === stepKey) {
      previous.current.content = children;
      return;
    }
    setLeaving(previous.current);
    previous.current = { key: stepKey, content: children };
    void incoming.current?.offsetWidth;
    const frame = requestAnimationFrame(() => setCommitted(stepKey));
    return () => cancelAnimationFrame(frame);
  }, [stepKey, children]);

  useEffect(() => {
    if (!leaving) return;
    const timer = setTimeout(() => setLeaving(null), 250);
    return () => clearTimeout(timer);
  }, [leaving]);

  const entering = committed !== stepKey;
  const exiting = leaving && leaving.key !== stepKey ? leaving : null;

  return (
    <div className="relative">
      {exiting && (
        <div
          key={exiting.key}
          inert
          aria-hidden
          data-state="exiting"
          className="onboarding-step absolute inset-x-0 top-0"
        >
          {exiting.content}
        </div>
      )}
      <div
        key={stepKey}
        ref={incoming}
        data-state={entering ? "entering" : "entered"}
        className="onboarding-step"
      >
        {children}
      </div>
    </div>
  );
}

function HeightGlide({ children }: { children: ReactNode }) {
  const inner = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number>();
  useEffect(() => {
    const el = inner.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) =>
      setHeight(entry.contentRect.height),
    );
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return (
    <div
      className="overflow-hidden ease-out-soft motion-safe:transition-[height] motion-safe:duration-250"
      style={{ height }}
    >
      <div ref={inner}>{children}</div>
    </div>
  );
}

function QuietTrack({ step, total }: { step: number; total: number }) {
  const gap = 0.25;
  return (
    <div className="relative mx-auto flex w-28 gap-1" aria-hidden>
      {Array.from({ length: total }, (_, i) => (
        <span key={i} className="h-0.5 flex-1 rounded-full bg-white/10" />
      ))}
      <span
        className="absolute inset-y-0 left-0 rounded-full bg-brand/80 ease-out-soft motion-safe:transition-transform motion-safe:duration-250"
        style={{
          width: `calc((100% - ${(total - 1) * gap}rem) / ${total})`,
          transform: `translateX(calc(${step} * (100% + ${gap}rem)))`,
        }}
      />
    </div>
  );
}
