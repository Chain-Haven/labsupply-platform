import Link from 'next/link';

export default function NotFound() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 p-4">
            <div className="text-center max-w-md">
                <p className="text-6xl font-bold text-gray-200 dark:text-gray-800 mb-4">404</p>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Page not found</h1>
                <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">The page you're looking for doesn't exist or has been moved.</p>
                <Link href="/" className="px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors text-sm font-medium">Go Home</Link>
            </div>
        </div>
    );
}
