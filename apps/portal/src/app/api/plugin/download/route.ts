import { NextResponse } from 'next/server';
import { readFileSync, existsSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import JSZip from 'jszip';

// This endpoint serves the WooCommerce plugin as a ZIP download
export async function GET() {
    try {
        const zip = new JSZip();
        const pluginDir = join(process.cwd(), '..', '..', 'woocommerce-plugin', 'labsupply-fulfillment');

        // Function to recursively add files to zip
        function addFilesToZip(dir: string, zipFolder: typeof zip) {
            if (!existsSync(dir)) {
                return;
            }

            const files = readdirSync(dir);

            for (const file of files) {
                const filePath = join(dir, file);
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
        const pluginFolder = zip.folder('labsupply-fulfillment');
        if (pluginFolder && existsSync(pluginDir)) {
            addFilesToZip(pluginDir, pluginFolder);
        } else {
            // Return a placeholder response if plugin doesn't exist
            return new NextResponse(
                'Plugin files not found. Please build the plugin first.',
                { status: 404 }
            );
        }

        // Generate the ZIP file
        const zipContent = await zip.generateAsync({ type: 'nodebuffer' });

        return new NextResponse(zipContent, {
            headers: {
                'Content-Type': 'application/zip',
                'Content-Disposition': 'attachment; filename="labsupply-fulfillment.zip"',
            },
        });
    } catch (error) {
        console.error('Plugin download error:', error);
        return NextResponse.json(
            { error: 'Failed to generate plugin download' },
            { status: 500 }
        );
    }
}
