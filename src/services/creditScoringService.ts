import { supabase } from '@/lib/supabase'
import { logActivity } from './auditService'
import { createNotification } from './notificationService'
import { formatCurrency } from '@/lib/utils'

// Types
export interface CreditScoreBreakdown {
    paymentHistory: { score: number; maxScore: 40; avgDaysToPay: number }
    orderVolume: { score: number; maxScore: 30; totalLast6Months: number }
    relationshipAge: { score: number; maxScore: 20; monthsActive: number }
    defaultHistory: { score: number; maxScore: 10; overdueCount: number }
}

export interface CreditScoreResult {
    customerId: string
    customerName: string
    totalScore: number          // 0-100
    recommendedLimit: number    // auto calculated
    currentLimit: number
    riskCategory: 'low' | 'medium' | 'high' | 'no_data'
    breakdown: CreditScoreBreakdown
    lastCalculated: string
}

export async function calculateCreditScore(customerId: string): Promise<CreditScoreResult> {
    // 1. Fetch Customer
    const { data: customer } = await supabase
        .from('customers')
        .select('name, credit_limit, created_at')
        .eq('id', customerId)
        .maybeSingle()

    if (!customer) {
        throw new Error('Customer not found')
    }

    // Initialize Breakdown
    const breakdown: CreditScoreBreakdown = {
        paymentHistory: { score: 0, maxScore: 40, avgDaysToPay: 0 },
        orderVolume: { score: 0, maxScore: 30, totalLast6Months: 0 },
        relationshipAge: { score: 0, maxScore: 20, monthsActive: 0 },
        defaultHistory: { score: 0, maxScore: 10, overdueCount: 0 }
    }

    // STEP 1: Payment History (40 pts)
    const { data: paidInvoices } = await supabase
        .from('invoices')
        .select('invoice_date, due_date, paid_amount, total_amount, payment_date:payments(payment_date)')
        .eq('customer_id', customerId)
        .in('status', ['paid', 'partial'])

    // Let's fetch payments properly
    const { data: payments } = await supabase
        .from('payments')
        .select('payment_date, invoice_id, invoices(invoice_date)')
        .eq('customer_id', customerId)

    if (payments && payments.length > 0) {
        let totalDays = 0
        let count = 0

        payments.forEach(pay => {
            const invoice = pay.invoices as any
            if (invoice?.invoice_date && pay.payment_date) {
                const start = new Date(invoice.invoice_date).getTime()
                const end = new Date(pay.payment_date).getTime()
                const days = (end - start) / (1000 * 3600 * 24)
                totalDays += Math.max(0, days) // minimal 0
                count++
            }
        })

        const avgDays = count > 0 ? totalDays / count : 0
        breakdown.paymentHistory.avgDaysToPay = Math.round(avgDays)

        if (avgDays < 15) breakdown.paymentHistory.score = 40
        else if (avgDays <= 30) breakdown.paymentHistory.score = 25
        else if (avgDays <= 45) breakdown.paymentHistory.score = 10
        else breakdown.paymentHistory.score = 0
    }

    // STEP 2: Order Volume (30 pts)
    const sixMonthsAgo = new Date()
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

    const { data: recentInvoices } = await supabase
        .from('invoices')
        .select('total_amount')
        .eq('customer_id', customerId)
        .gte('invoice_date', sixMonthsAgo.toISOString().split('T')[0])

    const totalLast6Months = recentInvoices?.reduce((sum, inv) => sum + (Number(inv.total_amount) || 0), 0) || 0
    breakdown.orderVolume.totalLast6Months = totalLast6Months

    if (totalLast6Months >= 50000) breakdown.orderVolume.score = 30
    else if (totalLast6Months >= 25000) breakdown.orderVolume.score = 20
    else if (totalLast6Months >= 10000) breakdown.orderVolume.score = 10
    else breakdown.orderVolume.score = 5

    // STEP 3: Relationship Age (20 pts)
    const created = new Date(customer.created_at).getTime()
    const now = new Date().getTime()
    const monthsActive = (now - created) / (1000 * 3600 * 24 * 30.44) // approx month
    breakdown.relationshipAge.monthsActive = Math.floor(monthsActive)

    if (monthsActive > 12) breakdown.relationshipAge.score = 20
    else if (monthsActive >= 6) breakdown.relationshipAge.score = 15
    else if (monthsActive >= 3) breakdown.relationshipAge.score = 10
    else breakdown.relationshipAge.score = 5

    // STEP 4: Default History (10 pts)
    const { count: overdueCount } = await supabase
        .from('invoices')
        .select('id', { count: 'exact', head: true })
        .eq('customer_id', customerId)
        .eq('status', 'overdue')

    const overdue = overdueCount || 0
    breakdown.defaultHistory.overdueCount = overdue

    if (overdue === 0) breakdown.defaultHistory.score = 10
    else if (overdue <= 2) breakdown.defaultHistory.score = 5
    else breakdown.defaultHistory.score = 0

    // TOTAL SCORE
    const totalScore =
        breakdown.paymentHistory.score +
        breakdown.orderVolume.score +
        breakdown.relationshipAge.score +
        breakdown.defaultHistory.score

    // Risk Category
    let riskCategory: CreditScoreResult['riskCategory'] = 'high'

    const { count: totalInvoices } = await supabase
        .from('invoices')
        .select('id', { count: 'exact', head: true })
        .eq('customer_id', customerId)

    if (!totalInvoices || totalInvoices === 0) {
        riskCategory = 'no_data'
    } else {
        if (totalScore >= 80) riskCategory = 'low'
        else if (totalScore >= 50) riskCategory = 'medium'
        else riskCategory = 'high'
    }

    // Recommended Limit
    let recommendedLimit = 0
    if (totalScore >= 90) recommendedLimit = 200000
    else if (totalScore >= 75) recommendedLimit = 100000
    else if (totalScore >= 60) recommendedLimit = 50000
    else if (totalScore >= 45) recommendedLimit = 25000
    else if (totalScore >= 30) recommendedLimit = 10000
    else recommendedLimit = 0

    return {
        customerId,
        customerName: customer.name,
        totalScore,
        recommendedLimit,
        currentLimit: Number(customer.credit_limit) || 0,
        riskCategory,
        breakdown,
        lastCalculated: new Date().toISOString()
    }
}

export async function getAllCustomerScores(): Promise<CreditScoreResult[]> {
    const { data: customers } = await supabase
        .from('customers')
        .select('id')

    if (!customers || customers.length === 0) return []

    const results = await Promise.all(
        customers.map(c =>
            calculateCreditScore(c.id).catch(() => null)
        )
    )

    return results
        .filter((r): r is CreditScoreResult => r !== null)
        .sort((a, b) => b.totalScore - a.totalScore)
}

export async function applyRecommendedLimit(
    customerId: string,
    recommendedLimit: number
): Promise<void> {
    const { error } = await supabase
        .from('customers')
        .update({ credit_limit: recommendedLimit })
        .eq('id', customerId)

    if (error) throw error

    // Log & Notify
    logActivity({
        action: 'customer.credit_limit_updated',
        entity_type: 'customer',
        entity_id: customerId,
        details: { action: 'credit_limit_applied', newLimit: recommendedLimit }
    })

    const { data: { session } } = await supabase.auth.getSession()
    if (session?.user) {
        createNotification({
            user_id: session.user.id,
            title: 'Credit Limit Updated',
            message: `Credit limit updated to ${formatCurrency(recommendedLimit)}`,
            type: 'success'
        })
    }
}
