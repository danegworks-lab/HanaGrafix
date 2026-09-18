// src/pages/CollectionReceiptsDetails.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import CollectionReceiptStatusSelector from '../components/CollectionReceiptStatusSelector';
import { receiptService } from '../services/receiptService';
import { chargeInvoiceService } from '../services/chargeInvoiceService';

function CollectionReceiptsDetails() {
    const { id: receiptIdentifier } = useParams();
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [invoiceTotal, setInvoiceTotal] = useState(0);

    const [formData, setFormData] = useState({
        id: null,
        crNumber: '',
        ciId: '',
        chargeInvoiceId: null,
        customer: '',
        dateIssued: '',
        paymentType: 'cash',
        amount: '',
        status: 'full',
        remarks: ''
    });

    useEffect(() => {
        if (receiptIdentifier) {
            loadReceiptDetails(receiptIdentifier);
        } else {
            setLoading(false);
        }
    }, [receiptIdentifier]);

    const loadReceiptDetails = async (identifier) => {
        try {
            setLoading(true);
            const data = await receiptService.getCollectionReceiptById(identifier);
            if (!data) throw new Error(`Collection receipt "${identifier}" not found.`);

            const ciKey = data.chargeInvoiceId || data.ciNumber;
            if (ciKey) {
                try {
                    const invData = await chargeInvoiceService.getChargeInvoiceById(ciKey);
                    const inv = invData?.invoice || invData;
                    if (inv) {
                        const itemsTotal = (inv.items || []).reduce(
                            (sum, item) => sum + (Number(item.quantity || 1) * Number(item.price || 0)), 
                            0
                        );
                        const baseTotal = itemsTotal > 0 ? itemsTotal : Number(inv.legacyAmount || inv.amountTotal || 0);
                        const net = Math.max(0, baseTotal - Number(inv.discountAmount || 0));
                        setInvoiceTotal(net);
                    }
                } catch (invErr) {
                    console.warn('Could not fetch linked CI total:', invErr);
                }
            }

            const raw = String(data.status || 'full').toLowerCase();
            const normalizedStatus = (raw === 'paid' || raw === 'completed') ? 'full' : raw;

            setFormData({
                id: data.id || null,
                crNumber: data.crNumber || data.cr_number || '',
                ciId: data.ciNumber || '—',
                chargeInvoiceId: data.chargeInvoiceId || null,
                customer: data.customer || data.customerName || '',
                dateIssued: data.dateIssued || '',
                paymentType: data.paymentType || 'cash',
                amount: data.amountCollected ?? data.amount ?? 0,
                status: normalizedStatus,
                remarks: data.remarks || ''
            });
        } catch (err) {
            console.error('Error loading collection receipt:', err);
            alert(`Failed to load collection receipt: ${err.message}`);
        } finally {
            setLoading(false);
        }
    };

    // Auto-calculate status between 'partial' and 'full' when amount changes
    const handleInputChange = (e) => {
        const { name, value } = e.target;

        setFormData((prev) => {
            const updated = { ...prev, [name]: value };

            if (name === 'amount') {
                const numericAmount = parseFloat(value) || 0;
                if (invoiceTotal > 0 && prev.status !== 'cancelled') {
                    if (numericAmount >= invoiceTotal) {
                        updated.status = 'full';
                    } else if (numericAmount > 0) {
                        updated.status = 'partial';
                    }
                }
            }

            return updated;
        });
    };

    const handleStatusChange = (newStatus) => {
        const norm = String(newStatus).toLowerCase() === 'paid' ? 'full' : newStatus;
        setFormData((prev) => ({ ...prev, status: norm }));
    };

    const handleSave = async () => {
        const targetId = formData.id || receiptIdentifier;
        if (!targetId) return;

        try {
            setSaving(true);

            await receiptService.updateCollectionReceipt(targetId, {
                cr_number: formData.crNumber,
                date_issued: formData.dateIssued,
                payment_type: formData.paymentType,
                status: formData.status === 'paid' ? 'full' : formData.status,
                amount_collected: parseFloat(formData.amount) || 0,
                remarks: formData.remarks || null
            });

            await queryClient.invalidateQueries({ queryKey: ['collection_receipts'] });
            await queryClient.invalidateQueries({ queryKey: ['charge_invoices'] });

            alert('Collection Receipt updated successfully!');
            await loadReceiptDetails(targetId);
        } catch (err) {
            console.error('Error updating receipt:', err);
            alert(`Failed to update receipt: ${err.message}`);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        const targetId = formData.id || receiptIdentifier;
        if (!targetId) return;

        if (!window.confirm(`Are you sure you want to delete receipt ${formData.crNumber}?`)) return;

        try {
            await receiptService.deleteCollectionReceipt(targetId);
            await queryClient.invalidateQueries({ queryKey: ['collection_receipts'] });
            await queryClient.invalidateQueries({ queryKey: ['charge_invoices'] });
            alert('Collection Receipt deleted successfully.');
            navigate('/collection-receipts');
        } catch (err) {
            console.error('Error deleting receipt:', err);
            alert(`Failed to delete receipt: ${err.message}`);
        }
    };

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center text-gray-500 text-[1vw]">
                Loading collection receipt details...
            </div>
        );
    }

    const isFullSettlement = formData.status === 'full';

    return (
        <div className="flex flex-col h-screen">
            {/* Page Header */}
            <div id="pageHeader" className="flex flex-col justify-between shrink-0 p-6">
                <div className="flex items-center justify-between border-b-2 pb-2">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                            <h1 className="text-xl font-bold">{formData.crNumber || 'CR Details'}</h1>
                            {formData.ciId && formData.ciId !== '—' ? (
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

                        <CollectionReceiptStatusSelector 
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
                
                {/* Form Row 1: CR Number, Customer & Date Issued */}
                <div className="flex gap-4 shrink-0">
                    <div className="flex flex-col gap-2 w-1/4">
                        <label className="text-[0.8vw] font-semibold text-gray-700">CR Number:</label>
                        <input 
                            type="text" 
                            name="crNumber"
                            value={formData.crNumber}
                            onChange={handleInputChange}
                            placeholder="e.g. CR-2026-001"
                            className="border border-gray-300 rounded-md p-2 text-[0.8vw] font-semibold focus:outline-[#5FA5DA]" 
                        />
                    </div>
                    <div className="flex flex-col gap-2 flex-1">
                        <label className="text-[0.8vw] font-semibold text-gray-700">Customer / Company:</label>
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

                {/* Form Row 2: Payment Type, Amount Collected & Status */}
                <div className="flex gap-4 shrink-0">
                    <div className="flex flex-col gap-2 w-1/3">
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

                    <div className="flex flex-col gap-2 w-1/3">
                        <div className="flex justify-between items-center">
                            <label className="text-[0.8vw] font-semibold text-gray-700">Amount Collected (₱):</label>
                            {invoiceTotal > 0 && (
                                <span className="text-[0.68vw] text-gray-500 font-medium">
                                    Target: ₱{invoiceTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                </span>
                            )}
                        </div>
                        <input 
                            type="number" 
                            step="0.01"
                            name="amount"
                            placeholder="0.00"
                            value={formData.amount}
                            onChange={handleInputChange}
                            className="border border-gray-300 rounded-md p-2 text-[0.8vw] font-bold text-emerald-600 focus:outline-[#5FA5DA]" 
                        />
                    </div>

                    <div className="flex flex-col gap-2 w-1/3">
                        <label className="text-[0.8vw] font-semibold text-gray-700">Payment State:</label>
                        <div className="flex items-center h-full">
                            <span className={`px-3 py-1.5 rounded-full text-[0.75vw] font-bold uppercase tracking-wider ${
                                !isFullSettlement
                                    ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                    : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            }`}>
                                {!isFullSettlement ? 'Partial Payment' : 'Full Payment'}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Form Row 3: Remarks */}
                <div className="flex flex-col gap-2 shrink-0">
                    <label className="text-[0.8vw] font-semibold text-gray-700">Remarks / Transaction Details:</label>
                    <textarea 
                        name="remarks"
                        rows={4}
                        placeholder="Add transaction remarks, client details, or delivery address..."
                        value={formData.remarks}
                        onChange={handleInputChange}
                        className="border border-gray-300 rounded-md p-2.5 text-[0.8vw] resize-none focus:outline-[#5FA5DA]" 
                    />
                </div>

            </div>

            {/* Bottom Toolbar */}
            <div id="toolBar" className="flex items-center justify-between p-6 border-t border-gray-200 shrink-0 bg-white">
                <button
                    type="button"
                    onClick={() => navigate('/collection-receipts')}
                    className="flex items-center gap-1.5 px-3 py-1 text-[0.8vw] rounded-full border border-gray-300 text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors cursor-pointer"
                >
                    <i className="far fa-arrow-left"></i>
                    Back to Receipts
                </button>

                <div className="flex gap-4 items-center font-bold text-[0.9vw]">
                    {invoiceTotal > 0 && (
                        <div className="text-[0.8vw] text-gray-500">
                            Invoice Total: ₱{invoiceTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </div>
                    )}
                    <div className="flex gap-2 items-center">
                        <label className="text-gray-700">Total Collected:</label>
                        <span className="text-[#FF8DCE] text-[1.1vw]">
                            ₱ {Number(formData.amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default CollectionReceiptsDetails;