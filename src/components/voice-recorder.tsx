"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n/context";
import { downsample, encodeWavPcm16 } from "@/lib/wav";
import { Mic, Square, RotateCcw, AlertCircle, Play } from "lucide-react";

/**
 * Enregistreur vocal soigné (Tâche D5 / docs/DESIGN.md).
 * Bouton d'enregistrement clair, durée en direct, réécoute audio et possibilité de réessayer.
 */
export function VoiceRecorder({
  onRecorded,
  busy = false,
}: {
  onRecorded: (blob: Blob) => void;
  busy?: boolean;
}) {
  const { t } = useI18n();
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [lastBlob, setLastBlob] = useState<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);

  const contextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Float32Array[]>([]);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  async function start() {
    setError(null);
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }
    setLastBlob(null);
    setSeconds(0);

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
      timerRef.current = window.setInterval(() => {
        setSeconds((prev) => prev + 1);
      }, 1000);
    } catch {
      setError("Impossible d'accéder au microphone. Vérifiez vos autorisations.");
    }
  }

  async function stop() {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
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
    const wavBlob = encodeWavPcm16(downsample(merged, rate, 24000), 24000);
    setLastBlob(wavBlob);
    const url = URL.createObjectURL(wavBlob);
    setAudioUrl(url);
    onRecorded(wavBlob);
  }

  function retry() {
    setError(null);
    setAudioUrl(null);
    setLastBlob(null);
    setSeconds(0);
    void start();
  }

  const formatDuration = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        {recording ? (
          <Button
            type="button"
            variant="destructive"
            onClick={stop}
            className="h-11 rounded-xl px-5 text-xs font-bold shadow-md shadow-destructive/20 animate-pulse"
          >
            <Square className="mr-2 h-4 w-4 fill-current" />
            <span>Arrêter l'enregistrement ({formatDuration(seconds)})</span>
          </Button>
        ) : (
          <Button
            type="button"
            onClick={start}
            disabled={busy}
            className="h-11 rounded-xl bg-primary px-5 text-xs font-bold text-primary-foreground shadow-md shadow-primary/20 hover:opacity-90 active:scale-95 transition-all"
          >
            <Mic className="mr-2 h-4 w-4" />
            <span>{audioUrl ? "Réenregistrer un message vocal" : "Enregistrer un message vocal"}</span>
          </Button>
        )}

        {audioUrl && !recording && (
          <Button
            type="button"
            variant="outline"
            onClick={retry}
            disabled={busy}
            className="h-11 rounded-xl border-border/80 px-4 text-xs font-semibold"
          >
            <RotateCcw className="mr-2 h-3.5 w-3.5" />
            <span>Réessayer</span>
          </Button>
        )}
      </div>

      {/* Lecteur audio de réécoute */}
      {audioUrl && !recording && (
        <div className="rounded-2xl border border-border/70 bg-secondary/30 p-3 max-w-md space-y-1.5">
          <p className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1.5">
            <Play className="h-3 w-3 text-primary" />
            <span>Réécoutez votre enregistrement :</span>
          </p>
          <audio controls src={audioUrl} className="w-full h-9 rounded-lg" />
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 rounded-xl bg-destructive/10 p-3 text-xs text-destructive max-w-md">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={retry}
            className="ml-auto h-7 px-2 text-xs font-bold text-destructive hover:bg-destructive/20"
          >
            Réessayer
          </Button>
        </div>
      )}
    </div>
  );
}
