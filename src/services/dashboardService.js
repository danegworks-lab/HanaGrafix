// src/services/dashboardService.js
import { supabase } from '../lib/supabaseClient';

export const dashboardService = {
  async getDashboardData() {
    let allInvoices = [];
    let from = 0;
    const step = 1000;
    let hasMore = true;

    while (hasMore) {
      const { data, error } = await supabase
        .from('charge_invoices')
        .select(`
          id,
          ci_number,
          date_issued,
          customer_name,
          legacy_amount,
          discount_amount,
          status,
          charge_invoice_items (
            quantity,
            unit_price
          )
        `)
        .in('status', ['unpaid', 'partial'])
        .order('date_issued', { ascending: true })
        .range(from, from + step - 1);

      if (error) {
        console.error('Error fetching dashboard batch:', error);
        break;
      }

      allInvoices = allInvoices.concat(data || []);
      if (!data || data.length < step) {
        hasMore = false;
      } else {
        from += step;
      }
    }

    let totalUnpaidBalance = 0;
    let overdue30Balance = 0;
    let overdue30Count = 0;
    const debtorMap = {};
    const now = new Date();

    const formattedInvoices = allInvoices.map((inv) => {
      const itemsSubtotal = (inv.charge_invoice_items || []).reduce(
        (sum, item) => sum + Number(item.quantity) * Number(item.unit_price),
        0
      );
      const baseSubtotal = itemsSubtotal > 0 ? itemsSubtotal : Number(inv.legacy_amount || 0);
      const netAmount = Math.max(0, baseSubtotal - Number(inv.discount_amount || 0));

      totalUnpaidBalance += netAmount;

      // Calculate Aging (>30 Days)
      const issueDate = inv.date_issued ? new Date(inv.date_issued) : now;
      const daysAge = Math.ceil(Math.abs(now - issueDate) / (1000 * 60 * 60 * 24));

      if (daysAge > 30) {
        overdue30Count += 1;
        overdue30Balance += netAmount;
      }

      // Group by Customer for Watchlist
      const cust = inv.customer_name || 'Walk-in';
      if (!debtorMap[cust]) {
        debtorMap[cust] = { name: cust, balance: 0, pendingCount: 0 };
      }
      debtorMap[cust].balance += netAmount;
      debtorMap[cust].pendingCount += 1;

      return {
        id: inv.id,
        ciNumber: inv.ci_number,
        dateIssued: inv.date_issued,
        customerName: inv.customer_name,
        amount: netAmount,
        status: inv.status
      };
    });

    const topDebtors = Object.values(debtorMap)
      .sort((a, b) => b.balance - a.balance)
      .slice(0, 10);

    return {
      unpaidInvoices: formattedInvoices,
      topDebtors,
      totalUnpaidBalance,
      unpaidCount: formattedInvoices.length,
      overdue30Count,
      overdue30Balance,
      activeDebtorCount: Object.keys(debtorMap).length
    };
  }
};