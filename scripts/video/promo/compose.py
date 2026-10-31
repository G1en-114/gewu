"""Promo cut: the recorded scenes on the timeline, faded through paper, with the
chapter captions over each. Usage: python compose.py <video dir>"""
import json
import subprocess
import sys
from pathlib import Path

root = Path(sys.argv[1])
rec, cards, out = root / "rec", root / "cards", root / "out"
out.mkdir(exist_ok=True)
PAPER = "0xf4f0e7"
FADE = 0.4

# (scene, seconds to skip at the start of the recording, length in the final cut)
TIMELINE = [
    ("title", 0, 5), ("engine", 0.6, 13), ("turbofan", 0.6, 13), ("teardown", 0.3, 9.5), ("brake", 0.3, 8.5),
    ("ortho", 0.6, 12), ("blueprint", 0.6, 11), ("orrery", 0.6, 11), ("catalogue", 0.6, 9), ("end", 0, 7),
]
assert abs(sum(t[2] for t in TIMELINE) - 99) < 1e-6


def run(args):
    r = subprocess.run(["ffmpeg", "-v", "error", "-y", *args], capture_output=True, text=True, encoding="utf-8", errors="replace")
    if r.returncode:
        sys.exit(f"ffmpeg failed ({r.returncode}): {r.stderr[-1500:]}")


captions = json.loads((cards / "captions.json").read_text(encoding="utf-8"))

segments = []
at = 0.0
for i, (name, skip, length) in enumerate(TIMELINE):
    seg = out / f"{i:02d}-{name}.mp4"
    segments.append(seg)
    t_start, t_end = at, at + length
    at = t_end
    fades = f"fade=t=in:st=0:d={FADE}:color={PAPER},fade=t=out:st={length - FADE}:d={FADE}:color={PAPER}"
    if name in ("title", "end"):
        # Still cards: the title fades in from paper, the end card fades out.
        f = f"fade=t=in:st=0:d=1.2:color={PAPER}" if name == "title" else f"fade=t=in:st=0:d={FADE}:color={PAPER},fade=t=out:st={length - 1.5}:d=1.5:color={PAPER}"
        run(["-loop", "1", "-t", str(length), "-i", str(cards / f"{name}.png"), "-vf", f"fps=30,format=yuv420p,{f}", "-c:v", "libx264", "-crf", "17", "-preset", "medium", str(seg)])
        continue
    # Captions that fall inside this scene, in the scene's own time.
    mine = [(k, max(c[0], t_start) - t_start, min(c[1], t_end) - t_start) for k, c in enumerate(captions) if c[0] < t_end and c[1] > t_start]
    inputs = ["-f", "concat", "-safe", "0", "-i", str(rec / name / "list.ffconcat")]
    graph = [f"[0:v]trim=start={skip}:duration={length},setpts=PTS-STARTPTS,fps=30,scale=1920:1080,format=yuv420p[b0]"]
    last = "[b0]"
    for j, (k, a, b) in enumerate(mine):
        d = b - a
        inputs += ["-loop", "1", "-t", f"{d:.3f}", "-i", str(cards / f"cap{k:02d}.png")]
        graph.append(f"[{j + 1}:v]format=rgba,fade=t=in:st=0:d=0.6:alpha=1,fade=t=out:st={d - 0.6:.3f}:d=0.6:alpha=1,setpts=PTS-STARTPTS+{a:.3f}/TB[c{j}]")
        graph.append(f"{last}[c{j}]overlay=0:0:eof_action=pass:enable='between(t,{a:.3f},{b:.3f})'[b{j + 1}]")
        last = f"[b{j + 1}]"
    graph.append(f"{last}{fades},format=yuv420p[out]")
    run([*inputs, "-filter_complex", ";".join(graph), "-map", "[out]", "-t", str(length), "-c:v", "libx264", "-crf", "17", "-preset", "medium", str(seg)])

(out / "segments.txt").write_text("".join(f"file '{s.name}'" + chr(10) for s in segments), encoding="utf-8")
final = root / "gewu-inkwork-promo.mp4"
# Re-encode once at the end: plain High profile 4:2:0 that every player opens (the caption overlays otherwise leave 4:4:4).
run(["-f", "concat", "-safe", "0", "-i", str(out / "segments.txt"), "-c:v", "libx264", "-profile:v", "high", "-level", "4.1", "-pix_fmt", "yuv420p",
     "-crf", "18", "-preset", "medium", "-movflags", "+faststart", str(final)])
named = root / "格物-Inkwork-宣传片.mp4"
final.replace(named)
print(named)
