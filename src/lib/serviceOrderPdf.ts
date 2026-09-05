import type { Appointment } from '../types';
import logoUrl from '../assets/logo-maicon.png';

const WARRANTY_WEBAPP_URL = 'https://script.google.com/macros/s/AKfycbzUrNL7UwoNH-3-xWn7ToaU5ENqifhPKh-X28y7EIDfYSTha_B_wrH9kxKE-nhm9fXhUQ/exec';

export function buildWarrantyUrl(serialNumber?: string): string | undefined {
  const serial = String(serialNumber || '').trim();
  if (!serial) return undefined;
  return `${WARRANTY_WEBAPP_URL}?serie=${encodeURIComponent(serial)}`;
}

function formatCurrency(value?: number) {
  if (!value || value <= 0) return 'Não informado';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

function formatDate(value?: string) {
  if (!value) return '';
  const [y, m, d] = value.split('-');
  return y && m && d ? `${d}/${m}/${y}` : value;
}

function paymentLabel(value?: Appointment['paymentMethod']) {
  const labels: Record<string, string> = {
    pix: 'Pix',
    cartao_credito: 'Cartão de crédito',
    cartao_debito: 'Cartão de débito',
    dinheiro: 'Dinheiro',
    faturado: 'Faturado',
    a_combinar: 'A combinar',
  };
  return value ? labels[value] || value : 'Não informado';
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Não foi possível carregar a logo.'));
    img.src = src;
  });
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = String(text || '').split(/\s+/).filter(Boolean);
  if (!words.length) return [''];
  const lines: string[] = [];
  let line = words[0];
  for (let i = 1; i < words.length; i++) {
    const test = `${line} ${words[i]}`;
    if (ctx.measureText(test).width <= maxWidth) line = test;
    else { lines.push(line); line = words[i]; }
  }
  lines.push(line);
  return lines;
}

function drawField(ctx: CanvasRenderingContext2D, label: string, value: string, x: number, y: number, width: number) {
  ctx.fillStyle = '#6b7280';
  ctx.font = '700 22px Arial';
  ctx.fillText(label.toUpperCase(), x, y);
  ctx.fillStyle = '#111827';
  ctx.font = '700 30px Arial';
  const lines = wrapText(ctx, value || '—', width);
  lines.slice(0, 2).forEach((line, i) => ctx.fillText(line, x, y + 36 + i * 34));
}

