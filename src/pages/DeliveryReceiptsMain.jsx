// src/pages/DeliveryReceiptsMain.jsx
import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import DeliveryReceiptStatusSelector from '../components/DeliveryReceiptStatusSelector';
import { receiptService } from '../services/receiptService';

function DeliveryReceiptsMain() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    const [searchTerm, setSearchTerm] = useState('');
    const [filterDate, setFilterDate] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');

    const [sortConfig, setSortConfig] = useState({
        key: 'dateIssued',
        direction: 'desc'
    });

    // TanStack Query: Fetch Delivery Receipts with polling
    const { 
        data: receipts = [], 
        isLoading: loading 
    } = useQuery({
        queryKey: ['delivery_receipts'],
        queryFn: () => receiptService.getDeliveryReceipts(),
        staleTime: 0,
        refetchOnMount: 'always',
        refetchInterval: 10000,
    });

    const updateStatusMutation = useMutation({
        mutationFn: ({ id, status }) => receiptService.updateDeliveryReceiptStatus(id, status),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['delivery_receipts'] });
            queryClient.invalidateQueries({ queryKey: ['charge_invoices'] });
        },
        onError: (err) => alert(`Failed to update status: ${err.message}`)
    });

    const deleteReceiptMutation = useMutation({
        mutationFn: (id) => receiptService.deleteDeliveryReceipt(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['delivery_receipts'] });
            queryClient.invalidateQueries({ queryKey: ['charge_invoices'] });
        },
        onError: (err) => alert(`Failed to delete delivery receipt: ${err.message}`)
    });

    const handleDelete = (receipt) => {
        if (!window.confirm(`Are you sure you want to delete delivery receipt ${receipt.drNumber}?`)) return;
        deleteReceiptMutation.mutate(receipt.id);
    };

    const handleSort = (key) => {
        setSortConfig((prev) => ({
            key,
            direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
        }));
    };

    const renderSortIcon = (key) => {
        if (sortConfig.key !== key) {
            return <i className="far fa-sort text-gray-300 ml-1 text-[0.65vw]"></i>;
        }
        return sortConfig.direction === 'asc' 
            ? <i className="fas fa-sort-up text-[#5FA5DA] ml-1 text-[0.7vw]"></i> 
            : <i className="fas fa-sort-down text-[#5FA5DA] ml-1 text-[0.7vw]"></i>;
    };

    const processedReceipts = useMemo(() => {
        const filtered = receipts.filter((rc) => {
            const term = searchTerm.toLowerCase();
            const drMatches = (rc.drNumber || '').toLowerCase().includes(term);
            const ciMatches = (rc.ciId || '').toLowerCase().includes(term);
            const customerMatches = (rc.customerName || '').toLowerCase().includes(term);
            const addressMatches = (rc.businessAddress || '').toLowerCase().includes(term);

            const matchesSearch = drMatches || ciMatches || customerMatches || addressMatches;
            const matchesDate = !filterDate || rc.dateIssued === filterDate;
            
            const currentStatus = String(rc.status || '').toLowerCase().trim();
            const matchesStatus = filterStatus === 'all' || currentStatus === filterStatus.toLowerCase();

            return matchesSearch && matchesDate && matchesStatus;
        });

        return filtered.sort((a, b) => {
            const { key, direction } = sortConfig;
            let valA = a[key];
            let valB = b[key];

            if (key === 'totalPaidAmount') {
                valA = Number(valA) || 0;
                valB = Number(valB) || 0;
                return direction === 'asc' ? valA - valB : valB - valA;
            }

            if (key === 'dateIssued') {
                const timeA = new Date(valA || 0).getTime();
                const timeB = new Date(valB || 0).getTime();
                return direction === 'asc' ? timeA - timeB : timeB - timeA;
            }

            const strA = String(valA || '').toLowerCase();
            const strB = String(valB || '').toLowerCase();
            if (strA < strB) return direction === 'asc' ? -1 : 1;
            if (strA > strB) return direction === 'asc' ? 1 : -1;
            return 0;
        });
    }, [receipts, searchTerm, filterDate, filterStatus, sortConfig]);

    const formatPaymentType = (type) => {
        if (!type) return 'Cash';
        return type.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase());
    };

    return (
        <div className="flex flex-col h-screen">
            {/* Header */}
            <div id="pageHeader" className="flex items-center justify-between p-6 shrink-0">
                <h1 className="text-xl font-bold">Delivery Receipts</h1>
                <div className="flex items-center max-w-62.5 gap-2.5 bg-[#F4F8FB] text-[#5FA5DA] text-[0.8vw] border-3 border-[#5FA5DA] rounded-full px-4 py-2">
                    <i className="fal fa-search"></i>
                    <input
                        type="text"
                        placeholder="Search by DR, CI, Customer, or Address"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full focus:outline-none"
                    />
                </div>
            </div>

            {/* Table Container */}
            <div id="tableContainer" className="flex-1 overflow-auto scrollbar-none">
                <table className="min-w-full border-collapse">
                    <thead className="sticky top-0 bg-white z-10 border-b border-gray-200 select-none">
                        <tr className="text-center text-[0.78vw] font-semibold text-gray-700">
                            <th className="w-[10%] px-3 py-2.5 cursor-pointer hover:bg-gray-50" onClick={() => handleSort('drNumber')}>
                                <div className="inline-flex items-center justify-center">
                                    DR ID {renderSortIcon('drNumber')}
                                </div>
                            </th>
                            <th className="w-[10%] px-3 py-2.5 cursor-pointer hover:bg-gray-50" onClick={() => handleSort('ciId')}>
                                <div className="inline-flex items-center justify-center">
                                    CI ID {renderSortIcon('ciId')}
                                </div>
                            </th>
                            <th className="w-[8%] px-3 py-2.5 cursor-pointer hover:bg-gray-50" onClick={() => handleSort('dateIssued')}>
                                <div className="inline-flex items-center justify-center">
                                    Date {renderSortIcon('dateIssued')}
                                </div>
                            </th>
                            <th className="px-3 py-2.5 text-left cursor-pointer hover:bg-gray-50" onClick={() => handleSort('customerName')}>
                                <div className="inline-flex items-center">
                                    Customer {renderSortIcon('customerName')}
                                </div>
                            </th>
                            <th className="px-3 py-2.5 text-left cursor-pointer hover:bg-gray-50" onClick={() => handleSort('businessAddress')}>
                                <div className="inline-flex items-center">
                                    Address {renderSortIcon('businessAddress')}
                                </div>
                            </th>
                            <th className="w-[10%] px-3 py-2.5 text-right cursor-pointer hover:bg-gray-50" onClick={() => handleSort('totalPaidAmount')}>
                                <div className="inline-flex items-center justify-end">
                                    Amount {renderSortIcon('totalPaidAmount')}
                                </div>
                            </th>
                            <th className="w-[9%] px-3 py-2.5 cursor-pointer hover:bg-gray-50" onClick={() => handleSort('paymentType')}>
                                <div className="inline-flex items-center justify-center">
                                    Payment {renderSortIcon('paymentType')}
                                </div>
                            </th>
                            <th className="w-[11%] px-3 py-2.5 cursor-pointer hover:bg-gray-50" onClick={() => handleSort('status')}>
                                <div className="inline-flex items-center justify-center">
                                    Status {renderSortIcon('status')}
                                </div>
                            </th>
                            <th className="w-[8%] px-3 py-2.5">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {loading ? (
                            <tr>
                                <td colSpan="9" className="p-16 text-center text-gray-500">
                                    <div className="flex flex-col items-center justify-center gap-3">
                                        <i className="fal fa-spinner-third fa-spin text-3xl text-[#5FA5DA]"></i>
                                        <span className="text-[0.9vw] font-medium text-gray-600">Loading delivery receipts...</span>
                                    </div>
                                </td>
                            </tr>
                        ) : processedReceipts.length === 0 ? (
                            <tr>
                                <td colSpan="9" className="p-16 text-center">
                                    <div className="flex flex-col items-center justify-center gap-3 py-10 select-none">
                                        <div className="w-20 h-20 rounded-full bg-[#F4F8FB] border border-[#5FA5DA]/30 flex items-center justify-center text-[#5FA5DA] shadow-xs">
                                            <i className="fal fa-truck text-4xl"></i>
                                        </div>
                                        <div className="flex flex-col gap-1 items-center">
                                            <span className="text-base font-bold text-gray-700">No Delivery Receipts Yet</span>
                                            <span className="text-xs text-gray-400 max-w-sm">
                                                {searchTerm || filterDate || filterStatus !== 'all'
                                                    ? 'No delivery receipts match your filter criteria. Try clearing your search or filters.'
                                                    : 'There are currently no recorded delivery receipts. Create one directly from an invoice details page.'}
                                            </span>
                                        </div>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            processedReceipts.map((rc) => (
                                <tr key={rc.id} className="text-center hover:bg-[#F4F8FB] text-[0.8vw]">
                                    <td className="px-3 py-2.5 font-bold text-gray-800">{rc.drNumber}</td>
                                    <td className="px-3 py-2.5">
                                        {rc.ciId !== '—' ? (
                                            <span 
                                                onClick={() => navigate(`/charge-invoice-details/${rc.ciId}`)}
                                                className="text-[#5FA5DA] font-semibold hover:underline cursor-pointer"
                                                title="View linked Charge Invoice"
                                            >
                                                {rc.ciId}
                                            </span>
                                        ) : (
                                            <span className="text-gray-400">—</span>
                                        )}
                                    </td>
                                    <td className="px-3 py-2.5 text-gray-600">{rc.dateIssued}</td>
                                    <td className="px-3 py-2.5 text-left font-medium text-gray-800 truncate max-w-[12rem]" title={rc.customerName}>
                                        {rc.customerName}
                                    </td>
                                    <td className="px-3 py-2.5 text-left text-gray-600 truncate max-w-[14rem]" title={rc.businessAddress || 'No address'}>
                                        {rc.businessAddress || '—'}
                                    </td>
                                    <td className="px-3 py-2.5 text-right font-bold text-gray-800">
                                        ₱ {Number(rc.totalPaidAmount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                    </td>
                                    <td className="px-3 py-2.5 text-gray-700">
                                        <span className="px-2.5 py-0.5 rounded-full text-[0.7vw] font-medium bg-gray-100 border border-gray-200">
                                            {formatPaymentType(rc.paymentType)}
                                        </span>
                                    </td>
                                    <td className="px-3 py-2.5">
                                        <DeliveryReceiptStatusSelector 
                                            initialStatus={rc.status}
                                            value={rc.status}
                                            onChange={(newStatus) => updateStatusMutation.mutate({ id: rc.id, status: newStatus })} 
                                        />
                                    </td>
                                    <td className="px-3 py-2.5 text-md">
                                        <div className="flex items-center justify-center gap-2.5 text-gray-500">
                                            <i 
                                                className="far fa-eye cursor-pointer hover:text-[#5FA5DA] transition-colors" 
                                                title="See details"
                                                onClick={() => {
                                                    const targetId = rc.id || rc.drNumber;
                                                    if (!targetId) {
                                                        alert('Cannot open details: Missing ID or DR Number.');
                                                        return;
                                                    }
                                                    navigate(`/delivery-receipts-details/${targetId}`);
                                                }}
                                            ></i>
                                            <i 
                                                className="far fa-trash cursor-pointer hover:text-[#DC1D10] transition-colors" 
                                                title="Delete receipt"
                                                onClick={() => handleDelete(rc)}
                                            ></i>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Bottom Toolbar */}
            <div id="toolBar" className="flex items-center justify-between p-6 border-t border-gray-200 shrink-0 bg-white">
                <div className="flex gap-4 items-center text-[0.8vw]">
                    <div className="flex gap-2 items-center">
                        <label className="text-gray-600 font-medium">Date:</label>
                        <input
                            type="date"
                            value={filterDate}
                            onChange={(e) => setFilterDate(e.target.value)}
                            className="px-2.5 py-1 border border-gray-300 rounded-full focus:outline-none text-[0.75vw]"
                        />
                        {filterDate && (
                            <button
                                onClick={() => setFilterDate('')}
                                className="text-gray-400 hover:text-gray-600 text-xs cursor-pointer"
                                title="Clear date filter"
                            >
                                ✕
                            </button>
                        )}
                    </div>

                    <div className="w-px h-5 bg-gray-300"></div>

                    <div className="flex gap-2 items-center">
                        <label className="text-gray-600 font-medium">Status:</label>
                        <select
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                            className="px-3 py-1 border border-gray-300 rounded-full focus:outline-none text-[0.75vw] bg-white cursor-pointer"
                        >
                            <option value="all">All Statuses</option>
                            <option value="pending delivery">Pending Delivery</option>
                            <option value="completed">Completed</option>
                            <option value="cancelled">Cancelled</option>
                        </select>
                    </div>
                </div>

                <div className="text-[0.75vw] text-gray-500 font-medium">
                    Showing <span className="font-bold text-gray-700">{processedReceipts.length}</span> of {receipts.length} receipts
                </div>
            </div>
        </div>
    );
}

export default DeliveryReceiptsMain;