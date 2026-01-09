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
  width = 1280, // Bajamos la resolución ideal para evitar saturar el bus de datos del móvil
  height = 720,
  fps = 25,
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
            label.includes("trasera") ||
            label.includes("0") // En algunos Android la cámara 0 es la trasera principal
          );
        });

        const selectedDeviceId = backCamera
          ? backCamera.deviceId
          : videoInputDevices[0]?.deviceId;

        if (!selectedDeviceId && videoInputDevices.length === 0) {
            throw new Error("No se encontraron cámaras");
        }

        // --- AJUSTE DE CONSTRAINTS PARA MÓVIL ---
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            deviceId: selectedDeviceId ? { exact: selectedDeviceId } : undefined,
            facingMode: "environment", // Prioridad absoluta a la cámara trasera
            width: { ideal: width },
            height: { ideal: height },
            frameRate: { ideal: fps }
          },
          audio: false,
        });

        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        streamRef.current = stream;

        const videoEl = videoRef.current!;
        videoEl.srcObject = stream;
        
        // --- ASEGURAR REPRODUCCIÓN ---
        videoEl.onloadedmetadata = () => {
          videoEl.play().catch(e => console.error("Error auto-play:", e));
        };

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
      if (codeReader.current) codeReader.current.reset();
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
      if (videoRef.current) videoRef.current.srcObject = null;
    };
  }, [active, onScan, width, height, fps]);

  return (
    <div
      style={{
        width: "100%",
        overflow: "hidden",
        background: "black",
        borderRadius: "12px",
        display: active ? "block" : "none",
        position: "relative",
        aspectRatio: "4/3" // Ayuda al navegador a reservar el espacio correcto
      }}
    >
      <video
        ref={videoRef}
        style={{ width: "100%", height: "100%", objectFit: "cover" }}
        muted
        autoPlay
        playsInline // CRÍTICO para móviles iOS/Android
      />
      {/* Overlay visual opcional para que el usuario sepa dónde apuntar */}
      <div style={{
        position: "absolute",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        border: "2px solid rgba(0, 255, 0, 0.5)",
        width: "70%",
        height: "40%",
        pointerEvents: "none",
        boxShadow: "0 0 0 4000px rgba(0, 0, 0, 0.3)"
      }}></div>
    </div>
  );
}