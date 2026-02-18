import { useState, useEffect } from 'react'
import {
    FileText, Download, TrendingUp, Calendar, Filter,
    BarChart3, PieChart, ArrowUpRight, ArrowDownRight,
    CreditCard, DollarSign, Shield
} from 'lucide-react'
import {
    format, startOfMonth, endOfMonth, subMonths,
    startOfYear, endOfYear, addMonths
} from 'date-fns'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { PageHeader } from '@/components/shared/PageHeader'
import {
    getGSTR1Data, getHSNSummary, getGSTR3BSummary, exportGSTR1CSV,
    type GSTRSummary, type GSTR1Invoice, type HSNSummary, type GSTR3BSummary
} from '@/services/gstService'
import { formatCurrency } from '@/lib/utils'
import { toast } from 'sonner'
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
    Legend, ResponsiveContainer
} from 'recharts'

export default function GSTReportsPage() {
    const [activeTab, setActiveTab] = useState<'gstr1' | 'gstr3b' | 'analysis'>('gstr1')
    const [subTab, setSubTab] = useState<'b2b' | 'hsn'>('b2b')
    const [selectedDate, setSelectedDate] = useState(new Date())
    const [loading, setLoading] = useState(false)

    // Data States
    const [gstr1Data, setGstr1Data] = useState<{ summary: GSTRSummary | null, invoices: GSTR1Invoice[] }>({ summary: null, invoices: [] })
    const [hsnData, setHsnData] = useState<HSNSummary[]>([])
    const [gstr3bData, setGstr3bData] = useState<GSTR3BSummary | null>(null)

    // Derived dates
    const fromDate = startOfMonth(selectedDate).toISOString()
    const toDate = endOfMonth(selectedDate).toISOString()
    const monthLabel = format(selectedDate, 'MMMM yyyy')

    useEffect(() => {
        fetchData()
    }, [selectedDate, activeTab])

    const fetchData = async () => {
        setLoading(true)
        try {
            if (activeTab === 'gstr1') {
                const [gstr1, hsn] = await Promise.all([
                    getGSTR1Data(fromDate, toDate),
                    getHSNSummary(fromDate, toDate)
                ])
                setGstr1Data(gstr1)
                setHsnData(hsn)
            } else if (activeTab === 'gstr3b') {
                const gstr3b = await getGSTR3BSummary(fromDate, toDate)
                setGstr3bData(gstr3b)
            }
            // Analysis data could be fetched here too or reused
        } catch (error) {
            console.error(error)
            toast.error('Failed to fetch GST data')
        } finally {
            setLoading(false)
        }
    }

    const handleMonthChange = (offset: number) => {
        setSelectedDate(prev => addMonths(prev, offset))
    }

    const renderGSTR1 = () => (
        <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="p-4 border-l-4 border-l-blue-500">
                    <p className="text-xs text-gray-500 uppercase font-bold">Total Invoices</p>
                    <p className="text-2xl font-bold mt-1 text-gray-900 dark:text-white">
                        {gstr1Data.summary?.totalInvoices || 0}
                    </p>
                </Card>
                <Card className="p-4 border-l-4 border-l-amber-500">
                    <p className="text-xs text-gray-500 uppercase font-bold">Taxable Value</p>
                    <p className="text-2xl font-bold mt-1 text-gray-900 dark:text-white">
                        {formatCurrency(gstr1Data.summary?.totalTaxableValue || 0)}
                    </p>
                </Card>
                <Card className="p-4 border-l-4 border-l-green-500">
                    <p className="text-xs text-gray-500 uppercase font-bold">Total Tax Liability</p>
                    <p className="text-2xl font-bold mt-1 text-green-600 dark:text-green-400">
                        {formatCurrency(gstr1Data.summary?.totalTax || 0)}
                    </p>
                </Card>
                <Card className="p-4 border-l-4 border-l-purple-500">
                    <p className="text-xs text-gray-500 uppercase font-bold">Total Value</p>
                    <p className="text-2xl font-bold mt-1 text-gray-900 dark:text-white">
                        {formatCurrency(gstr1Data.summary?.totalValue || 0)}
                    </p>
                </Card>
            </div>

            {/* Sub Tabs */}
            <div className="flex items-center gap-4 border-b border-gray-200 dark:border-dark-300">
                <button
                    onClick={() => setSubTab('b2b')}
                    className={`pb-2 px-1 text-sm font-medium transition-colors ${subTab === 'b2b'
                        ? 'border-b-2 border-brand-500 text-brand-600 dark:text-brand-400'
                        : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
                        }`}
                >
                    B2B Invoices
                </button>
                <button
                    onClick={() => setSubTab('hsn')}
                    className={`pb-2 px-1 text-sm font-medium transition-colors ${subTab === 'hsn'
                        ? 'border-b-2 border-brand-500 text-brand-600 dark:text-brand-400'
                        : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
                        }`}
                >
                    HSN Summary
                </button>
                <div className="ml-auto pb-2">
                    <Button
                        size="sm"
                        variant="secondary"
                        className="bg-amber-100 text-amber-700 hover:bg-amber-200 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-900/50"
                        onClick={() => exportGSTR1CSV(gstr1Data.invoices)}
                        disabled={gstr1Data.invoices.length === 0}
                    >
                        <Download className="w-4 h-4 mr-2" />
                        Download CSV
                    </Button>
                </div>
            </div>

            {/* Content */}
            <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                    {subTab === 'b2b' ? (
                        <table className="w-full text-sm text-left">
                            <thead className="bg-gray-50 dark:bg-dark-200 text-gray-500 font-medium">
                                <tr>
                                    <th className="p-3">Inv No.</th>
                                    <th className="p-3">Date</th>
                                    <th className="p-3">Customer</th>
                                    <th className="p-3">GSTIN</th>
                                    <th className="p-3 text-right">Taxable</th>
                                    <th className="p-3 text-right">CGST</th>
                                    <th className="p-3 text-right">SGST</th>
                                    <th className="p-3 text-right">IGST</th>
                                    <th className="p-3 text-right">Total</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-dark-300">
                                {gstr1Data.invoices.length === 0 ? (
                                    <tr>
                                        <td colSpan={9} className="p-8 text-center text-gray-500">No invoices found for this period</td>
                                    </tr>
                                ) : (
                                    gstr1Data.invoices.map((inv, idx) => (
                                        <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-dark-200/50">
                                            <td className="p-3 font-medium">{inv.invoiceNumber}</td>
                                            <td className="p-3">{format(new Date(inv.invoiceDate), 'dd MMM')}</td>
                                            <td className="p-3">{inv.customerName}</td>
                                            <td className="p-3 font-mono text-xs">{inv.customerGSTIN}</td>
                                            <td className="p-3 text-right">{formatCurrency(inv.taxableValue)}</td>
                                            <td className="p-3 text-right">{formatCurrency(inv.cgst)}</td>
                                            <td className="p-3 text-right">{formatCurrency(inv.sgst)}</td>
                                            <td className="p-3 text-right">{formatCurrency(inv.igst)}</td>
                                            <td className="p-3 text-right font-medium">{formatCurrency(inv.totalTax)}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    ) : (
                        <table className="w-full text-sm text-left">
                            <thead className="bg-gray-50 dark:bg-dark-200 text-gray-500 font-medium">
                                <tr>
                                    <th className="p-3">HSN Code</th>
                                    <th className="p-3">Description</th>
                                    <th className="p-3 text-right">Qty</th>
                                    <th className="p-3 text-right">Taxable Value</th>
                                    <th className="p-3 text-right">Total Tax</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-dark-300">
                                {hsnData.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="p-8 text-center text-gray-500">No HSN data found</td>
                                    </tr>
                                ) : (
                                    hsnData.map((hsn, idx) => (
                                        <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-dark-200/50">
                                            <td className="p-3 font-mono">{hsn.hsnCode}</td>
                                            <td className="p-3">{hsn.description}</td>
                                            <td className="p-3 text-right">{hsn.totalQuantity}</td>
                                            <td className="p-3 text-right">{formatCurrency(hsn.totalValue)}</td>
                                            <td className="p-3 text-right font-medium">
                                                {formatCurrency(hsn.totalCGST + hsn.totalSGST + hsn.totalIGST)}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    )}
                </div>
            </Card>
        </div>
    )

    const renderGSTR3B = () => (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* 3.1 Outward Supplies */}
                <Card className="p-6 bg-white/50 dark:bg-dark-100/50 backdrop-blur-sm border-l-4 border-l-blue-500">
                    <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                        <TrendingUp className="text-blue-500" size={20} />
                        3.1 Details of Outward Supplies
                    </h3>
                    <div className="space-y-4">
                        <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-dark-200 rounded-lg">
                            <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Taxable Outward Supplies</span>
                            <span className="font-bold">{formatCurrency(gstr3bData?.outwardTaxableSupplies || 0)}</span>
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                            <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded">
                                <p className="text-xs text-blue-600 dark:text-blue-400 font-semibold mb-1">CGST</p>
                                <p className="font-mono text-sm">{formatCurrency(gstr3bData?.totalCGST || 0)}</p>
                            </div>
                            <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded">
                                <p className="text-xs text-blue-600 dark:text-blue-400 font-semibold mb-1">SGST</p>
                                <p className="font-mono text-sm">{formatCurrency(gstr3bData?.totalSGST || 0)}</p>
                            </div>
                            <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded">
                                <p className="text-xs text-blue-600 dark:text-blue-400 font-semibold mb-1">IGST</p>
                                <p className="font-mono text-sm">{formatCurrency(gstr3bData?.totalIGST || 0)}</p>
                            </div>
                        </div>
                        <div className="flex justify-between items-center pt-2 border-t border-gray-100 dark:border-dark-300">
                            <span className="font-bold text-gray-900 dark:text-white">Total Outward Tax</span>
                            <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                                {formatCurrency(gstr3bData?.outwardTaxAmount || 0)}
                            </span>
                        </div>
                    </div>
                </Card>

                {/* 4. Eligible ITC */}
                <Card className="p-6 bg-white/50 dark:bg-dark-100/50 backdrop-blur-sm border-l-4 border-l-green-500">
                    <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                        <ArrowDownRight className="text-green-500" size={20} />
                        4. Eligible ITC
                    </h3>
                    <div className="space-y-4">
                        <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-dark-200 rounded-lg">
                            <span className="text-sm font-medium text-gray-600 dark:text-gray-300">ITC from Purchases</span>
                            <span className="font-bold">{formatCurrency(gstr3bData?.totalITC || 0)}</span>
                        </div>
                        <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg flex justify-between items-center border border-green-100 dark:border-green-900/50">
                            <span className="font-bold text-green-800 dark:text-green-300">Net ITC Available</span>
                            <span className="text-xl font-bold text-green-600 dark:text-green-400">
                                {formatCurrency(gstr3bData?.totalITC || 0)}
                            </span>
                        </div>
                        <div className="text-xs text-gray-500 mt-2">
                            * Based on recorded Supplier Bills
                        </div>
                    </div>
                </Card>
            </div>

            {/* Net Tax Payable */}
            <Card className="p-8 bg-gradient-to-br from-gray-900 to-gray-800 text-white shadow-xl relative overflow-hidden">
                <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
                    <div>
                        <h2 className="text-2xl font-bold mb-2 flex items-center gap-3">
                            <Shield className="text-brand-400" />
                            Net GST Payable
                        </h2>
                        <p className="text-gray-400">Final tax liability after adjusting ITC</p>
                    </div>

                    <div className="text-right">
                        <div className="text-4xl font-mono font-bold text-brand-400 mb-2">
                            {formatCurrency(gstr3bData?.netTaxPayable || 0)}
                        </div>
                        <div className="text-sm text-gray-400 flex items-center gap-4 justify-end">
                            <span>Output Tax: {formatCurrency(gstr3bData?.outwardTaxAmount || 0)}</span>
                            <span>-</span>
                            <span>ITC: {formatCurrency(gstr3bData?.totalITC || 0)}</span>
                        </div>
                    </div>
                </div>
                {/* Background Decoration */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-brand-500/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl -ml-16 -mb-16 pointer-events-none" />
            </Card>
        </div>
    )

    return (
        <div className="space-y-6">
            <PageHeader
                title="GST Reports"
                description={`GSTR-1 & GSTR-3B Details • ${monthLabel}`}
                actions={
                    <div className="flex items-center gap-2 bg-white dark:bg-dark-100 p-1 rounded-lg border border-gray-200 dark:border-dark-300">
                        <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleMonthChange(-1)}
                        >
                            <ArrowDownRight className="w-4 h-4 rotate-180" />
                        </Button>
                        <span className="text-sm font-medium w-32 text-center">{monthLabel}</span>
                        <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleMonthChange(1)}
                            disabled={selectedDate > new Date()}
                        >
                            <ArrowDownRight className="w-4 h-4 -rotate-90" />
                        </Button>
                    </div>
                }
            />

            {/* Main Tabs */}
            <div className="border-b border-gray-200 dark:border-dark-300">
                <div className="flex gap-6">
                    <button
                        onClick={() => setActiveTab('gstr1')}
                        className={`pb-4 px-2 text-sm font-semibold transition-all relative ${activeTab === 'gstr1'
                            ? 'text-brand-600 dark:text-brand-400'
                            : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
                            }`}
                    >
                        GSTR-1 (Outward)
                        {activeTab === 'gstr1' && (
                            <span className="absolute bottom-0 left-0 w-full h-0.5 bg-brand-500 rounded-t-full" />
                        )}
                    </button>
                    <button
                        onClick={() => setActiveTab('gstr3b')}
                        className={`pb-4 px-2 text-sm font-semibold transition-all relative ${activeTab === 'gstr3b'
                            ? 'text-brand-600 dark:text-brand-400'
                            : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
                            }`}
                    >
                        GSTR-3B (Summary)
                        {activeTab === 'gstr3b' && (
                            <span className="absolute bottom-0 left-0 w-full h-0.5 bg-brand-500 rounded-t-full" />
                        )}
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="h-64 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500"></div>
                </div>
            ) : (
                <>
                    {activeTab === 'gstr1' && renderGSTR1()}
                    {activeTab === 'gstr3b' && renderGSTR3B()}
                </>
            )}
        </div>
    )
}
