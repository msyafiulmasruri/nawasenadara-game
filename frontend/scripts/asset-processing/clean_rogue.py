from PIL import Image
import numpy as np

img = Image.open(r'c:\laragon\www\nawasenadara-game\frontend\public\sprites\phone-ep3.png').convert('RGBA')
arr = np.array(img)

# Clear purple cast at the top left corner:
for y in range(8):
    for x in range(12):
        if arr[y, x, 0] > 100 and arr[y, x, 2] > 100:
            arr[y, x, 3] = 0

# And any stray pixel at bottom left edge:
arr[-1, 0, 3] = 0
arr[-2, 0, 3] = 0

clean_img = Image.fromarray(arr)
bbox = clean_img.getbbox()
if bbox:
    clean_img = clean_img.crop(bbox)

pad = 2
final_sprite = Image.new('RGBA', (clean_img.width + pad*2, clean_img.height + pad*2), (0,0,0,0))
final_sprite.paste(clean_img, (pad, pad))
final_sprite.save(r'c:\laragon\www\nawasenadara-game\frontend\public\sprites\phone-ep3.png')
print("Final clean phone sprite saved successfully!")
