"""
VIRTU.STORE - signage atlas for the Kampala arcade shop (run with normal Python + Pillow).

Draws every signboard, poster and wall sign into one 2048x2048 texture, so the whole shop's
signage is a single material / draw call. All artwork is original: our own shop name, fictional
neighbouring shops, generic yellow/red "Mobile Money" boards (no MTN/Airtel logos).

  python -I blender/make_signs.py      ->  blender/out/signs.png + blender/out/signs.json

signs.json maps each sign id to its rectangle in UV space (u0, v0, u1, v1; v measured from the
BOTTOM, Blender's convention). blender/shop.py reads it to texture the sign quads.
"""

import json
import os

from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "out")
SIZE = 2048
FONTS = "C:/Windows/Fonts"


def font(name, size):
    for candidate in (name, "arialbd.ttf", "segoeuib.ttf"):
        try:
            return ImageFont.truetype(os.path.join(FONTS, candidate), size)
        except OSError:
            continue
    return ImageFont.load_default()


IMPACT = lambda s: font("impact.ttf", s)  # noqa: E731  classic Kampala signwriter look
BOLD = lambda s: font("arialbd.ttf", s)  # noqa: E731
BLACK = lambda s: font("ariblk.ttf", s)  # noqa: E731

atlas = Image.new("RGB", (SIZE, SIZE), (40, 40, 40))
draw = ImageDraw.Draw(atlas)
rects = {}


def fit(text, maker, max_w, start):
    size = start
    while size > 10:
        f = maker(size)
        if draw.textlength(text, font=f) <= max_w:
            return f
        size -= 2
    return maker(10)


def centred(box, text, maker, size, fill, dy=0, stroke=0, stroke_fill=None):
    x0, y0, x1, y1 = box
    f = fit(text, maker, (x1 - x0) * 0.92, size)
    w = draw.textlength(text, font=f)
    asc, desc = f.getmetrics()
    y = y0 + (y1 - y0 - (asc + desc)) / 2 + dy
    draw.text((x0 + (x1 - x0 - w) / 2, y), text, font=f, fill=fill,
              stroke_width=stroke, stroke_fill=stroke_fill)


def register(sign_id, box):
    x0, y0, x1, y1 = box
    # small inset so bilinear filtering never bleeds a neighbour into the edge
    rects[sign_id] = [(x0 + 2) / SIZE, 1 - (y1 - 2) / SIZE, (x1 - 2) / SIZE, 1 - (y0 + 2) / SIZE]


def signboard(sign_id, box, bg, title, sub, fg, sub_fg, border=None):
    x0, y0, x1, y1 = box
    draw.rectangle(box, fill=bg)
    if border:
        draw.rectangle((x0 + 8, y0 + 8, x1 - 8, y1 - 8), outline=border, width=6)
    h = y1 - y0
    centred((x0, y0, x1, y0 + h * 0.66), title, IMPACT, int(h * 0.5), fg, stroke=3, stroke_fill=(0, 0, 0))
    centred((x0, y0 + h * 0.6, x1, y1 - h * 0.06), sub, BOLD, int(h * 0.17), sub_fg)
    register(sign_id, box)


# --- Row 1: our main signboard (full width) --------------------------------------------
signboard("main-signboard", (0, 0, 2048, 380), (196, 22, 28), "VIRTU MOBILE",
          "PHONES  •  ACCESSORIES  •  MOBILE MONEY  •  REPAIRS", (255, 214, 0), (255, 255, 255),
          border=(255, 214, 0))

# --- Rows 2-3: neighbouring shops' signboards (fictional) -------------------------------
neighbours = [
    ("kato-electronics", (20, 70, 140), "KATO ELECTRONICS", "TVs  •  RADIOS  •  SOLAR  •  WIRING", (255, 255, 255), (250, 210, 60)),
    ("nalubega-fashions", (150, 30, 110), "NALUBEGA FASHIONS", "LADIES' WEAR  •  KITENGE  •  GOMESI", (255, 236, 120), (255, 255, 255)),
    ("hope-phone-repair", (24, 120, 70), "HOPE PHONE REPAIR", "SCREENS  •  BATTERIES  •  FLASHING", (255, 255, 255), (255, 230, 90)),
    ("kampala-accessories", (230, 120, 20), "KAMPALA ACCESSORIES", "CHARGERS  •  COVERS  •  EARPHONES", (30, 30, 30), (255, 255, 255)),
    ("mama-joy-boutique", (90, 40, 150), "MAMA JOY BOUTIQUE", "SHOES  •  BAGS  •  PERFUMES", (255, 255, 255), (255, 200, 230)),
]
for i, (sid, bg, title, sub, fg, sub_fg) in enumerate(neighbours):
    col, row = i % 2, i // 2
    box = (col * 1024, 400 + row * 230, col * 1024 + 1020, 400 + row * 230 + 220)
    signboard(sid, box, bg, title, sub, fg, sub_fg)

