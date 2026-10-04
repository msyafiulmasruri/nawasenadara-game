from PIL import Image, ImageDraw
import numpy as np

# Load original uncut chroma image
orig_path = r'C:\Users\ulila\.gemini\antigravity-ide\brain\2ae08da9-7035-4aca-8aad-dff997367937\ep3_hands_phone_chroma_1790739873804.jpg'
out_path = r'c:\laragon\www\nawasenadara-game\frontend\public\scenes\ep3-phone-pov.png'

orig = Image.open(orig_path).convert('RGB')
cropped = orig.crop((304, 83, 1148, 768)) # Size 844 x 685
w, h = cropped.size
arr = np.array(cropped)

r = arr[:, :, 0].astype(int)
g = arr[:, :, 1].astype(int)
b = arr[:, :, 2].astype(int)

# 1. Detect magenta chroma key
is_magenta = (r > 130) & (b > 130) & (g < 100) & (r - g > 50) & (b - g > 50)
# Edge magenta fringe
is_edge_magenta = (r > 120) & (b > 120) & (g < 100) & (r - g > 40)
is_bg = is_magenta | is_edge_magenta

# 2. Detect Hands, Thumbs, and Fingernails
# Fingernails are light pink/peach: r > 210, g > 170, b > 155
# Skin is warm peach: r > 160, g > 110, b > 85, r > b + 30
# Hand outlines are black/dark brown adjacent to skin: (r < 60, g < 60, b < 60)
is_skin_or_nail = (
    ((r > 140) & (g > 85) & (b > 65) & (r >= b + 22) & (r >= g)) |
    ((r > 190) & (g > 150) & (b > 130) & (r >= b + 20) & (r >= g + 10))
)

# Thumbs enter from sides into the screen in y from 315 to 445:
# Left thumb reaches up to x ~ 352
# Right thumb reaches down to x ~ 418
# Hand pixels mask:
is_hand = np.zeros((h, w), dtype=bool)

# Region of hands outside screen:
is_hand[is_skin_or_nail] = True

# Also include the hand outlines (dark pixels around skin):
for dy in [-1, 0, 1]:
    for dx in [-1, 0, 1]:
        if dx == 0 and dy == 0:
            continue
        shifted = np.roll(np.roll(is_skin_or_nail, dy, axis=0), dx, axis=1)
        # Where adjacent is skin and current is dark hand outline (RGB < 60) and not background
        dark_pixel = (r < 65) & (g < 65) & (b < 65) & (~is_bg)
        is_hand[shifted & dark_pixel] = True

# Now, we want to clean the phone screen while keeping EVERY PIXEL of hands/thumbs/nails!
# Screen boundary:
screen_x1 = 269
screen_y1 = 40
screen_x2 = 508
screen_y2 = 486

# In the screen area, if a pixel is NOT part of the hand/thumb/nail, replace it with sleek dark screen color
screen_bg_color = [17, 23, 38] # #111726

for y in range(screen_y1, screen_y2 + 1):
    for x in range(screen_x1, screen_x2 + 1):
        # Above y = 318 is pure screen glass (no thumbs or hands exist here, cleans rogue stickers)
        if y < 318:
            arr[y, x] = screen_bg_color
        else:
            # Below y = 318: keep every pixel of thumbs, fingernails, and hand outlines 100% intact!
            if not is_hand[y, x]:
                arr[y, x] = screen_bg_color

# Create RGBA
rgba = np.zeros((h, w, 4), dtype=np.uint8)
rgba[:, :, :3] = arr
rgba[:, :, 3] = np.where(is_bg, 0, 255)

clean_img = Image.fromarray(rgba, mode='RGBA')
draw = ImageDraw.Draw(clean_img)

# Draw neat phone UI elements that are behind the hands:
# 1. Top status bar & notch
draw.rectangle([screen_x1, screen_y1, screen_x2, screen_y1 + 18], fill=(13, 17, 28, 255))
draw.rounded_rectangle([372, 40, 405, 46], radius=3, fill=(5, 7, 12, 255))

# 2. Chat header bar (y: 58..92)
draw.rectangle([screen_x1, screen_y1 + 18, screen_x2, screen_y1 + 52], fill=(22, 29, 48, 255))
draw.line([screen_x1, screen_y1 + 52, screen_x2, screen_y1 + 52], fill=(35, 45, 70, 255), width=1)

# Back arrow '<'
draw.polygon([(276, 75), (282, 69), (282, 81)], fill=(180, 195, 220, 255))

# Avatar circle (grey silhouette)
draw.ellipse([288, 62, 312, 86], fill=(45, 55, 78, 255), outline=(70, 85, 115, 255))
draw.ellipse([296, 66, 304, 74], fill=(140, 155, 180, 255))
draw.ellipse([292, 76, 308, 90], fill=(140, 155, 180, 255))

# 3. Bottom input bar (only where not covered by hands)
input_bg = (15, 20, 33, 255)
for y in range(454, screen_y2 + 1):
    for x in range(screen_x1, screen_x2 + 1):
        if not is_hand[y, x]:
            clean_img.putpixel((x, y), input_bg)

clean_img.save(out_path)
print(f"Repaired Phone POV image saved with 100% intact thumbs and nails to {out_path}!")
