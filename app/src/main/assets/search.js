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
   return {object,text:normalize([object.name,object.en,object.con,object.abbr,...keys].filter(Boolean).join(' '))};
  });
  return {query(text){
   const q=normalize(text);if(!q)return [];
   const id=q.match(/^(hip|ngc|m)[\s-]*0*(\d+)$/);
   if(id)return (identifiers.get(id[1]+String(Number(id[2])))||[]).slice();
   return entries.filter(entry=>entry.text.includes(q)).map(entry=>entry.object);
  }};
 }
 const api={create};root.SkySearch=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
