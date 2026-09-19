#!/usr/bin/env python3
"""
rollback.py — main'ni oldingi release (tag)ga qaytaradi.

MUHIM: bu git tarixini o'chirmaydi / force-push qilmaydi (bu jamoaviy repo,
boshqalar main'ni pull qilib turgan — tarixni buzish ularning lokal nusxasini
sindiradi). Buning o'rniga: eski tag'dagi fayllar holatini YANGI commit
sifatida main'ga qo'shadi ("revert" commit) — tarix saqlanadi, hamma narsa
ko'rinadi, kim nima uchun rollback qilinganini keyin tushunadi.

Ishlatish:
  python scripts/rollback.py v0.1.1
"""
import subprocess
import sys
from pathlib import Path

try:
    sys.stdout.reconfigure(encoding="utf-8")
except Exception:
    pass

REPO_DIR = Path(__file__).resolve().parent.parent


def run(args, check=True, capture=True):
    result = subprocess.run(
        args, cwd=REPO_DIR, text=True, encoding="utf-8",
        capture_output=capture, check=False,
    )
    if check and result.returncode != 0:
        print(f"XATO: {' '.join(args)}\n{result.stderr}")
        sys.exit(1)
    return result.stdout.strip() if capture else ""


def main():
    if len(sys.argv) != 2:
        print("Ishlatish: python scripts/rollback.py <tag>   (masalan v0.1.1)")
        print("\nMavjud tag'lar:")
        run(["git", "tag", "--sort=-creatordate"], capture=False)
        sys.exit(1)

    target = sys.argv[1]

    tags = run(["git", "tag", "-l", target])
    if not tags:
        print(f"XATO: tag '{target}' topilmadi. Mavjud tag'lar:")
        run(["git", "tag", "--sort=-creatordate"], capture=False)
        sys.exit(1)

    branch = run(["git", "branch", "--show-current"])
    if branch != "main":
        print(f"XATO: rollback faqat 'main' branch'dan qilinadi (hozir: {branch})")
        sys.exit(1)

    status = run(["git", "status", "--porcelain"])
    if status:
        print("XATO: working tree toza emas — avval commit/stash qiling:")
        print(status)
        sys.exit(1)

    run(["git", "pull", "origin", "main", "--ff-only"], capture=False)

    current = run(["git", "rev-parse", "--short", "HEAD"])
    print(f"Hozirgi main: {current}. '{target}' holatiga qaytaramiz (yangi commit sifatida)...")

    # eski tag'dagi butun fayl holatini ishchi papkaga ko'chiradi
    run(["git", "checkout", target, "--", "."], capture=False)

    diff = run(["git", "status", "--porcelain"])
    if not diff:
        print(f"main allaqachon '{target}' bilan bir xil — rollback shart emas.")
        sys.exit(0)

    run(["git", "add", "-A"], capture=False)
    run(["git", "commit", "-m", f"revert: rollback main to {target}"], capture=False)
    run(["git", "push", "origin", "main"], capture=False)

    print(f"\nRollback tayyor: main endi '{target}' holatida (yangi commit orqali, tarix saqlangan).")
    print("Buni rasmiy release sifatida belgilash uchun: python scripts/release.py")


if __name__ == "__main__":
    main()
