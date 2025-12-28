#!/usr/bin/env python3
from pathlib import Path
import sys

TARGET_SUFFIXES = (".aux", ".log", ".synctex.gz", ".fdb_latexmk", ".fls", ".pre")

def remove_temp_files(root: Path) -> None:
    # 하위 디렉토리까지 전부 순회
    for path in root.rglob("*"):
        if path.is_file() and path.name.endswith(TARGET_SUFFIXES):
            print(f"삭제: {path}")
            try:
                path.unlink()
            except Exception as e:
                print(f"  실패: {e}")

if __name__ == "__main__":
    # 사용법: python clean_tex.py [기준_디렉토리]
    root_dir = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(".")
    remove_temp_files(root_dir.resolve())
