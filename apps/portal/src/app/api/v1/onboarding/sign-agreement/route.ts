/**
 * POST /api/v1/onboarding/sign-agreement
 *
 * Processes the merchant agreement signature:
 *  1. Validates the authenticated user
 *  2. Generates a PDF of the full agreement with the merchant's signature
 *  3. Uploads the PDF to Supabase Storage
 *  4. Sends the signed PDF via email to the merchant (To) and legal@peptidetech.co (CC)
 *  5. Updates the merchants table with agreement timestamps and PDF URL
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createRouteHandlerClient } from '@/lib/supabase-server';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import * as nodemailer from 'nodemailer';
import {
  TERMS_OF_SERVICE_SECTIONS,
  PRIVACY_POLICY_SECTIONS,
  COMPANY,
  EFFECTIVE_DATE,
} from '@/lib/legal-documents';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

function getMailTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.protonmail.ch',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    tls: { minVersion: 'TLSv1.2' },
  });
}

/**
 * Wraps a long string into lines that fit within `maxWidth` at the given font/size.
 */
function wrapText(
  text: string,
  font: Awaited<ReturnType<typeof PDFDocument.prototype.embedFont>>,
  fontSize: number,
  maxWidth: number
): string[] {
  const lines: string[] = [];
  const paragraphs = text.split('\n');

  for (const paragraph of paragraphs) {
    if (paragraph.trim() === '') {
      lines.push('');
      continue;
    }

    const words = paragraph.split(/\s+/);
    let currentLine = '';

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const testWidth = font.widthOfTextAtSize(testLine, fontSize);

      if (testWidth > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine) {
      lines.push(currentLine);
    }
  }

  return lines;
}

