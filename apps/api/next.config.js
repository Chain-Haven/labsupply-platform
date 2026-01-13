/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    // API-only app, no static pages
    output: 'standalone',

    // Headers for API security
    async headers() {
        return [
            {
                source: '/v1/:path*',
                headers: [
                    { key: 'Access-Control-Allow-Credentials', value: 'true' },
                    { key: 'Access-Control-Allow-Origin', value: '*' },
                    { key: 'Access-Control-Allow-Methods', value: 'GET,POST,PUT,DELETE,OPTIONS' },
                    { key: 'Access-Control-Allow-Headers', value: 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, X-Store-Id, X-Timestamp, X-Nonce, X-Signature, Authorization' },
                ],
            },
        ];
    },
};

module.exports = nextConfig;
