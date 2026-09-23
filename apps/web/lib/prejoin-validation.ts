"use client";

import { useCallback, useEffect, useState } from "react";
import type { AppSettings } from "./settings";

export interface PreJoinValidationState {
  camera: "pending" | "ok" | "fail";
  microphone: "pending" | "ok" | "fail";
  error: string | null;
  isChecking: boolean;
}

export function usePreJoinValidation(settings: AppSettings) {
  const [state, setState] = useState<PreJoinValidationState>({
    camera: "pending",
    microphone: "pending",
    error: null,
    isChecking: false,
  });

  const validate = useCallback(async () => {
    setState((s) => ({ ...s, isChecking: true, error: null }));
    let stream: MediaStream | null = null;

    try {
      const videoConstraints: MediaTrackConstraints = settings.preferredVideoInput
        ? { deviceId: { ideal: settings.preferredVideoInput } }
        : { facingMode: "user" };
      const audioConstraints: MediaTrackConstraints | boolean = settings.preferredAudioInput
        ? { deviceId: { ideal: settings.preferredAudioInput } }
        : true;

      stream = await navigator.mediaDevices.getUserMedia({
        video: videoConstraints,
        audio: audioConstraints,
      });

      const videoOk = stream.getVideoTracks().length > 0 && stream.getVideoTracks()[0]?.enabled;
      const audioOk = stream.getAudioTracks().length > 0 && stream.getAudioTracks()[0]?.enabled;

      setState({
        camera: videoOk ? "ok" : "fail",
        microphone: audioOk ? "ok" : "fail",
        error: null,
        isChecking: false,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Device access failed";
      setState({
        camera: "fail",
        microphone: "fail",
        error: msg,
        isChecking: false,
      });
    } finally {
      stream?.getTracks().forEach((t) => {
        t.stop();
      });
    }
  }, [settings.preferredVideoInput, settings.preferredAudioInput]);

  useEffect(() => {
    validate();
  }, [validate]);

  return { ...state, revalidate: validate };
}
