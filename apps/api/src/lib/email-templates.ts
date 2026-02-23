import { sendEmail, wrapHtml } from './email';

function formatCents(cents: number): string {
    return `$${(cents / 100).toFixed(2)}`;
}

export async function sendOrderReceivedEmail(
    to: string,
    merchantName: string,
    orderId: string,
    wooOrderId: string | number,
    items: Array<{ name: string; qty: number; unit_price_cents: number }>,
    totalCents: number,
    funded: boolean
): Promise<void> {
    const itemRows = items
        .map(
            (item) =>
                `<tr>
                    <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; color: #374151; font-size: 13px;">${item.name}</td>
                    <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; color: #374151; font-size: 13px; text-align: center;">${item.qty}</td>
                    <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; color: #374151; font-size: 13px; text-align: right;">${formatCents(item.unit_price_cents)}</td>
                </tr>`
        )
        .join('');

    const fundingNotice = funded
        ? `<div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 6px; padding: 16px; margin: 20px 0;">
               <p style="color: #166534; font-size: 13px; margin: 0;">Funds have been reserved from your wallet.</p>
           </div>`
        : `<div style="background-color: #fffbeb; border: 1px solid #fde68a; border-radius: 6px; padding: 16px; margin: 20px 0;">
               <p style="color: #92400e; font-size: 13px; margin: 0;">Your wallet balance is insufficient. Please top up your wallet to proceed.</p>
           </div>`;

    const inner = `
        <h1 style="color: #374151; font-size: 20px; margin: 0 0 24px 0;">Order Received</h1>

        <p style="color: #374151; font-size: 14px; line-height: 1.6;">
            Dear ${merchantName},
        </p>
        <p style="color: #374151; font-size: 14px; line-height: 1.6;">
            Your order <strong>#${wooOrderId}</strong> has been received.
        </p>

        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <thead>
                <tr style="background-color: #f9fafb;">
                    <th style="padding: 8px 12px; text-align: left; font-size: 12px; color: #6b7280; text-transform: uppercase; border-bottom: 2px solid #e5e7eb;">Item</th>
                    <th style="padding: 8px 12px; text-align: center; font-size: 12px; color: #6b7280; text-transform: uppercase; border-bottom: 2px solid #e5e7eb;">Qty</th>
                    <th style="padding: 8px 12px; text-align: right; font-size: 12px; color: #6b7280; text-transform: uppercase; border-bottom: 2px solid #e5e7eb;">Price</th>
                </tr>
            </thead>
            <tbody>
                ${itemRows}
            </tbody>
        </table>

        <p style="color: #374151; font-size: 14px; font-weight: 600; text-align: right;">
            Total: ${formatCents(totalCents)}
        </p>

        ${fundingNotice}`;

    try {
        await sendEmail(to, `Order Received - #${wooOrderId}`, wrapHtml(inner));
    } catch (err) {
        console.error('Failed to send order received email:', err);
    }
}

export async function sendOrderShippedEmail(
    to: string,
    merchantName: string,
    orderId: string,
    wooOrderId: string | number,
    trackingNumber: string,
    carrier: string,
    trackingUrl?: string
): Promise<void> {
    const trackingLink = trackingUrl
        ? `<p style="color: #374151; font-size: 14px; line-height: 1.6;">
               Track your shipment: <a href="${trackingUrl}" style="color: #1d4ed8;">${trackingUrl}</a>
           </p>`
        : '';

    const inner = `
        <h1 style="color: #374151; font-size: 20px; margin: 0 0 24px 0;">Order Shipped</h1>

        <p style="color: #374151; font-size: 14px; line-height: 1.6;">
            Dear ${merchantName},
        </p>
        <p style="color: #374151; font-size: 14px; line-height: 1.6;">
            Your order <strong>#${wooOrderId}</strong> has been shipped.
        </p>

        <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 16px; margin: 20px 0;">
            <p style="color: #374151; font-size: 13px; margin: 0 0 8px 0;">
                <strong>Carrier:</strong> ${carrier}
            </p>
            <p style="color: #374151; font-size: 13px; margin: 0;">
                <strong>Tracking Number:</strong> ${trackingNumber}
            </p>
        </div>

        ${trackingLink}`;

    try {
        await sendEmail(to, `Order Shipped - #${wooOrderId}`, wrapHtml(inner));
    } catch (err) {
        console.error('Failed to send order shipped email:', err);
    }
}

export async function sendKybApprovedEmail(
    to: string,
    merchantName: string
): Promise<void> {
    const inner = `
        <div style="text-align: center; margin-bottom: 24px;">
            <h1 style="color: #166534; font-size: 20px; margin: 0;">Application Approved</h1>
        </div>

        <p style="color: #374151; font-size: 14px; line-height: 1.6;">
            Dear ${merchantName},
        </p>
        <p style="color: #374151; font-size: 14px; line-height: 1.6;">
            Congratulations! Your application has been approved. Your account is now active and you can begin placing orders.
        </p>

        <div style="text-align: center; margin: 24px 0;">
            <a href="${process.env.PORTAL_URL || 'https://portal.peptidetech.co'}/dashboard"
               style="display: inline-block; background-color: #2563eb; color: #ffffff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-size: 14px; font-weight: 600;">
                Go to Dashboard
            </a>
        </div>

        <p style="color: #374151; font-size: 14px; line-height: 1.6;">
            Welcome to WhiteLabel Peptides. If you have any questions, please don't hesitate to reach out to our support team.
        </p>`;

    try {
        await sendEmail(to, 'Application Approved - Welcome to WhiteLabel Peptides', wrapHtml(inner));
    } catch (err) {
        console.error('Failed to send KYB approved email:', err);
    }
}

