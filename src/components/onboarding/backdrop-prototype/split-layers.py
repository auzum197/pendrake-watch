# PROTOTYPE: splits src/assets/onboarding-backdrop.jpg into parallax layers
# and paints the trees out so they can be drawn from code instead.
# Needs numpy and opencv-python-headless.
#   python split-layers.py [debug-dir]

import sys
from pathlib import Path

import cv2
import numpy as np

HERE = Path(__file__).parent
SRC = HERE.parents[2] / "assets" / "onboarding-backdrop.jpg"
OUT = HERE / "layers"
DEBUG = Path(sys.argv[1]) if len(sys.argv) > 1 else None

# How far a layer's pixels reach past its own edge, so a nearer layer can
# drift a few pixels without opening a hole.
BLEED = 28

rng = np.random.default_rng(7)
img = cv2.imread(str(SRC))
H, W = img.shape[:2]
ys = np.mgrid[0:H, 0:W][0]


def poly(points):
    m = np.zeros((H, W), np.uint8)
    cv2.fillPoly(m, [np.array(points, np.int32)], 255)
    return m > 0


def below(ridge):
    return poly([(0, H), (0, ridge[0][1]), *ridge, (W, ridge[-1][1]), (W, H)])


def line(points):
    xp, yp = zip(*points)
    return np.interp(np.arange(W), xp, yp)[None, :]


def grow(mask, px):
    k = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * px + 1, 2 * px + 1))
    return cv2.dilate(mask.astype(np.uint8), k) > 0


def redither(fill, mask):
    # Inpainting leaves smooth smears. Put grain back so it matches the stipple.
    grain = rng.normal(0, 14, fill.shape)
    out = fill.astype(np.float32)
    out[mask] += grain[mask]
    return np.clip(out, 0, 255).astype(np.uint8)


