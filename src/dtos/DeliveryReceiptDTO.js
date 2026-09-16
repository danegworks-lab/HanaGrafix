export class DeliveryReceiptItemDTO {
    constructor({ id = null, name = '', quantity = 1, price = 0.00 }) {
        this.id = id;
        this.name = name.trim();
        this.quantity = Number(quantity) || 1;
        this.price = Number(price) || 0.00;
    }

    static fromDatabase(data) {
        return new DeliveryReceiptItemDTO({
            id: data.id,
            name: data.item_name,
            quantity: data.quantity,
            price: data.unit_price
        });
    }

    toDatabase(deliveryReceiptId) {
        return {
            delivery_receipt_id: deliveryReceiptId,
            item_name: this.name,
            quantity: this.quantity,
            unit_price: this.price
        };
    }
}

export class DeliveryReceiptDTO {
    constructor({ id = null, drNumber = '', chargeInvoiceId = null, dateIssued = '', paymentType = 'cash', status = 'completed', remarks = '', items = [] }) {
        this.id = id;
        this.drNumber = drNumber.trim();
        this.chargeInvoiceId = chargeInvoiceId;
        this.dateIssued = dateIssued || new Date().toISOString().split('T')[0];
        this.paymentType = paymentType;
        this.status = status;
        this.remarks = remarks.trim();
        this.items = items.map((item) => new DeliveryReceiptItemDTO(item));
    }

    static fromDatabase(data) {
        if (!data) return null;
        return new DeliveryReceiptDTO({
            id: data.id,
            drNumber: data.dr_number,
            chargeInvoiceId: data.charge_invoice_id,
            dateIssued: data.date_issued,
            paymentType: data.payment_type || 'cash',
            status: data.status || 'completed',
            remarks: data.remarks || '',
            items: data.delivery_receipt_items ? data.delivery_receipt_items.map(DeliveryReceiptItemDTO.fromDatabase) : []
        });
    }

    toDatabase() {
        return {
            dr_number: this.drNumber,
            charge_invoice_id: this.chargeInvoiceId,
            date_issued: this.dateIssued,
            payment_type: this.paymentType,
            status: this.status,
            remarks: this.remarks || null
        };
    }
}