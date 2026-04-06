/** Full-width skeleton while lazy route chunks load */
export function RouteLoadingFallback() {
    return (
        <div className="p-6 animate-pulse">
            <div className="h-10 w-48 bg-gray-200 dark:bg-dark-300 rounded-lg mb-6" />
            <div className="h-32 w-full bg-gray-200 dark:bg-dark-300 rounded-xl" />
        </div>
    )
}
