import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

function AccountDetails() {
    const navigate = useNavigate();

    // Customer details state
    const [customerInfo, setCustomerInfo] = useState({
        customerName: 'Davao Medical School Foundation',
        registeredName: 'Davao Medical School Foundation Inc.',
        tin: '123-456-789-000',
        businessAddress: 'Medical School Rd, Bajada, Davao City',
        contactPerson: 'Dr. Jane Doe',
        contactNumber: '0917-123-4567'
    });

    // Filter and search controls
    const [searchQuery, setSearchQuery] = useState('');
    const [typeFilter, setTypeFilter] = useState('ALL'); // 'ALL' | 'CI' | 'SI'

    // Orders state
    const [currentOrders] = useState([
        { id: '2026-A01-001', type: 'CI', date: '09/10/2026', amount: 1200.00, status: 'unpaid' },
        { id: 'SI-2026-004', type: 'SI', date: '09/11/2026', amount: 3500.50, status: 'pending' },
        { id: '2026-A01-008', type: 'CI', date: '09/12/2026', amount: 950.00, status: 'unpaid' }
    ]);

    const [pastOrders] = useState([
        { id: '2026-A01-000', type: 'CI', date: '08/15/2026', amount: 8400.00, status: 'paid' },
        { id: 'SI-2026-001', type: 'SI', date: '07/20/2026', amount: 2100.00, status: 'completed' },
        { id: '2025-A01-099', type: 'CI', date: '12/10/2025', amount: 5000.00, status: 'paid' }
    ]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setCustomerInfo((prev) => ({ ...prev, [name]: value }));
    };

    const handleOrderClick = (order) => {
        if (order.type === 'CI') {
            navigate('/charge-invoice-details');
        } else {
            navigate('/sales-invoice-details');
        }
    };

    // Filter logic helper
    const filterOrders = (ordersList) => {
        return ordersList.filter((order) => {
            const matchesType = typeFilter === 'ALL' || order.type === typeFilter;
            const matchesSearch = 
                order.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
                order.date.includes(searchQuery) ||
                order.status.toLowerCase().includes(searchQuery.toLowerCase()) ||
                order.amount.toString().includes(searchQuery);

            return matchesType && matchesSearch;
        });
    };

    const filteredCurrentOrders = useMemo(() => filterOrders(currentOrders), [currentOrders, typeFilter, searchQuery]);
    const filteredPastOrders = useMemo(() => filterOrders(pastOrders), [pastOrders, typeFilter, searchQuery]);

    return (
        <div className="flex flex-col h-screen">
            {/* Header */}
            <div id="pageHeader" className="flex flex-col justify-between shrink-0 p-6">
                <div className="flex items-center justify-between border-b-2 pb-2">
                    <div className="flex items-center gap-4">
                        <h1>{customerInfo.customerName || 'Customer Account Details'}</h1>
                    </div>
                    <div className="flex items-center gap-2">
                        <button className="flex items-center gap-2 border-2 border-[#22E11F] text-[#22E11F] text-[0.8vw] px-2.5 py-0.5 rounded-full hover:bg-[#22E11F] hover:text-white transition-colors cursor-pointer">
                            <i className="far fa-check"></i>
                            Save Changes
                        </button>
                        <button className="flex items-center gap-2 border-2 border-[#DC1D10] text-[#DC1D10] text-[0.8vw] px-2.5 py-0.5 rounded-full hover:bg-[#DC1D10] hover:text-white transition-colors cursor-pointer">
                            <i className="far fa-trash"></i>
                            Delete Account
                        </button>
                    </div>
                </div>
            </div>

            {/* Content Container */}
            <div 
                id="contentContainer" 
                className="flex-1 flex flex-col gap-6 overflow-y-auto px-6 pt-0 pb-6 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
            >
                {/* Customer Details Form */}
                <div className="flex flex-col gap-4 bg-[#F4F8FB] p-4 rounded-xl border border-gray-200 shrink-0">
                    <span className="text-[1vw] font-bold text-gray-800">Customer Details</span>
                    
                    <div className="flex gap-4 shrink-0">
                        <div className="flex flex-col gap-1.5 w-1/2">
                            <label className="text-[0.8vw] font-medium">Company / Customer Name:</label>
                            <input 
                                type="text" 
                                name="customerName"
                                value={customerInfo.customerName}
                                onChange={handleInputChange}
                                className="bg-white border border-gray-300 rounded-md p-2 text-[0.8vw] focus:outline-none" 
                            />
                        </div>
                        <div className="flex flex-col gap-1.5 w-1/2">
                            <label className="text-[0.8vw] font-medium">Registered Name:</label>
                            <input 
                                type="text" 
                                name="registeredName"
                                value={customerInfo.registeredName}
                                onChange={handleInputChange}
                                className="bg-white border border-gray-300 rounded-md p-2 text-[0.8vw] focus:outline-none" 
                            />
                        </div>
                    </div>

                    <div className="flex gap-4 shrink-0">
                        <div className="flex flex-col gap-1.5 w-1/3">
                            <label className="text-[0.8vw] font-medium">TIN:</label>
                            <input 
                                type="text" 
                                name="tin"
                                value={customerInfo.tin}
                                onChange={handleInputChange}
                                className="bg-white border border-gray-300 rounded-md p-2 text-[0.8vw] focus:outline-none" 
                            />
                        </div>
                        <div className="flex flex-col gap-1.5 w-1/3">
                            <label className="text-[0.8vw] font-medium">Contact Person:</label>
                            <input 
                                type="text" 
                                name="contactPerson"
                                value={customerInfo.contactPerson}
                                onChange={handleInputChange}
                                className="bg-white border border-gray-300 rounded-md p-2 text-[0.8vw] focus:outline-none" 
                            />
                        </div>
                        <div className="flex flex-col gap-1.5 w-1/3">
                            <label className="text-[0.8vw] font-medium">Contact Number:</label>
                            <input 
                                type="text" 
                                name="contactNumber"
                                value={customerInfo.contactNumber}
                                onChange={handleInputChange}
                                className="bg-white border border-gray-300 rounded-md p-2 text-[0.8vw] focus:outline-none" 
                            />
                        </div>
                    </div>

                    <div className="flex flex-col gap-1.5 shrink-0">
                        <label className="text-[0.8vw] font-medium">Business Address:</label>
                        <input 
                            type="text" 
                            name="businessAddress"
                            value={customerInfo.businessAddress}
                            onChange={handleInputChange}
                            className="bg-white border border-gray-300 rounded-md p-2 text-[0.8vw] focus:outline-none" 
                        />
                    </div>
                </div>

                {/* Filter Controls Row */}
                <div className="flex items-center justify-between bg-white p-3 rounded-xl border border-gray-200 shrink-0">
                    <div className="flex items-center gap-2 max-w-xs w-full bg-[#F4F8FB] border border-[#5FA5DA] rounded-full px-3 py-1.5 text-[0.8vw]">
                        <i className="fal fa-search text-[#5FA5DA]"></i>
                        <input
                            type="text"
                            placeholder="Search order ID, date, status, or amount..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-transparent focus:outline-none"
                        />
                        {searchQuery && (
                            <i 
                                className="far fa-times text-gray-400 hover:text-gray-600 cursor-pointer"
                                onClick={() => setSearchQuery('')}
                            ></i>
                        )}
                    </div>

                    {/* Filter Type Toggle Buttons */}
                    <div className="flex items-center gap-1.5 text-[0.75vw]">
                        <span className="font-semibold text-gray-600 mr-1">Type:</span>
                        {['ALL', 'CI', 'SI'].map((type) => (
                            <button
                                key={type}
                                type="button"
                                onClick={() => setTypeFilter(type)}
                                className={`px-3 py-1 rounded-full font-semibold transition-colors cursor-pointer ${
                                    typeFilter === type
                                        ? 'bg-[#5FA5DA] text-white'
                                        : 'bg-[#F4F8FB] text-[#5FA5DA] hover:bg-gray-200'
                                }`}
                            >
                                {type === 'ALL' ? 'All Orders' : type === 'CI' ? 'Charge Invoices (CI)' : 'Sales Invoices (SI)'}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Current Orders Table Section */}
                <div className="flex flex-col gap-2 shrink-0">
                    <div className="flex items-center justify-between">
                        <label className="text-[1vw] font-bold text-gray-800">Current Orders</label>
                        <span className="text-[0.75vw] text-[#5FA5DA] font-semibold">{filteredCurrentOrders.length} Found</span>
                    </div>

                    <div className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-xs">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-[#EEF8FF] border-b border-gray-200 text-[0.75vw] text-gray-600 font-semibold">
                                    <th className="p-3">Order ID</th>
                                    <th className="p-3">Type</th>
                                    <th className="p-3">Date Issued</th>
                                    <th className="p-3">Status</th>
                                    <th className="p-3 text-right">Amount</th>
                                    <th className="p-3 text-center">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 text-[0.8vw]">
                                {filteredCurrentOrders.length > 0 ? (
                                    filteredCurrentOrders.map((order) => (
                                        <tr key={order.id} className="hover:bg-[#F4F8FB] transition-colors">
                                            <td className="p-3 font-semibold text-gray-800">{order.id}</td>
                                            <td className="p-3">
                                                <span className="px-2 py-0.5 text-[0.65vw] font-bold bg-[#EEF8FF] text-[#5FA5DA] border border-[#5FA5DA]/40 rounded">
                                                    {order.type}
                                                </span>
                                            </td>
                                            <td className="p-3 text-gray-600">{order.date}</td>
                                            <td className="p-3 capitalize font-medium text-amber-600">{order.status}</td>
                                            <td className="p-3 text-right font-semibold text-gray-800">₱{order.amount.toFixed(2)}</td>
                                            <td className="p-3 text-center">
                                                <button
                                                    onClick={() => handleOrderClick(order)}
                                                    className="px-2.5 py-1 text-[0.7vw] font-medium text-[#5FA5DA] border border-[#5FA5DA] hover:bg-[#5FA5DA] hover:text-white rounded-full transition-colors cursor-pointer"
                                                >
                                                    View Details
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={6} className="p-4 text-center text-gray-400 text-[0.8vw]">
                                            No current orders match your search filter.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Past Orders Table Section */}
                <div className="flex flex-col gap-2 shrink-0">
                    <div className="flex items-center justify-between">
                        <label className="text-[1vw] font-bold text-gray-800">Past Orders</label>
                        <span className="text-[0.75vw] text-gray-500 font-semibold">{filteredPastOrders.length} Found</span>
                    </div>

                    <div className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-xs">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-200 text-[0.75vw] text-gray-600 font-semibold">
                                    <th className="p-3">Order ID</th>
                                    <th className="p-3">Type</th>
                                    <th className="p-3">Date Issued</th>
                                    <th className="p-3">Status</th>
                                    <th className="p-3 text-right">Amount</th>
                                    <th className="p-3 text-center">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 text-[0.8vw]">
                                {filteredPastOrders.length > 0 ? (
                                    filteredPastOrders.map((order) => (
                                        <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="p-3 font-semibold text-gray-700">{order.id}</td>
                                            <td className="p-3">
                                                <span className="px-2 py-0.5 text-[0.65vw] font-bold bg-gray-100 text-gray-600 border border-gray-300 rounded">
                                                    {order.type}
                                                </span>
                                            </td>
                                            <td className="p-3 text-gray-500">{order.date}</td>
                                            <td className="p-3 capitalize font-medium text-emerald-600">{order.status}</td>
                                            <td className="p-3 text-right font-semibold text-gray-700">₱{order.amount.toFixed(2)}</td>
                                            <td className="p-3 text-center">
                                                <button
                                                    onClick={() => handleOrderClick(order)}
                                                    className="px-2.5 py-1 text-[0.7vw] font-medium text-gray-600 border border-gray-300 hover:bg-gray-200 rounded-full transition-colors cursor-pointer"
                                                >
                                                    View Details
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={6} className="p-4 text-center text-gray-400 text-[0.8vw]">
                                            No past orders match your search filter.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Toolbar */}
            <div id="toolBar" className="flex items-center justify-between p-6 border-t border-gray-200 shrink-0 bg-white">
                <div className="flex gap-2 items-center text-[0.9vw]">
                    <label>Tools:</label>
                    <button className="px-2.5 py-0.5 text-[0.8vw] rounded-full border-2 border-[#5FA5DA] cursor-pointer bg-[#F4F8FB] text-[#5FA5DA] hover:bg-[#5FA5DA] hover:text-white transition-colors">
                        + Create New Order
                    </button>
                </div>
                <div className="flex gap-2 items-center font-bold">
                    <label>Lifetime Total:</label>
                    <span className="text-[#FF8DCE]">
                        ₱{[...currentOrders, ...pastOrders].reduce((sum, order) => sum + order.amount, 0).toFixed(2)}
                    </span>
                </div>
            </div>
        </div>
    );
}

export default AccountDetails;