import { useEffect, useRef } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";

interface ScannerProps {
  onScan: (code: string) => void;
  active: boolean;
}

export default function BarcodeScanner({ onScan, active }: ScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<any>(null); // Usamos any para evitar líos de tipos

  useEffect(() => {
    if (!active) return;

    const reader = new BrowserMultiFormatReader();
    
    // INICIAR CÁMARA
    // CORRECCIÓN: Agregamos ': any' a result y err para quitar las líneas rojas
    reader.decodeFromVideoDevice(undefined, videoRef.current!, (result: any, _err: any, _controls: any) => {
      if (result) {
        const code = result.getText();
        // Detener al encontrar algo
        controlsRef.current?.stop(); 
        onScan(code);
      }
    })
    .then((controls: any) => {
      controlsRef.current = controls;
    })
    .catch((err: any) => console.error("Error cámara:", err));

    return () => {
      controlsRef.current?.stop();
    };
  }, [active, onScan]);

  return (
    <div style={{ width: '100%', overflow: 'hidden', background: 'black', borderRadius: '8px', display: active ? 'block' : 'none' }}>
      <video ref={videoRef} style={{ width: '100%', height: '300px', objectFit: 'cover' }} />
    </div>
  );
}