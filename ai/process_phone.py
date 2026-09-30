from PIL import Image, ImageFilter
import numpy as np

img_path = r'C:\Users\ulila\.gemini\antigravity-ide\brain\2ae08da9-7035-4aca-8aad-dff997367937\phone_pixel_art_1790316257711.jpg'
out_path = r'c:\laragon\www\nawasenadara-game\frontend\public\sprites\phone-ep3.png'

img = Image.open(img_path).convert('RGBA')

# Crop bounding box around phone and its glow:
box = (105, 145, 895, 815)
cropped = img.crop(box)
w, h = cropped.size

arr = np.array(cropped)
r = arr[:, :, 0].astype(float)
g = arr[:, :, 1].astype(float)
b = arr[:, :, 2].astype(float)

# Glow & phone detection:
# Background is dark floor tiles: low brightness (< 70) and near-zero saturation (abs(r-g) < 15 and abs(g-b) < 15)
diff_rg = np.abs(r - g)
diff_gb = np.abs(g - b)
diff_rb = np.abs(r - b)
color_variance = diff_rg + diff_gb + diff_rb
brightness = (r + g + b) / 3.0

# Pixels that belong to phone or glow:
# 1. Vibrant colored glow: cyan, red, magenta, green chat bubble
# 2. Bright screen text/buttons (brightness > 85)
# 3. Inside the phone perimeter
is_colored = color_variance > 25
is_bright = brightness > 75
is_cyan = (g > 65) & (b > 75) & (b > r + 15)
is_red = (r > 70) & (r > g + 20)

fg_mask_raw = (is_colored | is_bright | is_cyan | is_red).astype(np.uint8) * 255

# Use PIL filters for morphological dilation and hole filling:
mask_img = Image.fromarray(fg_mask_raw, mode='L')
# Dilate by applying MaxFilter
mask_dilated = mask_img.filter(ImageFilter.MaxFilter(15))
# Close holes by MinFilter then MaxFilter
mask_closed = mask_dilated.filter(ImageFilter.MinFilter(7)).filter(ImageFilter.MaxFilter(9))
# Smooth edges with GaussianBlur
mask_smooth = mask_closed.filter(ImageFilter.GaussianBlur(3))

# Combine mask
final_alpha = np.array(mask_smooth)

# Where original was dark neutral background, zero out alpha
is_neutral_bg = (color_variance < 18) & (brightness < 65)
final_alpha[is_neutral_bg & (final_alpha < 240)] = 0

arr[:, :, 3] = final_alpha

result = Image.fromarray(arr)
bbox = result.getbbox()
if bbox:
    result = result.crop(bbox)

pad = 12
padded = Image.new('RGBA', (result.width + pad * 2, result.height + pad * 2), (0, 0, 0, 0))
padded.paste(result, (pad, pad))

final_sprite = padded.resize((160, 160), Image.Resampling.LANCZOS)
final_sprite.save(out_path)
print("Finished! Saved clean sprite to", out_path)
