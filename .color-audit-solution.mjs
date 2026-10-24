const hex = h => { h = h.replace('#',''); const n = parseInt(h.length === 3 ? h.split('').map(c => c+c).join('') : h, 16); return [n>>16 & 255, n>>8 & 255, n & 255]; };
const lin = c => c <= 0.04045 ? c/12.92 : Math.pow((c+0.055)/1.055, 2.4);
const L = c => 0.2126*lin(c[0]) + 0.7152*lin(c[1]) + 0.0722*lin(c[2]);
const contrast = (fg, bg) => (Math.max(L(fg),L(bg))+0.05)/(Math.min(L(fg),L(bg))+0.05);

const warn = hex('#E4532A');
const darkWarn = hex('#E2A05D');
const white = [255,255,255];
const darkSurface = [32,35,31];

// Proposed fix values
const bad = hex('#C0392B');
const darkBad = hex('#E07A68');

// warn light chip: bg-warning/15 text-warning
const warnChip15 = warn.map(v => white[0]*0.85 + v*0.15);
console.log('warn light chip bg-warning/15 text-warning:');
console.log(`  bg = rgba(${warn.map(v=>Math.round(v)).join(',')},0.15) over white`);
console.log(`  contrast = ${contrast(warn, warnChip15).toFixed(2)}`);

// warn dark chip: bg-warning/10 text-warning
const darkWarnChip10 = darkSurface.map((s,i) => s*0.9 + darkWarn[i]*0.1);
console.log('warn dark chip bg-warning/10 text-warning:');
console.log(`  bg = rgba(${darkWarn.map(v=>Math.round(v)).join(',')},0.10) over #20231F`);
console.log(`  contrast = ${contrast(darkWarn, darkWarnChip10).toFixed(2)}`);

// input border light: #B6C2D4
const borderLight = hex('#B6C2D4');
console.log('landing input border light #B6C2D4 on white card:');
console.log(`  contrast = ${contrast(borderLight, white).toFixed(2)}`);

// danger chip: bg-danger/15 text-danger (light)
const dangerousChip15 = bad.map(v => white[0]*0.85 + v*0.15);
console.log('danger light chip bg-danger/15 text-danger:');
console.log(`  contrast = ${contrast(bad, dangerousChip15).toFixed(2)}`);

// dark danger chip: bg-danger/10 text-danger
const darkDangerChip10 = darkSurface.map((s,i) => s*0.9 + darkBad[i]*0.1);
console.log('danger dark chip bg-danger/10 text-danger:');
console.log(`  contrast = ${contrast(darkBad, darkDangerChip10).toFixed(2)}`);

// plain warn text on white (badge.tsx primary/warning outline variants)
console.log('warn #E4532A on plain white:');
console.log(`  contrast = ${contrast(warn, white).toFixed(2)}`);

// plain danger text on white
console.log('danger #C0392B on plain white:');
console.log(`  contrast = ${contrast(bad, white).toFixed(2)}`);

// plain ok text on white
const ok = hex('#177A4D');
console.log('ok #177A4D on plain white:');
console.log(`  contrast = ${contrast(ok, white).toFixed(2)}`);

// dark ok chip: bg-ok/10 text-ok
const darkOk = hex('#9BC39C');
const darkOkChip10 = darkSurface.map((s,i) => s*0.9 + darkOk[i]*0.1);
console.log('dark ok chip bg-ok/10 text-ok:');
console.log(`  contrast = ${contrast(darkOk, darkOkChip10).toFixed(2)}`);

// text-danger in reviews (landing-page): bg-danger/10 text-danger on landing-paper white
console.log('reviews danger: bg-danger/10 text-danger on white:');
console.log(`  contrast = ${contrast(bad, dangerousChip15).toFixed(2)}`);

// auth warn button: text-warning on bg-warning/15
console.log('auth warn button text-warning on bg-warning/15:');
console.log(`  contrast = ${contrast(warn, warnChip15).toFixed(2)}`);

// auth confirm: text-warning on bg-warning/10 (unchanged? check)
console.log('auth confirm text-warning on bg-warning/10:');
console.log(`  contrast = ${contrast(warn, warn.map(v => white[0]*0.9+v*0.1)).toFixed(2)}`);

// dark theme: badge warning variant on dark surface?
console.log('dark warn chip on dark surface (bg-warning/10):');
console.log(`  contrast = ${contrast(darkWarn, darkWarnChip10).toFixed(2)}`);

// check info/status badges with bg-success/10 text-success on light white
console.log('success chip on light: bg-success/10 text-success:');
console.log(`  contrast = ${contrast(ok, ok.map(v => white[0]*0.9+v*0.1)).toFixed(2)}`);

// text-warning standalone (e.g. caption length warning in meta-publisher-modal)
console.log('text-warning standalone on white:');
console.log(`  contrast = ${contrast(warn, white).toFixed(2)}`);

// text-danger standalone on white
console.log('text-danger standalone on white:');
console.log(`  contrast = ${contrast(bad, white).toFixed(2)}`);