export async function sendKybRejectedEmail(
    to: string,
    merchantName: string,
    reason: string
): Promise<void> {
    const inner = `
        <h1 style="color: #374151; font-size: 20px; margin: 0 0 24px 0;">Application Update</h1>

        <p style="color: #374151; font-size: 14px; line-height: 1.6;">
            Dear ${merchantName},
        </p>
        <p style="color: #374151; font-size: 14px; line-height: 1.6;">
            After careful review, we are unable to approve your application at this time.
        </p>

        <div style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 6px; padding: 16px; margin: 20px 0;">
            <p style="color: #991b1b; font-size: 12px; font-weight: 600; margin: 0 0 8px 0; text-transform: uppercase;">
                Reason
            </p>
            <p style="color: #374151; font-size: 13px; margin: 0;">
                ${reason}
            </p>
        </div>

        <p style="color: #374151; font-size: 14px; line-height: 1.6;">
            If you believe this decision was made in error or would like to provide additional information, please contact our support team for assistance.
        </p>`;

    try {
        await sendEmail(to, 'Application Update - WhiteLabel Peptides', wrapHtml(inner));
    } catch (err) {
        console.error('Failed to send KYB rejected email:', err);
    }
}

export async function sendKybRequestInfoEmail(
    to: string,
    merchantName: string,
    message: string
): Promise<void> {
    const inner = `
        <div style="text-align: center; margin-bottom: 24px;">
            <h1 style="color: #d97706; font-size: 20px; margin: 0;">Additional Information Needed</h1>
        </div>
        <p style="color: #374151; font-size: 14px; line-height: 1.6;">Dear ${merchantName},</p>
        <p style="color: #374151; font-size: 14px; line-height: 1.6;">
            We need some additional information to complete the review of your application.
        </p>
        <div style="background-color: #fffbeb; border: 1px solid #fde68a; border-radius: 6px; padding: 16px; margin: 20px 0;">
            <p style="color: #92400e; font-size: 12px; font-weight: 600; margin: 0 0 8px 0; text-transform: uppercase;">Message from our team</p>
            <p style="color: #374151; font-size: 13px; margin: 0;">${message}</p>
        </div>
        <p style="color: #374151; font-size: 14px; line-height: 1.6;">
            Please log in to your account and upload the requested documents or information.
        </p>
        <div style="text-align: center; margin: 24px 0;">
            <a href="${process.env.PORTAL_URL || 'https://portal.peptidetech.co'}/dashboard/uploads"
               style="display: inline-block; background-color: #d97706; color: #ffffff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-size: 14px; font-weight: 600;">
                Upload Documents
            </a>
        </div>`;

    try {
        await sendEmail(to, 'Additional Information Needed - WhiteLabel Peptides', wrapHtml(inner));
    } catch (err) {
        console.error('Failed to send KYB request info email:', err);
    }
}

export async function sendLowBalanceEmail(
    to: string,
    merchantName: string,
    balanceCents: number,
    thresholdCents: number
): Promise<void> {
    const inner = `
        <div style="text-align: center; margin-bottom: 24px;">
            <h1 style="color: #92400e; font-size: 20px; margin: 0;">Low Wallet Balance Alert</h1>
        </div>

        <p style="color: #374151; font-size: 14px; line-height: 1.6;">
            Dear ${merchantName},
        </p>
        <p style="color: #374151; font-size: 14px; line-height: 1.6;">
            Your wallet balance has fallen below your alert threshold.
        </p>

        <div style="background-color: #fffbeb; border: 1px solid #fde68a; border-radius: 6px; padding: 16px; margin: 20px 0;">
            <p style="color: #92400e; font-size: 13px; margin: 0 0 8px 0;">
                <strong>Current Balance:</strong> ${formatCents(balanceCents)}
            </p>
            <p style="color: #92400e; font-size: 13px; margin: 0;">
                <strong>Alert Threshold:</strong> ${formatCents(thresholdCents)}
            </p>
        </div>

        <p style="color: #374151; font-size: 14px; line-height: 1.6;">
            Please top up your wallet to ensure uninterrupted order processing.
        </p>

        <div style="text-align: center; margin: 24px 0;">
            <a href="${process.env.PORTAL_URL || 'https://portal.peptidetech.co'}/wallet"
               style="display: inline-block; background-color: #2563eb; color: #ffffff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-size: 14px; font-weight: 600;">
                Top Up Wallet
            </a>
        </div>`;

    try {
        await sendEmail(to, 'Low Wallet Balance Alert', wrapHtml(inner));
    } catch (err) {
        console.error('Failed to send low balance email:', err);
    }
}
