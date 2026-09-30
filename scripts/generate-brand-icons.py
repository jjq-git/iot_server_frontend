"""Regenerate raster browser icons from the canonical 64×64 pod geometry.

Requires Pillow. The checked-in images remain build inputs, so the frontend
build itself does not need Python.
"""

from pathlib import Path

from PIL import Image, ImageDraw


PUBLIC_DIR = Path(__file__).resolve().parents[1] / "public"
BRAND = "#067a7a"


def render(size: int, *, apple: bool = False) -> Image.Image:
    scale = 8
    canvas_size = size * scale
    image = Image.new("RGBA", (canvas_size, canvas_size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)
    factor = canvas_size / 64

    def box(x1: float, y1: float, x2: float, y2: float):
        return tuple(round(value * factor) for value in (x1, y1, x2, y2))

    def points(*values: tuple[float, float]):
        return [(round(x * factor), round(y * factor)) for x, y in values]

    color = "white" if apple else BRAND
    width = max(1, round((3 if apple else 3.5) * factor))

    if apple:
        draw.rounded_rectangle(
            box(0, 0, 64, 64),
            radius=round(12 * factor),
            fill=BRAND,
        )

    draw.rounded_rectangle(box(10, 8, 54, 54), radius=round(6 * factor), outline=color, width=width)
    for line in (
        ((38, 14), (38, 48)),
        ((16, 14), (38, 14), (38, 48), (16, 48)),
        ((16, 36), (21, 36)),
        ((21, 42), (33, 42)),
        ((27, 42), (27, 48)),
        ((24, 48), (30, 48)),
        ((44, 33), (47, 33)),
        ((44, 36), (47, 36)),
    ):
        draw.line(points(*line), fill=color, width=width, joint="curve")

    draw.rounded_rectangle(box(23, 31, 31, 40), radius=round(2 * factor), outline=color, width=width)
    draw.rounded_rectangle(box(35, 28, 37.5, 36), radius=round(1.2 * factor), fill=color)
    draw.rounded_rectangle(box(42, 30, 49, 39), radius=round(1.5 * factor), outline=color, width=width)
    draw.arc(box(42.3, 21.8, 49.7, 27.2), start=205, end=335, fill=color, width=width)
    draw.arc(box(43.8, 24.5, 48.2, 29), start=205, end=335, fill=color, width=width)
    draw.ellipse(box(45.2, 28.5, 46.8, 30.1), fill=color)

    return image.resize((size, size), Image.Resampling.LANCZOS)


render(16).save(PUBLIC_DIR / "favicon-16x16.png")
render(32).save(PUBLIC_DIR / "favicon-32x32.png")
render(256).save(
    PUBLIC_DIR / "favicon.ico",
    format="ICO",
    sizes=[(16, 16), (32, 32), (48, 48), (64, 64)],
)
render(180, apple=True).save(PUBLIC_DIR / "apple-touch-icon.png")
