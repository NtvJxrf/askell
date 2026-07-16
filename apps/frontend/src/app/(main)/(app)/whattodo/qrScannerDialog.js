'use client';

import { useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

const scannerElementId = "whattodo-qr-scanner";

export default function QrScannerDialog({ open, onOpenChange, onScan }) {
  const scannerRef = useRef(null);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    let html5QrCode;

    (async () => {
      const { Html5Qrcode } = await import("html5-qrcode");
      if (cancelled) return;

      html5QrCode = new Html5Qrcode(scannerElementId);
      scannerRef.current = html5QrCode;

      try {
        await html5QrCode.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          (decodedText) => {
            onScan(decodedText);
          },
          () => {}
        );
      } catch {
        if (!cancelled) {
          toast.error("Не удалось запустить камеру");
          onOpenChange(false);
        }
      }
    })();

    return () => {
      cancelled = true;
      const instance = scannerRef.current;
      scannerRef.current = null;
      if (instance) {
        instance
          .stop()
          .then(() => instance.clear())
          .catch(() => {});
      }
    };
  }, [open, onScan, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Сканирование QR</DialogTitle>
        </DialogHeader>
        <div id={scannerElementId} className="w-full" />
      </DialogContent>
    </Dialog>
  );
}
