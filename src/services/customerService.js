import { supabase } from '../lib/supabaseClient';

export const customerService = {
    // Fetch all customers for dropdowns or validation
    async getCustomers() {
        const { data, error } = await supabase
            .from('customers')
            .select('*')
            .order('name', { ascending: true });
            
        if (error) throw error;
        return data;
    },

    // Check if customer exists; if not, create them
    async findOrCreateCustomer(customerName) {
        if (!customerName || !customerName.trim()) return null;

        const trimmedName = customerName.trim();

        // 1. Search existing customer (case-insensitive)
        const { data: existing, error: searchError } = await supabase
            .from('customers')
            .select('*')
            .ilike('name', trimmedName)
            .maybeSingle();

        if (searchError) throw searchError;
        if (existing) return existing;

        // 2. Auto-provision new customer
        const { data: newCustomer, error: createError } = await supabase
            .from('customers')
            .insert([{ name: trimmedName }])
            .select()
            .single();

        if (createError) throw createError;
        return newCustomer;
    }
};