import { supabase } from '../lib/supabaseClient';
import { ChargeInvoiceDTO } from '../dtos/ChargeInvoiceDTO';

export const dashboardService = {
    async getDashboardData() {
        // 1. Fetch ALL unpaid Charge Invoices (Oldest to Newest)
        const { data: unpaidCI, error: ciError } = await supabase
            .from('charge_invoice_totals')
            .select('*')
            .eq('status', 'unpaid')
            .order('date_issued', { ascending: true }); // Oldest first

        if (ciError) throw ciError;

        const unpaidChargeInvoices = unpaidCI.map(ChargeInvoiceDTO.fromDatabase);

        // 2. Calculate Total Unpaid Accounts Receivable Balance
        const totalUnpaidBalance = unpaidCI.reduce(
            (sum, item) => sum + (Number(item.amount_total) || 0), 
            0
        );

        // 3. Fetch Top Debtors (Aggregated from unpaid Charge Invoices)
        const debtorMap = {};
        unpaidCI.forEach((ci) => {
            const name = ci.customer_name;
            const amount = Number(ci.amount_total) || 0;

            if (!debtorMap[name]) {
                debtorMap[name] = { name, balance: 0, pendingCount: 0 };
            }
            debtorMap[name].balance += amount;
            debtorMap[name].pendingCount += 1;
        });

        const topDebtors = Object.values(debtorMap)
            .sort((a, b) => b.balance - a.balance)
            .slice(0, 5);

        return {
            unpaidInvoices: unpaidChargeInvoices,
            totalUnpaidBalance,
            unpaidCount: unpaidChargeInvoices.length,
            topDebtors
        };
    }
};