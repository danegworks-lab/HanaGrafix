import { supabase } from '../lib/supabaseClient';
import { customerService } from './customerService';
import { ChargeInvoiceDTO } from '../dtos/ChargeInvoiceDTO';

export const chargeInvoiceService = {
    // 1. READ ALL (using totals view)
    async getChargeInvoices() {
        const { data, error } = await supabase
            .from('charge_invoices')
            .select(`
                *,
                charge_invoice_items(*)
            `)
            .order('date_issued', { ascending: false });

        if (error) {
            console.error('[chargeInvoiceService] Error fetching invoices:', error);
            throw error;
        }

        return data.map(ChargeInvoiceDTO.fromDatabase);
    },

    // 2. READ BY ID (single invoice with line items, DRs, and CRs)
    async getChargeInvoiceById(identifier) {
        if (!identifier) throw new Error("No invoice identifier provided.");

        // Determine if identifier is a UUID or CI Number (e.g. '2026-1-751')
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifier);
        const queryColumn = isUuid ? 'id' : 'ci_number';

        const { data, error } = await supabase
            .from('charge_invoices')
            .select(`
                *,
                charge_invoice_items(*)
            `)
            .eq(queryColumn, identifier)
            .maybeSingle();

        if (error) {
            console.error('[chargeInvoiceService] Error fetching invoice:', error);
            throw error;
        }

        if (!data) {
            throw new Error(`Charge Invoice "${identifier}" could not be found.`);
        }

        // Fetch receipts using the resolved database UUID (data.id)
        const [crRes, drRes] = await Promise.all([
            supabase
                .from('collection_receipts')
                .select('*')
                .eq('charge_invoice_id', data.id)
                .order('date_issued', { ascending: false }),
            supabase
                .from('delivery_receipts')
                .select('*')
                .eq('charge_invoice_id', data.id)
                .order('date_issued', { ascending: false })
        ]);

        const invoiceDto = ChargeInvoiceDTO.fromDatabase(data);

        return {
            ...invoiceDto,
            invoice: invoiceDto,
            collectionReceipts: crRes.data || [],
            deliveryReceipts: drRes.data || []
        };
    },

    // 3. CREATE
    async createChargeInvoice(input) {
        const dto = new ChargeInvoiceDTO(input);
        const customer = await customerService.findOrCreateCustomer(dto.customerName);

        const { data: created, error } = await supabase
            .from('charge_invoices')
            .insert([dto.toDatabase(customer?.id)])
            .select()
            .single();

        if (error) throw error;

        if (dto.items && dto.items.length > 0) {
            const itemsPayload = dto.items.map((i) => i.toDatabase(created.id));
            const { error: itemErr } = await supabase
                .from('charge_invoice_items')
                .insert(itemsPayload);
            if (itemErr) throw itemErr;
        }

        return ChargeInvoiceDTO.fromDatabase(created);
    },

    // 4. UPDATE (Header and Line Items)
    async updateChargeInvoice(id, input) {
        const dto = new ChargeInvoiceDTO({ ...input, id });
        const customer = await customerService.findOrCreateCustomer(dto.customerName);

        const { error: updateErr } = await supabase
            .from('charge_invoices')
            .update(dto.toDatabase(customer?.id))
            .eq('id', id);

        if (updateErr) throw updateErr;

        if (dto.items) {
            await supabase.from('charge_invoice_items').delete().eq('charge_invoice_id', id);
            if (dto.items.length > 0) {
                const itemsPayload = dto.items.map((i) => i.toDatabase(id));
                const { error: itemErr } = await supabase
                    .from('charge_invoice_items')
                    .insert(itemsPayload);
                if (itemErr) throw itemErr;
            }
        }

        return this.getChargeInvoiceById(id);
    },

    // 5. UPDATE STATUS ONLY (inline row status change)
    async updateStatus(identifier, status) {
        if (!identifier) throw new Error("No invoice identifier provided.");

        const normalizedStatus = String(status).toLowerCase().trim();
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifier);
        const queryColumn = isUuid ? 'id' : 'ci_number';

        const { data, error } = await supabase
            .from('charge_invoices')
            .update({ status: normalizedStatus })
            .eq(queryColumn, identifier)
            .select();

        if (error) {
            console.error('[chargeInvoiceService] Supabase Update Error:', error);
            throw error;
        }

        return data;
    },

    // 6. DELETE
    async deleteChargeInvoice(id) {
        const { error } = await supabase
            .from('charge_invoices')
            .delete()
            .eq('id', id);

        if (error) throw error;
    },

    async updateDeliveryStatus(identifier, deliveryStatus) {
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifier);
        const query = supabase.from('charge_invoices').update({ delivery_status: deliveryStatus });
        
        const { data, error } = isUuid 
            ? await query.eq('id', identifier).select() 
            : await query.eq('ci_number', identifier).select();

        if (error) {
            console.error('[chargeInvoiceService] Error updating delivery status:', error);
            throw error;
        }
        return data;
    }
};