import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

function Home() {
    const navigate = useNavigate();

    // Sample Unpaid Invoices (Ordered Oldest to Newest)
    const [unpaidInvoices] = useState([
        {
            id: '2026-A01-001',
            type: 'CI',
            date: '08/01/2026',
            customer: 'Davao Medical School Foundation',
            amount: 15400.00,
            daysOverdue: 42
        },
        {
            id: 'SI-2026-004',
            type: 'SI',
            date: '08/15/2026',
            customer: 'Ateneo de Davao University',
            amount: 8250.00,
            daysOverdue: 28
        },
        {
            id: '2026-A01-012',
            type: 'CI',
            date: '09/02/2026',
            customer: 'Southern Philippines Medical Center',
            amount: 24100.00,
            daysOverdue: 10
        }
    ]);

    // Top Debtors Watchlist
    const [topDebtors] = useState([
        { name: 'Southern Philippines Medical Center', balance: 48200.00, pendingCount: 3 },
        { name: 'Davao Medical School Foundation', balance: 32100.00, pendingCount: 2 },
        { name: 'Ateneo de Davao University', balance: 14500.00, pendingCount: 1 }
    ]);

    return (
        <div className="flex flex-col h-screen">
            {/* Header */}
            <div id="pageHeader" className="flex items-center justify-between p-6 shrink-0">
                <div className="flex flex-col">
                    <h1>Dashboard</h1>
                    <label className="text-[0.75vw] text-gray-500">Overview & Urgent Accounts Receivable</label>
                </div>
                <div className="flex items-center max-w-62.5 gap-2.5 bg-[#F4F8FB] text-[#5FA5DA] text-[0.8vw] border-3 border-[#5FA5DA] rounded-full px-4 py-2">
                    <i className="fal fa-search"></i>
                    <input
                        type="text"
                        placeholder="Search dashboard..."
                        className="w-full focus:outline-none"
                    />
                </div>
            </div>

            {/* Main Scrollable Content */}
            <div id="contentContainer" className="flex-1 flex flex-col gap-6 overflow-y-auto px-6 pt-0 pb-6 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                
                {/* 1. Summary Cards Row */}
                <div className="grid grid-cols-4 gap-4 shrink-0">
                    <div className="bg-[#F4F8FB] border-2 border-[#5FA5DA] rounded-xl p-4 flex flex-col justify-between">
                        <span className="text-[0.75vw] font-semibold text-gray-600">Total Unpaid Balance</span>
                        <span className="text-[1.4vw] font-bold text-[#DC1D10] mt-2">₱ 47,750.00</span>
                    </div>
                    <div className="bg-[#F4F8FB] border-2 border-[#5FA5DA] rounded-xl p-4 flex flex-col justify-between">
                        <span className="text-[0.75vw] font-semibold text-gray-600">Unpaid Invoices Count</span>
                        <span className="text-[1.4vw] font-bold text-[#5FA5DA] mt-2">3 Invoices</span>
                    </div>
                    <div className="bg-[#F4F8FB] border-2 border-[#5FA5DA] rounded-xl p-4 flex flex-col justify-between">
                        <span className="text-[0.75vw] font-semibold text-gray-600">Pending Deliveries</span>
                        <span className="text-[1.4vw] font-bold text-amber-500 mt-2">5 DRs Pending</span>
                    </div>
                    <div className="bg-[#F4F8FB] border-2 border-[#5FA5DA] rounded-xl p-4 flex flex-col justify-between">
                        <span className="text-[0.75vw] font-semibold text-gray-600">Collections (This Month)</span>
                        <span className="text-[1.4vw] font-bold text-[#22E11F] mt-2">₱ 18,500.00</span>
                    </div>
                </div>

                {/* 2. Middle Section: Unpaid Table & Debtors Sidebar */}
                <div className="flex-1 min-h-0 flex gap-6 items-stretch">
                    
                    {/* Primary Table: Oldest Unpaid Invoices */}
                    <div className="flex-1 flex flex-col gap-2 border border-gray-300 rounded-xl overflow-hidden bg-white shadow-xs">
                        <div className="bg-gray-50 border-b border-gray-300 p-3 flex items-center justify-between">
                            <span className="text-[0.9vw] font-bold text-gray-800 flex items-center gap-2">
                                <i className="far fa-exclamation-circle text-[#DC1D10]"></i>
                                Unpaid Invoices (Oldest to Newest)
                            </span>
                            <span className="text-[0.7vw] bg-[#DC1D10] text-white px-2 py-0.5 rounded-full font-semibold">
                                Urgent Attention
                            </span>
                        </div>

                        <div className="flex-1 overflow-auto">
                            <table className="min-w-full">
                                <thead className="sticky top-0 bg-gray-50 border-b border-gray-300 z-10">
                                    <tr className="text-center text-[0.75vw] font-semibold text-gray-700">
                                        <th className="w-[12%] px-4 py-2">Invoice ID</th>
                                        <th className="w-[8%] px-4 py-2">Type</th>
                                        <th className="w-[10%] px-4 py-2">Date</th>
                                        <th className="px-4 py-2 text-left">Customer</th>
                                        <th className="w-[12%] px-4 py-2">Amount</th>
                                        <th className="w-[10%] px-4 py-2">Age</th>
                                        <th className="w-[8%] px-4 py-2">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {unpaidInvoices.map((inv, index) => (
                                        <tr key={index} className="text-center hover:bg-[#F4F8FB] text-[0.8vw]">
                                            <td className="px-4 py-2.5 font-semibold text-gray-800">{inv.id}</td>
                                            <td className="px-4 py-2.5">
                                                <span className={`px-2.5 py-0.5 rounded-full text-[0.7vw] font-bold ${
                                                    inv.type === 'SI' 
                                                        ? 'bg-blue-100 text-[#5FA5DA]' 
                                                        : 'bg-purple-100 text-purple-700'
                                                }`}>
                                                    {inv.type}
                                                </span>
                                            </td>
                                            <td className="px-4 py-2.5">{inv.date}</td>
                                            <td className="px-4 py-2.5 text-left font-medium">{inv.customer}</td>
                                            <td className="px-4 py-2.5 font-semibold text-[#FF8DCE]">
                                                ₱ {inv.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                            </td>
                                            <td className="px-4 py-2.5">
                                                <span className="text-[#DC1D10] font-bold">{inv.daysOverdue}d ago</span>
                                            </td>
                                            <td className="px-4 py-2.5 text-md">
                                                <i 
                                                    className="far fa-eye cursor-pointer hover:text-[#5FA5DA] transition-colors" 
                                                    title="View invoice details"
                                                    onClick={() => navigate(
                                                        inv.type === 'SI' 
                                                            ? '/sales-invoices-details' 
                                                            : '/charge-invoice-details'
                                                    )}
                                                ></i>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Top Debtors Watchlist Sidebar */}
                    <div className="w-1/3 flex flex-col gap-2 border border-gray-300 rounded-xl overflow-hidden bg-white shadow-xs">
                        <div className="bg-gray-50 border-b border-gray-300 p-3 flex items-center justify-between">
                            <span className="text-[0.9vw] font-bold text-gray-800 flex items-center gap-2">
                                <i className="far fa-users text-[#5FA5DA]"></i>
                                Top Debtors Watchlist
                            </span>
                        </div>

                        <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3">
                            {topDebtors.map((debtor, index) => (
                                <div key={index} className="bg-[#F4F8FB] border border-[#5FA5DA]/30 rounded-lg p-3 flex justify-between items-center">
                                    <div className="flex flex-col gap-0.5">
                                        <span className="text-[0.8vw] font-bold text-gray-800">{debtor.name}</span>
                                        <span className="text-[0.7vw] text-gray-500">{debtor.pendingCount} pending invoice(s)</span>
                                    </div>
                                    <div className="flex flex-col items-end">
                                        <span className="text-[0.85vw] font-bold text-[#DC1D10]">
                                            ₱ {debtor.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                        </span>
                                        <button 
                                            onClick={() => navigate('/account-details')}
                                            className="text-[0.65vw] text-[#5FA5DA] underline font-semibold cursor-pointer hover:text-[#4d90c3]"
                                        >
                                            View Account
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                </div>
            </div>

            {/* Bottom Toolbar Shortcuts */}
            <div id="toolBar" className="flex items-center justify-between p-6 border-t border-gray-200 shrink-0 bg-white">
                <div className="flex gap-2 items-center text-[0.9vw]">
                    <label className="font-semibold text-gray-700">Quick Shortcuts:</label>
                    <button 
                        onClick={() => navigate('/sales-invoices')}
                        className="px-3 py-1 text-[0.8vw] rounded-full border-2 border-[#5FA5DA] cursor-pointer bg-[#F4F8FB] text-[#5FA5DA] font-semibold hover:bg-[#5FA5DA] hover:text-white transition-colors"
                    >
                       + New Sales Invoice
                    </button>
                    <button 
                        onClick={() => navigate('/charge-invoices')}
                        className="px-3 py-1 text-[0.8vw] rounded-full border-2 border-[#5FA5DA] cursor-pointer bg-[#F4F8FB] text-[#5FA5DA] font-semibold hover:bg-[#5FA5DA] hover:text-white transition-colors"
                    >
                       + New Charge Invoice
                    </button>
                </div>
                <div className="flex items-center gap-2 text-[0.8vw] text-gray-500 font-medium">
                    <i className="far fa-clock"></i>
                    <span>Real-time Financial Monitor</span>
                </div>
            </div>
        </div>
    );
}

export default Home;