def fill_holes(src, holes, radius=4, coarse=8):
    # Inpaint at 1/coarse scale first. Any cell that touches a hole counts as a
    # hole, so the fill only samples clean pixels and nothing dark bleeds in.
    small = (W // coarse, H // coarse)
    src_s = cv2.resize(src, small, interpolation=cv2.INTER_AREA)
    holes_s = cv2.resize(holes.astype(np.float32), small, interpolation=cv2.INTER_AREA) > 0
    holes_s = cv2.dilate(holes_s.astype(np.uint8), np.ones((3, 3), np.uint8))
    base = cv2.inpaint(src_s, holes_s * 255, radius, cv2.INPAINT_TELEA)
    base = cv2.resize(base, (W, H), interpolation=cv2.INTER_CUBIC)
    out = src.copy()
    out[holes] = base[holes]
    return redither(out, holes)


# Trees ------------------------------------------------------------------

# (area, ground line, patch). A zone with a patch offset is covered with the
# painting that far to its left instead of being inpainted. The tree by the
# house is painted in mid blues that darkness alone doesn't catch, and a blurry
# fill there shows as a box.
tree_zones = [
    (poly([(80, 0), (560, 0), (560, 560), (80, 560)]),
     line([(80, 440), (200, 452), (330, 470), (430, 500), (560, 560)]), 0),
    (poly([(1270, 410), (1420, 410), (1420, 560), (1270, 560)]),
     line([(1270, 500), (1420, 500)]), 0),
    (poly([(1028, 518), (1093, 518), (1093, 590), (1028, 590)]),
     line([(1028, 575), (1093, 575)]), 70),
]


def find_trees(src, contrast):
    # A tree pixel is either near black or much darker than its surroundings,
    # which catches the thin branches against the sky.
    gray = cv2.cvtColor(src, cv2.COLOR_BGR2GRAY)
    soft = cv2.GaussianBlur(gray, (3, 3), 0).astype(np.int16)
    around = cv2.medianBlur(gray, 41).astype(np.int16)
    dark = (soft < 34) | (soft < around - contrast)
    dark = cv2.morphologyEx(dark.astype(np.uint8), cv2.MORPH_CLOSE, np.ones((5, 5), np.uint8)) > 0
    found = np.zeros((H, W), bool)
    for zone, ground, patch in tree_zones:
        if not patch:
            found |= zone & dark & (ys < ground)
    return grow(found, 3)


trees = find_trees(img, 38)
clean = fill_holes(img, trees)
# A second, touchier pass picks up the specks the first fill left behind.
specks = find_trees(clean, 24)
clean = fill_holes(clean, specks)
trees |= specks

treeless = clean

# Just above the ground a sky-coloured fill reads as a glowing smear. Fade back
# to the painted trunk bases there, so they fold into the ground layer.
keep = np.zeros((H, W), np.float32)
for zone, ground, _ in tree_zones:
    keep = np.maximum(keep, zone * np.clip((ys - ground + 60) / 60, 0, 1))
keep = (keep * trees)[..., None]
clean = (img * keep + treeless * (1 - keep)).astype(np.uint8)

for zone, ground, patch in tree_zones:
    if patch:
        area = grow(zone & (ys < ground), 4).astype(np.float32)
        blend = cv2.GaussianBlur(area, (0, 0), 4)[..., None]
        source = np.roll(img, patch, axis=1)
        clean = (source * blend + clean * (1 - blend)).astype(np.uint8)
        treeless = (source * blend + treeless * (1 - blend)).astype(np.uint8)
        trees |= area > 0

# Layers, back to front --------------------------------------------------
# Each extent is everything the layer would cover if nothing sat in front.

far = below([
    (0, 440), (560, 428), (610, 420), (645, 418), (700, 450), (760, 500),
    (820, 575), (860, 588), (905, 525), (955, 470), (1005, 440), (1060, 385),
    (1100, 345), (1128, 328), (1165, 345), (1210, 375), (W, 400),
])

near = below([
    (0, 190), (45, 215), (95, 255), (150, 262), (250, 275), (330, 285),
    (370, 300), (405, 292), (440, 318), (475, 360), (520, 410), (570, 455),
    (640, 492), (720, 540), (790, 580), (820, 590), (880, 590), (960, 575),
    (1030, 545), (1085, 505), (1130, 470), (1165, 435), (1195, 385),
    (1225, 320), (1265, 255), (1300, 205), (1335, 165), (1368, 150),
    (1405, 165), (1440, 148), (1470, 140), (1515, 170), (1560, 200),
    (1620, 212), (W, 220),
])

water = ys >= 583

house = poly([
    (1095, 540), (1098, 520), (1112, 508), (1140, 497), (1162, 510),
    (1178, 516), (1215, 514), (1240, 522), (1262, 546), (1268, 590),
    (1098, 592),
])

def write_layers(src, out):
    # The foreground is the dark mass along the bottom and both flanks,
    # whatever of it touches the bottom edge.
    soft = cv2.GaussianBlur(cv2.cvtColor(src, cv2.COLOR_BGR2GRAY), (0, 0), 3)
    shadow = (soft < 36) & (ys > line([(0, 380), (500, 520), (860, 600), (1250, 560), (1500, 380), (W, 300)]))
    shadow = cv2.morphologyEx(shadow.astype(np.uint8), cv2.MORPH_CLOSE, np.ones((9, 9), np.uint8))
    _, labels = cv2.connectedComponents(shadow)
    ground = np.isin(labels, np.unique(labels[-1][labels[-1] > 0]))
    ground = cv2.morphologyEx(ground.astype(np.uint8), cv2.MORPH_OPEN, np.ones((3, 3), np.uint8)) > 0
    ground &= ~house | (ys > 585)

    stack = [
        ("sky", np.ones((H, W), bool)),
        ("far", far),
        ("near", near),
        ("water", water),
        ("house", house),
        ("ground", ground),
    ]

    out.mkdir(parents=True, exist_ok=True)
    sheet = []
    for i, (name, extent) in enumerate(stack):
        covered = np.zeros((H, W), bool)
        for _, front in stack[i + 1:]:
            covered |= front
        shown = extent & ~covered
        hidden = extent & covered
        pixels = fill_holes(src, hidden) if hidden.any() else src.copy()
        alpha = extent & (shown | grow(shown, BLEED))
        rgba = np.dstack([pixels, alpha.astype(np.uint8) * 255])
        cv2.imwrite(str(out / f"{name}.webp"), rgba, [cv2.IMWRITE_WEBP_QUALITY, 92])
        checker = ((np.indices((H, W)).sum(0) // 16) % 2 * 60 + 60).astype(np.uint8)
        tile = np.where(alpha[..., None], pixels, checker[..., None])
        cv2.putText(tile, name, (20, 60), 0, 2, (0, 255, 255), 4)
        sheet.append(cv2.resize(tile, (W // 2, H // 2)))
    return np.vstack([np.hstack(sheet[i:i + 2]) for i in range(0, 6, 2)])


sheet = write_layers(clean, OUT)

if DEBUG:
    DEBUG.mkdir(parents=True, exist_ok=True)
    marked = img.copy()
    marked[trees] = (0, 0, 255)
    cv2.imwrite(str(DEBUG / "trees-mask.png"), marked)
    cv2.imwrite(str(DEBUG / "clean.png"), clean)
    cv2.imwrite(str(DEBUG / "layers.png"), sheet)
