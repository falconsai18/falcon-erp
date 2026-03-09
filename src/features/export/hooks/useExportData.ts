import { useEffect, useCallback } from 'react'
import { useExportStore } from '../store/exportStore'

export function useExportDashboard() {
    const {
        dashboardStats,
        topBuyers,
        monthlyTrend,
        ordersByStatus,
        shipmentsInTransit,
        pendingDocuments,
        loading,
        error,
        fetchDashboardStats,
        fetchTopBuyers,
        fetchMonthlyTrend,
        fetchOrdersByStatusCount,
        fetchShipmentsInTransit,
        fetchPendingDocuments,
    } = useExportStore()

    const refresh = useCallback(async () => {
        await Promise.all([
            fetchDashboardStats(),
            fetchTopBuyers(5),
            fetchMonthlyTrend(12),
            fetchOrdersByStatusCount(),
            fetchShipmentsInTransit(),
            fetchPendingDocuments(),
        ])
    }, [
        fetchDashboardStats,
        fetchTopBuyers,
        fetchMonthlyTrend,
        fetchOrdersByStatusCount,
        fetchShipmentsInTransit,
        fetchPendingDocuments,
    ])

    useEffect(() => {
        refresh()
    }, [refresh])

    return {
        dashboardStats,
        topBuyers,
        monthlyTrend,
        ordersByStatus,
        shipmentsInTransit,
        pendingDocuments,
        loading,
        error,
        refresh,
    }
}

export function useExportCustomers(activeOnly = true) {
    const { customers, loading, error, fetchCustomers } = useExportStore()

    useEffect(() => {
        fetchCustomers({ is_active: activeOnly })
    }, [fetchCustomers, activeOnly])

    return { customers, loading, error, refresh: () => fetchCustomers({ is_active: activeOnly }) }
}

import type { ExportOrderFilters } from '../types/export.types'

export function useExportOrders(filters?: ExportOrderFilters) {
    const { orders, loading, error, fetchOrders, filters: storeFilters } = useExportStore()

    useEffect(() => {
        const merged: ExportOrderFilters = filters ?? {
            status: storeFilters.status as ExportOrderFilters['status'],
            customer_id: storeFilters.customerId || undefined,
            date_range: storeFilters.dateRange.start && storeFilters.dateRange.end
                ? { start: storeFilters.dateRange.start, end: storeFilters.dateRange.end }
                : undefined,
            search: storeFilters.search || undefined,
        }
        fetchOrders(merged)
    }, [fetchOrders, filters, storeFilters.status, storeFilters.customerId, storeFilters.dateRange.start, storeFilters.dateRange.end, storeFilters.search])

    return { orders, loading, error, refresh: () => fetchOrders(filters) }
}
