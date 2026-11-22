import { useCallback, useEffect, useRef } from "react";
import { noticeTitle, TXS } from "../lib/content";
import { gsap, reducedMotion } from "../lib/motion";
import { useWallet } from "./dashboard";
import { DitherFill, type FillPainter, type FillState } from "./fill";
import { Icon } from "./icons";
import { AppIcon, Notice } from "./shared";
import { MacWindow } from "./window";

const BURST = TXS.filter((tx) => tx.dir === "Received").slice(0, 5);
const BURST_GAP = 0.3;
const BURST_AT = 4.3;
const EXPAND_AT = 6.4;
const COLLAPSE_AT = 13;
const SMALL = 0.7;
const DEPTHS = [
  { y: -12, scale: 1, opacity: 1 },
  { y: 8, scale: 0.93, opacity: 0.8 },
  { y: 27, scale: 0.86, opacity: 0.5 },
  { y: 40, scale: 0.8, opacity: 0 },
];

export function Stage({ still }: { still: string }) {
  const wallet = useWallet();
  const ghost = useRef<HTMLDivElement>(null);
  const field = useRef<HTMLDivElement>(null);
  const key = useRef<HTMLSpanElement>(null);
  const idle = useRef<HTMLDivElement>(null);
  const real = useRef<HTMLDivElement>(null);
  const burst = useRef<HTMLDivElement>(null);
  const minis = useRef<(HTMLDivElement | null)[]>([]);
  const fill = useRef<FillPainter | null>(null);
  const keepFill = useCallback((paint: FillPainter) => {
    fill.current = paint;
  }, []);

  useEffect(() => {
    if (reducedMotion()) return;
    const notes = minis.current.filter((el) => el !== null);
    const typed = { opacity: 1, clipPath: "inset(0 100% 0 0)" };
    const parked = { opacity: 0, scale: 0.9 };
    const queued = { opacity: 0, y: -30, scale: 0.96 };
    const open = { duration: 0.75, ease: "power4.out" };
    const close = { duration: 0.55, ease: "power3.out" };
    const sync: FillState = { level: 0, fade: 0 };
    const draw = () => fill.current?.(sync);
    gsap.set(real.current, { opacity: 0, scale: SMALL, filter: "blur(8px)" });

    const loop = gsap
      .timeline({ repeat: -1, repeatDelay: 0.4, delay: 1.6 })
      .set(key.current, typed)
      .set(notes, queued)
      .set(idle.current, parked)
      .set(sync, { level: 0, fade: 0, onComplete: draw })
      .to(
        key.current,
        { clipPath: "inset(0 0% 0 0)", duration: 0.9, ease: "power2.out" },
        0.3,
      )
      .to(
        sync,
        { level: 1, duration: 1.5, ease: "power2.inOut", onUpdate: draw },
        1.5,
      )
      .to(field.current, { opacity: 0, duration: 0.5, ease: "power2.out" }, 2.1)
      .to(
        sync,
        { fade: 1, duration: 0.7, ease: "power2.out", onUpdate: draw },
        3.2,
      )
      .to(
        idle.current,
        { opacity: 1, scale: 1, duration: 0.7, ease: "power2.out" },
        3.2,
      );
    notes.forEach((_, arrived) => {
      notes.slice(0, arrived + 1).forEach((el, i) => {
        const depth = DEPTHS[Math.min(arrived - i, DEPTHS.length - 1)];
        loop.to(
          el,
          { ...depth, duration: BURST_GAP - 0.02, ease: "power3.out" },
          BURST_AT + arrived * BURST_GAP,
        );
      });
    });
    loop
      .to(
        burst.current,
        { opacity: 0, scale: 0.97, duration: 0.2, ease: "power2.out" },
        EXPAND_AT - 0.15,
      )
      .to(ghost.current, { scale: 1 / SMALL, ...open }, EXPAND_AT)
      .to(real.current, { scale: 1, ...open }, EXPAND_AT)
      .to(
        real.current,
        { opacity: 1, duration: 0.3, ease: "power2.out" },
        EXPAND_AT,
      )
      .to(
        real.current,
        { filter: "blur(0px)", duration: 0.45, ease: "power2.out" },
        EXPAND_AT,
      )
      .set([key.current, idle.current], { opacity: 0 }, EXPAND_AT + 1)
      .set(field.current, { opacity: 1 }, EXPAND_AT + 1)
      .to(ghost.current, { scale: 1, ...close }, COLLAPSE_AT)
      .to(real.current, { scale: SMALL, ...close }, COLLAPSE_AT)
      .to(notes, { opacity: 0, duration: 0.3, ease: "power2.out" }, COLLAPSE_AT)
      .to(
        real.current,
        { opacity: 0, filter: "blur(8px)", duration: 0.3, ease: "power2.out" },
        COLLAPSE_AT + 0.1,
      )
      .set(burst.current, { opacity: 1, scale: 1 }, COLLAPSE_AT + 0.6);

    return () => {
      loop.kill();
    };
  }, []);

  return (
    <div className="home-stage" aria-hidden inert>
      <div ref={ghost} className="home-ghost">
        <div className="home-mid">
          <div ref={field} className="home-field">
            <Icon name="eye" className="size-4 shrink-0 text-white/50" />
            <span ref={key} className="home-key">
              uview1qg5e…k7xw
            </span>
          </div>
        </div>
        <DitherFill
          className="home-fill"
          src={still}
          cell={3}
          onReady={keepFill}
        />
        <i />
        <i />
        <i />
        <div className="home-mid is-top">
          <div ref={idle} className="home-idle">
            <AppIcon />
          </div>
        </div>
      </div>
      <div ref={real} className="home-real">
        <div className="home-frame">
          <MacWindow wallet={wallet} />
        </div>
      </div>
      <div ref={burst} className="home-burst">
        {BURST.map((tx, i) => (
          <Notice
            key={tx.txid}
            title={noticeTitle(tx)}
            body={wallet.name}
            className="home-mini"
            ref={(el) => {
              minis.current[i] = el;
            }}
          />
        ))}
      </div>
    </div>
  );
}
