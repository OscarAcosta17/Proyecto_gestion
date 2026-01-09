import { useEffect, useRef, useState, useCallback } from "react";
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

type CameraMode = "back" | "front";

export default function BarcodeScanner({
  onScan,
  active,
  // Mejor default para móvil
  width = 1280,
  height = 720,
  fps = 24,
}: ScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const lockRef = useRef(false);

  // UI: cámaras y modo
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [cameraMode, setCameraMode] = useState<CameraMode>("back");
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  const pickPreferredDeviceId = useCallback(
    (list: MediaDeviceInfo[], mode: CameraMode) => {
      if (!list.length) return null;

      const norm = (s: string) => (s || "").toLowerCase();
      const anyLabel = list.some((d) => norm(d.label).trim().length > 0);
      // Si no hay labels (común en iOS), no forzar deviceId, usa facingMode.
      if (!anyLabel) return null;

      if (mode === "front") {
        const front =
          list.find((d) => /front|frontal|user/.test(norm(d.label))) || list[0];
        return front.deviceId;
      }

      // back: preferir “principal”, excluir ultra-wide/tele si se puede
      const backCandidates = list.filter((d) =>
        /back|rear|trasera|environment/.test(norm(d.label))
      );

      const mainPrefer = backCandidates.find((d) =>
        /main|principal|primary/.test(norm(d.label))
      );
      const noUltraWide = backCandidates.find(
        (d) => !/ultra|wide|0\.5x/.test(norm(d.label))
      );
      const noTele = backCandidates.find(
        (d) => !/tele|zoom|2x|3x/.test(norm(d.label))
      );

      return (
        mainPrefer?.deviceId ||
        noUltraWide?.deviceId ||
        noTele?.deviceId ||
        backCandidates[0]?.deviceId ||
        list[0].deviceId
      );
    },
    []
  );

  // Enumerar dispositivos (con permiso previo para obtener labels cuando sea posible)
  useEffect(() => {
    if (!active) return;

    let cancelled = false;

    async function initDevices() {
      try {
        // Pedir permiso una vez para mejorar labels
        const temp = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
        temp.getTracks().forEach((t) => t.stop());

        const all = await navigator.mediaDevices.enumerateDevices();
        const vids = all.filter((d) => d.kind === "videoinput");
        if (cancelled) return;

        setDevices(vids);
        setSelectedDeviceId((current) => {
          if (current) return current;
          return pickPreferredDeviceId(vids, cameraMode);
        });
      } catch (e) {
        console.error("No se pudieron enumerar cámaras:", e);
      }
    }

    initDevices();

    return () => {
      cancelled = true;
    };
  }, [active, cameraMode, pickPreferredDeviceId]);

  // Iniciar / decodificar
  useEffect(() => {
    if (!active) return;

    // ✅ Reader local (NO nullable). Evita "reader possibly null".
    const hints = new Map();
    hints.set(DecodeHintType.POSSIBLE_FORMATS, [
      BarcodeFormat.EAN_13,
      BarcodeFormat.EAN_8,
      BarcodeFormat.CODE_128,
      BarcodeFormat.UPC_A,
    ]);
    const reader = new BrowserMultiFormatReader(hints);
    lockRef.current = false;

    let cancelled = false;

    async function start() {
      try {
        stopStream();

        const videoEl = videoRef.current;
        if (!videoEl) return;

        const videoConstraints: MediaTrackConstraints =
          selectedDeviceId
            ? {
                deviceId: { exact: selectedDeviceId },
                width: { ideal: width },
                height: { ideal: height },
                frameRate: { ideal: fps },
              }
            : {
                facingMode:
                  cameraMode === "back"
                    ? { ideal: "environment" }
                    : { ideal: "user" },
                width: { ideal: width },
                height: { ideal: height },
                frameRate: { ideal: fps },
              };

        const stream = await navigator.mediaDevices.getUserMedia({
          video: videoConstraints,
          audio: false,
        });

        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        streamRef.current = stream;
        videoEl.srcObject = stream;
        await videoEl.play();

        reader.decodeFromStream(stream, videoEl, (result) => {
          if (!result || lockRef.current) return;

          lockRef.current = true;
          const code = result.getText();
          if (navigator.vibrate) navigator.vibrate(200);

          // parar antes de onScan para liberar cámara
          try {
            reader.reset();
          } catch {}
          stopStream();

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
      stopStream();
    };
  }, [active, onScan, width, height, fps, selectedDeviceId, cameraMode, stopStream]);

  const flipCamera = () => {
    lockRef.current = false;
    setCameraMode((m) => (m === "back" ? "front" : "back"));
    setSelectedDeviceId(null); // autoselección según modo
  };

  const onSelectDevice = (id: string) => {
    lockRef.current = false;
    setSelectedDeviceId(id);
  };

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
      {active && (
        <div
          style={{
            position: "absolute",
            top: 10,
            left: 10,
            right: 10,
            display: "flex",
            gap: 8,
            zIndex: 20,
          }}
        >
          <button
            onClick={flipCamera}
            style={{
              padding: "8px 10px",
              borderRadius: 8,
              border: "1px solid rgba(255,255,255,0.35)",
              background: "rgba(0,0,0,0.55)",
              color: "white",
              fontSize: 12,
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            Girar cámara
          </button>

          {devices.length > 1 && (
            <select
              value={selectedDeviceId ?? ""}
              onChange={(e) => onSelectDevice(e.target.value)}
              style={{
                flex: 1,
                padding: "8px 10px",
                borderRadius: 8,
                border: "1px solid rgba(255,255,255,0.35)",
                background: "rgba(0,0,0,0.55)",
                color: "white",
                fontSize: 12,
              }}
            >
              <option value="" disabled>
                Selecciona cámara…
              </option>
              {devices.map((d) => (
                <option key={d.deviceId} value={d.deviceId}>
                  {d.label ? d.label : `Cámara ${d.deviceId.slice(-4)}`}
                </option>
              ))}
            </select>
          )}
        </div>
      )}

      <video
        ref={videoRef}
        style={{ width: "100%", height: "350px", objectFit: "cover" }}
        muted
        autoPlay
        playsInline
      />

      {active && (
        <div
          style={{
            position: "absolute",
            bottom: 10,
            left: 0,
            right: 0,
            textAlign: "center",
            color: "white",
            fontSize: 12,
            pointerEvents: "none",
            textShadow: "1px 1px 2px black",
            padding: "0 12px",
          }}
        >
          Si se abre la frontal, presiona “Girar cámara”. Si hay varias traseras,
          selecciona la principal.
        </div>
      )}
    </div>
  );
}
