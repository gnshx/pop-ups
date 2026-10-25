from PIL import Image, ImageFilter
import numpy as np
from collections import deque

orig_path = '/home/ganesh/.gemini/antigravity-ide/brain/36516f2d-1133-4ee6-a010-f5edcfbd2aa2/reze_denji_duo_1792924389693.jpg'
img = Image.open(orig_path).convert('RGB')
w, h = img.size
arr = np.array(img, dtype=np.float32)

# Compute lightness and saturation
r, g, b = arr[:, :, 0], arr[:, :, 1], arr[:, :, 2]
max_c = np.maximum(np.maximum(r, g), b)
min_c = np.minimum(np.minimum(r, g), b)
delta = max_c - min_c
# Background pixels are very close to pure white (high brightness, low delta)
is_bg_candidate = (min_c > 238) & (delta < 18)

# BFS flood-fill from all 4 borders to isolate ONLY the exterior background
visited = np.zeros((h, w), dtype=bool)
queue = deque()

# Add all border pixels that match background candidate
for x in range(w):
    if is_bg_candidate[0, x]:
        visited[0, x] = True
        queue.append((0, x))
    if is_bg_candidate[h - 1, x]:
        visited[h - 1, x] = True
        queue.append((h - 1, x))

for y in range(h):
    if is_bg_candidate[y, 0] and not visited[y, 0]:
        visited[y, 0] = True
        queue.append((y, 0))
    if is_bg_candidate[y, w - 1] and not visited[y, w - 1]:
        visited[y, w - 1] = True
        queue.append((y, w - 1))

while queue:
    cy, cx = queue.popleft()
    for dy, dx in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
        ny, nx = cy + dy, cx + dx
        if 0 <= ny < h and 0 <= nx < w and not visited[ny, nx]:
            if is_bg_candidate[ny, nx]:
                visited[ny, nx] = True
                queue.append((ny, nx))

# visited == True is purely exterior background
bg_mask = visited

# Create soft alpha mask from foreground
fg_mask = (~bg_mask).astype(np.float32)

# Apply gentle Gaussian blur to the mask to create subpixel anti-aliased transitions (1.2px)
mask_img = Image.fromarray((fg_mask * 255).astype(np.uint8))
soft_mask = mask_img.filter(ImageFilter.GaussianBlur(radius=1.2))
alpha_smooth = np.array(soft_mask, dtype=np.float32) / 255.0

# Clip small background noise
alpha_smooth = np.clip((alpha_smooth - 0.08) / 0.84, 0.0, 1.0)

# Smoothstep for pristine S-curve edge anti-aliasing
alpha_smooth = alpha_smooth * alpha_smooth * (3.0 - 2.0 * alpha_smooth)

# Defringe edges: remove white contamination from semi-transparent border pixels
# For semi-transparent pixels (0 < alpha < 1), un-premultiply assuming white background (255)
out_rgb = arr.copy()
edge_pixels = (alpha_smooth > 0.02) & (alpha_smooth < 0.98)
a_edge = alpha_smooth[edge_pixels, None]

# Recover true foreground: F = (C - (1 - a) * 255) / a
unmixed = (out_rgb[edge_pixels] - (1.0 - a_edge) * 255.0) / np.maximum(a_edge, 0.1)
out_rgb[edge_pixels] = np.clip(unmixed, 0.0, 255.0)

# Fully transparent pixels set to clean zero
out_rgb[alpha_smooth == 0] = 0

out_arr = np.zeros((h, w, 4), dtype=np.uint8)
out_arr[:, :, :3] = out_rgb.astype(np.uint8)
out_arr[:, :, 3] = (alpha_smooth * 255.0).astype(np.uint8)

res_img = Image.fromarray(out_arr, 'RGBA')
res_img.save('public/reze_denji.png', 'PNG', optimize=True)

# Also generate a pristine supersampled 2x resolution version for crisp rendering
res_img_high = res_img.resize((512, 512), Image.Resampling.LANCZOS)
res_img_high.save('public/reze_denji_512.png', 'PNG', optimize=True)

print("Generated crisp anti-aliased reze_denji.png with defringed smooth alpha edges!")
