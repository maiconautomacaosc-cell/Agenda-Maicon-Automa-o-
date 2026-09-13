import { buildWarrantyUrl } from '../lib/serviceOrderPdf';

export const equipmentQrUrl = (serialNumber: string, size = 900) => {
  const warrantyUrl = buildWarrantyUrl(serialNumber);
  return warrantyUrl
    ? `https://quickchart.io/qr?size=${size}&margin=2&text=${encodeURIComponent(warrantyUrl)}`
    : '';
};

/**
 * Baixa uma imagem pronta para impressão sem alterar o conteúdo do QR.
 * O QR oficial continua sendo gerado exatamente da mesma forma; apenas
 * acrescentamos uma faixa branca abaixo com o MA para identificação na galeria.
 */
export const downloadLabeledEquipmentQr = async (serialNumber: string) => {
  const qrUrl = equipmentQrUrl(serialNumber, 900);
  if (!qrUrl) return;

  try {
    const response = await fetch(qrUrl);
    if (!response.ok) throw new Error('Falha ao obter QR');
    const blob = await response.blob();
    const bitmap = await createImageBitmap(blob);

    const labelHeight = 130;
    const canvas = document.createElement('canvas');
    canvas.width = bitmap.width;
    canvas.height = bitmap.height + labelHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas indisponível');

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bitmap, 0, 0);

    ctx.fillStyle = '#000000';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `700 ${Math.max(48, Math.round(canvas.width * 0.065))}px Arial, sans-serif`;
    ctx.fillText(serialNumber, canvas.width / 2, bitmap.height + labelHeight / 2);

    const outputBlob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
    if (!outputBlob) throw new Error('Falha ao montar imagem');

    const objectUrl = URL.createObjectURL(outputBlob);
    const anchor = document.createElement('a');
    anchor.href = objectUrl;
    anchor.download = `QR-${serialNumber}.png`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
  } catch {
    // Fallback preserva o comportamento antigo caso o navegador bloqueie o canvas/CORS.
    window.open(qrUrl, '_blank', 'noopener,noreferrer');
  }
};

export const openLabeledEquipmentQr = (serialNumber: string) => {
  const qrUrl = equipmentQrUrl(serialNumber, 900);
  if (!qrUrl) return;

  const popup = window.open('', '_blank', 'noopener,noreferrer');
  if (!popup) {
    window.open(qrUrl, '_blank', 'noopener,noreferrer');
    return;
  }

  popup.document.open();
  popup.document.write(`<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>QR ${serialNumber}</title>
  <style>
    *{box-sizing:border-box} body{margin:0;min-height:100vh;display:grid;place-items:center;background:#111;color:#fff;font-family:Arial,sans-serif;padding:20px}
    .card{width:min(92vw,520px);background:#fff;border-radius:18px;padding:20px;box-shadow:0 20px 60px rgba(0,0,0,.45)}
    img{display:block;width:100%;height:auto}.ma{color:#000;text-align:center;font:700 clamp(24px,6vw,42px) Arial,sans-serif;margin-top:10px;letter-spacing:1px}
  </style>
</head>
<body><div class="card"><img src="${qrUrl}" alt="QR Code ${serialNumber}" /><div class="ma">${serialNumber}</div></div></body>
</html>`);
  popup.document.close();
};
