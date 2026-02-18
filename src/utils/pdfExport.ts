
import { supabase } from '@/lib/supabase'
import { formatCurrency, formatDate } from '@/lib/utils'

// ============ NUMBER TO WORDS (INDIAN SYSTEM) ============

const units = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine']
const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen']
const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']

function convertLessThanOneThousand(n: number): string {
    if (n === 0) return ''
    if (n < 10) return units[n]
    if (n < 20) return teens[n - 10]
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + units[n % 10] : '')
    return units[Math.floor(n / 100)] + ' Hundred' + (n % 100 !== 0 ? ' ' + convertLessThanOneThousand(n % 100) : '')
}

export function numberToWords(n: number): string {
    if (n === 0) return 'Zero'

    const numStr = n.toString().split('.')
    let wholePart = parseInt(numStr[0])
    const decimalPart = numStr[1] ? parseInt(numStr[1].substring(0, 2)) : 0

    let words = ''

    if (wholePart >= 10000000) {
        words += numberToWords(Math.floor(wholePart / 10000000)) + ' Crore '
        wholePart %= 10000000
    }
    if (wholePart >= 100000) {
        words += numberToWords(Math.floor(wholePart / 100000)) + ' Lakh '
        wholePart %= 100000
    }
    if (wholePart >= 1000) {
        words += numberToWords(Math.floor(wholePart / 1000)) + ' Thousand '
        wholePart %= 1000
    }

    words += convertLessThanOneThousand(wholePart)

    // Cleanup
    words = words.trim()

    // Add decimal part (Paise)
    if (decimalPart > 0) {
        words += ' and ' + convertLessThanOneThousand(decimalPart) + ' Paise'
    }

    return words + ' Only'
}

// ============ INVOICE PRINTING ============

