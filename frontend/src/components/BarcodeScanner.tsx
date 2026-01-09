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
  width = 1280,
  height = 720,
  fps = 24,
}: ScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const lockRef = useRef(false);

  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [cameraMode] = useState<CameraMode>("back");
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
      if (!anyLabel) return null;

      if (mode === "front") {
        const front =
          list.find((d) => /front|frontal|user/.test(norm(d.label))) || list[0];
        return front.deviceId;
      }

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

  useEffect(() => {
    if (!active) return;

    let cancelled = false;

    async function initDevices() {
      try {
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

  useEffect(() => {
    if (!active) return;

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

  const onSelectDevice = (id: string) => {
    lockRef.current = false;
    setSelectedDeviceId(id);
  };

  // --- estilos “bonitos” del selector (sin CSS externo) ---
  const overlayBarStyle: React.CSSProperties = {
    position: "absolute",
    top: 12,
    left: 12,
    right: 12,
    zIndex: 20,
    display: "flex",
    gap: 10,
    alignItems: "center",
    padding: "10px 12px",
    borderRadius: 12,
    background: "rgba(10, 12, 16, 0.55)",
    border: "1px solid rgba(255,255,255,0.12)",
    backdropFilter: "blur(10px)",
    WebkitBackdropFilter: "blur(10px)",
    boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
  };

  const labelStyle: React.CSSProperties = {
    color: "rgba(255,255,255,0.9)",
    fontSize: 12,
    fontWeight: 600,
    letterSpacing: "0.2px",
    whiteSpace: "nowrap",
    display: "flex",
    alignItems: "center",
    gap: 8,
  };

  const dotStyle: React.CSSProperties = {
    width: 8,
    height: 8,
    borderRadius: 999,
    background: "rgba(255,255,255,0.75)",
    boxShadow: "0 0 10px rgba(255,255,255,0.25)",
  };

  const selectWrapStyle: React.CSSProperties = {
    position: "relative",
    flex: 1,
    minWidth: 0,
  };

  const selectStyle: React.CSSProperties = {
    width: "100%",
    appearance: "none",
    WebkitAppearance: "none",
    MozAppearance: "none",
    background: "rgba(255,255,255,0.08)",
    color: "rgba(255,255,255,0.92)",
    border: "1px solid rgba(255,255,255,0.14)",
    borderRadius: 12,
    padding: "10px 38px 10px 12px",
    fontSize: 12,
    outline: "none",
    cursor: "pointer",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  };

  const chevronStyle: React.CSSProperties = {
    position: "absolute",
    right: 12,
    top: "50%",
    transform: "translateY(-50%)",
    pointerEvents: "none",
    color: "rgba(255,255,255,0.75)",
    fontSize: 14,
    lineHeight: 1,
  };

  return (
    <div
      style={{
        width: "100%",
        overflow: "hidden",
        background: "black",
        borderRadius: "12px",
        position: "relative",
      }}
    >
      {active && devices.length > 1 && (
        <div style={overlayBarStyle}>
          <div style={labelStyle}>
            <span style={dotStyle} />
            Cámara
          </div>

          <div style={selectWrapStyle}>
            <select
              value={selectedDeviceId ?? ""}
              onChange={(e) => onSelectDevice(e.target.value)}
              style={selectStyle}
              aria-label="Seleccionar cámara"
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
            <span style={chevronStyle}>▾</span>
          </div>
        </div>
      )}

      <video
        ref={videoRef}
        style={{ width: "100%", height: "350px", objectFit: "cover" }}
        muted
        autoPlay
        playsInline
      />

      
    </div>
  );
}
