import { Capacitor } from '@capacitor/core';
import { Motion } from '@capacitor/motion';

export interface MotionConfig {
  impactThreshold: number; // e.g. 18.0 m/s^2 (~1.8g)
  stillnessThreshold: number; // e.g. 2.2 m/s^2
  stillnessDurationMs: number; // e.g. 3000 ms
}

const DEFAULT_CONFIG: MotionConfig = {
  impactThreshold: 18.0,
  stillnessThreshold: 2.2,
  stillnessDurationMs: 3000,
};

let accelListenerHandle: any = null;
let state: 'idle' | 'impact_detected' | 'stillness_verified' = 'idle';
let stillnessTimer: any = null;

/**
 * ⚠️ WARNING: PROTOYPE FALL DETECTION SYSTEM
 * 
 * This is a simple threshold-based heuristic designed for prototype demonstration.
 * It is NOT clinically validated, nor is it a certified safety system. Accuracy and
 * false-positive rates have not been systematically measured.
 * 
 * It monitors acceleration changes (vector magnitude) to check for a sudden spike (impact)
 * followed by a 3-second window of inactivity (stillness).
 */
export async function startFallDetectionListener(
  config: Partial<MotionConfig> = {},
  callbacks: {
    onImpactDetected: () => void;
    onStillnessVerified: () => void;
    onStillnessFailed: () => void;
  }
) {
  if (!Capacitor.isNativePlatform()) {
    console.log("[Fall Detection Prototype] Skipping native Motion initialization on web.");
    return;
  }

  const activeConfig = { ...DEFAULT_CONFIG, ...config };
  
  try {
    // Request permission (needed on iOS)
    if (typeof (Motion as any).requestPermissions === 'function') {
      const permission = await (Motion as any).requestPermissions();
      if (permission.accel !== 'granted') {
        console.error("[Fall Detection Prototype] Accelerometer permission denied.");
        return;
      }
    }

    // Clear old listener
    if (accelListenerHandle) {
      await accelListenerHandle.remove();
    }

    state = 'idle';

    accelListenerHandle = await Motion.addListener('accel', (event) => {
      const x = event.acceleration.x || 0;
      const y = event.acceleration.y || 0;
      const z = event.acceleration.z || 0;

      // Calculate total acceleration magnitude excluding gravity
      const magnitude = Math.sqrt(x * x + y * y + z * z);

      if (state === 'idle') {
        // Look for impact spike
        if (magnitude > activeConfig.impactThreshold) {
          state = 'impact_detected';
          console.log(`[Fall Detection Prototype] Impact detected! Magnitude: ${magnitude.toFixed(2)} m/s^2`);
          callbacks.onImpactDetected();

          // Reset stillness timer
          if (stillnessTimer) clearTimeout(stillnessTimer);
          
          // Schedule a timer to verify stillness after the duration
          stillnessTimer = setTimeout(() => {
            if (state === 'impact_detected') {
              state = 'stillness_verified';
              console.log("[Fall Detection Prototype] Stillness verified!");
              callbacks.onStillnessVerified();
            }
          }, activeConfig.stillnessDurationMs);
        }
      } else if (state === 'impact_detected') {
        // While verifying stillness, check if user starts moving again
        if (magnitude > activeConfig.stillnessThreshold) {
          // Movement detected, abort verification
          state = 'idle';
          if (stillnessTimer) {
            clearTimeout(stillnessTimer);
            stillnessTimer = null;
          }
          console.log(`[Fall Detection Prototype] Stillness failed due to motion: ${magnitude.toFixed(2)} m/s^2`);
          callbacks.onStillnessFailed();
        }
      }
    });

    console.log("[Fall Detection Prototype] Accelerometer listener active.");
  } catch (err) {
    console.error("[Fall Detection Prototype] Error initializing Motion listener:", err);
  }
}

export async function stopFallDetectionListener() {
  if (!Capacitor.isNativePlatform()) return;
  
  if (stillnessTimer) {
    clearTimeout(stillnessTimer);
    stillnessTimer = null;
  }
  
  if (accelListenerHandle) {
    try {
      await accelListenerHandle.remove();
      accelListenerHandle = null;
      console.log("[Fall Detection Prototype] Accelerometer listener stopped.");
    } catch (e) {
      console.error("[Fall Detection] Error removing listener:", e);
    }
  }
  state = 'idle';
}
