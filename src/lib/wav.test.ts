import { describe, expect, it } from "vitest";
import { downsample, encodeWavPcm16 } from "./wav";

describe("encodage WAV de l'enregistreur vocal", () => {
  it("produit un en-tête RIFF/WAVE PCM 16 bits mono valide", async () => {
    const samples = new Float32Array([0, 0.5, -0.5, 0.25]);
    const blob = encodeWavPcm16(samples, 24000);
    expect(blob.type).toBe("audio/wav");
    expect(blob.size).toBe(44 + samples.length * 2);
    const bytes = new Uint8Array(await blob.arrayBuffer());
    expect(String.fromCharCode(...bytes.slice(0, 4))).toBe("RIFF");
    expect(String.fromCharCode(...bytes.slice(8, 12))).toBe("WAVE");
    expect(String.fromCharCode(...bytes.slice(36, 40))).toBe("data");
  });

  it("borne les échantillons au-delà de [-1, 1] sans débordement", async () => {
    const bytes = new Uint8Array(
      await encodeWavPcm16(new Float32Array([2, -2]), 24000).arrayBuffer(),
    );
    const view = new DataView(bytes.buffer);
    expect(view.getInt16(44, true)).toBe(0x7fff);
    expect(view.getInt16(46, true)).toBe(-0x8000);
  });

  it("rééchantillonne 48 kHz vers 24 kHz en divisant la longueur par deux", () => {
    const input = new Float32Array([1, 2, 3, 4, 5, 6, 7, 8]);
    const result = downsample(input, 48000, 24000);
    expect(result).toHaveLength(4);
    expect(result[0]).toBe(1);
    expect(result[3]).toBe(7);
    expect(downsample(input, 24000, 24000)).toBe(input);
  });
});