export async function printInvoicePDF(invoiceId: string) {
    try {
        // 1. Fetch Data
        const { data: invoice, error: invError } = await supabase
            .from('invoices')
            .select('*, customers(*), invoice_items(*, products(*))')
            .eq('id', invoiceId)
            .single()

        if (invError) throw invError

        const { data: company, error: compError } = await supabase
            .from('companies')
            .select('*')
            .limit(1)
            .single()

        if (compError) throw compError
        if (!company) throw new Error('Company details not found')

        // 2. Generate HTML
        const customer = invoice.customers
        const items = invoice.invoice_items || []

        let itemsHtml = ''
        items.forEach((item: any, index: number) => {
            const product = item.products
            itemsHtml += `
            <tr>
                <td style="text-align: center;">${index + 1}</td>
                <td>
                    <b>${product.name}</b><br/>
                    <small>${item.description || ''}</small>
                </td>
                <td style="text-align: center;">${item.hsn_code || product.hsn_code || '-'}</td>
                <td style="text-align: center;">${item.quantity}</td>
                <td style="text-align: right;">${item.unit_price.toFixed(2)}</td>
                <td style="text-align: right;">${item.discount_percent}%</td>
                <td style="text-align: right;">${(item.quantity * item.unit_price - (item.quantity * item.unit_price * item.discount_percent / 100)).toFixed(2)}</td>
                <td style="text-align: center;">${item.tax_rate}%</td>
                <td style="text-align: right;">${item.cgst_amount.toFixed(2)}</td>
                <td style="text-align: right;">${item.sgst_amount.toFixed(2)}</td>
                <td style="text-align: right;">${item.igst_amount.toFixed(2)}</td>
                <td style="text-align: right;">${item.total_amount.toFixed(2)}</td>
            </tr>
            `
        })

        const printContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Invoice #${invoice.invoice_number}</title>
            <style>
                @media print {
                    @page { margin: 10mm; }
                    body { -webkit-print-color-adjust: exact; }
                }
                body { font-family: 'Arial', sans-serif; font-size: 11px; color: #000; padding: 20px; }
                .header-table, .items-table, .summary-table { width: 100%; border-collapse: collapse; }
                .header-table td { vertical-align: top; padding: 5px; }
                .company-name { font-size: 20px; font-weight: bold; margin-bottom: 5px; }
                .invoice-title { font-size: 24px; font-weight: bold; border: 2px solid #eab308; color: #000; padding: 5px 15px; display: inline-block; margin-bottom: 10px; }
                
                .section-header { background: #eee; font-weight: bold; padding: 5px; border: 1px solid #ddd; margin-top: 10px; }
                
                .items-table th { background: #f3f4f6; padding: 8px; border: 1px solid #ddd; font-weight: bold; text-align: center; font-size: 10px; }
                .items-table td { padding: 6px; border: 1px solid #ddd; font-size: 10px; }
                .items-table tr:nth-child(even) { background: #fafafa; }
                
                .totals-row td { font-weight: bold; background: #f3f4f6; }
                
                .summary-table td { padding: 5px; }
                .amount-col { text-align: right; width: 120px; }
                .grand-total { font-size: 16px; font-weight: bold; border-top: 2px solid #000; border-bottom: 2px solid #000; padding: 10px 0; }
                
                .footer { margin-top: 40px; }
                .terms { font-size: 10px; color: #555; }
                
                .flex-between { display: flex; justify-content: space-between; }
            </style>
        </head>
        <body>
            <!-- HEADER -->
            <table class="header-table">
                <tr>
                    <td width="60%">
                        <div class="company-name">${company.name}</div>
                        <div>${company.address_line1 || ''}, ${company.address_line2 || ''}</div>
                        <div>${company.city || ''}, ${company.state || ''} - ${company.pincode || ''}</div>
                        <div style="margin-top: 5px;">
                            <b>GSTIN:</b> ${company.gst_number || '-'} | <b>PAN:</b> ${company.pan_number || '-'}
                        </div>
                        <div>
                            <b>Phone:</b> ${company.phone || '-'} | <b>Email:</b> ${company.email || '-'}
                        </div>
                    </td>
                    <td width="40%" style="text-align: right;">
                        <div class="invoice-title">TAX INVOICE</div>
                        <table style="width: 100%; margin-top: 10px;">
                            <tr><td style="text-align: right;"><b>Invoice No:</b></td><td style="text-align: right;">${invoice.invoice_number}</td></tr>
                            <tr><td style="text-align: right;"><b>Date:</b></td><td style="text-align: right;">${formatDate(invoice.invoice_date)}</td></tr>
                            <tr><td style="text-align: right;"><b>Due Date:</b></td><td style="text-align: right;">${invoice.due_date ? formatDate(invoice.due_date) : '-'}</td></tr>
                        </table>
                    </td>
                </tr>
            </table>

            <hr style="border: 0; border-top: 1px solid #ddd; margin: 15px 0;">

            <!-- BILL TO -->
            <table class="header-table">
                <tr>
                    <td width="50%" style="border: 1px solid #ddd; padding: 10px;">
                        <b>Bill To:</b><br/>
                        <div style="font-size: 14px; font-weight: bold; margin: 5px 0;">${customer?.name || 'Walk-in Customer'}</div>
                        <div>${customer?.address_line1 || ''}</div>
                        <div>${customer?.city || ''}, ${customer?.state || ''}</div>
                        <div style="margin-top: 5px;"><b>GSTIN:</b> ${customer?.gst_number || 'N/A'}</div>
                    </td>
                    <td width="50%" style="border: 1px solid #ddd; padding: 10px;">
                        <table style="width: 100%;">
                            <tr><td style="border:none;"><b>Place of Supply:</b></td><td style="border:none;">${invoice.place_of_supply || '-'}</td></tr>
                            <tr><td style="border:none;"><b>Reverse Charge:</b></td><td style="border:none;">${invoice.reverse_charge ? 'Yes' : 'No'}</td></tr>
                            <tr><td style="border:none;"><b>Vehicle No:</b></td><td style="border:none;">-</td></tr>
                            <tr><td style="border:none;"><b>Transport Mode:</b></td><td style="border:none;">-</td></tr>
                        </table>
                    </td>
                </tr>
            </table>

            <!-- ITEMS -->
            <table class="items-table" style="margin-top: 20px;">
                <thead>
                    <tr>
                        <th width="30">Sr</th>
                        <th>Description</th>
                        <th width="80">HSN/SAC</th>
                        <th width="40">Qty</th>
                        <th width="70">Rate</th>
                        <th width="40">Disc%</th>
                        <th width="80">Taxable</th>
                        <th width="40">GST%</th>
                        <th width="70">CGST</th>
                        <th width="70">SGST</th>
                        <th width="70">IGST</th>
                        <th width="90">Total</th>
                    </tr>
                </thead>
                <tbody>
                    ${itemsHtml}
                </tbody>
            </table>

            <!-- SUMMARY -->
            <table style="width: 100%; margin-top: 20px;">
                <tr>
                    <td width="60%" style="vertical-align: top;">
                        <div style="border: 1px solid #ddd; padding: 10px;">
                            <b>Amount in Words:</b><br/>
                            <i>Rupees ${numberToWords(invoice.total_amount)}</i>
                        </div>
                        <div style="margin-top: 10px; font-size: 10px;">
                            <b>Bank Details:</b><br/>
                            Bank Name: HDFC Bank<br/>
                            A/c No: 50200012345678<br/>
                            IFSC: HDFC0001234
                        </div>
                    </td>
                    <td width="40%" style="padding-left: 20px;">
                        <table class="summary-table">
                            <tr>
                                <td>Subtotal:</td>
                                <td class="amount-col">${formatCurrency(invoice.subtotal)}</td>
                            </tr>
                            <tr>
                                <td>Discount:</td>
                                <td class="amount-col">-${formatCurrency(invoice.discount_amount)}</td>
                            </tr>
                            <tr>
                                <td><b>Taxable Value:</b></td>
                                <td class="amount-col"><b>${formatCurrency(invoice.subtotal - invoice.discount_amount)}</b></td>
                            </tr>
                            <tr>
                                <td>CGST:</td>
                                <td class="amount-col">${formatCurrency(invoice.cgst_amount)}</td>
                            </tr>
                            <tr>
                                <td>SGST:</td>
                                <td class="amount-col">${formatCurrency(invoice.sgst_amount)}</td>
                            </tr>
                            ${invoice.igst_amount > 0 ? `
                            <tr>
                                <td>IGST:</td>
                                <td class="amount-col">${formatCurrency(invoice.igst_amount)}</td>
                            </tr>
                            ` : ''}
                            <tr>
                                <td colspan="2"><div style="border-bottom: 1px solid #ddd; margin: 5px 0;"></div></td>
                            </tr>
                            <tr class="grand-total">
                                <td>Grand Total:</td>
                                <td class="amount-col">${formatCurrency(invoice.total_amount)}</td>
                            </tr>
                        </table>
                    </td>
                </tr>
            </table>

            <!-- FOOTER -->
            <div class="footer">
                <table style="width: 100%;">
                    <tr>
                        <td width="60%" class="terms">
                            <b>Terms & Conditions:</b><br/>
                            1. Goods once sold will not be taken back.<br/>
                            2. Interest @ 18% p.a. will be charged if payment is not made within the due date.<br/>
                            3. Subject to jurisdiction.
                        </td>
                        <td width="40%" style="text-align: center;">
                            <b>For ${company.name}</b>
                            <br/><br/><br/><br/>
                            Authorized Signatory
                        </td>
                    </tr>
                </table>
            </div>

            <script>
                window.onload = function() { window.print(); }
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
