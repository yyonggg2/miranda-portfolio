"""
One-off asset prep: converts the black background in assets/brain1.2.jpg
to a transparent alpha channel, so the brain line art can sit directly on
the page's dark gradient background with no visible rectangle edge.

Usage: python scripts/make-transparent.py
"""

from PIL import Image

SRC = "assets/brain1.2.jpg"
DEST = "assets/brain-outline.png"
BLACK_THRESHOLD = 25  # pixels darker than this (per channel) become transparent

img = Image.open(SRC).convert("RGBA")
pixels = img.load()
width, height = img.size

for y in range(height):
    for x in range(width):
        r, g, b, a = pixels[x, y]
        if r <= BLACK_THRESHOLD and g <= BLACK_THRESHOLD and b <= BLACK_THRESHOLD:
            pixels[x, y] = (r, g, b, 0)
        else:
            brightness = max(r, g, b)
            pixels[x, y] = (255, 255, 255, brightness)

img.save(DEST)
print(f"Saved {DEST} ({width}x{height})")
