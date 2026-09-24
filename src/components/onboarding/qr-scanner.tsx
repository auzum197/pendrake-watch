import { useEffect, useEffectEvent, useRef, useState } from "react";
import { IconCameraOff } from "@tabler/icons-react";
import { openUrl } from "@tauri-apps/plugin-opener";
import { ufvkFromQr } from "@/lib/onboarding";

// Camera import is macOS-only for now. The bundle carries the camera usage string
// and entitlement, and wry grants WKWebView's media request, so macOS's own prompt
// is the only gate. mediaDevices is absent outside a secure context, and there the
// scan button stays hidden too.
export const canScanQr =
  typeof navigator !== "undefined" &&
  /Mac/.test(navigator.userAgent) &&
  navigator.mediaDevices !== undefined;

const CAMERA_SETTINGS =
  "x-apple.systempreferences:com.apple.preference.security?Privacy_Camera";

// The longest square side handed to the decoder. A UFVK code is dense, so the
// center crop of a 1080p frame goes through at full resolution.
const MAX_SIDE = 1080;

// How long a found code holds on screen, frozen with the frame locked on, before
// the key drops into the field. Long enough to register as a result, short enough
// that nobody waits on it.
const LOCK_MS = 450;

type Status = "starting" | "scanning" | "found" | "denied" | "unavailable";

// The viewfinder that takes the UFVK field's place while scanning. It occupies the
// same box, so opening and closing cross-fade in place with a slight scale instead
// of moving anything else on the screen. It stays mounted through the fade out, but
// the camera stops the moment `open` turns false.
export function QrScanner({
  open,
  onScan,
  onClose,
  className = "",
}: {
  open: boolean;
  onScan: (ufvk: string) => void;
  onClose: () => void;
  className?: string;
}) {
  const [mounted, setMounted] = useState(open);
  const [shown, setShown] = useState(false);
  // Bumped on every open, so a reopen during the fade out starts a fresh session.
  const [session, setSession] = useState(0);

  useEffect(() => {
    if (open) {
      setMounted(true);
      setSession((s) => s + 1);
      const frame = requestAnimationFrame(() => setShown(true));
      return () => cancelAnimationFrame(frame);
    }
    setShown(false);
    const timer = setTimeout(() => setMounted(false), 300);
    return () => clearTimeout(timer);
  }, [open]);

  const close = useEffectEvent(onClose);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (!mounted) return null;

  return (
    <div
      className={`relative min-h-52 overflow-hidden rounded-xl border border-ink-line bg-black transition-[opacity,scale] duration-300 ease-out-soft motion-reduce:scale-100 ${
        shown ? "scale-100 opacity-100" : "scale-[0.98] opacity-0"
      } ${className}`}
    >
      <Viewfinder key={session} live={open} onScan={onScan} />
    </div>
  );
}

