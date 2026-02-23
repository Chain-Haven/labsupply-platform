/**
 * ShipStation Shipping Provider
 * Implements the ShippingProvider interface using ShipStation's REST API.
 * Docs: https://www.shipstation.com/docs/api/
 */

import type {
    ShippingProvider,
    ShippingAddress,
    PackageDimensions,
    ShippingRate,
    ShippingLabel,
    AddressValidationResult,
} from './shipping';

const SHIPSTATION_BASE_URL = 'https://ssapi.shipstation.com';

export class ShipStationShippingProvider implements ShippingProvider {
    name = 'shipstation';
    private authHeader: string;

    constructor(apiKey: string, apiSecret: string) {
        this.authHeader = `Basic ${Buffer.from(`${apiKey}:${apiSecret}`).toString('base64')}`;
    }

    private async request<T = unknown>(method: string, endpoint: string, body?: unknown, retries = 2): Promise<T> {
        const url = `${SHIPSTATION_BASE_URL}${endpoint}`;
        let lastError: Error | null = null;

        for (let attempt = 0; attempt <= retries; attempt++) {
            if (attempt > 0) {
                await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempt - 1)));
            }

            try {
                const response = await fetch(url, {
                    method,
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: this.authHeader,
                    },
                    body: body ? JSON.stringify(body) : undefined,
                    signal: AbortSignal.timeout(15000),
                });

                if (response.status === 429 || response.status >= 500) {
                    lastError = new Error(`ShipStation API error (${response.status})`);
                    continue;
                }

                if (!response.ok) {
                    const text = await response.text().catch(() => '');
                    throw new Error(`ShipStation API error (${response.status}): ${text}`);
                }

                if (response.status === 204) return {} as T;
                return response.json() as Promise<T>;
            } catch (err) {
                if ((err as Error).name === 'TimeoutError' || (err as Error).name === 'AbortError') {
                    lastError = new Error(`ShipStation API timeout on ${method} ${endpoint}`);
                    continue;
                }
                throw err;
            }
        }

        throw lastError || new Error('ShipStation API request failed after retries');
    }

    async validateAddress(address: ShippingAddress): Promise<AddressValidationResult> {
        try {
            const result = await this.request<Array<{
                addressVerified: string;
                originalAddress: Record<string, string>;
                matchedAddress?: Record<string, string>;
            }>>('POST', '/addresses/validate', {
                name: address.name,
                company: address.company || null,
                street1: address.street1,
                street2: address.street2 || null,
                city: address.city,
                state: address.state,
                postalCode: address.zip,
                country: address.country,
                phone: address.phone || null,
            });

            const entry = Array.isArray(result) ? result[0] : undefined;
            const verified = entry?.addressVerified === 'Address validated successfully';

            return {
                valid: verified ?? false,
                correctedAddress: entry?.matchedAddress ? {
                    name: address.name,
                    street1: entry.matchedAddress.street1 || address.street1,
                    street2: entry.matchedAddress.street2 || address.street2,
                    city: entry.matchedAddress.city || address.city,
                    state: entry.matchedAddress.state || address.state,
                    zip: entry.matchedAddress.postalCode || address.zip,
                    country: entry.matchedAddress.country || address.country,
                } : undefined,
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
        const result = await this.request<Array<{
            serviceName: string;
            serviceCode: string;
            shipmentCost: number;
            otherCost: number;
        }>>('POST', '/shipments/getrates', {
            carrierCode: null,
            fromPostalCode: from.zip,
            toState: to.state,
            toCountry: to.country,
            toPostalCode: to.zip,
            toCity: to.city,
            weight: {
                value: this.convertToOz(parcel.weight, parcel.unit),
                units: 'ounces',
            },
            dimensions: {
                length: parcel.length,
                width: parcel.width,
                height: parcel.height,
                units: parcel.dimensionUnit === 'cm' ? 'centimeters' : 'inches',
            },
            confirmation: 'none',
            residential: true,
        });

        return (result || []).map((r) => ({
            carrier: r.serviceCode.split('_')[0] || 'unknown',
            service: r.serviceName,
            rate: Math.round((r.shipmentCost + r.otherCost) * 100),
            currency: 'USD',
        }));
    }

    async buyLabel(
        from: ShippingAddress,
        to: ShippingAddress,
        parcel: PackageDimensions,
        carrier: string,
        service: string
    ): Promise<ShippingLabel> {
        const result = await this.request<{
            shipmentId: number;
            trackingNumber: string;
            labelData: string;
            shipmentCost: number;
            insuranceCost: number;
        }>('POST', '/shipments/createlabel', {
            carrierCode: carrier,
            serviceCode: service,
            packageCode: 'package',
            confirmation: 'none',
            shipDate: new Date().toISOString().split('T')[0],
            weight: {
                value: this.convertToOz(parcel.weight, parcel.unit),
                units: 'ounces',
            },
            dimensions: {
                length: parcel.length,
                width: parcel.width,
                height: parcel.height,
                units: parcel.dimensionUnit === 'cm' ? 'centimeters' : 'inches',
            },
            shipFrom: this.formatAddress(from),
            shipTo: this.formatAddress(to),
            testLabel: false,
        });

        return {
            trackingNumber: result.trackingNumber,
            trackingUrl: `https://track.shipstation.com/tracking/${result.trackingNumber}`,
            labelUrl: result.labelData
                ? `data:application/pdf;base64,${result.labelData}`
                : '',
            labelFormat: 'PDF',
            rate: Math.round((result.shipmentCost + result.insuranceCost) * 100),
            carrier,
            service,
        };
    }

    async getTracking(trackingNumber: string, carrier: string): Promise<{
        status: string;
        estimatedDelivery?: string;
        events: Array<{ timestamp: string; location: string; description: string }>;
    }> {
        const result = await this.request<{
            results: Array<{
                trackingNumber: string;
                statusDescription: string;
                estimatedDeliveryDate: string | null;
                trackingEvents: Array<{
                    occurredAt: string;
                    city: string;
                    state: string;
                    description: string;
                }>;
            }>;
        }>('GET', `/shipments?trackingNumber=${encodeURIComponent(trackingNumber)}`);

        const match = result.results?.[0];
        if (!match) {
            return { status: 'unknown', events: [] };
        }

        return {
            status: match.statusDescription || 'unknown',
            estimatedDelivery: match.estimatedDeliveryDate || undefined,
            events: (match.trackingEvents || []).map((e) => ({
                timestamp: e.occurredAt,
                location: [e.city, e.state].filter(Boolean).join(', '),
                description: e.description,
            })),
        };
    }

    async voidLabel(trackingNumber: string): Promise<boolean> {
        try {
            const result = await this.request<{ approved: boolean }>('POST', '/shipments/voidlabel', {
                trackingNumber,
            });
            return result.approved ?? false;
        } catch {
            return false;
        }
    }

    private formatAddress(addr: ShippingAddress) {
        return {
            name: addr.name,
            company: addr.company || null,
            street1: addr.street1,
            street2: addr.street2 || null,
            city: addr.city,
            state: addr.state,
            postalCode: addr.zip,
            country: addr.country,
            phone: addr.phone || null,
        };
    }

    private convertToOz(weight: number, unit: string): number {
        switch (unit) {
            case 'oz': return weight;
            case 'lb': return weight * 16;
            case 'g':  return weight * 0.035274;
            case 'kg': return weight * 35.274;
            default:   return weight;
        }
    }
}
