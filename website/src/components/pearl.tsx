import {
  getShaderColorFromString,
  liquidMetalFragmentShader,
  ShaderFitOptions,
  ShaderMount,
  toProcessedLiquidMetal,
} from "@paper-design/shaders";
import {
  useEffect,
  useImperativeHandle,
  useRef,
  useSyncExternalStore,
  type Ref,
} from "react";
import wordmark from "@/assets/pendrake-wordmark.png?url";
import dragon from "../../../src-tauri/icon-composer/AppIcon.icon/Assets/dragon.png?url";
import { gsap, reducedMotion } from "../lib/motion";
import {
  GLYPHS,
  platformGlyph,
  type Glyph,
  type Platform,
} from "../lib/platform";
import "../styles/pearl.css";

const FRAME = 2500;

const FINISH = {
  u_colorBack: [0, 0, 0, 0] as [number, number, number, number],
  u_colorTint: getShaderColorFromString("#ffffff"),
  u_repetition: 1.5,
  u_softness: 0.8,
  u_shiftRed: 0.1,
  u_shiftBlue: 0.1,
  u_distortion: 0.05,
  u_contour: 0.3,
  u_angle: 70,
  u_shape: 0,
  u_isImage: true,
  u_fit: ShaderFitOptions.contain,
  u_scale: 1,
  u_rotation: 0,
  u_originX: 0.5,
  u_originY: 0.5,
  u_offsetX: 0,
  u_offsetY: 0,
  u_worldWidth: 0,
  u_worldHeight: 0,
};

const PLATE = { u_repetition: 1.2, u_softness: 1, u_contour: 0.55 };
const ENTER = 0.6;
const STAGGER = 0.08;
const SETTLE = { span: 1800, duration: 2.4, ease: "expo.out" };
const REWIND = { duration: 1.4, ease: "power3.out" };
const REPLAY = { duration: 1.8, ease: "expo.out" };
const HOVER = { span: 1100, shift: 0.38, distortion: 0.16 };

const finePointer = () =>
  matchMedia("(hover: hover) and (pointer: fine)").matches;

async function finishImage(src: string | File) {
  const { pngBlob } = await toProcessedLiquidMetal(src);
  const url = URL.createObjectURL(pngBlob);
  const img = new Image();
  img.src = url;
  await img.decode();
  URL.revokeObjectURL(url);
  return img;
}

function mountFinish(
  host: HTMLElement,
  image: HTMLImageElement,
  frame: number,
  tune: Partial<typeof FINISH> = {},
) {
  return new ShaderMount(
    host,
    liquidMetalFragmentShader,
    { ...FINISH, ...tune, u_image: image },
    undefined,
    0,
    frame,
  );
}

type Flow = { rewind: () => void; replay: () => void };

function PearlImage({
  src,
  aspect,
  delay,
  ref,
}: {
  src: string;
  aspect: number;
  delay: number;
  ref: Ref<Flow>;
}) {
  const finish = useRef<HTMLDivElement>(null);
  const flow = useRef<Flow | null>(null);

  useImperativeHandle(ref, () => ({
    rewind: () => flow.current?.rewind(),
    replay: () => flow.current?.replay(),
  }));

  useEffect(() => {
    const host = finish.current;
    if (!host) return;
    const still = reducedMotion();
    const born = performance.now();
    const clock = { frame: still ? FRAME : FRAME - SETTLE.span };
    let mount: ShaderMount | null = null;
    let gone = false;
    const run = (frame: number, timing: gsap.TweenVars) =>
      gsap.to(clock, {
        frame,
        ...timing,
        overwrite: true,
        onUpdate: () => mount?.setFrame(clock.frame),
      });
    if (!still) {
      flow.current = {
        rewind: () => run(FRAME - SETTLE.span, REWIND),
        replay: () => run(FRAME, REPLAY),
      };
    }

    finishImage(src).then((loaded) => {
      if (gone) return;
      mount = mountFinish(host, loaded, clock.frame);
      if (still) return;
      const waited = (performance.now() - born) / 1000;
      run(FRAME, {
        duration: SETTLE.duration,
        ease: SETTLE.ease,
        delay: Math.max(0, delay - waited),
      });
    });

    return () => {
      gone = true;
      flow.current = null;
      gsap.killTweensOf(clock);
      mount?.dispose();
    };
  }, [src, delay]);

  return (
    <div className="pearl" style={{ aspectRatio: aspect }}>
      <div className="pearl-base" style={{ maskImage: `url(${src})` }} />
      <div ref={finish} className="pearl-finish" />
    </div>
  );
}

export function PearlLogo() {
  const mark = useRef<Flow>(null);
  const word = useRef<Flow>(null);
  return (
    <div
      className="pearl-logo"
      onPointerEnter={() => {
        if (!finePointer()) return;
        mark.current?.rewind();
        word.current?.rewind();
      }}
      onPointerLeave={() => {
        mark.current?.replay();
        word.current?.replay();
      }}
    >
      <PearlImage ref={mark} src={dragon} aspect={1} delay={ENTER} />
      <PearlImage
        ref={word}
        src={wordmark}
        aspect={998 / 240}
        delay={ENTER + STAGGER}
      />
    </div>
  );
}

