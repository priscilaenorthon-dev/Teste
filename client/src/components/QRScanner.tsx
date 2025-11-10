import { useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader } from "@zxing/library";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface QRScannerProps {
  onScan: (code: string) => void;
  onClose: () => void;
}

export function QRScanner({ onScan, onClose }: QRScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(true);
  const codeReaderRef = useRef<BrowserMultiFormatReader | null>(null);

  useEffect(() => {
    const codeReader = new BrowserMultiFormatReader();
    codeReaderRef.current = codeReader;

    const startScanning = async () => {
      try {
        const videoInputDevices = await codeReader.listVideoInputDevices();
        
        if (videoInputDevices.length === 0) {
          setError("Nenhuma câmera encontrada");
          return;
        }

        // Try to find back camera, otherwise use first available
        const backCamera = videoInputDevices.find(device => 
          device.label.toLowerCase().includes('back') || 
          device.label.toLowerCase().includes('rear')
        );
        const selectedDevice = backCamera || videoInputDevices[0];

        if (videoRef.current) {
          await codeReader.decodeFromVideoDevice(
            selectedDevice.deviceId,
            videoRef.current,
            (result, error) => {
              if (result && scanning) {
                setScanning(false);
                onScan(result.getText());
              }
              if (error && error.name !== 'NotFoundException') {
                console.error("Scanner error:", error);
              }
            }
          );
        }
      } catch (err) {
        console.error("Error accessing camera:", err);
        setError("Erro ao acessar a câmera. Verifique as permissões.");
      }
    };

    startScanning();

    return () => {
      if (codeReaderRef.current) {
        codeReaderRef.current.reset();
      }
    };
  }, [onScan, scanning]);

  return (
    <Card className="w-full">
      <CardContent className="p-6 space-y-4">
        <div className="text-center space-y-2">
          <h3 className="text-lg font-semibold">Escaneie o QR Code do Crachá</h3>
          <p className="text-sm text-muted-foreground">
            Posicione o QR Code do crachá na frente da câmera
          </p>
        </div>

        <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden">
          {error ? (
            <div className="absolute inset-0 flex items-center justify-center text-white bg-black/80">
              <div className="text-center space-y-2">
                <span className="material-icons text-4xl">error</span>
                <p>{error}</p>
              </div>
            </div>
          ) : (
            <video
              ref={videoRef}
              className="w-full h-full object-cover"
              data-testid="qr-scanner-video"
            />
          )}
          
          {/* Scanning overlay */}
          {!error && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-48 h-48 border-2 border-primary rounded-lg">
                <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-primary rounded-tl-lg"></div>
                <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-primary rounded-tr-lg"></div>
                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-primary rounded-bl-lg"></div>
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-primary rounded-br-lg"></div>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-center">
          <Button
            variant="outline"
            onClick={onClose}
            data-testid="button-close-scanner"
          >
            <span className="material-icons text-sm mr-2">close</span>
            Cancelar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
