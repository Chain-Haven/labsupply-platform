import { NextResponse } from 'next/server';
import { readFileSync, existsSync, readdirSync, statSync } from 'fs';
import path from 'path';
import JSZip from 'jszip';
import { createRouteHandlerClient } from '@/lib/supabase-server';

// This endpoint serves the WooCommerce plugin as a ZIP download
export async function GET() {
    // Require authenticated session (merchant or admin)
    const supabase = createRouteHandlerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
        return NextResponse.json({ error: 'Authentication required to download the plugin.' }, { status: 401 });
    }

    try {
        const zip = new JSZip();
        const pluginDir = path.resolve(process.cwd(), '..', '..', 'woocommerce-plugin', 'wlp-fulfillment');
        const pluginDirBoundary = pluginDir.endsWith(path.sep) ? pluginDir : pluginDir + path.sep;

        // Function to recursively add files to zip
        function addFilesToZip(dir: string, zipFolder: typeof zip) {
            if (!existsSync(dir)) {
                return;
            }

            const files = readdirSync(dir);

            for (const file of files) {
                const filePath = path.join(dir, file);
                const resolvedPath = path.resolve(filePath);
                if (resolvedPath !== pluginDir && !resolvedPath.startsWith(pluginDirBoundary)) {
                    throw new Error('INVALID_PATH');
                }

                const stat = statSync(filePath);

                if (stat.isDirectory()) {
                    addFilesToZip(filePath, zipFolder.folder(file)!);
                } else {
                    const content = readFileSync(filePath);
                    zipFolder.file(file, content);
                }
            }
        }

        // Add the plugin folder to the ZIP
        const pluginFolder = zip.folder('wlp-fulfillment');
        if (pluginFolder && existsSync(pluginDir)) {
            addFilesToZip(pluginDir, pluginFolder);
        } else {
            // Return a placeholder response if plugin doesn't exist
            return new NextResponse(
                'Plugin files not found. Please build the plugin first.',
                { status: 404 }
            );
        }

        // Generate the ZIP file as blob for Response compatibility
        const zipBlob = await zip.generateAsync({ type: 'blob' });

        return new Response(zipBlob, {
            headers: {
                'Content-Type': 'application/zip',
                'Content-Disposition': 'attachment; filename="wlp-fulfillment.zip"',
            },
        });
    } catch (error) {
        if (error instanceof Error && error.message === 'INVALID_PATH') {
            return NextResponse.json({ error: 'Invalid path' }, { status: 400 });
        }
        console.error('Plugin download error:', error);
        return NextResponse.json(
            { error: 'Failed to generate plugin ZIP file. Ensure the plugin has been built first (npm run build:plugin).' },
            { status: 500 }
        );
    }
}
