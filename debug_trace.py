# -*- coding: utf-8 -*-
import sys
from PIL import Image
import vectorize_lineart as vl

im = Image.open("assets/computer.jpg").convert("RGB")
target = (0, 225, 255)  # 线稿层(青色)
threshold = 6500

mask = vl.build_mask(im, target, threshold)
mask = vl.close_mask(mask, 2)
bbox = mask.getbbox()
print("整张图里,青色线稿层的总范围 bbox =", bbox)

pad = 15
crop_box = (max(0, bbox[0]-pad), max(0, bbox[1]-pad), bbox[2]+pad, bbox[3]+pad)
cropped = mask.crop(crop_box)
cropped_inv = Image.eval(cropped, lambda p: 255 - p).convert('L')

subpaths = vl.trace_mask_to_subpaths(cropped_inv)
print(f"\npotrace 一共描出了 {len(subpaths)} 条独立轮廓\n")

def area(b):
    return (b[2]-b[0]) * (b[3]-b[1])

items = sorted(subpaths, key=lambda x: area(x[1]), reverse=True)
print("按面积从大到小列出前25条轮廓 (index, bbox, area):")
for i, (d, b) in enumerate(items[:25]):
    print(f"  #{i}: bbox={tuple(round(v,1) for v in b)}  area={area(b):.0f}")

groups = vl.group_by_containment(subpaths, max_area_ratio=1.8)
print(f"\ngroup_by_containment 之后,变成了 {len(groups)} 个 group (也就是最终会渲染成 {len(groups)} 个 <path>)")

# 重新跑一遍分组逻辑,但这次记录每个group具体吃进了哪几个原始轮廓的index,方便对照
def contains(outer, inner):
    return (outer[0]<=inner[0] and outer[1]<=inner[1] and outer[2]>=inner[2] and outer[3]>=inner[3])

groups2 = []
for idx, (d, b) in enumerate(items):
    parent = next((g for g in groups2 if contains(g["bbox"], b) and area(g["bbox"]) <= area(b) * 1.8), None)
    if parent is not None:
        parent["members"].append(idx)
    else:
        groups2.append({"bbox": b, "members": [idx]})

print("\n每个group吃进了哪些轮廓 (只列有2个以上成员的,和面积最大的几个独立group):")
for gi, g in enumerate(groups2):
    if len(g["members"]) > 1 or area(g["bbox"]) > 3000:
        print(f"  group#{gi}: bbox={tuple(round(v,1) for v in g['bbox'])} area={area(g['bbox']):.0f}  成员轮廓index={g['members']}")
