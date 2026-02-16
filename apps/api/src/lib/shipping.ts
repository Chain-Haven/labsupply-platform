/**
 * WhiteLabel Peptides API - Shipping Adapter Interface
 * Abstract interface for shipping providers with stub implementation
 */

export interface ShippingAddress {
    name: string;
    company?: string;
    street1: string;
    street2?: string;
    city: string;
    state: string;
    zip: string;
    country: string;
    phone?: string;
    email?: string;
}

export interface PackageDimensions {
    length: number;
    width: number;
    height: number;
    weight: number;
    unit: 'oz' | 'lb' | 'g' | 'kg';
    dimensionUnit: 'in' | 'cm';
}

export interface ShippingRate {
    carrier: string;
    service: string;
    rate: number;
    currency: string;
    deliveryDays?: number;
    deliveryDate?: string;
}

export interface ShippingLabel {
    trackingNumber: string;
    trackingUrl: string;
    labelUrl: string;
    labelFormat: 'PDF' | 'PNG' | 'ZPL';
    rate: number;
    carrier: string;
    service: string;
}

export interface AddressValidationResult {
    valid: boolean;
    correctedAddress?: ShippingAddress;
    messages?: string[];
}

/**
 * Abstract shipping provider interface
 */
export interface ShippingProvider {
    name: string;

    /**
     * Validate a shipping address
     */
    validateAddress(address: ShippingAddress): Promise<AddressValidationResult>;

    /**
     * Get shipping rates for a package
     */
    getRates(
        from: ShippingAddress,
        to: ShippingAddress,
        parcel: PackageDimensions
    ): Promise<ShippingRate[]>;

    /**
     * Purchase a shipping label
     */
    buyLabel(
        from: ShippingAddress,
        to: ShippingAddress,
        parcel: PackageDimensions,
        carrier: string,
        service: string
    ): Promise<ShippingLabel>;

    /**
     * Get tracking information
     */
    getTracking(trackingNumber: string, carrier: string): Promise<{
        status: string;
        estimatedDelivery?: string;
        events: Array<{
            timestamp: string;
            location: string;
            description: string;
        }>;
    }>;

    /**
     * Void/refund a label
     */
    voidLabel(trackingNumber: string): Promise<boolean>;
}

// ============================================================================
// Stub Implementation (for development/testing)
// ============================================================================

export class StubShippingProvider implements ShippingProvider {
    name = 'stub';

    async validateAddress(address: ShippingAddress): Promise<AddressValidationResult> {
        // Simulate validation - always valid for testing
        console.log('[StubShipping] Validating address:', address.street1);
        return {
            valid: true,
            correctedAddress: address,
        };
    }

    async getRates(
        from: ShippingAddress,
        to: ShippingAddress,
        parcel: PackageDimensions
    ): Promise<ShippingRate[]> {
        console.log('[StubShipping] Getting rates for', parcel.weight, parcel.unit);

        // Return mock rates
        return [
            {
                carrier: 'USPS',
                service: 'Priority Mail',
                rate: 895,
                currency: 'USD',
                deliveryDays: 2,
            },
            {
                carrier: 'USPS',
                service: 'First-Class',
                rate: 495,
                currency: 'USD',
                deliveryDays: 5,
            },
            {
                carrier: 'UPS',
                service: 'Ground',
                rate: 1095,
                currency: 'USD',
                deliveryDays: 5,
            },
            {
                carrier: 'FedEx',
                service: 'Express Saver',
                rate: 1595,
                currency: 'USD',
                deliveryDays: 3,
            },
        ];
    }

