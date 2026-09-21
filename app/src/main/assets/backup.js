(function(root){
 function encode(notes){return JSON.stringify({app:'Starlight',version:1,exportedAt:new Date().toISOString(),notes},null,2);}
 function merge(text,current,allowed){
  if(typeof text!=='string'||text.length>2000000)throw Error('备份文件过大');
  const doc=JSON.parse(text);
  if(!doc||doc.app!=='Starlight'||doc.version!==1||!doc.notes||typeof doc.notes!=='object'||Array.isArray(doc.notes))throw Error('不是有效的星野观测备份');
  const entries=Object.entries(doc.notes);if(entries.length>16000)throw Error('记录数量过多');
  let added=0,kept=0,skipped=0;const notes=Object.assign(Object.create(null),current);
  for(const [id,note] of entries){
   if(!allowed.has(id)||typeof note!=='string'||note.length>2000){skipped++;continue;}
   if(Object.prototype.hasOwnProperty.call(notes,id)){kept++;continue;}
   notes[id]=note;added++;
  }
  return {notes,added,kept,skipped};
 }
 const api={encode,merge};root.SkyBackup=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
