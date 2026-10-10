from PIL import Image
import numpy as np

img_path = r'C:\Users\ulila\.gemini\antigravity-ide\brain\2ae08da9-7035-4aca-8aad-dff997367937\ep3_hands_phone_chroma_1790739873804.jpg'
out_path = r'c:\laragon\www\nawasenadara-game\frontend\public\scenes\ep3-phone-pov.png'

img = Image.open(img_path).convert('RGB')
arr = np.array(img)

r = arr[:, :, 0].astype(int)
g = arr[:, :, 1].astype(int)
b = arr[:, :, 2].astype(int)

# Detect magenta chroma key:
# R is high, G is low, B is high, and R & B are much higher than G
is_magenta = (r > 130) & (b > 130) & (g < 100) & (r - g > 50) & (b - g > 50)

# Create RGBA
rgba = np.zeros((arr.shape[0], arr.shape[1], 4), dtype=np.uint8)
rgba[:, :, :3] = arr
rgba[:, :, 3] = np.where(is_magenta, 0, 255)

sprite = Image.fromarray(rgba, mode='RGBA')

# Crop to the actual bounding box of hands & phone
bbox = sprite.getbbox()
if bbox:
    sprite = sprite.crop(bbox)

# Clean any tiny fringe on edges
s_arr = np.array(sprite)
sr = s_arr[:, :, 0].astype(int)
sg = s_arr[:, :, 1].astype(int)
sb = s_arr[:, :, 2].astype(int)
sa = s_arr[:, :, 3]

# Any semi-magenta edge pixels
is_edge_magenta = (sr > 120) & (sb > 120) & (sg < 100) & (sr - sg > 40)
sa[is_edge_magenta] = 0

cleaned = Image.fromarray(s_arr)

# Save high-res transparent PNG
cleaned.save(out_path)
print(f"Phone POV extracted: {cleaned.size} saved to {out_path}")
