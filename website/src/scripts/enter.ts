import { gsap } from "../lib/motion";

const FRAME_W = 1180;
const FRAME_H = 900;
const home = document.querySelector<HTMLElement>(".home");

if (home) {
  const side = matchMedia("(max-height: 520px) and (orientation: landscape)");
  const fit = () => {
    const wide = Math.max(innerWidth * 0.7, Math.min(innerWidth - 32, 420));
    const scale = side.matches
      ? Math.min((innerWidth * 0.46) / FRAME_W, (innerHeight - 120) / FRAME_H)
      : Math.min(0.6, wide / FRAME_W, (innerHeight - 360) / FRAME_H);
    home.style.setProperty("--s", String(scale));
  };
  fit();
  addEventListener("resize", fit);

  if (document.documentElement.classList.contains("motion")) {
    gsap.fromTo(
      "[data-rise]",
      { opacity: 0, y: 16, filter: "blur(10px)" },
      {
        opacity: 1,
        y: 0,
        filter: "blur(0px)",
        duration: 1.3,
        ease: "expo.out",
        stagger: 0.08,
        delay: 0.6,
        clearProps: "filter",
      },
    );
    gsap.fromTo(
      "[data-veil]",
      { opacity: 0 },
      { opacity: 1, duration: 2.8, ease: "power2.out", delay: 0.2 },
    );
  }
}