# --- Mobile money boards (generic, no operator logos) -----------------------------------
signboard("momo-yellow", (1024, 860, 2044, 1080), (255, 204, 0), "MOBILE MONEY",
          "DEPOSIT  •  WITHDRAW  •  SEND  •  PAY BILLS", (20, 20, 20), (20, 20, 20), border=(20, 20, 20))
signboard("momo-red", (0, 1090, 1020, 1310), (220, 20, 40), "MOBILE MONEY AGENT",
          "AIRTIME  •  DATA BUNDLES  •  WITHDRAW", (255, 255, 255), (255, 235, 150), border=(255, 255, 255))


# --- Posters (portrait) ------------------------------------------------------------------
def poster(sign_id, box, top, bottom, title, lines, title_fg, line_fg):
    x0, y0, x1, y1 = box
    for y in range(y0, y1):
        t = (y - y0) / (y1 - y0)
        draw.line([(x0, y), (x1, y)], fill=tuple(int(top[c] + (bottom[c] - top[c]) * t) for c in range(3)))
    w, h = x1 - x0, y1 - y0
    centred((x0, y0 + h * 0.08, x1, y0 + h * 0.3), title, IMPACT, int(h * 0.13), title_fg)
    for j, line in enumerate(lines):
        centred((x0, y0 + h * (0.36 + j * 0.1), x1, y0 + h * (0.44 + j * 0.1)), line, BOLD, int(h * 0.05), line_fg)
    draw.rounded_rectangle((x0 + w * 0.12, y1 - h * 0.17, x1 - w * 0.12, y1 - h * 0.06), radius=18, fill=(255, 214, 0))
    centred((x0, y1 - h * 0.17, x1, y1 - h * 0.06), "VIRTU MOBILE", IMPACT, int(h * 0.06), (30, 30, 30))
    register(sign_id, box)


poster("poster-original", (1040, 1100, 1350, 1540), (20, 20, 24), (60, 60, 70), "ORIGINAL",
       ["PHONES ONLY", "1 YEAR WARRANTY", "FREE SCREEN GUARD"], (255, 214, 0), (255, 255, 255))
poster("poster-galaxy", (1370, 1100, 1680, 1540), (25, 60, 120), (150, 175, 205), "GALAXY S25",
       ["ULTRA NOW IN STOCK", "200 MP CAMERA", "BOX PACKED"], (255, 255, 255), (255, 255, 255))
poster("poster-iphone", (1700, 1100, 2010, 1540), (232, 115, 44), (120, 50, 20), "iPHONE 17",
       ["PRO MAX", "COSMIC ORANGE", "AVAILABLE HERE"], (255, 255, 255), (255, 240, 220))

# --- Small hand-painted wall signs ------------------------------------------------------
for sid, box, bg, fg, text in [
    ("sign-credit", (0, 1330, 1020, 1460), (250, 248, 240), (190, 20, 20), "NO CREDIT TODAY, COME TOMORROW"),
    ("sign-screen", (0, 1470, 1020, 1600), (250, 248, 240), (20, 60, 150), "SCREEN PROTECTORS FITTED HERE"),
    ("sign-cash", (0, 1610, 1020, 1740), (255, 214, 0), (20, 20, 20), "PAY HERE  •  CASH  •  MOBILE MONEY"),
]:
    draw.rectangle(box, fill=bg)
    draw.rectangle((box[0] + 6, box[1] + 6, box[2] - 6, box[3] - 6), outline=fg, width=5)
    centred(box, text, IMPACT, 80, fg)
    register(sid, box)

# --- Pegboard (perforated hardboard) ----------------------------------------------------
peg = (1040, 1560, 2044, 2044)
draw.rectangle(peg, fill=(176, 132, 92))
for yy in range(peg[1] + 12, peg[3] - 6, 24):
    for xx in range(peg[0] + 12, peg[2] - 6, 24):
        draw.ellipse((xx - 4, yy - 4, xx + 4, yy + 4), fill=(70, 50, 34))
register("pegboard", peg)

# --- Shutter slats (painted corrugated metal; tinted per shop in Blender) ----------------
shutter = (0, 1760, 1020, 2044)
for yy in range(shutter[1], shutter[3]):
    shade = 150 + int(45 * abs(((yy - shutter[1]) % 28) / 14 - 1))
    draw.line([(shutter[0], yy), (shutter[2], yy)], fill=(shade, shade, shade + 6))
register("shutter", shutter)

os.makedirs(OUT, exist_ok=True)
atlas.save(os.path.join(OUT, "signs.png"), optimize=True)
with open(os.path.join(OUT, "signs.json"), "w") as f:
    json.dump(rects, f, indent=2)
print(f"[virtu] wrote signs.png with {len(rects)} signs")
