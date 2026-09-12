import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DeliveryReceiptStatusSelector from '../components/DeliveryReceiptStatusSelector';
import StatusSelector from '../components/ChargeInvoiceStatusSelector';

function DeliveryReceiptsMain() {
    const navigate = useNavigate();

    // Form inputs state
    const [drIdInput, setDrIdInput] = useState('');
    const [ciIdInput, setCiIdInput] = useState('');
    const [dateInput, setDateInput] = useState('');
    const [customerInput, setCustomerInput] = useState('');
    const [addressInput, setAddressInput] = useState('');
    const [receivedByInput, setReceivedByInput] = useState('');
    const [amountInput, setAmountInput] = useState('');
    const [paymentTypeInput, setPaymentTypeInput] = useState('cash');
    const [statusInput, setStatusInput] = useState('completed');

    return (
        <div className="flex flex-col h-screen">
            <div id="pageHeader" className="flex items-center justify-between p-6 shrink-0">
                <h1>Delivery Receipts</h1>
                <div className="flex items-center max-w-62.5 gap-2.5 bg-[#F4F8FB] text-[#5FA5DA] text-[0.8vw] border-3 border-[#5FA5DA] rounded-full px-4 py-2">
                    <i className="fal fa-search"></i>
                    <input
                        type="text"
                        placeholder="Search by ID or Customer"
                        className="w-full focus:outline-none"
                    />
                </div>
            </div>

            <div id="tableContainer" className="flex-1 overflow-auto">
                <table className="min-w-full">
                    <thead>
                        <tr>
                            <th className="w-[9.5%] px-2 py-2">DR ID</th>
                            <th className="w-[9.5%] px-2 py-2">CI ID</th>
                            <th className="w-[5%] px-2 py-2">Date</th>
                            <th className="px-2 py-2 text-left">Customer</th>
                            <th className="px-2 py-2 text-left">Address</th>
                            <th className="w-[10%] px-2 py-2 text-left">Received By</th>
                            <th className="w-[8%] px-2 py-2">Amount</th>
                            <th className="w-[9%] px-2 py-2">Payment Type</th>
                            <th className="w-[6%] px-2 py-2">Status</th>
                            <th className="w-[8%] px-2 py-2">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {/* Sample Saved Entry Row */}
                        <tr className="text-center border-b border-gray-200 hover:bg-[#F4F8FB]">
                            <td className="w-[9.5%]px-2 py-2">DR# 001</td>
                            <td className="w-[9.5%] px-2 py-2">2026-A01-001</td>
                            <td className="px-2 py-2">09/10/2026</td>
                            <td className="px-2 py-2 text-left">Davao Medical School Foundation</td>
                            <td className="px-2 py-2 text-left">Medical School Rd, Bajada, Davao City</td>
                            <td className="w-[10%] px-2 py-2 text-left">Juan Dela Cruz</td>
                            <td className="w-[8%] px-2 py-2">₱ 1,200.00</td>
                            <td className="w-[9%] px-2 py-2 capitalize">Cash</td>
                            <td className="w-[6%] px-2 py-2">
                                <DeliveryReceiptStatusSelector 
                                    initialStatus="completed" 
                                    onChange={(newStatus) => console.log('Status updated:', newStatus)} 
                                />
                            </td>
                            <td className="px-4 py-2 text-md">
                                <i className="far fa-pen cursor-pointer hover:text-[#5FA5DA]" title="Edit receipt"></i>
                                <i className="far fa-trash cursor-pointer ml-2 hover:text-[#DC1D10]" title="Delete receipt"></i>
                                <i 
                                    className="far fa-eye cursor-pointer ml-2 hover:text-[#5FA5DA]" 
                                    title="See details"
                                    onClick={() => navigate('/delivery-receipts-details')}
                                ></i>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            {/* Toolbar */}
            <div id="toolBar" className="flex items-center justify-between p-6 border-t border-gray-200 shrink-0 bg-white">
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
            
        </div>
    );
}

export default DeliveryReceiptsMain;