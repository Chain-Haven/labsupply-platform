/**
 * Compliance Web Scraping Cron
 * Runs daily at 3 AM UTC to crawl all approved merchant websites
 * and analyze them for RUO compliance violations using AI.
 */

import { inngest } from '@/lib/inngest';
import { getServiceClient } from '@/lib/supabase';
import { crawlMerchantSite } from '@/lib/compliance-crawler';
import { analyzeWithFeedback } from '@/lib/openrouter';

export const complianceScanFunction = inngest.createFunction(
    {
        id: 'compliance-scan',
        name: 'Compliance: Daily Website Scan',
        retries: 1,
        concurrency: [{ limit: 1 }],
    },
    { cron: '0 3 * * *' },
    async ({ step }) => {
        const supabase = getServiceClient();

        // Step 1: Get all approved merchants with their websites and stores
        const merchants = await step.run('get-merchants-to-scan', async () => {
            const { data, error } = await supabase
                .from('merchants')
                .select(`
                    id,
                    company_name,
                    email,
                    contact_email,
                    website_url,
                    stores (
                        id,
                        url,
                        status
                    )
                `)
                .in('status', ['approved', 'ACTIVE']);

            if (error) {
                console.error('Error fetching merchants for compliance scan:', error);
                return [];
            }

            return data || [];
        });

        if (merchants.length === 0) {
            return { message: 'No approved merchants to scan', scansCreated: 0 };
        }

        // Step 2: Build list of URLs to scan per merchant
        const scanTargets = await step.run('build-scan-targets', async () => {
            const targets: Array<{
                merchantId: string;
                storeId: string | null;
                url: string;
            }> = [];

            for (const merchant of merchants) {
                // Check if scanning is disabled for this merchant
                const { data: config } = await supabase
                    .from('compliance_scan_config')
                    .select('enabled, max_pages')
                    .eq('merchant_id', merchant.id)
                    .single();

                if (config && !config.enabled) continue;

                // Add merchant website_url
                if (merchant.website_url) {
                    targets.push({
                        merchantId: merchant.id,
                        storeId: null,
                        url: merchant.website_url,
                    });
                }

                // Add connected store URLs
                const stores = Array.isArray(merchant.stores) ? merchant.stores : [];
                for (const store of stores) {
                    if (store.url && store.status === 'CONNECTED') {
                        const storeHost = safeHostname(store.url);
                        const merchantHost = merchant.website_url ? safeHostname(merchant.website_url) : null;
                        if (storeHost !== merchantHost) {
                            targets.push({
                                merchantId: merchant.id,
                                storeId: store.id,
                                url: store.url,
                            });
                        }
                    }
                }
            }

            return targets;
        });

        if (scanTargets.length === 0) {
            return { message: 'No URLs to scan', scansCreated: 0 };
        }

        // Step 3: Process each scan target
        let totalViolations = 0;
        let totalScans = 0;

        for (const target of scanTargets) {
            await step.run(`scan-${target.merchantId}-${target.storeId || 'website'}`, async () => {
                // Create scan record
                const { data: scan, error: scanError } = await supabase
                    .from('compliance_scans')
                    .insert({
                        merchant_id: target.merchantId,
                        store_id: target.storeId,
                        scan_url: target.url,
                        status: 'running',
                        started_at: new Date().toISOString(),
                    })
                    .select('id')
                    .single();

                if (scanError || !scan) {
                    console.error(`Failed to create scan record for ${target.url}:`, scanError);
                    return;
                }

                try {
                    // Get config for max pages
                    const { data: config } = await supabase
                        .from('compliance_scan_config')
                        .select('max_pages')
                        .eq('merchant_id', target.merchantId)
                        .single();

                    const maxPages = config?.max_pages || 50;

                    // Crawl the site
                    const pages = await crawlMerchantSite(target.url, { maxPages });

                    // Get previously ignored violations for feedback
                    const { data: ignoredViolations } = await supabase
                        .from('compliance_violations')
                        .select('violating_text, violation_type, ignore_reason')
                        .eq('merchant_id', target.merchantId)
                        .eq('admin_action', 'ignored')
                        .not('ignore_reason', 'is', null)
                        .order('created_at', { ascending: false })
                        .limit(20);

                    const ignoredExamples = (ignoredViolations || []).map((v) => ({
                        violatingText: v.violating_text,
                        violationType: v.violation_type,
                        ignoreReason: v.ignore_reason!,
                    }));

                    let scanViolationCount = 0;

                    // Analyze each page
                    for (const page of pages) {
                        try {
                            const result = await analyzeWithFeedback(
                                page.textContent,
                                page.url,
                                ignoredExamples
                            );

                            if (result.violations.length > 0) {
                                const violationRows = result.violations.map((v) => ({
                                    scan_id: scan.id,
                                    merchant_id: target.merchantId,
                                    page_url: page.url,
                                    violation_type: v.type,
                                    severity: v.severity,
                                    description: v.description,
                                    violating_text: v.violatingText,
                                    suggested_fix: v.suggestedFix,
                                    admin_action: 'pending',
                                }));

                                const { error: insertError } = await supabase
                                    .from('compliance_violations')
                                    .insert(violationRows);

                                if (insertError) {
                                    console.error(`Failed to insert violations for ${page.url}:`, insertError);
                                } else {
                                    scanViolationCount += result.violations.length;
                                }
                            }
                        } catch (analysisError) {
                            console.error(`AI analysis failed for ${page.url}:`, analysisError);
                        }
                    }

                    // Update scan record with results
                    await supabase
                        .from('compliance_scans')
                        .update({
                            status: 'completed',
                            pages_crawled: pages.length,
                            violations_found: scanViolationCount,
                            completed_at: new Date().toISOString(),
                        })
                        .eq('id', scan.id);

                    totalViolations += scanViolationCount;
                    totalScans++;
                } catch (crawlError) {
                    console.error(`Scan failed for ${target.url}:`, crawlError);

                    await supabase
                        .from('compliance_scans')
                        .update({
                            status: 'failed',
                            error_message: crawlError instanceof Error ? crawlError.message : 'Unknown error',
                            completed_at: new Date().toISOString(),
                        })
                        .eq('id', scan.id);
                }
            });
        }

        // Step 4: Log audit event
        await step.run('log-audit', async () => {
            await supabase.from('audit_events').insert({
                action: 'compliance.daily_scan',
                entity_type: 'system',
                entity_id: 'compliance-scan',
                metadata: {
                    merchants_scanned: merchants.length,
                    urls_scanned: scanTargets.length,
                    scans_completed: totalScans,
                    total_violations: totalViolations,
                },
            });
        });

        return {
            merchantsScanned: merchants.length,
            urlsScanned: scanTargets.length,
            scansCompleted: totalScans,
            totalViolations,
        };
    }
);

