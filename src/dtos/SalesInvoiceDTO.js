// src/dtos/SalesInvoiceDTO.js

export class SalesInvoiceItemDTO {
    constructor({ id = null, name = '', quantity = 1, price = 0.00 }) {
        this.id = id;
        this.name = (name || '').trim();
        this.quantity = Number(quantity) || 1;
        this.price = Number(price) || 0.00;
    }

    static fromDatabase(data) {
        if (!data) return null;
        return new SalesInvoiceItemDTO({
            id: data.id,
            name: data.item_name || data.name || '',
            quantity: data.quantity || 1,
            price: data.unit_price || data.price || 0.00
        });
    }

    toDatabase(salesInvoiceId) {
        return {
            sales_invoice_id: salesInvoiceId,
            item_name: this.name,
            quantity: this.quantity,
            unit_price: this.price
        };
    }
}

export class SalesInvoiceDTO {
    constructor({ 
        id = null, 
        siNumber = '', 
        customerId = null,
        customerName = '', 
        dateIssued = '', 
        details = '', 
        amount = 0.00, 
        deliveryStatus = 'pending',
        items = [] 
    }) {
        this.id = id;
        this.siNumber = (siNumber || '').trim();
        this.customerId = customerId;
        this.customerName = (customerName || '').trim();
        this.dateIssued = dateIssued || new Date().toISOString().split('T')[0];
        this.details = details || '';
        this.amount = Number(amount) || 0.00;
        this.deliveryStatus = deliveryStatus || 'pending';
        this.items = (items || []).map((item) => 
            item instanceof SalesInvoiceItemDTO ? item : new SalesInvoiceItemDTO(item)
        );
    }

    static fromDatabase(data) {
        if (!data) return null;
        return new SalesInvoiceDTO({
            id: data.id,
            siNumber: data.si_number,
            customerId: data.customer_id,
            customerName: data.customer_name,
            dateIssued: data.date_issued,
            details: data.details || data.legacy_order_details || '',
            amount: Number(data.amount ?? data.legacy_amount ?? 0),
            deliveryStatus: data.delivery_status || 'pending',
            items: data.sales_invoice_items ? data.sales_invoice_items.map(SalesInvoiceItemDTO.fromDatabase) : []
        });
    }

    toDatabase(customerId = null) {
        return {
            si_number: this.siNumber,
            date_issued: this.dateIssued,
            customer_id: customerId || this.customerId || null,
            customer_name: this.customerName,
            details: this.details || null,
            legacy_order_details: this.details || null,
            amount: this.amount,
            legacy_amount: this.amount,
            delivery_status: this.deliveryStatus,
            updated_at: new Date().toISOString()
        };
    }
}