# -*- coding: utf-8 -*-
import io, sys
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
from PIL import Image
import potrace
import vectorize_lineart as vl

im = Image.open("assets/computer.jpg").convert("RGB")
target = (0, 225, 255)
mask = vl.build_mask(im, target, 6500)
mask = vl.close_mask(mask, 2)
bbox = mask.getbbox()
pad = 15
crop_box = (max(0, bbox[0]-pad), max(0, bbox[1]-pad), bbox[2]+pad, bbox[3]+pad)
cropped = mask.crop(crop_box)
cropped_inv = Image.eval(cropped, lambda p: 255 - p).convert('L')

bmp = potrace.Bitmap(cropped_inv)
path = bmp.trace(opttolerance=0.15)

def area(b):
    return (b[2]-b[0]) * (b[3]-b[1])

rows = []
for curve in path:
    xs, ys = [curve.start_point.x], [curve.start_point.y]
    for seg in curve:
        if seg.is_corner:
            xs += [seg.c.x, seg.end_point.x]; ys += [seg.c.y, seg.end_point.y]
        else:
            xs += [seg.c1.x, seg.c2.x, seg.end_point.x]; ys += [seg.c1.y, seg.c2.y, seg.end_point.y]
    bb = (min(xs), min(ys), max(xs), max(ys))
    sign = curve._path.sign          # 私有属性,potrace内部早就算好了这条轮廓是"实心"还是"洞"
    real_area = curve._path.area     # 私有属性,potrace算的是真实像素面积,不是bbox面积
    rows.append((bb, sign, real_area))

rows.sort(key=lambda r: area(r[0]), reverse=True)
print(f"一共 {len(rows)} 条轮廓,按bbox面积从大到小:\n")
print(f"{'idx':>4} {'bbox_area':>10} {'真实像素面积':>10} {'sign':>6}   bbox")
for i, (bb, sign, ra) in enumerate(rows[:20]):
    print(f"{i:>4} {area(bb):>10.0f} {ra:>10} {str(sign):>6}   {tuple(round(v,1) for v in bb)}")
