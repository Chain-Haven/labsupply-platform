export type PackageSlug = 'self-service' | 'brand-starter' | 'business-in-a-box';

export interface PackageFeature {
    text: string;
    included: boolean;
}

export interface PackageDefinition {
    slug: PackageSlug;
    name: string;
    tagline: string;
    priceCents: number;
    originalPriceCents: number | null;
    isPopular: boolean;
    features: PackageFeature[];
}

export const SERVICE_PACKAGES: PackageDefinition[] = [
    {
        slug: 'self-service',
        name: 'Self-Service',
        tagline: 'Everything you need to start selling',
        priceCents: 0,
        originalPriceCents: null,
        isPopular: false,
        features: [
            { text: 'WooCommerce plugin access', included: true },
            { text: 'Full product catalog', included: true },
            { text: 'Prepaid wallet billing', included: true },
            { text: 'Standard unbranded packaging', included: true },
            { text: 'COA access for all products', included: true },
            { text: 'Real-time order tracking', included: true },
            { text: 'Multi-carrier shipping', included: true },
            { text: 'Custom label design', included: false },
            { text: 'Compliant branding guide', included: false },
            { text: 'Done-for-you store build', included: false },
        ],
    },
    {
        slug: 'brand-starter',
        name: 'Brand Starter',
        tagline: 'Launch your brand with custom labels and compliant copy',
        priceCents: 99700,
        originalPriceCents: 199700,
        isPopular: true,
        features: [
            { text: 'WooCommerce plugin access', included: true },
            { text: 'Full product catalog', included: true },
            { text: 'Prepaid wallet billing', included: true },
            { text: 'Standard unbranded packaging', included: true },
            { text: 'COA access for all products', included: true },
            { text: 'Real-time order tracking', included: true },
            { text: 'Multi-carrier shipping', included: true },
            { text: 'Custom label design (up to 10 SKUs)', included: true },
            { text: 'Compliant branding guide', included: true },
            { text: 'RUO product description templates', included: true },
            { text: 'Branded packing slips', included: true },
            { text: 'Email support', included: true },
            { text: 'Done-for-you store build', included: false },
        ],
    },
    {
        slug: 'business-in-a-box',
        name: 'Business in a Box',
        tagline: 'Done-for-you compliant store — live in 30 days',
        priceCents: 449700,
        originalPriceCents: 899700,
        isPopular: false,
        features: [
            { text: 'WooCommerce plugin access', included: true },
            { text: 'Full product catalog', included: true },
            { text: 'Prepaid wallet billing', included: true },
            { text: 'Standard unbranded packaging', included: true },
            { text: 'COA access for all products', included: true },
            { text: 'Real-time order tracking', included: true },
            { text: 'Multi-carrier shipping', included: true },
            { text: 'Custom label design (up to 10 SKUs)', included: true },
            { text: 'Compliant branding guide', included: true },
            { text: 'RUO product description templates', included: true },
            { text: 'Branded packing slips', included: true },
            { text: 'Priority support', included: true },
            { text: 'Done-for-you compliant WooCommerce store', included: true },
            { text: '11 custom-built pages', included: true },
            { text: '60+ compliant product pages with COAs', included: true },
            { text: 'Mobile-responsive design', included: true },
            { text: 'Age verification (21+)', included: true },
            { text: 'Full compliance copy review', included: true },
            { text: '30-day launch guarantee', included: true },
        ],
    },
];

export function formatPrice(cents: number): string {
    if (cents === 0) return 'Free';
    return `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export function getPackageBySlug(slug: string): PackageDefinition | undefined {
    return SERVICE_PACKAGES.find((p) => p.slug === slug);
}
