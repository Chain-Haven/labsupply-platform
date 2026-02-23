import { createClient } from '@supabase/supabase-js';

function getServiceClient() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
}

export async function generateMetadata({ params }: { params: { lot_code: string } }) {
    const lotCode = decodeURIComponent(params.lot_code);
    return {
        title: `COA - Lot ${lotCode}`,
        description: `Certificate of Analysis for lot ${lotCode}`,
    };
}

export default async function COAPage({ params }: { params: { lot_code: string } }) {
    const lotCode = decodeURIComponent(params.lot_code);
    const supabase = getServiceClient();

    const { data: lot } = await supabase
        .from('lots')
        .select('lot_code, coa_storage_path, manufactured_at, expires_at, product_id')
        .eq('lot_code', lotCode)
        .limit(1)
        .single();

    if (!lot) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-6">
                <div className="bg-white rounded-xl shadow-xl p-8 max-w-md text-center">
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">Lot Not Found</h1>
                    <p className="text-gray-500 mb-4">
                        The lot code{' '}
                        <code className="bg-gray-100 px-2 py-1 rounded text-sm">{lotCode}</code>{' '}
                        was not found in our system.
                    </p>
                    <p className="text-sm text-gray-400">
                        If you believe this is an error, please contact your supplier.
                    </p>
                </div>
            </div>
        );
    }

    const { data: product } = await supabase
        .from('products')
        .select('name, sku')
        .eq('id', lot.product_id)
        .single();

    let signedUrl: string | null = null;
    if (lot.coa_storage_path) {
        const { data } = await supabase.storage
            .from('lot-coas')
            .createSignedUrl(lot.coa_storage_path, 3600);
        signedUrl = data?.signedUrl ?? null;
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
            <div className="max-w-3xl mx-auto">
                <div className="bg-white rounded-xl shadow-xl overflow-hidden">
                    <div className="bg-gradient-to-r from-violet-600 to-indigo-600 px-8 py-6 text-white">
                        <h1 className="text-2xl font-bold">Certificate of Analysis</h1>
                        <p className="text-violet-200 mt-1">Batch Verification Report</p>
                    </div>

                    <div className="p-8 space-y-6">
                        <div className="grid grid-cols-2 gap-6">
                            <div>
                                <p className="text-sm text-gray-500 font-medium uppercase tracking-wide">
                                    Product
                                </p>
                                <p className="text-lg font-semibold text-gray-900 mt-1">
                                    {product?.name}
                                </p>
                                <p className="text-sm text-gray-500 font-mono">{product?.sku}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500 font-medium uppercase tracking-wide">
                                    Lot Code
                                </p>
                                <p className="text-lg font-semibold text-gray-900 mt-1 font-mono">
                                    {lot.lot_code}
                                </p>
                            </div>
                            {lot.manufactured_at && (
                                <div>
                                    <p className="text-sm text-gray-500 font-medium uppercase tracking-wide">
                                        Manufactured
                                    </p>
                                    <p className="text-gray-900 mt-1">
                                        {new Date(lot.manufactured_at).toLocaleDateString()}
                                    </p>
                                </div>
                            )}
                            {lot.expires_at && (
                                <div>
                                    <p className="text-sm text-gray-500 font-medium uppercase tracking-wide">
                                        Expires
                                    </p>
                                    <p className="text-gray-900 mt-1">
                                        {new Date(lot.expires_at).toLocaleDateString()}
                                    </p>
                                </div>
                            )}
                        </div>

                        {signedUrl ? (
                            <div>
                                <p className="text-sm text-gray-500 font-medium uppercase tracking-wide mb-3">
                                    Analysis Report
                                </p>
                                <div
                                    className="border border-gray-200 rounded-lg overflow-hidden"
                                    style={{ height: '600px' }}
                                >
                                    <iframe
                                        src={signedUrl}
                                        className="w-full h-full"
                                        title="Certificate of Analysis"
                                    />
                                </div>
                                <div className="mt-3 text-center">
                                    <a
                                        href={signedUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors text-sm font-medium"
                                    >
                                        Download COA PDF
                                    </a>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-8 border border-dashed border-gray-300 rounded-lg">
                                <p className="text-gray-500">
                                    No COA document has been uploaded for this lot yet.
                                </p>
                            </div>
                        )}
                    </div>

                    <div className="bg-gray-50 px-8 py-4 border-t">
                        <p className="text-xs text-gray-400 text-center">
                            FOR RESEARCH USE ONLY. NOT FOR HUMAN CONSUMPTION. Products are intended
                            for laboratory research purposes only.
                        </p>
                        <p className="text-xs text-gray-400 text-center mt-1">
                            WhiteLabel Peptides Platform
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
