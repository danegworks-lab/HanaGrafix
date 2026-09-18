// src/dtos/CollectionReceiptDTO.js
export class CollectionReceiptDTO {
    constructor({ 
        id = null, 
        crNumber = '', 
        chargeInvoiceId = null, 
        dateIssued = '', 
        paymentType = 'cash', 
        status = 'full', 
        amountCollected, 
        totalPaidAmount,
        amount,
        remarks = '',
        businessAddress = ''
    } = {}) {
        this.id = id;
        this.crNumber = (crNumber || '').trim();
        this.chargeInvoiceId = chargeInvoiceId;
        this.dateIssued = dateIssued || new Date().toISOString().split('T')[0];
        this.paymentType = paymentType;

        // Map status directly to the DB check constraint ('full', 'partial', 'pending', 'cancelled')
        const rawStatus = String(status || 'full').toLowerCase().trim();
        if (rawStatus === 'paid' || rawStatus === 'completed') {
            this.status = 'full';
        } else if (['full', 'partial', 'pending', 'cancelled'].includes(rawStatus)) {
            this.status = rawStatus;
        } else {
            this.status = 'full';
        }

        const resolvedAmount = amountCollected ?? totalPaidAmount ?? amount ?? 0;
        this.amountCollected = parseFloat(resolvedAmount) || 0.00;

        let cleanRemarks = remarks || '';
        if (businessAddress && !cleanRemarks.includes(businessAddress)) {
            cleanRemarks = cleanRemarks 
                ? `${cleanRemarks} | Address: ${businessAddress}`
                : `Address: ${businessAddress}`;
        }
        this.remarks = cleanRemarks.trim();
    }

    static fromDatabase(data) {
        if (!data) return null;
        return new CollectionReceiptDTO({
            id: data.id,
            crNumber: data.cr_number,
            chargeInvoiceId: data.charge_invoice_id,
            dateIssued: data.date_issued,
            paymentType: data.payment_type || 'cash',
            status: data.status || 'full',
            amountCollected: data.amount_collected || 0.00,
            remarks: data.remarks || ''
        });
    }

    toDatabase() {
        return {
            cr_number: this.crNumber || `CR-${Date.now().toString().slice(-6)}`,
            charge_invoice_id: this.chargeInvoiceId,
            date_issued: this.dateIssued,
            payment_type: this.paymentType,
            status: this.status, // Strictly 'full', 'partial', 'pending', or 'cancelled'
            amount_collected: this.amountCollected,
            remarks: this.remarks || null
        };
    }
}