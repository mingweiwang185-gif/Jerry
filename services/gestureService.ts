import { NormalizedLandmarkList } from '../types';

// Helper to calculate distance between two landmarks
const getDist = (a: any, b: any) => {
    return Math.hypot(a.x - b.x, a.y - b.y);
};

export const isHandOpen = (landmarks: NormalizedLandmarkList): boolean => {
  if (!landmarks || landmarks.length < 21) return false;

  const wrist = landmarks[0];
  
  // Tips: Index, Middle, Ring, Pinky
  const tips = [landmarks[8], landmarks[12], landmarks[16], landmarks[20]];
  // PIPs (Middle Joint): Index, Middle, Ring, Pinky
  const pips = [landmarks[6], landmarks[10], landmarks[14], landmarks[18]]; // Using PIP instead of MCP for better "fist" detection

  let extendedCount = 0;

  // Check 4 fingers
  for (let i = 0; i < 4; i++) {
      const dTipToWrist = getDist(tips[i], wrist);
      const dPipToWrist = getDist(pips[i], wrist);

      // In a fist, the tip is often closer to the wrist than the PIP joint, or very close.
      // In an open hand, the tip is significantly further.
      // We use a lower threshold (1.1) to make "Open" detection smoother/easier.
      if (dTipToWrist > dPipToWrist * 1.1) {
          extendedCount++;
      }
  }

  // Thumb Check
  const thumbTip = landmarks[4];
  const thumbMcp = landmarks[2];
  const pinkyMcp = landmarks[17];
  
  const dThumbTipToPinky = getDist(thumbTip, pinkyMcp);
  const dThumbMcpToPinky = getDist(thumbMcp, pinkyMcp);
  
  if (dThumbTipToPinky > dThumbMcpToPinky) {
      extendedCount++;
  }

  // We require 5 fingers extended for a "Galaxy Explode" (Open Hand)
  // This helps distinguish it from "Pointing" (which has 1 finger) or lazy hands.
  return extendedCount >= 5;
};

// Check for "Number 1" gesture (Index finger up, others curled)
export const isPointing = (landmarks: NormalizedLandmarkList): boolean => {
  if (!landmarks || landmarks.length < 21) return false;

  const wrist = landmarks[0];

  const isFingerExtended = (tipIdx: number, pipIdx: number) => {
      const dTip = getDist(landmarks[tipIdx], wrist);
      const dPip = getDist(landmarks[pipIdx], wrist);
      return dTip > dPip * 1.1; // Standard extension check
  };

  const isFingerCurled = (tipIdx: number, pipIdx: number) => {
      const dTip = getDist(landmarks[tipIdx], wrist);
      const dPip = getDist(landmarks[pipIdx], wrist);
      // If tip is closer to wrist than PIP, or just barely further, it's curled/fist-like
      return dTip < dPip * 1.3; 
  };

  // 1. Index MUST be extended
  const indexExtended = isFingerExtended(8, 6);

  // 2. Middle, Ring, Pinky MUST be curled
  const middleCurled = isFingerCurled(12, 10);
  const ringCurled = isFingerCurled(16, 14);
  const pinkyCurled = isFingerCurled(20, 18);

  // 3. Result: Index is UP, at least 2 of the other 3 main fingers are DOWN.
  const curledCount = (middleCurled ? 1 : 0) + (ringCurled ? 1 : 0) + (pinkyCurled ? 1 : 0);

  return indexExtended && curledCount >= 2;
};

export const isHeartGesture = (hand1: NormalizedLandmarkList, hand2: NormalizedLandmarkList): boolean => {
    if (!hand1 || !hand2) return false;

    // Index Tip (8) and Thumb Tip (4)
    const h1Index = hand1[8];
    const h1Thumb = hand1[4];
    const h2Index = hand2[8];
    const h2Thumb = hand2[4];

    // Distance between left index and right index
    const indexDist = getDist(h1Index, h2Index);
    // Distance between left thumb and right thumb
    const thumbDist = getDist(h1Thumb, h2Thumb);

    // Threshold logic:
    // If indices are touching AND thumbs are touching, it's likely a heart or a "frame" gesture.
    // 0.15 is roughly 15% of the screen width/height, fairly lenient but requires proximity.
    const threshold = 0.2; 

    return indexDist < threshold && thumbDist < threshold;
};

export const getCursorPosition = (landmarks: NormalizedLandmarkList): { x: number, y: number } => {
  const point = landmarks[9]; // Middle finger knuckle
  // Map 0..1 to -1..1, invert X for mirror effect
  return { 
      x: (point.x - 0.5) * -2.5, 
      y: (point.y - 0.5) * -2.5 
  };
};