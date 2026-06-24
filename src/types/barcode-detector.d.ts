/**
 * Minimal ambient types for the Barcode Detection API, which isn't in TS's lib.dom yet. The hall-pass
 * QR scanner uses it as a fast path when present (Android Chrome/Edge) and feature-detects it at
 * runtime via `window.BarcodeDetector`, falling back to jsQR (iOS Safari and other browsers).
 */
export {};

declare global {
  interface DetectedBarcode {
    rawValue: string;
    format: string;
  }

  interface BarcodeDetector {
    detect(source: CanvasImageSource): Promise<DetectedBarcode[]>;
  }

  interface BarcodeDetectorConstructor {
    new (options?: { formats?: string[] }): BarcodeDetector;
    getSupportedFormats(): Promise<string[]>;
  }

  interface Window {
    BarcodeDetector?: BarcodeDetectorConstructor;
  }
}
