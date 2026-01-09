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
  width = 1920,
  height = 1080,
  fps = 20,
}: ScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const codeReader = useRef<BrowserMultiFormatReader | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const lockRef = useRef(false);

  // Estado para la posición del círculo de enfoque visual
  const [focusPoint, setFocusPoint] = useState<{ x: number; y: number } | null>(null);

  // Función para manejar el foco manual al tocar el video
  const handleManualFocus = async (event: React.MouseEvent<HTMLVideoElement>) => {
    const video = videoRef.current;
    const track = streamRef.current?.getVideoTracks()[0];
    if (!track || !video) return;

    // 1. Lógica visual: calcular posición del toque para el círculo
    const rect = video.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    setFocusPoint({ x, y });

    // 2. Lógica de Hardware: aplicar restricciones de enfoque
    const capabilities = (track.getCapabilities?.() as any) || {};
    if (capabilities.focusMode?.includes("manual")) {
      try {
        await track.applyConstraints({
          advanced: [{ 
            focusMode: "manual",
            // Algunos navegadores permiten enviar coordenadas normalizadas (0 a 1)
            pointsOfInterest: [{ x: x / rect.width, y: y / rect.height }] 
          }]
        } as any);
        
        // Volvemos a modo continuo tras 1.5 segundos para no dejar la lente bloqueada
        setTimeout(async () => {
          setFocusPoint(null);
          await track.applyConstraints({ advanced: [{ focusMode: "continuous" }] } as any);
        }, 1500);
      } catch (e) {
        console.error("Error manual focus hardware:", e);
      }
    } else {
      // Si el hardware no soporta manual, ocultamos el círculo tras un momento
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
        const videoInputDevices = await reader.listVideoInputDevices();

        const backCamera = videoInputDevices.find((device) => {
          const label = (device.label || "").toLowerCase();
          return (
            (label.includes("back") || label.includes("trasera") || label.includes("environment")) &&
            !label.includes("wide") && !label.includes("ultra") 
          );
        }) || videoInputDevices[0];

        if (!backCamera) throw new Error("No se encontraron cámaras");

        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            deviceId: { exact: backCamera.deviceId },
            width: { ideal: width },
            height: { ideal: height },
            frameRate: { ideal: fps },
          },
          audio: false,
        });

        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        streamRef.current = stream;

        const track = stream.getVideoTracks()[0];
        const capabilities = (track.getCapabilities?.() as any) || {};
        if (capabilities.focusMode?.includes("continuous")) {
          await track.applyConstraints({
            advanced: [{ focusMode: "continuous" }]
          } as any);
        }

        const videoEl = videoRef.current!;
        videoEl.srcObject = stream;
        await videoEl.play();

        reader.decodeFromStream(stream, videoEl, (result, _err) => {
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
      reader.reset();
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      if (videoRef.current) videoRef.current.srcObject = null;
    };
  }, [active, onScan, width, height, fps]);

  return (
    <div style={{ width: "100%", overflow: "hidden", background: "black", borderRadius: "8px", position: "relative" }}>
      <video
        ref={videoRef}
        onClick={handleManualFocus}
        style={{ width: "100%", height: "350px", objectFit: "cover", cursor: "pointer" }}
        muted
        autoPlay
        playsInline
      />

      {/* CÍRCULO DE ENFOQUE VISUAL */}
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
            transition: "opacity 0.2s"
          }}
        />
      )}

      {active && (
        <div style={{
          position: "absolute",
          bottom: "10px",
          left: "0",
          right: "0",
          textAlign: "center",
          color: "white",
          fontSize: "12px",
          pointerEvents: "none",
          textShadow: "1px 1px 2px black"
        }}>
          Toca la pantalla para enfocar
        </div>
      )}
    </div>
  );
}