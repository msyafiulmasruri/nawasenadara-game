from PIL import Image
import numpy as np

img_path = r'C:\Users\ulila\.gemini\antigravity-ide\brain\2ae08da9-7035-4aca-8aad-dff997367937\phone_sprite_clean_1790318573273.jpg'
out_path = r'c:\laragon\www\nawasenadara-game\frontend\public\sprites\phone-ep3.png'

img = Image.open(img_path).convert('RGB')
arr = np.array(img)

# Exact phone bounds in 1024x1024:
# Top bezel: y=250
# Bottom bezel: y=706
# Left bezel: x=362
# Right bezel: x=652
phone_crop = arr[248:707, 360:654]

r = phone_crop[:, :, 0].astype(float)
g = phone_crop[:, :, 1].astype(float)
b = phone_crop[:, :, 2].astype(float)

# Background magenta detection
is_magenta = (r > 120) & (b > 120) & (g < 90) & (r - g > 40) & (b - g > 40)

# Any brownish wooden table remnants at bottom-left/bottom-right corners:
# Wood has high red, medium green, low blue (r > 120, g > 70, b < 70)
is_wood = (r > 110) & (g > 60) & (b < 80) & (r > b + 40)

is_bg = is_magenta | is_wood

# Alpha
alpha = np.where(is_bg, 0, 255).astype(np.uint8)

rgba = np.zeros((phone_crop.shape[0], phone_crop.shape[1], 4), dtype=np.uint8)
rgba[:, :, :3] = phone_crop
rgba[:, :, 3] = alpha

sprite = Image.fromarray(rgba, mode='RGBA')
bbox = sprite.getbbox()
if bbox:
    sprite = sprite.crop(bbox)

# Add a subtle glowing outline effect (2px cyan/gold aura) for game interactivity!
w, h = sprite.size
target_h = 120
target_w = int(target_h * (w / h))

final_sprite = sprite.resize((target_w, target_h), Image.Resampling.NEAREST)

# Optional: Add 4px padding so Phaser can scale and tween smoothly without clipping
pad = 6
canvas = Image.new('RGBA', (final_sprite.width + pad*2, final_sprite.height + pad*2), (0,0,0,0))
canvas.paste(final_sprite, (pad, pad))

canvas.save(out_path)
print(f"Perfect phone sprite saved: {canvas.size} at {out_path}")
