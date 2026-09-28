// src/pages/SalesInvoicesDetails.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import DeliveryReceiptStatusSelector from '../components/DeliveryReceiptStatusSelector';
import ChargeInvoiceDetailsModal from '../components/ChargeInvoiceDetailsModal';
import CreateDeliveryReceiptModal from '../components/CreateDeliveryReceiptModal';
import DeliveryReceiptBlock from '../components/DeliveryReceiptBlock';
import { supabase } from '../lib/supabaseClient';
import { customerService } from '../services/customerService';
import { receiptService } from '../services/receiptService';

function SalesInvoicesDetails() {
    const { id: invoiceIdentifier } = useParams();
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    // Loading & Saving States
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Form state matching database schema
    const [formData, setFormData] = useState({
        id: null,
        siNumber: '',
        customerId: null,
        customer: '',
        dateIssued: '',
        tin: '',
        businessAddress: '',
        amount: '',
        deliveryStatus: 'pending',
        legacyOrderDetails: ''
    });

    const [items, setItems] = useState([]);
    const [deliveryReceipts, setDeliveryReceipts] = useState([]);

    const [isItemModalOpen, setIsItemModalOpen] = useState(false);
    const [isDeliveryReceiptModalOpen, setIsDeliveryReceiptModalOpen] = useState(false);

    useEffect(() => {
        if (invoiceIdentifier && invoiceIdentifier !== 'undefined' && invoiceIdentifier !== 'null') {
            loadInvoiceDetails(invoiceIdentifier);
        } else {
            setLoading(false);
        }
    }, [invoiceIdentifier]);

    const loadInvoiceDetails = async (identifier) => {
        try {
            setLoading(true);
            const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifier);
            const queryColumn = isUuid ? 'id' : 'si_number';

            // 1. Fetch base invoice
            const { data: inv, error: invError } = await supabase
                .from('sales_invoices')
                .select('*')
                .eq(queryColumn, identifier)
                .maybeSingle();

            if (invError) throw invError;
            if (!inv) throw new Error(`Sales invoice "${identifier}" not found.`);

            const dbId = inv.id;

            // 2. Fetch items explicitly
            let fetchedItems = [];
            const { data: itemRows, error: itemError } = await supabase
                .from('sales_invoice_items')
                .select('*')
                .eq('sales_invoice_id', dbId);

            if (!itemError && itemRows && itemRows.length > 0) {
                fetchedItems = itemRows.map((it) => ({
                    id: it.id,
                    name: it.item_name || it.name || '',
                    quantity: Number(it.quantity || 1),
                    price: Number(it.unit_price || it.price || 0)
                }));
            }
            setItems(fetchedItems);

            // 3. Resolve customer profile from customers table
            let resolvedCustomerId = inv.customer_id || null;
            let customerExtra = { tin: '', businessAddress: '' };

            let custQuery = supabase.from('customers').select('*');
            if (resolvedCustomerId) {
                custQuery = custQuery.eq('id', resolvedCustomerId);
            } else if (inv.customer_name && inv.customer_name.trim()) {
                custQuery = custQuery.ilike('name', inv.customer_name.trim());
            }

            const { data: cust } = await custQuery.maybeSingle();

            if (cust) {
                resolvedCustomerId = cust.id;
                customerExtra = {
                    tin: cust.tin || '',
                    businessAddress: cust.address || ''
                };
            }

            const resolvedLegacyDetails = 
                inv.legacy_order_details || 
                inv.legacyOrderDetails || 
                inv.details || 
                '';

            const rawAmount = inv.amount ?? inv.legacy_amount ?? 0;

            setFormData({
                id: dbId,
                siNumber: inv.si_number || '',
                customerId: resolvedCustomerId,
                customer: inv.customer_name || cust?.name || '',
                dateIssued: inv.date_issued || '',
                tin: customerExtra.tin,
                businessAddress: customerExtra.businessAddress,
                amount: rawAmount > 0 ? String(rawAmount) : '0',
                deliveryStatus: inv.delivery_status || 'pending',
                legacyOrderDetails: resolvedLegacyDetails
            });

            // 4. Fetch linked delivery receipts using sales_invoice_id (with customer name fallback)
            try {
                const { data: drs } = await supabase
                    .from('delivery_receipts')
                    .select('*')
                    .or(`sales_invoice_id.eq.${dbId},delivered_to.eq.${inv.customer_name}`)
                    .order('date_issued', { ascending: false });

                if (drs && drs.length > 0) {
                    setDeliveryReceipts(drs.map((dr) => ({
                        id: dr.id,
                        drNumber: dr.dr_number || dr.drNumber || 'DR',
                        dateIssued: dr.date_issued || dr.dateIssued || '',
                        initialStatus: dr.status || dr.initialStatus || 'pending delivery',
                        amount: Number(dr.total_paid_amount ?? dr.totalPaidAmount ?? dr.amount ?? 0)
                    })));
                } else {
                    setDeliveryReceipts([]);
                }
            } catch (_) {}

        } catch (err) {
            console.error('Error loading sales invoice details:', err);
            alert(`Failed to load sales invoice: ${err.message}`);
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleSaveItems = (newItems) => {
        const sanitized = (newItems || [])
            .map((item) => ({
                name: (item.name || item.item_name || item.itemName || '').trim(),
                quantity: Number(item.quantity) || 1,
                price: Number(item.price || item.unit_price || item.unitPrice) || 0
            }))
            .filter((item) => item.name !== '');

        setItems(sanitized);

        const newItemsTotal = sanitized.reduce(
            (sum, item) => sum + (Number(item.quantity) * Number(item.price)), 
            0
        );

        setFormData((prev) => ({
            ...prev,
            amount: newItemsTotal > 0 ? String(newItemsTotal) : prev.amount,
            legacyOrderDetails: sanitized.length > 0 ? '' : prev.legacyOrderDetails
        }));
    };

    const calculatedItemsTotal = items.reduce(
        (sum, item) => sum + (Number(item.quantity) * Number(item.price)), 
        0
    );

    // Save Updates to Supabase with proper customer table columns & delivery status
    const handleSaveInvoice = async () => {
        const dbId = formData.id;
        if (!dbId) {
            alert('Cannot save: Missing invoice database UUID.');
            return;
        }

        try {
            setSaving(true);
            const hasItemized = items && items.length > 0;
            const finalAmount = parseFloat(formData.amount) || (hasItemized ? calculatedItemsTotal : 0);
            let activeCustomerId = formData.customerId;
            const custName = (formData.customer || '').trim();

            // 1. Resolve or create customer account if not yet linked
            if (!activeCustomerId && custName && custName.toLowerCase() !== 'walk-in' && custName.toLowerCase() !== 'cancelled') {
                const existingCustomer = await customerService.findOrCreateCustomer(custName);
                if (existingCustomer) {
                    activeCustomerId = existingCustomer.id;
                }
            }

            // 2. Update customer profile in customers table (name, tin, address)
            if (activeCustomerId) {
                const { error: custErr } = await supabase
                    .from('customers')
                    .update({
                        name: custName,
                        tin: formData.tin || null,
                        address: formData.businessAddress || null,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', activeCustomerId);

                if (custErr) throw custErr;
            }

            // 3. Update sales_invoices row including delivery_status
            const { error: updateError } = await supabase
                .from('sales_invoices')
                .update({
                    si_number: formData.siNumber,
                    customer_name: custName,
                    customer_id: activeCustomerId,
                    date_issued: formData.dateIssued,
                    details: hasItemized ? null : (formData.legacyOrderDetails.trim() || null),
                    legacy_order_details: hasItemized ? null : (formData.legacyOrderDetails.trim() || null),
                    amount: finalAmount,
                    legacy_amount: finalAmount,
                    delivery_status: formData.deliveryStatus || 'pending',
                    updated_at: new Date().toISOString()
                })
                .eq('id', dbId);

            if (updateError) throw updateError;

            // 4. Delete and recreate items using the valid dbId UUID
            await supabase.from('sales_invoice_items').delete().eq('sales_invoice_id', dbId);

            if (hasItemized) {
                const itemsPayload = items.map((it) => ({
                    sales_invoice_id: dbId,
                    item_name: it.name,
                    quantity: Number(it.quantity) || 1,
                    unit_price: Number(it.price) || 0
                }));

                const { error: insertItemsErr } = await supabase
                    .from('sales_invoice_items')
                    .insert(itemsPayload);

                if (insertItemsErr) throw insertItemsErr;
            }

            await queryClient.invalidateQueries({ queryKey: ['sales_invoices'] });
            await queryClient.invalidateQueries({ queryKey: ['customer_details'] });
            await queryClient.invalidateQueries({ queryKey: ['customer_accounts'] });

            alert('Sales invoice and customer details updated successfully!');
            await loadInvoiceDetails(dbId);
        } catch (err) {
            console.error('Error updating sales invoice:', err);
            alert(`Failed to update invoice: ${err.message}`);
        } finally {
            setSaving(false);
        }
    };

    // Delete Invoice
    const handleDelete = async () => {
        const dbId = formData.id;
        if (!dbId) return;

        if (!window.confirm(`Are you sure you want to delete sales invoice ${formData.siNumber}? This cannot be undone.`)) {
            return;
        }

        try {
            await supabase.from('sales_invoice_items').delete().eq('sales_invoice_id', dbId);
            const { error } = await supabase.from('sales_invoices').delete().eq('id', dbId);
            if (error) throw error;

            await queryClient.invalidateQueries({ queryKey: ['sales_invoices'] });
            alert('Sales invoice deleted successfully.');
            navigate('/sales-invoices');
        } catch (err) {
            console.error('Error deleting sales invoice:', err);
            alert(`Failed to delete invoice: ${err.message}`);
        }
    };

    // Persist Delivery Receipt to Supabase
    const handleCreateDeliveryReceipt = async (drFormData) => {
        const targetId = formData.id;
        if (!targetId) {
            alert('Please save the invoice before generating a delivery receipt.');
            return;
        }

        try {
            const isPickUp = drFormData.deliveryType === 'pick_up';

            if (receiptService?.createDeliveryReceipt) {
                await receiptService.createDeliveryReceipt({
                    ...drFormData,
                    salesInvoiceId: targetId,
                    sales_invoice_id: targetId,
                    companyName: drFormData.companyName || formData.customer,
                    customerName: formData.customer,
                    siNumber: formData.siNumber,
                    deliveryType: isPickUp ? 'pick_up' : 'delivery'
                });
            } else {
                // Direct Supabase fallback insert
                const formattedDate = drFormData.dateIssued 
                    ? new Date(drFormData.dateIssued).toISOString().split('T')[0]
                    : new Date().toISOString().split('T')[0];

                const { error: drError } = await supabase
                    .from('delivery_receipts')
                    .insert([{
                        sales_invoice_id: targetId,
                        delivered_to: formData.customer,
                        date_issued: formattedDate,
                        status: isPickUp ? 'completed' : (drFormData.paymentType === 'cash' ? 'completed' : 'pending'),
                        delivery_type: isPickUp ? 'pick_up' : 'delivery',
                        dr_number: drFormData.drNumber || null
                    }]);

                if (drError) throw drError;
            }

            await queryClient.invalidateQueries({ queryKey: ['sales_invoices'] });
            await loadInvoiceDetails(targetId);
            setIsDeliveryReceiptModalOpen(false);
            alert('Delivery receipt created successfully!');
        } catch (err) {
            console.error('Error creating delivery receipt:', err);
            alert(`Failed to create delivery receipt: ${err.message}`);
        }
    };

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center text-gray-500 text-[1vw]">
                Loading sales invoice details...
            </div>
        );
    }

    const isLegacyMode = Boolean(formData.legacyOrderDetails && formData.legacyOrderDetails.trim()) && items.length === 0;

    return (
        <div className="flex flex-col h-screen">
            {/* Header */}
            <div id="pageHeader" className="flex flex-col justify-between shrink-0 p-6">
                <div className="flex items-center justify-between border-b-2 pb-2">
                    <div className="flex items-center gap-4">
                        <h1 className="text-xl font-bold">{formData.siNumber ? `Sales Invoice #${formData.siNumber}` : 'Sales Invoice Details'}</h1>
                        
                        {/* Delivery Status Selector Component */}
                        <DeliveryReceiptStatusSelector
                            initialStatus={formData.deliveryStatus}
                            value={formData.deliveryStatus}
                            onChange={(newStatus) => setFormData((prev) => ({ ...prev, deliveryStatus: newStatus }))}
                            isChargeInvoice={false}
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <button 
                            type="button"
                            disabled={saving}
                            onClick={handleSaveInvoice}
                            className="flex items-center gap-2 border-2 border-[#22E11F] text-[#22E11F] text-[0.8vw] px-3 py-1 rounded-full hover:bg-[#22E11F] hover:text-white transition-colors cursor-pointer font-semibold disabled:opacity-50"
                        >
                            <i className="far fa-check"></i>
                            {saving ? 'Saving...' : 'Save'}
                        </button>
                        <button 
                            type="button"
                            onClick={handleDelete}
                            className="flex items-center gap-2 border-2 border-[#DC1D10] text-[#DC1D10] text-[0.8vw] px-3 py-1 rounded-full hover:bg-[#DC1D10] hover:text-white transition-colors cursor-pointer font-semibold"
                        >
                            <i className="far fa-trash"></i>
                            Delete
                        </button>
                    </div>
                </div>
            </div>

            {/* Content Container */}
            <div id="contentContainer" className="flex-1 flex flex-col gap-4 overflow-y-auto px-6 pt-0 pb-6 [&::-webkit-scrollbar]:hidden">
                {/* Form Row 1: SI ID, Customer & Date Issued */}
                <div className="flex gap-4 shrink-0">
                    <div className="flex flex-col gap-2 w-1/4">
                        <label className="text-[0.8vw] font-semibold text-gray-700">SI Number:</label>
                        <input 
                            type="text" 
                            name="siNumber"
                            value={formData.siNumber}
                            onChange={handleInputChange}
                            placeholder="e.g. SI-2026-1-1"
                            className="border border-gray-300 rounded-md p-2 text-[0.8vw] font-bold text-gray-800 focus:outline-[#5FA5DA]" 
                        />
                    </div>
                    <div className="flex flex-col gap-2 flex-1">
                        <label className="text-[0.8vw] font-semibold text-gray-700">Company / Organization / Customer:</label>
                        <input 
                            type="text" 
                            name="customer"
                            value={formData.customer}
                            onChange={handleInputChange}
                            placeholder="Type customer name..."
                            className="border border-gray-300 rounded-md p-2 text-[0.8vw] focus:outline-[#5FA5DA]" 
                        />
                    </div>
                    <div className="flex flex-col gap-2 w-1/4">
                        <label className="text-[0.8vw] font-semibold text-gray-700">Date Issued:</label>
                        <input 
                            type="date" 
                            name="dateIssued"
                            value={formData.dateIssued}
                            onChange={handleInputChange}
                            className="border border-gray-300 rounded-md p-2 text-[0.8vw] focus:outline-[#5FA5DA]" 
                        />
                    </div>
                </div>

                {/* Form Row 2: TIN, Address & Editable Amount */}
                <div className="flex gap-4 shrink-0">
                    <div className="flex flex-col gap-2 w-1/4">
                        <label className="text-[0.8vw] font-semibold text-gray-700">TIN:</label>
                        <input 
                            type="text" 
                            name="tin"
                            placeholder="000-000-000-000"
                            value={formData.tin}
                            onChange={handleInputChange}
                            className="border border-gray-300 rounded-md p-2 text-[0.8vw] focus:outline-[#5FA5DA]" 
                        />
                    </div>
                    <div className="flex flex-col gap-2 flex-1">
                        <label className="text-[0.8vw] font-semibold text-gray-700">Business / Delivery Address:</label>
                        <input 
                            type="text" 
                            name="businessAddress"
                            placeholder="Enter billing or delivery address..."
                            value={formData.businessAddress}
                            onChange={handleInputChange}
                            className="border border-gray-300 rounded-md p-2 text-[0.8vw] focus:outline-[#5FA5DA]" 
                        />
                    </div>
                    {/* Editable Total Amount Field */}
                    <div className="flex flex-col gap-2 w-1/4">
                        <label className="text-[0.8vw] font-semibold text-gray-700">Amount (₱):</label>
                        <input 
                            type="number"
                            step="0.01"
                            min="0"
                            name="amount"
                            placeholder="0.00"
                            value={formData.amount}
                            onChange={handleInputChange}
                            className="border border-gray-300 rounded-md p-2 text-[0.8vw] font-bold text-gray-800 focus:outline-[#5FA5DA]" 
                        />
                    </div>
                </div>

                {/* Conditional Order Details: Legacy Textarea OR Itemized Table */}
                <div className="flex-1 min-h-55 flex gap-4 items-stretch">
                    {isLegacyMode ? (
                        <div className="flex flex-col gap-2 h-full w-full">
                            <div className="flex items-center justify-between shrink-0">
                                <label className="text-[0.8vw] font-semibold text-gray-700">
                                    Order Details (Legacy Note)
                                </label>
                                <button
                                    type="button"
                                    onClick={() => setIsItemModalOpen(true)}
                                    className="px-2.5 py-0.5 text-[0.75vw] rounded-full border border-[#5FA5DA] text-[#5FA5DA] hover:bg-[#5FA5DA] hover:text-white transition-colors cursor-pointer font-medium"
                                >
                                    + Convert to Itemized Details
                                </button>
                            </div>
                            <textarea 
                                name="legacyOrderDetails"
                                value={formData.legacyOrderDetails}
                                onChange={handleInputChange}
                                placeholder="Unformatted order notes, item counts, or remarks..."
                                className="flex-1 h-full w-full border border-gray-300 rounded-md p-3 text-[0.8vw] resize-none focus:outline-[#5FA5DA]" 
                            />
                        </div>
                    ) : (
                        <div className="flex flex-col gap-2 h-full w-full">
                            <div className="flex items-center justify-between shrink-0">
                                <label className="text-[0.8vw] font-semibold text-gray-700">
                                    Itemized Order Breakdown ({items.length}):
                                </label>
                                <button
                                    type="button"
                                    onClick={() => setIsItemModalOpen(true)}
                                    className="px-2.5 py-0.5 text-[0.75vw] rounded-full border border-[#5FA5DA] text-[#5FA5DA] hover:bg-[#5FA5DA] hover:text-white transition-colors cursor-pointer font-medium"
                                >
                                    + Edit Itemized Details
                                </button>
                            </div>

                            <div className="flex-1 h-full border border-gray-300 rounded-md overflow-y-auto">
                                <table className="w-full border-collapse">
                                    <thead className="sticky top-0 z-10 bg-white">
                                        <tr className="bg-gray-50 border-b border-gray-300">
                                            <th className="p-2 text-left text-[0.8vw]">Item</th>
                                            <th className="p-2 text-center text-[0.8vw]">Quantity</th>
                                            <th className="p-2 text-right text-[0.8vw]">Unit Price</th>
                                            <th className="p-2 text-right text-[0.8vw]">Total</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200">
                                        {items.length === 0 ? (
                                            <tr>
                                                <td colSpan="4" className="p-8 text-center text-gray-400 text-[0.75vw]">
                                                    No delivery items assigned. Click <strong>"+ Edit Itemized Details"</strong> to add items, or type legacy notes.
                                                </td>
                                            </tr>
                                        ) : (
                                            items.map((item, index) => (
                                                <tr key={index} className="hover:bg-gray-50">
                                                    <td className="p-2 text-left text-[0.8vw] font-medium text-gray-800">{item.name || '—'}</td>
                                                    <td className="p-2 text-center text-[0.8vw] text-gray-600">{item.quantity}</td>
                                                    <td className="p-2 text-right text-[0.8vw] text-gray-600">
                                                        ₱{Number(item.price).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                                    </td>
                                                    <td className="p-2 text-right text-[0.8vw] font-semibold text-gray-800">
                                                        ₱{(Number(item.quantity) * Number(item.price)).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>

                {/* Delivery Receipts List */}
                <div className="flex flex-col gap-2 shrink-0">
                    <div className="flex items-center justify-between">
                        <label className="text-[0.9vw] font-bold text-gray-700">
                            Linked Delivery Receipts ({deliveryReceipts.length}):
                        </label>
                        {formData.deliveryStatus === 'no_delivery' && (
                            <span className="text-[0.7vw] font-semibold text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                                Customer Pick-Up / No Delivery
                            </span>
                        )}
                    </div>
                    
                    <div className="flex gap-2 flex-wrap">
                        {deliveryReceipts.length === 0 ? (
                            <span className="text-[0.75vw] text-gray-400">
                                No delivery receipts attached. (If customer is picking up items directly, delivery receipt is optional).
                            </span>
                        ) : (
                            deliveryReceipts.map((dr) => (
                                <DeliveryReceiptBlock 
                                    key={dr.id}
                                    id={dr.id}
                                    drNumber={dr.drNumber}
                                    dateIssued={dr.dateIssued}
                                    amount={dr.amount}
                                    initialStatus={dr.initialStatus}
                                />
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* Bottom Toolbar */}
            <div id="toolBar" className="flex items-center justify-between p-6 border-t border-gray-200 shrink-0 bg-white">
                <div className="flex gap-2 items-center text-[0.9vw]">
                    <button
                        type="button"
                        onClick={() => navigate('/sales-invoices')}
                        className="flex items-center gap-1.5 px-3 py-1 text-[0.8vw] rounded-full border border-gray-300 text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer mr-2"
                    >
                        <i className="far fa-arrow-left"></i>
                        Back to Sales Invoices
                    </button>

                    <button 
                        type="button"
                        onClick={() => setIsDeliveryReceiptModalOpen(true)}
                        className="px-2.5 py-0.5 text-[0.8vw] rounded-full border-2 border-[#5FA5DA] cursor-pointer bg-[#F4F8FB] text-[#5FA5DA] hover:bg-[#5FA5DA] hover:text-white transition-colors"
                    >
                       + Create Delivery Receipt
                    </button>
                </div>

                <div className="flex gap-2 items-center font-bold text-[0.9vw]">
                    <label className="text-gray-700">Amount Total:</label>
                    <span className="text-[#FF8DCE] text-[1.1vw]">
                        ₱{Number(formData.amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                </div>
            </div>

            <ChargeInvoiceDetailsModal 
                isOpen={isItemModalOpen}
                onClose={() => setIsItemModalOpen(false)}
                onSave={handleSaveItems}
                initialItems={items}
            />

            <CreateDeliveryReceiptModal
                isOpen={isDeliveryReceiptModalOpen}
                onClose={() => setIsDeliveryReceiptModalOpen(false)}
                onSubmit={handleCreateDeliveryReceipt}
                companyName={formData.customer}
                customerName={formData.customer}
                salesInvoiceId={formData.id}
                siNumber={formData.siNumber}
                invoiceItems={items}
                legacyOrderDetails={formData.legacyOrderDetails}
                existingDeliveries={deliveryReceipts}
            />
        </div>
    );
}

export default SalesInvoicesDetails;