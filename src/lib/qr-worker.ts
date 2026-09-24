import { prepareZXingModule, readBarcodes } from "zxing-wasm/reader";
import wasmUrl from "zxing-wasm/reader/zxing_reader.wasm?url";

// zxing-cpp built to WebAssembly. A UFVK code is version 17 or so, and a webcam
// frame of it is always a little soft, which zxing still reads. The WASM ships in
// the bundle, since zxing-wasm otherwise fetches it from the jsDelivr CDN.
prepareZXingModule({
  overrides: {
    locateFile: (path: string, prefix: string) =>
      path.endsWith(".wasm") ? wasmUrl : prefix + path,
  },
});

// Decodes one square camera frame off the main thread, so the viewfinder keeps its
// frame rate. Replies with the code's text, or null when the frame holds no
// readable QR code. zxing also tries the inverted image, which covers a dark-mode
// wallet rendering light modules on a dark background.
self.onmessage = async (
  e: MessageEvent<{ pixels: ArrayBuffer; size: number }>,
) => {
  const { pixels, size } = e.data;
  const [code] = await readBarcodes(
    new ImageData(new Uint8ClampedArray(pixels), size, size),
    { formats: ["QRCode"], tryHarder: true, maxNumberOfSymbols: 1 },
  );
  self.postMessage(code?.text ?? null);
};
