import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ChargeInvoiceDetailsModal from '../components/ChargeInvoiceDetailsModal';
import ToggleButton from '../components/ToggleButton';
import SpreadsheetUploadModal from '../components/SpreadsheetUploadModal';

function SalesInvoicesMain() {
    const navigate = useNavigate();
    
    // Existing customer directory (Replace with your API/State source)
    const [existingCustomers] = useState([
        'Davao Medical School Foundation',
        'Ateneo de Davao University',
        'Southern Philippines Medical Center'
    ]);

    // Input state
    const [siIdInput, setSiIdInput] = useState('');
    const [dateIssuedInput, setDateIssuedInput] = useState('');
    const [customerInput, setCustomerInput] = useState('');
    const [detailsInput, setDetailsInput] = useState('');
    const [amountInput, setAmountInput] = useState('');
    
    // Modal states
    const [itemizedList, setItemizedList] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const [isCreateAccountPromptOpen, setIsCreateAccountPromptOpen] = useState(false);

    // Save handler with auto-account provisioning check
    const handleSaveRowInvoice = () => {
        if (!customerInput.trim()) {
            alert('Please enter a Customer Name before saving.');
            return;
        }

        const customerExists = existingCustomers.some(
            (name) => name.toLowerCase() === customerInput.trim().toLowerCase()
        );

        if (!customerExists) {
            setIsCreateAccountPromptOpen(true);
        } else {
            executeSaveInvoice();
        }
    };

    const executeSaveInvoice = () => {
        console.log('Sales Invoice saved successfully:', {
            siIdInput,
            dateIssuedInput,
            customerInput,
            detailsInput,
            amountInput,
            itemizedList
        });
        alert('Sales invoice saved successfully!');
    };

    const handleConfirmAccountCreation = () => {
        console.log('Provisioning new customer account:', customerInput);
        // Backend API call to auto-register customer account goes here...

        setIsCreateAccountPromptOpen(false);
        executeSaveInvoice();
    };

    const handleSaveModalItems = (items) => {
        setItemizedList(items);
        
        const multilineSummary = items
            .filter((item) => item.name)
            .map((item) => `${item.quantity} ${item.name} at ₱${item.price} each`)
            .join('\n');

        setDetailsInput(multilineSummary);
    };

    const handleSpreadsheetUpload = (file) => {
        console.log('Spreadsheet file uploaded:', file);
    };

    return (
        <div className="flex flex-col h-screen">
            {/* Header */}
            <div id="pageHeader" className="flex items-center justify-between p-6 shrink-0">
                <h1>Sales Invoices</h1>
                <div className="flex items-center max-w-62.5 gap-2.5 bg-[#F4F8FB] text-[#5FA5DA] text-[0.8vw] border-3 border-[#5FA5DA] rounded-full px-4 py-2">
                    <i className="fal fa-search"></i>
                    <input
                        type="text"
                        placeholder="Search by SI ID or Customer"
                        className="w-full focus:outline-none"
                    />
                </div>
            </div>

            {/* Table Container */}
            <div id="tableContainer" className="flex-1 overflow-auto">
                <table className="min-w-full">
                    <thead className="sticky top-0 bg-gray-50 border-b border-gray-300 z-10">
                        <tr className="text-center text-xs font-semibold text-gray-700">
                            <th className="w-[10%] px-4 py-3">SI ID</th>
                            <th className="w-[10%] px-4 py-3">Date Issued</th>
                            <th className="w-[20%] px-4 py-3 text-left">Customer</th>
                            <th className="px-4 py-3 text-left">Details</th>
                            <th className="w-[12%] px-4 py-3">Amount</th>
                            <th className="w-[8%] px-4 py-3">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {/* Sample Saved Entry Row */}
                        <tr className="text-center hover:bg-[#F4F8FB]">
                            <td className="px-4 py-2">SI-2026-001</td>
                            <td className="px-4 py-2">09/10/2026</td>
                            <td className="px-4 py-2 text-left">Davao Medical School Foundation</td>
                            <td className="px-4 py-2 text-left">60 shirts at 100 Pesos each</td>
                            <td className="px-4 py-2">₱ 1,200.00</td>
                            <td className="px-4 py-2 text-md">
                                <i 
                                    className="far fa-pen cursor-pointer hover:text-[#5FA5DA]" 
                                    title="Edit invoice"
                                ></i>
                                <i 
                                    className="far fa-trash cursor-pointer ml-2 hover:text-[#DC1D10]" 
                                    title="Delete invoice"
                                ></i>
                                <i 
                                    className="far fa-eye cursor-pointer ml-2 hover:text-[#5FA5DA]" 
                                    title="See details"
                                    onClick={() => navigate('/sales-invoices-details')}
                                ></i>
                            </td>
                        </tr>

                        {/* Input Row */}
                        <tr id="inputRow" className="text-center hover:bg-[#F4F8FB]">
                            <td className="px-4 py-2">
                                <input
                                    type="text"
                                    value={siIdInput}
                                    onChange={(e) => setSiIdInput(e.target.value)}
                                    placeholder="Enter SI ID"
                                    className="w-full bg-[#EEF8FF] border-b border-[#EAEAEA] px-2 py-1 focus:outline-none"
                                />
                            </td>
                            <td className="px-4 py-2">
                                <input
                                    type="date"
                                    value={dateIssuedInput}
                                    onChange={(e) => setDateIssuedInput(e.target.value)}
                                    className="w-full bg-[#EEF8FF] border-b border-[#EAEAEA] px-2 py-1 focus:outline-none"
                                />
                            </td>
                            <td className="px-4 py-2 text-left">
                                <input
                                    type="text"
                                    value={customerInput}
                                    onChange={(e) => setCustomerInput(e.target.value)}
                                    placeholder="Enter Customer Name"
                                    className="w-full bg-[#EEF8FF] border-b border-[#EAEAEA] px-2 py-1 focus:outline-none"
                                />
                            </td>
                            <td className="px-4 py-2 text-left">
                                <div className="flex items-center gap-1.5">
                                    <textarea
                                        rows={Math.max(1, detailsInput.split('\n').length)}
                                        value={detailsInput}
                                        onChange={(e) => setDetailsInput(e.target.value)}
                                        placeholder="Enter details or click + to add items"
                                        className="w-full bg-[#EEF8FF] border-b border-[#EAEAEA] px-2 py-1 focus:outline-none resize-none overflow-hidden"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setIsModalOpen(true)}
                                        title="Add itemized details"
                                        className="border-2 border-[#5FA5DA] text-[#5FA5DA] rounded-full w-6 h-6 flex items-center justify-center font-bold text-sm shrink-0 hover:bg-[#5FA5DA] hover:text-white transition-colors cursor-pointer"
                                    >
                                        +
                                    </button>
                                </div>
                            </td>
                            <td className="px-4 py-2">
                                <input
                                    type="number"
                                    step="any"
                                    value={amountInput}
                                    onChange={(e) => setAmountInput(e.target.value)}
                                    placeholder="0.00"
                                    className="w-full bg-[#EEF8FF] border-b border-[#EAEAEA] px-2 py-1 focus:outline-none"
                                />
                            </td>
                            <td className="px-4 py-2 text-md">
                                <i 
                                    className="far fa-check cursor-pointer hover:scale-110 transition-transform" 
                                    title="Save invoice"
                                    onClick={handleSaveRowInvoice}
                                ></i>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            {/* Toolbar */}
            <div id="toolBar" className="flex items-center justify-between p-6 border-t border-gray-200 shrink-0 bg-white">
                <div className="flex gap-2 items-center text-[0.9vw]">
                    <label>Tools:</label>
                    <span title="Auto-fill SI ID based on previous entry">
                        <ToggleButton 
                            label="Enable ID Chaining"
                            onChange={(active) => console.log('Toggled ID Chaining:', active)} 
                        />
                    </span>
                    <span title="Show only invoices created today">
                        <ToggleButton 
                            label="Hide Old Invoices"
                            onChange={(active) => console.log('Toggled Hide Old:', active)} 
                        />
                    </span>
                    <button 
                        onClick={() => setIsUploadModalOpen(true)}
                        title="Upload multiple entries at once from a CSV or Excel file"
                        className="px-2.5 py-0.5 text-[0.8vw] rounded-full border-2 border-[#5FA5DA] cursor-pointer bg-[#F4F8FB] text-[#5FA5DA] hover:bg-[#5FA5DA] hover:text-white transition-colors"
                    >
                       + Upload Spreadsheet
                    </button>
                </div>
                <div className="flex gap-2 items-center text-[0.8vw]">
                    <label>Date Filter:</label>
                    <input
                        type="date"
                        className="px-2.5 py-0.5 border-2 border-[#5FA5DA] rounded-full focus:outline-none"
                    />
                </div>
            </div>

            {/* Account Provisioning Confirmation Modal */}
            {isCreateAccountPromptOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs">
                    <div className="bg-white rounded-xl shadow-lg w-full max-w-md p-6 flex flex-col gap-4 border border-gray-200">
                        <div className="flex items-center gap-3">
                            <i className="far fa-user-plus text-xl text-[#5FA5DA]"></i>
                            <h3 className="text-[1.05vw] font-bold text-gray-800">New Customer Account</h3>
                        </div>

                        <p className="text-[0.8vw] text-gray-600 leading-relaxed">
                            <strong>"{customerInput}"</strong> is not in your registered customer directory. Would you like to automatically create a customer account for them?
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

            {/* Reusable Itemized Details Modal */}
            <ChargeInvoiceDetailsModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleSaveModalItems}
                initialItems={itemizedList}
            />

            {/* Reusable Spreadsheet Upload Modal */}
            <SpreadsheetUploadModal
                isOpen={isUploadModalOpen}
                onClose={() => setIsUploadModalOpen(false)}
                onUpload={handleSpreadsheetUpload}
            />
        </div>
    );
}

export default SalesInvoicesMain;