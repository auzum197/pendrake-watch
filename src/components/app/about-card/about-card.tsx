import { useEffect, useRef, useState } from "react";
import {
  IconCheck,
  IconChevronLeft,
  IconChevronRight,
  IconCopy,
  IconHeartFilled,
} from "@tabler/icons-react";
import { QRCodeSVG } from "qrcode.react";
import appIcon from "@/assets/app-icon.png";
import wordmark from "@/assets/pendrake-wordmark.png";
import { animationsEnabled } from "@/lib/motion";
import { abbreviate, MARK, paymentUri, SUPPORT_ADDRESS } from "@/lib/support";
import "./about-card.css";

type Face = "about" | "support";

// The About contents: the macOS app icon, the wordmark, a one-line description, and
// the credits. Rendered standalone inside its own window (see about-window.tsx). The
// icon is the shipped AppIcon, so its squircle and gradient come baked into the PNG.
//
// It reads as a native panel, not a page: nothing selects, the images don't lift into
// a drag, and the pointer stays an arrow rather than turning into an I-beam over text.
export function AboutCard({
  address = SUPPORT_ADDRESS,
  initialFace = "about",
}: {
  address?: string;
  initialFace?: Face;
}) {
  const [face, setFace] = useState<Face>(address ? initialFace : "about");
  const [animate] = useState(animationsEnabled);
  const supporting = face === "support";

  useEffect(() => {
    if (!supporting) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setFace("about");
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [supporting]);

  return (
    <div
      className={`about-faces cursor-default px-8 ${animate ? "" : "is-static"}`}
    >
      <section
        className="about-face"
        data-hidden={supporting}
        inert={supporting}
      >
        <AppIcon />
        <img
          src={wordmark}
          alt="pendrake"
          draggable={false}
          className="mt-6 h-10 [-webkit-user-drag:none]"
        />
        <p className="mt-5 text-[15px] leading-snug text-muted-foreground">
          A Zcash watch-only wallet to track your savings.
        </p>
        <p className="mt-8 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
          Made with
          <IconHeartFilled className="size-3.5 text-sky-200" />
          by Darío, José and Micaela
        </p>
        {address && (
          <button
            type="button"
            className="about-link mt-4"
            onClick={() => setFace("support")}
          >
            Support Pendrake
            <IconChevronRight className="size-3.5" />
          </button>
        )}
      </section>

      {address && <SupportFace address={address} hidden={!supporting} />}

      {address && (
        <button
          type="button"
          className="about-back"
          aria-label="Back to About"
          data-hidden={!supporting}
          inert={!supporting}
          onClick={() => setFace("about")}
        >
          <IconChevronLeft className="size-4" />
        </button>
      )}
    </div>
  );
}

function SupportFace({
  address,
  hidden,
}: {
  address: string;
  hidden: boolean;
}) {
  return (
    <section className="about-face" data-hidden={hidden} inert={hidden}>
      <h2 className="support-title">Support Pendrake</h2>
      <div className="support-qr mt-5">
        <QRCodeSVG
          value={paymentUri(address)}
          size={152}
          level="M"
          marginSize={0}
          fgColor="#101012"
          bgColor="#ffffff"
          title="Zcash payment QR for Pendrake"
        />
      </div>
      <CopyAddress address={address} />
    </section>
  );
}

function AddressText({ address }: { address: string }) {
  const { head, tail } = abbreviate(address);
  return (
    <span className="support-address-text">
      <span className="support-address-mark">{head.slice(0, MARK)}</span>
      {head.slice(MARK)}…{tail.slice(0, -MARK)}
      <span className="support-address-mark">{tail.slice(-MARK)}</span>
    </span>
  );
}

function CopyAddress({ address }: { address: string }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef(0);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  return (
    <button
      type="button"
      className="support-address mt-4"
      data-copied={copied}
      title={address}
      onClick={() => {
        void navigator.clipboard?.writeText(address);
        setCopied(true);
        window.clearTimeout(timer.current);
        timer.current = window.setTimeout(() => setCopied(false), 1400);
      }}
    >
      <span className="support-address-state" data-shown={!copied}>
        <AddressText address={address} />
        <IconCopy className="size-3.5" />
      </span>
      <span className="support-address-state" data-shown={copied}>
        <span>Copied</span>
        <IconCheck className="size-3.5 text-emerald-400" />
      </span>
    </button>
  );
}

// The specular rim macOS puts on app icons: a hairline that catches the light at the
// top-left and again at the bottom-right, fading out along the other two edges. The
// ring is cut from the icon's own alpha (the full silhouette minus a 2px-inset copy),
// so it traces the real squircle instead of a border-radius approximation of it.
function AppIcon() {
  const ring = {
    background:
      "linear-gradient(135deg, rgba(255,255,255,0.7), rgba(255,255,255,0) 38%, rgba(255,255,255,0) 62%, rgba(255,255,255,0.45))",
    maskImage: `url(${appIcon}), url(${appIcon})`,
    maskSize: "100% 100%, calc(100% - 2px) calc(100% - 2px)",
    maskPosition: "center, center",
    maskRepeat: "no-repeat, no-repeat",
    maskComposite: "exclude",
    WebkitMaskImage: `url(${appIcon}), url(${appIcon})`,
    WebkitMaskSize: "100% 100%, calc(100% - 2px) calc(100% - 2px)",
    WebkitMaskPosition: "center, center",
    WebkitMaskRepeat: "no-repeat, no-repeat",
    WebkitMaskComposite: "xor",
  } as const;

  return (
    <div className="relative size-20">
      <img
        src={appIcon}
        alt=""
        draggable={false}
        className="size-20 [-webkit-user-drag:none]"
      />
      <span aria-hidden className="absolute inset-0" style={ring} />
    </div>
  );
}
