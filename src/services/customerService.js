// src/services/customerService.js
import { supabase } from '../lib/supabaseClient';
import { CustomerDTO } from '../dtos/CustomerDTO';

export const customerService = {
    // 1. Fetch Customers with aggregated order counts & outstanding balance
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
                )
            `)
            .order('name', { ascending: true });

        if (error) {
            console.error('[customerService] Error fetching customer accounts:', error);
            throw error;
        }

        return (data || []).map((customerRecord) => {
            const invoices = customerRecord.charge_invoices || [];
            const totalOrders = invoices.length;

            // Sum only unpaid and partial invoice balances
            const unpaidBalance = invoices
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

    // Fetch single customer with all linked charge invoices & items
    async getCustomerAccountDetails(customerId) {
        if (!customerId) throw new Error("Customer ID is required");

        const { data, error } = await supabase
            .from('customers')
            .select(`
                *,
                charge_invoices (
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
                )
            `)
            .eq('id', customerId)
            .maybeSingle();

        if (error) {
            console.error('[customerService] Error fetching customer account details:', error);
            throw error;
        }

        if (!data) return null;

        // Map and calculate amounts for linked charge invoices
        const orders = (data.charge_invoices || []).map((ci) => {
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
                date: ci.date_issued,
                amount: totalAmount,
                status: ci.status || 'unpaid'
            };
        });

        return {
            customer: CustomerDTO.fromDatabase(data),
            orders
        };
    },

    // Update customer info
    async updateCustomer(customerId, customerData) {
        if (!customerId) throw new Error("Customer ID is required");

        const { data, error } = await supabase
            .from('customers')
            .update({
                name: customerData.customerName,
                tin: customerData.tin || null,
                address: customerData.businessAddress || null,
                contact_person: customerData.contactPerson || null,
                phone: customerData.contactNumber || null
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

    // Delete customer
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