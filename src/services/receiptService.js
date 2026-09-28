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

const normalizeDeliveryStatus = (status) => {
    const s = String(status || 'pending delivery').toLowerCase().trim();
    if (s === 'pending') return 'pending delivery';
    if (s === 'delivered') return 'completed';
    if (['pending delivery', 'completed', 'cancelled'].includes(s)) return s;
    return 'pending delivery';
};

export const receiptService = {
    // ===========================================================================
    // COLLECTION RECEIPTS
    // ===========================================================================

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

    // ===========================================================================
    // DELIVERY RECEIPTS
    // ===========================================================================

    // 1. Fetch All Delivery Receipts
    async getDeliveryReceipts() {
        const { data, error } = await supabase
            .from('delivery_receipts')
            .select(`
                id,
                dr_number,
                charge_invoice_id,
                date_issued,
                payment_type,
                status,
                total_paid_amount,
                delivered_to,
                business_address,
                tin,
                legacy_order_details,
                created_at,
                charge_invoices (
                    id,
                    ci_number,
                    customer_name
                ),
                delivery_receipt_items (*)
            `)
            .order('date_issued', { ascending: false });

        if (error) {
            console.error('[receiptService] Error fetching delivery receipts:', error);
            throw error;
        }

        return (data || []).map((row) => ({
            id: row.id,
            drNumber: row.dr_number,
            ciId: row.charge_invoices?.ci_number || '—',
            chargeInvoiceId: row.charge_invoice_id,
            customerName: row.delivered_to || row.charge_invoices?.customer_name || '—',
            dateIssued: row.date_issued,
            paymentType: row.payment_type || 'cash',
            status: normalizeDeliveryStatus(row.status),
            totalPaidAmount: Number(row.total_paid_amount || 0),
            businessAddress: row.business_address || '',
            tin: row.tin || '',
            legacyDetails: row.legacy_order_details || '',
            items: row.delivery_receipt_items || [],
        }));
    },

    // 2. Fetch Single Delivery Receipt
    async getDeliveryReceiptById(identifier) {
        if (!identifier) throw new Error('No delivery receipt identifier provided.');

        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifier);
        const queryColumn = isUuid ? 'id' : 'dr_number';

        const { data, error } = await supabase
            .from('delivery_receipts')
            .select(`
                *,
                charge_invoices (
                    id,
                    ci_number,
                    customer_name
                ),
                delivery_receipt_items (*)
            `)
            .eq(queryColumn, identifier)
            .maybeSingle();

        if (error) {
            console.error('[receiptService] Error fetching delivery receipt:', error);
            throw error;
        }

        if (!data) throw new Error(`Delivery receipt "${identifier}" not found.`);

        return {
            ...DeliveryReceiptDTO.fromDatabase(data),
            ciNumber: data.charge_invoices?.ci_number || '',
            customerName: data.delivered_to || data.charge_invoices?.customer_name || '',
            status: normalizeDeliveryStatus(data.status),
            items: data.delivery_receipt_items || []
        };
    },

    // 3. Create Delivery Receipt with Line Items
    async createDeliveryReceipt(receiptInput) {
        const drDTO = new DeliveryReceiptDTO({
            ...receiptInput,
            legacyOrderDetails: receiptInput.legacyOrderDetails || receiptInput.deliveryDetailsLegacy || '',
            status: normalizeDeliveryStatus(receiptInput.status)
        });
        const dbPayload = drDTO.toDatabase();

        const { data: receipt, error } = await supabase
            .from('delivery_receipts')
            .insert([{
                ...dbPayload,
                charge_invoice_id: receiptInput.chargeInvoiceId || dbPayload.charge_invoice_id,
                legacy_order_details: receiptInput.legacyOrderDetails || receiptInput.deliveryDetailsLegacy || null
            }])
            .select()
            .single();

        if (error) throw error;

        // Only insert line items if the invoice is using itemized delivery details
        const itemsToInsert = drDTO.items || receiptInput.deliveryDetails || [];
        if (itemsToInsert.length > 0) {
            const itemsPayload = itemsToInsert.map((item) => ({
                delivery_receipt_id: receipt.id,
                item_name: item.name || item.itemName || item.item_name || 'Item',
                quantity: Number(item.quantity) || 1,
                unit_price: Number(item.price || item.unitPrice || item.unit_price) || 0
            }));

            const { error: itemsError } = await supabase
                .from('delivery_receipt_items')
                .insert(itemsPayload);

            if (itemsError) throw itemsError;
        }

        return DeliveryReceiptDTO.fromDatabase(receipt);
    },

    // 4. Update Delivery Receipt
    async updateDeliveryReceipt(id, updateInput) {
        const drDTO = new DeliveryReceiptDTO({
            ...updateInput,
            id,
            status: normalizeDeliveryStatus(updateInput.status)
        });
        const dbPayload = drDTO.toDatabase();

        // Prevent wiping out foreign key if updateInput didn't explicitly change it
        if (!dbPayload.charge_invoice_id) {
            delete dbPayload.charge_invoice_id;
        }

        const { data, error } = await supabase
            .from('delivery_receipts')
            .update(dbPayload)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error('[receiptService] Error updating delivery receipt:', error);
            throw error;
        }

        if (updateInput.items) {
            await supabase.from('delivery_receipt_items').delete().eq('delivery_receipt_id', id);

            if (updateInput.items.length > 0) {
                const itemsPayload = updateInput.items.map((item) => ({
                    delivery_receipt_id: id,
                    item_name: item.name || item.itemName || item.item_name || 'Item',
                    quantity: Number(item.quantity) || 1,
                    unit_price: Number(item.price || item.unitPrice || item.unit_price) || 0
                }));

                const { error: itemsError } = await supabase
                    .from('delivery_receipt_items')
                    .insert(itemsPayload);

                if (itemsError) throw itemsError;
            }
        }

        return this.getDeliveryReceiptById(id);
    },

    // 5. Update Status Only
    async updateDeliveryReceiptStatus(id, newStatus) {
        const { data, error } = await supabase
            .from('delivery_receipts')
            .update({ status: normalizeDeliveryStatus(newStatus) })
            .eq('id', id)
            .select();

        if (error) {
            console.error('[receiptService] Error updating delivery status:', error);
            throw error;
        }
        return data;
    },

    // 6. Delete Delivery Receipt
    async deleteDeliveryReceipt(id) {
        await supabase.from('delivery_receipt_items').delete().eq('delivery_receipt_id', id);

        const { error } = await supabase
            .from('delivery_receipts')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('[receiptService] Error deleting delivery receipt:', error);
            throw error;
        }
    }
};