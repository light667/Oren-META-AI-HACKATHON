"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { fr } from "@/i18n/fr";
import { downsample, encodeWavPcm16 } from "@/lib/wav";

/**
 * Enregistreur vocal qui produit un WAV PCM 24 kHz mono — le format
 * exact accepté par l'endpoint de transcription, sans conversion.
 */
export function VoiceRecorder({ onRecorded }: { onRecorded: (blob: Blob) => void }) {
  const [recording, setRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const contextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Float32Array[]>([]);

  async function start() {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const context = new AudioContext();
      contextRef.current = context;
      chunksRef.current = [];
      const source = context.createMediaStreamSource(stream);
      const processor = context.createScriptProcessor(4096, 1, 1);
      processor.onaudioprocess = (event) => {
        chunksRef.current.push(new Float32Array(event.inputBuffer.getChannelData(0)));
      };
      source.connect(processor);
      processor.connect(context.destination);
      setRecording(true);
    } catch {
      setError(fr.common.error);
    }
  }

  async function stop() {
    const context = contextRef.current;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    if (context) await context.close();
    setRecording(false);
    const total = chunksRef.current.reduce((sum, c) => sum + c.length, 0);
    const merged = new Float32Array(total);
    let offset = 0;
    for (const chunk of chunksRef.current) {
      merged.set(chunk, offset);
      offset += chunk.length;
    }
    const rate = context?.sampleRate ?? 48000;
    onRecorded(encodeWavPcm16(downsample(merged, rate, 24000), 24000));
  }

  return (
    <div className="flex items-center gap-3">
      {recording ? (
        <Button type="button" variant="destructive" onClick={stop}>
          {fr.setup.recordStop}
        </Button>
      ) : (
        <Button type="button" variant="outline" onClick={start}>
          {fr.setup.recordStart}
        </Button>
      )}
      {recording && <span className="text-sm text-muted-foreground">{fr.setup.recording}</span>}
      {error && <span className="text-sm text-destructive">{error}</span>}
    </div>
  );
}
