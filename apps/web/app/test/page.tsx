"use client";

import { AlertCircle, ArrowLeft, CheckCircle2, Mic, MicOff, Video, VideoOff, Volume2, VolumeX } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { telemetry } from "@/lib/telemetry";
import { cn } from "@/lib/utils";

interface DeviceInfo {
  deviceId: string;
  label: string;
  kind: MediaDeviceKind;
}

export default function VideoTestPage() {
  const [videoDevices, setVideoDevices] = useState<DeviceInfo[]>([]);
  const [audioInputDevices, setAudioInputDevices] = useState<DeviceInfo[]>([]);
  const [audioOutputDevices, setAudioOutputDevices] = useState<DeviceInfo[]>([]);

  const [selectedVideoDevice, setSelectedVideoDevice] = useState<string>("");
  const [selectedAudioInput, setSelectedAudioInput] = useState<string>("");
  const [selectedAudioOutput, setSelectedAudioOutput] = useState<string>("");

  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isSpeakerEnabled, setIsSpeakerEnabled] = useState(false);

  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [audioLevel, setAudioLevel] = useState(0);

  const videoRef = useRef<HTMLVideoElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const monitorAudioLevel = useCallback(() => {
    if (!analyserRef.current) return;

    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);

    const checkLevel = () => {
      if (!analyserRef.current) return;

      analyserRef.current.getByteFrequencyData(dataArray);
      const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
      setAudioLevel(Math.min(100, (average / 128) * 100));

      animationFrameRef.current = requestAnimationFrame(checkLevel);
    };

    checkLevel();
  }, []);

  const setupAudioMonitoring = useCallback(
    (stream: MediaStream) => {
      const audioContext = new AudioContext();
      const analyser = audioContext.createAnalyser();
      const microphone = audioContext.createMediaStreamSource(stream);

      analyser.fftSize = 256;
      microphone.connect(analyser);

      audioContextRef.current = audioContext;
      analyserRef.current = analyser;

      monitorAudioLevel();
    },
    [monitorAudioLevel],
  );

  const cleanupMedia = useCallback(() => {
    if (mediaStream) {
      mediaStream.getTracks().forEach((track) => {
        track.stop();
      });
      setMediaStream(null);
    }

    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    analyserRef.current = null;
    setAudioLevel(0);
  }, [mediaStream]);

  const loadDevices = useCallback(async () => {
    try {
      // Request permissions first
      await navigator.mediaDevices.getUserMedia({ video: true, audio: true });

      const devices = await navigator.mediaDevices.enumerateDevices();

      const videoDevs = devices
        .filter((d) => d.kind === "videoinput")
        .map((d) => ({
          deviceId: d.deviceId,
          label: d.label || `Camera ${d.deviceId.slice(0, 5)}`,
          kind: d.kind,
        }));

      const audioInputDevs = devices
        .filter((d) => d.kind === "audioinput")
        .map((d) => ({
          deviceId: d.deviceId,
          label: d.label || `Microphone ${d.deviceId.slice(0, 5)}`,
          kind: d.kind,
        }));

      const audioOutputDevs = devices
        .filter((d) => d.kind === "audiooutput")
        .map((d) => ({
          deviceId: d.deviceId,
          label: d.label || `Speaker ${d.deviceId.slice(0, 5)}`,
          kind: d.kind,
        }));

      setVideoDevices(videoDevs);
      setAudioInputDevices(audioInputDevs);
      setAudioOutputDevices(audioOutputDevs);

      // Set defaults
      const firstVideo = videoDevs[0];
      if (firstVideo && !selectedVideoDevice) {
        setSelectedVideoDevice(firstVideo.deviceId);
      }
      const firstAudioInput = audioInputDevs[0];
      if (firstAudioInput && !selectedAudioInput) {
        setSelectedAudioInput(firstAudioInput.deviceId);
      }
      const firstAudioOutput = audioOutputDevs[0];
      if (firstAudioOutput && !selectedAudioOutput) {
        setSelectedAudioOutput(firstAudioOutput.deviceId);
      }

      telemetry.log("DEVICES_ENUMERATED", {
        video: videoDevs.length,
        audioInput: audioInputDevs.length,
        audioOutput: audioOutputDevs.length,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to access devices";
      setError(msg);
      telemetry.log("DEVICE_ENUMERATION_FAILED", { error: msg });
    }
  }, [selectedVideoDevice, selectedAudioInput, selectedAudioOutput]);

  const startMediaStream = useCallback(async () => {
    try {
      cleanupMedia();
      setError(null);

      const constraints: MediaStreamConstraints = {
        video: isVideoEnabled && selectedVideoDevice ? { deviceId: { exact: selectedVideoDevice } } : false,
        audio: isAudioEnabled && selectedAudioInput ? { deviceId: { exact: selectedAudioInput } } : false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      setMediaStream(stream);

      if (videoRef.current && stream.getVideoTracks().length > 0) {
        videoRef.current.srcObject = stream;
      }

      // Setup audio level monitoring
      if (stream.getAudioTracks().length > 0) {
        setupAudioMonitoring(stream);
      }

      telemetry.log("MEDIA_STREAM_STARTED", {
        video: stream.getVideoTracks().length > 0,
        audio: stream.getAudioTracks().length > 0,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to start media";
      setError(msg);
      telemetry.log("MEDIA_STREAM_FAILED", { error: msg });
    }
  }, [cleanupMedia, isAudioEnabled, isVideoEnabled, selectedAudioInput, selectedVideoDevice, setupAudioMonitoring]);

  // Load available devices
  useEffect(() => {
    loadDevices();
    telemetry.log("VIDEO_TEST_PAGE_MOUNTED");

    return () => {
      cleanupMedia();
      telemetry.log("VIDEO_TEST_PAGE_UNMOUNTED");
    };
  }, [loadDevices, cleanupMedia]);

  // Start media stream when device selections change. isVideoEnabled/isAudioEnabled
  // stay out: the effect body doesn't read them, and startMediaStream (which
  // does) refreshes via its own useCallback deps.
  useEffect(() => {
    if (selectedVideoDevice || selectedAudioInput) {
      startMediaStream();
    }
  }, [selectedVideoDevice, selectedAudioInput, startMediaStream]);

  const toggleVideo = () => {
    if (mediaStream) {
      const videoTrack = mediaStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoEnabled(videoTrack.enabled);
      }
    } else {
      setIsVideoEnabled(!isVideoEnabled);
    }
  };

  const toggleAudio = () => {
    if (mediaStream) {
      const audioTrack = mediaStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioEnabled(audioTrack.enabled);
      }
    } else {
      setIsAudioEnabled(!isAudioEnabled);
    }
  };

  const playTestSound = () => {
    const audio = new Audio("/test-tone.mp3");

    if ("setSinkId" in audio && selectedAudioOutput) {
      (audio as HTMLAudioElement & { setSinkId: (id: string) => Promise<void> })
        .setSinkId(selectedAudioOutput)
        .catch((err: Error) => {
          telemetry.log("AUDIO_OUTPUT_FAILED", { error: err.message });
        });
    }

    audio.play();
    setIsSpeakerEnabled(true);
    setTimeout(() => setIsSpeakerEnabled(false), 1000);
  };

  const hasVideo = (mediaStream?.getVideoTracks().length ?? 0) > 0;
  const hasAudio = (mediaStream?.getAudioTracks().length ?? 0) > 0;

  return (
    <div className="flex h-screen flex-col bg-neutral-950">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>
          <div className="h-4 w-px bg-gray-700" />
          <h1 className="text-lg font-semibold text-white">Video & Audio Test</h1>
        </div>
      </header>

      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-4xl space-y-6">
          {/* Video Preview */}
          <div className="relative bg-neutral-900 rounded-xl overflow-hidden border border-gray-800">
            <div className="aspect-video relative bg-black">
              {isVideoEnabled && hasVideo ? (
                <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover mirror" />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <VideoOff className="w-16 h-16 text-gray-600 mx-auto mb-3" />
                    <p className="text-gray-500">Camera is off</p>
                  </div>
                </div>
              )}

              {/* Status Indicators */}
              <div className="absolute top-4 left-4 flex gap-2">
                <div
                  className={cn(
                    "flex items-center gap-2 px-3 py-1.5 rounded-lg backdrop-blur-sm",
                    hasVideo ? "bg-green-900/50 text-green-400" : "bg-red-900/50 text-red-400",
                  )}
                >
                  {hasVideo ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                  <span className="text-xs font-medium">Video</span>
                </div>

                <div
                  className={cn(
                    "flex items-center gap-2 px-3 py-1.5 rounded-lg backdrop-blur-sm",
                    hasAudio ? "bg-green-900/50 text-green-400" : "bg-red-900/50 text-red-400",
                  )}
                >
                  {hasAudio ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                  <span className="text-xs font-medium">Audio</span>
                </div>
              </div>
            </div>

            {/* Controls */}
            <div className="p-4 flex items-center justify-center gap-4">
              <button
                type="button"
                onClick={toggleVideo}
                className={cn(
                  "p-4 rounded-full transition-colors",
                  isVideoEnabled
                    ? "bg-neutral-700 hover:bg-neutral-600 text-white"
                    : "bg-red-600 hover:bg-red-700 text-white",
                )}
                title={isVideoEnabled ? "Turn off camera" : "Turn on camera"}
              >
                {isVideoEnabled ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
              </button>

              <button
                type="button"
                onClick={toggleAudio}
                className={cn(
                  "p-4 rounded-full transition-colors",
                  isAudioEnabled
                    ? "bg-neutral-700 hover:bg-neutral-600 text-white"
                    : "bg-red-600 hover:bg-red-700 text-white",
                )}
                title={isAudioEnabled ? "Mute microphone" : "Unmute microphone"}
              >
                {isAudioEnabled ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Audio Level Indicator */}
          {hasAudio && (
            <div className="bg-neutral-900 rounded-xl p-4 border border-gray-800">
              <div className="flex items-center gap-3">
                <Mic className="w-4 h-4 text-gray-500" />
                <div className="flex-1">
                  <div className="h-2 bg-neutral-800 rounded-full overflow-hidden">
                    <div
                      className={cn(
                        "h-full transition-all duration-100",
                        audioLevel > 70 ? "bg-red-500" : audioLevel > 40 ? "bg-yellow-500" : "bg-green-500",
                      )}
                      style={{ width: `${audioLevel}%` }}
                    />
                  </div>
                </div>
                <span className="text-xs text-gray-500 w-12 text-right">{Math.round(audioLevel)}%</span>
              </div>
              <p className="text-xs text-gray-500 mt-2">Speak to test your microphone</p>
            </div>
          )}

          {/* Device Selection */}
          <div className="grid md:grid-cols-3 gap-4">
            {/* Camera */}
            <div className="bg-neutral-900 rounded-xl p-4 border border-gray-800">
              <label htmlFor="test-camera" className="block text-sm font-medium text-gray-400 mb-2">
                Camera
              </label>
              <select
                id="test-camera"
                value={selectedVideoDevice}
                onChange={(e) => setSelectedVideoDevice(e.target.value)}
                className="w-full px-3 py-2 bg-neutral-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
              >
                {videoDevices.map((device) => (
                  <option key={device.deviceId} value={device.deviceId}>
                    {device.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Microphone */}
            <div className="bg-neutral-900 rounded-xl p-4 border border-gray-800">
              <label htmlFor="test-mic" className="block text-sm font-medium text-gray-400 mb-2">
                Microphone
              </label>
              <select
                id="test-mic"
                value={selectedAudioInput}
                onChange={(e) => setSelectedAudioInput(e.target.value)}
                className="w-full px-3 py-2 bg-neutral-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
              >
                {audioInputDevices.map((device) => (
                  <option key={device.deviceId} value={device.deviceId}>
                    {device.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Speakers */}
            <div className="bg-neutral-900 rounded-xl p-4 border border-gray-800">
              <label htmlFor="test-speaker" className="block text-sm font-medium text-gray-400 mb-2">
                Speakers
              </label>
              <select
                id="test-speaker"
                value={selectedAudioOutput}
                onChange={(e) => setSelectedAudioOutput(e.target.value)}
                className="w-full px-3 py-2 bg-neutral-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500 mb-2"
              >
                {audioOutputDevices.map((device) => (
                  <option key={device.deviceId} value={device.deviceId}>
                    {device.label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={playTestSound}
                className="w-full px-3 py-1.5 bg-neutral-700 hover:bg-neutral-600 rounded text-sm transition-colors flex items-center justify-center gap-2"
              >
                {isSpeakerEnabled ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                Test Speaker
              </button>
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="bg-red-900/30 border border-red-800 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-red-400 font-medium">Error</p>
                  <p className="text-red-300 text-sm mt-1">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Ready to Join */}
          {hasVideo && hasAudio && !error && (
            <div className="bg-green-900/20 border border-green-800 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-400" />
                  <div>
                    <p className="text-green-400 font-medium">Ready to join</p>
                    <p className="text-green-300/70 text-sm">Your camera and microphone are working</p>
                  </div>
                </div>
                <Link
                  href="/"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors font-medium"
                >
                  Join Conference
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
