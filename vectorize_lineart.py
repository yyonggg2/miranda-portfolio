#!/usr/bin/env python3
"""
把手绘线稿(多色JPG/PNG)按颜色分层矢量化成SVG,并生成一个
"先画线条、再依次填色"的HTML动画demo。

依赖:
  - Python: pillow (pip install pillow --break-system-packages)
  - 命令行工具: potrace (Ubuntu/Debian: apt-get install potrace
                          Mac: brew install potrace)

用法:
  python3 vectorize_lineart.py \
      --input closed_backpack.jpg \
      --color pink 233,97,239 \
      --color blue 22,22,240 \
      --out-dir output/

第一个 --color 会被当成"线稿层"(逐笔出现动画),
之后每个 --color 会被当成"填色层"(依次淡入),
出现顺序 = 你在命令行里 --color 的先后顺序。
"""

import argparse, os, sys
from PIL import Image
import potrace

def build_mask(im, target, threshold):
    w, h = im.size
    px = im.load()
    mask = Image.new('L', (w, h), 0)
    mpx = mask.load()
    tr, tg, tb = target
    for y in range(h):
        for x in range(w):
            r, g, b = px[x, y][:3]
            d = (r - tr) ** 2 + (g - tg) ** 2 + (b - tb) ** 2
            if d < threshold:
                mpx[x, y] = 255
    return mask

def trace_mask_to_subpaths(mask_img, flatness=0.15):
    """mask_img: PIL 'L' image, matched-color pixels are dark (0), background is bright (255).
    Returns a list of (d, bbox) pairs, one per traced contour. bbox = (xmin,ymin,xmax,ymax),
    used later to figure out which contours are "holes" nested inside another contour
    (e.g. the inner and outer edge of a thin ring like a circled lens outline)."""
    bmp = potrace.Bitmap(mask_img)
    path = bmp.trace(opttolerance=flatness)
    subpaths = []
    for curve in path:
        xs, ys = [curve.start_point.x], [curve.start_point.y]
        d = f"M{curve.start_point.x:.2f},{curve.start_point.y:.2f}"
        for seg in curve:
            if seg.is_corner:
                xs += [seg.c.x, seg.end_point.x]
                ys += [seg.c.y, seg.end_point.y]
                d += f"L{seg.c.x:.2f},{seg.c.y:.2f}L{seg.end_point.x:.2f},{seg.end_point.y:.2f}"
            else:
                xs += [seg.c1.x, seg.c2.x, seg.end_point.x]
                ys += [seg.c1.y, seg.c2.y, seg.end_point.y]
                d += (
                    f"C{seg.c1.x:.2f},{seg.c1.y:.2f} "
                    f"{seg.c2.x:.2f},{seg.c2.y:.2f} "
                    f"{seg.end_point.x:.2f},{seg.end_point.y:.2f}"
                )
        d += "Z"
        bbox = (min(xs), min(ys), max(xs), max(ys))
        subpaths.append((d, bbox))
    return subpaths