function Viewfinder({
  live,
  onScan,
}: {
  live: boolean;
  onScan: (ufvk: string) => void;
}) {
  const video = useRef<HTMLVideoElement>(null);
  const [status, setStatus] = useState<Status>("starting");
  // A readable code that isn't a UFVK, shown briefly while scanning carries on.
  const [misread, setMisread] = useState(false);
  const scanned = useEffectEvent(onScan);

  useEffect(() => {
    const el = video.current;
    const ctx = document
      .createElement("canvas")
      .getContext("2d", { willReadFrequently: true });
    if (!live || !el || !ctx) return;

    let stopped = false;
    let stream: MediaStream | undefined;
    let frame = 0;
    let lock = 0;
    let clearMisread = 0;
    const release = (s: MediaStream) => s.getTracks().forEach((t) => t.stop());
    const worker = new Worker(
      new URL("../../lib/qr-worker.ts", import.meta.url),
      {
        type: "module",
      },
    );

    // One frame in flight at a time: the next capture waits on the worker's reply.
    const capture = () => {
      const side = Math.min(el.videoWidth, el.videoHeight);
      const size = Math.min(side, MAX_SIDE);
      ctx.canvas.width = size;
      ctx.canvas.height = size;
      ctx.drawImage(
        el,
        (el.videoWidth - side) / 2,
        (el.videoHeight - side) / 2,
        side,
        side,
        0,
        0,
        size,
        size,
      );
      const { data } = ctx.getImageData(0, 0, size, size);
      worker.postMessage({ pixels: data.buffer, size }, [data.buffer]);
    };

    worker.onmessage = (e: MessageEvent<string | null>) => {
      const ufvk = e.data === null ? null : ufvkFromQr(e.data);
      if (ufvk) {
        el.pause();
        setStatus("found");
        lock = window.setTimeout(() => scanned(ufvk), LOCK_MS);
        return;
      }
      if (e.data !== null) {
        setMisread(true);
        clearTimeout(clearMisread);
        clearMisread = window.setTimeout(() => setMisread(false), 1600);
      }
      frame = requestAnimationFrame(capture);
    };

    navigator.mediaDevices
      .getUserMedia({
        video: { width: { ideal: 1920 }, height: { ideal: 1080 } },
      })
      .then(async (s) => {
        if (stopped) {
          release(s);
          return;
        }
        stream = s;
        el.srcObject = s;
        await el.play();
        setStatus("scanning");
        capture();
      })
      .catch((err) => {
        if (stopped) return;
        setStatus(
          err instanceof DOMException && err.name === "NotAllowedError"
            ? "denied"
            : "unavailable",
        );
      });

    return () => {
      stopped = true;
      cancelAnimationFrame(frame);
      clearTimeout(lock);
      clearTimeout(clearMisread);
      worker.terminate();
      if (stream) release(stream);
    };
  }, [live]);

  const found = status === "found";

  return (
    <>
      {/* Mirrored like Photo Booth, so moving the code left moves it left on screen. */}
      <video
        ref={video}
        muted
        playsInline
        className={`absolute inset-0 size-full -scale-x-100 object-cover transition-opacity duration-300 ease-out-soft ${
          status === "scanning" || found ? "opacity-100" : "opacity-0"
        }`}
      />

      {status === "denied" || status === "unavailable" ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-8 text-center">
          <IconCameraOff className="size-6 text-white/40" />
          <p className="text-sm text-white/70">
            {status === "denied"
              ? "Pendrake doesn't have access to the camera. Allow it in System Settings, then scan again."
              : "No camera is available on this Mac."}
          </p>
          {status === "denied" && (
            <button
              type="button"
              onClick={() => openUrl(CAMERA_SETTINGS)}
              className="h-8 rounded-full bg-white/10 px-4 text-xs font-medium text-white/85 transition-colors hover:bg-white/15"
            >
              Open System Settings
            </button>
          )}
        </div>
      ) : (
        // The frame and its caption stack in one centered column, so the caption
        // keeps the same gap below the frame at any field height.
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
          {(status === "scanning" || found) && (
            // The area outside the frame dims, and on a find the frame closes in
            // on the code and turns brand blue.
            <div
              aria-hidden
              className={`relative size-40 shrink-0 rounded-2xl shadow-[0_0_0_100vmax_rgb(0_0_0/0.4)] transition-[scale,color] duration-300 ease-out-soft ${
                found ? "text-brand motion-safe:scale-[0.92]" : "text-white/85"
              }`}
            >
              <span className="absolute left-0 top-0 size-6 rounded-tl-2xl border-l-[3px] border-t-[3px] border-current" />
              <span className="absolute right-0 top-0 size-6 rounded-tr-2xl border-r-[3px] border-t-[3px] border-current" />
              <span className="absolute bottom-0 left-0 size-6 rounded-bl-2xl border-b-[3px] border-l-[3px] border-current" />
              <span className="absolute bottom-0 right-0 size-6 rounded-br-2xl border-b-[3px] border-r-[3px] border-current" />
            </div>
          )}
          {/* Positioned so it paints above the frame's dimming shadow. */}
          <p
            role="status"
            className={`relative whitespace-nowrap rounded-full bg-black/55 px-3 py-1.5 text-xs font-medium backdrop-blur-md transition-colors ${
              misread && !found ? "text-amber-300" : "text-white/85"
            }`}
          >
            {status === "starting"
              ? "Starting camera…"
              : found
                ? "Viewing key found"
                : misread
                  ? "That QR code isn't a viewing key"
                  : "Hold the QR code inside the frame"}
          </p>
        </div>
      )}
    </>
  );
}
