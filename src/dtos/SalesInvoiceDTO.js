export class SalesInvoiceItemDTO {
    constructor({ id = null, name = '', quantity = 1, price = 0.00 }) {
        this.id = id;
        this.name = name.trim();
        this.quantity = Number(quantity) || 1;
        this.price = Number(price) || 0.00;
    }

    static fromDatabase(data) {
        return new SalesInvoiceItemDTO({
            id: data.id,
            name: data.item_name,
            quantity: data.quantity,
            price: data.unit_price
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
    constructor({ id = null, siNumber = '', dateIssued = '', customerName = '', details = '', amount = 0.00, items = [] }) {
        this.id = id;
        this.siNumber = siNumber.trim();
        this.dateIssued = dateIssued || new Date().toISOString().split('T')[0];
        this.customerName = customerName.trim();
        this.details = details;
        this.amount = Number(amount) || 0.00;
        this.items = items.map((item) => new SalesInvoiceItemDTO(item));
    }

    static fromDatabase(data) {
        if (!data) return null;
        return new SalesInvoiceDTO({
            id: data.id,
            siNumber: data.si_number,
            dateIssued: data.date_issued,
            customerName: data.customer_name,
            details: data.details || '',
            amount: data.amount,
            items: data.sales_invoice_items ? data.sales_invoice_items.map(SalesInvoiceItemDTO.fromDatabase) : []
        });
    }

    toDatabase(customerId = null) {
        return {
            si_number: this.siNumber,
            date_issued: this.dateIssued,
            customer_id: customerId,
            customer_name: this.customerName,
            details: this.details || null,
            amount: this.amount
        };
    }
}