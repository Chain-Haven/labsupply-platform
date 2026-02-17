/**
 * Testing Lab Email Templates
 * Sends notification emails to testing labs when a shipment is on the way.
 */

import * as nodemailer from 'nodemailer';

interface TestingLabEmailParams {
    labName: string;
    labEmail: string;
    merchantName: string;
    testingOrderId: string;
    trackingNumber: string;
    carrier: string;
    trackingUrl?: string | null;
    invoiceEmail: string;
    items: Array<{
        productName: string;
        sku: string;
        totalQty: number;
        tests: string[];
    }>;
}

function getTransporter() {
    return nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.protonmail.ch',
        port: parseInt(process.env.SMTP_PORT || '587', 10),
        secure: false,
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
        },
    });
}

function getFromAddress(): string {
    return process.env.SMTP_FROM || 'operations@peptidetech.co';
}

function formatTestsList(tests: string[]): string {
    if (tests.length === 0) return 'Standard analysis';
    return tests.map(t => t.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())).join(', ');
}

/**
 * Send a notification email to a testing lab about an incoming shipment.
 */
export async function sendTestingLabNotificationEmail(params: TestingLabEmailParams): Promise<void> {
    const transporter = getTransporter();

    const trackingLine = params.trackingUrl
        ? `<a href="${params.trackingUrl}" style="color: #1d4ed8; text-decoration: underline;">${params.trackingNumber}</a> (${params.carrier})`
        : `${params.trackingNumber} (${params.carrier})`;

    const itemRows = params.items.map(item => `
        <tr>
            <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb; font-size: 14px; color: #374151;">
                ${item.productName}<br>
                <span style="font-size: 12px; color: #6b7280;">SKU: ${item.sku}</span>
            </td>
            <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb; font-size: 14px; color: #374151; text-align: center;">
                ${item.totalQty}
            </td>
            <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb; font-size: 14px; color: #374151;">
                ${formatTestsList(item.tests)}
            </td>
        </tr>
    `).join('');

    const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5;">
    <div style="max-width: 650px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #ffffff; border-radius: 8px; padding: 32px; border: 1px solid #e5e7eb;">
            <div style="text-align: center; margin-bottom: 24px;">
                <h1 style="color: #1e40af; font-size: 20px; margin: 0;">Incoming Testing Shipment</h1>
                <p style="color: #6b7280; font-size: 14px; margin-top: 8px;">Order #${params.testingOrderId.slice(0, 8).toUpperCase()}</p>
            </div>

            <p style="color: #374151; font-size: 14px; line-height: 1.6;">
                Dear ${params.labName} Team,
            </p>

            <p style="color: #374151; font-size: 14px; line-height: 1.6;">
                We are writing to inform you that a testing shipment for <strong>${params.merchantName}</strong> is on its way to your facility. Please find the shipment details below.
            </p>

            <!-- Tracking Info -->
            <div style="background-color: #eff6ff; border: 1px solid #bfdbfe; border-radius: 6px; padding: 16px; margin: 20px 0;">
                <p style="color: #1e40af; font-size: 13px; font-weight: 600; margin: 0 0 8px 0;">
                    Shipment Tracking
                </p>
                <p style="color: #374151; font-size: 14px; margin: 0;">
                    Tracking Number: ${trackingLine}
                </p>
            </div>

            <!-- Products Table -->
            <div style="margin: 20px 0;">
                <p style="color: #374151; font-size: 14px; font-weight: 600; margin: 0 0 12px 0;">
                    Products & Testing Required:
                </p>
                <table style="width: 100%; border-collapse: collapse; border: 1px solid #e5e7eb; border-radius: 6px; overflow: hidden;">
                    <thead>
                        <tr style="background-color: #f9fafb;">
                            <th style="padding: 10px 12px; text-align: left; font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase; border-bottom: 2px solid #e5e7eb;">Product</th>
                            <th style="padding: 10px 12px; text-align: center; font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase; border-bottom: 2px solid #e5e7eb;">Qty</th>
                            <th style="padding: 10px 12px; text-align: left; font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase; border-bottom: 2px solid #e5e7eb;">Tests Required</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${itemRows}
                    </tbody>
                </table>
            </div>

            <!-- Merchant Info -->
            <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 16px; margin: 20px 0;">
                <p style="color: #6b7280; font-size: 12px; font-weight: 600; margin: 0 0 8px 0; text-transform: uppercase;">
                    Merchant
                </p>
                <p style="color: #374151; font-size: 14px; margin: 0;">
                    ${params.merchantName}
                </p>
            </div>

            <!-- Invoice Request -->
            <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 6px; padding: 16px; margin: 20px 0;">
                <p style="color: #166534; font-size: 13px; font-weight: 600; margin: 0 0 8px 0;">
                    Invoice Request
                </p>
                <p style="color: #374151; font-size: 14px; margin: 0; line-height: 1.6;">
                    Upon completion of testing, we kindly request that you send an invoice specific to this order to:
                    <br>
                    <a href="mailto:${params.invoiceEmail}" style="color: #1d4ed8; font-weight: 600;">${params.invoiceEmail}</a>
                </p>
                <p style="color: #6b7280; font-size: 13px; margin: 8px 0 0 0;">
                    Please reference order <strong>#${params.testingOrderId.slice(0, 8).toUpperCase()}</strong> on the invoice.
                </p>
            </div>

            <p style="color: #374151; font-size: 14px; line-height: 1.6;">
                Thank you for your continued partnership. Please do not hesitate to reach out if you have any questions regarding this shipment or the testing requirements.
            </p>

            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">

            <p style="color: #9ca3af; font-size: 12px; text-align: center;">
                WhiteLabel Peptides Platform - Operations Team<br>
                This is an automated notification from our testing management system.
            </p>
        </div>
    </div>
</body>
</html>`;

    await transporter.sendMail({
        from: getFromAddress(),
        to: params.labEmail,
        subject: `Incoming Testing Shipment for ${params.merchantName} - Order #${params.testingOrderId.slice(0, 8).toUpperCase()}`,
        html,
    });
}

