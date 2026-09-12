import { useState } from 'react';
import StatusSelector from '../components/ChargeInvoiceStatusSelector';
import CollectionReceiptBlock from '../components/CollectionReceiptBlock';
import ChargeInvoiceDetailsModal from '../components/ChargeInvoiceDetailsModal';
import CreateDeliveryReceiptModal from '../components/CreateDeliveryReceiptModal';
import CreateCollectionReceiptModal from '../components/CreateCollectionReceiptModal';
import DeliveryReceiptBlock from '../components/DeliveryReceiptBlock';

function ChargeInvoiceDetails() {
    // Registered customer directory
    const [existingCustomers] = useState([
        'Davao Medical School Foundation',
        'Ateneo de Davao University',
        'Southern Philippines Medical Center'
    ]);

    // Customer form field state
    const [customerName, setCustomerName] = useState('');
    const [isCreateAccountPromptOpen, setIsCreateAccountPromptOpen] = useState(false);

    // Dynamic state for items table
    const [items, setItems] = useState([
        { name: 'Item 1', quantity: 10, price: 5.00 },
        { name: 'Item 2', quantity: 5, price: 10.00 }
    ]);

    // Dynamic state for collection receipts
    const [collectionReceipts, setCollectionReceipts] = useState([
        { id: 1, crNumber: 'CR# 001', dateIssued: '01/01/2026', initialStatus: 'full' },
        { id: 2, crNumber: 'CR# 002', dateIssued: '01/15/2026', initialStatus: 'partial' }
    ]);

    // Dynamic state for delivery receipts
    const [deliveryReceipts, setDeliveryReceipts] = useState([
        { id: 1, drNumber: 'DR# 001', dateIssued: '01/01/2026', initialStatus: 'completed' },
        { id: 2, drNumber: 'DR# 002', dateIssued: '01/15/2026', initialStatus: 'cancelled' }
    ]);

    // Modal state controllers
    const [isItemModalOpen, setIsItemModalOpen] = useState(false);
    const [isDeliveryReceiptModalOpen, setIsDeliveryReceiptModalOpen] = useState(false);
    const [isCollectionReceiptModalOpen, setIsCollectionReceiptModalOpen] = useState(false);

    // Save check for unrecognized customer names
    const handleSaveInvoice = () => {
        if (!customerName.trim()) {
            alert('Please enter a Customer / Company Name before saving.');
            return;
        }

        const customerExists = existingCustomers.some(
            (name) => name.toLowerCase() === customerName.trim().toLowerCase()
        );

        if (!customerExists) {
            setIsCreateAccountPromptOpen(true);
        } else {
            executeSaveInvoice();
        }
    };

    const executeSaveInvoice = () => {
        console.log('Invoice saved:', { customerName, items });
        alert('Invoice saved successfully!');
    };

    const handleConfirmAccountCreation = () => {
        console.log('Registering new customer account:', customerName);
        // Backend account provisioning logic goes here...

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

    const handleCreateDeliveryReceipt = (formData) => {
        const formattedDate = formData.dateIssued 
            ? new Date(formData.dateIssued).toLocaleDateString('en-US') 
            : new Date().toLocaleDateString('en-US');

        const newReceipt = {
            id: Date.now(),
            crNumber: `DR# ${String(deliveryReceipts.length + 1).padStart(3, '0')}`,
            dateIssued: formattedDate,
            initialStatus: formData.paymentType === 'cash' ? 'full' : 'partial',
            ...formData
        };

        setDeliveryReceipts((prev) => [...prev, newReceipt]);
    };

    const handleCreateCollectionReceipt = (formData) => {
        const formattedDate = formData.dateIssued 
            ? new Date(formData.dateIssued).toLocaleDateString('en-US') 
            : new Date().toLocaleDateString('en-US');

        const newReceipt = {
            id: Date.now(),
            crNumber: `CR# ${String(collectionReceipts.length + 1).padStart(3, '0')}`,
            dateIssued: formattedDate,
            initialStatus: formData.paymentType === 'cash' ? 'full' : 'partial',
            ...formData
        };

        setCollectionReceipts((prev) => [...prev, newReceipt]);
    };

    return (
        <div className="flex flex-col h-screen">
            <div id="pageHeader" className="flex flex-col justify-between shrink-0 p-6">
                <div className="flex items-center justify-between ">
                    <div className="flex items-center gap-4">
                        <h1>Invoice #2026-A01-001</h1>
                        <StatusSelector />
                    </div>
                    <div className="flex items-center gap-2">
                        <button 
                            type="button"
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
                <label className="text-[0.6vw] pb-2 border-b-2">(Year-Pad-No.)</label>   
            </div>

            <div id="contentContainer" className="flex-1 flex flex-col gap-4 overflow-y-auto px-6 pt-0 pb-6">
                <div className="flex gap-4 shrink-0">
                    <div className="flex flex-col gap-2 w-1/2">
                        <label className="text-[0.8vw]">Company / Organization / Customer:</label>
                        <input 
                            type="text" 
                            value={customerName}
                            onChange={(e) => setCustomerName(e.target.value)}
                            placeholder="Enter customer name..."
                            className="border border-gray-300 rounded-md p-2 text-[0.8vw] focus:outline-none" 
                        />
                    </div>
                    <div className="flex flex-col gap-2 w-1/2">
                        <label className="text-[0.8vw]">Date Issued:</label>
                        <input type="date" className="border border-gray-300 rounded-md p-2 text-[0.8vw]" />
                    </div>
                </div>

                <div className="flex-1 min-h-0 flex gap-4 items-stretch">
                    <div className="flex flex-col gap-2 w-1/2 h-full">
                        <label className="text-[0.8vw] shrink-0">Order Details (Legacy)</label>
                        <textarea className="flex-1 h-full w-full border border-gray-300 rounded-md p-2 text-[0.8vw] resize-none focus:outline-none" />
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

                <div className="flex flex-col gap-4 shrink-0">
                    <label className="text-[1vw] font-bold">Collection Receipts:</label>
                    <div className="flex gap-2 flex-wrap">
                        {collectionReceipts.map((cr) => (
                            <CollectionReceiptBlock 
                                key={cr.id}
                                crNumber={cr.crNumber}
                                dateIssued={cr.dateIssued}
                                initialStatus={cr.initialStatus}
                                onStatusChange={(selected) => console.log(`${cr.crNumber} Status:`, selected)}
                            />
                        ))}
                    </div>
                </div>

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

                    <button 
                        type="button"
                        onClick={() => setIsCollectionReceiptModalOpen(true)}
                        className="px-2.5 py-0.5 text-[0.8vw] rounded-full border-2 border-[#5FA5DA] cursor-pointer bg-[#F4F8FB] text-[#5FA5DA] hover:bg-[#5FA5DA] hover:text-white transition-colors"
                    >
                       + Create Collection Receipt
                    </button>
                </div>
                <div className="flex gap-2 items-center font-bold">
                    <label>Amount Total:</label>
                    <span className="text-[#FF8DCE]">
                        ₱{items.reduce((sum, item) => sum + (Number(item.quantity) * Number(item.price)), 0).toFixed(2)}
                    </span>
                </div>
            </div>

            {/* Auto Provisioning Modal Prompt */}
            {isCreateAccountPromptOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs">
                    <div className="bg-white rounded-xl shadow-lg w-full max-w-md p-6 flex flex-col gap-4 border border-gray-200">
                        <div className="flex items-center gap-3">
                            <i className="far fa-user-plus text-xl text-[#5FA5DA]"></i>
                            <h3 className="text-[1.05vw] font-bold text-gray-800">New Customer Account</h3>
                        </div>

                        <p className="text-[0.8vw] text-gray-600 leading-relaxed">
                            <strong>"{customerName}"</strong> is not in your registered customer directory. Would you like to automatically create a customer account for them?
                        </p>

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
            />

            <CreateCollectionReceiptModal
                isOpen={isCollectionReceiptModalOpen}
                onClose={() => setIsCollectionReceiptModalOpen(false)}
                onSubmit={handleCreateCollectionReceipt}
            />
        </div>
    );
}

export default ChargeInvoiceDetails;