const base = new URL('./protected-v2/', import.meta.url);
let indexRequest;
export function preloadIndex() {
  return indexRequest ||= fetchBytes(new URL('index.bin', base)).catch(error => { indexRequest = null; throw error; });
}
async function fetchBytes(url, signal) {
  try {
    const response = await fetch(url, { signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(120000)]) : AbortSignal.timeout(15000) });
    if (!response.ok) throw Error('network');
    return new Uint8Array(await response.arrayBuffer());
  } catch { throw Error('network'); }
}
async function decrypt(bytes, key) {
  return crypto.subtle.decrypt({name:'AES-GCM',iv:bytes.slice(0,12)},key,bytes.slice(12));
}
export async function unlockGallery(password) {
  const bytes = await preloadIndex();
  const material = await crypto.subtle.importKey('raw',new TextEncoder().encode(password),'PBKDF2',false,['deriveKey']);
  const passwordKey = await crypto.subtle.deriveKey({name:'PBKDF2',salt:bytes.slice(0,16),iterations:600000,hash:'SHA-256'},material,{name:'AES-GCM',length:256},false,['decrypt']);
  let decoded;
  try { decoded = await decrypt(bytes.slice(16),passwordKey); } catch { throw Error('password'); }
  const manifest=JSON.parse(new TextDecoder().decode(decoded));
  const key=await crypto.subtle.importKey('raw',Uint8Array.from(atob(manifest.contentKey),c=>c.charCodeAt(0)),{name:'AES-GCM'},false,['decrypt']);
  let stopped=false,observer;
  const controller=new AbortController(),urls=[],pending=new Map();
  async function ensure(image) {
    if(stopped)throw Error('locked');
    if(image.src)return image.src;
    if(pending.has(image))return pending.get(image);
    const request=(async()=>{
      const bytes=await fetchBytes(new URL(image.asset,base),controller.signal);
      const packed=await decrypt(bytes,key);
      const blob=await new Response(new Blob([packed]).stream().pipeThrough(new DecompressionStream('gzip'))).blob();
      if(stopped)throw Error('locked');
      const url=URL.createObjectURL(new Blob([blob],{type:image.mime}));urls.push(url);image.src=url;return url;
    })().finally(()=>pending.delete(image));
    pending.set(image,request);return request;
  }
  function observe(container) {
    observer?.disconnect();
    const images=manifest.groups.flatMap(g=>g.images);
    let active=0;const queue=[];
    async function load(element){
      const image=images[Number(element.dataset.art)];
      const note=element.parentElement.querySelector('.art-loading');
      if(note){note.disabled=true;note.textContent='Loading original artwork… / 正在加载高清原图';}
      try {element.src=await ensure(image);if(note)note.hidden=true;}
      catch {if(!stopped&&note){note.hidden=false;note.disabled=false;note.textContent='Load failed — retry / 加载失败，点击重试';note.onclick=()=>{queue.push(element);pump()};}}
    }
    function pump(){while(!stopped&&active<2&&queue.length){active++;load(queue.shift()).finally(()=>{active--;pump()})}}
    observer=new IntersectionObserver(entries=>{for(const entry of entries)if(entry.isIntersecting){observer.unobserve(entry.target);queue.push(entry.target)}pump()},{rootMargin:'150px'});
    container.querySelectorAll('[data-art]').forEach(element=>observer.observe(element));
  }
  return {groups:manifest.groups,ensure,observe,dispose(){stopped=true;observer?.disconnect();controller.abort();urls.forEach(URL.revokeObjectURL);}};
}
export const placeholder='data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="16" height="9"><rect width="100%" height="100%" fill="#151515"/></svg>');
