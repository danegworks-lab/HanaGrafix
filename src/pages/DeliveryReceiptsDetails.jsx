// src/pages/DeliveryReceiptsDetails.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import DeliveryReceiptStatusSelector from '../components/DeliveryReceiptStatusSelector';
import ChargeInvoiceDetailsModal from '../components/ChargeInvoiceDetailsModal';
import { receiptService } from '../services/receiptService';

function DeliveryReceiptsDetails() {
    const { id: receiptIdentifier } = useParams();
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    // Loading & Saving States
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Dynamic state for itemized details table
    const [items, setItems] = useState([]);

    // Form inputs state
    const [formData, setFormData] = useState({
        id: null,
        drNumber: '',
        ciId: '',
        chargeInvoiceId: null,
        customer: '',
        dateIssued: '',
        deliveredTo: '',
        tin: '',
        businessAddress: '',
        paymentType: 'cash',
        status: 'pending delivery',
        totalPaidAmount: '',
        legacyDeliveryDetails: ''
    });

    const [isItemModalOpen, setIsItemModalOpen] = useState(false);

    useEffect(() => {
        if (receiptIdentifier && receiptIdentifier !== 'undefined' && receiptIdentifier !== 'null') {
            loadReceiptDetails(receiptIdentifier);
        } else {
            setLoading(false);
        }
    }, [receiptIdentifier]);

    const loadReceiptDetails = async (identifier) => {
        try {
            setLoading(true);
            const data = await receiptService.getDeliveryReceiptById(identifier);
            if (!data) throw new Error(`Delivery receipt "${identifier}" not found.`);

            const fetchedItems = (data.items || [])
                .filter((it) => it && (it.item_name || it.name))
                .map((it) => ({
                    name: it.item_name || it.name || '',
                    quantity: Number(it.quantity || 1),
                    price: Number(it.unit_price || it.price || 0)
                }));
            setItems(fetchedItems);

            const resolvedLegacyDetails = 
                data.legacyOrderDetails || 
                data.legacy_order_details || 
                data.legacyDetails || 
                data.deliveryDetailsLegacy || 
                '';

            const rawTotal = data.totalPaidAmount ?? data.total_paid_amount ?? 0;

            setFormData({
                id: data.id || null,
                drNumber: data.drNumber || data.dr_number || '',
                ciId: data.ciNumber || data.charge_invoices?.ci_number || '',
                chargeInvoiceId: data.chargeInvoiceId || data.charge_invoice_id || null,
                customer: data.customerName || data.charge_invoices?.customer_name || '',
                dateIssued: data.dateIssued || data.date_issued || '',
                deliveredTo: data.deliveredTo || data.delivered_to || '',
                tin: data.tin || '',
                businessAddress: data.businessAddress || data.business_address || '',
                paymentType: data.paymentType || data.payment_type || 'cash',
                status: data.status || 'pending delivery',
                totalPaidAmount: rawTotal > 0 ? String(rawTotal) : '0',
                legacyDeliveryDetails: resolvedLegacyDetails
            });
        } catch (err) {
            console.error('Error loading delivery receipt details:', err);
            alert(`Failed to load delivery receipt: ${err.message}`);
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleStatusChange = (newStatus) => {
        setFormData((prev) => ({ ...prev, status: newStatus }));
    };

    // Save handler for itemized details modal
    const handleSaveItems = (newItems) => {
        const sanitized = newItems
            .filter((item) => item.name && item.name.trim())
            .map((item) => ({
                name: item.name,
                quantity: Number(item.quantity) || 1,
                price: Number(item.price) || 0
            }));
        setItems(sanitized);

        const newItemsTotal = sanitized.reduce(
            (sum, item) => sum + (Number(item.quantity) * Number(item.price)), 
            0
        );

        setFormData((prev) => ({
            ...prev,
            totalPaidAmount: newItemsTotal > 0 ? String(newItemsTotal) : prev.totalPaidAmount,
            legacyDeliveryDetails: sanitized.length > 0 ? '' : prev.legacyDeliveryDetails
        }));
    };

    // Computed total from items
    const calculatedItemsTotal = items.reduce(
        (sum, item) => sum + (Number(item.quantity) * Number(item.price)), 
        0
    );

    // Save Updates to Supabase
    const handleSave = async () => {
        const targetId = formData.id || receiptIdentifier;
        if (!targetId) return;

        try {
            setSaving(true);
            const hasItemized = items && items.length > 0;
            const finalTotal = parseFloat(formData.totalPaidAmount) || (hasItemized ? calculatedItemsTotal : 0);

            await receiptService.updateDeliveryReceipt(targetId, {
                drNumber: formData.drNumber,
                chargeInvoiceId: formData.chargeInvoiceId, // Preserves foreign key
                dateIssued: formData.dateIssued,
                deliveredTo: formData.deliveredTo,
                tin: formData.tin,
                businessAddress: formData.businessAddress,
                paymentType: formData.paymentType,
                status: formData.status,
                totalPaidAmount: finalTotal,
                deliveryDetailsLegacy: hasItemized ? null : (formData.legacyDeliveryDetails.trim() || null),
                items: hasItemized ? items : []
            });

            await queryClient.invalidateQueries({ queryKey: ['delivery_receipts'] });
            await queryClient.invalidateQueries({ queryKey: ['charge_invoices'] });

            alert('Delivery Receipt updated successfully!');
            await loadReceiptDetails(targetId);
        } catch (err) {
            console.error('Error updating delivery receipt:', err);
            alert(`Failed to update delivery receipt: ${err.message}`);
        } finally {
            setSaving(false);
        }
    };

    // Delete Delivery Receipt
    const handleDelete = async () => {
        const targetId = formData.id || receiptIdentifier;
        if (!targetId) return;

        if (!window.confirm(`Are you sure you want to delete delivery receipt ${formData.drNumber}? This cannot be undone.`)) {
            return;
        }

        try {
            await receiptService.deleteDeliveryReceipt(targetId);
            await queryClient.invalidateQueries({ queryKey: ['delivery_receipts'] });
            await queryClient.invalidateQueries({ queryKey: ['charge_invoices'] });

            alert('Delivery Receipt deleted successfully.');
            navigate('/delivery-receipts');
        } catch (err) {
            console.error('Error deleting delivery receipt:', err);
            alert(`Failed to delete delivery receipt: ${err.message}`);
        }
    };

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center text-gray-500 text-[1vw]">
                Loading delivery receipt details...
            </div>
        );
    }

    const hasLinkedCi = Boolean(formData.ciId && formData.ciId.trim() && formData.ciId !== '—');
    const isLegacyMode = Boolean(formData.legacyDeliveryDetails && formData.legacyDeliveryDetails.trim()) && items.length === 0;

    return (
        <div className="flex flex-col h-screen">
            {/* Page Header */}
            <div id="pageHeader" className="flex flex-col justify-between shrink-0 p-6">
                <div className="flex items-center justify-between border-b-2 pb-2">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                            <h1 className="text-xl font-bold">{formData.drNumber || 'DR Details'}</h1>
                            
                            {/* Clickable Linked CI Badge */}
                            {hasLinkedCi ? (
                                <button
                                    type="button"
                                    onClick={() => navigate(`/charge-invoice-details/${formData.ciId}`)}
                                    title="Open linked Charge Invoice"
                                    className="text-[0.75vw] px-2.5 py-1 bg-[#EEF8FF] hover:bg-[#5FA5DA] text-[#5FA5DA] hover:text-white border border-[#5FA5DA] rounded-full font-medium transition-colors cursor-pointer"
                                >
                                    Linked CI: {formData.ciId} ↗
                                </button>
                            ) : (
                                <span className="text-[0.75vw] px-2.5 py-1 bg-gray-100 text-gray-400 border border-gray-300 rounded-full font-medium">
                                    No CI Linked
                                </span>
                            )}
                        </div>

                        <DeliveryReceiptStatusSelector 
                            initialStatus={formData.status} 
                            value={formData.status}
                            onChange={handleStatusChange} 
                        />
                    </div>

                    <div className="flex items-center gap-2">
                        <button 
                            type="button"
                            disabled={saving}
                            onClick={handleSave}
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

            {/* Main Content Container */}
            <div id="contentContainer" className="flex-1 flex flex-col gap-4 overflow-y-auto px-6 pt-0 pb-6">
                
                {/* Form Row 1: DR Number, Customer & Date Issued */}
                <div className="flex gap-4 shrink-0">
                    <div className="flex flex-col gap-2 w-1/4">
                        <label className="text-[0.8vw] font-semibold text-gray-700">DR Number:</label>
                        <input 
                            type="text" 
                            name="drNumber"
                            value={formData.drNumber}
                            onChange={handleInputChange}
                            placeholder="e.g. DR-2026-001"
                            className="border border-gray-300 rounded-md p-2 text-[0.8vw] font-semibold focus:outline-[#5FA5DA]" 
                        />
                    </div>
                    <div className="flex flex-col gap-2 flex-1">
                        <label className="text-[0.8vw] font-semibold text-gray-700">Invoice Customer / Account:</label>
                        <input 
                            type="text" 
                            name="customer"
                            value={formData.customer}
                            readOnly
                            title="Linked from Charge Invoice"
                            className="border border-gray-200 bg-gray-50 text-gray-600 rounded-md p-2 text-[0.8vw] focus:outline-none cursor-not-allowed" 
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

                {/* Form Row 2: Delivered To, TIN, Payment Type & Editable Total Amount */}
                <div className="flex gap-4 shrink-0">
                    <div className="flex flex-col gap-2 w-1/4">
                        <label className="text-[0.8vw] font-semibold text-gray-700">Delivered To / Recipient:</label>
                        <input 
                            type="text" 
                            name="deliveredTo"
                            value={formData.deliveredTo}
                            onChange={handleInputChange}
                            placeholder="Recipient or Contact Person..."
                            className="border border-gray-300 rounded-md p-2 text-[0.8vw] focus:outline-[#5FA5DA]" 
                        />
                    </div>
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
                    <div className="flex flex-col gap-2 w-1/4">
                        <label className="text-[0.8vw] font-semibold text-gray-700">Payment Type:</label>
                        <select 
                            name="paymentType"
                            value={formData.paymentType}
                            onChange={handleInputChange}
                            className="border border-gray-300 rounded-md p-2 text-[0.8vw] focus:outline-[#5FA5DA] bg-white cursor-pointer"
                        >
                            <option value="cash">Cash</option>
                            <option value="bank_transfer">Bank Transfer</option>
                            <option value="cheque">Cheque</option>
                        </select>
                    </div>
                    {/* Editable Total Paid Amount */}
                    <div className="flex flex-col gap-2 w-1/4">
                        <label className="text-[0.8vw] font-semibold text-gray-700">Total Amount (₱):</label>
                        <input 
                            type="number"
                            step="0.01"
                            min="0"
                            name="totalPaidAmount"
                            placeholder="0.00"
                            value={formData.totalPaidAmount}
                            onChange={handleInputChange}
                            className="border border-gray-300 rounded-md p-2 text-[0.8vw] font-bold text-gray-800 focus:outline-[#5FA5DA]" 
                        />
                    </div>
                </div>

                {/* Form Row 3: Business Address */}
                <div className="flex flex-col gap-2 shrink-0">
                    <label className="text-[0.8vw] font-semibold text-gray-700">Business / Delivery Address:</label>
                    <input 
                        type="text" 
                        name="businessAddress"
                        placeholder="Enter full delivery or business address..."
                        value={formData.businessAddress}
                        onChange={handleInputChange}
                        className="border border-gray-300 rounded-md p-2 text-[0.8vw] focus:outline-[#5FA5DA]" 
                    />
                </div>

                {/* Conditional Delivery Details: Legacy Textarea OR Itemized Table */}
                <div className="flex-1 min-h-0 flex gap-4 items-stretch">
                    {isLegacyMode ? (
                        <div className="flex flex-col gap-2 h-full w-full">
                            <div className="flex items-center justify-between shrink-0">
                                <label className="text-[0.8vw] font-semibold text-gray-700">
                                    Delivery Details (Legacy Note)
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
                                name="legacyDeliveryDetails"
                                value={formData.legacyDeliveryDetails}
                                onChange={handleInputChange}
                                placeholder="Unformatted delivery notes, references, or instructions..."
                                className="flex-1 h-full w-full border border-gray-300 rounded-md p-3 text-[0.8vw] resize-none focus:outline-[#5FA5DA]" 
                            />
                        </div>
                    ) : (
                        <div className="flex flex-col gap-2 h-full w-full">
                            <div className="flex items-center justify-between shrink-0">
                                <label className="text-[0.8vw] font-semibold text-gray-700">
                                    Itemized Delivery Breakdown ({items.length}):
                                </label>
                                <button
                                    type="button"
                                    onClick={() => setIsItemModalOpen(true)}
                                    className="px-2.5 py-0.5 text-[0.75vw] rounded-full border border-[#5FA5DA] text-[#5FA5DA] hover:bg-[#5FA5DA] hover:text-white transition-colors cursor-pointer font-medium"
                                >
                                    + Edit Items
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
                                                    No delivery items assigned. Click <strong>"+ Edit Items"</strong> to add items, or type legacy notes.
                                                </td>
                                            </tr>
                                        ) : (
                                            items.map((item, index) => (
                                                <tr key={index} className="hover:bg-gray-50">
                                                    <td className="p-2 text-left text-[0.8vw] font-medium text-gray-800">
                                                        {item.name || '—'}
                                                    </td>
                                                    <td className="p-2 text-center text-[0.8vw] text-gray-600">
                                                        {item.quantity}
                                                    </td>
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

            </div>

            {/* Bottom Toolbar */}
            <div id="toolBar" className="flex items-center justify-between p-6 border-t border-gray-200 shrink-0 bg-white">
                <button
                    type="button"
                    onClick={() => navigate('/delivery-receipts')}
                    className="flex items-center gap-1.5 px-3 py-1 text-[0.8vw] rounded-full border border-gray-300 text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors cursor-pointer"
                >
                    <i className="far fa-arrow-left"></i>
                    Back to Receipts
                </button>

                <div className="flex gap-2 items-center font-bold text-[0.9vw]">
                    <label className="text-gray-700">Total Value:</label>
                    <span className="text-[#FF8DCE] text-[1.1vw]">
                        ₱{Number(formData.totalPaidAmount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                </div>
            </div>

            {/* Itemized Details Modal */}
            <ChargeInvoiceDetailsModal 
                isOpen={isItemModalOpen}
                onClose={() => setIsItemModalOpen(false)}
                onSave={handleSaveItems}
                initialItems={items}
            />
        </div>
    );
}

export default DeliveryReceiptsDetails;