    async buyLabel(
        from: ShippingAddress,
        to: ShippingAddress,
        parcel: PackageDimensions,
        carrier: string,
        service: string
    ): Promise<ShippingLabel> {
        console.log(`[StubShipping] Buying ${carrier} ${service} label`);

        // Generate mock label
        const trackingNumber = `STUB${Date.now()}${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

        return {
            trackingNumber,
            trackingUrl: `https://track.example.com/${trackingNumber}`,
            labelUrl: `https://labels.example.com/${trackingNumber}.pdf`,
            labelFormat: 'PDF',
            rate: 895, // $8.95
            carrier,
            service,
        };
    }

    async getTracking(trackingNumber: string, carrier: string) {
        console.log(`[StubShipping] Getting tracking for ${trackingNumber}`);

        return {
            status: 'in_transit',
            estimatedDelivery: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
            events: [
                {
                    timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
                    location: 'Origin Facility',
                    description: 'Package picked up',
                },
                {
                    timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
                    location: 'Regional Hub',
                    description: 'In transit to destination',
                },
            ],
        };
    }

    async voidLabel(trackingNumber: string): Promise<boolean> {
        console.log(`[StubShipping] Voiding label ${trackingNumber}`);
        return true;
    }
}

// ============================================================================
// EasyPost Implementation (optional - requires EASYPOST_API_KEY)
// ============================================================================

export class EasyPostShippingProvider implements ShippingProvider {
    name = 'easypost';
    private apiKey: string;
    private baseUrl = 'https://api.easypost.com/v2';

    constructor(apiKey: string) {
        this.apiKey = apiKey;
    }

