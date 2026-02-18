import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import { MobileHeader } from './MobileHeader'
import Breadcrumbs from '../shared/Breadcrumbs'

export function AppShell() {
    // Mobile sidebar state
    const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)

    return (
        <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-dark">
            {/* Desktop Sidebar - Always visible on desktop */}
            <div className="hidden lg:block">
                <Sidebar />
            </div>

            {/* Mobile Sidebar - Drawer that slides in */}
            <Sidebar 
                isMobile={true}
                mobileOpen={mobileSidebarOpen}
                onMobileClose={() => setMobileSidebarOpen(false)}
            />

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Mobile Header - Only visible on mobile */}
                <MobileHeader onMenuClick={() => setMobileSidebarOpen(true)} />

                {/* Desktop Topbar - Only visible on desktop */}
                <div className="hidden lg:block">
                    <Topbar />
                </div>

                {/* Main Content */}
                <main className="flex-1 overflow-y-auto p-4 lg:p-6 bg-gray-50 dark:bg-dark">
                    <Breadcrumbs />
                    <Outlet />
                </main>
            </div>
        </div>
    )
}