async function generateAgreementPdf(
  signatureDataUrl: string,
  merchantName: string,
  merchantEmail: string,
  ipAddress: string
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const pageWidth = 612; // Letter size
  const pageHeight = 792;
  const margin = 60;
  const contentWidth = pageWidth - margin * 2;
  const bodyFontSize = 9;
  const titleFontSize = 11;
  const headerFontSize = 14;
  const lineHeight = bodyFontSize * 1.4;
  const titleLineHeight = titleFontSize * 1.6;

  let page = pdfDoc.addPage([pageWidth, pageHeight]);
  let y = pageHeight - margin;

  function ensureSpace(needed: number) {
    if (y - needed < margin) {
      page = pdfDoc.addPage([pageWidth, pageHeight]);
      y = pageHeight - margin;
    }
  }

  function drawText(
    text: string,
    options: {
      fontObj?: typeof font;
      size?: number;
      lh?: number;
      color?: ReturnType<typeof rgb>;
    } = {}
  ) {
    const f = options.fontObj || font;
    const size = options.size || bodyFontSize;
    const lh = options.lh || lineHeight;
    const color = options.color || rgb(0.1, 0.1, 0.1);

    const lines = wrapText(text, f, size, contentWidth);
    for (const line of lines) {
      ensureSpace(lh);
      page.drawText(line, { x: margin, y, size, font: f, color });
      y -= lh;
    }
  }

  // --- Cover page ---
  y -= 60;
  page.drawText('MERCHANT AGREEMENT', {
    x: margin,
    y,
    size: 22,
    font: fontBold,
    color: rgb(0.12, 0.1, 0.3),
  });
  y -= 30;
  page.drawText('AND TERMS OF SERVICE', {
    x: margin,
    y,
    size: 22,
    font: fontBold,
    color: rgb(0.12, 0.1, 0.3),
  });
  y -= 40;
  drawText(`${COMPANY.name}`, { fontObj: fontBold, size: 12 });
  drawText(COMPANY.address, { size: 10 });
  y -= 10;
  drawText(`Effective Date: ${EFFECTIVE_DATE}`, { size: 10 });
  y -= 30;
  page.drawLine({
    start: { x: margin, y },
    end: { x: pageWidth - margin, y },
    thickness: 1,
    color: rgb(0.7, 0.7, 0.7),
  });
  y -= 30;
  drawText(`Merchant: ${merchantName}`, { fontObj: fontBold, size: 11 });
  drawText(`Email: ${merchantEmail}`, { size: 10 });
  drawText(`Signed: ${new Date().toISOString()}`, { size: 10 });
  drawText(`IP Address: ${ipAddress}`, { size: 10 });

  // --- Terms of Service ---
  page = pdfDoc.addPage([pageWidth, pageHeight]);
  y = pageHeight - margin;

  page.drawText('TERMS OF SERVICE & MERCHANT AGREEMENT', {
    x: margin,
    y,
    size: headerFontSize,
    font: fontBold,
    color: rgb(0.12, 0.1, 0.3),
  });
  y -= headerFontSize * 2;

  for (const section of TERMS_OF_SERVICE_SECTIONS) {
    ensureSpace(titleLineHeight * 2);
    y -= 10;
    drawText(section.title, {
      fontObj: fontBold,
      size: titleFontSize,
      lh: titleLineHeight,
      color: rgb(0.15, 0.1, 0.3),
    });
    y -= 4;
    drawText(section.content);
    y -= 8;
  }

  // --- Privacy Policy ---
  ensureSpace(100);
  y -= 20;
  page.drawLine({
    start: { x: margin, y },
    end: { x: pageWidth - margin, y },
    thickness: 1,
    color: rgb(0.7, 0.7, 0.7),
  });
  y -= 30;

  ensureSpace(headerFontSize * 3);
  page.drawText('PRIVACY POLICY', {
    x: margin,
    y,
    size: headerFontSize,
    font: fontBold,
    color: rgb(0.12, 0.1, 0.3),
  });
  y -= headerFontSize * 2;

  for (const section of PRIVACY_POLICY_SECTIONS) {
    ensureSpace(titleLineHeight * 2);
    y -= 10;
    drawText(section.title, {
      fontObj: fontBold,
      size: titleFontSize,
      lh: titleLineHeight,
      color: rgb(0.15, 0.1, 0.3),
    });
    y -= 4;
    drawText(section.content);
    y -= 8;
  }

  // --- Signature page ---
  page = pdfDoc.addPage([pageWidth, pageHeight]);
  y = pageHeight - margin;

  page.drawText('EXECUTION AND SIGNATURE', {
    x: margin,
    y,
    size: headerFontSize,
    font: fontBold,
    color: rgb(0.12, 0.1, 0.3),
  });
  y -= 40;

  drawText(
    'By signing below, the undersigned Merchant acknowledges that they have read, understood, and agree to be legally bound by all terms and conditions of this Merchant Agreement, Terms of Service, and Privacy Policy.',
    { size: 10 }
  );
  y -= 20;

  drawText(`Merchant Name: ${merchantName}`, { fontObj: fontBold, size: 11 });
  drawText(`Email: ${merchantEmail}`, { size: 10 });
  drawText(`Date Signed: ${new Date().toLocaleString('en-US', { timeZone: 'America/Denver' })}`, {
    size: 10,
  });
  drawText(`IP Address: ${ipAddress}`, { size: 10 });
  y -= 30;

  drawText('Signature:', { fontObj: fontBold, size: 11 });
  y -= 10;

  // Embed the signature image
  if (signatureDataUrl) {
    try {
      const base64Data = signatureDataUrl.replace(/^data:image\/png;base64,/, '');
      const sigBytes = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));
      const sigImage = await pdfDoc.embedPng(sigBytes);

      const sigMaxWidth = 250;
      const sigMaxHeight = 100;
      const sigDims = sigImage.scaleToFit(sigMaxWidth, sigMaxHeight);

      ensureSpace(sigDims.height + 30);

      page.drawImage(sigImage, {
        x: margin,
        y: y - sigDims.height,
        width: sigDims.width,
        height: sigDims.height,
      });

      y -= sigDims.height + 10;
    } catch (err) {
      console.error('Failed to embed signature image in PDF:', err);
      drawText('[Signature image could not be embedded]', { size: 10 });
    }
  }

  // Signature line
  page.drawLine({
    start: { x: margin, y },
    end: { x: margin + 250, y },
    thickness: 1,
    color: rgb(0.2, 0.2, 0.2),
  });
  y -= 15;
  drawText('Authorized Signatory', { size: 9, color: rgb(0.4, 0.4, 0.4) });

  y -= 40;
  page.drawLine({
    start: { x: margin, y },
    end: { x: pageWidth - margin, y },
    thickness: 0.5,
    color: rgb(0.7, 0.7, 0.7),
  });
  y -= 20;
  drawText(
    `This document was electronically signed via the ${COMPANY.name} Platform. ` +
      'Electronic signatures are legally binding under the E-SIGN Act (15 U.S.C. § 7001) ' +
      'and the Uniform Electronic Transactions Act.',
    { size: 8, color: rgb(0.5, 0.5, 0.5) }
  );
  y -= 10;
  drawText(`Document generated: ${new Date().toISOString()}`, {
    size: 8,
    color: rgb(0.5, 0.5, 0.5),
  });

  return pdfDoc.save();
}

