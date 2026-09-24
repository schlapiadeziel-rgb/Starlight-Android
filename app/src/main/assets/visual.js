/* Sky colors are illustrative; visibility is a visual cue, not a forecast of observing conditions. */
(function(root){
 const clamp=x=>Math.max(0,Math.min(1,x));
 const paletteStops=[
  [-18,['#010306','#03070d','#09121c']],
  [-8,['#0b1830','#24335a','#51466e']],
  [0,['#193c67','#4e688a','#a57975']],
  [8,['#26659f','#4c8dbb','#9dc1d7']]
 ];
 function blend(a,b,t){let out='#';for(let i=1;i<7;i+=2){const x=parseInt(a.slice(i,i+2),16),y=parseInt(b.slice(i,i+2),16);out+=Math.round(x+(y-x)*t).toString(16).padStart(2,'0');}return out;}
 function palette(sunAlt,red=false){
  if(red)return paletteStops[0][1];
  let i=0;while(i<paletteStops.length-2&&sunAlt>paletteStops[i+1][0])i++;
  const [low,a]=paletteStops[i],[high,b]=paletteStops[i+1],t=clamp((sunAlt-low)/(high-low));
  return a.map((color,j)=>blend(color,b[j],t));
 }
 function visibility(mag,sunAlt){const daylight=clamp((sunAlt+16)/22),limit=7-11*daylight;return clamp((limit-mag+.8)/1.8);}
 const colors=['#b6d7ff','#dce9ff','#f7f5ec','#ffd9b2','#ffab8d'];
 function colorIndex(ci){if(!Number.isFinite(ci))return 2;return ci<.05?0:ci<.5?1:ci<1?2:ci<1.5?3:4;}
 const api={palette,visibility,colors,colorIndex};root.SkyVisual=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
