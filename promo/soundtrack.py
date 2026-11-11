"""Synth a 15 s hype beat whose hits land on the ad's cuts. Usage: python3 soundtrack.py cuts.json out.wav"""
import json, sys, wave, numpy as np
SR=44100; D=15.0; n=int(SR*D); t=np.arange(n)/SR; out=np.zeros(n)
cuts=json.load(open(sys.argv[1])); rng=np.random.default_rng(7)
def add(sig,at,g=1.0):
    i=int(at*SR); j=min(n,i+len(sig))
    if 0<=i<n: out[i:j]+=g*sig[:j-i]
def kick(l=.35):
    tt=np.arange(int(SR*l))/SR; f=45+110*np.exp(-tt*28)
    return np.sin(2*np.pi*np.cumsum(f)/SR)*np.exp(-tt*9)
def snap(l=.18):
    tt=np.arange(int(SR*l))/SR; return rng.uniform(-1,1,len(tt))*np.exp(-tt*30)
def hat(l=.05):
    tt=np.arange(int(SR*l))/SR; x=rng.uniform(-1,1,len(tt)); x=np.diff(x,prepend=0); return x*np.exp(-tt*80)
# steady pulse 128 bpm under everything, dropping out for the "Ready?" intro
beat=60/128
for k in np.arange(0.55,14.2,beat): add(kick(),k,.55); add(hat(),k+beat/2,.18)
# hits on every cut
for c in cuts: add(kick(),c,.9); add(snap(),c,.35)
# rapid ticks for the tool roll (8.6 to 10.7 s)
for k in np.arange(8.6,10.7,.14): add(hat(),k,.35)
# bass that follows the pulse
bass=np.sin(2*np.pi*55*t)*0.25*((t%beat)<beat*.8)*(t>0.55)*(t<14.2)
out+=bass*np.clip((t-.55)*4,0,1)
# riser into the end card (13.0 s)
r=(t>11.3)&(t<13.0); ph=np.clip((t-11.3)/1.7,0,1)
out+=r*np.sin(2*np.pi*np.cumsum(200+1800*ph**2)/SR)*.12*ph
out+=r*rng.uniform(-1,1,n)*.08*ph
add(kick(.9),13.0,1.2); add(snap(.6),13.0,.5)
# fade out
out*=np.clip((D-t)/1.2,0,1)
out/=np.max(np.abs(out))*1.12
st=np.stack([out,np.roll(out,40)],1)
with wave.open(sys.argv[2],'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((st*32767).astype('<i2').tobytes())
