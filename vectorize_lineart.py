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

第一个 --color 会被当成"线稿层"(先整体淡入一次),
之后每个 --color 会被当成"填色层"(依次淡入),
出现顺序 = 你在命令行里 --color 的先后顺序。
"""

import argparse, os, sys
from PIL import Image, ImageFilter
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

def close_mask(mask, radius):
    """形态学"闭运算":先膨胀(MaxFilter)把色块往外扩几个像素,再腐蚀(MinFilter)收回来。
    扩张时能把抗锯齿/描边不连续造成的小缝隙连起来,收回时把整体大小基本还原,
    净效果是碎片轮廓变少,而不明显改变色块的形状和大小。radius<=0 时跳过,不处理。"""
    if radius <= 0:
        return mask
    size = radius * 2 + 1
    dilated = mask.filter(ImageFilter.MaxFilter(size))
    return dilated.filter(ImageFilter.MinFilter(size))

def trace_mask_to_subpaths(mask_img, flatness=0.15):
    """mask_img: PIL 'L' image, matched-color pixels are dark (0), background is bright (255).
    Returns a list of SVG path 'd' strings, one per traced contour (solid piece or hole).
    They get joined into one <path d="..."> per layer -- potrace already encodes solid vs.
    hole as the winding direction of each contour, so SVG's default nonzero fill rule cuts
    holes out correctly on its own, with no extra pairing/grouping logic needed on our side."""
    bmp = potrace.Bitmap(mask_img)
    path = bmp.trace(opttolerance=flatness)
    ds = []
    for curve in path:
        d = f"M{curve.start_point.x:.2f},{curve.start_point.y:.2f}"
        for seg in curve:
            if seg.is_corner:
                d += f"L{seg.c.x:.2f},{seg.c.y:.2f}L{seg.end_point.x:.2f},{seg.end_point.y:.2f}"
            else:
                d += (
                    f"C{seg.c1.x:.2f},{seg.c1.y:.2f} "
                    f"{seg.c2.x:.2f},{seg.c2.y:.2f} "
                    f"{seg.end_point.x:.2f},{seg.end_point.y:.2f}"
                )
        d += "Z"
        ds.append(d)
    return ds

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--input", required=True)
    ap.add_argument("--color", nargs=2, action="append", metavar=("NAME", "R,G,B"),
                     required=True,
                     help="图层名 + 目标RGB颜色, 例如: --color pink 233,97,239")
    ap.add_argument("--threshold", type=int, default=6500, help="颜色匹配容差,越大匹配越宽松")
    ap.add_argument("--close-radius", type=int, default=2,
                     help="矢量化前先做几像素的闭运算(膨胀再腐蚀),缝合抗锯齿造成的小缝隙,减少碎片轮廓。0=不做")
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
        mask = close_mask(mask, args.close_radius)
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
        ds = trace_mask_to_subpaths(cropped_inv)

        fill = target
        if args.fill_colors and i < len(args.fill_colors):
            fill = args.fill_colors[i]
        hexcolor = fill if isinstance(fill, str) else "#%02x%02x%02x" % fill

        layer_data.append((name, hexcolor, ds))
        print(f"[{name}] {len(ds)} 段轮廓")

    w, h = crop_box[2]-crop_box[0], crop_box[3]-crop_box[1]
    build_reveal_html(layer_data, w, h, os.path.join(args.out_dir, "reveal-demo.html"))
    print("完成,demo在:", os.path.join(args.out_dir, "reveal-demo.html"))

def build_reveal_html(layer_data, w, h, out_path):
    # 第一层 = 线稿, 整体淡入一次; 之后每层 = 依次整体淡入
    line_name, line_color, line_ds = layer_data[0]
    line_d = " ".join(line_ds)
    line_dur = 300
    line_finish = line_dur + 100

    fill_groups = []
    fill_css = []
    t = line_finish
    for idx, (name, color, ds) in enumerate(layer_data[1:]):
        d_all = " ".join(ds)
        fill_groups.append(
            f'    <g fill="{color}" stroke="none">\n'
            f'      <path class="fill f{idx}" d="{d_all}"/>\n    </g>'
        )
        fill_css.append(
            f'  .f{idx} {{ opacity:0; animation: fillIn 0.6s ease-out {t}ms forwards; }}'
        )
        t += 300

    html = f'''<!DOCTYPE html>
<html lang="zh-CN"><head><meta charset="UTF-8"><title>reveal demo</title>
<style>
  body{{margin:0;height:100vh;background:#05060a;display:flex;align-items:center;justify-content:center;}}
  svg{{width:320px;height:auto;overflow:visible;}}
  .line{{ opacity:0; animation: reveal {line_dur}ms ease-out forwards; }}
  @keyframes reveal {{ from {{opacity:0; transform:scale(0.92);}} to {{opacity:1; transform:scale(1);}} }}
  @keyframes fillIn {{ from {{opacity:0;}} to {{opacity:1;}} }}
{chr(10).join(fill_css)}
</style></head>
<body>
  <svg viewBox="0 0 {w} {h}">
{chr(10).join(fill_groups)}
    <g fill="{line_color}" stroke="none">
      <path class="line" d="{line_d}"/>
    </g>
  </svg>
</body></html>'''
    open(out_path, "w").write(html)

if __name__ == "__main__":
    main()