    private async request(
        method: string,
        endpoint: string,
        body?: unknown
    ): Promise<unknown> {
        const response = await fetch(`${this.baseUrl}${endpoint}`, {
            method,
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Basic ${Buffer.from(this.apiKey + ':').toString('base64')}`,
            },
            body: body ? JSON.stringify(body) : undefined,
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error?.message || 'EasyPost API error');
        }

        return response.json();
    }

    async validateAddress(address: ShippingAddress): Promise<AddressValidationResult> {
        try {
            const result = await this.request('POST', '/addresses', {
                address: {
                    name: address.name,
                    company: address.company,
                    street1: address.street1,
                    street2: address.street2,
                    city: address.city,
                    state: address.state,
                    zip: address.zip,
                    country: address.country,
                    phone: address.phone,
                    email: address.email,
                    verify: ['delivery'],
                },
            }) as { verifications?: { delivery?: { success: boolean } } };

            return {
                valid: result.verifications?.delivery?.success ?? false,
            };
        } catch (error) {
            return {
                valid: false,
                messages: [(error as Error).message],
            };
        }
    }

    async getRates(
        from: ShippingAddress,
        to: ShippingAddress,
        parcel: PackageDimensions
    ): Promise<ShippingRate[]> {
        const shipment = await this.request('POST', '/shipments', {
            shipment: {
                from_address: this.formatAddress(from),
                to_address: this.formatAddress(to),
                parcel: {
                    length: parcel.length,
                    width: parcel.width,
                    height: parcel.height,
                    weight: this.convertToOz(parcel.weight, parcel.unit),
                },
            },
        }) as { rates: Array<{ carrier: string; service: string; rate: string; delivery_days: number }> };

        return shipment.rates.map((rate) => ({
            carrier: rate.carrier,
            service: rate.service,
            rate: Math.round(parseFloat(rate.rate) * 100),
            currency: 'USD',
            deliveryDays: rate.delivery_days,
        }));
    }

    async buyLabel(
        from: ShippingAddress,
        to: ShippingAddress,
        parcel: PackageDimensions,
        carrier: string,
        service: string
    ): Promise<ShippingLabel> {
        // Create shipment
        const shipment = await this.request('POST', '/shipments', {
            shipment: {
                from_address: this.formatAddress(from),
                to_address: this.formatAddress(to),
                parcel: {
                    length: parcel.length,
                    width: parcel.width,
                    height: parcel.height,
                    weight: this.convertToOz(parcel.weight, parcel.unit),
                },
            },
        }) as { id: string; rates: Array<{ id: string; carrier: string; service: string; rate: string }> };

        // Find the matching rate
        const rate = shipment.rates.find(
            (r) => r.carrier === carrier && r.service === service
        );

        if (!rate) {
            throw new Error(`Rate not found for ${carrier} ${service}`);
        }

        // Buy the label
        const purchased = await this.request('POST', `/shipments/${shipment.id}/buy`, {
            rate: { id: rate.id },
        }) as {
            tracking_code: string;
            tracker: { public_url: string };
            postage_label: { label_url: string; label_file_type: string };
            selected_rate: { rate: string; carrier: string; service: string };
        };

        return {
            trackingNumber: purchased.tracking_code,
            trackingUrl: purchased.tracker.public_url,
            labelUrl: purchased.postage_label.label_url,
            labelFormat: purchased.postage_label.label_file_type.toUpperCase() as 'PDF' | 'PNG' | 'ZPL',
            rate: Math.round(parseFloat(purchased.selected_rate.rate) * 100),
            carrier: purchased.selected_rate.carrier,
            service: purchased.selected_rate.service,
        };
    }

    async getTracking(trackingNumber: string, carrier: string) {
        const tracker = await this.request('POST', '/trackers', {
            tracker: {
                tracking_code: trackingNumber,
                carrier,
            },
        }) as {
            status: string;
            est_delivery_date: string;
            tracking_details: Array<{
                datetime: string;
                tracking_location: { city: string; state: string };
                message: string;
            }>;
        };

        return {
            status: tracker.status,
            estimatedDelivery: tracker.est_delivery_date,
            events: tracker.tracking_details.map((detail) => ({
                timestamp: detail.datetime,
                location: `${detail.tracking_location.city}, ${detail.tracking_location.state}`,
                description: detail.message,
            })),
        };
    }

    async voidLabel(trackingNumber: string): Promise<boolean> {
        // EasyPost refund endpoint would be called here
        console.log(`[EasyPost] Void label ${trackingNumber} - implement refund API`);
        return true;
    }

    private formatAddress(addr: ShippingAddress) {
        return {
            name: addr.name,
            company: addr.company,
            street1: addr.street1,
            street2: addr.street2,
            city: addr.city,
            state: addr.state,
            zip: addr.zip,
            country: addr.country,
            phone: addr.phone,
            email: addr.email,
        };
    }

    private convertToOz(weight: number, unit: string): number {
        switch (unit) {
            case 'oz':
                return weight;
            case 'lb':
                return weight * 16;
            case 'g':
                return weight * 0.035274;
            case 'kg':
                return weight * 35.274;
            default:
                return weight;
        }
    }
}

// ============================================================================
// Provider Factory
// ============================================================================

let shippingProvider: ShippingProvider | null = null;

export function getShippingProvider(): ShippingProvider {
    if (!shippingProvider) {
        const provider = process.env.SHIPPING_PROVIDER || 'stub';
        const easypostKey = process.env.EASYPOST_API_KEY;

        if (provider === 'easypost' && easypostKey) {
            shippingProvider = new EasyPostShippingProvider(easypostKey);
        } else {
            shippingProvider = new StubShippingProvider();
        }

        console.log(`[Shipping] Using provider: ${shippingProvider.name}`);
    }

    return shippingProvider;
}

// Default origin address (supplier warehouse)
export function getOriginAddress(): ShippingAddress {
    return {
        name: process.env.SHIPPING_ORIGIN_NAME || 'WhiteLabel Peptides Fulfillment',
        company: process.env.SHIPPING_ORIGIN_COMPANY || 'Peptide Technologies',
        street1: process.env.SHIPPING_ORIGIN_STREET1 || '123 Warehouse Way',
        street2: process.env.SHIPPING_ORIGIN_STREET2,
        city: process.env.SHIPPING_ORIGIN_CITY || 'Las Vegas',
        state: process.env.SHIPPING_ORIGIN_STATE || 'NV',
        zip: process.env.SHIPPING_ORIGIN_ZIP || '89101',
        country: process.env.SHIPPING_ORIGIN_COUNTRY || 'US',
        phone: process.env.SHIPPING_ORIGIN_PHONE,
    };
}
