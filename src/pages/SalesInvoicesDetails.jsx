import React, { useState } from 'react';
import ChargeInvoiceDetailsModal from '../components/ChargeInvoiceDetailsModal';
import CreateDeliveryReceiptModal from '../components/CreateDeliveryReceiptModal';
import DeliveryReceiptBlock from '../components/DeliveryReceiptBlock';

function SalesInvoicesDetails() {
    // Existing accounts state (In a real app, this would come from your API/Context)
    const [existingCustomers] = useState([
        'Davao Medical School Foundation',
        'Ateneo de Davao University',
        'Southern Philippines Medical Center'
    ]);

    // Modal state for automatic account creation confirmation
    const [isCreateAccountPromptOpen, setIsCreateAccountPromptOpen] = useState(false);

    // Form state for header and core fields
    const [formData, setFormData] = useState({
        customer: '',
        dateIssued: '',
        registeredName: '',
        tin: '',
        businessAddress: '',
        legacyOrderDetails: ''
    });

    // Dynamic state for itemized details table
    const [items, setItems] = useState([
        { name: 'Item 1', quantity: 10, price: 5.00 },
        { name: 'Item 2', quantity: 5, price: 10.00 }
    ]);

    // Dynamic state for delivery receipts
    const [deliveryReceipts, setDeliveryReceipts] = useState([
        { id: 1, drNumber: 'DR# 001', dateIssued: '01/01/2026', initialStatus: 'completed' },
        { id: 2, drNumber: 'DR# 002', dateIssued: '01/15/2026', initialStatus: 'cancelled' }
    ]);

    // Modal state controllers
    const [isItemModalOpen, setIsItemModalOpen] = useState(false);
    const [isDeliveryReceiptModalOpen, setIsDeliveryReceiptModalOpen] = useState(false);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    // Save handler with Automatic Account Provisioning logic
    const handleSaveInvoice = () => {
        if (!formData.customer.trim()) {
            alert('Please enter a Customer Name before saving.');
            return;
        }

        const customerExists = existingCustomers.some(
            (name) => name.toLowerCase() === formData.customer.trim().toLowerCase()
        );

        if (!customerExists) {
            // Unrecognized customer -> Prompt user to automatically provision an account
            setIsCreateAccountPromptOpen(true);
        } else {
            // Existing customer -> Proceed directly with invoice save
            executeSaveInvoice();
        }
    };

    const executeSaveInvoice = () => {
        console.log('Invoice saved successfully:', { formData, items });
        alert('Invoice saved successfully!');
    };

    const handleConfirmAccountCreation = () => {
        const newAccountPayload = {
            customerName: formData.customer,
            registeredName: formData.registeredName || formData.customer,
            tin: formData.tin,
            businessAddress: formData.businessAddress
        };

        console.log('Provisioning new customer account:', newAccountPayload);
        // API call to register new customer account goes here...

        setIsCreateAccountPromptOpen(false);
        executeSaveInvoice();
    };

    const handleSaveItems = (newItems) => {
        const sanitized = newItems.map((item) => ({
            name: item.name,
            quantity: Number(item.quantity) || 1,
            price: Number(item.price) || 0
        }));
        setItems(sanitized);
    };

    const handleCreateDeliveryReceipt = (drFormData) => {
        const formattedDate = drFormData.dateIssued 
            ? new Date(drFormData.dateIssued).toLocaleDateString('en-US') 
            : new Date().toLocaleDateString('en-US');

        const newReceipt = {
            id: Date.now(),
            drNumber: `DR# ${String(deliveryReceipts.length + 1).padStart(3, '0')}`,
            dateIssued: formattedDate,
            initialStatus: drFormData.paymentType === 'cash' ? 'completed' : 'pending',
            ...drFormData
        };

        setDeliveryReceipts((prev) => [...prev, newReceipt]);
    };

    return (
        <div className="flex flex-col h-screen">
            {/* Header */}
            <div id="pageHeader" className="flex flex-col justify-between shrink-0 p-6">
                <div className="flex items-center justify-between border-b-2 pb-2">
                    <div className="flex items-center gap-4">
                        <h1>Sales Invoice #SI-2026-001</h1>
                    </div>
                    <div className="flex items-center gap-2">
                        <button 
                            onClick={handleSaveInvoice}
                            className="flex items-center gap-2 border-2 border-[#22E11F] text-[#22E11F] text-[0.8vw] px-2.5 py-0.5 rounded-full hover:bg-[#22E11F] hover:text-white transition-colors cursor-pointer font-semibold"
                        >
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

            {/* Content Container */}
            <div 
                id="contentContainer" 
                className="flex-1 flex flex-col gap-4 overflow-y-auto px-6 pt-0 pb-6 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
            >
                {/* Form Row 1: Customer & Date Issued */}
                <div className="flex gap-4 shrink-0">
                    <div className="flex flex-col gap-2 w-1/2">
                        <label className="text-[0.8vw]">Company / Organization / Customer:</label>
                        <input 
                            type="text" 
                            name="customer"
                            value={formData.customer}
                            onChange={handleInputChange}
                            placeholder="Type customer name..."
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

                {/* Form Row 2: Registered Name & TIN */}
                <div className="flex gap-4 shrink-0">
                    <div className="flex flex-col gap-2 w-1/2">
                        <label className="text-[0.8vw]">Registered Name:</label>
                        <input 
                            type="text" 
                            name="registeredName"
                            value={formData.registeredName}
                            onChange={handleInputChange}
                            className="border border-gray-300 rounded-md p-2 text-[0.8vw] focus:outline-none" 
                        />
                    </div>
                    <div className="flex flex-col gap-2 w-1/2">
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

                {/* Order Details Container */}
                <div className="flex-1 min-h-[220px] flex gap-4 items-stretch">
                    <div className="flex flex-col gap-2 w-1/2 h-full">
                        <label className="text-[0.8vw] shrink-0">Order Details (Legacy)</label>
                        <textarea 
                            name="legacyOrderDetails"
                            value={formData.legacyOrderDetails}
                            onChange={handleInputChange}
                            className="flex-1 h-full w-full border border-gray-300 rounded-md p-2 text-[0.8vw] resize-none focus:outline-none" 
                        />
                    </div>
                    <div className="flex flex-col gap-2 w-1/2 h-full">
                        <div className="flex items-center justify-between shrink-0">
                            <label className="text-[0.8vw]">Order Details:</label>
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

                {/* Delivery Receipts List Block */}
                <div className="flex flex-col gap-4 shrink-0">
                    <label className="text-[1vw] font-bold">Delivery Receipts:</label>
                    <div className="flex gap-2 flex-wrap">
                        {deliveryReceipts.map((dr) => (
                            <DeliveryReceiptBlock 
                                key={dr.id}
                                drNumber={dr.drNumber}
                                dateIssued={dr.dateIssued}
                                initialStatus={dr.initialStatus}
                                onStatusChange={(selected) => console.log(`${dr.drNumber} Status:`, selected)}
                            />
                        ))}
                    </div>
                </div>
            </div>

            {/* Bottom Toolbar */}
            <div id="toolBar" className="flex items-center justify-between p-6 border-t border-gray-200 shrink-0 bg-white">
                <div className="flex gap-2 items-center text-[0.9vw]">
                    <label>Tools:</label>
                    <button className="px-2.5 py-0.5 text-[0.8vw] rounded-full border-2 border-[#5FA5DA] cursor-pointer bg-[#F4F8FB] text-[#5FA5DA] hover:bg-[#5FA5DA] hover:text-white transition-colors">
                       + Create PO
                    </button>

                    <button 
                        type="button"
                        onClick={() => setIsDeliveryReceiptModalOpen(true)}
                        className="px-2.5 py-0.5 text-[0.8vw] rounded-full border-2 border-[#5FA5DA] cursor-pointer bg-[#F4F8FB] text-[#5FA5DA] hover:bg-[#5FA5DA] hover:text-white transition-colors"
                    >
                       + Create Delivery Receipt
                    </button>
                </div>
                <div className="flex gap-2 items-center font-bold">
                    <label>Amount Total:</label>
                    <span className="text-[#FF8DCE]">
                        ₱{items.reduce((sum, item) => sum + (Number(item.quantity) * Number(item.price)), 0).toFixed(2)}
                    </span>
                </div>
            </div>

            {/* Account Creation Confirmation Prompt */}
            {isCreateAccountPromptOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs">
                    <div className="bg-white rounded-xl shadow-lg w-full max-w-md p-6 flex flex-col gap-4 border border-gray-200">
                        <div className="flex items-center gap-3 text-amber-500">
                            <i className="far fa-[#5FA5DA] fa-user-plus text-xl text-[#5FA5DA]"></i>
                            <h3 className="text-[1.05vw] font-bold text-gray-800">New Customer Account Detected</h3>
                        </div>

                        <p className="text-[0.8vw] text-gray-600 leading-relaxed">
                            <strong>"{formData.customer}"</strong> is not in your existing customer directory. Would you like to create a new customer account using the provided details?
                        </p>

                        <div className="bg-[#F4F8FB] p-3 rounded-lg text-[0.75vw] flex flex-col gap-1 border border-gray-200">
                            <div><span className="font-semibold">Registered Name:</span> {formData.registeredName || '—'}</div>
                            <div><span className="font-semibold">TIN:</span> {formData.tin || '—'}</div>
                            <div><span className="font-semibold">Address:</span> {formData.businessAddress || '—'}</div>
                        </div>

                        <div className="flex justify-end gap-2 mt-2">
                            <button 
                                type="button"
                                onClick={executeSaveInvoice}
                                className="px-3.5 py-1.5 text-[0.75vw] rounded-full border border-gray-300 text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
                            >
                                Save Invoice Only
                            </button>
                            <button 
                                type="button"
                                onClick={handleConfirmAccountCreation}
                                className="px-3.5 py-1.5 text-[0.75vw] rounded-full bg-[#5FA5DA] text-white hover:bg-[#4d90c3] font-semibold transition-colors cursor-pointer"
                            >
                                Save Invoice & Register Account
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Itemized Details Modal */}
            <ChargeInvoiceDetailsModal 
                isOpen={isItemModalOpen}
                onClose={() => setIsItemModalOpen(false)}
                onSave={handleSaveItems}
                initialItems={items}
            />

            {/* Create Delivery Receipt Modal */}
            <CreateDeliveryReceiptModal
                isOpen={isDeliveryReceiptModalOpen}
                onClose={() => setIsDeliveryReceiptModalOpen(false)}
                onSubmit={handleCreateDeliveryReceipt}
            />
        </div>
    );
}

export default SalesInvoicesDetails;