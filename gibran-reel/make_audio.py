import numpy as np
from scipy.io import wavfile
sr=44100; dur=43.0; n=int(sr*dur)
t=np.arange(n)/sr
bpm=100; beat=60/bpm
out=np.zeros(n)
def env(x,a=0.005,d=0.25): return np.minimum(x/a,1)*np.exp(-x/d)
# soft pad chord progression Am - F - C - G, 4 beats*... each 2 bars
chords=[[220,261.63,329.63],[174.61,220,261.63],[261.63,329.63,392],[196,246.94,293.66]]
bar=beat*4
for i in range(int(dur/bar)+1):
    ch=chords[(i//2)%4]; s=int(i*bar*sr); e=min(n,int((i+1)*bar*sr))
    x=np.arange(e-s)/sr
    g=np.minimum(x/0.4,1)*np.minimum((bar-x)/0.4,1)
    for f in ch: out[s:e]+=0.05*np.sin(2*np.pi*f*x)*g+0.02*np.sin(2*np.pi*f*2*x)*g
# kick on beats, hat on offbeats (starts after 4s)
for b in range(int(dur/beat)):
    ts=b*beat
    if ts<3.5: continue
    s=int(ts*sr); L=int(0.3*sr); x=np.arange(min(L,n-s))/sr
    out[s:s+len(x)]+=0.35*np.sin(2*np.pi*(50+90*np.exp(-x*30))*x)*np.exp(-x*12)
    h=int((ts+beat/2)*sr); L=int(0.05*sr); x=np.arange(min(L,n-h))/sr
    if len(x): out[h:h+len(x)]+=0.05*np.random.randn(len(x))*np.exp(-x*80)
# whoosh + hit at scene cuts
for c in [4,10,16,21,27,33,38]:
    s=int((c-0.35)*sr); L=int(0.45*sr); x=np.arange(L)/sr
    nz=np.random.randn(L)*np.linspace(0,1,L)**2*0.12
    out[s:s+L]+=nz
    h=int(c*sr); L=int(0.6*sr); x=np.arange(L)/sr
    out[h:h+L]+=0.3*np.sin(2*np.pi*(70+60*np.exp(-x*20))*x)*np.exp(-x*7)
# fade
out*=np.minimum(t/0.5,1)*np.minimum((dur-t)/1.5,1)
out=out/np.max(np.abs(out))*0.8
wavfile.write("public/audio.wav",sr,(out*32767).astype(np.int16))
