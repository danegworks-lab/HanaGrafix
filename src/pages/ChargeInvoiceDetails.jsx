import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import StatusSelector from '../components/ChargeInvoiceStatusSelector';
import CollectionReceiptBlock from '../components/CollectionReceiptBlock';
import ChargeInvoiceDetailsModal from '../components/ChargeInvoiceDetailsModal';
import CreateDeliveryReceiptModal from '../components/CreateDeliveryReceiptModal';
import CreateCollectionReceiptModal from '../components/CreateCollectionReceiptModal';
import DeliveryReceiptBlock from '../components/DeliveryReceiptBlock';
import { chargeInvoiceService } from '../services/chargeInvoiceService';
import { receiptService } from '../services/receiptService';

function ChargeInvoiceDetails() {
    const { id: ciIdentifier } = useParams();
    const navigate = useNavigate();

    // Loading & Save States
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Invoice Header States
    const [invoiceDbId, setInvoiceDbId] = useState(null);
    const [ciNumber, setCiNumber] = useState('');
    const [customerName, setCustomerName] = useState('');
    const [dateIssued, setDateIssued] = useState('');
    const [status, setStatus] = useState('unpaid');
    const [legacyOrderDetails, setLegacyOrderDetails] = useState('');
    const [discountAmount, setDiscountAmount] = useState(0.00);
    const [legacyAmount, setLegacyAmount] = useState(0.00);

    // Items & Receipts States
    const [items, setItems] = useState([]);
    const [collectionReceipts, setCollectionReceipts] = useState([]);
    const [deliveryReceipts, setDeliveryReceipts] = useState([]);

    // Modal Controllers
    const [isItemModalOpen, setIsItemModalOpen] = useState(false);
    const [isDeliveryReceiptModalOpen, setIsDeliveryReceiptModalOpen] = useState(false);
    const [isCollectionReceiptModalOpen, setIsCollectionReceiptModalOpen] = useState(false);

    useEffect(() => {
        if (ciIdentifier) {
            loadInvoiceDetails(ciIdentifier);
        } else {
            setLoading(false);
        }
    }, [ciIdentifier]);

    const loadInvoiceDetails = async (identifier) => {
        try {
            setLoading(true);
            const data = await chargeInvoiceService.getChargeInvoiceById(identifier);
            const inv = data?.invoice || data;

            if (!inv) throw new Error(`Charge Invoice "${identifier}" not found.`);

            setInvoiceDbId(inv.id || null);
            setCiNumber(inv.ciNumber || '');
            setCustomerName(inv.customerName || '');
            setDateIssued(inv.dateIssued || '');
            setStatus(inv.status || 'unpaid');
            setLegacyOrderDetails(inv.legacyOrderDetails || '');
            setDiscountAmount(Number(inv.discountAmount) || 0.00);
            setLegacyAmount(Number(inv.amountTotal || inv.subtotal) || 0.00);
            setItems(inv.items || []);
            setDeliveryReceipts(data.deliveryReceipts || inv.deliveryReceipts || []);
            setCollectionReceipts(data.collectionReceipts || inv.collectionReceipts || []);
        } catch (err) {
            console.error('Error loading invoice details:', err);
            alert(`Failed to load invoice details: ${err.message}`);
        } finally {
            setLoading(false);
        }
    };

    // Calculate Subtotal & Net Total
    const calculatedSubtotal = items.length > 0
        ? items.reduce((sum, item) => sum + (Number(item.quantity) * Number(item.price)), 0)
        : legacyAmount;

    const totalAmount = Math.max(0, calculatedSubtotal - Number(discountAmount));

    // Calculate Total Collected & Remaining Balance to be Paid
    const totalCollected = collectionReceipts
        .filter((cr) => String(cr.status).toLowerCase() !== 'cancelled')
        .reduce((sum, cr) => sum + Number(cr.amount_collected ?? cr.amountCollected ?? cr.amount ?? 0), 0);

    const remainingBalance = Math.max(0, totalAmount - totalCollected);

    // Save/Update to Supabase
    const handleSaveInvoice = async () => {
        if (!customerName.trim()) {
            alert('Please enter a Customer / Company Name before saving.');
            return;
        }

        try {
            setSaving(true);
            const hasItemized = items && items.length > 0;

            const payload = {
                ciNumber,
                customerName,
                dateIssued,
                status,
                legacyOrderDetails: hasItemized ? null : (legacyOrderDetails.trim() || null),
                discountAmount: Number(discountAmount) || 0.00,
                subtotal: calculatedSubtotal,
                items: hasItemized ? items : []
            };

            if (invoiceDbId || ciIdentifier) {
                const targetId = invoiceDbId || ciIdentifier;
                await chargeInvoiceService.updateChargeInvoice(targetId, payload);
                alert('Invoice updated successfully!');
            } else {
                const created = await chargeInvoiceService.createChargeInvoice(payload);
                alert('Invoice created successfully!');
                navigate(`/charge-invoice-details/${created.ciNumber || created.id}`);
            }
        } catch (err) {
            console.error('Error saving invoice:', err);
            alert(`Failed to save invoice: ${err.message}`);
        } finally {
            setSaving(false);
        }
    };

    // Delete Invoice
    const handleDeleteInvoice = async () => {
        const targetId = invoiceDbId || ciIdentifier;
        if (!targetId) return;
        if (!window.confirm(`Are you sure you want to delete Invoice ${ciNumber}? This cannot be undone.`)) return;

        try {
            await chargeInvoiceService.deleteChargeInvoice(targetId);
            alert('Invoice deleted successfully!');
            navigate('/charge-invoices');
        } catch (err) {
            console.error('Error deleting invoice:', err);
            alert('Failed to delete invoice.');
        }
    };

    // Itemized Modal Save Handler
    const handleSaveItems = (newItems) => {
        const sanitized = newItems.map((item) => ({
            name: item.name,
            quantity: Number(item.quantity) || 1,
            price: Number(item.price) || 0
        }));
        setItems(sanitized);

        if (sanitized.length > 0) {
            setLegacyOrderDetails('');
        }
    };

    // Create Delivery Receipt
    const handleCreateDeliveryReceipt = async (formData) => {
        const targetId = invoiceDbId || ciIdentifier;
        if (!targetId) {
            alert('Please save the invoice before creating receipts.');
            return;
        }
        try {
            await receiptService.createDeliveryReceipt({
                ...formData,
                companyName: formData.companyName || customerName,
                chargeInvoiceId: invoiceDbId || targetId,
                ciNumber: ciNumber
            });
            await loadInvoiceDetails(ciIdentifier);
            setIsDeliveryReceiptModalOpen(false);
        } catch (err) {
            console.error('Error creating Delivery Receipt:', err);
            alert('Failed to create Delivery Receipt.');
        }
    };

    // Create Collection Receipt
    const handleCreateCollectionReceipt = async (formData) => {
        const targetId = invoiceDbId || ciIdentifier;
        if (!targetId) {
            alert('Please save the invoice before creating receipts.');
            return;
        }
        try {
            await receiptService.createCollectionReceipt({
                ...formData,
                companyName: formData.companyName || customerName,
                chargeInvoiceId: invoiceDbId || targetId,
                ciNumber: ciNumber
            });
            await loadInvoiceDetails(ciIdentifier);
            setIsCollectionReceiptModalOpen(false);
        } catch (err) {
            console.error('Error creating Collection Receipt:', err);
            alert('Failed to create Collection Receipt.');
        }
    };

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center text-gray-500 text-[1vw]">
                Loading invoice details...
            </div>
        );
    }

    const hasLegacyDetails = Boolean(legacyOrderDetails && legacyOrderDetails.trim());

    return (
        <div className="flex flex-col h-screen">
            {/* Header */}
            <div id="pageHeader" className="flex flex-col justify-between shrink-0 p-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <h1 className="text-xl font-bold">Invoice #{ciNumber || 'New Invoice'}</h1>
                        <StatusSelector value={status} initialStatus={status} onChange={setStatus} />
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
                        {ciIdentifier && (
                            <button
                                type="button"
                                onClick={handleDeleteInvoice}
                                className="flex items-center gap-2 border-2 border-[#DC1D10] text-[#DC1D10] text-[0.8vw] px-3 py-1 rounded-full hover:bg-[#DC1D10] hover:text-white transition-colors cursor-pointer"
                            >
                                <i className="far fa-trash"></i>
                                Delete
                            </button>
                        )}
                    </div>
                </div>
                <label className="text-[0.6vw] pb-2 border-b-2 text-gray-400">(Year-Pad-No.)</label>
            </div>

            {/* Form Fields */}
            <div id="contentContainer" className="flex-1 flex flex-col gap-4 overflow-y-auto px-6 pt-0 pb-6">
                <div className="flex gap-4 shrink-0">
                    <div className="flex flex-col gap-2 w-1/2">
                        <label className="text-[0.8vw] font-semibold text-gray-700">Company / Customer:</label>
                        <input
                            type="text"
                            value={customerName}
                            onChange={(e) => setCustomerName(e.target.value)}
                            placeholder="Enter customer name..."
                            className="border border-gray-300 rounded-md p-2 text-[0.8vw] focus:outline-[#5FA5DA]"
                        />
                    </div>
                    <div className="flex flex-col gap-2 w-1/4">
                        <label className="text-[0.8vw] font-semibold text-gray-700">Date Issued:</label>
                        <input
                            type="date"
                            value={dateIssued}
                            onChange={(e) => setDateIssued(e.target.value)}
                            className="border border-gray-300 rounded-md p-2 text-[0.8vw] focus:outline-[#5FA5DA]"
                        />
                    </div>
                    <div className="flex flex-col gap-2 w-1/4">
                        <label className="text-[0.8vw] font-semibold text-gray-700">Discount Amount (₱):</label>
                        <input
                            type="number"
                            step="0.01"
                            value={discountAmount}
                            onChange={(e) => setDiscountAmount(e.target.value)}
                            className="border border-gray-300 rounded-md p-2 text-[0.8vw] focus:outline-[#5FA5DA]"
                        />
                    </div>
                </div>

                {/* Conditional Order Details: Legacy Textarea OR Itemized Table */}
                <div className="flex-1 min-h-0 flex gap-4 items-stretch">
                    {hasLegacyDetails ? (
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
                                value={legacyOrderDetails}
                                onChange={(e) => setLegacyOrderDetails(e.target.value)}
                                placeholder="Type order notes, descriptions, or terms..."
                                className="flex-1 h-full w-full border border-gray-300 rounded-md p-3 text-[0.8vw] resize-none focus:outline-[#5FA5DA]"
                            />
                        </div>
                    ) : (
                        <div className="flex flex-col gap-2 h-full w-full">
                            <div className="flex items-center justify-between shrink-0">
                                <label className="text-[0.8vw] font-semibold text-gray-700">
                                    Itemized Breakdown:
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
                                    <thead className="sticky top-0 z-10">
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
                                                    No itemized items found. Click <strong>"+ Edit Items"</strong> to add rows, or enter legacy notes.
                                                </td>
                                            </tr>
                                        ) : (
                                            items.map((item, index) => (
                                                <tr key={index} className="hover:bg-gray-50">
                                                    <td className="p-2 text-left text-[0.8vw] font-medium text-gray-800">
                                                        {item.name || item.item_name || '—'}
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

                {/* Collection Receipts Section */}
                <div className="flex flex-col gap-2 shrink-0">
                    <div className="flex justify-between items-center">
                        <label className="text-[0.9vw] font-bold text-gray-800">Collection Receipts:</label>
                        {collectionReceipts.length > 0 && (
                            <span className="text-[0.75vw] font-semibold text-emerald-600">
                                Total Paid: ₱{totalCollected.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                        )}
                    </div>
                    <div className="flex gap-2.5 flex-wrap">
                        {collectionReceipts.length === 0 ? (
                            <span className="text-[0.75vw] text-gray-400">No collection receipts attached.</span>
                        ) : (
                            collectionReceipts.map((cr) => (
                                <CollectionReceiptBlock
                                    key={cr.id || cr.cr_number}
                                    id={cr.id || cr.cr_number}
                                    crNumber={cr.cr_number || cr.crNumber}
                                    dateIssued={cr.date_issued || cr.dateIssued}
                                    amount={cr.amount_collected ?? cr.amountCollected ?? cr.amount ?? 0}
                                    initialStatus={cr.status || cr.initialStatus || 'full'}
                                />
                            ))
                        )}
                    </div>
                </div>

                {/* Delivery Receipts Section */}
                <div className="flex flex-col gap-2 shrink-0">
                    <label className="text-[0.9vw] font-bold text-gray-800">Delivery Receipts:</label>
                    <div className="flex gap-2.5 flex-wrap">
                        {deliveryReceipts.length === 0 ? (
                            <span className="text-[0.75vw] text-gray-400">No delivery receipts attached.</span>
                        ) : (
                            deliveryReceipts.map((dr) => (
                                <DeliveryReceiptBlock
                                    key={dr.id || dr.dr_number}
                                    id={dr.id || dr.dr_number}
                                    drNumber={dr.dr_number || dr.drNumber}
                                    dateIssued={dr.date_issued || dr.dateIssued}
                                    amount={dr.total_paid_amount ?? dr.totalPaidAmount ?? dr.amount ?? 0}
                                    initialStatus={dr.status || dr.initialStatus || 'completed'}
                                />
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* Toolbar */}
            <div id="toolBar" className="flex items-center justify-between p-6 border-t border-gray-200 shrink-0 bg-white">
                <div className="flex gap-3 items-center text-[0.9vw]">
                    <button
                        onClick={() => navigate('/charge-invoices')}
                        className="flex items-center gap-1.5 px-3 py-1 text-[0.8vw] rounded-full border border-gray-300 text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors cursor-pointer"
                    >
                        <i className="far fa-arrow-left"></i>
                        Back
                    </button>

                    <div className="w-px h-5 bg-gray-300"></div>

                    <label className="font-semibold text-gray-700">Tools:</label>
                    <button
                        type="button"
                        onClick={() => setIsDeliveryReceiptModalOpen(true)}
                        className="px-2.5 py-0.5 text-[0.8vw] rounded-full border-2 border-[#5FA5DA] bg-[#F4F8FB] text-[#5FA5DA] hover:bg-[#5FA5DA] hover:text-white transition-colors"
                    >
                        + Create Delivery Receipt
                    </button>
                    <button
                        type="button"
                        onClick={() => setIsCollectionReceiptModalOpen(true)}
                        className="px-2.5 py-0.5 text-[0.8vw] rounded-full border-2 border-[#5FA5DA] bg-[#F4F8FB] text-[#5FA5DA] hover:bg-[#5FA5DA] hover:text-white transition-colors"
                    >
                        + Create Collection Receipt
                    </button>
                </div>

                {/* Financial Summary Displays */}
                <div className="flex gap-5 items-center font-bold text-[0.9vw]">
                    {discountAmount > 0 && (
                        <div className="flex gap-1 text-gray-500 text-[0.8vw]">
                            <span>Subtotal:</span>
                            <span>₱{calculatedSubtotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                            <span className="text-red-500 ml-1">(-₱{Number(discountAmount).toLocaleString('en-US', { minimumFractionDigits: 2 })})</span>
                        </div>
                    )}

                    {/* Net Total */}
                    <div className="flex gap-1.5 items-center">
                        <label className="text-gray-600 font-semibold text-[0.8vw]">Net Total:</label>
                        <span className="text-gray-800 text-[0.95vw]">
                            ₱{totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                    </div>

                    {/* Total Paid / Collected */}
                    <div className="flex gap-1.5 items-center">
                        <label className="text-emerald-700 font-semibold text-[0.8vw]">Paid:</label>
                        <span className="text-emerald-600 text-[0.95vw]">
                            ₱{totalCollected.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                    </div>

                    <div className="w-px h-5 bg-gray-300"></div>

                    {/* Outstanding Balance (Yet to be paid) */}
                    <div className="flex gap-1.5 items-center">
                        <label className="text-gray-700 font-bold text-[0.85vw]">Balance Due:</label>
                        <span className={`text-[1.1vw] font-extrabold ${remainingBalance > 0 ? 'text-[#DC1D10]' : 'text-emerald-600'}`}>
                            ₱{remainingBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                    </div>
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
                companyName={customerName}
                customerName={customerName}
                ciNumber={ciNumber}
            />

            <CreateCollectionReceiptModal
                isOpen={isCollectionReceiptModalOpen}
                onClose={() => setIsCollectionReceiptModalOpen(false)}
                onSubmit={handleCreateCollectionReceipt}
                companyName={customerName}
                customerName={customerName}
                ciNumber={ciNumber}
                invoiceTotal={remainingBalance > 0 ? remainingBalance : totalAmount}
            />
        </div>
    );
}

export default ChargeInvoiceDetails;