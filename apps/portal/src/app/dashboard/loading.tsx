export default function DashboardLoading() {
    return (
        <div className="space-y-6 animate-pulse p-6">
            <div className="h-8 bg-gray-200 dark:bg-gray-800 rounded w-48" />
            <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
                {[...Array(4)].map((_, i) => (
                    <div key={i} className="h-32 bg-gray-200 dark:bg-gray-800 rounded-xl" />
                ))}
            </div>
            <div className="h-64 bg-gray-200 dark:bg-gray-800 rounded-xl" />
        </div>
    );
}
