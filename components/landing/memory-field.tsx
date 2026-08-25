"use client";

import { useEffect, useRef, useState } from "react";

/**
 * MemoryField v2 — BOLD overdrive
 * Inspired by Linear #08090a purple glow + Stripe gradient mesh + Primer warm optimism
 * Measured: Linear 3D WebGL memorable (palette #08090a, glow), Stripe mesh #ff9018/#ff78d8, Primer pill 1440px large-image hero
 * Now: warm terracotta mesh that you CAN'T miss — faster, denser, click ripples, scroll hue shift
 */
export function MemoryField({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [fallback, setFallback] = useState(false);
  const rafRef = useRef<number>(0);
  const mouseRef = useRef({ x: 0.5, y: 0.5, tx: 0.5, ty: 0.5, px: 0.5, py: 0.5 });
  const scrollRef = useRef(0);
  const clickRef = useRef({ x: -10, y: -10, t: -1000 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (typeof window === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setFallback(true);
      return;
    }

    const gl = (canvas.getContext("webgl2", { alpha: true, antialias: true }) as WebGL2RenderingContext | null)
      || (canvas.getContext("webgl", { alpha: true, antialias: true }) as WebGLRenderingContext | null);
    if (!gl) { setFallback(true); return; }
    const isWebGL2 = (gl as any).createVertexArray !== undefined;

    const vert = isWebGL2
      ? `#version 300 es
         precision highp float; in vec2 position; void main(){ gl_Position = vec4(position,0.0,1.0); }`
      : `attribute vec2 position; void main(){ gl_Position = vec4(position,0.0,1.0); }`;

    // BOLD: larger blobs, higher contrast, 2 extra orbiting blobs, click ripple, scroll hue, warn emphasis
    const frag = isWebGL2
      ? `#version 300 es
         precision highp float;
         uniform vec2 iResolution; uniform float iTime; uniform vec2 iMouse; uniform float iScroll; uniform vec3 iClick;
         out vec4 outColor;
         void main(){
           vec2 R = iResolution; vec2 FC = gl_FragCoord.xy;
           vec2 uv = FC / R; vec2 p = uv*2.0 - 1.0; p.x *= R.x / R.y;
           vec2 m = iMouse*2.0 - 1.0; m.x *= R.x / R.y;
           float t = iTime * 0.38; // faster per Stripe's lively mesh
           // 5 blobs for denser mesh (Linear's memorable density)
           vec2 p1 = vec2(sin(t*0.9)*0.62, cos(t*0.68)*0.41);
           vec2 p2 = vec2(cos(t*0.62)*0.58, sin(t*0.95)*0.55);
           vec2 p3 = vec2(sin(t*1.15)*0.35, cos(t*0.52)*0.38);
           vec2 p4 = vec2(cos(t*0.42 + 1.3)*0.48, sin(t*0.78)*0.28);
           vec2 p5 = vec2(sin(t*0.33 - 0.7)*0.30, cos(t*1.05)*0.34);
           float d1=length(p-p1), d2=length(p-p2), d3=length(p-p3), d4=length(p-p4), d5=length(p-p5);
           float dm=length(p - m*0.55);
           float b1=exp(-d1*1.65), b2=exp(-d2*1.85), b3=exp(-d3*2.2), b4=exp(-d4*2.0), b5=exp(-d5*2.8);
           float bm=exp(-dm*2.6) * 0.85; // cursor magnet stronger
           float field = b1*1.15 + b2*1.05 + b3*0.85 + b4*0.65 + b5*0.5 + bm;
           field += 0.18 * sin(p.x*2.2 + t*1.4) * cos(p.y*2.0 - t*1.1);
           field += 0.10 * sin(dot(p, vec2(3.7,5.9)) + t*1.2);
           // click ripple
           vec2 clickUV = iClick.xy; float clickT = iClick.z;
           float age = iTime - clickT;
           if(age >= 0.0 && age < 1.6){
             float cr = age * 1.8;
             float cd = length(p - (clickUV*2.0-1.0)*vec2(R.x/R.y,1.0));
             float ring = exp(-pow(cd - cr*0.45, 2.0)*22.0) * (1.0 - age/1.6);
             field += ring * 0.95;
           }
           // Stripe-inspired mesh palette but warm: accent, warn, ok
           vec3 cAccent = vec3(0.784,0.333,0.169); // #c8552b
           vec3 cWarn   = vec3(0.718,0.475,0.122); // #b7791f -> saturated like #ff9018
           vec3 cOk     = vec3(0.243,0.490,0.353); // #3e7d5a ~ #00a878 primer
           vec3 cBg     = vec3(0.980,0.969,0.941); // #faf7f0 primer-like light per primer tokens
           vec3 cInk    = vec3(0.133,0.106,0.075);
           float ff = smoothstep(0.14, 0.92, field);
           // three-stop mesh: bg -> accent (dominant) -> warn highlight -> ok whisper
           vec3 col = mix(cBg, cAccent, ff*0.88);
           col = mix(col, cWarn, smoothstep(0.62,0.96, field)*0.38);
           col = mix(col, cOk, smoothstep(0.72,0.98, field)*0.18);
           // hue shift with scroll (Linear's glass shifts with context)
           float hue = iScroll * 0.22;
           col = mix(col, vec3(col.b, col.r, col.g), hue*0.12);
           // depth
           float vign = smoothstep(1.45, 0.28, length(p*0.62));
           col = mix(col, cInk, vign*0.06);
           col *= 0.96 + 0.08*sin(t*0.6);
           // BOLD alpha — Stripe-level opacity, can't miss
           float alpha = clamp(ff*0.82 + 0.14, 0.0, 0.88) * (0.92 - length(p)*0.18);
           alpha *= smoothstep(1.65, 0.45, length(p));
           // keep text readable: fade top where headline sits slightly? no, keep punch
           outColor = vec4(col, alpha);
         }`
      : `precision highp float;
         uniform vec2 iResolution; uniform float iTime; uniform vec2 iMouse; uniform float iScroll; uniform vec3 iClick;
         void main(){
           vec2 R=iResolution; vec2 p=(gl_FragCoord.xy/R)*2.0-1.0; p.x*=R.x/R.y;
           vec2 m=iMouse*2.0-1.0; m.x*=R.x/R.y; float t=iTime*0.38;
           vec2 p1=vec2(sin(t*0.9)*0.62, cos(t*0.68)*0.41); vec2 p2=vec2(cos(t*0.62)*0.58, sin(t*0.95)*0.55);
           float d1=length(p-p1), d2=length(p-p2), dm=length(p - m*0.55);
           float b1=exp(-d1*1.65), b2=exp(-d2*1.85), bm=exp(-dm*2.6)*0.85;
           float field=b1*1.15+b2*1.05+bm; field+=0.18*sin(p.x*2.2+t*1.4)*cos(p.y*2.0-t*1.1);
           vec3 cA=vec3(0.784,0.333,0.169), cW=vec3(0.718,0.475,0.122), cBg=vec3(0.980,0.969,0.941);
           float ff=smoothstep(0.14,0.92,field); vec3 col=mix(cBg,cA,ff*0.88); col=mix(col,cW,smoothstep(0.62,0.96,field)*0.38);
           float alpha=clamp(ff*0.82+0.14,0.0,0.88)*(0.92-length(p)*0.18);
           gl_FragColor=vec4(col, alpha);
         }`;

    const c = (t:number,s:string)=>{ const sh=gl.createShader(t)!; gl.shaderSource(sh,s); gl.compileShader(sh); if(!gl.getShaderParameter(sh,gl.COMPILE_STATUS)){ console.warn(gl.getShaderInfoLog(sh)); return null; } return sh; };
    const vs=c(gl.VERTEX_SHADER, vert), fs_=c(gl.FRAGMENT_SHADER, frag);
    if(!vs||!fs_){ setFallback(true); return; }
    const prog=gl.createProgram()!; gl.attachShader(prog,vs); gl.attachShader(prog,fs_); gl.linkProgram(prog);
    if(!gl.getProgramParameter(prog,gl.LINK_STATUS)){ console.warn(gl.getProgramInfoLog(prog)); setFallback(true); return; }
    gl.useProgram(prog);
    const buf=gl.createBuffer()!; gl.bindBuffer(gl.ARRAY_BUFFER,buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 3,-1, -1,3]), gl.STATIC_DRAW);
    const pos=gl.getAttribLocation(prog,"position"); gl.enableVertexAttribArray(pos); gl.vertexAttribPointer(pos,2,gl.FLOAT,false,0,0);
    const uR=gl.getUniformLocation(prog,"iResolution"), uT=gl.getUniformLocation(prog,"iTime"), uM=gl.getUniformLocation(prog,"iMouse"), uS=gl.getUniformLocation(prog,"iScroll"), uC=gl.getUniformLocation(prog,"iClick");

    let w=0,h=0, dpr=Math.min(window.devicePixelRatio||1,2);
    const resize=()=>{ const r=canvas.getBoundingClientRect(); w=Math.max(1,Math.floor(r.width*dpr)); h=Math.max(1,Math.floor(r.height*dpr)); canvas.width=w; canvas.height=h; gl.viewport(0,0,w,h); };
    resize(); const ro=new ResizeObserver(resize); ro.observe(canvas);

    const onMove=(e:PointerEvent)=>{ if(e.pointerType==="touch") return; const r=canvas.getBoundingClientRect(); mouseRef.current.tx=(e.clientX-r.left)/r.width; mouseRef.current.ty=1-(e.clientY-r.top)/r.height; };
    const onClick=(e:MouseEvent)=>{ const r=canvas.getBoundingClientRect(); const x=(e.clientX-r.left)/r.width; const y=1-(e.clientY-r.top)/r.height; clickRef.current={x,y,t:performance.now()/1000}; if(navigator.vibrate) try{navigator.vibrate(12)}catch{} };
    window.addEventListener("pointermove", onMove, {passive:true}); window.addEventListener("click", onClick, {passive:true});
    const onScroll=()=>{ scrollRef.current=Math.min(1, Math.max(0, window.scrollY/(window.innerHeight*1.05))); };
    window.addEventListener("scroll", onScroll, {passive:true}); onScroll();

    let visible=true,inView=true;
    const io=new IntersectionObserver(([e])=>{ inView=e.isIntersecting; if(inView&&visible) loop(); },{threshold:0}); io.observe(canvas);
    const onVis=()=>{ visible=document.visibilityState==="visible"; if(visible&&inView) loop(); };
    document.addEventListener("visibilitychange", onVis);

    let start=performance.now();
    const tick=()=>{
      if(!visible||!inView){ rafRef.current=0; return; }
      const t=(performance.now()-start)/1000;
      mouseRef.current.x+=(mouseRef.current.tx-mouseRef.current.x)*0.08;
      mouseRef.current.y+=(mouseRef.current.ty-mouseRef.current.y)*0.08;
      gl.uniform2f(uR,w,h); gl.uniform1f(uT,t); gl.uniform2f(uM,mouseRef.current.x,mouseRef.current.y); gl.uniform1f(uS,scrollRef.current); gl.uniform3f(uC,clickRef.current.x,clickRef.current.y,clickRef.current.t);
      gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      gl.drawArrays(gl.TRIANGLES,0,3);
      loop();
    };
    const loop=()=>{ if(rafRef.current) cancelAnimationFrame(rafRef.current); rafRef.current=requestAnimationFrame(tick); };
    loop();

    return ()=>{
      cancelAnimationFrame(rafRef.current); ro.disconnect(); io.disconnect();
      window.removeEventListener("pointermove", onMove); window.removeEventListener("click", onClick);
      window.removeEventListener("scroll", onScroll); document.removeEventListener("visibilitychange", onVis);
      gl.deleteProgram(prog); gl.deleteShader(vs); gl.deleteShader(fs_); gl.deleteBuffer(buf);
    };
  }, []);

  if (fallback) {
    return <div aria-hidden className={className} style={{ background: "radial-gradient(720px circle at 50% 14%, color-mix(in srgb, var(--accent) 18%, transparent), transparent 66%), radial-gradient(560px circle at 85% 82%, color-mix(in srgb, var(--warn) 16%, transparent), transparent 62%), var(--background)" }} />;
  }
  return <canvas ref={canvasRef} aria-hidden className={className} style={{ display:"block", width:"100%", height:"100%" }} />;
}
