import { supabase } from '@/lib/supabase'
import { getCompanyInfo } from '@/services/settingsService'
import { formatCurrency, formatDate } from '@/lib/utils'

// ============ NUMBER TO WORDS (INDIAN SYSTEM) ============

export function numberToWords(num: number): string {
    if (num === 0 || isNaN(num) || num === null || num === undefined) return 'Zero'

    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
        'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen']
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']

    const numStr = Math.floor(num).toString()
    const len = numStr.length

    if (len <= 0) return ''

    const convert = (n: number): string => {
        if (n === 0) return ''
        if (n < 20) return ones[n]
        if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '')
        if (n < 1000) return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' and ' + convert(n % 100) : '')
        if (n < 100000) return convert(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 ? ' ' + convert(n % 1000) : '')
        if (n < 10000000) return convert(Math.floor(n / 100000)) + ' Lakh' + (n % 100000 ? ' ' + convert(n % 100000) : '')
        return convert(Math.floor(n / 10000000)) + ' Crore' + (n % 10000000 ? ' ' + convert(n % 10000000) : '')
    }

    const result = convert(Math.floor(num))
    return result.trim().replace(/\s+/g, ' ')
}

// ============ INVOICE PRINTING ============

export async function printInvoicePDF(invoiceId: string) {
    try {
        // 1. Fetch Data
        const { data: invoice, error: invError } = await supabase
            .from('invoices')
            .select(`
                *,
                customers(name, phone, email, gst_number, pan_number, address_line1, city, state, pincode),
                sales_orders(order_number),
                invoice_items(*, products(name, sku, hsn_code, unit_of_measure))
            `)
            .eq('id', invoiceId)
            .single()

        if (invError) throw invError
        if (!invoice) throw new Error('Invoice not found')

        // Fetch company info
        const company = await getCompanyInfo()

        // Fetch bank details
        const { data: bank } = await supabase
            .from('bank_accounts')
            .select('*')
            .eq('is_default', true)
            .limit(1)
            .maybeSingle()

        // Fetch Terms & Conditions from settings
        const { data: termsSetting } = await supabase
            .from('settings')
            .select('value')
            .eq('key', 'invoice_terms_conditions')
            .maybeSingle()

        const termsStr = termsSetting?.value || "1. Goods once sold will not be taken back.\n2. Interest @ 18% p.a. will be charged if payment is not made within the due date.\n3. Subject to jurisdiction."
        const termsHtml = termsStr.split('\n').map((line: string) => `${line}`).join('<br />')

        // Fetch invoice footer
        const { data: footerSetting } = await supabase
            .from('settings')
            .select('value')
            .eq('key', 'invoice_footer')
            .maybeSingle()

        // 2. Generate HTML
        const customer = invoice.customers
        const items = invoice.invoice_items || []
        const isInterstate = (invoice.igst_amount || 0) > 0

        // Build items table rows
        let itemsHtml = ''
        items.forEach((item: any, index: number) => {
            const product = item.products
            const productName = product?.name || '-'
            const productWithWeight = item.weight_grams && item.weight_grams > 0
                ? `${productName} (${item.weight_grams}g)`
                : productName
            const qtyDisplay = item.free_qty > 0 ? `${item.quantity}+${item.free_qty}` : `${item.quantity}`
            const subtotal = item.quantity * item.unit_price
            const discount = subtotal * (item.discount_percent || 0) / 100
            const taxable = subtotal - discount

            if (isInterstate) {
                itemsHtml += `
                <tr>
                    <td style="text-align: center; padding: 6px 3px; border: 0.5px solid #e5e7eb;">${index + 1}</td>
                    <td style="padding: 6px 3px; border: 0.5px solid #e5e7eb;"><b>${productWithWeight}</b></td>
                    <td style="text-align: center; padding: 6px 3px; border: 0.5px solid #e5e7eb;">${item.hsn_code || product?.hsn_code || '-'}</td>
                    <td style="text-align: center; padding: 6px 3px; border: 0.5px solid #e5e7eb;">${item.batch_number || ''}</td>
                    <td style="text-align: center; padding: 6px 3px; border: 0.5px solid #e5e7eb;">${qtyDisplay}</td>
                    <td style="text-align: right; padding: 6px 3px; border: 0.5px solid #e5e7eb;">Rs. ${item.unit_price.toFixed(2)}</td>
                    <td style="text-align: center; padding: 6px 3px; border: 0.5px solid #e5e7eb;">${item.discount_percent || 0}%</td>
                    <td style="text-align: right; padding: 6px 3px; border: 0.5px solid #e5e7eb;">Rs. ${taxable.toFixed(2)}</td>
                    <td style="text-align: center; padding: 6px 3px; border: 0.5px solid #e5e7eb;">${item.tax_rate || 0}%</td>
                    <td style="text-align: right; padding: 6px 3px; border: 0.5px solid #e5e7eb;">Rs. ${(item.igst_amount || 0).toFixed(2)}</td>
                    <td style="text-align: right; padding: 6px 3px; border: 0.5px solid #e5e7eb;">Rs. ${item.total_amount.toFixed(2)}</td>
                </tr>
                `
            } else {
                itemsHtml += `
                <tr>
                    <td style="text-align: center; padding: 6px 3px; border: 0.5px solid #e5e7eb;">${index + 1}</td>
                    <td style="padding: 6px 3px; border: 0.5px solid #e5e7eb;"><b>${productWithWeight}</b></td>
                    <td style="text-align: center; padding: 6px 3px; border: 0.5px solid #e5e7eb;">${item.hsn_code || product?.hsn_code || '-'}</td>
                    <td style="text-align: center; padding: 6px 3px; border: 0.5px solid #e5e7eb;">${item.batch_number || ''}</td>
                    <td style="text-align: center; padding: 6px 3px; border: 0.5px solid #e5e7eb;">${qtyDisplay}</td>
                    <td style="text-align: right; padding: 6px 3px; border: 0.5px solid #e5e7eb;">Rs. ${item.unit_price.toFixed(2)}</td>
                    <td style="text-align: center; padding: 6px 3px; border: 0.5px solid #e5e7eb;">${item.discount_percent || 0}%</td>
                    <td style="text-align: right; padding: 6px 3px; border: 0.5px solid #e5e7eb;">Rs. ${taxable.toFixed(2)}</td>
                    <td style="text-align: right; padding: 6px 3px; border: 0.5px solid #e5e7eb;">Rs. ${(item.cgst_amount || 0).toFixed(2)}</td>
                    <td style="text-align: right; padding: 6px 3px; border: 0.5px solid #e5e7eb;">Rs. ${(item.sgst_amount || 0).toFixed(2)}</td>
                    <td style="text-align: right; padding: 6px 3px; border: 0.5px solid #e5e7eb;">Rs. ${item.total_amount.toFixed(2)}</td>
                </tr>
                `
            }
        })

        // Round Off: exact value, no Math.round
        const roundOffValue = invoice.round_off || 0
        const roundOffSign = roundOffValue > 0 ? '+' : roundOffValue < 0 ? '-' : ''
        const roundOffText = `${roundOffSign}Rs. ${Math.abs(roundOffValue).toFixed(2)}`

        // Determine title based on status
        const invoiceTitle = invoice.status === 'draft' ? 'PROFORMA INVOICE' : 'TAX INVOICE'

        const renderInvoice = () => `
            <div class="invoice-container">
                <!-- TOP HEADER WITH COMPANY INFO & INVOICE TITLE -->
                <table class="header-table" style="width: 100%; margin-bottom: 12px;">
                    <tr>
                        <td width="60%" class="company-section">
                            <div class="company-name-header">${company?.name || 'Your Company'}</div>
                            <div class="company-address">
                                ${company?.address_line1 ? company.address_line1 : ''}
                                ${company?.city ? '<br/>' + company.city : ''}${company?.state ? ', ' + company.state : ''}${company?.pincode ? ' - ' + company.pincode : ''}
                            </div>
                            <div class="company-credentials">
                                ${company?.gst_number ? `<b>GSTIN: ${company.gst_number}</b>` : ''}
                                ${company?.phone ? ` | <b>Phone:</b> ${company.phone}` : ''}
                                ${company?.email ? ` | <b>Email:</b> ${company.email}` : ''}
                            </div>
                        </td>
                        <td width="40%" style="text-align: right; vertical-align: top;">
                            <div style="text-align: right; margin-bottom: 4px;">
                                <span style="font-size: 7px;">ORIGINAL [ ]  DUPLICATE [ ]  TRIPLICATE [ ]</span>
                            </div>
                            <div class="title-box-large">${invoiceTitle}</div>
                            <table class="invoice-info-table" style="width: 100%; float: right; margin-top: 4px; font-size: 9px;">
                                <tr>
                                    <td style="text-align: right; padding: 2px 0;"><b>Invoice No:</b></td>
                                    <td style="text-align: right; padding: 2px 4px;">${invoice.invoice_number}</td>
                                </tr>
                                <tr>
                                    <td style="text-align: right; padding: 2px 0;"><b>Date:</b></td>
                                    <td style="text-align: right; padding: 2px 4px;">${formatDate(invoice.invoice_date)}</td>
                                </tr>
                                ${invoice.due_date ? `<tr><td style="text-align: right; padding: 2px 0;"><b>Due Date:</b></td><td style="text-align: right; padding: 2px 4px;">${formatDate(invoice.due_date)}</td></tr>` : ''}
                            </table>
                        </td>
                    </tr>
                </table>

                <!-- SEPARATOR LINE -->
                <hr class="separator" />

                <!-- BILL TO & DETAILS SECTION -->
                <table class="bill-details-table" style="width: 100%; margin-bottom: 12px;">
                    <tr>
                        <td width="50%" class="bill-to-section">
                            <div class="section-title">Bill To:</div>
                            <div class="customer-name">${customer?.name || 'Customer'}</div>
                            <div class="customer-address">
                                ${customer?.address_line1 ? customer.address_line1 + '<br/>' : ''}
                                ${[customer?.city, customer?.state].filter(Boolean).join(', ')}${customer?.pincode ? '<br/>' + customer.pincode : ''}${customer?.phone ? '<br/>Phone: ' + customer.phone : ''}
                            </div>
                            ${customer?.gst_number ? `<div><b>GSTIN: ${customer.gst_number}</b></div>` : '<div><b>GSTIN:</b> -</div>'}
                        </td>
                        <td width="50%" class="bill-details-right">
                            <table class="additional-details" style="width: 100%; font-size: 9px;">
                                <tr>
                                    <td style="padding: 2px 0;"><b>Place of Supply:</b></td>
                                    <td style="padding: 2px 4px; text-align: right;">${invoice.place_of_supply || '-'}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 2px 0;"><b>Reverse Charge:</b></td>
                                    <td style="padding: 2px 4px; text-align: right;">No</td>
                                </tr>
                                <tr>
                                    <td style="padding: 2px 0;"><b>Vehicle No:</b></td>
                                    <td style="padding: 2px 4px; text-align: right;">-</td>
                                </tr>
                                <tr>
                                    <td style="padding: 2px 0;"><b>Transport Mode:</b></td>
                                    <td style="padding: 2px 4px; text-align: right;">-</td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>

                <!-- ITEMS TABLE SECTION -->
                <table class="items-table">
                    <thead>
                        <tr>
                            <th class="col-sr">Sr</th>
                            <th class="col-desc">Description</th>
                            <th class="col-hsn">HSN/SAC</th>
                            <th class="col-batch">Batch</th>
                            <th class="col-qty">Qty</th>
                            <th class="col-rate">Rate</th>
                            <th class="col-disc">Disc%</th>
                            <th class="col-taxable">Taxable</th>
                            ${isInterstate ? `<th class="col-gst">IGST%</th><th class="col-amount">IGST</th>` : `<th class="col-gst">GST%</th><th class="col-cgst">CGST</th><th class="col-sgst">SGST</th>`}
                            <th class="col-total">Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${itemsHtml}
                    </tbody>
                </table>

                <!-- AMOUNT IN WORDS & HSN SUMMARY & TOTALS LAYOUT -->
                <table class="summary-layout" style="width: 100%; margin-top: 6px; margin-bottom: 8px;">
                    <tr>
                        <!-- LEFT: Amount in Words -->
                        <td width="40%" class="amount-words-box">
                            <div><b>Amount in Words:</b></div>
                            <div style="font-style: italic; margin-top: 2px;">Rupees ${numberToWords(Math.round(invoice.total_amount))} Only</div>
                        </td>

                        <!-- MIDDLE: HSN Summary -->
                        <td width="30%" class="hsn-summary-box">
                            <table class="hsn-table">
                                <thead>
                                    <tr>
                                        <th>HSN/SAC</th>
                                        <th>Taxable Value</th>
                                        ${isInterstate ? '<th>IGST Rate</th><th>IGST Amount</th>' : '<th>GST Rate</th><th>GST Amount</th>'}
                                    </tr>
                                </thead>
                                <tbody>
                                    ${items.map((item: any) => `
                                        <tr>
                                            <td>${item.hsn_code || item.products?.hsn_code || '-'}</td>
                                            <td style="text-align: right;">Rs. ${((item.quantity * item.unit_price) - (item.quantity * item.unit_price * (item.discount_percent || 0) / 100)).toFixed(2)}</td>
                                            <td style="text-align: center;">${item.tax_rate || 0}%</td>
                                            <td style="text-align: right;">Rs. ${(isInterstate ? (item.igst_amount || 0) : (item.cgst_amount || 0) + (item.sgst_amount || 0)).toFixed(2)}</td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </td>

                        <!-- RIGHT: Totals Box -->
                        <td width="30%" class="totals-box">
                            <table class="totals-table">
                                <tr>
                                    <td class="label">Subtotal:</td>
                                    <td class="value">Rs. ${(invoice.subtotal || 0).toFixed(2)}</td>
                                </tr>
                                ${invoice.discount_amount > 0 ? `<tr><td class="label">Discount:</td><td class="value">-Rs. ${(invoice.discount_amount || 0).toFixed(2)}</td></tr>` : ''}
                                <tr>
                                    <td class="label">Taxable Value:</td>
                                    <td class="value">Rs. ${((invoice.subtotal || 0) - (invoice.discount_amount || 0)).toFixed(2)}</td>
                                </tr>
                                ${isInterstate ? `<tr><td class="label">IGST:</td><td class="value">Rs. ${(invoice.igst_amount || 0).toFixed(2)}</td></tr>` : `
                                    <tr><td class="label">CGST:</td><td class="value">Rs. ${(invoice.cgst_amount || 0).toFixed(2)}</td></tr>
                                    <tr><td class="label">SGST:</td><td class="value">Rs. ${(invoice.sgst_amount || 0).toFixed(2)}</td></tr>
                                `}
                                <tr>
                                    <td class="label">Round Off:</td>
                                    <td class="value">${roundOffText}</td>
                                </tr>
                                <tr class="grand-total">
                                    <td class="label"><b>Grand Total:</b></td>
                                    <td class="value"><b>Rs. ${(invoice.total_amount || 0).toFixed(2)}</b></td>
                                </tr>
                                ${invoice.paid_amount > 0 ? `
                                    <tr><td class="label">Paid:</td><td class="value">Rs. ${(invoice.paid_amount || 0).toFixed(2)}</td></tr>
                                    <tr class="balance-row"><td class="label"><b>Balance:</b></td><td class="value"><b>Rs. ${(invoice.balance_amount || 0).toFixed(2)}</b></td></tr>
                                ` : ''}
                            </table>
                        </td>
                    </tr>
                </table>

                <!-- SEPARATOR LINE -->
                <hr class="separator" />

                <!-- SEPARATOR LINE -->
                <hr class="separator" />

                <!-- BANK DETAILS SECTION -->
                ${bank ? `
                <table style="width: 100%; margin-bottom: 8px; font-size: 8px;">
                    <tr>
                        <td width="50%">
                            <div style="font-weight: bold; margin-bottom: 2px;">BANK DETAILS:</div>
                            <div>Bank: ${bank.bank_name || '-'}</div>
                            <div>Account #: <b>${bank.account_number || '-'}</b></div>
                            <div>IFSC: ${bank.ifsc_code || '-'}</div>
                            <div>Branch: ${bank.branch || '-'}</div>
                        </td>
                    </tr>
                </table>
                ` : ''}

                <!-- SEPARATOR LINE -->
                <hr class="separator" />

                <!-- TERMS & SIGNATURE SECTION -->
                <table class="footer-layout" style="width: 100%; margin-top: 8px;">
                    <tr>
                        <td width="65%" class="terms-section">
                            <div style="font-size: 8px; line-height: 1.5;">
                                <b>Terms & Conditions:</b><br/>
                                ${termsHtml}
                            </div>
                        </td>
                        <td width="35%" class="signature-section">
                            <div style="text-align: center; padding-top: 20px;">
                                <div style="border-top: 1px solid #4b5563; width: 70%; margin: 0 auto 3px; min-height: 35px;"></div>
                                <div style="font-size: 8px;">For ${company?.name || 'Your Company'}</div>
                                <div style="font-size: 8px; margin-top: 8px;"><b>Authorized Signatory</b></div>
                            </div>
                        </td>
                    </tr>
                </table>

                <!-- FOOTER: Thank You -->
                <div style="text-align: center; margin-top: 12px; padding-top: 8px; border-top: 1px solid #4b5563;">
                    <div style="font-size: 10px; font-weight: bold;">Thank you for your business!</div>
                </div>
            </div>
        `

        const printContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Invoice #${invoice.invoice_number}</title>
            <style>
                @media print {
                    @page { 
                        margin: 0;
                        size: A4;
                    }
                    * {
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                    }
                    body {
                        margin: 0;
                        padding: 0;
                    }
                }

                * {
                    margin: 0;
                    padding: 0;
                    box-sizing: border-box;
                }

                body {
                    font-family: 'Segoe UI', 'Arial', 'Helvetica', sans-serif;
                    font-size: 9px;
                    color: #1f2937;
                    background: #f9fafb;
                    line-height: 1.4;
                }

                .invoice-container {
                    width: 210mm;
                    height: auto;
                    margin: 0 auto;
                    padding: 12mm;
                    background: #fff;
                }

                /* HEADER TABLE - Company & Invoice Title */
                .header-table {
                    margin-bottom: 8px;
                }

                .company-section {
                    vertical-align: top;
                }

                .company-name-header {
                    font-size: 11px;
                    font-weight: bold;
                    color: #1f2937;
                    margin-bottom: 2px;
                }

                .company-address {
                    font-size: 8px;
                    color: #4b5563;
                    line-height: 1.3;
                    margin-bottom: 2px;
                }

                .company-credentials {
                    font-size: 7px;
                    color: #4b5563;
                }

                .title-box-large {
                    border: 2px solid #1f2937;
                    padding: 4px 12px;
                    font-size: 14px;
                    font-weight: bold;
                    color: #1f2937;
                    display: inline-block;
                    background: #fff;
                    margin-bottom: 4px;
                }

                .invoice-info-table {
                    margin-top: 4px;
                    font-size: 9px;
                    color: #1f2937;
                }

                .invoice-info-table td {
                    padding: 2px 4px;
                }

                /* SEPARATOR LINE */
                .separator {
                    border: none;
                    border-top: 1px solid #d1d5db;
                    margin: 8px 0;
                    height: 0;
                }

                /* BILL TO SECTION */
                .bill-details-table {
                    font-size: 9px;
                }

                .bill-to-section {
                    vertical-align: top;
                }

                .section-title {
                    font-weight: bold;
                    margin-bottom: 3px;
                    color: #1f2937;
                }

                .customer-name {
                    font-weight: bold;
                    font-size: 10px;
                    margin-bottom: 2px;
                    color: #1f2937;
                }

                .customer-address {
                    font-size: 8px;
                    color: #4b5563;
                    line-height: 1.3;
                    margin-bottom: 2px;
                }

                .bill-details-right {
                    vertical-align: top;
                    padding-left: 12px;
                }

                .additional-details {
                    border: 1px solid #d1d5db;
                    border-collapse: collapse;
                }

                .additional-details tr td {
                    padding: 4px 6px;
                    border-bottom: 1px solid #d1d5db;
                    font-size: 8px;
                }

                .additional-details tr:last-child td {
                    border-bottom: none;
                }

                /* ITEMS TABLE */
                .items-table {
                    width: 100%;
                    border-collapse: collapse;
                    margin: 8px 0;
                    font-size: 8px;
                }

                .items-table thead {
                    background-color: #e5e7eb;
                    border: 1px solid #9ca3af;
                }

                .items-table th {
                    border: 1px solid #9ca3af;
                    padding: 4px 2px;
                    text-align: center;
                    font-weight: bold;
                    color: #1f2937;
                    font-size: 7px;
                    line-height: 1.2;
                }

                .items-table tbody tr {
                    border: 1px solid #d1d5db;
                }

                .items-table td {
                    border: 1px solid #d1d5db;
                    padding: 4px 2px;
                    text-align: left;
                    color: #374151;
                }

                .col-sr { width: 4%; text-align: center; }
                .col-desc { width: 25%; }
                .col-hsn { width: 8%; text-align: center; }
                .col-batch { width: 7%; text-align: center; }
                .col-qty { width: 5%; text-align: center; }
                .col-rate { width: 8%; text-align: right; }
                .col-disc { width: 5%; text-align: center; }
                .col-taxable { width: 9%; text-align: right; }
                .col-gst { width: 5%; text-align: center; }
                .col-amount { width: 7%; text-align: right; }
                .col-cgst { width: 6%; text-align: right; }
                .col-sgst { width: 6%; text-align: right; }
                .col-total { width: 8%; text-align: right; }

                /* SUMMARY SECTION - Amount Words, HSN Table, Totals */
                .summary-layout {
                    font-size: 8px;
                }

                .amount-words-box {
                    vertical-align: top;
                    padding-right: 8px;
                    font-style: italic;
                    color: #4b5563;
                    line-height: 1.4;
                }

                .hsn-summary-box {
                    vertical-align: top;
                    padding: 0 6px;
                }

                .hsn-table {
                    width: 100%;
                    border-collapse: collapse;
                    font-size: 7px;
                    border: 1px solid #d1d5db;
                }

                .hsn-table thead {
                    background-color: #f3f4f6;
                    border-bottom: 1px solid #d1d5db;
                }

                .hsn-table th {
                    padding: 3px 2px;
                    text-align: center;
                    font-weight: bold;
                    color: #1f2937;
                    border-right: 1px solid #d1d5db;
                }

                .hsn-table th:last-child {
                    border-right: none;
                }

                .hsn-table td {
                    padding: 3px 2px;
                    text-align: right;
                    border-right: 1px solid #d1d5db;
                    border-bottom: 1px solid #d1d5db;
                    color: #4b5563;
                }

                .hsn-table td:first-child {
                    text-align: center;
                }

                .hsn-table tr:last-child td {
                    border-bottom: none;
                }

                .hsn-table tbody tr:nth-child(even) {
                    background-color: #f9fafb;
                }

                .totals-box {
                    vertical-align: top;
                    padding-left: 8px;
                }

                .totals-table {
                    width: 100%;
                    font-size: 8px;
                    border: 1px solid #d1d5db;
                    border-collapse: collapse;
                    background: #f3f4f6;
                }

                .totals-table tr {
                    border-bottom: 1px solid #d1d5db;
                }

                .totals-table tr:last-child {
                    border-bottom: none;
                }

                .totals-table tr:nth-child(even) {
                    background-color: #f9fafb;
                }

                .totals-table td {
                    padding: 4px 6px;
                    color: #4b5563;
                }

                .totals-table .label {
                    text-align: left;
                    width: 65%;
                }

                .totals-table .value {
                    text-align: right;
                    width: 35%;
                    color: #1f2937;
                    font-weight: 500;
                }

                .grand-total {
                    background-color: #e5e7eb !important;
                    font-weight: bold;
                }

                .grand-total td {
                    color: #1f2937;
                    font-weight: bold;
                    font-size: 9px;
                }

                .balance-row {
                    background-color: #fef3c7 !important;
                }

                .balance-row td {
                    font-weight: bold;
                    color: #1f2937;
                }

                /* FOOTER SECTION - Terms & Signature */
                .footer-layout {
                    margin-top: 12px;
                    font-size: 8px;
                }

                .terms-section {
                    vertical-align: top;
                    padding-right: 12px;
                    color: #4b5563;
                    line-height: 1.4;
                }

                .terms-section b {
                    color: #1f2937;
                }

                .signature-section {
                    vertical-align: top;
                    text-align: center;
                    font-size: 8px;
                    color: #4b5563;
                }

                .signature-section div {
                    color: #1f2937;
                }
            </style>
        </head>
        <body>
            ${renderInvoice()}
            <script>
                window.onload = function() {
                    setTimeout(() => { window.print(); }, 300);
                }
            </script>
        </body>
        </html>
        `

        // 3. Open Window & Print
        const printWindow = window.open('', '_blank')
        if (printWindow) {
            printWindow.document.write(printContent)
            printWindow.document.close()
        } else {
            alert('Please allow popups to print invoices')
        }

    } catch (err: any) {
        console.error('Print Error:', err)
        alert('Failed to generate print view: ' + err.message)
    }
}

