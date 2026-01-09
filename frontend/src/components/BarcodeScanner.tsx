import { useEffect, useRef, useState } from "react";
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
  // Para móvil suele ser mejor 1280x720 que 1920x1080
  width = 1280,
  height = 720,
  fps = 24,
}: ScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const codeReader = useRef<BrowserMultiFormatReader | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const trackRef = useRef<MediaStreamTrack | null>(null);
  const lockRef = useRef(false);

  const [focusPoint, setFocusPoint] = useState<{ x: number; y: number } | null>(null);
  const [torchAvailable, setTorchAvailable] = useState(false);
  const [torchOn, setTorchOn] = useState(false);

  const isIOS = () => {
    const ua = navigator.userAgent || "";
    return /iPad|iPhone|iPod/.test(ua) || (ua.includes("Mac") && "ontouchend" in document);
  };

  async function applyBestCameraConstraints(track: MediaStreamTrack) {
    const caps = (track.getCapabilities?.() as any) || {};

    // 1) Intentar enfoque continuo si está disponible
    try {
      if (caps.focusMode?.includes("continuous")) {
        await track.applyConstraints({ advanced: [{ focusMode: "continuous" }] } as any);
      } else if (caps.focusMode?.includes("auto")) {
        await track.applyConstraints({ advanced: [{ focusMode: "auto" }] } as any);
      }
    } catch {
      // silencioso: en móviles muchos navegadores fallan aunque el cap exista
    }

    // 2) Torch (flash) si existe (Android Chrome suele soportar)
    const torchCap = !!caps.torch;
    setTorchAvailable(torchCap);

    // Opcional: si quieres prender torch automáticamente en móvil (yo prefiero botón)
    // if (torchCap && !isIOS()) {
    //   try {
    //     await track.applyConstraints({ advanced: [{ torch: true }] } as any);
    //     setTorchOn(true);
    //   } catch {}
    // }
  }

  const toggleTorch = async () => {
    const track = trackRef.current;
    if (!track) return;

    const caps = (track.getCapabilities?.() as any) || {};
    if (!caps.torch) return;

    try {
      await track.applyConstraints({ advanced: [{ torch: !torchOn }] } as any);
      setTorchOn(!torchOn);
    } catch (e) {
      console.error("No se pudo activar torch:", e);
    }
  };

  // Manual focus: en web móvil es poco confiable. Lo dejamos como “best effort”.
  const handleManualFocus = async (event: React.MouseEvent<HTMLVideoElement>) => {
    const video = videoRef.current;
    const track = trackRef.current;
    if (!track || !video) return;

    const rect = video.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    setFocusPoint({ x, y });

    // iOS: normalmente NO permite focus point. Mejor solo mostrar feedback visual.
    if (isIOS()) {
      setTimeout(() => setFocusPoint(null), 800);
      return;
    }

    const caps = (track.getCapabilities?.() as any) || {};

    // Algunos Android permiten continuous/auto, pero no pointsOfInterest.
    // Otros permiten pointsOfInterest pero no manual focus.
    // Probamos "continuous" primero (mejor experiencia general).
    try {
      if (caps.focusMode?.includes("continuous")) {
        await track.applyConstraints({ advanced: [{ focusMode: "continuous" }] } as any);
      } else if (caps.focusMode?.includes("auto")) {
        await track.applyConstraints({ advanced: [{ focusMode: "auto" }] } as any);
      }
    } catch (e) {
      console.warn("No se pudo ajustar foco:", e);
    } finally {
      setTimeout(() => setFocusPoint(null), 800);
    }
  };

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
        // Importante: pedir permiso antes ayuda a que device labels aparezcan en algunos navegadores
        // (pero en iOS igual no siempre).
        // Si ya te funciona, puedes omitir esta parte.
        // await navigator.mediaDevices.getUserMedia({ video: true, audio: false });

        // Opción A (recomendada): forzar cámara trasera por facingMode
        let stream: MediaStream | null = null;
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: { ideal: "environment" },
              width: { ideal: width },
              height: { ideal: height },
              frameRate: { ideal: fps },
            },
            audio: false,
          });
        } catch {
          // Opción B: fallback a deviceId (como tu enfoque actual)
          const devices = await reader.listVideoInputDevices();
          const backCamera =
            devices.find((d) => {
              const label = (d.label || "").toLowerCase();
              return (
                (label.includes("back") ||
                  label.includes("trasera") ||
                  label.includes("environment")) &&
                !label.includes("wide") &&
                !label.includes("ultra")
              );
            }) || devices[0];

          if (!backCamera) throw new Error("No se encontraron cámaras");

          stream = await navigator.mediaDevices.getUserMedia({
            video: {
              deviceId: { exact: backCamera.deviceId },
              width: { ideal: width },
              height: { ideal: height },
              frameRate: { ideal: fps },
            },
            audio: false,
          });
        }

        if (!stream) throw new Error("No se pudo obtener stream de cámara");

        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        streamRef.current = stream;

        const track = stream.getVideoTracks()[0];
        trackRef.current = track;

        await applyBestCameraConstraints(track);

        const videoEl = videoRef.current!;
        videoEl.srcObject = stream;
        await videoEl.play();

        // decodeFromStream funciona, pero en móvil a veces es más estable decodeFromVideoDevice.
        // Como ya tenemos stream, mantenemos decodeFromStream.
        reader.decodeFromStream(stream, videoEl, (result) => {
          if (!result || lockRef.current) return;

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
      try {
        reader.reset();
      } catch {}
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      trackRef.current = null;
      setTorchAvailable(false);
      setTorchOn(false);
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
        position: "relative",
      }}
    >
      <video
        ref={videoRef}
        onClick={handleManualFocus}
        style={{ width: "100%", height: "350px", objectFit: "cover", cursor: "pointer" }}
        muted
        autoPlay
        playsInline
      />

      {/* Botón Torch (si está disponible) */}
      {active && torchAvailable && (
        <button
          onClick={toggleTorch}
          style={{
            position: "absolute",
            top: "10px",
            right: "10px",
            padding: "8px 10px",
            borderRadius: "8px",
            border: "1px solid rgba(255,255,255,0.35)",
            background: "rgba(0,0,0,0.5)",
            color: "white",
            fontSize: "12px",
            cursor: "pointer",
          }}
        >
          {torchOn ? "Flash: ON" : "Flash: OFF"}
        </button>
      )}

      {/* Círculo de enfoque visual */}
      {focusPoint && (
        <div
          style={{
            position: "absolute",
            top: focusPoint.y,
            left: focusPoint.x,
            width: "50px",
            height: "50px",
            border: "2px solid white",
            borderRadius: "50%",
            transform: "translate(-50%, -50%)",
            pointerEvents: "none",
            boxShadow: "0 0 8px rgba(255,255,255,0.6)",
            zIndex: 10,
          }}
        />
      )}

      {active && (
        <div
          style={{
            position: "absolute",
            bottom: "10px",
            left: "0",
            right: "0",
            textAlign: "center",
            color: "white",
            fontSize: "12px",
            pointerEvents: "none",
            textShadow: "1px 1px 2px black",
            padding: "0 12px",
          }}
        >
          Toca la pantalla para intentar enfocar. Si cuesta, acércate a 10–15 cm y usa el flash si está disponible.
        </div>
      )}
    </div>
  );
}
