import gsap from "gsap";

export { gsap };

export const reducedMotion = () =>
  !document.documentElement.classList.contains("motion");

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
