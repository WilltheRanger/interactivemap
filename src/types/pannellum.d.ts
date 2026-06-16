/**
 * Minimal ambient types for Pannellum (the 360° panorama viewer). The npm package ships no TS types
 * and its build (build/pannellum.js) attaches `pannellum` to `window` as a side effect. The locker
 * PanoramaViewer imports it for that side effect and drives it via `window.pannellum.viewer(...)`.
 */
export {};

declare module 'pannellum';

declare global {
  interface PannellumViewer {
    on(type: string, listener: (...args: unknown[]) => void): PannellumViewer;
    destroy(): void;
    getYaw(): number;
    getPitch(): number;
  }

  interface PannellumHotSpot {
    pitch: number;
    yaw: number;
    cssClass?: string;
    createTooltipFunc?: (hotSpotDiv: HTMLElement, args?: unknown) => void;
    createTooltipArgs?: unknown;
  }

  interface PannellumConfig {
    type: 'equirectangular';
    panorama: string;
    autoLoad?: boolean;
    showZoomCtrl?: boolean;
    showFullscreenCtrl?: boolean;
    yaw?: number;
    pitch?: number;
    hfov?: number;
    minHfov?: number;
    maxHfov?: number;
    crossOrigin?: string;
    hotSpots?: PannellumHotSpot[];
  }

  interface Window {
    pannellum?: {
      viewer(container: HTMLElement | string, config: PannellumConfig): PannellumViewer;
    };
  }
}
