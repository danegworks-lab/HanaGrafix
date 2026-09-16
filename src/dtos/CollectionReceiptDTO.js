export class CollectionReceiptDTO {
    constructor({ id = null, crNumber = '', chargeInvoiceId = null, dateIssued = '', paymentType = 'cash', status = 'full', amountCollected = 0.00, remarks = '' }) {
        this.id = id;
        this.crNumber = crNumber.trim();
        this.chargeInvoiceId = chargeInvoiceId;
        this.dateIssued = dateIssued || new Date().toISOString().split('T')[0];
        this.paymentType = paymentType;
        this.status = status;
        this.amountCollected = Number(amountCollected) || 0.00;
        this.remarks = remarks.trim();
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
            cr_number: this.crNumber,
            charge_invoice_id: this.chargeInvoiceId,
            date_issued: this.dateIssued,
            payment_type: this.paymentType,
            status: this.status,
            amount_collected: this.amountCollected,
            remarks: this.remarks || null
        };
    }
}