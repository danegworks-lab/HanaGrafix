import React, { useState } from 'react';
import CollectionReceiptStatusSelector from '../components/CollectionReceiptStatusSelector';

function CollectionReceiptsDetails() {
    // Form inputs state
    const [formData, setFormData] = useState({
        ciId: '2026-A01-001', // Linked Charge Invoice ID
        customer: '',
        dateIssued: '',
        registeredName: '',
        tin: '',
        businessAddress: '',
        paymentType: 'cash',
        amount: ''
    });

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    return (
        <div className="flex flex-col h-screen">
            {/* Page Header */}
            <div id="pageHeader" className="flex flex-col justify-between shrink-0 p-6">
                <div className="flex items-center justify-between border-b-2 pb-2">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                            <h1>CR #001</h1>
                            {/* Linked CI Badge */}
                            <span className="text-[0.75vw] px-2.5 py-1 bg-[#EEF8FF] text-[#5FA5DA] border border-[#5FA5DA] rounded-full font-medium">
                                Linked CI: {formData.ciId}
                            </span>
                        </div>
                        <CollectionReceiptStatusSelector initialStatus="full" />
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

                {/* Form Row 2: Registered Name, TIN & Payment Type */}
                <div className="flex gap-4 shrink-0">
                    <div className="flex flex-col gap-2 w-1/3">
                        <label className="text-[0.8vw]">Registered Name:</label>
                        <input 
                            type="text" 
                            name="registeredName"
                            value={formData.registeredName}
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

                {/* Form Row 3: Business Address & Amount Paid */}
                <div className="flex gap-4 shrink-0">
                    <div className="flex flex-col gap-2 w-2/3">
                        <label className="text-[0.8vw]">Business Address:</label>
                        <input 
                            type="text" 
                            name="businessAddress"
                            value={formData.businessAddress}
                            onChange={handleInputChange}
                            className="border border-gray-300 rounded-md p-2 text-[0.8vw] focus:outline-none" 
                        />
                    </div>
                    <div className="flex flex-col gap-2 w-1/3">
                        <label className="text-[0.8vw]">Amount Paid:</label>
                        <input 
                            type="number" 
                            step="any"
                            name="amount"
                            placeholder="0.00"
                            value={formData.amount}
                            onChange={handleInputChange}
                            className="border border-gray-300 rounded-md p-2 text-[0.8vw] focus:outline-none" 
                        />
                    </div>
                </div>

            </div>

            {/* Bottom Toolbar */}
            <div id="toolBar" className="flex items-center justify-between p-6 border-t border-gray-200 shrink-0 bg-white">
                <div className="flex gap-2 items-center font-bold">
                    <label>Amount Paid Total:</label>
                    <span className="text-[#FF8DCE]">
                        ₱{Number(formData.amount || 0).toFixed(2)}
                    </span>
                </div>
            </div>
        </div>
    );
}

export default CollectionReceiptsDetails;