import gsap from "gsap";
import { reducedMotion } from "./shared";

export { gsap };

export function countTo(from: number, to: number, set: (v: number) => void) {
  if (reducedMotion()) {
    set(to);
    return;
  }
  const o = { v: from };
  gsap.to(o, {
    v: to,
    duration: 0.9,
    ease: "expo.out",
    onUpdate: () => set(o.v),
  });
}

export function rowIn(el: Element) {
  gsap
    .timeline()
    .fromTo(
      el,
      { opacity: 0, y: -14, filter: "blur(6px)" },
      {
        opacity: 1,
        y: 0,
        filter: "blur(0px)",
        duration: 0.55,
        ease: "power3.out",
        clearProps: "filter",
      },
    )
    .fromTo(
      el,
      { backgroundColor: "rgba(80,165,255,0.22)" },
      {
        backgroundColor: "rgba(80,165,255,0)",
        duration: 1.4,
        ease: "power2.out",
        clearProps: "backgroundColor",
      },
      0.1,
    );
}

export function riseIn(targets: Element[], delay = 0) {
  if (reducedMotion()) {
    gsap.fromTo(
      targets,
      { opacity: 0 },
      { opacity: 1, duration: 0.3, stagger: 0.05, delay },
    );
    return;
  }
  gsap.fromTo(
    targets,
    { opacity: 0, y: 18, filter: "blur(6px)" },
    {
      opacity: 1,
      y: 0,
      filter: "blur(0px)",
      duration: 0.9,
      ease: "expo.out",
      stagger: 0.09,
      delay,
      clearProps: "filter",
    },
  );
}
