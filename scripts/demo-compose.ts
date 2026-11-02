/**
 * Montage de la vidéo de démonstration (ffmpeg) à partir de docs/demo/raw/.
 * - Segments découpés selon timeline.json (temps RÉELS d'enregistrement).
 * - Attentes longues (vision, transcription) accélérées avec compteur de
 *   temps réel incrusté : le compteur affiche le temps écoulé, pas un faux.
 * - Téléphone cadré (scène 4), incrustation côte à côte (scène 5), fondus
 *   200 ms, sous-titres anglais gravés (générés des durées réelles).
 * - Aucune voix de synthèse locale de qualité → vidéo sans voix + textes
 *   voix-off-en/fr.txt et sous-titres .srt fournis pour enregistrement humain.
 *
 * Usage : npx tsx scripts/demo-compose.ts
 */
import { execFile } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { promisify } from "node:util";
import { NARRATION } from "./demo-narration";

const execFileAsync = promisify(execFile);
const DEMO_DIR = resolve("docs/demo");
const RAW = join(DEMO_DIR, "raw");
const WORK = join(DEMO_DIR, "work");
const W = 1920, H = 1080, FPS = 30;
const FONT = "C\\:/Windows/Fonts/arial.ttf";

interface Mark { ctx: string; start: number; end: number }
interface Timeline {
  marks: Record<string, Mark>; notes: string[]; voiceSec: number;
  videos: { owner: string | null; phone: string | null };
}

function ff(args: string[]) {
  return execFileAsync("ffmpeg", ["-y", "-hide_banner", "-loglevel", "error", ...args]);
}
async function probeDur(file: string): Promise<number> {
  const { stdout } = await execFileAsync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", file]);
  return Number.parseFloat(stdout.trim()) || 0;
}
function srtTime(sec: number): string {
  const ms = Math.round(sec * 1000);
  const p = (n: number, l = 2) => String(n).padStart(l, "0");
  return `${p(Math.floor(ms / 3_600_000))}:${p(Math.floor(ms / 60_000) % 60)}:${p(Math.floor(ms / 1000) % 60)},${p(ms % 1000, 3)}`;
}

interface Seg { sceneId: string; file: string; dur: number }