// ============ PO PRINTING ============

export async function printPurchaseOrderPDF(poId: string) {
    try {
        // 1. Fetch PO with Items
        const { data: po, error: poError } = await supabase
            .from('purchase_orders')
            .select('*, items:purchase_order_items(*, raw_materials(name, unit_of_measure))')
            .eq('id', poId)
            .single()

        if (poError) throw poError

        // 2. Fetch Supplier
        const { data: supplier } = await supabase
            .from('suppliers')
            .select('name, address_line1, city, state, gst_number, phone')
            .eq('id', po.supplier_id)
            .maybeSingle()

        // 3. Fetch Company
        const { data: company, error: compError } = await supabase
            .from('companies')
            .select('*')
            .limit(1)
            .single()

        if (compError) throw compError

        const items = po.items || []
        let itemsHtml = ''
        items.forEach((item: any, index: number) => {
            const itemName = item.raw_materials?.name || item.material_name || 'Item'
            const itemUnit = item.raw_materials?.unit_of_measure || item.unit || '-'

            itemsHtml += `
            <tr>
                <td style="text-align: center; border-bottom: 1px solid #ddd; padding: 8px;">${index + 1}</td>
                <td style="border-bottom: 1px solid #ddd; padding: 8px;">
                    <b>${itemName}</b><br/>
                    <small>${item.description || ''}</small>
                </td>
                <td style="text-align: center; border-bottom: 1px solid #ddd; padding: 8px;">${item.quantity} ${itemUnit}</td>
                <td style="text-align: right; border-bottom: 1px solid #ddd; padding: 8px;">${item.unit_price.toFixed(2)}</td>
                <td style="text-align: center; border-bottom: 1px solid #ddd; padding: 8px;">${item.tax_rate}%</td>
                <td style="text-align: right; border-bottom: 1px solid #ddd; padding: 8px;">${item.total_amount.toFixed(2)}</td>
            </tr>
            `
        })

        const companyAddress = `${company.address_line1 || ''} ${company.address_line2 || ''}`.trim()
        const companyLocation = `${company.city || ''}, ${company.state || ''} ${company.pincode || ''}`.trim()

        const printContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>PO #${po.po_number}</title>
            <style>
                @media print { @page { margin: 10mm; } body { -webkit-print-color-adjust: exact; } }
                body { font-family: 'Arial', sans-serif; font-size: 11px; color: #000; padding: 20px; }
                table { width: 100%; border-collapse: collapse; }
                td, th { padding: 5px; border: 1px solid #ddd; }
                th { background: #f3f4f6; text-align: left; }
                .no-border td { border: none; }
            </style>
        </head>
        <body>
            <div style="display: flex; justify-content: space-between; margin-bottom: 20px;">
                <div>
                    <h1 style="margin: 0;">${company.name}</h1>
                    <p style="margin: 2px 0;">${companyAddress}</p>
                    <p style="margin: 2px 0;">${companyLocation}</p>
                    <p style="margin: 2px 0;">Phone: ${company.phone || '-'}</p>
                </div>
                <div style="text-align: right;">
                    <h2 style="margin: 0; color: #4f46e5;">PURCHASE ORDER</h2>
                    <p style="margin: 2px 0;"><b>PO #:</b> ${po.po_number}</p>
                    <p style="margin: 2px 0;"><b>Date:</b> ${formatDate(po.order_date)}</p>
                </div>
            </div>

            <table style="width: 100%; margin-bottom: 20px;">
                <tr>
                    <td width="50%" style="vertical-align: top; padding: 10px;">
                        <b>Vendor:</b><br/>
                        ${supplier?.name || po.supplier_name || 'N/A'}<br/>
                        ${supplier?.address_line1 || ''}, ${supplier?.city || ''}<br/>
                        ${supplier?.phone || po.supplier_phone || ''}<br/>
                        <b>GSTIN:</b> ${supplier?.gst_number || '-'}
                    </td>
                    <td width="50%" style="vertical-align: top; padding: 10px;">
                        <b>Ship To:</b><br/>
                        ${company.name}<br/>
                        ${companyAddress}<br/>
                        ${companyLocation}
                    </td>
                </tr>
            </table>

            <table style="width: 100%;">
                <thead>
                    <tr>
                        <th width="30" style="text-align: center;">#</th>
                        <th>Item & Description</th>
                        <th width="50" style="text-align: center;">Qty</th>
                        <th width="80" style="text-align: right;">Rate</th>
                        <th width="50" style="text-align: center;">Tax %</th>
                        <th width="80" style="text-align: right;">Amount</th>
                    </tr>
                </thead>
                <tbody>
                    ${itemsHtml}
                </tbody>
            </table>

            <div style="display: flex; justify-content: flex-end; margin-top: 20px;">
                <table style="width: 250px;">
                    <tr><td class="no-border">Subtotal:</td><td style="text-align: right;">${formatCurrency(po.subtotal)}</td></tr>
                    <tr><td class="no-border">Tax:</td><td style="text-align: right;">${formatCurrency(po.tax_amount)}</td></tr>
                    <tr><td class="no-border"><b>Total:</b></td><td style="text-align: right;"><b>${formatCurrency(po.total_amount)}</b></td></tr>
                </table>
            </div>

            <div style="margin-top: 40px; border-top: 1px solid #ddd; padding-top: 10px;">
                <p><b>Notes:</b> ${po.notes || '-'}</p>
                <div style="display: flex; justify-content: space-between; margin-top: 50px;">
                    <div>Authorized Signatory</div>
                </div>
            </div>

            <script>window.onload = () => window.print();</script>
        </body>
        </html>
        `
        const printWindow = window.open('', '_blank')
        if (printWindow) {
            printWindow.document.write(printContent)
            printWindow.document.close()
        } else {
            alert('Please allow popups to print POs')
        }
    } catch (err: any) {
        console.error(err)
        alert('Error: ' + err.message)
    }
}
