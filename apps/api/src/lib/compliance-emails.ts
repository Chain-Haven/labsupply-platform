/**
 * Compliance Email Templates
 * Sends notification and block emails to merchants regarding compliance violations.
 */

import * as nodemailer from 'nodemailer';

interface ComplianceEmailParams {
    to: string;
    merchantName: string;
    pageUrl: string;
    violationType: string;
    description: string;
    violatingText: string;
    suggestedFix?: string;
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
    return process.env.SMTP_FROM || 'compliance@peptidetech.co';
}

function formatViolationType(type: string): string {
    const labels: Record<string, string> = {
        health_claim: 'Health Claim',
        dosage_advice: 'Dosage Advice',
        brand_name_usage: 'Brand Name Usage',
        human_use_suggestion: 'Human Use Suggestion',
        fda_violation: 'FDA Violation',
        other: 'Other Compliance Issue',
    };
    return labels[type] || type;
}

/**
 * Send a compliance notification email to a merchant.
 * Informs them of the violation and suggests a fix.
 */
export async function sendComplianceNotificationEmail(params: ComplianceEmailParams): Promise<void> {
    const transporter = getTransporter();

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
                <h1 style="color: #dc2626; font-size: 20px; margin: 0;">Compliance Issue Found</h1>
                <p style="color: #6b7280; font-size: 14px; margin-top: 8px;">Action Required - RUO Compliance</p>
            </div>

            <p style="color: #374151; font-size: 14px; line-height: 1.6;">
                Dear ${params.merchantName},
            </p>

            <p style="color: #374151; font-size: 14px; line-height: 1.6;">
                During our routine compliance review, we identified a potential issue on your website that may not be in compliance with Research Use Only (RUO) requirements.
            </p>

            <div style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 6px; padding: 16px; margin: 20px 0;">
                <p style="color: #991b1b; font-size: 13px; font-weight: 600; margin: 0 0 8px 0;">
                    Violation Type: ${formatViolationType(params.violationType)}
                </p>
                <p style="color: #991b1b; font-size: 13px; margin: 0 0 8px 0;">
                    Page: <a href="${params.pageUrl}" style="color: #1d4ed8;">${params.pageUrl}</a>
                </p>
                <p style="color: #374151; font-size: 13px; margin: 0;">
                    ${params.description}
                </p>
            </div>

            <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 16px; margin: 20px 0;">
                <p style="color: #6b7280; font-size: 12px; font-weight: 600; margin: 0 0 8px 0; text-transform: uppercase;">
                    Content Flagged
                </p>
                <p style="color: #374151; font-size: 13px; margin: 0; font-style: italic;">
                    "${params.violatingText}"
                </p>
            </div>

            ${params.suggestedFix ? `
            <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 6px; padding: 16px; margin: 20px 0;">
                <p style="color: #166534; font-size: 12px; font-weight: 600; margin: 0 0 8px 0; text-transform: uppercase;">
                    Suggested Compliant Alternative
                </p>
                <p style="color: #374151; font-size: 13px; margin: 0;">
                    "${params.suggestedFix}"
                </p>
            </div>
            ` : ''}

            <p style="color: #374151; font-size: 14px; line-height: 1.6;">
                Please review and update your website content to ensure compliance with RUO regulations (21 CFR &sect; 809.10). All products must be marketed strictly for research use only.
            </p>

            <p style="color: #374151; font-size: 14px; line-height: 1.6;">
                If you believe this was flagged in error, please contact our compliance team and we will review the finding.
            </p>

            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">

            <p style="color: #9ca3af; font-size: 12px; text-align: center;">
                WhiteLabel Peptides Platform - Compliance Team<br>
                This is an automated compliance notification.
            </p>
        </div>
    </div>
</body>
</html>`;

    await transporter.sendMail({
        from: getFromAddress(),
        to: params.to,
        subject: `[Action Required] Compliance Issue Found on Your Website - ${formatViolationType(params.violationType)}`,
        html,
    });
}

/**
 * Send a compliance block email to a merchant.
 * Informs them that services have been suspended due to a compliance violation.
 */
export async function sendComplianceBlockEmail(params: ComplianceEmailParams): Promise<void> {
    const transporter = getTransporter();

    const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5;">
    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #ffffff; border-radius: 8px; padding: 32px; border: 2px solid #dc2626;">
            <div style="text-align: center; margin-bottom: 24px;">
                <div style="display: inline-block; background-color: #dc2626; color: #ffffff; padding: 8px 16px; border-radius: 4px; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">
                    Services Suspended
                </div>
                <h1 style="color: #dc2626; font-size: 20px; margin: 16px 0 0 0;">Compliance Violation - Immediate Action Required</h1>
            </div>

            <p style="color: #374151; font-size: 14px; line-height: 1.6;">
                Dear ${params.merchantName},
            </p>

            <p style="color: #374151; font-size: 14px; line-height: 1.6;">
                Due to a compliance violation found on your website, we have <strong>suspended your shipping privileges, held your funds, and paused all pending orders</strong> until the issue is resolved.
            </p>

            <div style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 6px; padding: 16px; margin: 20px 0;">
                <p style="color: #991b1b; font-size: 13px; font-weight: 600; margin: 0 0 8px 0;">
                    Violation: ${formatViolationType(params.violationType)}
                </p>
                <p style="color: #991b1b; font-size: 13px; margin: 0 0 8px 0;">
                    Page: <a href="${params.pageUrl}" style="color: #1d4ed8;">${params.pageUrl}</a>
                </p>
                <p style="color: #374151; font-size: 13px; margin: 0;">
                    ${params.description}
                </p>
            </div>

            <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 16px; margin: 20px 0;">
                <p style="color: #6b7280; font-size: 12px; font-weight: 600; margin: 0 0 8px 0; text-transform: uppercase;">
                    Content Flagged
                </p>
                <p style="color: #374151; font-size: 13px; margin: 0; font-style: italic;">
                    "${params.violatingText}"
                </p>
            </div>

            ${params.suggestedFix ? `
            <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 6px; padding: 16px; margin: 20px 0;">
                <p style="color: #166534; font-size: 12px; font-weight: 600; margin: 0 0 8px 0; text-transform: uppercase;">
                    Required Change
                </p>
                <p style="color: #374151; font-size: 13px; margin: 0;">
                    "${params.suggestedFix}"
                </p>
            </div>
            ` : ''}

            <div style="background-color: #fffbeb; border: 1px solid #fde68a; border-radius: 6px; padding: 16px; margin: 20px 0;">
                <p style="color: #92400e; font-size: 13px; font-weight: 600; margin: 0 0 8px 0;">
                    What has been suspended:
                </p>
                <ul style="color: #374151; font-size: 13px; margin: 0; padding-left: 20px;">
                    <li>All shipping has been halted</li>
                    <li>Funds in your wallet are held</li>
                    <li>Pending orders have been placed on compliance hold</li>
                </ul>
            </div>

            <p style="color: #374151; font-size: 14px; line-height: 1.6;">
                <strong>To restore your services:</strong> Remove or correct the non-compliant content on your website, then contact our compliance team for re-review. Services will be restored once the violations are resolved.
            </p>

            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">

            <p style="color: #9ca3af; font-size: 12px; text-align: center;">
                WhiteLabel Peptides Platform - Compliance Team<br>
                This is an automated compliance enforcement notice.
            </p>
        </div>
    </div>
</body>
</html>`;

    await transporter.sendMail({
        from: getFromAddress(),
        to: params.to,
        subject: `[URGENT] Services Suspended - Compliance Violation Detected`,
        html,
    });
}
