import { gsap } from "../lib/motion";

const FRAME_W = 1180;
const FRAME_H = 900;
const home = document.querySelector<HTMLElement>(".home");

if (home) {
  const fit = () => {
    const scale = Math.min(
      0.6,
      (innerWidth * 0.7) / FRAME_W,
      (innerHeight - 360) / FRAME_H,
    );
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
