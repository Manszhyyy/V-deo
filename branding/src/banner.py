from PIL import Image, ImageDraw, ImageFilter, ImageChops
B='brand/'; BG=(20,26,51); W,H=2560,1440
cv=Image.new('RGB',(W,H),BG)
glow=Image.new('RGB',(W,H),(0,0,0)); g=ImageDraw.Draw(glow)
g.ellipse((100,300,1300,1200),fill=(70,18,28)); g.ellipse((1300,250,2560,1200),fill=(10,30,90))
glow=glow.filter(ImageFilter.GaussianBlur(220)); cv=ImageChops.add(cv,glow)
def mask(im,fade=0):
    import numpy as np
    a=np.asarray(im).astype(int); d=np.abs(a-np.array(BG)).sum(2)
    m=np.clip((d-18)*12,0,255).astype('uint8')
    if fade:
        h=m.shape[0]; r=np.linspace(1,0,fade)
        m[h-fade:]=(m[h-fade:]*r[:,None]).astype('uint8')
    return Image.fromarray(m).filter(ImageFilter.GaussianBlur(1))
def put(src,box,hh,cx,cy,fade=0):
    im=Image.open(B+src).convert('RGB').crop(box); w=round(im.width*hh/im.height)
    f=round(fade*hh/im.height) if fade else 0; im=im.resize((w,hh),Image.LANCZOS)
    cv.paste(im,(cx-w//2,cy-hh//2),mask(im,f))
put('t_1.7.jpg',(300,900,780,1880),700,330,760)
put('t_2.7.jpg',(280,560,1040,1520),420,770,730,fade=260)
put('t_4.7.jpg',(0,540,1080,1290),508,1280,666)
put('t_3.7.jpg',(60,480,1020,1440),400,1795,730)
put('t_5.7.jpg',(60,480,1020,1440),560,2240,740)
cv.save('/home/user/V-deo/branding/banner_youtube_2d.png'); cv.resize((1280,720)).save(B+'ban_prev.jpg')
sv=Image.new('RGB',(1280,720)); sv.paste(cv.resize((1280,720)))
from PIL import ImageDraw as D; d=D.Draw(sv); d.rectangle((253,254,1026,465),outline=(0,255,0),width=2); sv.save(B+'ban_safe.jpg')
im=Image.open(B+'t_.7.jpg').crop((0,400,1080,1480)).resize((1024,1024),Image.LANCZOS); im.save('/home/user/V-deo/branding/avatar_2d.png')
print('ok')
