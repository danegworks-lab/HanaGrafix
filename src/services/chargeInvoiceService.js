// src/services/chargeInvoiceService.js
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

    // 2. READ BY ID (with line items, customer profile, DRs, and CRs)
    async getChargeInvoiceById(identifier) {
        if (!identifier) throw new Error("No invoice identifier provided.");

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

        // Fetch customer profile details (TIN, Address) from customers table
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
            tin: customerProfile.tin || '',
            businessAddress: customerProfile.address || '',
            invoice: invoiceDto,
            collectionReceipts: crRes.data || [],
            deliveryReceipts: drRes.data || []
        };
    },

    // 3. CREATE
    async createChargeInvoice(input) {
        const dto = new ChargeInvoiceDTO(input);
        const customer = await customerService.findOrCreateCustomer(dto.customerName);

        // Update customer profile if TIN or Address is provided during creation
        if (customer && (input.tin || input.businessAddress)) {
            await customerService.updateCustomer(customer.id, {
                customerName: dto.customerName,
                tin: input.tin || null,
                businessAddress: input.businessAddress || null
            });
        }

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

    // 4. UPDATE (Header, Line Items, and Customer Profile)
    async updateChargeInvoice(identifier, input) {
        if (!identifier) throw new Error("No invoice identifier provided for update.");

        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifier);
        
        // Resolve true database UUID if given a CI number
        let dbId = identifier;
        if (!isUuid) {
            const { data: existing, error: findErr } = await supabase
                .from('charge_invoices')
                .select('id')
                .eq('ci_number', identifier)
                .single();
            if (findErr) throw findErr;
            dbId = existing.id;
        }

        const dto = new ChargeInvoiceDTO({ ...input, id: dbId });
        const customer = await customerService.findOrCreateCustomer(dto.customerName);

        // Persist TIN and Address updates to the customers table
        if (customer && (input.tin !== undefined || input.businessAddress !== undefined)) {
            await customerService.updateCustomer(customer.id, {
                customerName: dto.customerName,
                tin: input.tin || null,
                businessAddress: input.businessAddress || null
            });
        }

        const { error: updateErr } = await supabase
            .from('charge_invoices')
            .update(dto.toDatabase(customer?.id))
            .eq('id', dbId);

        if (updateErr) throw updateErr;

        if (dto.items) {
            await supabase.from('charge_invoice_items').delete().eq('charge_invoice_id', dbId);
            if (dto.items.length > 0) {
                const itemsPayload = dto.items.map((i) => i.toDatabase(dbId));
                const { error: itemErr } = await supabase
                    .from('charge_invoice_items')
                    .insert(itemsPayload);
                if (itemErr) throw itemErr;
            }
        }

        return this.getChargeInvoiceById(dbId);
    },

    // 5. UPDATE STATUS ONLY (inline row status change)
    async updateStatus(identifier, status) {
        if (!identifier) throw new Error("No invoice identifier provided.");

        const normalizedStatus = String(status).toLowerCase().trim();
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifier);
        const queryColumn = isUuid ? 'id' : 'ci_number';

        const { data, error } = await supabase
            .from('charge_invoices')
            .update({ status: normalizedStatus, updated_at: new Date().toISOString() })
            .eq(queryColumn, identifier)
            .select();

        if (error) {
            console.error('[chargeInvoiceService] Supabase Update Error:', error);
            throw error;
        }

        return data;
    },

    // 6. DELETE
    async deleteChargeInvoice(identifier) {
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifier);
        const queryColumn = isUuid ? 'id' : 'ci_number';

        const { error } = await supabase
            .from('charge_invoices')
            .delete()
            .eq(queryColumn, identifier);

        if (error) throw error;
    },

    // 7. UPDATE DELIVERY STATUS
    async updateDeliveryStatus(identifier, deliveryStatus) {
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifier);
        const queryColumn = isUuid ? 'id' : 'ci_number';

        const { data, error } = await supabase
            .from('charge_invoices')
            .update({ delivery_status: deliveryStatus, updated_at: new Date().toISOString() })
            .eq(queryColumn, identifier)
            .select();

        if (error) {
            console.error('[chargeInvoiceService] Error updating delivery status:', error);
            throw error;
        }
        return data;
    }
};