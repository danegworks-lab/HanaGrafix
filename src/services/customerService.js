// src/services/customerService.js
import { supabase } from '../lib/supabaseClient';
import { CustomerDTO } from '../dtos/CustomerDTO';

export const customerService = {
    // 1. Fetch Customers with aggregated order counts & outstanding balance across CI & SI
    async getCustomersWithStats() {
        const { data, error } = await supabase
            .from('customers')
            .select(`
                *,
                charge_invoices (
                    id,
                    status,
                    legacy_amount,
                    discount_amount,
                    charge_invoice_items (
                        quantity,
                        unit_price
                    )
                ),
                sales_invoices (
                    id,
                    amount,
                    legacy_amount
                )
            `)
            .order('name', { ascending: true });

        if (error) {
            console.error('[customerService] Error fetching customer accounts:', error);
            throw error;
        }

        return (data || []).map((customerRecord) => {
            const chargeInvoices = customerRecord.charge_invoices || [];
            const salesInvoices = customerRecord.sales_invoices || [];
            const totalOrders = chargeInvoices.length + salesInvoices.length;

            // Sum only unpaid and partial invoice balances from charge invoices
            const unpaidBalance = chargeInvoices
                .filter((inv) => inv.status === 'unpaid' || inv.status === 'partial')
                .reduce((sum, inv) => {
                    const itemsSubtotal = (inv.charge_invoice_items || []).reduce(
                        (itemSum, item) => itemSum + (Number(item.quantity) * Number(item.unit_price)),
                        0
                    );
                    const baseSubtotal = itemsSubtotal > 0 ? itemsSubtotal : (Number(inv.legacy_amount) || 0);
                    const net = Math.max(0, baseSubtotal - (Number(inv.discount_amount) || 0));
                    return sum + net;
                }, 0);

            return CustomerDTO.fromDatabase(customerRecord, {
                totalOrders,
                unpaidBalance
            });
        });
    },

    // 2. Fetch Single Customer Profile by UUID
    async getCustomerById(id) {
        if (!id) throw new Error("No customer ID provided.");

        const { data, error } = await supabase
            .from('customers')
            .select('*')
            .eq('id', id)
            .maybeSingle();

        if (error) {
            console.error('[customerService] Error fetching customer:', error);
            throw error;
        }

        return CustomerDTO.fromDatabase(data);
    },

    // 3. Find or Create Customer by Name
    async findOrCreateCustomer(name) {
        if (!name || !name.trim()) return null;
        const cleanName = name.trim();

        // Check if customer already exists
        const { data: existing, error: searchErr } = await supabase
            .from('customers')
            .select('*')
            .ilike('name', cleanName)
            .maybeSingle();

        if (searchErr) {
            console.error('[customerService] Error looking up customer:', searchErr);
        }

        if (existing) {
            return CustomerDTO.fromDatabase(existing);
        }

        // Create if missing
        const newCustomer = new CustomerDTO({ name: cleanName });
        const { data: created, error: insertErr } = await supabase
            .from('customers')
            .insert([newCustomer.toDatabase()])
            .select()
            .single();

        if (insertErr) {
            console.error('[customerService] Error auto-creating customer:', insertErr);
            throw insertErr;
        }

        return CustomerDTO.fromDatabase(created);
    },

    // 4. Fetch single customer with all linked charge invoices and sales invoices
    async getCustomerAccountDetails(customerId) {
        if (!customerId) throw new Error("Customer ID is required");

        // Fetch Customer Profile
        const { data: customer, error: customerError } = await supabase
            .from('customers')
            .select('*')
            .eq('id', customerId)
            .maybeSingle();

        if (customerError) {
            console.error('[customerService] Error fetching customer account details:', customerError);
            throw customerError;
        }

        if (!customer) return null;

        // Fetch Charge Invoices (match by customer_id or customer_name fallback)
        const { data: chargeInvoices = [], error: ciError } = await supabase
            .from('charge_invoices')
            .select(`
                id,
                ci_number,
                date_issued,
                status,
                legacy_amount,
                discount_amount,
                charge_invoice_items (
                    quantity,
                    unit_price
                )
            `)
            .or(`customer_id.eq.${customerId},customer_name.ilike.${customer.name}`);

        if (ciError) {
            console.warn('[customerService] Error loading charge invoices for customer:', ciError);
        }

        // Fetch Sales Invoices (match by customer_id or customer_name fallback)
        let salesInvoices = [];
        try {
            const { data: siData, error: siError } = await supabase
                .from('sales_invoices')
                .select(`
                    id,
                    si_number,
                    date_issued,
                    amount,
                    legacy_amount
                `)
                .or(`customer_id.eq.${customerId},customer_name.ilike.${customer.name}`);

            if (!siError && siData) {
                salesInvoices = siData;
            }
        } catch (siErr) {
            console.warn('[customerService] Error loading sales invoices for customer:', siErr);
        }

        // Map Charge Invoices (CI)
        const mappedCI = (chargeInvoices || []).map((ci) => {
            const itemsSubtotal = (ci.charge_invoice_items || []).reduce(
                (sum, item) => sum + (Number(item.quantity) * Number(item.unit_price)),
                0
            );
            const baseSubtotal = itemsSubtotal > 0 ? itemsSubtotal : (Number(ci.legacy_amount) || 0);
            const totalAmount = Math.max(0, baseSubtotal - (Number(ci.discount_amount) || 0));

            return {
                id: ci.ci_number || ci.id,
                rawId: ci.id,
                type: 'CI',
                date: ci.date_issued || '',
                amount: totalAmount,
                status: ci.status || 'unpaid'
            };
        });

        // Map Sales Invoices (SI) - Official receipts default to 'completed'
        const mappedSI = (salesInvoices || []).map((si) => ({
            id: si.si_number || si.id,
            rawId: si.id,
            type: 'SI',
            date: si.date_issued || '',
            amount: Number(si.amount ?? si.legacy_amount ?? 0),
            status: 'completed'
        }));

        // Combine and sort chronologically (most recent first)
        const combinedOrders = [...mappedCI, ...mappedSI].sort((a, b) => {
            const timeA = new Date(a.date || 0).getTime();
            const timeB = new Date(b.date || 0).getTime();
            return timeB - timeA;
        });

        return {
            customer: CustomerDTO.fromDatabase(customer),
            orders: combinedOrders
        };
    },

    // 5. Update customer info
    async updateCustomer(customerId, customerData) {
        if (!customerId) throw new Error("Customer ID is required");

        const { data, error } = await supabase
            .from('customers')
            .update({
                name: customerData.customerName,
                tin: customerData.tin || null,
                address: customerData.businessAddress || customerData.address || null,
                contact_person: customerData.contactPerson || null,
                phone: customerData.contactNumber || customerData.phone || null,
                updated_at: new Date().toISOString()
            })
            .eq('id', customerId)
            .select()
            .single();

        if (error) {
            console.error('[customerService] Error updating customer:', error);
            throw error;
        }

        return CustomerDTO.fromDatabase(data);
    },

    // 6. Delete customer
    async deleteCustomer(customerId) {
        if (!customerId) throw new Error("Customer ID is required");

        const { error } = await supabase
            .from('customers')
            .delete()
            .eq('id', customerId);

        if (error) {
            console.error('[customerService] Error deleting customer:', error);
            throw error;
        }
    }
};