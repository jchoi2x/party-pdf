import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getStoredDevicePreferences, setStoredDevicePreferences, useMediaDevices } from '@/hooks/use-media-devices';
import MicLevelBar from './MicLevelBar';

interface DeviceSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (stream: MediaStream, audioOutputId: string) => void;
}

const supportsSetSinkId = typeof HTMLAudioElement !== 'undefined' && 'setSinkId' in HTMLAudioElement.prototype;

export default function DeviceSettingsDialog({ open, onOpenChange, onSave }: DeviceSettingsDialogProps) {
  const { audioInputs, audioOutputs, videoInputs, refresh } = useMediaDevices();
  const prefs = getStoredDevicePreferences();

  const [selectedMic, setSelectedMic] = useState(prefs.audioInput || '');
  const [selectedOutput, setSelectedOutput] = useState(prefs.audioOutput || '');
  const [selectedCamera, setSelectedCamera] = useState(prefs.videoInput || '');

  const [previewAudioStream, setPreviewAudioStream] = useState<MediaStream | null>(null);
  const [previewVideoStream, setPreviewVideoStream] = useState<MediaStream | null>(null);
  const videoPreviewRef = useRef<HTMLVideoElement>(null);
  const testAudioRef = useRef<HTMLAudioElement>(null);
  const oscillatorRef = useRef<OscillatorNode | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const previewAudioRef = useRef<MediaStream | null>(null);
  const previewVideoRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (!open) return;
    refresh();
  }, [open, refresh]);

  useEffect(() => {
    if (!open) return;

    if (audioInputs.length > 0 && !selectedMic) {
      setSelectedMic(audioInputs[0].deviceId);
    }
    if (audioOutputs.length > 0 && !selectedOutput) {
      setSelectedOutput(audioOutputs[0].deviceId);
    }
    if (videoInputs.length > 0 && !selectedCamera) {
      setSelectedCamera(videoInputs[0].deviceId);
    }
  }, [open, audioInputs, audioOutputs, videoInputs, selectedMic, selectedOutput, selectedCamera]);

  const stopPreviewAudio = useCallback(() => {
    if (previewAudioRef.current) {
      previewAudioRef.current.getTracks().forEach((t) => t.stop());
      previewAudioRef.current = null;
    }
    setPreviewAudioStream(null);
  }, []);

  const stopPreviewVideo = useCallback(() => {
    if (previewVideoRef.current) {
      previewVideoRef.current.getTracks().forEach((t) => t.stop());
      previewVideoRef.current = null;
    }
    setPreviewVideoStream(null);
  }, []);

  const stopTestTone = useCallback(() => {
    if (oscillatorRef.current) {
      try {
        oscillatorRef.current.stop();
      } catch {}
      oscillatorRef.current = null;
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }
  }, []);

  const cleanupAll = useCallback(() => {
    stopPreviewAudio();
    stopPreviewVideo();
    stopTestTone();
  }, [stopPreviewAudio, stopPreviewVideo, stopTestTone]);

  useEffect(() => {
    return () => {
      cleanupAll();
    };
  }, [cleanupAll]);

  useEffect(() => {
    if (!open || !selectedMic) {
      stopPreviewAudio();
      return;
    }

    let cancelled = false;
    navigator.mediaDevices
      .getUserMedia({ audio: { deviceId: { exact: selectedMic } } })
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        stopPreviewAudio();
        previewAudioRef.current = stream;
        setPreviewAudioStream(stream);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [open, selectedMic, stopPreviewAudio]);

  useEffect(() => {
    if (!open || !selectedCamera) {
      stopPreviewVideo();
      return;
    }

    let cancelled = false;
    navigator.mediaDevices
      .getUserMedia({ video: { deviceId: { exact: selectedCamera } } })
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        stopPreviewVideo();
        previewVideoRef.current = stream;
        setPreviewVideoStream(stream);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [open, selectedCamera, stopPreviewVideo]);

  useEffect(() => {
    if (videoPreviewRef.current && previewVideoStream) {
      videoPreviewRef.current.srcObject = previewVideoStream;
    }
  }, [previewVideoStream]);

  function handleClose() {
    cleanupAll();
    onOpenChange(false);
  }

  function handleTestAudio() {
    if (oscillatorRef.current) {
      stopTestTone();
      return;
    }

    try {
      const ctx = new AudioContext();
      audioCtxRef.current = ctx;
      const dest = ctx.createMediaStreamDestination();
      const oscillator = ctx.createOscillator();
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(440, ctx.currentTime);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 1.5);

      oscillator.connect(gain);
      gain.connect(dest);

      if (testAudioRef.current) {
        testAudioRef.current.srcObject = dest.stream;
        if (supportsSetSinkId && selectedOutput) {
          (testAudioRef.current as HTMLAudioElement).setSinkId(selectedOutput).catch(() => {});
        }
        testAudioRef.current.play().catch(() => {
          gain.connect(ctx.destination);
        });
      } else {
        gain.connect(ctx.destination);
      }

      oscillator.start();
      oscillator.stop(ctx.currentTime + 1.5);
      oscillatorRef.current = oscillator;

      oscillator.onended = () => {
        stopTestTone();
      };
    } catch {
      toast.error('Could not play test tone');
    }
  }

  async function handleSave() {
    setStoredDevicePreferences({
      audioInput: selectedMic,
      audioOutput: selectedOutput,
      videoInput: selectedCamera,
    });

    try {
      const constraints: MediaStreamConstraints = {
        video: selectedCamera ? { deviceId: { exact: selectedCamera } } : true,
        audio: selectedMic ? { deviceId: { exact: selectedMic } } : true,
      };
      const newStream = await navigator.mediaDevices.getUserMedia(constraints);

      cleanupAll();
      onSave(newStream, selectedOutput);
      onOpenChange(false);
    } catch {
      toast.error('Could not access selected devices. Check permissions.');
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(val) => {
        if (!val) handleClose();
        else onOpenChange(val);
      }}
    >
      <DialogContent className='max-w-md'>
        <DialogHeader>
          <DialogTitle>Device Settings</DialogTitle>
          <DialogDescription>Choose your microphone, speaker, and camera</DialogDescription>
        </DialogHeader>

        <div className='space-y-5'>
          <div className='space-y-2'>
            <Label className='text-sm font-medium'>Microphone</Label>
            <Select value={selectedMic} onValueChange={setSelectedMic}>
              <SelectTrigger>
                <SelectValue placeholder='Select microphone' />
              </SelectTrigger>
              <SelectContent>
                {audioInputs.map((d) => (
                  <SelectItem key={d.deviceId} value={d.deviceId}>
                    {d.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <MicLevelBar stream={previewAudioStream} />
          </div>

          <div className='space-y-2'>
            <Label className='text-sm font-medium'>Audio Output</Label>
            {supportsSetSinkId ? (
              <Select value={selectedOutput} onValueChange={setSelectedOutput}>
                <SelectTrigger>
                  <SelectValue placeholder='Select audio output' />
                </SelectTrigger>
                <SelectContent>
                  {audioOutputs.map((d) => (
                    <SelectItem key={d.deviceId} value={d.deviceId}>
                      {d.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <p className='text-xs text-muted-foreground'>Audio output selection is not supported in this browser.</p>
            )}
            <Button variant='outline' size='sm' onClick={handleTestAudio} className='w-full'>
              Test Audio
            </Button>
            <audio ref={testAudioRef} className='hidden' />
          </div>

          <div className='space-y-2'>
            <Label className='text-sm font-medium'>Camera</Label>
            <Select value={selectedCamera} onValueChange={setSelectedCamera}>
              <SelectTrigger>
                <SelectValue placeholder='Select camera' />
              </SelectTrigger>
              <SelectContent>
                {videoInputs.map((d) => (
                  <SelectItem key={d.deviceId} value={d.deviceId}>
                    {d.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className='rounded-lg overflow-hidden bg-muted aspect-video'>
              {previewVideoStream ? (
                <video ref={videoPreviewRef} autoPlay playsInline muted className='w-full h-full object-cover' />
              ) : (
                <div className='w-full h-full flex items-center justify-center text-xs text-muted-foreground'>
                  No preview
                </div>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant='ghost' onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
