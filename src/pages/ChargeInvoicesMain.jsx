import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import StatusSelector from '../components/ChargeInvoiceStatusSelector';
import ChargeInvoiceDetailsModal from '../components/ChargeInvoiceDetailsModal';
import ToggleButton from '../components/ToggleButton';
import SpreadsheetUploadModal from '../components/SpreadsheetUploadModal';

function CImain() {
    const navigate = useNavigate();
    
    // Existing customer directory
    const [existingCustomers] = useState([
        'Davao Medical School Foundation',
        'Ateneo de Davao University',
        'Southern Philippines Medical Center'
    ]);

    // Table Row Input States
    const [companyInput, setCompanyInput] = useState('');
    const [detailsInput, setDetailsInput] = useState('');
    const [itemizedList, setItemizedList] = useState([]);
    
    // Modal states
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const [isCreateAccountPromptOpen, setIsCreateAccountPromptOpen] = useState(false);

    const handleSaveRowInvoice = () => {
        if (!companyInput.trim()) {
            alert('Please enter a Company name before saving.');
            return;
        }

        const customerExists = existingCustomers.some(
            (name) => name.toLowerCase() === companyInput.trim().toLowerCase()
        );

        if (!customerExists) {
            setIsCreateAccountPromptOpen(true);
        } else {
            executeSaveInvoice();
        }
    };

    const executeSaveInvoice = () => {
        console.log('Main table row saved:', { companyInput, detailsInput });
        alert('Invoice row saved successfully!');
    };

    const handleConfirmAccountCreation = () => {
        console.log('Registering new customer account:', companyInput);
        // Backend account provisioning logic goes here...

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
            <div id="pageHeader" className="flex items-center justify-between p-6 shrink-0">
                <h1>Charge Invoices</h1>
                <div className="flex items-center max-w-62.5 gap-2.5 bg-[#F4F8FB] text-[#5FA5DA] text-[0.8vw] border-3 border-[#5FA5DA] rounded-full px-4 py-2">
                    <i className="fal fa-search "></i>
                    <input
                        type="text"
                        placeholder="Search by ID or Company"
                        className="w-full focus:outline-none"
                    />
                </div>
            </div>

            <div id="tableContainer" className="flex-1 overflow-auto">
                <table className="min-w-full">
                    <thead>
                        <tr>
                            <th className="w-[9.5%] px-4 py-2">CI ID</th>
                            <th className="w-[8%] px-4 py-2">Date</th>
                            <th className="w-[20%] px-4 py-2 text-left">Company</th>
                            <th className="px-4 py-2 text-left">Details</th>
                            <th className="w-[10%] px-4 py-2">Amount</th>
                            <th className="w-[8%] px-4 py-2">Status</th>
                            <th className="w-[8%] px-4 py-2">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {/* Sample Saved Entry Row */}
                        <tr className="text-center border-b border-gray-200 hover:bg-[#F4F8FB]">
                            <td className="w-[9.5%] px-4 py-2">2026-A01-001</td>
                            <td className="w-[8%] px-4 py-2">09/10/2026</td>
                            <td className="w-[20%] px-4 py-2 text-left">Davao Medical School Foundation</td>
                            <td className="px-4 py-2 text-left">60 shirts at 100 Pesos each</td>
                            <td className="w-[10%] px-4 py-2">P 1,200.00</td>
                            <td className="w-[8%] px-4 py-2">
                                <StatusSelector initialStatus="paid" onChange={(newStatus) => console.log('Selected status:', newStatus)} />
                            </td>
                            <td className="w-[8%] px-4 py-2 text-md">
                                <i className="far fa-pen cursor-pointer" title="Edit invoice"></i>
                                <i className="far fa-trash cursor-pointer ml-2" title="Delete invoice"></i>
                                <i 
                                    className="far fa-eye cursor-pointer ml-2" 
                                    title="See more details"
                                    onClick={() => navigate('/charge-invoice-details')}
                                ></i>
                            </td>
                        </tr>

                        {/* Input Row */}
                        <tr id="inputRow" className="text-center border-b border-gray-200 hover:bg-[#F4F8FB]">
                            <td className="w-[9.5%] px-4 py-2">
                                <input
                                    type="text"
                                    placeholder="Enter CI ID"
                                    className="w-full bg-[#EEF8FF] border-b border-[#EAEAEA] px-2 py-1 focus:outline-none"
                                />
                            </td>
                            <td className="w-[8%] px-4 py-2">
                                <input
                                    type="date"
                                    placeholder="Enter Date"
                                    className="w-full bg-[#EEF8FF] border-b border-[#EAEAEA] px-2 py-1 focus:outline-none"
                                />
                            </td>
                            <td className="px-4 py-2 text-left">
                                <input
                                    type="text"
                                    value={companyInput}
                                    onChange={(e) => setCompanyInput(e.target.value)}
                                    placeholder="Enter Company"
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
                                        className="border-2 border-[#5FA5DA] text-[#5FA5DA] rounded-full w-6 h-6 flex items-center justify-center font-bold text-sm shrink-0 hover:bg-[#4d90c3] transition-colors mt-1 cursor-pointer"
                                    >
                                        +
                                    </button>
                                </div>
                            </td>

                            <td className="w-[10%] px-4 py-2">
                                <input
                                    type="text"
                                    placeholder="Enter Amount"
                                    className="w-full bg-[#EEF8FF] border-b border-[#EAEAEA] px-2 py-1 focus:outline-none"
                                />
                            </td>
                            <td className="w-[8%] px-4 py-2">
                                <StatusSelector initialStatus="unpaid" onChange={(newStatus) => console.log('Selected status:', newStatus)} />
                            </td>
                            <td className="w-[8%] px-4 py-2 text-md">
                                <i 
                                    className="far fa-check cursor-pointer" 
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
                    <span title="Auto-fill CI ID based on previous entry">
                        <ToggleButton 
                            label="Enable ID Chaining"
                            onChange={(active) => console.log('Toggled:', active)} 
                        />
                    </span>
                    <span title="Show only invoices created today">
                        <ToggleButton 
                            label="Hide Old Invoices"
                            onChange={(active) => console.log('Toggled:', active)} 
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
                    <div className="flex gap-2 items-center">
                        <label>Date:</label>
                        <input
                            type="date"
                            className="px-2.5 py-0.5 border-2 border-[#5FA5DA] rounded-full focus:outline-none"
                        />
                    </div>
                    <div className="w-px self-stretch bg-black"></div>
                    <div className="flex gap-2 items-center text-[0.8vw]">
                        <label>Status:</label>
                        <StatusSelector initialStatus="paid" onChange={(newStatus) => console.log('Selected status:', newStatus)} />
                    </div>
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
                            <strong>"{companyInput}"</strong> is not in your customer directory. Would you like to create a customer account for them automatically?
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
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleSaveModalItems}
                initialItems={itemizedList}
            />

            <SpreadsheetUploadModal
                isOpen={isUploadModalOpen}
                onClose={() => setIsUploadModalOpen(false)}
                onUpload={handleSpreadsheetUpload}
            />
        </div>
    );
}

export default CImain;