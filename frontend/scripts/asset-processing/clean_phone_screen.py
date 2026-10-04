from PIL import Image, ImageDraw
import numpy as np

img = Image.open(r'c:\laragon\www\nawasenadara-game\frontend\public\scenes\ep3-phone-pov.png').convert('RGBA')
w, h = img.size
arr = np.array(img)

# Let's inspect the phone bezel and screen boundary
# Left bezel: x ~ 268
# Right bezel: x ~ 508
# Top bezel: y ~ 38
# Bottom bezel: y ~ 490

# Let's see what is screen and what is bezel/hands.
# Hands are outside x < 268 or x > 508, except thumb tips.
# The thumb tips are:
# Left thumb tip enters screen around x: 268..310, y: 340..430
# Right thumb tip enters screen around x: 465..508, y: 340..430

# Let's create a clean screen canvas:
# We will draw a sleek modern chat UI inside the screen area:
# Screen background: #0f1422 (sleek dark mode)
# Header: y=38..85 (#161e33)
# Status bar: y=38..55 (clock 21:15, wifi, battery)
# Chat header: y=55..85 (<  Avatar  @bayang_kelabu91  Online)
# Bottom input bar: y=450..485 (input box "+  Tulis pesan...  ▶")

# First, let's identify the exact phone bezel contour:
# Bezel is black/dark grey (RGB < 35)
# Outside bezel is hands/transparent

# Let's make a copy to edit
clean_img = img.copy()
draw = ImageDraw.Draw(clean_img)

# Screen rectangle (rounded slightly)
screen_x1 = 269
screen_y1 = 40
screen_x2 = 508
screen_y2 = 486

# Let's extract thumb mask so we don't erase the thumbs:
# Thumbs are skin color:
r = arr[:, :, 0].astype(int)
g = arr[:, :, 1].astype(int)
b = arr[:, :, 2].astype(int)
# True thumb skin:
# Thumbs are connected from outside the phone (x < 269 or x > 508)
is_skin = (r > 160) & (g > 110) & (b > 85) & (r > b + 35) & (r > g)

# Inside the screen, only keep skin that is connected to the thumbs on the sides
thumb_mask = np.zeros((h, w), dtype=bool)
# Left thumb enters from x < 269 in y: 330..440
thumb_mask[325:445, 268:320] = is_skin[325:445, 268:320]
# Right thumb enters from x > 508 in y: 325..445
thumb_mask[325:445, 460:509] = is_skin[325:445, 460:509]

# Fill the screen with dark sleek background, preserving thumbs
for y in range(screen_y1, screen_y2 + 1):
    for x in range(screen_x1, screen_x2 + 1):
        if not thumb_mask[y, x]:
            # Sleek dark background
            arr[y, x] = [17, 23, 38, 255]

# Redraw on image
clean_img = Image.fromarray(arr)
draw = ImageDraw.Draw(clean_img)

# 1. Status Bar (y: 40..58)
# Notch / Camera cutout at top center: x: 375..402, y: 40..47
draw.rectangle([screen_x1, screen_y1, screen_x2, screen_y1 + 18], fill=(13, 17, 28, 255))
# Clock
# (We can draw retro pixel style status)
# Top notch pill
draw.rounded_rectangle([372, 40, 405, 46], radius=3, fill=(5, 7, 12, 255))

# 2. Chat Header Bar (y: 58..92)
draw.rectangle([screen_x1, screen_y1 + 18, screen_x2, screen_y1 + 52], fill=(22, 29, 48, 255))
draw.line([screen_x1, screen_y1 + 52, screen_x2, screen_y1 + 52], fill=(35, 45, 70, 255), width=1)

# Back arrow '<'
draw.polygon([(276, 75), (282, 69), (282, 81)], fill=(180, 195, 220, 255))

# Avatar circle (grey silhouette)
draw.ellipse([288, 62, 312, 86], fill=(45, 55, 78, 255), outline=(70, 85, 115, 255))
# Head & body silhouette
draw.ellipse([296, 66, 304, 74], fill=(140, 155, 180, 255))
draw.ellipse([292, 76, 308, 90], fill=(140, 155, 180, 255))

# 3. Bottom Input Bar (y: 450..486)
draw.rectangle([screen_x1, 452, screen_x2, screen_y2], fill=(15, 20, 33, 255))
draw.line([screen_x1, 452, screen_x2, 452], fill=(30, 40, 60, 255), width=1)
# Input pill
draw.rounded_rectangle([screen_x1 + 10, 458, screen_x2 - 10, 480], radius=11, fill=(26, 34, 54, 255), outline=(45, 58, 88, 255))
# Plus icon '+'
draw.line([screen_x1 + 22, 465, screen_x1 + 22, 473], fill=(120, 140, 175, 255), width=2)
draw.line([screen_x1 + 18, 469, screen_x1 + 26, 469], fill=(120, 140, 175, 255), width=2)

clean_img.save(r'c:\laragon\www\nawasenadara-game\frontend\public\scenes\ep3-phone-pov.png')
print("Cleaned phone POV with chat screen frame successfully!")
