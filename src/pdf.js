const encoder = new TextEncoder();
export function jpegsToPdf(pages, {width=595}={}) {
 if(!pages.length) throw new Error('Nenhuma página para gerar o PDF.');
 const chunks = [], offsets = [];
 let size = 0;
 const write = part => { const bytes = typeof part==='string' ? encoder.encode(part) : part; chunks.push(bytes); size += bytes.length; };
 const object = (n, body, stream) => {
  offsets[n] = size;
  write(n+' 0 obj\n'+body);
  if(stream) { write('\nstream\n'); write(stream); write('\nendstream'); }
  write('\nendobj\n');
 };
 write('%PDF-1.4\n%\xC7\xEC\x8F\xA2\n');
 const kids = pages.map((_,i)=>(3+i*3)+' 0 R').join(' ');
 object(1, '<< /Type /Catalog /Pages 2 0 R >>');
 object(2, '<< /Type /Pages /Kids ['+kids+'] /Count '+pages.length+' >>');
 pages.forEach((page,i)=>{
  const n = 3+i*3, w = width, h = Math.round(width*page.height/page.width*100)/100;
  const draw = 'q '+w+' 0 0 '+h+' 0 0 cm /Im0 Do Q';
  object(n, '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 '+w+' '+h+'] /Resources << /XObject << /Im0 '+(n+1)+' 0 R >> >> /Contents '+(n+2)+' 0 R >>');
  object(n+1, '<< /Type /XObject /Subtype /Image /Width '+page.width+' /Height '+page.height+' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length '+page.bytes.length+' >>', page.bytes);
  object(n+2, '<< /Length '+draw.length+' >>', encoder.encode(draw));
 });
 const count = 3+pages.length*3;
 const xref = size;
 write('xref\n0 '+count+'\n0000000000 65535 f \n'+offsets.slice(1).map(o=>String(o).padStart(10,'0')+' 00000 n \n').join(''));
 write('trailer\n<< /Size '+count+' /Root 1 0 R >>\nstartxref\n'+xref+'\n%%EOF\n');
 return new Blob(chunks, {type:'application/pdf'});
}