function engraved(
  root: HTMLElement,
  label: HTMLElement,
  icon: SVGSVGElement | null,
  glyph?: Glyph,
) {
  const frame = root.getBoundingClientRect();
  const { width, height } = frame;
  const style = getComputedStyle(label);
  const size = parseFloat(style.fontSize);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(width * 4);
  canvas.height = Math.round(height * 4);
  const c = canvas.getContext("2d")!;
  c.scale(4, 4);
  c.fillStyle = "#fff";
  c.beginPath();
  c.roundRect(0, 0, width, height, height / 2);
  c.fill();
  c.globalCompositeOperation = "destination-out";
  c.font = `${style.fontWeight} ${size}px ${style.fontFamily}`;
  c.letterSpacing = style.letterSpacing;
  c.textAlign = "left";
  c.textBaseline = "middle";
  c.fillText(
    label.textContent ?? "",
    label.getBoundingClientRect().left - frame.left,
    height / 2 + size * 0.04,
  );
  if (icon && glyph) {
    const box = icon.getBoundingClientRect();
    c.translate(box.left - frame.left, box.top - frame.top);
    c.scale(box.width / 24, box.height / 24);
    c.fill(new Path2D(glyph.path));
  }
  return new Promise<File>((resolve) =>
    canvas.toBlob(
      (blob) => resolve(new File([blob!], "plate.png", { type: "image/png" })),
      "image/png",
    ),
  );
}

const never = () => () => {};
const noGlyph = () => undefined;

export function PearlButton({
  href,
  label,
  small,
  icon,
}: {
  href: string;
  label: string;
  small?: boolean;
  icon?: Platform | "detect";
}) {
  const root = useRef<HTMLAnchorElement>(null);
  const base = useRef<HTMLSpanElement>(null);
  const finish = useRef<HTMLSpanElement>(null);
  const text = useRef<HTMLSpanElement>(null);
  const mark = useRef<SVGSVGElement>(null);
  const hover = useRef<{ over: () => void; out: () => void } | null>(null);
  const detected = useSyncExternalStore(
    never,
    icon === "detect" ? platformGlyph : noGlyph,
    noGlyph,
  );
  const glyph = icon && icon !== "detect" ? GLYPHS[icon] : detected;

  useEffect(() => {
    const link = root.current;
    const plateEl = base.current;
    const host = finish.current;
    const labelEl = text.current;
    if (!link || !plateEl || !host || !labelEl) return;
    const still = reducedMotion();
    const born = performance.now();
    const rest = {
      frame: FRAME,
      shift: FINISH.u_shiftRed,
      distortion: FINISH.u_distortion,
    };
    const state = { ...rest, frame: still ? FRAME : FRAME - SETTLE.span };
    let mount: ShaderMount | null = null;
    let plate = "";
    let gone = false;

    const apply = () => {
      mount?.setFrame(state.frame);
      mount?.setUniforms({
        u_shiftRed: state.shift,
        u_shiftBlue: state.shift,
        u_distortion: state.distortion,
      });
    };

    engraved(link, labelEl, mark.current, glyph)
      .then((file) => {
        plate = URL.createObjectURL(file);
        return finishImage(file);
      })
      .then((loaded) => {
        if (gone) return;
        plateEl.style.maskImage = `url(${plate})`;
        link.dataset.ready = "true";
        mount = mountFinish(host, loaded, state.frame, PLATE);
        if (still) return;
        gsap.to(state, {
          frame: FRAME,
          duration: SETTLE.duration,
          ease: SETTLE.ease,
          delay: Math.max(0, ENTER - (performance.now() - born) / 1000),
          onUpdate: apply,
        });
      });

    if (!still) {
      hover.current = {
        over: () =>
          gsap.to(state, {
            frame: FRAME + HOVER.span,
            shift: HOVER.shift,
            distortion: HOVER.distortion,
            duration: 1.4,
            ease: "expo.out",
            overwrite: true,
            onUpdate: apply,
          }),
        out: () =>
          gsap.to(state, {
            ...rest,
            duration: 0.7,
            ease: "power3.out",
            overwrite: true,
            onUpdate: apply,
          }),
      };
    }

    return () => {
      gone = true;
      hover.current = null;
      gsap.killTweensOf(state);
      mount?.dispose();
      if (plate) URL.revokeObjectURL(plate);
      delete link.dataset.ready;
      plateEl.style.maskImage = "";
    };
  }, [label, glyph]);

  return (
    <a
      ref={root}
      className={`pearl-cta ${small ? "is-small" : ""}`}
      href={href}
      aria-label={glyph ? `${label} for ${glyph.name}` : undefined}
      onPointerEnter={() => {
        if (finePointer()) hover.current?.over();
      }}
      onPointerLeave={() => hover.current?.out()}
    >
      <span className="pearl-cta-back" />
      <span ref={base} className="pearl-cta-base" />
      <span ref={finish} className="pearl-cta-finish" />
      <span className="pearl-cta-label">
        {glyph && (
          <svg
            ref={mark}
            className="pearl-cta-icon"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path d={glyph.path} fill="currentColor" />
          </svg>
        )}
        <span ref={text}>{label}</span>
      </span>
    </a>
  );
}
