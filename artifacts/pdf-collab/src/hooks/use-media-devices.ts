import { useEffect, useState, useCallback } from "react";

export interface MediaDeviceInfo {
  deviceId: string;
  label: string;
  kind: MediaDeviceKind;
}

const STORAGE_KEY = "device-preferences";

interface DevicePreferences {
  audioInput?: string;
  audioOutput?: string;
  videoInput?: string;
}

export function getStoredDevicePreferences(): DevicePreferences {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

export function setStoredDevicePreferences(prefs: DevicePreferences) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    console.warn("[device-preferences] Could not persist preferences");
  }
}

export function useMediaDevices() {
  const [audioInputs, setAudioInputs] = useState<MediaDeviceInfo[]>([]);
  const [audioOutputs, setAudioOutputs] = useState<MediaDeviceInfo[]>([]);
  const [videoInputs, setVideoInputs] = useState<MediaDeviceInfo[]>([]);

  const enumerate = useCallback(async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      setAudioInputs(
        devices
          .filter((d) => d.kind === "audioinput" && d.deviceId)
          .map((d) => ({
            deviceId: d.deviceId,
            label: d.label || `Microphone ${d.deviceId.slice(0, 5)}`,
            kind: d.kind,
          }))
      );
      setAudioOutputs(
        devices
          .filter((d) => d.kind === "audiooutput" && d.deviceId)
          .map((d) => ({
            deviceId: d.deviceId,
            label: d.label || `Speaker ${d.deviceId.slice(0, 5)}`,
            kind: d.kind,
          }))
      );
      setVideoInputs(
        devices
          .filter((d) => d.kind === "videoinput" && d.deviceId)
          .map((d) => ({
            deviceId: d.deviceId,
            label: d.label || `Camera ${d.deviceId.slice(0, 5)}`,
            kind: d.kind,
          }))
      );
    } catch (err) {
      console.warn("[media-devices] Failed to enumerate devices:", err);
    }
  }, []);

  useEffect(() => {
    enumerate();

    navigator.mediaDevices.addEventListener("devicechange", enumerate);
    return () => {
      navigator.mediaDevices.removeEventListener("devicechange", enumerate);
    };
  }, [enumerate]);

  return { audioInputs, audioOutputs, videoInputs, refresh: enumerate };
}
