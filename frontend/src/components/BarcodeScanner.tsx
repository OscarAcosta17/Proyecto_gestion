import { useEffect, useRef } from "react";
import {
  BrowserMultiFormatReader,
  BarcodeFormat,
  DecodeHintType,
} from "@zxing/library";

interface ScannerProps {
  onScan: (code: string) => void;
  active: boolean;
  width?: number;
  height?: number;
  fps?: number;
}

export default function BarcodeScanner({
  onScan,
  active,
  width = 1920,
  height = 1080,
  fps = 20,
}: ScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const codeReader = useRef<BrowserMultiFormatReader | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const lockRef = useRef(false);

  useEffect(() => {
    if (!active) return;

    const hints = new Map();
    const formats = [
      BarcodeFormat.EAN_13,
      BarcodeFormat.EAN_8,
      BarcodeFormat.CODE_128,
      BarcodeFormat.UPC_A,
    ];
    hints.set(DecodeHintType.POSSIBLE_FORMATS, formats);

    const reader = new BrowserMultiFormatReader(hints);
    codeReader.current = reader;
    lockRef.current = false;

    let cancelled = false;

    async function start() {
      try {
        const videoInputDevices = await reader.listVideoInputDevices();

        const backCamera = videoInputDevices.find((device) => {
          const label = (device.label || "").toLowerCase();
          return (
            label.includes("back") ||
            label.includes("environment") ||
            label.includes("trasera")
          );
        });

        const selectedDeviceId = backCamera
          ? backCamera.deviceId
          : videoInputDevices[0]?.deviceId;

        if (!selectedDeviceId) throw new Error("No se encontraron cámaras");

        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            deviceId: { exact: selectedDeviceId },
            width: { ideal: width },
            height: { ideal: height },
            frameRate: { ideal: fps, max: fps },
          },
          audio: false,
        });

        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        streamRef.current = stream;

        // --- BLOQUE DE AUTOFOCUS AÑADIDO ---
        const track = stream.getVideoTracks()[0];
        const capabilities = (track.getCapabilities?.() as any) || {};
        if (capabilities.focusMode?.includes("continuous")) {
          await track.applyConstraints({
            advanced: [{ focusMode: "continuous" }]
          } as any);
        }
        // ------------------------------------

        const videoEl = videoRef.current!;
        videoEl.srcObject = stream;
        await videoEl.play();

        reader.decodeFromStream(stream, videoEl, (result, _err) => {
          if (!result) return;
          if (lockRef.current) return;

          lockRef.current = true;
          const code = result.getText();
          if (navigator.vibrate) navigator.vibrate(200);

          reader.reset();
          stream.getTracks().forEach((t) => t.stop());
          videoEl.srcObject = null;

          onScan(code);
        });
      } catch (err) {
        console.error("Error al iniciar cámara:", err);
      }
    }

    start();

    return () => {
      cancelled = true;
      reader.reset();
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      if (videoRef.current) videoRef.current.srcObject = null;
    };
  }, [active, onScan, width, height, fps]);

  return (
    <div
      style={{
        width: "100%",
        overflow: "hidden",
        background: "black",
        borderRadius: "8px",
        display: active ? "block" : "none",
      }}
    >
      <video
        ref={videoRef}
        style={{ width: "100%", height: "300px", objectFit: "cover" }}
        muted
        autoPlay
        playsInline
      />
    </div>
  );
}