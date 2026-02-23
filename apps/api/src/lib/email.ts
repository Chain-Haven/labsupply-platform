import * as nodemailer from 'nodemailer';

let _transporter: nodemailer.Transporter | null = null;

export function getTransporter(): nodemailer.Transporter {
    if (!_transporter) {
        _transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST || 'smtp.protonmail.ch',
            port: parseInt(process.env.SMTP_PORT || '587', 10),
            secure: false,
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },
        });
    }
    return _transporter;
}

export function getFromAddress(): string {
    return process.env.SMTP_FROM || 'noreply@peptidetech.co';
}

export function wrapHtml(innerContent: string): string {
    return `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5;">
    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #ffffff; border-radius: 8px; padding: 32px; border: 1px solid #e5e7eb;">
            ${innerContent}

            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">

            <p style="color: #9ca3af; font-size: 12px; text-align: center;">
                WhiteLabel Peptides Platform<br>
                This is an automated notification.
            </p>
        </div>
    </div>
</body>
</html>`;
}

export async function sendEmail(to: string, subject: string, html: string): Promise<void> {
    if (!process.env.SMTP_USER) {
        console.warn('SMTP_USER not set — skipping email to', to, 'subject:', subject);
        return;
    }

    const transporter = getTransporter();
    await transporter.sendMail({
        from: getFromAddress(),
        to,
        subject,
        html,
    });
}
