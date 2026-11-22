import { createSignal, onCleanup, onMount } from "solid-js";
import { LINKS, noticeTitle, TXS } from "./content";
import { DitherFill, type FillState } from "./fill";
import { useWalletSim } from "./fragments";
import { Icon } from "./icons";
import { gsap } from "./motion";
import { PearlButton, PearlLogo } from "./pearl";
import { platformGlyph } from "./platform";
import { AppIcon, Notice, reducedMotion } from "./shared";
import { Sky } from "./sky";
import { FRAME_H, FRAME_W, MacWindow } from "./window";
import "./home.css";

const LENS = { x: 0.5, y: 0.52, radius: 0.56, power: 0.14 };
const VIGNETTE = { from: 0.1, to: 1, dim: 0.85, sink: 0.92 };
const BURST = TXS.filter((tx) => tx.dir === "Received").slice(0, 5);
const BURST_GAP = 0.3;
const BURST_AT = 4.3;
const EXPAND_AT = 6.4;
const COLLAPSE_AT = 13;
const SMALL = 0.7;
const ENTER = 0.6;
const DEPTHS = [
  { y: -12, scale: 1, opacity: 1 },
  { y: 8, scale: 0.93, opacity: 0.8 },
  { y: 27, scale: 0.86, opacity: 0.5 },
  { y: 40, scale: 0.8, opacity: 0 },
];

