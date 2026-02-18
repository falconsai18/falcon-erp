import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import Breadcrumbs from '../shared/Breadcrumbs'

export function AppShell() {
    return (
        <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-dark">
            <Sidebar />
            <div className="flex-1 flex flex-col overflow-hidden">
                <Topbar />
                <main className="flex-1 overflow-y-auto p-6 bg-gray-50 dark:bg-dark">
                    <Breadcrumbs />
                    <Outlet />
                </main>
            </div>
        </div>
    )
}