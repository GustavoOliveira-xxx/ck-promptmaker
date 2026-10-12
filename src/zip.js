const enc=new TextEncoder();
const table=Uint32Array.from({length:256},(_,i)=>{let c=i;for(let j=0;j<8;j++)c=(c&1)?0xedb88320^(c>>>1):c>>>1;return c>>>0;});
export function crc32(bytes){let c=0xffffffff;for(const b of bytes)c=table[(c^b)&255]^(c>>>8);return (c^0xffffffff)>>>0;}
const record=(size)=>{const data=new Uint8Array(size);const v=new DataView(data.buffer);return {data,u16:(o,n)=>v.setUint16(o,n,true),u32:(o,n)=>v.setUint32(o,n,true)};};
export async function createZip(entries) {
 const chunks=[],central=[];let offset=0,centralSize=0;
 for(const {name,blob} of entries){
 const filename=enc.encode(name);const data=new Uint8Array(await blob.arrayBuffer());const crc=crc32(data);
 const h=record(30);h.u32(0,0x04034b50);h.u16(4,20);h.u16(6,0x800);h.u16(12,33);h.u32(14,crc);h.u32(18,data.length);h.u32(22,data.length);h.u16(26,filename.length);
 chunks.push(h.data,filename,data);
 const c=record(46);c.u32(0,0x02014b50);c.u16(4,20);c.u16(6,20);c.u16(8,0x800);c.u16(14,33);c.u32(16,crc);c.u32(20,data.length);c.u32(24,data.length);c.u16(28,filename.length);c.u32(42,offset);
 central.push(c.data,filename);centralSize+=46+filename.length;offset+=30+filename.length+data.length;
 await new Promise(resolve=>setTimeout(resolve,0));
 }
 const e=record(22);e.u32(0,0x06054b50);e.u16(8,entries.length);e.u16(10,entries.length);e.u32(12,centralSize);e.u32(16,offset);
 return new Blob([...chunks,...central,e.data],{type:'application/zip'});
}

