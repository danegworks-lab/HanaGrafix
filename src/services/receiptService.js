import { supabase } from '../lib/supabaseClient';
import { DeliveryReceiptDTO } from '../dtos/DeliveryReceiptDTO';
import { CollectionReceiptDTO } from '../dtos/CollectionReceiptDTO';

export const receiptService = {
    // Create Delivery Receipt
    async createDeliveryReceipt(receiptInput) {
        const drDTO = new DeliveryReceiptDTO(receiptInput);

        const { data: receipt, error } = await supabase
            .from('delivery_receipts')
            .insert([drDTO.toDatabase()])
            .select()
            .single();

        if (error) throw error;

        if (drDTO.items.length > 0) {
            const itemsPayload = drDTO.items.map((item) => item.toDatabase(receipt.id));
            const { error: itemsError } = await supabase
                .from('delivery_receipt_items')
                .insert(itemsPayload);

            if (itemsError) throw itemsError;
        }

        return DeliveryReceiptDTO.fromDatabase(receipt);
    },

    // Create Collection Receipt
    async createCollectionReceipt(receiptInput) {
        const crDTO = new CollectionReceiptDTO(receiptInput);

        const { data: receipt, error } = await supabase
            .from('collection_receipts')
            .insert([crDTO.toDatabase()])
            .select()
            .single();

        if (error) throw error;

        return CollectionReceiptDTO.fromDatabase(receipt);
    }
};