/* Cached catalog names and exact, format-tolerant catalog identifiers. */
(function(root){
 'use strict';
 function normalize(text){return String(text||'').normalize('NFKC').trim().toLowerCase().replace(/\s+/g,' ');}
 function create(catalog){
  const identifiers=new Map(),entries=catalog.map(object=>{
   const keys=[];
   if(object.deepSky){keys.push(object.designation);if(object.ngc)keys.push('NGC'+object.ngc);}
   else if(!object.constellation&&object.hip)keys.push('HIP'+object.hip);
   for(const key of keys){const id=normalize(key).replace(/\s/g,'');if(!identifiers.has(id))identifiers.set(id,[]);identifiers.get(id).push(object);}
   const names=[object.name,object.en,object.abbr].filter(Boolean).map(normalize);
   return {object,names,text:normalize([...names,object.con,...keys].filter(Boolean).join(' '))};
  });
  return {query(text){
   const q=normalize(text);if(!q)return [];
   const id=q.match(/^(hip|ngc|m)[\s-]*0*(\d+)$/);
   if(id)return (identifiers.get(id[1]+String(Number(id[2])))||[]).slice();
   // Stable relevance buckets keep exact names above the displayed-result cap,
   // without sorting the catalog or re-normalizing every field on each input.
   const matches=[[],[],[],[]];
   for(const entry of entries){
    if(!entry.text.includes(q))continue;
    const rank=entry.names.includes(q)?0:entry.names.some(name=>name.startsWith(q))?1:entry.names.some(name=>name.includes(q))?2:3;
    matches[rank].push(entry.object);
   }
   return matches.flat();
  }};
 }
 const api={create};root.SkySearch=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