async function main() {
  const timeline = JSON.parse(readFileSync(join(RAW, "timeline.json"), "utf8")) as Timeline;
  const marks = timeline.marks;
  const ownerVid = timeline.videos.owner, phoneVid = timeline.videos.phone;
  if (!ownerVid || !phoneVid) throw new Error("Vidéos brutes introuvables (lancez demo-record.ts)");
  mkdirSync(WORK, { recursive: true });

  const segs: Seg[] = [];
  const add = async (sceneId: string, name: string, args: string[]) => {
    const out = join(WORK, `${name}.mp4`);
    await ff(args.concat(["-c:v", "libx264", "-pix_fmt", "yuv420p", "-r", String(FPS), "-an", out]));
    const dur = await probeDur(out);
    segs.push({ sceneId, file: out, dur });
    console.log(`  segment ${name} : ${dur.toFixed(1)} s`);
    return dur;
  };
  const fade = (dur: number) => `fade=t=in:st=0:d=0.2,fade=t=out:st=${Math.max(0, dur - 0.2).toFixed(2)}:d=0.2`;
  const need = (name: string): Mark => {
    const m = marks[name];
    if (!m || typeof m.end !== "number") throw new Error(`Segment manquant dans la timeline : ${name} (scène à réenregistrer)`);
    return m;
  };

  console.log("▶ découpage des segments…");

  // S1 — carte problème (cible exacte 15 s).
  {
    const m = need("s1-probleme");
    const d = Math.min(m.end - m.start, 15);
    await add("s1-probleme", "s1", ["-ss", String(m.start), "-i", ownerVid, "-t", String(d),
      "-vf", `scale=${W}:${H},${fade(d)}`]);
  }
  // S2 — page d'accueil réelle (plafond 15 s).
  {
    const m = need("s2-promesse");
    const d = Math.min(m.end - m.start, 15);
    await add("s2-promesse", "s2", ["-ss", String(m.start), "-i", ownerVid, "-t", String(d),
      "-vf", `scale=${W}:${H},${fade(d)}`]);
  }
  // S3 — mise en route : parties normales + attentes accélérées (compteur réel).
  {
    const m = need("s3-mise-en-route");
    const vw = marks["s3-vision-wait"], ww = marks["s3-voice-wait"];
    const waits: Array<{ s: number; e: number }> = [];
    if (vw?.end) waits.push({ s: vw.start, e: vw.end });
    if (ww?.end) waits.push({ s: ww.start, e: ww.end });
    const total = m.end - m.start;
    const waitDur = waits.reduce((a, w) => a + (w.e - w.s), 0);
    const normalDur = Math.max(1, total - waitDur);
    const SPEED = Math.min(16, Math.max(4, waitDur / Math.max(1, 35 - normalDur)));
    const caption = `drawtext=fontfile=${FONT}:text='Muse Spark (vision, JSON) · Muse Voice Transcribe':fontcolor=white:fontsize=30:box=1:boxcolor=black@0.55:boxborderw=12:x=(w-text_w)/2:y=h-64`;
    const parts: string[] = [];
    let cursor = m.start; let idx = 0;
    const pushNormal = async (s: number, e: number) => {
      if (e - s < 0.4) return;
      const out = join(WORK, `s3-p${idx++}.mp4`);
      await ff(["-ss", String(s), "-i", ownerVid, "-t", String(e - s), "-vf", `scale=${W}:${H},${caption}`, "-c:v", "libx264", "-pix_fmt", "yuv420p", "-r", String(FPS), "-an", out]);
      parts.push(out);
    };
    const pushFast = async (s: number, e: number) => {
      if (e - s < 0.4) return;
      const out = join(WORK, `s3-p${idx++}.mp4`);
      const counter = `drawtext=fontfile=${FONT}:text='Real time: %{eif\\:t*${SPEED.toFixed(1)}\\:d} s':fontcolor=white:fontsize=34:box=1:boxcolor=black@0.55:boxborderw=12:x=w-text_w-40:y=40`;
      await ff(["-ss", String(s), "-i", ownerVid, "-t", String(e - s),
        "-vf", `setpts=PTS/${SPEED.toFixed(2)},fps=${FPS},scale=${W}:${H},${counter},${caption}`,
        "-c:v", "libx264", "-pix_fmt", "yuv420p", "-r", String(FPS), "-an", out]);
      parts.push(out);
    };
    for (const w of waits) { await pushNormal(cursor, w.s); await pushFast(w.s, w.e); cursor = w.e; }
    await pushNormal(cursor, m.end);
    // Concatène les sous-parties S3 puis applique les fondus.
    const listFile = join(WORK, "s3-list.txt");
    writeFileSync(listFile, parts.map((p) => `file '${p.replace(/\\/g, "/")}'`).join("\n"));
    const joined = join(WORK, "s3-joined.mp4");
    await ff(["-f", "concat", "-safe", "0", "-i", listFile, "-c", "copy", joined]);
    const d3 = await probeDur(joined);
    await add("s3-mise-en-route", "s3", ["-i", joined, "-vf", fade(d3)]);
    console.log(`  (scène 3 : attentes x${SPEED.toFixed(1)} avec compteur de temps réel)`);
  }
  // S4 — lien/QR (3 s, ordinateur) puis téléphone en plan continu, cadré.
  {
    const lien = need("s4-lien");
    const dLien = Math.min(lien.end - lien.start, 3.5);
    await add("s4-client", "s4a", ["-ss", String(lien.start), "-i", ownerVid, "-t", String(dLien),
      "-vf", `scale=${W}:${H},${fade(dLien)}`]);
    const m = need("s4-client");
    const d = m.end - m.start;
    const label = `drawtext=fontfile=${FONT}:text='Lien ou QR code':fontcolor=white:fontsize=34:box=1:boxcolor=black@0.55:boxborderw=12:x=(w-text_w)/2:y=48:enable='lt(t,3)'`;
    await add("s4-client", "s4b", ["-ss", String(m.start), "-i", phoneVid, "-t", String(d),
      "-vf", `scale=470:1018,pad=${W}:${H}:(ow-iw)/2:(oh-ih)/2:#11100E,drawbox=x=(iw-486)/2:y=23:w=486:h=1034:color=#3a352f:t=8,${label},${fade(d)}`]);
  }
  // S5 — patron plein écran + suivi téléphone en incrustation (même horloge).
  {
    const m = need("s5-patron");
    const d = m.end - m.start;
    const out = join(WORK, "s5.mp4");
    await ff(["-ss", String(m.start), "-i", ownerVid, "-ss", String(m.start), "-i", phoneVid, "-t", String(d),
      "-filter_complex", `[1:v]scale=360:780[pip];[0:v]scale=${W}:${H}[bg];[bg][pip]overlay=W-w-48:(H-h)/2,${fade(d)}`,
      "-c:v", "libx264", "-pix_fmt", "yuv420p", "-r", String(FPS), "-an", out]);
    const dur = await probeDur(out);
    segs.push({ sceneId: "s5-patron", file: out, dur });
    console.log(`  segment s5 : ${dur.toFixed(1)} s`);
  }
  // S6 — injection (téléphone cadré) puis cartes archi / éval / isolation.
  {
    const m = need("s6-injection");
    const d = m.end - m.start;
    await add("s6-fiable", "s6a", ["-ss", String(m.start), "-i", phoneVid, "-t", String(d),
      "-vf", `scale=470:1018,pad=${W}:${H}:(ow-iw)/2:(oh-ih)/2:#11100E,${fade(d)}`]);
    const cards: Array<[string, string, number]> = [["s6-archi", "s6b", 5], ["s6-eval", "s6c", 4], ["s6-isolation", "s6d", 4]];
    for (const [markName, segName, cap] of cards) {
      const cm = need(markName);
      const cd = Math.min(cm.end - cm.start, cap);
      await add("s6-fiable", segName, ["-ss", String(cm.start), "-i", ownerVid, "-t", String(cd),
        "-vf", `scale=${W}:${H},${fade(cd)}`]);
    }
  }
  // S7 — carte de fin (10 s).
  {
    const m = need("s7-fin");
    const d = Math.min(m.end - m.start, 10);
    await add("s7-fin", "s7", ["-ss", String(m.start), "-i", ownerVid, "-t", String(d),
      "-vf", `scale=${W}:${H},${fade(d)}`]);
  }

  // --- Assemblage -------------------------------------------------------------
  console.log("▶ assemblage final…");
  const listFile = join(WORK, "all-list.txt");
  writeFileSync(listFile, segs.map((s) => `file '${s.file.replace(/\\/g, "/")}'`).join("\n"));
  const joined = join(WORK, "joined.mp4");
  await ff(["-f", "concat", "-safe", "0", "-i", listFile, "-c", "copy", joined]);
  const totalDur = await probeDur(joined);
  console.log(`  durée totale avant sous-titres : ${totalDur.toFixed(1)} s (cible ≤ 170 s, plafond 180 s)`);
  if (totalDur > 180) console.log("  ⚠ au-delà de 3:00 — voir RAPPORT.md (scènes réelles non coupées)");

  // --- Sous-titres générés des durées RÉELLES par scène ------------------------
  const sceneOrder = ["s1-probleme", "s2-promesse", "s3-mise-en-route", "s4-client", "s5-patron", "s6-fiable", "s7-fin"];
  const sceneDur = new Map<string, number>();
  for (const s of segs) sceneDur.set(s.sceneId, (sceneDur.get(s.sceneId) ?? 0) + s.dur);
  const offsets = new Map<string, { start: number; end: number }>();
  let acc = 0;
  for (const id of sceneOrder) {
    const d = sceneDur.get(id) ?? 0;
    offsets.set(id, { start: acc, end: acc + d });
    acc += d;
  }
  const buildSrt = (lang: "en" | "fr") => NARRATION.map((n, i) => {
    const o = offsets.get(n.id) ?? { start: 0, end: 0 };
    return `${i + 1}\n${srtTime(o.start)} --> ${srtTime(o.end)}\n${lang === "en" ? n.voEn : n.voFr}\n`;
  }).join("\n");
  const buildVoix = (lang: "en" | "fr") => NARRATION.map((n) => {
    const o = offsets.get(n.id) ?? { start: 0, end: 0 };
    const mmss = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
    return `Scène ${n.id} (${mmss(o.start)}–${mmss(o.end)})\n${lang === "en" ? n.voEn : n.voFr}\n`;
  }).join("\n");

  const srtEn = join(DEMO_DIR, "sous-titres-en.srt");
  writeFileSync(srtEn, buildSrt("en"));
  writeFileSync(join(DEMO_DIR, "sous-titres-fr.srt"), buildSrt("fr"));
  writeFileSync(join(DEMO_DIR, "voix-off-en.txt"), buildVoix("en"));
  writeFileSync(join(DEMO_DIR, "voix-off-fr.txt"), buildVoix("fr"));

  // --- Encodage final : sous-titres gravés + musique optionnelle -------------
  const music = resolve("scripts/demo-assets/musique.mp3");
  const outFile = join(DEMO_DIR, "oren-demo.mp4");
  const subFilter = `subtitles=filename=sous-titres-en.srt:force_style='FontName=Arial,FontSize=20,PrimaryColour=&HFFFFFF&,OutlineColour=&H99000000&,BorderStyle=1,Outline=1,Shadow=0,Alignment=2,MarginV=30'`;
  if (existsSync(music)) {
    await ff(["-i", joined, "-i", music, "-vf", subFilter,
      "-filter_complex", "[1:a]volume=0.07,afade=t=in:st=0:d=1,afade=t=out:st=" + Math.max(0, totalDur - 2).toFixed(1) + ":d=2[a]",
      "-map", "0:v", "-map", "[a]", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-r", String(FPS),
      "-c:a", "aac", "-shortest", "-movflags", "+faststart", outFile]);
  } else {
    await ff(["-i", joined, "-f", "lavfi", "-i", "anullsrc=r=44100:cl=stereo", "-vf", subFilter,
      "-map", "0:v", "-map", "1:a", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-r", String(FPS),
      "-c:a", "aac", "-shortest", "-movflags", "+faststart", outFile]);
  }
  // Sans voix de synthèse locale : la même vidéo sert de version « sans voix ».
  const outSilent = join(DEMO_DIR, "oren-demo-sans-voix.mp4");
  copyFileSync(outFile, outSilent);

  const finalDur = await probeDur(outFile);
  console.log(`\n✓ ${outFile} — ${finalDur.toFixed(1)} s, ${W}x${H}, ${FPS} ips, sous-titres EN gravés`);
  console.log(`✓ ${outSilent} (identique : pas de voix de synthèse, voir voix-off-*.txt)`);
  console.log("✓ sous-titres-en.srt / sous-titres-fr.srt / voix-off-en.txt / voix-off-fr.txt");
  if (timeline.notes.length) console.log("\nNotes d'enregistrement :\n- " + timeline.notes.join("\n- "));
}

main().catch((err) => {
  console.error(`\nÉCHEC MONTAGE : ${err instanceof Error ? err.message : err}`);
  process.exit(1);
});
