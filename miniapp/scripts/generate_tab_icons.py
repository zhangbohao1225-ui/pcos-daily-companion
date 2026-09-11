from pathlib import Path
from PIL import Image, ImageDraw

SCALE = 4
SIZE = 81
CANVAS = SIZE * SCALE
INACTIVE = "#b79a9c"
ACTIVE = "#cf5e6a"
PURPLE = "#7562a7"
PALE_PINK = "#fff0f3"
PALE_PURPLE = "#f1edfb"


def pt(x, y):
    return int(x * SCALE), int(y * SCALE)


def box(x1, y1, x2, y2):
    return (*pt(x1, y1), *pt(x2, y2))


def line(draw, points, fill, width=4, joint="curve"):
    draw.line([pt(x, y) for x, y in points], fill=fill, width=width * SCALE, joint=joint)


def icon_canvas(selected):
    image = Image.new("RGBA", (CANVAS, CANVAS), (255, 255, 255, 0))
    return image, ImageDraw.Draw(image), ACTIVE if selected else INACTIVE


def save_icon(name, selected, painter):
    image, draw, color = icon_canvas(selected)
    painter(draw, color, selected)
    image = image.resize((SIZE, SIZE), Image.Resampling.LANCZOS)
    output = Path(__file__).resolve().parents[1] / "assets" / "tab"
    output.mkdir(parents=True, exist_ok=True)
    suffix = "-active" if selected else ""
    image.save(output / f"{name}{suffix}.png", optimize=True)


def home(draw, color, selected):
    if selected:
        draw.ellipse(box(13, 13, 68, 68), fill=PALE_PURPLE)
    # A compact iris/flower mark that echoes SUTA's purple iris.
    draw.ellipse(box(34, 16, 47, 38), outline=color, width=4 * SCALE)
    draw.ellipse(box(20, 28, 42, 44), outline=color, width=4 * SCALE)
    draw.ellipse(box(39, 28, 61, 44), outline=color, width=4 * SCALE)
    draw.polygon([pt(32, 39), pt(40.5, 57), pt(49, 39)], fill=PURPLE if selected else color)
    draw.ellipse(box(37, 34, 44, 41), fill="#f0c95b" if selected else color)
    line(draw, [(40.5, 56), (40.5, 68)], color, 4)


def checkin(draw, color, selected):
    if selected:
        draw.rounded_rectangle(box(14, 14, 67, 70), radius=15 * SCALE, fill=PALE_PINK)
    draw.rounded_rectangle(box(19, 17, 62, 68), radius=9 * SCALE, outline=color, width=4 * SCALE)
    draw.rounded_rectangle(box(31, 11, 50, 24), radius=5 * SCALE, fill="#ffffff", outline=color, width=4 * SCALE)
    line(draw, [(29, 38), (37, 46), (53, 30)], color, 5)
    line(draw, [(29, 57), (51, 57)], PURPLE if selected else color, 4)


def calendar(draw, color, selected):
    if selected:
        draw.rounded_rectangle(box(11, 15, 70, 68), radius=15 * SCALE, fill=PALE_PURPLE)
    draw.rounded_rectangle(box(16, 18, 65, 68), radius=9 * SCALE, outline=color, width=4 * SCALE)
    line(draw, [(16, 33), (65, 33)], color, 4)
    line(draw, [(28, 12), (28, 25)], color, 5)
    line(draw, [(53, 12), (53, 25)], color, 5)
    for x, y in [(28, 45), (41, 45), (54, 45), (28, 57), (41, 57), (54, 57)]:
        draw.ellipse(box(x - 2.5, y - 2.5, x + 2.5, y + 2.5), fill=PURPLE if selected and (x, y) == (41, 45) else color)


def companion(draw, color, selected):
    if selected:
        draw.ellipse(box(8, 18, 49, 59), fill=PALE_PINK)
        draw.ellipse(box(32, 18, 73, 59), fill=PALE_PURPLE)
    draw.ellipse(box(12, 20, 45, 53), outline=color, width=4 * SCALE)
    draw.ellipse(box(36, 20, 69, 53), outline=color, width=4 * SCALE)
    draw.ellipse(box(23, 34, 27, 38), fill=color)
    draw.ellipse(box(54, 34, 58, 38), fill=color)
    line(draw, [(18, 65), (18, 60), (24, 55), (32, 53)], color, 4)
    line(draw, [(63, 65), (63, 60), (57, 55), (49, 53)], color, 4)
    heart = [pt(40.5, 65), pt(32, 57), pt(35, 52), pt(40.5, 56), pt(46, 52), pt(49, 57)]
    draw.polygon(heart, fill=PURPLE if selected else color)


def forum(draw, color, selected):
    if selected:
        draw.rounded_rectangle(box(10, 13, 70, 62), radius=16 * SCALE, fill=PALE_PURPLE)
    draw.rounded_rectangle(box(15, 17, 66, 58), radius=12 * SCALE, fill="#ffffff", outline=color, width=4 * SCALE)
    draw.polygon([pt(28, 57), pt(24, 70), pt(39, 58)], fill="#ffffff", outline=color)
    line(draw, [(27, 31), (54, 31)], color, 4)
    line(draw, [(27, 43), (47, 43)], PURPLE if selected else color, 4)
    draw.ellipse(box(55, 49, 68, 62), fill=ACTIVE if selected else color)


def profile(draw, color, selected):
    if selected:
        draw.ellipse(box(11, 12, 70, 71), fill=PALE_PINK)
    # A simple friendly smile for the personal profile tab.
    draw.ellipse(box(18, 16, 63, 61), fill="#ffffff", outline=color, width=4 * SCALE)
    draw.ellipse(box(29, 30, 34, 36), fill=color)
    draw.ellipse(box(47, 30, 52, 36), fill=color)
    draw.arc(box(28, 31, 53, 52), start=20, end=160, fill=PURPLE if selected else color, width=4 * SCALE)
    draw.ellipse(box(22, 39, 28, 44), fill="#f3a6ad" if selected else color)
    draw.ellipse(box(53, 39, 59, 44), fill="#f3a6ad" if selected else color)


for name, painter in {
    "home": home,
    "checkin": checkin,
    "calendar": calendar,
    "companion": companion,
    "forum": forum,
    "profile": profile,
}.items():
    save_icon(name, False, painter)
    save_icon(name, True, painter)
