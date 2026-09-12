import React, { useState } from 'react';
import DeliveryReceiptStatusSelector from '../components/DeliveryReceiptStatusSelector';
import ChargeInvoiceDetailsModal from '../components/ChargeInvoiceDetailsModal';

function DeliveryReceiptsDetails() {
    // Dynamic state for itemized details table
    const [items, setItems] = useState([
        { name: 'Item 1', quantity: 10, price: 5.00 },
        { name: 'Item 2', quantity: 5, price: 10.00 }
    ]);

    // Form inputs state
    const [formData, setFormData] = useState({
        ciId: '2026-A01-001', // Linked Charge Invoice ID
        customer: '',
        dateIssued: '',
        deliveredTo: '',
        tin: '',
        businessAddress: '',
        paymentType: 'cash',
        legacyDeliveryDetails: ''
    });

    const [isItemModalOpen, setIsItemModalOpen] = useState(false);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    // Save handler for itemized details modal
    const handleSaveItems = (newItems) => {
        const sanitized = newItems.map((item) => ({
            name: item.name,
            quantity: Number(item.quantity) || 1,
            price: Number(item.price) || 0
        }));
        setItems(sanitized);
    };

    return (
        <div className="flex flex-col h-screen">
            {/* Page Header */}
            <div id="pageHeader" className="flex flex-col justify-between shrink-0 p-6">
                <div className="flex items-center justify-between border-b-2 pb-2">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                            <h1>DR #001</h1>
                            {/* Linked CI Badge */}
                            <span className="text-[0.75vw] px-2.5 py-1 bg-[#EEF8FF] text-[#5FA5DA] border border-[#5FA5DA] rounded-full font-medium">
                                Linked CI: {formData.ciId}
                            </span>
                        </div>
                        <DeliveryReceiptStatusSelector initialStatus="completed" />
                    </div>
                    <div className="flex items-center gap-2">
                        <button className="flex items-center gap-2 border-2 border-[#22E11F] text-[#22E11F] text-[0.8vw] px-2.5 py-0.5 rounded-full hover:bg-[#22E11F] hover:text-white transition-colors cursor-pointer">
                            <i className="far fa-check"></i>
                            Save
                        </button>
                        <button className="flex items-center gap-2 border-2 border-[#DC1D10] text-[#DC1D10] text-[0.8vw] px-2.5 py-0.5 rounded-full hover:bg-[#DC1D10] hover:text-white transition-colors cursor-pointer">
                            <i className="far fa-trash"></i>
                            Delete
                        </button>
                    </div>
                </div>
            </div>

            {/* Main Content Container */}
            <div id="contentContainer" className="flex-1 flex flex-col gap-4 overflow-y-auto px-6 pt-0 pb-6">
                
                {/* Form Row 1: Customer & Date Issued */}
                <div className="flex gap-4 shrink-0">
                    <div className="flex flex-col gap-2 w-1/2">
                        <label className="text-[0.8vw]">Company / Organization / Customer:</label>
                        <input 
                            type="text" 
                            name="customer"
                            value={formData.customer}
                            onChange={handleInputChange}
                            className="border border-gray-300 rounded-md p-2 text-[0.8vw] focus:outline-none" 
                        />
                    </div>
                    <div className="flex flex-col gap-2 w-1/2">
                        <label className="text-[0.8vw]">Date Issued:</label>
                        <input 
                            type="date" 
                            name="dateIssued"
                            value={formData.dateIssued}
                            onChange={handleInputChange}
                            className="border border-gray-300 rounded-md p-2 text-[0.8vw] focus:outline-none" 
                        />
                    </div>
                </div>

                {/* Form Row 2: Delivered To, TIN & Payment Type */}
                <div className="flex gap-4 shrink-0">
                    <div className="flex flex-col gap-2 w-1/3">
                        <label className="text-[0.8vw]">Delivered To:</label>
                        <input 
                            type="text" 
                            name="deliveredTo"
                            value={formData.deliveredTo}
                            onChange={handleInputChange}
                            className="border border-gray-300 rounded-md p-2 text-[0.8vw] focus:outline-none" 
                        />
                    </div>
                    <div className="flex flex-col gap-2 w-1/3">
                        <label className="text-[0.8vw]">TIN:</label>
                        <input 
                            type="text" 
                            name="tin"
                            placeholder="000-000-000-000"
                            value={formData.tin}
                            onChange={handleInputChange}
                            className="border border-gray-300 rounded-md p-2 text-[0.8vw] focus:outline-none" 
                        />
                    </div>
                    <div className="flex flex-col gap-2 w-1/3">
                        <label className="text-[0.8vw]">Payment Type:</label>
                        <select 
                            name="paymentType"
                            value={formData.paymentType}
                            onChange={handleInputChange}
                            className="border border-gray-300 rounded-md p-2 text-[0.8vw] focus:outline-none bg-white cursor-pointer"
                        >
                            <option value="cash">Cash</option>
                            <option value="bank_transfer">Bank Transfer</option>
                            <option value="cheque">Cheque</option>
                        </select>
                    </div>
                </div>

                {/* Form Row 3: Business Address */}
                <div className="flex flex-col gap-2 shrink-0">
                    <label className="text-[0.8vw]">Business Address:</label>
                    <input 
                        type="text" 
                        name="businessAddress"
                        value={formData.businessAddress}
                        onChange={handleInputChange}
                        className="border border-gray-300 rounded-md p-2 text-[0.8vw] focus:outline-none" 
                    />
                </div>

                {/* Grid Row for Delivery Details */}
                <div className="flex-1 min-h-62.5 flex gap-4 items-stretch">
                    <div className="flex flex-col gap-2 w-1/2 h-full">
                        <label className="text-[0.8vw] shrink-0">Delivery Details (Legacy)</label>
                        <textarea 
                            name="legacyDeliveryDetails"
                            value={formData.legacyDeliveryDetails}
                            onChange={handleInputChange}
                            className="flex-1 h-full w-full border border-gray-300 rounded-md p-2 text-[0.8vw] resize-none focus:outline-none" 
                        />
                    </div>
                    <div className="flex flex-col gap-2 w-1/2 h-full">
                        <div className="flex items-center justify-between shrink-0">
                            <label className="text-[0.8vw]">Delivery Details:</label>
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
                                <thead className="sticky top-0 z-10">
                                    <tr className="bg-gray-50 border-b border-gray-300">
                                        <th className="p-2 text-left text-[0.8vw]">Item</th>
                                        <th className="p-2 text-center text-[0.8vw]">Quantity</th>
                                        <th className="p-2 text-right text-[0.8vw]">Unit Price</th>
                                        <th className="p-2 text-right text-[0.8vw]">Total</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {items.map((item, index) => (
                                        <tr key={index}>
                                            <td className="p-2 text-left text-[0.8vw]">{item.name || '—'}</td>
                                            <td className="p-2 text-center text-[0.8vw]">{item.quantity}</td>
                                            <td className="p-2 text-right text-[0.8vw]">₱{Number(item.price).toFixed(2)}</td>
                                            <td className="p-2 text-right text-[0.8vw]">
                                                ₱{(Number(item.quantity) * Number(item.price)).toFixed(2)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

            </div>

            {/* Bottom Toolbar */}
            <div id="toolBar" className="flex items-center justify-between p-6 border-t border-gray-200 shrink-0 bg-white">
                <div className="flex gap-2 items-center font-bold">
                    <label>Amount Total:</label>
                    <span className="text-[#FF8DCE]">
                        ₱{items.reduce((sum, item) => sum + (Number(item.quantity) * Number(item.price)), 0).toFixed(2)}
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