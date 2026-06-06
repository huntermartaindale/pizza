"""
make_icons.py - generate the PWA app icons.

Draws a simple pizza-slice glyph on a warm red, full-bleed background (safe for
maskable icons) at 4x supersampling, then downscales for clean edges.
Run: python icons/make_icons.py   (from the repo root)
Swap in real artwork any time by replacing icon-192.png / icon-512.png.
"""
import os
from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))

RED = (179, 51, 26)        # background / crust accent
CRUST = (232, 176, 75)     # golden crust
CHEESE = (245, 214, 140)   # cheese
SAUCE = (207, 58, 34)      # tomato
PEPP = (160, 36, 22)       # pepperoni


def draw_icon(size):
    ss = 4
    s = size * ss
    img = Image.new("RGBA", (s, s), RED + (255,))
    d = ImageDraw.Draw(img)

    cx = cy = s / 2
    r = s * 0.34  # keep glyph well inside the maskable safe zone

    # crust circle
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=CRUST)
    # cheese layer
    rc = r * 0.86
    d.ellipse([cx - rc, cy - rc, cx + rc, cy + rc], fill=CHEESE)
    # sauce layer
    rs = r * 0.7
    d.ellipse([cx - rs, cy - rs, cx + rs, cy + rs], fill=SAUCE)

    # a few pepperoni
    spots = [(-0.28, -0.18), (0.22, -0.24), (0.0, 0.12), (-0.18, 0.26), (0.3, 0.18)]
    pr = r * 0.13
    for (dx, dy) in spots:
        x = cx + dx * r
        y = cy + dy * r
        d.ellipse([x - pr, y - pr, x + pr, y + pr], fill=PEPP)

    return img.resize((size, size), Image.LANCZOS)


for sz in (192, 512):
    out = os.path.join(HERE, "icon-%d.png" % sz)
    draw_icon(sz).save(out)
    print("wrote", out)
