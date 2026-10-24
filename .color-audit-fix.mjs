const hex = h => { h = h.replace('#',''); const n = parseInt(h.length === 3 ? h.split('').map(c => c+c).join('') : h, 16); return [n>>16 & 255, n>>8 & 255, n & 255]; };
const lin = c => c <= 0.04045 ? c/12.92 : Math.pow((c+0.055)/1.055, 2.4);
const L = c => 0.2126*lin(c[0]) + 0.7152*lin(c[1]) + 0.0722*lin(c[2]);
const contrast = (fg, bg) => (Math.max(L(fg),L(bg))+0.05)/(Math.min(L(fg),L(bg))+0.05);

// landing input border light: #D6DFE8 on white card
const naiveBorder = hex('#D6DFE8');
const whiteCard = [255,255,255];
console.log('input border naive #D6DFE8 on white:', contrast(naiveBorder, whiteCard).toFixed(2));

// Target: #B6C2D4
const targetBorder = hex('#B6C2D4');
console.log('input border target #B6C2D4 on white:', contrast(targetBorder, whiteCard).toFixed(2));

// dark landing input border: #45483F on #20231F
const darkBorder = hex('#45483F');
const darkSurface = [32,35,31];
console.log('dark input border #45483F on #20231F:', contrast(darkBorder, darkSurface).toFixed(2));

// warn chip light: bg-warning/10 = rgba(228,83,42,0.1) over white
const warn = hex('#E4532A');
const warnChipBg = warn.map(v => 255*0.9 + v*0.1);
console.log('warn text on warn/10 bg (light):', contrast(warn, warnChipBg).toFixed(2));
// warn chip dark: bg-warning/10 over dark surface
const darkWarnChipBg = darkSurface.map((s,i) => s*0.9 + hex('#E2A05D')[i]*0.1);
console.log('warn text on warn/10 bg (dark):', contrast(hex('#E2A05D'), darkWarnChipBg).toFixed(2));

// danger chip light
const bad = hex('#C0392B');
const badChipBg = bad.map(v => 255*0.9 + v*0.1);
console.log('danger text on danger/10 bg (light):', contrast(bad, badChipBg).toFixed(2));

// ok chip light
const ok = hex('#177A4D');
const okChipBg = ok.map(v => 255*0.9 + v*0.1);
console.log('ok text on ok/10 bg (light):', contrast(ok, okChipBg).toFixed(2));

// warn text on white (plain warn token)
console.log('warn #E4532A on white:', contrast(warn, whiteCard).toFixed(2));
console.log('warn #E2A05D on dark surface:', contrast(hex('#E2A05D'), darkSurface).toFixed(2));

// auth warning button: text-warning on bg-warning/10
console.log('auth warn button text on bg-warning/10:', contrast(warn, warnChipBg).toFixed(2));

// footer white/40 on surface-ink dark (#151816)
const footer40 = [255,255,255].map(v => v*0.4);
const surfaceInkDark = hex('#151816');
console.log('footer white/40 on #151816:', contrast(footer40, surfaceInkDark).toFixed(2));
