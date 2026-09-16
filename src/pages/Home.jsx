import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { dashboardService } from '../services/dashboardService';

function Home() {
    const navigate = useNavigate();
    const [searchTerm, setSearchTerm] = useState('');

    // TanStack Query: Cached Dashboard Data
    const { 
        data: dashboardData = {}, 
        isLoading: loading 
    } = useQuery({
        queryKey: ['dashboard_data'],
        queryFn: () => dashboardService.getDashboardData(),
    });

    const unpaidInvoices = dashboardData.unpaidInvoices || [];
    const topDebtors = dashboardData.topDebtors || [];
    const totalUnpaidBalance = dashboardData.totalUnpaidBalance || 0;
    const unpaidCount = dashboardData.unpaidCount || 0;
    const overdue30Count = dashboardData.overdue30Count || 0;
    const overdue30Balance = dashboardData.overdue30Balance || 0;
    const activeDebtorCount = dashboardData.activeDebtorCount || 0;

    // Helper to calculate days overdue
    const getDaysOverdue = (dateString) => {
        if (!dateString) return 0;
        const issueDate = new Date(dateString);
        const today = new Date();
        const diffTime = Math.abs(today - issueDate);
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    };

    // Real-time Search Filtering
    const filteredInvoices = unpaidInvoices.filter((inv) => {
        const ci = (inv.ciNumber || '').toLowerCase();
        const customer = (inv.customerName || '').toLowerCase();
        const term = searchTerm.toLowerCase();
        return ci.includes(term) || customer.includes(term);
    });

    const filteredDebtors = topDebtors.filter((debtor) => {
        return (debtor.name || '').toLowerCase().includes(searchTerm.toLowerCase());
    });

    return (
        <div className="flex flex-col h-screen">
            {/* Header */}
            <div id="pageHeader" className="flex items-center justify-between p-6 shrink-0">
                <div className="flex flex-col">
                    <h1 className="text-xl font-bold">Dashboard</h1>
                    <label className="text-[0.75vw] text-gray-500">Overview & Accounts Receivable (Unpaid Charge Invoices)</label>
                </div>
                <div className="flex items-center max-w-62.5 gap-2.5 bg-[#F4F8FB] text-[#5FA5DA] text-[0.8vw] border-3 border-[#5FA5DA] rounded-full px-4 py-2">
                    <i className="fal fa-search"></i>
                    <input
                        type="text"
                        placeholder="Search dashboard..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full focus:outline-none"
                    />
                </div>
            </div>

            {/* Main Scrollable Content */}
            <div id="contentContainer" className="flex-1 flex flex-col gap-6 overflow-y-auto px-6 pt-0 pb-6 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] scrollbar-none">
                
                {/* 1. Summary Cards Row */}
                <div className="grid grid-cols-4 gap-4 shrink-0">
                    {/* Card 1: Total Unpaid Balance */}
                    <div className="bg-[#F4F8FB] border-2 border-[#5FA5DA] rounded-xl p-4 flex flex-col justify-between">
                        <span className="text-[0.75vw] font-semibold text-gray-600">Total Unpaid Balance (CI)</span>
                        <span className="text-[1.4vw] font-bold text-[#DC1D10] mt-2">
                            ₱ {Number(totalUnpaidBalance).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </span>
                    </div>

                    {/* Card 2: Pending Invoices Count */}
                    <div className="bg-[#F4F8FB] border-2 border-[#5FA5DA] rounded-xl p-4 flex flex-col justify-between">
                        <span className="text-[0.75vw] font-semibold text-gray-600">Unpaid Charge Invoices</span>
                        <span className="text-[1.4vw] font-bold text-[#5FA5DA] mt-2">{unpaidCount} Pending</span>
                    </div>

                    {/* Card 3: Overdue > 30 Days (Replaces Pending Deliveries) */}
                    <div className="bg-[#F4F8FB] border-2 border-[#5FA5DA] rounded-xl p-4 flex flex-col justify-between">
                        <div className="flex items-center justify-between">
                            <span className="text-[0.75vw] font-semibold text-gray-600">Aging Invoices (&gt;30 Days)</span>
                            <span className="text-[0.65vw] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
                                {overdue30Count} Overdue
                            </span>
                        </div>
                        <span className="text-[1.4vw] font-bold text-amber-600 mt-2">
                            ₱ {Number(overdue30Balance).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </span>
                    </div>

                    {/* Card 4: Active Customer Debtors (Replaces Collections Placeholder) */}
                    <div className="bg-[#F4F8FB] border-2 border-[#5FA5DA] rounded-xl p-4 flex flex-col justify-between">
                        <span className="text-[0.75vw] font-semibold text-gray-600">Active Debtor Accounts</span>
                        <div className="flex items-baseline justify-between mt-2">
                            <span className="text-[1.4vw] font-bold text-[#22E11F]">
                                {activeDebtorCount} Companies
                            </span>
                            <button
                                onClick={() => navigate('/accounts')}
                                className="text-[0.7vw] text-[#5FA5DA] underline font-semibold cursor-pointer hover:text-[#4d90c3]"
                            >
                                View Accounts
                            </button>
                        </div>
                    </div>
                </div>

                {/* 2. Middle Section: Unpaid CI Table & Debtors Sidebar */}
                <div className="flex-1 min-h-0 flex gap-6 items-stretch">
                    
                    {/* Primary Table: Oldest Unpaid Charge Invoices */}
                    <div className="flex-1 flex flex-col gap-2 border border-gray-300 rounded-xl overflow-hidden bg-white shadow-xs">
                        <div className="bg-gray-50 border-b border-gray-300 p-3 flex items-center justify-between">
                            <span className="text-[0.9vw] font-bold text-gray-800 flex items-center gap-2">
                                <i className="far fa-exclamation-circle text-[#DC1D10]"></i>
                                Unpaid Charge Invoices (Oldest to Newest)
                            </span>
                        </div>

                        <div className="flex-1 overflow-auto scrollbar-none">
                            {loading && unpaidInvoices.length === 0 ? (
                                <div className="p-8 text-center text-gray-500 text-[0.9vw]">Loading receivables...</div>
                            ) : filteredInvoices.length === 0 ? (
                                <div className="p-8 text-center text-gray-500 text-[0.9vw]">No unpaid Charge Invoices found!</div>
                            ) : (
                                <table className="min-w-full">
                                    <thead className="sticky top-0 bg-gray-50 border-b border-gray-300 z-10">
                                        <tr className="text-center text-[0.75vw] font-semibold text-gray-700">
                                            <th className="w-[14%] px-4 py-2">CI Number</th>
                                            <th className="w-[8%] px-4 py-2">Type</th>
                                            <th className="w-[10%] px-4 py-2">Date Issued</th>
                                            <th className="px-4 py-2 text-left">Customer</th>
                                            <th className="w-[12%] px-4 py-2">Amount</th>
                                            <th className="w-[10%] px-4 py-2">Age</th>
                                            <th className="w-[8%] px-4 py-2">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {filteredInvoices.map((inv) => (
                                            <tr key={inv.id || inv.ciNumber} className="text-center hover:bg-[#F4F8FB] text-[0.8vw]">
                                                <td className="px-4 py-2.5 font-semibold text-gray-800">{inv.ciNumber}</td>
                                                <td className="px-4 py-2.5">
                                                    <span className="px-2.5 py-0.5 rounded-full text-[0.7vw] font-bold bg-purple-100 text-purple-700">
                                                        CI
                                                    </span>
                                                </td>
                                                <td className="px-4 py-2.5">{inv.dateIssued}</td>
                                                <td className="px-4 py-2.5 text-left font-medium">{inv.customerName}</td>
                                                <td className="px-4 py-2.5 font-semibold text-[#FF8DCE]">
                                                    ₱ {inv.amount ? Number(inv.amount).toLocaleString('en-US', { minimumFractionDigits: 2 }) : '0.00'}
                                                </td>
                                                <td className="px-4 py-2.5">
                                                    <span className="text-[#DC1D10] font-bold">{getDaysOverdue(inv.dateIssued)}d ago</span>
                                                </td>
                                                <td className="px-4 py-2.5 text-md">
                                                    <i 
                                                        className="far fa-eye cursor-pointer hover:text-[#5FA5DA] transition-colors" 
                                                        title="View Charge Invoice details"
                                                        onClick={() => navigate(`/charge-invoice-details/${inv.ciNumber || inv.id}`)}
                                                    ></i>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
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

                        <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3 scrollbar-none">
                            {filteredDebtors.length === 0 ? (
                                <div className="p-4 text-center text-gray-400 text-[0.75vw]">No debtors matching filter.</div>
                            ) : (
                                filteredDebtors.map((debtor, index) => (
                                    <div key={index} className="bg-[#F4F8FB] border border-[#5FA5DA]/30 rounded-lg p-3 flex justify-between items-center">
                                        <div className="flex flex-col gap-0.5">
                                            <span className="text-[0.8vw] font-bold text-gray-800">{debtor.name}</span>
                                            <span className="text-[0.7vw] text-gray-500">{debtor.pendingCount} unpaid CI(s)</span>
                                        </div>
                                        <div className="flex flex-col items-end">
                                            <span className="text-[0.85vw] font-bold text-[#DC1D10]">
                                                ₱ {Number(debtor.balance).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                            </span>
                                            <button 
                                                onClick={() => navigate('/accounts')}
                                                className="text-[0.65vw] text-[#5FA5DA] underline font-semibold cursor-pointer hover:text-[#4d90c3]"
                                            >
                                                View Account
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
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
                    <span>Real-time Accounts Receivable Tracker</span>
                </div>
            </div>
        </div>
    );
}

export default Home;