import { supabase } from '../lib/supabaseClient';
import { customerService } from './customerService';
import { SalesInvoiceDTO } from '../dtos/SalesInvoiceDTO';

export const salesInvoiceService = {
    async getSalesInvoices() {
        const { data, error } = await supabase
            .from('sales_invoices')
            .select('*, sales_invoice_items(*)')
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data.map(SalesInvoiceDTO.fromDatabase);
    },

    async createSalesInvoice(invoiceInput) {
        // 1. Instantiates and validates input via DTO
        const invoiceDTO = new SalesInvoiceDTO(invoiceInput);

        // 2. Resolve/Create customer
        const customer = await customerService.findOrCreateCustomer(invoiceDTO.customerName);

        // 3. Save Invoice using DTO database mapper
        const { data: invoice, error: invoiceError } = await supabase
            .from('sales_invoices')
            .insert([invoiceDTO.toDatabase(customer?.id)])
            .select()
            .single();

        if (invoiceError) throw invoiceError;

        // 4. Save items if present
        if (invoiceDTO.items.length > 0) {
            const itemsPayload = invoiceDTO.items.map((item) => item.toDatabase(invoice.id));
            const { error: itemsError } = await supabase
                .from('sales_invoice_items')
                .insert(itemsPayload);

            if (itemsError) throw itemsError;
        }

        return SalesInvoiceDTO.fromDatabase(invoice);
    }
};