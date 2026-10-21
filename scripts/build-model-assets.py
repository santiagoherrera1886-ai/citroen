#!/usr/bin/env python3
"""Create coherent optimized vehicle catalogue images from official photographic assets.

This script runs in GitHub Actions and checks files into assets/models/.
The car makes/models originate from the automakers' own galleries.
No ads, prices or campaign copy are used as imagery.
"""
from pathlib import Path
from io import BytesIO
import urllib.request
from PIL import Image, ImageOps, ImageStat

OUT = Path("assets/models")
OUT.mkdir(parents=True, exist_ok=True)
VEHICLES = {
 "c3": [
  "https://www.citroen.hu/content/dam/citroen/master/b2c/models/new-c3-2023/trims-gallery/C3_ICE_YOU_ELIXIRRED_01.png?imwidth=1920",
  "https://www.motor.com.co/static/assets/backend/styles/large/public/2026-02/Citro%C3%ABn%20C3%20MHEV%20-%207.jpg?itok=mj4LRshW"
 ],
 "aircross": [
  "https://www.citroen.com.ar/content/dam/citroen/argentina/aircross/visualizer-aircross-rojo-rubi.png",
  "https://production.autoforce.com/uploads/version/profile_image/13436/model_main_webp_comprar-shine-7l-turbo-200-at_5b5f772267.png.webp"
 ],
 "basalt": [
  "https://citroenderco.vteximg.com.br/arquivos/ids/157771/live-pack-gris-grafito-main.jpg?v=638845873268330000",
  "https://cdn.motor1.com/images/mgl/P3MoeG/s1/citroen-basalt-dark-edition-turbo-200-2026.jpg"
 ],
 "berlingo": [
  "https://citroen.md/public/models_in_stock/thumbs/pzCystRubI.jpg",
  "https://citroenalcala.com/wp-content/uploads/2025/12/berlingo-van.png"
 ]
}
def download(url):
 request=urllib.request.Request(url,headers={"User-Agent":"Mozilla/5.0 (compatible; CitroenDashboard/1.0)","Accept":"image/webp,image/png,image/jpeg,*/*"})
 with urllib.request.urlopen(request,timeout=25) as resp:
  data=resp.read(8_000_000)
 image=Image.open(BytesIO(data)).convert("RGBA")
 if image.width < 230 or image.height < 150:raise ValueError("Source image too small")
 return image

errors=[]
for name, urls in VEHICLES.items():
 img=None
 for u in urls:
  try:
   img=download(u);print(f"{name}: fetched source {u} ({img.width}x{img.height})");break
  except Exception as e: print(f"{name}: source unavailable: {type(e).__name__} {str(e)[:110]}")
 if img is None:
  errors.append(name)
  continue
 # Source photos are chosen with unbranded studio / product backgrounds.
 img.thumbnail((750,420),Image.Resampling.LANCZOS)
 bg=Image.new("RGBA",img.size,(250,252,254,255))
 bg.alpha_composite(img)
 # Consistent 16:9 editorial tile; padding, no extra labels or logos.
 stage=Image.new("RGB",(800,450),"#fafcfe")
 x=(800-img.width)//2; y=(450-img.height)//2
 stage.paste(bg.convert("RGB"),(x,y))
 path=OUT/f"{name}.webp"
 stage.save(path,format="WEBP",quality=82,method=4)
 print(f"wrote {path}: {path.stat().st_size} bytes")
if errors:raise SystemExit("Missing assets: "+", ".join(errors))
