// src/services/receiptService.js
import { supabase } from '../lib/supabaseClient';
import { DeliveryReceiptDTO } from '../dtos/DeliveryReceiptDTO';
import { CollectionReceiptDTO } from '../dtos/CollectionReceiptDTO';

const normalizeStatus = (status) => {
    const s = String(status || 'full').toLowerCase().trim();
    if (s === 'paid' || s === 'completed') return 'full';
    if (['full', 'partial', 'pending', 'cancelled'].includes(s)) return s;
    return 'full';
};

export const receiptService = {
    // 1. Fetch All Collection Receipts
    async getCollectionReceipts() {
        const { data, error } = await supabase
            .from('collection_receipts')
            .select(`
                id,
                cr_number,
                charge_invoice_id,
                date_issued,
                payment_type,
                status,
                amount_collected,
                remarks,
                created_at,
                charge_invoices (
                    id,
                    ci_number,
                    customer_name
                )
            `)
            .order('date_issued', { ascending: false });

        if (error) {
            console.error('[receiptService] Error fetching collection receipts:', error);
            throw error;
        }

        return (data || []).map((row) => ({
            id: row.id,
            crNumber: row.cr_number,
            ciId: row.charge_invoices?.ci_number || '—',
            chargeInvoiceId: row.charge_invoice_id,
            customerName: row.charge_invoices?.customer_name || '—',
            dateIssued: row.date_issued,
            amountCollected: Number(row.amount_collected || 0),
            paymentType: row.payment_type || 'cash',
            status: normalizeStatus(row.status),
            remarks: row.remarks || '',
        }));
    },

    // 2. Fetch Single Collection Receipt By ID or CR Number
    async getCollectionReceiptById(identifier) {
        if (!identifier) throw new Error('No receipt identifier provided.');

        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifier);
        const queryColumn = isUuid ? 'id' : 'cr_number';

        const { data, error } = await supabase
            .from('collection_receipts')
            .select(`
                *,
                charge_invoices (
                    id,
                    ci_number,
                    customer_name
                )
            `)
            .eq(queryColumn, identifier)
            .maybeSingle();

        if (error) {
            console.error('[receiptService] Error fetching collection receipt:', error);
            throw error;
        }

        if (!data) throw new Error(`Collection receipt "${identifier}" not found.`);

        return {
            id: data.id,
            crNumber: data.cr_number,
            ciId: data.charge_invoices?.ci_number || '—',
            ciNumber: data.charge_invoices?.ci_number || '—',
            chargeInvoiceId: data.charge_invoice_id,
            customer: data.charge_invoices?.customer_name || '',
            customerName: data.charge_invoices?.customer_name || '',
            dateIssued: data.date_issued,
            amountCollected: Number(data.amount_collected || 0),
            amount: Number(data.amount_collected || 0),
            paymentType: data.payment_type || 'cash',
            status: normalizeStatus(data.status),
            remarks: data.remarks || ''
        };
    },

    // 3. Create Collection Receipt
    async createCollectionReceipt(receiptInput) {
        const crDTO = new CollectionReceiptDTO(receiptInput);
        const dbPayload = crDTO.toDatabase();

        const cleanPayload = {
            cr_number: dbPayload.cr_number,
            charge_invoice_id: receiptInput.chargeInvoiceId || dbPayload.charge_invoice_id,
            date_issued: dbPayload.date_issued,
            payment_type: dbPayload.payment_type,
            status: normalizeStatus(dbPayload.status),
            amount_collected: dbPayload.amount_collected,
            remarks: dbPayload.remarks
        };

        const { data: receipt, error } = await supabase
            .from('collection_receipts')
            .insert([cleanPayload])
            .select()
            .single();

        if (error) throw error;

        return CollectionReceiptDTO.fromDatabase(receipt);
    },

    // 4. Update Collection Receipt
    async updateCollectionReceipt(id, updateInput) {
        const cleanPayload = {
            cr_number: updateInput.crNumber || updateInput.cr_number,
            date_issued: updateInput.dateIssued || updateInput.date_issued,
            payment_type: updateInput.paymentType || updateInput.payment_type,
            status: normalizeStatus(updateInput.status),
            amount_collected: parseFloat(updateInput.amountCollected ?? updateInput.amount ?? updateInput.amount_collected ?? 0),
            remarks: updateInput.remarks || null
        };

        const { data, error } = await supabase
            .from('collection_receipts')
            .update(cleanPayload)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error('[receiptService] Error updating collection receipt:', error);
            throw error;
        }

        return data;
    },

    // 5. Update Status Only
    async updateCollectionReceiptStatus(id, newStatus) {
        const { data, error } = await supabase
            .from('collection_receipts')
            .update({ status: normalizeStatus(newStatus) })
            .eq('id', id)
            .select();

        if (error) throw error;
        return data;
    },

    // 6. Delete Collection Receipt
    async deleteCollectionReceipt(id) {
        const { error } = await supabase
            .from('collection_receipts')
            .delete()
            .eq('id', id);

        if (error) throw error;
    },

    // Delivery Receipts methods
    async createDeliveryReceipt(receiptInput) {
        const drDTO = new DeliveryReceiptDTO(receiptInput);
        const { data: receipt, error } = await supabase
            .from('delivery_receipts')
            .insert([drDTO.toDatabase()])
            .select()
            .single();

        if (error) throw error;

        const itemsToInsert = drDTO.items || receiptInput.deliveryDetails || [];
        if (itemsToInsert.length > 0) {
            const itemsPayload = itemsToInsert.map((item) => ({
                delivery_receipt_id: receipt.id,
                item_name: item.name || item.itemName || 'Item',
                quantity: Number(item.quantity) || 1,
                unit_price: Number(item.price || item.unitPrice) || 0
            }));

            const { error: itemsError } = await supabase
                .from('delivery_receipt_items')
                .insert(itemsPayload);

            if (itemsError) throw itemsError;
        }

        return DeliveryReceiptDTO.fromDatabase(receipt);
    }
};