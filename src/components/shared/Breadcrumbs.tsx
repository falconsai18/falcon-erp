import { ChevronRight, Home } from 'lucide-react';
import { Link, useLocation, useParams } from 'react-router-dom';

interface BreadcrumbItem {
    label: string;
    path?: string;
}

// Check if segment looks like UUID
const isUUID = (str: string) => {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
};

// Extract entity name from document title
const getEntityNameFromTitle = () => {
    const title = document.title;
    // Pattern: "Entity Name | Falcon ERP" or "Entity Name - Falcon ERP"
    const match = title.match(/^(.+?)\s*[\|\-]\s*Falcon/);
    return match ? match[1].trim() : null;
};

export default function Breadcrumbs() {
    const location = useLocation();
    const params = useParams();

    const getBreadcrumbs = (): BreadcrumbItem[] => {
        const pathSegments = location.pathname.split('/').filter(Boolean);
        const breadcrumbs: BreadcrumbItem[] = [{ label: 'Dashboard', path: '/' }];

        const routeMap: Record<string, string> = {
            'quotes': 'Quotations',
            'sales-orders': 'Sales Orders',
            'invoices': 'Invoices',
            'challans': 'Delivery Challans',
            'credit-notes': 'Credit Notes',
            'debit-notes': 'Debit Notes',
            'purchase-orders': 'Purchase Orders',
            'grns': 'Goods Receipt Notes',
            'supplier-bills': 'Supplier Bills',
            'work-orders': 'Work Orders',
            'formulations': 'Formulations',
            'quality-checks': 'Quality Control',
            'batches': 'Batches',
            'products': 'Products',
            'raw-materials': 'Raw Materials',
            'stock-adjustments': 'Stock Adjustments',
            'customers': 'Customers',
            'suppliers': 'Suppliers',
            'reports': 'Reports',
            'settings': 'Settings',
        };

        let currentPath = '';
        pathSegments.forEach((segment, index) => {
            currentPath += `/${segment}`;

            if (routeMap[segment]) {
                breadcrumbs.push({
                    label: routeMap[segment],
                    path: index === pathSegments.length - 1 ? undefined : currentPath
                });
            } else if (isUUID(segment)) {
                // This is a UUID - try to get entity name from page title
                const entityName = getEntityNameFromTitle();
                breadcrumbs.push({
                    label: entityName || 'Details',
                    path: undefined // Detail pages are not clickable
                });
            } else {
                // Fallback for unknown segments
                breadcrumbs.push({
                    label: segment.charAt(0).toUpperCase() + segment.slice(1),
                    path: index === pathSegments.length - 1 ? undefined : currentPath
                });
            }
        });

        return breadcrumbs;
    };

    const breadcrumbs = getBreadcrumbs();

    // Don't render if only Dashboard
    if (breadcrumbs.length <= 1) return null;

    return (
        <nav className="flex items-center space-x-2 text-sm mb-4">
            {breadcrumbs.map((item, index) => (
                <div key={index} className="flex items-center">
                    {index > 0 && (
                        <ChevronRight className="w-4 h-4 mx-2 text-gray-400 dark:text-dark-500" />
                    )}
                    {item.path ? (
                        <Link
                            to={item.path}
                            className="flex items-center text-gray-600 dark:text-dark-600 hover:text-brand-600 dark:hover:text-brand-400 transition-colors"
                        >
                            {index === 0 && <Home className="w-4 h-4 mr-1" />}
                            {item.label}
                        </Link>
                    ) : (
                        <span className="flex items-center text-gray-900 dark:text-white font-medium">
                            {index === 0 && <Home className="w-4 h-4 mr-1" />}
                            {item.label}
                        </span>
                    )}
                </div>
            ))}
        </nav>
    );
}
