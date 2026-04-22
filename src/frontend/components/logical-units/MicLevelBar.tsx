import { useEffect, useRef, useState } from "react";
import "./MicLevelBar.styles.scss";

interface MicLevelBarProps {
  stream: MediaStream | null;
}

export const MicLevelBar = ({ stream }: MicLevelBarProps) => {
  const [level, setLevel] = useState(0);
  const animFrameRef = useRef<number>(0);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const contextRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    if (!stream || stream.getAudioTracks().length === 0) {
      setLevel(0);
      return;
    }

    const audioContext = new AudioContext();
    contextRef.current = audioContext;
    const source = audioContext.createMediaStreamSource(stream);
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;
    source.connect(analyser);
    analyserRef.current = analyser;

    const dataArray = new Float32Array(analyser.fftSize);

    function tick() {
      analyser.getFloatTimeDomainData(dataArray);
      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) {
        sum += dataArray[i] * dataArray[i];
      }
      const rms = Math.sqrt(sum / dataArray.length);
      const normalized = Math.min(1, rms / 0.5);
      setLevel(normalized);
      animFrameRef.current = requestAnimationFrame(tick);
    }

    animFrameRef.current = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(animFrameRef.current);
      source.disconnect();
      audioContext.close();
      contextRef.current = null;
      analyserRef.current = null;
    };
  }, [stream]);

  return (
    <div className="mic-level-bar">
      <div
        className="mic-level-bar__fill"
        style={{ width: `${level * 100}%` }}
      />
    </div>
  );
};