export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate user
    const supabase = createRouteHandlerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // 2. Parse request body
    const body = await request.json();
    const { signatureDataUrl, merchantName, merchantEmail } = body;

    if (!signatureDataUrl || !merchantName) {
      return NextResponse.json(
        { error: 'Missing required fields: signatureDataUrl, merchantName' },
        { status: 400 }
      );
    }

    // 3. Get IP address for the record
    const forwarded = request.headers.get('x-forwarded-for');
    const ipAddress = forwarded?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown';

    // 4. Generate PDF
    const pdfBytes = await generateAgreementPdf(
      signatureDataUrl,
      merchantName,
      merchantEmail || user.email || '',
      ipAddress
    );

    const serviceClient = getServiceClient();

    // 5. Upload PDF to Supabase Storage
    const fileName = `agreement_${user.id}_${Date.now()}.pdf`;
    const storagePath = `agreements/${user.id}/${fileName}`;

    const { error: uploadError } = await serviceClient.storage
      .from('merchant-documents')
      .upload(storagePath, pdfBytes, {
        contentType: 'application/pdf',
        upsert: false,
      });

    if (uploadError) {
      console.error('Failed to upload agreement PDF:', uploadError);
      // Continue without storage - email is more important
    }

    // 6. Send email with PDF attachment
    const recipientEmail = merchantEmail || user.email;
    if (recipientEmail) {
      try {
        const transporter = getMailTransporter();
        const fromAddress = process.env.SMTP_FROM || 'legal@peptidetech.co';

        await transporter.sendMail({
          from: `"Peptide Tech LLC" <${fromAddress}>`,
          to: recipientEmail,
          cc: 'legal@peptidetech.co',
          subject: `Peptide Tech LLC — Executed Merchant Agreement — ${merchantName}`,
          html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background-color: #ffffff; border-radius: 8px; padding: 32px; border: 1px solid #e5e7eb;">
      <div style="text-align: center; margin-bottom: 24px;">
        <h1 style="color: #1e1b4b; font-size: 20px; margin: 0;">Merchant Agreement — Executed Copy</h1>
        <p style="color: #6b7280; font-size: 14px; margin-top: 8px;">Peptide Tech LLC</p>
      </div>

      <p style="color: #374151; font-size: 14px; line-height: 1.6;">
        Dear ${merchantName},
      </p>

      <p style="color: #374151; font-size: 14px; line-height: 1.6;">
        Thank you for signing the Peptide Tech LLC Merchant Agreement and Terms of Service. Please find your fully executed copy of the agreement attached to this email as a PDF document.
      </p>

      <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 16px; margin: 20px 0;">
        <p style="color: #374151; font-size: 13px; margin: 0 0 8px 0;">
          <strong>Agreement Details:</strong>
        </p>
        <p style="color: #374151; font-size: 13px; margin: 0;">
          Merchant: ${merchantName}<br>
          Email: ${recipientEmail}<br>
          Date Signed: ${new Date().toLocaleString('en-US', { timeZone: 'America/Denver' })}<br>
          IP Address: ${ipAddress}
        </p>
      </div>

      <p style="color: #374151; font-size: 14px; line-height: 1.6;">
        Please retain this document for your records. If you have any questions about the agreement, please contact our legal team at <a href="mailto:legal@peptidetech.co" style="color: #4f46e5;">legal@peptidetech.co</a>.
      </p>

      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">

      <p style="color: #9ca3af; font-size: 12px; text-align: center;">
        Peptide Tech LLC<br>
        1309 Coffeen Ave, Ste 14346, Sheridan, Wyoming 82801<br>
        legal@peptidetech.co
      </p>
    </div>
  </div>
</body>
</html>`,
          attachments: [
            {
              filename: `Peptide_Tech_Merchant_Agreement_${merchantName.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`,
              content: Buffer.from(pdfBytes),
              contentType: 'application/pdf',
            },
          ],
        });
      } catch (emailError) {
        console.error('Failed to send agreement email:', emailError);
        // Don't fail the request if email fails - the agreement is still valid
      }
    }

    // 7. Update merchant record
    const now = new Date().toISOString();
    const { error: updateError } = await serviceClient
      .from('merchants')
      .update({
        agreement_accepted_at: now,
        terms_accepted_at: now,
        agreement_signature_url: storagePath || null,
      })
      .eq('user_id', user.id);

    if (updateError) {
      console.error('Failed to update merchant agreement fields:', updateError);
    }

    return NextResponse.json({
      success: true,
      signedAt: now,
      documentUrl: storagePath || null,
    });
  } catch (err) {
    console.error('Error in POST /api/v1/onboarding/sign-agreement:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