/**
 * Send a status update email to the merchant about their testing order.
 */
export async function sendTestingMerchantNotificationEmail(params: {
    merchantEmail: string;
    merchantName: string;
    testingOrderId: string;
    labName: string;
    newStatus: string;
    items: Array<{ productName: string; sku: string }>;
}): Promise<void> {
    const transporter = getTransporter();

    const statusLabels: Record<string, string> = {
        'SHIPPED': 'Shipped to Lab',
        'IN_TESTING': 'Testing In Progress',
        'RESULTS_RECEIVED': 'Results Received',
        'COMPLETE': 'Testing Complete',
    };

    const statusLabel = statusLabels[params.newStatus] || params.newStatus;

    const productList = params.items.map(i => `<li style="color: #374151; font-size: 14px;">${i.productName} (${i.sku})</li>`).join('');

    const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5;">
    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #ffffff; border-radius: 8px; padding: 32px; border: 1px solid #e5e7eb;">
            <div style="text-align: center; margin-bottom: 24px;">
                <h1 style="color: #7c3aed; font-size: 20px; margin: 0;">Testing Order Update</h1>
                <p style="color: #6b7280; font-size: 14px; margin-top: 8px;">Order #${params.testingOrderId.slice(0, 8).toUpperCase()}</p>
            </div>

            <p style="color: #374151; font-size: 14px; line-height: 1.6;">
                Dear ${params.merchantName},
            </p>

            <p style="color: #374151; font-size: 14px; line-height: 1.6;">
                Your testing order status has been updated to: <strong>${statusLabel}</strong>
            </p>

            <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 16px; margin: 20px 0;">
                <p style="color: #6b7280; font-size: 12px; font-weight: 600; margin: 0 0 8px 0; text-transform: uppercase;">
                    Products in this order
                </p>
                <ul style="margin: 0; padding-left: 20px;">
                    ${productList}
                </ul>
                <p style="color: #6b7280; font-size: 13px; margin: 12px 0 0 0;">
                    Testing Lab: <strong>${params.labName}</strong>
                </p>
            </div>

            <p style="color: #374151; font-size: 14px; line-height: 1.6;">
                You can view the full details of this testing order in your dashboard.
            </p>

            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">

            <p style="color: #9ca3af; font-size: 12px; text-align: center;">
                WhiteLabel Peptides Platform<br>
                This is an automated testing status notification.
            </p>
        </div>
    </div>
</body>
</html>`;

    await transporter.sendMail({
        from: getFromAddress(),
        to: params.merchantEmail,
        subject: `Testing Order Update: ${statusLabel} - Order #${params.testingOrderId.slice(0, 8).toUpperCase()}`,
        html,
    });
}