function dataUrlToBytes(dataUrl: string): Uint8Array {
  const base64 = dataUrl.split(',')[1] || '';
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

function asciiBytes(text: string): Uint8Array {
  return new TextEncoder().encode(text);
}

function concatBytes(parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((sum, p) => sum + p.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const p of parts) { out.set(p, offset); offset += p.length; }
  return out;
}

function jpegToPdf(jpegBytes: Uint8Array, widthPx: number, heightPx: number): Blob {
  const pageW = 595.28;
  const pageH = 841.89;
  const objects: Uint8Array[] = [];
  objects[1] = asciiBytes('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');
  objects[2] = asciiBytes('2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n');
  objects[3] = asciiBytes(`3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageW} ${pageH}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>\nendobj\n`);
  const imgHeader = asciiBytes(`4 0 obj\n<< /Type /XObject /Subtype /Image /Width ${widthPx} /Height ${heightPx} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpegBytes.length} >>\nstream\n`);
  const imgFooter = asciiBytes('\nendstream\nendobj\n');
  objects[4] = concatBytes([imgHeader, jpegBytes, imgFooter]);
  const content = `q\n${pageW} 0 0 ${pageH} 0 0 cm\n/Im0 Do\nQ\n`;
  objects[5] = asciiBytes(`5 0 obj\n<< /Length ${content.length} >>\nstream\n${content}endstream\nendobj\n`);

  const header = asciiBytes('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n');
  const chunks: Uint8Array[] = [header];
  const offsets: number[] = [0];
  let current = header.length;
  for (let i = 1; i <= 5; i++) {
    offsets[i] = current;
    chunks.push(objects[i]);
    current += objects[i].length;
  }
  const xrefOffset = current;
  let xref = 'xref\n0 6\n0000000000 65535 f \n';
  for (let i = 1; i <= 5; i++) xref += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  xref += `trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  chunks.push(asciiBytes(xref));
  return new Blob([concatBytes(chunks)], { type: 'application/pdf' });
}

export async function generateServiceOrderPdfBlob(appointment: Appointment): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = 1240;
  canvas.height = 1754;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas indisponível para gerar a OS.');

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#0b1118';
  ctx.fillRect(0, 0, canvas.width, 265);
  ctx.fillStyle = '#18b9d9';
  ctx.fillRect(0, 260, canvas.width, 8);

  try {
    const logo = await loadImage(logoUrl);
    const maxW = 230, maxH = 190;
    const ratio = Math.min(maxW / logo.width, maxH / logo.height);
    ctx.drawImage(logo, 60, 34, logo.width * ratio, logo.height * ratio);
  } catch {}

  ctx.fillStyle = '#ffffff';
  ctx.font = '800 58px Arial';
  ctx.textAlign = 'right';
  ctx.fillText('ORDEM DE SERVIÇO', 1170, 105);
  ctx.fillStyle = '#18b9d9';
  ctx.font = '800 34px Arial';
  ctx.fillText(appointment.serviceOrder || 'OS NÃO INFORMADA', 1170, 155);
  ctx.fillStyle = '#d1d5db';
  ctx.font = '500 22px Arial';
  ctx.fillText(`Data: ${formatDate(appointment.date)}`, 1170, 203);
  ctx.textAlign = 'left';

  ctx.fillStyle = '#f3f4f6';
  ctx.strokeStyle = '#d1d5db';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.roundRect(55, 310, 1130, 250, 24); ctx.fill(); ctx.stroke();
  drawField(ctx, 'Cliente', appointment.clientName, 85, 355, 510);
  drawField(ctx, 'Contato', appointment.clientPhone || 'Não informado', 650, 355, 450);
  drawField(ctx, 'Endereço', appointment.address || 'Não informado', 85, 455, 650);
  drawField(ctx, 'Bairro / Cidade', [appointment.neighborhood, appointment.city].filter(Boolean).join(' / ') || 'Não informado', 650, 455, 450);

  ctx.fillStyle = '#111827';
  ctx.font = '800 34px Arial';
  ctx.fillText('SERVIÇO EXECUTADO', 60, 625);
  ctx.fillStyle = '#18b9d9'; ctx.fillRect(60, 640, 260, 5);

  const serviceText = appointment.description || appointment.serviceTypeName || 'Serviço não informado';
  ctx.fillStyle = '#111827'; ctx.font = '700 30px Arial';
  const serviceLines = wrapText(ctx, appointment.serviceTypeName || 'Serviço', 1080);
  serviceLines.slice(0, 2).forEach((l, i) => ctx.fillText(l, 65, 700 + i * 38));
  ctx.fillStyle = '#4b5563'; ctx.font = '500 24px Arial';
  const descLines = wrapText(ctx, serviceText, 1080);
  descLines.slice(0, 3).forEach((l, i) => ctx.fillText(l, 65, 785 + i * 32));

  let y = 900;
  if (appointment.equipment?.length) {
    ctx.fillStyle = '#111827'; ctx.font = '800 30px Arial'; ctx.fillText('EQUIPAMENTOS', 60, y); y += 45;
    for (const [index, eq] of appointment.equipment.slice(0, 5).entries()) {
      ctx.fillStyle = index % 2 === 0 ? '#f8fafc' : '#ffffff';
      ctx.fillRect(60, y - 28, 1120, 70);
      ctx.fillStyle = '#111827'; ctx.font = '700 22px Arial';
      ctx.fillText(`${index + 1}. ${eq.serviceTypeName || 'Equipamento'}${eq.model ? ` — ${eq.model}` : ''}`, 78, y);
      ctx.textAlign = 'right'; ctx.fillStyle = '#0e7490'; ctx.font = '800 22px Arial'; ctx.fillText(eq.serialNumber || '', 1160, y); ctx.textAlign = 'left';
      if (eq.productSupplyType) { ctx.fillStyle = '#6b7280'; ctx.font = '500 18px Arial'; ctx.fillText(`${eq.productSupplyType}${eq.productWarranty ? ` | Garantia produto: ${eq.productWarranty}` : ''}`, 78, y + 27); }
      y += 78;
    }
  }

  y = Math.max(y + 25, 1250);
  ctx.fillStyle = '#f3f4f6'; ctx.beginPath(); ctx.roundRect(60, y, 1120, 235, 24); ctx.fill();
  drawField(ctx, 'Garantia da instalação', appointment.installationWarranty || 'Não informada', 90, y + 45, 480);
  drawField(ctx, 'Forma de pagamento', paymentLabel(appointment.paymentMethod), 650, y + 45, 450);
  drawField(ctx, 'Valor do atendimento', formatCurrency(appointment.price), 90, y + 145, 480);
  drawField(ctx, 'Status', 'Concluído', 650, y + 145, 450);

  const footerY = 1645;
  ctx.fillStyle = '#0b1118'; ctx.fillRect(0, footerY, 1240, 109);
  ctx.fillStyle = '#18b9d9'; ctx.font = '800 26px Arial'; ctx.fillText('MAICON AUTOMAÇÃO', 60, footerY + 40);
  ctx.fillStyle = '#ffffff'; ctx.font = '600 20px Arial'; ctx.fillText('(47) 93388-6303  •  Joinville - SC', 60, footerY + 73);
  ctx.textAlign = 'right'; ctx.fillStyle = '#d1d5db'; ctx.font = '500 18px Arial'; ctx.fillText('Instalação de Fechaduras Eletrônicas', 1180, footerY + 58); ctx.textAlign = 'left';

  const jpeg = dataUrlToBytes(canvas.toDataURL('image/jpeg', 0.9));
  return jpegToPdf(jpeg, canvas.width, canvas.height);
}