/**
 * On-demand compliance scan triggered by admin for a specific merchant.
 */
export const complianceScanOnDemandFunction = inngest.createFunction(
    {
        id: 'compliance-scan-on-demand',
        name: 'Compliance: On-Demand Merchant Scan',
        retries: 1,
    },
    { event: 'compliance/scan-merchant' },
    async ({ event, step }) => {
        const { merchantId } = event.data;
        const supabase = getServiceClient();

        // Get merchant details
        const merchant = await step.run('get-merchant', async () => {
            const { data, error } = await supabase
                .from('merchants')
                .select(`
                    id,
                    company_name,
                    website_url,
                    stores (
                        id,
                        url,
                        status
                    )
                `)
                .eq('id', merchantId)
                .single();

            if (error || !data) {
                throw new Error(`Merchant ${merchantId} not found`);
            }
            return data;
        });

        const urls: Array<{ storeId: string | null; url: string }> = [];

        if (merchant.website_url) {
            urls.push({ storeId: null, url: merchant.website_url });
        }

        const stores = Array.isArray(merchant.stores) ? merchant.stores : [];
        for (const store of stores) {
            if (store.url && store.status === 'CONNECTED') {
                urls.push({ storeId: store.id, url: store.url });
            }
        }

        let totalViolations = 0;

        for (const target of urls) {
            await step.run(`scan-${target.storeId || 'website'}`, async () => {
                const { data: scan } = await supabase
                    .from('compliance_scans')
                    .insert({
                        merchant_id: merchantId,
                        store_id: target.storeId,
                        scan_url: target.url,
                        status: 'running',
                        started_at: new Date().toISOString(),
                    })
                    .select('id')
                    .single();

                if (!scan) return;

                try {
                    const pages = await crawlMerchantSite(target.url, { maxPages: 50 });

                    const { data: ignoredViolations } = await supabase
                        .from('compliance_violations')
                        .select('violating_text, violation_type, ignore_reason')
                        .eq('merchant_id', merchantId)
                        .eq('admin_action', 'ignored')
                        .not('ignore_reason', 'is', null)
                        .order('created_at', { ascending: false })
                        .limit(20);

                    const ignoredExamples = (ignoredViolations || []).map((v) => ({
                        violatingText: v.violating_text,
                        violationType: v.violation_type,
                        ignoreReason: v.ignore_reason!,
                    }));

                    let scanViolationCount = 0;

                    for (const page of pages) {
                        try {
                            const result = await analyzeWithFeedback(
                                page.textContent,
                                page.url,
                                ignoredExamples
                            );

                            if (result.violations.length > 0) {
                                const rows = result.violations.map((v) => ({
                                    scan_id: scan.id,
                                    merchant_id: merchantId,
                                    page_url: page.url,
                                    violation_type: v.type,
                                    severity: v.severity,
                                    description: v.description,
                                    violating_text: v.violatingText,
                                    suggested_fix: v.suggestedFix,
                                    admin_action: 'pending',
                                }));

                                await supabase.from('compliance_violations').insert(rows);
                                scanViolationCount += result.violations.length;
                            }
                        } catch (err) {
                            console.error(`Analysis error for ${page.url}:`, err);
                        }
                    }

                    await supabase
                        .from('compliance_scans')
                        .update({
                            status: 'completed',
                            pages_crawled: pages.length,
                            violations_found: scanViolationCount,
                            completed_at: new Date().toISOString(),
                        })
                        .eq('id', scan.id);

                    totalViolations += scanViolationCount;
                } catch (err) {
                    await supabase
                        .from('compliance_scans')
                        .update({
                            status: 'failed',
                            error_message: err instanceof Error ? err.message : 'Unknown error',
                            completed_at: new Date().toISOString(),
                        })
                        .eq('id', scan.id);
                }
            });
        }

        return {
            merchantId,
            urlsScanned: urls.length,
            totalViolations,
        };
    }
);

function safeHostname(url: string): string | null {
    try {
        return new URL(url.startsWith('http') ? url : `https://${url}`).hostname;
    } catch {
        return null;
    }
}