def group_by_containment(subpaths, max_area_ratio=1.8):
    """Groups contours so that any contour nested inside another (a "hole", like the
    inner edge of a thin ring) ends up combined into the SAME SVG path as its outer
    contour. Without this, a thin ring traces as two separate closed loops that,
    rendered as two separate filled shapes, both render solid instead of leaving the
    ring hollow in the middle -- exactly the bug that made the camera's lens circle
    render as a solid blob instead of a thin outline.

    Only contours close in size (bbox area within max_area_ratio of each other) are
    treated as an outer/inner pair. Plain bbox containment alone is too loose: e.g. a
    laptop screen's rectangle outline fully contains the "Projects" text drawn inside
    it, but the text isn't a hole of that rectangle -- merging them corrupted both
    shapes' fill winding and rendered the text mirrored/garbled."""
    def area(b):
        return (b[2] - b[0]) * (b[3] - b[1])

    def contains(outer, inner):
        return (
            outer[0] <= inner[0] and outer[1] <= inner[1]
            and outer[2] >= inner[2] and outer[3] >= inner[3]
        )

    items = sorted(subpaths, key=lambda x: area(x[1]), reverse=True)
    groups = []
    for d, bbox in items:
        parent = next(
            (
                g for g in groups
                if contains(g["bbox"], bbox)
                and area(g["bbox"]) <= area(bbox) * max_area_ratio
            ),
            None,
        )
        if parent is not None:
            parent["d_parts"].append(d)
        else:
            groups.append({"d_parts": [d], "bbox": bbox})
    return [" ".join(g["d_parts"]) for g in groups]

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--input", required=True)
    ap.add_argument("--color", nargs=2, action="append", metavar=("NAME", "R,G,B"),
                     required=True,
                     help="图层名 + 目标RGB颜色, 例如: --color pink 233,97,239")
    ap.add_argument("--threshold", type=int, default=6500, help="颜色匹配容差,越大匹配越宽松")
    ap.add_argument("--out-dir", default="vectorize_out")
    ap.add_argument("--fill-colors", nargs="*", default=None,
                     help="可选:给每层输出SVG时用的填色,顺序对应--color的顺序,不填则用检测到的原色")
    args = ap.parse_args()

    os.makedirs(args.out_dir, exist_ok=True)
    im = Image.open(args.input).convert("RGB")

    layers = []
    all_bbox = None

    for i, (name, rgb_str) in enumerate(args.color):
        target = tuple(int(v) for v in rgb_str.split(","))
        mask = build_mask(im, target, args.threshold)
        bbox = mask.getbbox()
        if bbox:
            all_bbox = bbox if all_bbox is None else (
                min(all_bbox[0], bbox[0]), min(all_bbox[1], bbox[1]),
                max(all_bbox[2], bbox[2]), max(all_bbox[3], bbox[3]),
            )
        layers.append((name, target, mask))

    if all_bbox is None:
        print("没有匹配到任何颜色,检查一下 --color 的RGB值和 --threshold", file=sys.stderr)
        sys.exit(1)

    pad = 15
    crop_box = (max(0, all_bbox[0]-pad), max(0, all_bbox[1]-pad),
                all_bbox[2]+pad, all_bbox[3]+pad)

    layer_data = []
    for i, (name, target, mask) in enumerate(layers):
        cropped = mask.crop(crop_box)
        cropped_inv = Image.eval(cropped, lambda p: 255 - p).convert('L')
        subpaths = trace_mask_to_subpaths(cropped_inv)

        fill = target
        if args.fill_colors and i < len(args.fill_colors):
            fill = args.fill_colors[i]
        hexcolor = fill if isinstance(fill, str) else "#%02x%02x%02x" % fill

        layer_data.append((name, hexcolor, subpaths))
        print(f"[{name}] {len(subpaths)} 段轮廓")

    w, h = crop_box[2]-crop_box[0], crop_box[3]-crop_box[1]
    build_reveal_html(layer_data, w, h, os.path.join(args.out_dir, "reveal-demo.html"))
    print("完成,demo在:", os.path.join(args.out_dir, "reveal-demo.html"))

def build_reveal_html(layer_data, w, h, out_path):
    # 第一层 = 线稿, 逐笔出现; 之后每层 = 依次整体淡入
    line_name, line_color, line_subpaths_raw = layer_data[0]
    line_groups = group_by_containment(line_subpaths_raw)
    stroke_dur = 140
    line_finish = len(line_groups) * stroke_dur + 500

    pink_html = "\n".join(
        f'      <path class="stroke" style="animation-delay:{i*stroke_dur}ms" d="{sp}"/>'
        for i, sp in enumerate(line_groups)
    )

    fill_groups = []
    fill_css = []
    t = line_finish
    for idx, (name, color, subpaths_raw) in enumerate(layer_data[1:]):
        d_all = " ".join(d for d, bbox in subpaths_raw)
        fill_groups.append(
            f'    <g transform="translate(0,{h}) scale(1,-1)" fill="{color}" stroke="none">\n'
            f'      <path class="fill f{idx}" d="{d_all}"/>\n    </g>'
        )
        fill_css.append(
            f'  .f{idx} {{ opacity:0; animation: fillIn 0.9s ease-out {t}ms forwards; }}'
        )
        t += 500

    html = f'''<!DOCTYPE html>
<html lang="zh-CN"><head><meta charset="UTF-8"><title>reveal demo</title>
<style>
  body{{margin:0;height:100vh;background:#05060a;display:flex;align-items:center;justify-content:center;}}
  svg{{width:320px;height:auto;overflow:visible;}}
  .stroke{{ animation: reveal 0.5s ease-out both; transform-origin: center; }}
  @keyframes reveal {{ from {{opacity:0; transform:scale(0.85);}} to {{opacity:1; transform:scale(1);}} }}
  @keyframes fillIn {{ from {{opacity:0;}} to {{opacity:1;}} }}
{chr(10).join(fill_css)}
</style></head>
<body>
  <svg viewBox="0 0 {w} {h}">
{chr(10).join(fill_groups)}
    <g transform="translate(0,{h}) scale(1,-1)" fill="{line_color}" stroke="none">
{pink_html}
    </g>
  </svg>
</body></html>'''
    open(out_path, "w").write(html)

if __name__ == "__main__":
    main()
