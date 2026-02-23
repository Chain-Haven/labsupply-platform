import { sendEmail, wrapHtml } from './email';

export async function sendInvitationEmail(params: {
    recipientEmail: string;
    inviterName: string;
    scope: 'merchant' | 'admin';
    merchantName?: string;
    role: string;
    acceptUrl: string;
}): Promise<void> {
    const { recipientEmail, inviterName, scope, merchantName, role, acceptUrl } = params;

    const roleLabel = role
        .replace('MERCHANT_', '')
        .replace('supplier_', '')
        .replace(/_/g, ' ')
        .replace(/\b\w/g, c => c.toUpperCase());

    const contextLine = scope === 'merchant' && merchantName
        ? `<b>${inviterName}</b> has invited you to join <b>${merchantName}</b> as a <b>${roleLabel}</b>.`
        : `<b>${inviterName}</b> has invited you to join the admin team as a <b>${roleLabel}</b>.`;

    const dashboardName = scope === 'merchant' ? 'Merchant Dashboard' : 'Admin Panel';

    const inner = `
        <div style="text-align: center; margin-bottom: 24px;">
            <h1 style="color: #4f46e5; font-size: 20px; margin: 0;">You've Been Invited</h1>
        </div>
        <p style="color: #374151; font-size: 14px; line-height: 1.6;">
            ${contextLine}
        </p>
        <p style="color: #374151; font-size: 14px; line-height: 1.6;">
            Click the button below to accept the invitation and set up your account. You'll be directed to the ${dashboardName}.
        </p>
        <div style="text-align: center; margin: 24px 0;">
            <a href="${acceptUrl}"
               style="display: inline-block; background-color: #4f46e5; color: #ffffff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-size: 14px; font-weight: 600;">
                Accept Invitation
            </a>
        </div>
        <p style="color: #6b7280; font-size: 12px; line-height: 1.5;">
            This invitation will expire in 7 days. If you didn't expect this email, you can safely ignore it.
        </p>`;

    const subject = scope === 'merchant'
        ? `You've been invited to join ${merchantName || 'a team'} - WhiteLabel Peptides`
        : `Admin invitation - WhiteLabel Peptides`;

    try {
        await sendEmail(recipientEmail, subject, wrapHtml(inner));
    } catch (err) {
        console.error('Failed to send invitation email:', err);
    }
}

function formatCents(cents: number): string {
    return `$${(cents / 100).toFixed(2)}`;
}

export async function sendKybApprovedEmail(to: string, merchantName: string): Promise<void> {
    const inner = `
        <div style="text-align: center; margin-bottom: 24px;">
            <h1 style="color: #166534; font-size: 20px; margin: 0;">Application Approved</h1>
        </div>
        <p style="color: #374151; font-size: 14px; line-height: 1.6;">Dear ${merchantName},</p>
        <p style="color: #374151; font-size: 14px; line-height: 1.6;">
            Congratulations! Your application has been approved. Your account is now active and you can begin placing orders.
        </p>
        <div style="text-align: center; margin: 24px 0;">
            <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://portal.peptidetech.co'}/dashboard"
               style="display: inline-block; background-color: #2563eb; color: #ffffff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-size: 14px; font-weight: 600;">
                Go to Dashboard
            </a>
        </div>
        <p style="color: #374151; font-size: 14px; line-height: 1.6;">
            Welcome to WhiteLabel Peptides. If you have any questions, please don't hesitate to reach out to our support team.
        </p>`;
    try { await sendEmail(to, 'Application Approved - Welcome to WhiteLabel Peptides', wrapHtml(inner)); }
    catch (err) { console.error('Failed to send KYB approved email:', err); }
}

export async function sendKybRejectedEmail(to: string, merchantName: string, reason: string): Promise<void> {
    const inner = `
        <h1 style="color: #374151; font-size: 20px; margin: 0 0 24px 0;">Application Update</h1>
        <p style="color: #374151; font-size: 14px; line-height: 1.6;">Dear ${merchantName},</p>
        <p style="color: #374151; font-size: 14px; line-height: 1.6;">
            After careful review, we are unable to approve your application at this time.
        </p>
        <div style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 6px; padding: 16px; margin: 20px 0;">
            <p style="color: #991b1b; font-size: 12px; font-weight: 600; margin: 0 0 8px 0; text-transform: uppercase;">Reason</p>
            <p style="color: #374151; font-size: 13px; margin: 0;">${reason}</p>
        </div>
        <p style="color: #374151; font-size: 14px; line-height: 1.6;">
            If you believe this decision was made in error or would like to provide additional information, please contact our support team.
        </p>`;
    try { await sendEmail(to, 'Application Update - WhiteLabel Peptides', wrapHtml(inner)); }
    catch (err) { console.error('Failed to send KYB rejected email:', err); }
}

export async function sendKybRequestInfoEmail(to: string, merchantName: string, message: string): Promise<void> {
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
            <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://portal.peptidetech.co'}/dashboard/uploads"
               style="display: inline-block; background-color: #d97706; color: #ffffff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-size: 14px; font-weight: 600;">
                Upload Documents
            </a>
        </div>`;
    try { await sendEmail(to, 'Additional Information Needed - WhiteLabel Peptides', wrapHtml(inner)); }
    catch (err) { console.error('Failed to send KYB request info email:', err); }
}
