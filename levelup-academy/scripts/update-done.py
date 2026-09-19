#!/usr/bin/env python3
"""
update-done.py — TASK.md ni parse qiladi, [x] belgilangan tasklarni
done.md fayliga yozadi. Avtomatik ishlaydi:
  - SessionStart hook (git pull dan keyin)
  - PostToolUse hook (git push dan keyin, done.md ni commit+push qiladi)
"""
import re
import sys
import os
from datetime import datetime, timezone, timedelta
from pathlib import Path

# Windows encoding fix
try:
    sys.stdout.reconfigure(encoding="utf-8")
except Exception:
    pass
try:
    sys.stdin.reconfigure(encoding="utf-8")
except Exception:
    pass

REPO_DIR = Path(__file__).resolve().parent.parent
TASK_FILE = REPO_DIR / "TASK.md"
DONE_FILE = REPO_DIR / "done.md"

TZ = timezone(timedelta(hours=5))  # Uzbekistan time


def parse_tasks():
    """TASK.md ni parse qiladi, completed va pending tasklarni ajratadi."""
    if not TASK_FILE.exists():
        return [], [], {"total": 0, "done": 0, "pending": 0}

    lines = TASK_FILE.read_text(encoding="utf-8").splitlines()
    completed = []
    pending = []
    current_section = "Umumiy"
    stats = {"total": 0, "done": 0, "pending": 0}

    for line in lines:
        # Section header (## ...)
        section_match = re.match(r"^## (.+)$", line)
        if section_match:
            current_section = section_match.group(1).strip()
            # Remove emoji prefixes for cleaner display
            current_section = re.sub(r"^[^\w]+\s*", "", current_section)
            continue

        # Task line: - [x] or - [ ]
        task_match = re.match(r"^- \[([ x])\]\s*(.+)$", line)
        if task_match:
            done = task_match.group(1) == "x"
            text = task_match.group(2).strip()
            task = {"section": current_section, "text": text, "done": done}
            stats["total"] += 1
            if done:
                stats["done"] += 1
                completed.append(task)
            else:
                stats["pending"] += 1
                pending.append(task)

    return completed, pending, stats


def generate_done_md(completed, stats):
    """done.md faylini generatsiya qiladi."""
    now = datetime.now(TZ).strftime("%d.%m.%Y %H:%M")

    lines = [
        "# LevelUp Academy — TUGALLANGAN VAZIFALAR",
        "",
        f"> Oxirgi yangilanish: {now} (UTC+5, Toshkent vaqti)",
        f"> Statistika: {stats['done']}/{stats['total']} task tugallangan ({stats['done']*100//max(stats['total'],1)}%)",
        "",
        "---",
        "",
    ]

    # Progress bar
    progress = stats["done"] * 100 // max(stats["total"], 1)
    filled = progress // 5
    empty = 20 - filled
    lines.append(f"## Progress: [{'#' * filled}{'.' * empty}] {progress}%")
    lines.append("")

    # Group by section
    sections = {}
    for task in completed:
        sec = task["section"]
        if sec not in sections:
            sections[sec] = []
        sections[sec].append(task)

    lines.append("## Tugallangan vazifalar")
    lines.append("")

    for section, tasks in sections.items():
        lines.append(f"### {section}")
        for task in tasks:
            lines.append(f"- [x] {task['text']}")
        lines.append("")

    # Summary by team member
    lines.append("---")
    lines.append("")
    lines.append("## Jamoa boyicha")
    lines.append("")

    karis_sections = [s for s in sections if "Karis" in s or any(x in s for x in ["Auth", "Main Admin", "CEO", "Admin", "K-TEST"])]
    abdulaziz_sections = [s for s in sections if "Abdulaziz" in s or any(x in s for x in ["Mentor", "Student", "Parent", "Shared", "AB-"])]
    frontend_sections = [s for s in sections if "Frontend" in s]

    karis_count = sum(len(sections[s]) for s in karis_sections)
    abdulaziz_count = sum(len(sections[s]) for s in abdulaziz_sections)
    frontend_count = sum(len(sections[s]) for s in frontend_sections)

    lines.append(f"- Karis (Backend): {karis_count} task")
    lines.append(f"- Abdulaziz (Backend): {abdulaziz_count} task")
    lines.append(f"- Frontend jamoasi: {frontend_count} task")
    lines.append("")

    return "\n".join(lines)


def main():
    completed, pending, stats = parse_tasks()
    content = generate_done_md(completed, stats)
    DONE_FILE.write_text(content, encoding="utf-8")
    print(f"done.md yangilandi: {stats['done']}/{stats['total']} task tugallangan")


if __name__ == "__main__":
    main()
