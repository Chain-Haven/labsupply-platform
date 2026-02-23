import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import QRCode from 'qrcode';

export interface PackingSlipData {
    orderId: string;
    wooOrderId: string;
    wooOrderNumber?: string;
    merchantName: string;
    shippingAddress: {
        first_name?: string;
        last_name?: string;
        company?: string;
        address_1: string;
        address_2?: string;
        city: string;
        state: string;
        postcode: string;
        country: string;
    };
    items: Array<{
        sku: string;
        name: string;
        qty: number;
        lot_code?: string;
    }>;
    trackingNumber?: string;
    carrier?: string;
    shipDate: string;
    coaBaseUrl?: string;
}

export async function generatePackingSlipPdf(data: PackingSlipData): Promise<Uint8Array> {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([612, 792]); // US Letter
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const { width, height } = page.getSize();
    const margin = 50;
    let y = height - margin;

    const drawText = (text: string, x: number, yPos: number, options?: { font?: typeof font; size?: number; color?: ReturnType<typeof rgb> }) => {
        page.drawText(text, {
            x,
            y: yPos,
            size: options?.size || 10,
            font: options?.font || font,
            color: options?.color || rgb(0.2, 0.2, 0.2),
        });
    };

    // Header
    drawText('PACKING SLIP', margin, y, { font: boldFont, size: 22, color: rgb(0.3, 0.2, 0.5) });
    y -= 15;

    page.drawLine({
        start: { x: margin, y },
        end: { x: width - margin, y },
        thickness: 1,
        color: rgb(0.8, 0.8, 0.8),
    });
    y -= 25;

    // Order info
    drawText(`Order: #${data.wooOrderNumber || data.wooOrderId}`, margin, y, { font: boldFont, size: 11 });
    drawText(`Date: ${data.shipDate}`, width - margin - 150, y, { size: 10 });
    y -= 16;
    drawText(`Supplier Order ID: ${data.orderId}`, margin, y, { size: 9, color: rgb(0.5, 0.5, 0.5) });
    y -= 16;
    if (data.trackingNumber) {
        drawText(`Tracking: ${data.trackingNumber} (${data.carrier || 'N/A'})`, margin, y, { size: 10 });
        y -= 16;
    }
    y -= 10;

    // Ship To
    drawText('SHIP TO:', margin, y, { font: boldFont, size: 10, color: rgb(0.4, 0.4, 0.4) });
    y -= 16;
    const addr = data.shippingAddress;
    const nameStr = [addr.first_name, addr.last_name].filter(Boolean).join(' ');
    if (nameStr) { drawText(nameStr, margin, y); y -= 14; }
    if (addr.company) { drawText(addr.company, margin, y); y -= 14; }
    drawText(addr.address_1, margin, y); y -= 14;
    if (addr.address_2) { drawText(addr.address_2, margin, y); y -= 14; }
    drawText(`${addr.city}, ${addr.state} ${addr.postcode}`, margin, y); y -= 14;
    drawText(addr.country, margin, y);
    y -= 30;

    // Items table header
    page.drawRectangle({
        x: margin,
        y: y - 4,
        width: width - 2 * margin,
        height: 20,
        color: rgb(0.95, 0.95, 0.97),
    });

    const colSku = margin + 5;
    const colName = margin + 100;
    const colQty = width - margin - 160;
    const colLot = width - margin - 110;
    const colCoa = width - margin - 55;

    drawText('SKU', colSku, y, { font: boldFont, size: 9, color: rgb(0.4, 0.4, 0.4) });
    drawText('Product', colName, y, { font: boldFont, size: 9, color: rgb(0.4, 0.4, 0.4) });
    drawText('Qty', colQty, y, { font: boldFont, size: 9, color: rgb(0.4, 0.4, 0.4) });
    drawText('Lot', colLot, y, { font: boldFont, size: 9, color: rgb(0.4, 0.4, 0.4) });
    if (data.coaBaseUrl) {
        drawText('COA', colCoa, y, { font: boldFont, size: 9, color: rgb(0.4, 0.4, 0.4) });
    }
    y -= 22;

    // Items rows
    for (const item of data.items) {
        page.drawLine({
            start: { x: margin, y: y + 12 },
            end: { x: width - margin, y: y + 12 },
            thickness: 0.5,
            color: rgb(0.9, 0.9, 0.9),
        });

        const skuText = item.sku.length > 15 ? item.sku.substring(0, 15) + '...' : item.sku;
        const nameText = item.name.length > 28 ? item.name.substring(0, 28) + '...' : item.name;

        drawText(skuText, colSku, y, { size: 9 });
        drawText(nameText, colName, y, { size: 9 });
        drawText(String(item.qty), colQty, y, { size: 9 });
        drawText(item.lot_code || '-', colLot, y, { size: 9 });
        if (data.coaBaseUrl && item.lot_code) {
            try {
                const coaUrl = `${data.coaBaseUrl}/coa/${item.lot_code}`;
                const qrPng = await QRCode.toBuffer(coaUrl, { width: 36, margin: 0, errorCorrectionLevel: 'M' });
                const qrImage = await pdfDoc.embedPng(qrPng);
                page.drawImage(qrImage, { x: colCoa, y: y - 8, width: 30, height: 30 });
            } catch {
                drawText('QR err', colCoa, y, { size: 7, color: rgb(0.7, 0.3, 0.3) });
            }
        }
        y -= (data.coaBaseUrl && item.lot_code) ? 36 : 18;
    }

    // Footer with RUO disclaimer
    const disclaimerY = margin + 20;
    page.drawLine({
        start: { x: margin, y: disclaimerY + 15 },
        end: { x: width - margin, y: disclaimerY + 15 },
        thickness: 0.5,
        color: rgb(0.8, 0.8, 0.8),
    });
    drawText('FOR RESEARCH USE ONLY. NOT FOR HUMAN CONSUMPTION.', margin + 80, disclaimerY, {
        font: boldFont,
        size: 8,
        color: rgb(0.6, 0.3, 0.3),
    });
    drawText('Products are intended for laboratory research purposes only.', margin + 110, disclaimerY - 12, {
        size: 7,
        color: rgb(0.5, 0.5, 0.5),
    });

    return pdfDoc.save();
}
