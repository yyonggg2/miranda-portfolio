"""
One-off asset prep: takes the hand-painted region map (assets/regions-raw.png,
actually a JPEG despite the .png extension) and produces a clean, flat-color
version at assets/brain-regions.png, where every pixel is snapped to one of
the 5 locked brand colors (or pure black for "no region").

This also fixes the JPEG compression blur/soft-brush edges, which would
otherwise leave thousands of slightly-off in-between colors along region
boundaries -- not usable for reliable pixel-color hit-testing.

Usage: python scripts/remap-regions.py
"""

from PIL import Image
import numpy as np

SRC = "assets/regions-raw.png"
DEST = "assets/brain-regions.png"

# Sample points (x, y) picked from the interior of each hand-painted blob,
# paired with the locked hex color that region maps to.
SEEDS = [
    ((550, 600), "#ff6b4a"),   # 额叶 frontal (teal in source) -> orange
    ((550, 850), "#4ade80"),   # 顶叶 parietal (magenta in source) -> green
    ((375, 750), "#fbbf24"),   # 颞叶 temporal left (yellow in source) -> yellow
    ((725, 750), "#fbbf24"),   # 颞叶 temporal right (yellow in source) -> yellow
    ((400, 950), "#a78bfa"),   # 枕叶 occipital (orange/tan in source) -> purple
    ((545, 955), "#38bdf8"),   # 小脑 cerebellum (blue in source) -> blue
]
BACKGROUND_HEX = "#000000"
PATCH = 4  # sample a (2*PATCH+1)^2 patch around each seed point, take the median


def hex_to_rgb(h):
    h = h.lstrip("#")
    return tuple(int(h[i : i + 2], 16) for i in (0, 2, 4))


img = Image.open(SRC).convert("RGB")
arr = np.array(img).astype(np.int16)  # H x W x 3

seed_source_colors = []
seed_target_colors = []
for (x, y), target_hex in SEEDS:
    patch = arr[y - PATCH : y + PATCH + 1, x - PATCH : x + PATCH + 1].reshape(-1, 3)
    median_color = np.median(patch, axis=0)
    seed_source_colors.append(median_color)
    seed_target_colors.append(hex_to_rgb(target_hex))
    print(f"seed at ({x},{y}) sampled source color {median_color} -> {target_hex}")

seed_source_colors = np.array(seed_source_colors)  # N x 3
seed_target_colors = np.array(seed_target_colors, dtype=np.uint8)  # N x 3

h, w, _ = arr.shape
flat = arr.reshape(-1, 3)

# Background test: near-black pixels stay background regardless of nearest seed.
brightness = flat.max(axis=1)
is_background = brightness < 25

# Nearest-seed classification for everything else.
dists = np.linalg.norm(flat[:, None, :] - seed_source_colors[None, :, :], axis=2)  # (H*W) x N
nearest = np.argmin(dists, axis=1)

out_flat = seed_target_colors[nearest]
out_flat[is_background] = hex_to_rgb(BACKGROUND_HEX)

out = out_flat.reshape(h, w, 3).astype(np.uint8)
Image.fromarray(out, mode="RGB").save(DEST)
print(f"Saved {DEST} ({w}x{h})")
