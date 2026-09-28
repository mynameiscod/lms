#!/usr/bin/env python3
"""
Merge staged Problem Bank exports (CBD-*.json) so one idea imports as one problem.

The authoring pipeline writes each idea as up to three entries:
  stage-1 Core   the problem, small n
  stage-2 Scale  the SAME problem with large n (same solutions, same input format)
  stage-3 Twist  a DIFFERENT problem (new input, new solution)

Scale is folded into Core: Core's statement and samples, Scale's larger constraints, and
every test from both (Scale's tests hidden, duplicates dropped). A stage is only merged when
its reference solutions and input format match Core's exactly, so a real Twist can never be
merged by mistake; it stays its own problem.

Usage:
  python scripts/merge-problem-stages.py <file-or-folder-or-zip> [...] [-o OUT_DIR]
Writes one merged file per input into OUT_DIR (default ./merged), plus all.json.
"""
import argparse
import json
import re
import sys
import zipfile
from pathlib import Path

MAX_TESTS = 200             # server: MAX_TESTS in problemBankService.ts
MAX_FILE_BYTES = 8 * 1024 * 1024  # client: ImportDialog.tsx refuses bigger files
STAGE_LINE = re.compile(r"^\*\*Stage\s+\d+\s*·[^*]*:\*\*.*?(\n\s*\n|$)", re.S)


def stage_of(p):
    for t in p.get("tags", []):
        m = re.fullmatch(r"stage-(\d+)", t)
        if m:
            return int(m.group(1))
    return None


def same_problem(base, other):
    if base.get("inputFormat") != other.get("inputFormat"):
        return False
    sols = {l["language"]: l.get("solutionCode", "") for l in base.get("languages", [])}
    langs = other.get("languages", [])
    return bool(langs) and all(sols.get(l["language"]) == l.get("solutionCode", "") for l in langs)


def strip_stage(statement):
    return STAGE_LINE.sub("", statement or "", count=1).lstrip()


def merge_group(problems):
    """problems: the entries of one idea, in file order. Returns the entries to import."""
    base = next((p for p in problems if stage_of(p) == 1), problems[0])
    out, merged = [], []
    for p in problems:
        if p is base:
            continue
        (merged if same_problem(base, p) else out).append(p)
    if not merged:
        return problems, []

    m = dict(base)
    m["statement"] = strip_stage(base.get("statement"))
    big = merged[-1]
    m["constraints"] = big.get("constraints", base.get("constraints"))
    m["limits"] = {
        "timeMs": max(p.get("limits", {}).get("timeMs", 0) for p in [base, *merged]) or 2000,
        "memoryMb": max(p.get("limits", {}).get("memoryMb", 0) for p in [base, *merged]) or 256,
    }
    m["tags"] = [t for t in base.get("tags", []) if not t.startswith("stage-")]
    # The Scale stage's "make it a single pass" note is a hint once it is not its own problem.
    scale_notes = [re.sub(r"^\*\*Stage\s+\d+\s*·\s*[^:*]*:\*\*\s*", "", p["statement"].split("\n\n")[0]).strip()
                   for p in merged if STAGE_LINE.match(p.get("statement", ""))]
    m["hints"] = list(base.get("hints", [])) + [n for n in scale_notes if n]

    seen, tests = set(), []
    for src in [base, *merged]:
        for t in src.get("tests", []):
            key = (t.get("input", ""), t.get("expectedOutput", ""))
            if key in seen:
                continue
            seen.add(key)
            t = dict(t)
            if src is not base:
                t["isSample"] = False  # samples come from Core; big inputs are useless on screen
            tests.append(t)
    if len(tests) > MAX_TESTS:
        raise SystemExit(f'"{base["title"]}": {len(tests)} tests after merging, limit is {MAX_TESTS}.')
    m["tests"] = tests

    result = [m]
    for p in out:
        q = dict(p)
        q["tags"] = [t for t in p.get("tags", []) if not t.startswith("stage-")]
        result.append(q)
    return result, merged


def load_inputs(paths):
    for raw in paths:
        p = Path(raw)
        if p.is_dir():
            for f in sorted(p.glob("CBD-*.json")):
                yield f.name, json.loads(f.read_text(encoding="utf-8"))
        elif p.suffix == ".zip":
            with zipfile.ZipFile(p) as z:
                for n in sorted(z.namelist()):
                    if Path(n).name.startswith("CBD-") and n.endswith(".json"):
                        yield Path(n).name, json.loads(z.read(n).decode("utf-8"))
        else:
            yield p.name, json.loads(p.read_text(encoding="utf-8"))


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("inputs", nargs="+")
    ap.add_argument("-o", "--out", default="merged")
    a = ap.parse_args()
    out_dir = Path(a.out)
    out_dir.mkdir(parents=True, exist_ok=True)

    everything = []
    for name, doc in load_inputs(a.inputs):
        problems = doc["problems"] if isinstance(doc, dict) else doc
        result, merged = merge_group(problems)
        everything.extend(result)
        body = json.dumps({"problems": result}, ensure_ascii=False, indent=1)
        (out_dir / name).write_text(body, encoding="utf-8")
        size = len(body.encode("utf-8"))
        note = f"merged {', '.join(p['title'] for p in merged)}" if merged else "nothing to merge"
        warn = "  ⚠ over 8 MB, the import screen will refuse it" if size > MAX_FILE_BYTES else ""
        print(f"{name}: {len(problems)} → {len(result)} problem(s) ({note}), {size / 1048576:.1f} MB{warn}")

    (out_dir / "all.json").write_text(json.dumps({"problems": everything}, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"all.json: {len(everything)} problem(s) → {out_dir.resolve()}")


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    main()
