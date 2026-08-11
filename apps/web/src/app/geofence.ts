import { Capacitor } from '@capacitor/core';
import { BackgroundGeolocation } from '@capgo/background-geolocation';

export interface WaypointGeofence {
  id: string;
  name: string;
  lat: number;
  lng: number;
}

export async function setupGeofencingListener(slug: string, deviceId: string, apiUrl: string) {
  if (!Capacitor.isNativePlatform()) {
    console.log("[Geofence] Running on web. Native geofencing listeners skipped.");
    return;
  }

  try {
    // 1. Configure geofencing
    await BackgroundGeolocation.setupGeofencing({
      url: "" // Handle locally via event listeners
    });

    // 2. Reset listeners
    await (BackgroundGeolocation as any).removeAllListeners();

    // 3. Add listener for boundary entries
    await BackgroundGeolocation.addListener('geofenceTransition', async (event: any) => {
      console.log("[Geofence Transition Event Received]", event);
      
      const isEnter = event.action === 'enter' || event.transition === 'enter';
      if (isEnter) {
        const waypointId = event.identifier;
        const lat = event.latitude;
        const lng = event.longitude;

        try {
          const res = await fetch(`${apiUrl}/trails/${slug}/checkin`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              device_id: deviceId,
              waypoint_id: waypointId,
              timestamp: new Date().toISOString(),
              lat: lat,
              lng: lng,
            }),
          });
          if (res.ok) {
            console.log(`[Geofence Checkin Success] Waypoint ID: ${waypointId}`);
          } else {
            console.error(`[Geofence Checkin Error] Response code: ${res.status}`);
          }
        } catch (fetchErr) {
          console.error("[Geofence Checkin Error] Fetch failed:", fetchErr);
        }
      }
    });

    console.log("[Geofence] Native geofencing listener registered successfully.");
  } catch (err) {
    console.error("[Geofence] Error setting up native geofencing listener:", err);
  }
}

export async function registerWaypointGeofences(
  waypoints: WaypointGeofence[],
  radiusMeters: number = 120
) {
  if (!Capacitor.isNativePlatform()) {
    console.log("[Geofence] Running on web. Native geofences registration skipped.");
    return;
  }

  try {
    // Clear old geofences first to prevent overlaps
    await BackgroundGeolocation.removeAllGeofences();

    // Register circular geofences per waypoint
    for (const wp of waypoints) {
      if (typeof wp.lat !== "number" || typeof wp.lng !== "number") continue;

      await BackgroundGeolocation.addGeofence({
        identifier: wp.id,
        latitude: wp.lat,
        longitude: wp.lng,
        radius: radiusMeters,
        notifyOnEntry: true,
        notifyOnExit: false,
      });
      console.log(`[Geofence Registered] Waypoint: ${wp.name}, ID: ${wp.id}, Radius: ${radiusMeters}m`);
    }
  } catch (err) {
    console.error("[Geofence] Error registering native waypoint geofences:", err);
  }
}

export async function clearAllGeofences() {
  if (!Capacitor.isNativePlatform()) return;
  try {
    await BackgroundGeolocation.removeAllGeofences();
    await (BackgroundGeolocation as any).removeAllListeners();
    console.log("[Geofence] All native geofences cleared.");
  } catch (err) {
    console.error("[Geofence] Error clearing geofences:", err);
  }
}
