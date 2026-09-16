// src/dtos/ChargeInvoiceDTO.js

export class ChargeInvoiceItemDTO {
    constructor({
        id = null,
        chargeInvoiceId = null,
        name = '',
        quantity = 1,
        price = 0.00
    } = {}) {
        this.id = id;
        this.chargeInvoiceId = chargeInvoiceId;
        this.name = (name || '').trim();
        this.quantity = Number(quantity) || 1;
        this.price = Number(price) || 0.00;
    }

    static fromDatabase(data) {
        if (!data) return null;
        return new ChargeInvoiceItemDTO({
            id: data.id,
            chargeInvoiceId: data.charge_invoice_id,
            name: data.item_name || data.name || '',
            quantity: data.quantity || 1,
            price: data.unit_price || data.price || 0.00
        });
    }

    toDatabase(chargeInvoiceId) {
        return {
            charge_invoice_id: chargeInvoiceId,
            item_name: this.name,
            quantity: this.quantity,
            unit_price: this.price
        };
    }
}

export class ChargeInvoiceDTO {
    constructor({
        id = null,
        ciNumber = '',
        dateIssued = '',
        customerName = '',
        legacyOrderDetails = '',
        status = 'unpaid',
        poNumber = '',
        discountAmount = 0.00,
        subtotal = 0.00,
        amountTotal = 0.00,
        items = []
    } = {}) {
        this.id = id;
        this.ciNumber = (ciNumber || '').trim();
        this.dateIssued = dateIssued || new Date().toISOString().split('T')[0];
        this.customerName = (customerName || '').trim();
        this.legacyOrderDetails = legacyOrderDetails || '';
        this.status = status || 'unpaid';
        this.poNumber = (poNumber || '').trim();
        this.discountAmount = Number(discountAmount) || 0.00;
        this.subtotal = Number(subtotal) || 0.00;
        this.amountTotal = Number(amountTotal) || 0.00;
        this.items = Array.isArray(items) 
            ? items.map((item) => item instanceof ChargeInvoiceItemDTO ? item : new ChargeInvoiceItemDTO(item))
            : [];
    }

    static fromDatabase(data) {
        if (!data) return null;

        const rawItems = data.charge_invoice_items || [];
        const items = rawItems.map(ChargeInvoiceItemDTO.fromDatabase);

        // Calculate subtotal from item rows if they exist, otherwise use legacy_amount
        const itemsSubtotal = items.reduce(
            (sum, item) => sum + (Number(item.quantity) * Number(item.price)),
            0
        );
        const subtotal = items.length > 0 ? itemsSubtotal : (Number(data.legacy_amount) || 0.00);

        const discount = Number(data.discount_amount) || 0.00;
        // Net amount total after discount
        const amountTotal = Math.max(0, subtotal - discount);

        const itemSummary = items.length > 0
            ? items.map((i) => `${i.quantity} ${i.name || 'Item'}`).join(', ')
            : '';

        return new ChargeInvoiceDTO({
            id: data.id || data.charge_invoice_id,
            ciNumber: data.ci_number,
            dateIssued: data.date_issued,
            customerName: data.customer_name,
            legacyOrderDetails: data.legacy_order_details || '',
            itemSummary: itemSummary,
            status: data.status,
            poNumber: data.po_number || '',
            discountAmount: discount,
            subtotal: subtotal,
            amountTotal: amountTotal,
            items: items
        });
    }

    toDatabase(customerId = null) {
        return {
            ci_number: this.ciNumber,
            date_issued: this.dateIssued,
            customer_id: customerId,
            customer_name: this.customerName,
            legacy_order_details: this.legacyOrderDetails || null,
            // Keep the gross subtotal as legacy_amount (discount is stored in discount_amount)
            legacy_amount: this.subtotal || this.amountTotal || 0.00,
            status: this.status,
            po_number: this.poNumber || null,
            discount_amount: this.discountAmount
        };
    }
}