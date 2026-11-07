#!/usr/bin/env python3
"""生成应用图标(自有简洁图形:橙色底 + 白色 "NL" 字样的卡片)。仅依赖 Pillow。"""
from PIL import Image, ImageDraw, ImageFont
import os

OUT = os.path.join(os.path.dirname(__file__), '..', 'public', 'icons')
os.makedirs(OUT, exist_ok=True)
BG = (232, 89, 12)
FG = (255, 255, 255)

def font(size):
    for p in ['/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',
              '/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf']:
        if os.path.exists(p):
            return ImageFont.truetype(p, size)
    return ImageFont.load_default()

def make(size, maskable=False, name=None):
    img = Image.new('RGB', (size, size), BG)
    d = ImageDraw.Draw(img)
    pad = int(size * (0.28 if maskable else 0.16))
    # 卡片
    d.rounded_rectangle([pad, pad, size - pad, size - pad], radius=int(size * 0.08), fill=FG)
    f = font(int(size * (0.26 if maskable else 0.32)))
    text = 'NL'
    bbox = d.textbbox((0, 0), text, font=f)
    w, h = bbox[2] - bbox[0], bbox[3] - bbox[1]
    d.text(((size - w) / 2 - bbox[0], (size - h) / 2 - bbox[1]), text, font=f, fill=BG)
    img.save(os.path.join(OUT, name))

make(192, name='icon-192.png')
make(512, name='icon-512.png')
make(512, maskable=True, name='icon-maskable-512.png')
make(180, name='apple-touch-icon.png')
print('icons written to', os.path.abspath(OUT))
