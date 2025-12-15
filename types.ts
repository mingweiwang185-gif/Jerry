export interface HandState {
  isDetected: boolean;
  isOpen: boolean; // True if one hand is open (scatter mode)
  isDoubleOpen: boolean; // True if BOTH hands are open (explode mode)
  isPinching: boolean; // True if pinching or pointing (focus mode)
  isHeart: boolean; // True if two hands form a heart
  pinchDistance: number;
  cursorX: number; // Normalized -1 to 1
  cursorY: number; // Normalized -1 to 1
}

export interface ParticleData {
  initialPos: [number, number, number]; // Tree position
  explodedPos: [number, number, number]; // Galaxy position (lateral)
  omniPos: [number, number, number]; // Explosion position (omnidirectional)
  heartPos: [number, number, number]; // Heart position
  color: string;
  size: number;
  speed: number;
  offset: number;
}

// MediaPipe Types
export interface Landmark {
  x: number;
  y: number;
  z: number;
  visibility?: number;
}

export type NormalizedLandmarkList = Landmark[];

export interface Results {
  multiHandLandmarks: NormalizedLandmarkList[];
  image: HTMLCanvasElement | HTMLVideoElement | ImageBitmap;
}