export function Home() {
  const sim = useWalletSim(1, 11_000, 3200, true);
  const wallet = sim.wallets[0];
  const [scale, setScale] = createSignal(0.6);
  const minis: HTMLDivElement[] = [];
  let root!: HTMLElement;
  let ghost!: HTMLDivElement;
  let field!: HTMLDivElement;
  let key!: HTMLSpanElement;
  let idle!: HTMLDivElement;
  let real!: HTMLDivElement;
  let burst!: HTMLDivElement;
  let fill: ((state: FillState) => void) | undefined;

  onMount(() => {
    const fit = () =>
      setScale(
        Math.min(
          0.6,
          (innerWidth * 0.7) / FRAME_W,
          (innerHeight - 360) / FRAME_H,
        ),
      );
    fit();
    addEventListener("resize", fit);
    onCleanup(() => removeEventListener("resize", fit));
    if (reducedMotion()) return;

    gsap.fromTo(
      root.querySelectorAll("[data-rise]"),
      { opacity: 0, y: 16, filter: "blur(10px)" },
      {
        opacity: 1,
        y: 0,
        filter: "blur(0px)",
        duration: 1.3,
        ease: "expo.out",
        stagger: 0.08,
        delay: ENTER,
        clearProps: "filter",
      },
    );
    gsap.fromTo(
      root.querySelectorAll("[data-veil]"),
      { opacity: 0 },
      { opacity: 1, duration: 2.8, ease: "power2.out", delay: 0.2 },
    );

    const typed = { opacity: 1, clipPath: "inset(0 100% 0 0)" };
    const parked = { opacity: 0, scale: 0.9 };
    const queued = { opacity: 0, y: -30, scale: 0.96 };
    const open = { duration: 0.75, ease: "power4.out" };
    const close = { duration: 0.55, ease: "power3.out" };
    const sync: FillState = { level: 0, fade: 0 };
    const draw = () => fill?.(sync);
    gsap.set(key, typed);
    gsap.set(idle, parked);
    gsap.set(minis, queued);
    gsap.set(real, { opacity: 0, scale: SMALL, filter: "blur(8px)" });

    const loop = gsap
      .timeline({ repeat: -1, repeatDelay: 0.4, delay: 1.6 })
      .set(key, typed)
      .set(minis, queued)
      .set(idle, parked)
      .set(sync, { level: 0, fade: 0, onComplete: draw })
      .to(
        key,
        { clipPath: "inset(0 0% 0 0)", duration: 0.9, ease: "power2.out" },
        0.3,
      )
      .to(
        sync,
        { level: 1, duration: 1.5, ease: "power2.inOut", onUpdate: draw },
        1.5,
      )
      .to(field, { opacity: 0, duration: 0.5, ease: "power2.out" }, 2.1)
      .to(
        sync,
        { fade: 1, duration: 0.7, ease: "power2.out", onUpdate: draw },
        3.2,
      )
      .to(
        idle,
        { opacity: 1, scale: 1, duration: 0.7, ease: "power2.out" },
        3.2,
      );
    minis.forEach((_, arrived) => {
      minis.slice(0, arrived + 1).forEach((el, i) => {
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
        burst,
        { opacity: 0, scale: 0.97, duration: 0.2, ease: "power2.out" },
        EXPAND_AT - 0.15,
      )
      .to(ghost, { scale: 1 / SMALL, ...open }, EXPAND_AT)
      .to(real, { scale: 1, ...open }, EXPAND_AT)
      .to(real, { opacity: 1, duration: 0.3, ease: "power2.out" }, EXPAND_AT)
      .to(
        real,
        { filter: "blur(0px)", duration: 0.45, ease: "power2.out" },
        EXPAND_AT,
      )
      .set([key, idle], { opacity: 0 }, EXPAND_AT + 1)
      .set(field, { opacity: 1 }, EXPAND_AT + 1)
      .to(ghost, { scale: 1, ...close }, COLLAPSE_AT)
      .to(real, { scale: SMALL, ...close }, COLLAPSE_AT)
      .to(minis, { opacity: 0, duration: 0.3, ease: "power2.out" }, COLLAPSE_AT)
      .to(
        real,
        { opacity: 0, filter: "blur(8px)", duration: 0.3, ease: "power2.out" },
        COLLAPSE_AT + 0.1,
      )
      .set(burst, { opacity: 1, scale: 1 }, COLLAPSE_AT + 0.6);
    onCleanup(() => loop.kill());
  });

  return (
    <main ref={root} class="home" style={{ "--rh": `${FRAME_H * scale()}px` }}>
      <div class="home-sky" data-veil>
        <Sky
          src="/sky-slow.mp4"
          px={3}
          band={0.66}
          vignette={VIGNETTE}
          lens={LENS}
        />
      </div>
      <div class="home-glow" data-veil />

      <header class="home-top">
        <nav class="home-nav" data-rise>
          <PearlButton
            href={LINKS.download}
            label="Download"
            settle={ENTER}
            class="is-small"
          />
          <a class="site-link" href={LINKS.source}>
            <Icon name="git" class="size-4" />
            Source
          </a>
        </nav>
        <div class="home-mark" data-rise>
          <PearlLogo settle={ENTER} />
        </div>
      </header>

      <h1 class="home-label" data-rise>
        Your desktop watch-only Zcash wallet
      </h1>

      <div class="home-anchor">
        <div
          class="home-stage"
          data-rise
          style={{
            width: `${FRAME_W * scale() * SMALL}px`,
            height: `${FRAME_H * scale() * SMALL}px`,
            "--k": scale() * SMALL,
          }}
        >
          <div ref={ghost} class="home-ghost">
            <div class="home-mid">
              <div ref={field} class="home-field">
                <Icon name="eye" class="size-4 shrink-0 text-white/50" />
                <span ref={key}>uview1qg5e…k7xw</span>
              </div>
            </div>
            <DitherFill
              class="home-fill"
              cell={3}
              ref={(paint) => (fill = paint)}
            />
            <i />
            <i />
            <i />
            <div class="home-mid is-top">
              <div ref={idle} class="home-idle">
                <AppIcon />
              </div>
            </div>
          </div>
          <div
            ref={real}
            class="home-real"
            style={{
              width: `${FRAME_W * scale()}px`,
              height: `${FRAME_H * scale()}px`,
              "margin-left": `${(-FRAME_W * scale()) / 2}px`,
              "margin-top": `${(-FRAME_H * scale()) / 2}px`,
            }}
          >
            <div
              class="home-frame"
              style={{
                width: `${FRAME_W}px`,
                height: `${FRAME_H}px`,
                transform: `scale(${scale()})`,
              }}
            >
              <MacWindow wallet={wallet} rows={sim.rows} />
            </div>
          </div>
          <div ref={burst} class="home-burst">
            {BURST.map((tx) => (
              <Notice
                title={noticeTitle(tx)}
                body={wallet.name}
                class="home-mini"
                ref={(el) => minis.push(el)}
              />
            ))}
          </div>
        </div>
      </div>

      <div class="home-cta" data-rise>
        <PearlButton
          href={LINKS.download}
          label="Download"
          icon={platformGlyph()}
          settle={ENTER}
        />
      </div>
    </main>
  );
}
