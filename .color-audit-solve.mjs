const hex = h => { h = h.replace('#',''); const n = parseInt(h.length === 3 ? h.split('').map(c => c+c).join('') : h, 16); return [n>>16 & 255, n>>8 & 255, n & 255]; };
const lin = c => c <= 0.04045 ? c/12.92 : Math.pow((c+0.055)/1.055, 2.4);
const L = c => 0.2126*lin(c[0]) + 0.7152*lin(c[1]) + 0.0722*lin(c[2]);
const contrast = (fg, bg) => (Math.max(L(fg),L(bg))+0.05)/(Math.min(L(fg),L(bg))+0.05);

const warn = hex('#E4532A');
const darkWarn = hex('#E2A05D');
const white = [255,255,255];
const darkSurface = [32,35,31];
const inkLight = hex('#0B1220');
const inkDark = hex('#F2EEE4');

// warn text on warn/10 bg: target 4.5:1 => need warn/15 or warn/20
console.log('=== warn light tints on white base ===');
for (const alpha of [.10,.12,.15,.18,.20,.25,.30,.35,.40]) {
  const bg = warn.map(v => white[0]*(1-alpha) + v*alpha);
  const r = contrast(warn, bg);
  console.log(`warn light alpha=${alpha.toFixed(2)} => bg(${bg.map(v=>Math.round(v)).join(',')}) text ratio=${r.toFixed(2)} ${r>=4.5?'PASS':'FAIL'}`);
}
console.log('=== warn dark tints on dark surface ===');
for (const alpha of [.10,.12,.15,.18,.20,.25,.30]) {
  const bg = darkSurface.map((s,i) => s*(1-alpha) + darkWarn[i]*alpha);
  const r = contrast(darkWarn, bg);
  console.log(`warn dark alpha=${alpha.toFixed(2)} => bg(${bg.map(v=>Math.round(v)).join(',')}) text ratio=${r.toFixed(2)} ${r>=4.5?'PASS':'FAIL'}`);
}
console.log('=== warn text on dark bg vs white text on warn fill ===');
const fillWarn10 = warn.map(v => 255*0.9 + v*0.1);
const fillWarn20 = warn.map(v => 255*0.8 + v*0.2);
const fillWarn30 = warn.map(v => 255*0.7 + v*0.3);
const fillWarn40 = warn.map(v => 255*0.6 + v*0.4);
const fillWarn50 = warn.map(v => 255*0.5 + v*0.5);
console.log(`warn text on warn/10 (light): ${contrast(warn, fillWarn10).toFixed(2)}`);
console.log(`warn text on warn/20: ${contrast(warn, fillWarn20).toFixed(2)}`);
console.log(`warn text on warn/30: ${contrast(warn, fillWarn30).toFixed(2)}`);
console.log(`warn text on warn/40: ${contrast(warn, fillWarn40).toFixed(2)}`);
console.log(`warn text on warn/50: ${contrast(warn, fillWarn50).toFixed(2)}`);
console.log('---');
console.log(`white text on warn fill 10%: ${contrast(white, fillWarn10).toFixed(2)}`);
console.log(`white text on warn fill 20%: ${contrast(white, fillWarn20).toFixed(2)}`);
console.log(`white text on warn fill 30%: ${contrast(white, fillWarn30).toFixed(2)}`);
console.log(`white text on warn fill 40%: ${contrast(white, fillWarn40).toFixed(2)}`);
console.log(`white text on warn fill 50%: ${contrast(white, fillWarn50).toFixed(2)}`);
console.log('=== dark warn fill with darkWarn text ===');
const darkFillWarn10 = darkSurface.map((s,i) => s*0.9 + darkWarn[i]*0.1);
const darkFillWarn20 = darkSurface.map((s,i) => s*0.8 + darkWarn[i]*0.2);
const darkFillWarn30 = darkSurface.map((s,i) => s*0.7 + darkWarn[i]*0.3);
console.log(`darkWarn text on dark warn fill 10%: ${contrast(darkWarn, darkFillWarn10).toFixed(2)}`);
console.log(`darkWarn text on dark warn fill 20%: ${contrast(darkWarn, darkFillWarn20).toFixed(2)}`);
console.log(`darkWarn text on dark warn fill 30%: ${contrast(darkWarn, darkFillWarn30).toFixed(2)}`);

// ink text on warn fill variants
console.log('=== ink text on warn fills (light) ===');
console.log(`ink #0B1220 on warn fill 10%: ${contrast(inkLight, fillWarn10).toFixed(2)}`);
console.log(`ink #0B1220 on warn fill 20%: ${contrast(inkLight, fillWarn20).toFixed(2)}`);
console.log(`ink #0B1220 on warn fill 30%: ${contrast(inkLight, fillWarn30).toFixed(2)}`);
console.log(`ink #0B1220 on warn fill 40%: ${contrast(inkLight, fillWarn40).toFixed(2)}`);
console.log(`ink #0B1220 on warn fill 50%: ${contrast(inkLight, fillWarn50).toFixed(2)}`);

// ink text on dark warn fills
console.log('=== ink-dark text on dark warn fills ===');
const inkDarkFill10 = contrast(inkDark, darkFillWarn10);
const inkDarkFill20 = contrast(inkDark, darkFillWarn20);
const inkDarkFill30 = contrast(inkDark, darkFillWarn30);
console.log(`ink-dark #F2EEE4 on dark warn fill 10%: ${inkDarkFill10.toFixed(2)}`);
console.log(`ink-dark #F2EEE4 on dark warn fill 20%: ${inkDarkFill20.toFixed(2)}`);
console.log(`ink-dark #F2EEE4 on dark warn fill 30%: ${inkDarkFill30.toFixed(2)}`);
