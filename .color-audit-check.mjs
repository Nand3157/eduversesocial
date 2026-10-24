// better-colors audit: measure declared pairs. Temp script — safe to delete.
const hex = (h) => { h = h.replace('#',''); if (h.length===3) h = h.split('').map(c=>c+c).join(''); return [0,2,4].map(i=>parseInt(h.slice(i,i+2),16)); };
const srgb = (c) => { c/=255; return c<=0.04045 ? c/12.92 : Math.pow((c+0.055)/1.055,2.4); };
const lum = (rgb) => 0.2126*srgb(rgb[0])+0.7152*srgb(rgb[1])+0.0722*srgb(rgb[2]);
const contrast = (a,b) => { const l1=lum(a), l2=lum(b); const [hi,lo]=l1>l2?[l1,l2]:[l2,l1]; return (hi+0.05)/(lo+0.05); };
const mix = (fg, bg, alpha) => fg.map((c,i)=>alpha*c+(1-alpha)*bg[i]);
const fmt = (rgb) => '#'+rgb.map(c=>Math.round(c).toString(16).padStart(2,'0')).join('');
function oklch(rgb) {
  const [r,g,b] = rgb.map(srgb);
  const l = Math.cbrt(0.4122214708*r+0.5363325363*g+0.0514459929*b);
  const m = Math.cbrt(0.2119034982*r+0.6806995451*g+0.1073969566*b);
  const s = Math.cbrt(0.0883024619*r+0.2817188376*g+0.6299787005*b);
  const L = 0.2104542553*l+0.7936177850*m-0.0040720468*s;
  const a = 1.9779984951*l-2.4285922050*m+0.4505937099*s;
  const bb = 0.0259040371*l+0.7827717662*m-0.8086757660*s;
  const C = Math.hypot(a,bb); let H = Math.atan2(bb,a)*180/Math.PI; if (H<0) H+=360;
  return {L, C, H};
}
const T = {
  light: { bg:'#EEF3F9', surface:'#FFFFFF', surfaceMuted:'#E5EDF6', ink:'#0B1220', inkSoft:'#1F2A44', muted:'#516174', faint:'#64748B', line:'#D6DFE8', accent:'#A84D1D', accentStrong:'#853B17', accentFg:'#FFFAF2', ok:'#177A4D', warn:'#E4532A', bad:'#C0392B' },
  dark:  { bg:'#171916', surface:'#20231F', surfaceMuted:'#292C27', ink:'#F2EEE4', inkSoft:'#D8D2C6', muted:'#B7B4A9', faint:'#92958A', line:'#45483F', accent:'#D87843', accentStrong:'#EA9360', accentFg:'#151816', ok:'#9BC39C', warn:'#E2A05D', bad:'#E07A68' },
};
const textPairs = [
  ['ink','bg',4.5],['ink','surface',4.5],['inkSoft','surface',4.5],
  ['muted','bg',4.5],['muted','surface',4.5],['muted','surfaceMuted',4.5],
  ['faint','bg',4.5],['faint','surface',4.5],['faint','surfaceMuted',4.5],
  ['accent','bg',4.5],['accent','surface',4.5],['accentStrong','surface',4.5],
  ['accentFg','accent',4.5], // filled button label
  ['ok','surface',4.5],['warn','surface',4.5],['bad','surface',4.5],
  ['ok','bg',4.5],['warn','bg',4.5],['bad','bg',4.5],
  ['line','bg',3.0],['line','surface',3.0], // non-text control/border
];
for (const theme of ['light','dark']) {
  console.log(`\n=== ${theme.toUpperCase()} ===`);
  for (const [fg,bg,req] of textPairs) {
    const r = contrast(hex(T[theme][fg]), hex(T[theme][bg]));
    const pass = r>=req ? 'PASS' : 'FAIL';
    console.log(`${pass} ${fg} on ${bg}: ${r.toFixed(2)}:1 (req ${req})`);
  }
}
// Alpha text composites (rendered results)
console.log('\n=== ALPHA COMPOSITES ===');
const boardDark = hex('#151816'); // always-dark footer/signal board
const alphaChecks = [
  ['text-white/60', [255,255,255], 0.6, boardDark, 'footer links', 4.5],
  ['text-white/40', [255,255,255], 0.4, boardDark, 'footer labels 11px', 4.5],
  ['text-white/40 (11px col head)', [255,255,255], 0.4, boardDark, 'footer col head', 4.5],
];
for (const [name, fg, a, bg, label, req] of alphaChecks) {
  const comp = mix(fg,bg,a); const r = contrast(comp,bg);
  console.log(`${r>=req?'PASS':'FAIL'} ${name} over ${fmt(bg)} (${label}): ${r.toFixed(2)}:1 (req ${req}) rendered=${fmt(comp)}`);
}
// signal board internal pairs (hardcoded palette)
const board = { bg:'#151816', text:'#f3efe5', muted:'#a8aa9e', thead:'#7d8278', metric:'#8d9187', signal:'#d87843', ok:'#8bb695', border:'#3c403a', row:'#343933', fb:'#8db6d7' };
console.log('\n=== SIGNAL BOARD (hardcoded dark panel, measured in both themes) ===');
for (const [fg, req, label] of [['text',4.5,'body'],['muted',4.5,'meta'],['thead',4.5,'col head 9.3px'],['metric',4.5,'metric label 8.3px'],['signal',4.5,'accent text'],['ok',4.5,'status'],['fb',4.5,'platform chip'],['border',3.0,'border non-text']]) {
  const r = contrast(hex(board[fg]), hex(board.bg));
  console.log(`${r>=req?'PASS':'FAIL'} ${fg} on board bg: ${r.toFixed(2)}:1 (req ${req}) — ${label}`);
}
// toast/modal alpha-over-blend approximations (light + dark)
console.log('\n=== STATUS TEXT ON TINTED BACKGROUND (bg-success/10 etc.) ===');
for (const theme of ['light','dark']) {
  const pageBg = hex(T[theme].bg), surf = hex(T[theme].surface);
  const toastBg = mix(hex(T[theme].ok), pageBg, 0.10);
  const r1 = contrast(hex(T[theme].ok), toastBg);
  console.log(`${r1>=4.5?'PASS':'FAIL'} ${theme}: success on success/10-over-bg: ${r1.toFixed(2)}:1 rendered=${fmt(toastBg)}`);
  const warn80 = mix(hex(T[theme].warn), surf, 0.8);
  const r2 = contrast(warn80, surf);
  console.log(`${r2>=4.5?'PASS':'FAIL'} ${theme}: warning/80 on surface: ${r2.toFixed(2)}:1 rendered=${fmt(warn80)}`);
}
// OKLCH hue separation: accent vs status hues
console.log('\n=== OKLCH HUES (accent vs status) ===');
for (const theme of ['light','dark']) {
  const a = oklch(hex(T[theme].accent));
  console.log(`${theme}: accent L=${a.L.toFixed(3)} C=${a.C.toFixed(3)} H=${a.H.toFixed(1)}°`);
  for (const k of ['ok','warn','bad','accentStrong']) {
    const c = oklch(hex(T[theme][k]));
    let dh = Math.abs(c.H - a.H); if (dh>180) dh = 360-dh;
    console.log(`  ${k}: L=${c.L.toFixed(3)} C=${c.C.toFixed(3)} H=${c.H.toFixed(1)}°  Δhue=${dh.toFixed(1)}° ${dh<15?'⚠ <15°':''}`);
  }
}
// Status chips: text at full and /80 over tinted /10 backgrounds (rendered)
console.log('\n=== STATUS CHIP TEXT ON /10 TINT (rendered) ===');
for (const theme of ['light','dark']) {
  const card = hex(T[theme].surface);        // tailwind `card` = --surface
  const canvas = hex(T[theme].bg);
  for (const [k, label] of [['ok','success'],['warn','warning'],['bad','danger']]) {
    for (const [bgName, bgVar] of [['card',card],['canvas',canvas]]) {
      const tint = mix(hex(T[theme][k]), bgVar, 0.10);
      const r = contrast(hex(T[theme][k]), tint);
      console.log(`${r>=4.5?'PASS':'FAIL'} ${theme}: ${label} text on ${label}/10 over ${bgName}: ${r.toFixed(2)}:1 rendered=${fmt(tint)}`);
    }
    // /80 opacity text over its own /10 tint on card (meta-connect modal case)
    const tint = mix(hex(T[theme][k]), card, 0.10);
    const fg80 = mix(hex(T[theme][k]), tint, 0.80);
    const r = contrast(fg80, tint);
    console.log(`${r>=4.5?'PASS':'FAIL'} ${theme}: ${label}/80 text on ${label}/10 over card: ${r.toFixed(2)}:1 rendered fg=${fmt(fg80)}`);
  }
}
// Active chat row: text-background/60 on bg-ink (light: bg dark; dark: bg light)
console.log('\n=== ACTIVE CHAT ROW (text-background/60 on bg-ink) ===');
for (const theme of ['light','dark']) {
  const inkBg = hex(T[theme].ink === '#0B1220' ? '#0B1220' : '#F2EEE4');
  const comp = mix(hex(T[theme].bg), inkBg, 0.60);
  const r = contrast(comp, inkBg);
  console.log(`${r>=4.5?'PASS':'FAIL'} ${theme}: background/60 on ink: ${r.toFixed(2)}:1 rendered=${fmt(comp)}`);
  const title = contrast(inkBg === hex(T[theme].ink) ? hex(T[theme].bg) : hex(T[theme].bg), inkBg);
  console.log(`  (title: background solid on ink: ${title.toFixed(2)}:1)`);
}
// Dismiss icons: success/70 & danger/70 (non-text UI, req 3.0)
console.log('\n=== DISMISS ICONS (/70 on own /10 tint, req 3.0) ===');
for (const theme of ['light','dark']) {
  const canvas = hex(T[theme].bg);
  for (const [k, label] of [['ok','success'],['bad','danger']]) {
    const tint = mix(hex(T[theme][k]), canvas, 0.10);
    const fg70 = mix(hex(T[theme][k]), tint, 0.70);
    const r = contrast(fg70, tint);
    console.log(`${r>=3?'PASS':'FAIL'} ${theme}: ${label}/70 icon on ${label}/10 over canvas: ${r.toFixed(2)}:1`);
  }
}
// AI studio hardcoded light palette (globals.css html:not(.dark) block)
console.log('\n=== AI STUDIO LIGHT (hardcoded literals) ===');
const aiLight = [['#17212a','#e8eef4','body',4.5],['#3f5262','#e8eef4','description',4.5],['#516174','#e8eef4','window brand small',4.5],['#873d1a','#e8eef4','link/kicker',4.5],['#637280','#f7f8f9','input text',4.5],['#344451','#ffffff','floating note',4.5],['#286847','#eff6f0','evidence text',4.5],['#256342','#deeee2','evidence check',4.5],['#7b8992','#e8eef4','footnote mark',3.0],['#d0dae3','#e8eef4','window border',3.0]];
for (const [fg,bg,label,req] of aiLight) {
  const r = contrast(hex(fg), hex(bg));
  console.log(`${r>=req?'PASS':'FAIL'} ${label}: ${fg} on ${bg}: ${r.toFixed(2)}:1 (req ${req})`);
}
// AI studio dark base (line 1085)
const rAiDark = contrast(hex('#f2eee4'), hex('#171a19'));
console.log(`${rAiDark>=4.5?'PASS':'FAIL'} dark base body: #f2eee4 on #171a19: ${rAiDark.toFixed(2)}:1`);
// Gamut check: declared hex are all sRGB by definition; check accent chroma sanity
