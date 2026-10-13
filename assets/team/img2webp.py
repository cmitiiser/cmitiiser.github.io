### Usage

# pip install pillow

# 1. **Convert everything in the current folder (default 350 KB):**
# python img2webp.py


# 2. **Convert everything to a tighter limit (e.g., 200 KB):**
# python img2webp.py --size 200


# 3. **Convert one specific image:**
# python img2webp.py --file photo.png


# 4. **Convert one specific image with custom ceiling:**
# python img2webp.py --file banner.jpg --size 150


import os
import io
import shutil
import argparse
from pathlib import Path
from PIL import Image

SUPPORTED_EXTENSIONS = {
    ".jpg", ".jpeg", ".png", ".bmp", ".tiff", ".tif", ".gif"
}

def compress_to_webp(image_path: Path, max_kb: int = 350, archive_dir: Path = None) -> bool:
    max_bytes = max_kb * 1024
    output_path = image_path.with_suffix(".webp")

    try:
        with Image.open(image_path) as img:
            if img.mode in ("RGBA", "LA") or (img.mode == "P" and "transparency" in img.info):
                working_img = img.convert("RGBA")
            else:
                working_img = img.convert("RGB")

            low, high = 15, 95
            best_buffer = None

            while low <= high:
                mid = (low + high) // 2
                buf = io.BytesIO()
                working_img.save(buf, format="WEBP", quality=mid, method=6)
                size = buf.tell()

                if size <= max_bytes:
                    best_buffer = buf
                    low = mid + 1
                else:
                    high = mid - 1

            if best_buffer is None:
                scale = 0.85
                current_img = working_img
                
                while True:
                    w, h = current_img.size
                    new_w, new_h = max(1, int(w * scale)), max(1, int(h * scale))
                    
                    if new_w <= 10 or new_h <= 10:
                        print(f"[!] Warning: Cannot shrink {image_path.name} below {max_kb}KB without severe degradation.")
                        return False

                    current_img = current_img.resize((new_w, new_h), Image.Resampling.LANCZOS)
                    
                    buf = io.BytesIO()
                    current_img.save(buf, format="WEBP", quality=50, method=6)
                    if buf.tell() <= max_bytes:
                        best_buffer = buf
                        break

            with open(output_path, "wb") as f:
                f.write(best_buffer.getvalue())

            final_kb = output_path.stat().st_size / 1024
            print(f"[✓] {image_path.name} -> {output_path.name} ({final_kb:.1f} KB)")

            if archive_dir:
                archive_dir.mkdir(parents=True, exist_ok=True)
                target_dest = archive_dir / image_path.name
                
                if target_dest.exists():
                    target_dest = archive_dir / f"{image_path.stem}_old{image_path.suffix}"
                    
                shutil.move(str(image_path), str(target_dest))
                print(f"    └─ Moved original to: {target_dest.relative_to(image_path.parent.parent if image_path.parent.name == 'old' else image_path.parent)}")

            return True

    except Exception as e:
        print(f"[✗] Failed {image_path.name}: {e}")
        return False


def main():
    parser = argparse.ArgumentParser(description="Convert images to WebP under a size limit and archive originals.")
    parser.add_argument(
        "-f", "--file",
        type=Path,
        default=None,
        help="Path to a single image to convert. If omitted, scans current directory."
    )
    parser.add_argument(
        "-s", "--size",
        type=int,
        default=350,
        help="Maximum target file size in KB (default: 350)."
    )
    args = parser.parse_args()

    if args.file:
        target = args.file
        if not target.exists() or not target.is_file():
            print(f"Error: Provided file '{target}' does not exist.")
            return
        archive_dir = target.parent / "old"
        compress_to_webp(target, max_kb=args.size, archive_dir=archive_dir)
    else:
        current_dir = Path.cwd()
        archive_dir = current_dir / "old"
        found_any = False

        images = [
            f for f in current_dir.iterdir()
            if f.is_file() and f.suffix.lower() in SUPPORTED_EXTENSIONS
        ]

        for file in images:
            found_any = True
            compress_to_webp(file, max_kb=args.size, archive_dir=archive_dir)

        if not found_any:
            print("No supported images found in the current directory.")


if __name__ == "__main__":
    main()