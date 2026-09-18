export class DeliveryReceiptDTO {
    constructor(data = {}) {
        this.id = data.id || null;
        this.drNumber = (data.drNumber || data.dr_number || '').trim();
        this.chargeInvoiceId = data.chargeInvoiceId || data.charge_invoice_id || null;
        this.dateIssued = data.dateIssued || data.date_issued || new Date().toISOString().split('T')[0];
        this.paymentType = data.paymentType || data.payment_type || 'cash';
        this.status = data.status || 'completed';
        this.deliveredTo = data.deliveredTo || data.delivered_to || data.companyName || '';
        this.businessAddress = data.businessAddress || data.business_address || '';
        this.tin = data.tin || '';
        this.totalPaidAmount = parseFloat(data.totalPaidAmount ?? data.total_paid_amount ?? 0) || 0;
        this.legacyOrderDetails = data.deliveryDetailsLegacy || data.legacy_order_details || data.legacyOrderDetails || '';
        this.items = data.deliveryDetails || data.items || [];
    }

    toDatabase() {
        return {
            dr_number: this.drNumber || `DR-${Date.now().toString().slice(-6)}`,
            charge_invoice_id: this.chargeInvoiceId,
            date_issued: this.dateIssued,
            payment_type: this.paymentType,
            status: this.status,
            delivered_to: this.deliveredTo || null,
            business_address: this.businessAddress || null,
            tin: this.tin || null,
            total_paid_amount: this.totalPaidAmount,
            legacy_order_details: this.legacyOrderDetails || null
        };
    }

    static fromDatabase(record) {
        if (!record) return null;
        return new DeliveryReceiptDTO({
            id: record.id,
            drNumber: record.dr_number,
            chargeInvoiceId: record.charge_invoice_id,
            dateIssued: record.date_issued,
            paymentType: record.payment_type,
            status: record.status,
            deliveredTo: record.delivered_to,
            businessAddress: record.business_address,
            tin: record.tin,
            totalPaidAmount: record.total_paid_amount,
            deliveryDetailsLegacy: record.legacy_order_details,
            items: record.delivery_receipt_items || []
        });
    }
}