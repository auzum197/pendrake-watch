import {
  createEffect,
  createSignal,
  on,
  onCleanup,
  onMount,
  type Accessor,
} from "solid-js";
import {
  getShaderColorFromString,
  liquidMetalFragmentShader,
  ShaderFitOptions,
  ShaderMount,
  toProcessedLiquidMetal,
} from "@paper-design/shaders";
import dragon from "../../src-tauri/icon-composer/AppIcon.icon/Assets/dragon.png";
import wordmark from "@/assets/pendrake-wordmark.png";
import { gsap } from "./motion";
import type { Glyph } from "./platform";
import { reducedMotion } from "./shared";
import "./pearl.css";

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

async function finishImage(src: string | File) {
  const { pngBlob } = await toProcessedLiquidMetal(src);
  const img = new Image();
  img.src = URL.createObjectURL(pngBlob);
  await img.decode();
  return img;
}

const release = (img: HTMLImageElement) => URL.revokeObjectURL(img.src);

function mountFinish(
  host: HTMLElement,
  image: HTMLImageElement,
  frame = FRAME,
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

const SETTLE = { span: 1800, duration: 2.4, ease: "expo.out" };

const REWIND = { duration: 1.4, ease: "power3.out" };
const REPLAY = { duration: 1.8, ease: "expo.out" };

export function PearlImage(props: {
  src: string;
  aspect: number;
  class?: string;
  settle?: number;
  rewound?: Accessor<boolean>;
}) {
  let finish!: HTMLDivElement;
  let mount: ShaderMount | null = null;
  const still = reducedMotion();
  const clock = {
    frame: still || props.settle === undefined ? FRAME : FRAME - SETTLE.span,
  };
  const run = (frame: number, timing: gsap.TweenVars) =>
    gsap.to(clock, {
      frame,
      ...timing,
      overwrite: true,
      onUpdate: () => mount?.setFrame(clock.frame),
    });

  onMount(() => {
    const born = performance.now();
    let img: HTMLImageElement | null = null;
    let gone = false;
    finishImage(props.src).then((loaded) => {
      if (gone) return release(loaded);
      img = loaded;
      mount = mountFinish(finish, loaded, clock.frame);
      if (clock.frame === FRAME) return;
      const waited = (performance.now() - born) / 1000;
      run(FRAME, {
        duration: SETTLE.duration,
        ease: SETTLE.ease,
        delay: Math.max(0, (props.settle ?? 0) - waited),
      });
    });
    onCleanup(() => {
      gone = true;
      gsap.killTweensOf(clock);
      mount?.dispose();
      if (img) release(img);
    });
  });

  createEffect(
    on(
      () => props.rewound?.(),
      (back) => {
        if (still || back === undefined) return;
        if (back) run(FRAME - SETTLE.span, REWIND);
        else run(FRAME, REPLAY);
      },
      { defer: true },
    ),
  );

  return (
    <div
      class={`pearl ${props.class ?? ""}`}
      style={{ "aspect-ratio": String(props.aspect) }}
    >
      <div
        class="pearl-base"
        style={{
          "mask-image": `url(${props.src})`,
          "-webkit-mask-image": `url(${props.src})`,
        }}
      />
      <div ref={finish} class="pearl-finish" />
    </div>
  );
}

const HOVER = { span: 1100, shift: 0.38, distortion: 0.16 };

const PLATE = { u_repetition: 1.2, u_softness: 1, u_contour: 0.55 };

function engraved(
  el: HTMLElement,
  label: HTMLElement,
  mark?: { el: Element; path: string },
) {
  const frame = el.getBoundingClientRect();
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
  if (mark) {
    const box = mark.el.getBoundingClientRect();
    c.translate(box.left - frame.left, box.top - frame.top);
    c.scale(box.width / 24, box.height / 24);
    c.fill(new Path2D(mark.path));
  }
  return new Promise<File>((resolve) =>
    canvas.toBlob(
      (blob) => resolve(new File([blob!], "plate.png", { type: "image/png" })),
      "image/png",
    ),
  );
}

export function PearlButton(props: {
  href: string;
  label: string;
  icon?: Glyph;
  settle?: number;
  class?: string;
}) {
  let root!: HTMLAnchorElement;
  let glyph: SVGSVGElement | undefined;
  let base!: HTMLSpanElement;
  let finish!: HTMLSpanElement;
  let label!: HTMLSpanElement;

  onMount(() => {
    const born = performance.now();
    const still = reducedMotion();
    const settle = still ? undefined : props.settle;
    const rest = {
      frame: FRAME,
      shift: FINISH.u_shiftRed,
      distortion: FINISH.u_distortion,
    };
    const state = {
      ...rest,
      frame: settle === undefined ? FRAME : FRAME - SETTLE.span,
    };
    let mount: ShaderMount | null = null;
    let img: HTMLImageElement | null = null;
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

    engraved(
      root,
      label,
      glyph && props.icon ? { el: glyph, path: props.icon.path } : undefined,
    )
      .then((file) => {
        plate = URL.createObjectURL(file);
        return finishImage(file);
      })
      .then((loaded) => {
        if (gone) return release(loaded);
        img = loaded;
        base.style.maskImage = `url(${plate})`;
        base.style.webkitMaskImage = `url(${plate})`;
        root.dataset.ready = "true";
        mount = mountFinish(finish, loaded, state.frame, PLATE);
        if (settle === undefined) return;
        gsap.to(state, {
          frame: FRAME,
          duration: SETTLE.duration,
          ease: SETTLE.ease,
          delay: Math.max(0, settle - (performance.now() - born) / 1000),
          onUpdate: apply,
        });
      });

    const over = () =>
      gsap.to(state, {
        frame: FRAME + HOVER.span,
        shift: HOVER.shift,
        distortion: HOVER.distortion,
        duration: 1.4,
        ease: "expo.out",
        overwrite: true,
        onUpdate: apply,
      });
    const out = () =>
      gsap.to(state, {
        ...rest,
        duration: 0.7,
        ease: "power3.out",
        overwrite: true,
        onUpdate: apply,
      });

    if (!still && matchMedia("(hover: hover) and (pointer: fine)").matches) {
      root.addEventListener("pointerenter", over);
      root.addEventListener("pointerleave", out);
    }

    onCleanup(() => {
      gone = true;
      gsap.killTweensOf(state);
      root.removeEventListener("pointerenter", over);
      root.removeEventListener("pointerleave", out);
      mount?.dispose();
      if (img) release(img);
      if (plate) URL.revokeObjectURL(plate);
    });
  });

  return (
    <a
      ref={root}
      class={`pearl-cta ${props.class ?? ""}`}
      href={props.href}
      aria-label={
        props.icon ? `${props.label} for ${props.icon.name}` : undefined
      }
    >
      <span class="pearl-cta-back" />
      <span ref={base} class="pearl-cta-base" />
      <span ref={finish} class="pearl-cta-finish" />
      <span class="pearl-cta-label">
        {props.icon && (
          <svg
            ref={glyph}
            class="pearl-cta-icon"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path d={props.icon.path} fill="currentColor" />
          </svg>
        )}
        <span ref={label}>{props.label}</span>
      </span>
    </a>
  );
}

const SETTLE_STAGGER = 0.08;

export function PearlLogo(props: {
  class?: string;
  mark?: boolean;
  settle?: number;
}) {
  const [rewound, setRewound] = createSignal(false);
  const fine = matchMedia("(hover: hover) and (pointer: fine)").matches;
  const later = () =>
    props.settle === undefined ? undefined : props.settle + SETTLE_STAGGER;
  return (
    <div
      class={`pearl-logo ${props.class ?? ""}`}
      onPointerEnter={() => fine && setRewound(true)}
      onPointerLeave={() => setRewound(false)}
    >
      <PearlImage
        src={dragon}
        aspect={1}
        settle={props.settle}
        rewound={rewound}
      />
      {(props.mark ?? true) && (
        <PearlImage
          src={wordmark}
          aspect={998 / 240}
          settle={later()}
          rewound={rewound}
        />
      )}
    </div>
  );
}
