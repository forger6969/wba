#!/usr/bin/env python3
"""
release.py — main branch'dan yangi release chiqaradi:
  1. VERSION faylini bump qiladi (patch/minor/major)
  2. Oxirgi tag'dan beri bo'lgan commitlardan CHANGELOG.md yozuvini generatsiya qiladi
  3. VERSION+CHANGELOG.md ni commit qiladi, git tag qo'yadi
  4. main + tag'ni push qiladi
  5. GitHub Release yaratadi (gh CLI)

Ishlatish:
  python scripts/release.py            # patch: 0.1.0 -> 0.1.1
  python scripts/release.py minor      # 0.1.0 -> 0.2.0
  python scripts/release.py major      # 0.1.0 -> 1.0.0
"""
import re
import subprocess
import sys
from datetime import datetime, timezone, timedelta
from pathlib import Path

try:
    sys.stdout.reconfigure(encoding="utf-8")
except Exception:
    pass

REPO_DIR = Path(__file__).resolve().parent.parent
VERSION_FILE = REPO_DIR / "VERSION"
CHANGELOG_FILE = REPO_DIR / "CHANGELOG.md"
TZ = timezone(timedelta(hours=5))  # Toshkent vaqti


def run(args, check=True, capture=True):
    result = subprocess.run(
        args, cwd=REPO_DIR, text=True, encoding="utf-8",
        capture_output=capture, check=False,
    )
    if check and result.returncode != 0:
        print(f"XATO: {' '.join(args)}\n{result.stderr}")
        sys.exit(1)
    return result.stdout.strip() if capture else ""


def bump_version(current, part):
    major, minor, patch = (int(x) for x in current.split("."))
    if part == "major":
        major, minor, patch = major + 1, 0, 0
    elif part == "minor":
        minor, patch = minor + 1, 0
    else:
        patch += 1
    return f"{major}.{minor}.{patch}"


def main():
    part = sys.argv[1] if len(sys.argv) > 1 else "patch"
    if part not in ("patch", "minor", "major"):
        print("XATO: argument patch | minor | major bo'lishi kerak")
        sys.exit(1)

    branch = run(["git", "branch", "--show-current"])
    if branch != "main":
        print(f"XATO: release faqat 'main' branch'dan chiqariladi (hozir: {branch})")
        print("Avval: git checkout main && git pull")
        sys.exit(1)

    status = run(["git", "status", "--porcelain"])
    if status:
        print("XATO: working tree toza emas — avval commit/stash qiling:")
        print(status)
        sys.exit(1)

    run(["git", "pull", "origin", "main", "--ff-only"], capture=False)

    current = VERSION_FILE.read_text(encoding="utf-8").strip() if VERSION_FILE.exists() else "0.0.0"
    new_version = bump_version(current, part)
    tag = f"v{new_version}"

    last_tag = run(["git", "describe", "--tags", "--abbrev=0"], check=False)
    log_range = f"{last_tag}..HEAD" if last_tag else "HEAD"
    log = run(["git", "log", log_range, "--no-merges", "--pretty=format:- %s (%h)"], check=False)
    if not log:
        log = "- (o'zgarishlar yo'q — faqat versiya bump)"

    today = datetime.now(TZ).strftime("%Y-%m-%d")
    entry = f"## {tag} — {today}\n\n{log}\n\n"

    old_changelog = CHANGELOG_FILE.read_text(encoding="utf-8") if CHANGELOG_FILE.exists() else "# CHANGELOG\n\n"
    header, _, rest = old_changelog.partition("\n\n")
    new_changelog = f"{header}\n\n{entry}{rest.lstrip()}" if rest else f"{header}\n\n{entry}"
    CHANGELOG_FILE.write_text(new_changelog, encoding="utf-8")
    VERSION_FILE.write_text(new_version + "\n", encoding="utf-8")

    run(["git", "add", "VERSION", "CHANGELOG.md"], capture=False)
    run(["git", "commit", "-m", f"chore: release {tag}"], capture=False)
    run(["git", "tag", "-a", tag, "-m", f"Release {tag}"], capture=False)
    run(["git", "push", "origin", "main"], capture=False)
    run(["git", "push", "origin", tag], capture=False)

    run([
        "gh", "release", "create", tag,
        "--title", tag,
        "--notes", f"{log}",
    ], capture=False)

    print(f"\nRelease {tag} tayyor: https://github.com/Azizbek0010/LevelUP_academy/releases/tag/{tag}")


if __name__ == "__main__":
    main()
