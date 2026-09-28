// src/services/salesInvoiceService.js
import { supabase } from '../lib/supabaseClient';
import { customerService } from './customerService';
import { SalesInvoiceDTO } from '../dtos/SalesInvoiceDTO';

export const salesInvoiceService = {
    // 1. Fetch all sales invoices with items
    async getSalesInvoices() {
        const { data, error } = await supabase
            .from('sales_invoices')
            .select('*, sales_invoice_items(*)')
            .order('date_issued', { ascending: false });

        if (error) {
            console.error('[salesInvoiceService] Error fetching invoices:', error);
            throw error;
        }
        return (data || []).map(SalesInvoiceDTO.fromDatabase);
    },

    // 2. Fetch single invoice by UUID or SI Number (including delivery receipts & customer profile)
    async getSalesInvoiceById(identifier) {
        if (!identifier) throw new Error("No invoice identifier provided.");

        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifier);
        const queryColumn = isUuid ? 'id' : 'si_number';

        const { data, error } = await supabase
            .from('sales_invoices')
            .select('*, sales_invoice_items(*)')
            .eq(queryColumn, identifier)
            .maybeSingle();

        if (error) throw error;
        if (!data) throw new Error(`Sales Invoice "${identifier}" not found.`);

        // Fetch customer profile details
        let customerProfile = { tin: '', address: '' };
        if (data.customer_id) {
            const { data: cust } = await supabase
                .from('customers')
                .select('tin, address')
                .eq('id', data.customer_id)
                .maybeSingle();
            if (cust) customerProfile = cust;
        } else if (data.customer_name) {
            const { data: cust } = await supabase
                .from('customers')
                .select('tin, address')
                .ilike('name', data.customer_name.trim())
                .maybeSingle();
            if (cust) customerProfile = cust;
        }

        // Fetch linked delivery receipts
        const { data: drs } = await supabase
            .from('delivery_receipts')
            .select('*')
            .eq('sales_invoice_id', data.id)
            .order('date_issued', { ascending: false });

        const dto = SalesInvoiceDTO.fromDatabase(data);

        return {
            ...dto,
            tin: customerProfile.tin || '',
            businessAddress: customerProfile.address || '',
            deliveryReceipts: drs || []
        };
    },

    // 3. Create sales invoice
    async createSalesInvoice(invoiceInput) {
        const invoiceDTO = new SalesInvoiceDTO(invoiceInput);
        const customer = await customerService.findOrCreateCustomer(invoiceDTO.customerName);

        // Update customer profile if TIN or Address was passed
        if (customer && (invoiceInput.tin || invoiceInput.businessAddress)) {
            await customerService.updateCustomer(customer.id, {
                customerName: invoiceDTO.customerName,
                tin: invoiceInput.tin || null,
                businessAddress: invoiceInput.businessAddress || null
            });
        }

        const { data: invoice, error: invoiceError } = await supabase
            .from('sales_invoices')
            .insert([invoiceDTO.toDatabase(customer?.id)])
            .select()
            .single();

        if (invoiceError) throw invoiceError;

        if (invoiceDTO.items.length > 0) {
            const itemsPayload = invoiceDTO.items.map((item) => item.toDatabase(invoice.id));
            const { error: itemsError } = await supabase
                .from('sales_invoice_items')
                .insert(itemsPayload);

            if (itemsError) throw itemsError;
        }

        return SalesInvoiceDTO.fromDatabase(invoice);
    },

    // 4. Update sales invoice
    async updateSalesInvoice(identifier, input) {
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifier);
        
        let dbId = identifier;
        if (!isUuid) {
            const { data: existing, error: findErr } = await supabase
                .from('sales_invoices')
                .select('id')
                .eq('si_number', identifier)
                .single();
            if (findErr) throw findErr;
            dbId = existing.id;
        }

        const invoiceDTO = new SalesInvoiceDTO({ ...input, id: dbId });
        const customer = await customerService.findOrCreateCustomer(invoiceDTO.customerName);

        if (customer && (input.tin !== undefined || input.businessAddress !== undefined)) {
            await customerService.updateCustomer(customer.id, {
                customerName: invoiceDTO.customerName,
                tin: input.tin || null,
                businessAddress: input.businessAddress || null
            });
        }

        const { error: updateErr } = await supabase
            .from('sales_invoices')
            .update(invoiceDTO.toDatabase(customer?.id))
            .eq('id', dbId);

        if (updateErr) throw updateErr;

        if (input.items) {
            await supabase.from('sales_invoice_items').delete().eq('sales_invoice_id', dbId);
            if (invoiceDTO.items.length > 0) {
                const itemsPayload = invoiceDTO.items.map((item) => item.toDatabase(dbId));
                const { error: itemsError } = await supabase
                    .from('sales_invoice_items')
                    .insert(itemsPayload);
                if (itemsError) throw itemsError;
            }
        }

        return this.getSalesInvoiceById(dbId);
    },

    // 5. Update delivery status directly (inline row toggle)
    async updateDeliveryStatus(identifier, deliveryStatus) {
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifier);
        const queryColumn = isUuid ? 'id' : 'si_number';

        const { data, error } = await supabase
            .from('sales_invoices')
            .update({ 
                delivery_status: deliveryStatus,
                updated_at: new Date().toISOString() 
            })
            .eq(queryColumn, identifier)
            .select();

        if (error) {
            console.error('[salesInvoiceService] Error updating delivery status:', error);
            throw error;
        }
        return data;
    },

    // 6. Delete invoice
    async deleteSalesInvoice(identifier) {
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifier);
        const queryColumn = isUuid ? 'id' : 'si_number';

        const { error } = await supabase
            .from('sales_invoices')
            .delete()
            .eq(queryColumn, identifier);

        if (error) throw error;
    }
};