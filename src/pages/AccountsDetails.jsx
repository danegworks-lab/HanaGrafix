import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { customerService } from '../services/customerService';

function AccountDetails() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const queryClient = useQueryClient();
    const customerId = searchParams.get('customerId');

    // Customer form fields state
    const [customerInfo, setCustomerInfo] = useState({
        customerName: '',
        registeredName: '',
        tin: '',
        businessAddress: '',
        contactPerson: '',
        contactNumber: ''
    });

    // Filter and search controls
    const [searchQuery, setSearchQuery] = useState('');
    const [typeFilter, setTypeFilter] = useState('ALL'); // 'ALL' | 'CI' | 'SI'

    // Fetch customer profile & orders with TanStack Query
    const { 
        data, 
        isLoading: loading 
    } = useQuery({
        queryKey: ['customer_details', customerId],
        queryFn: () => customerService.getCustomerAccountDetails(customerId),
        enabled: Boolean(customerId)
    });

    // Sync database data to form state when loaded
    useEffect(() => {
        if (data?.customer) {
            setCustomerInfo({
                customerName: data.customer.name || '',
                registeredName: data.customer.company || data.customer.name || '',
                tin: data.customer.tin || '',
                businessAddress: data.customer.address || '',
                contactPerson: data.customer.contactPerson || '',
                contactNumber: data.customer.phone || ''
            });
        }
    }, [data]);

    // Mutation: Save Customer Changes
    const updateCustomerMutation = useMutation({
        mutationFn: (updatedInfo) => customerService.updateCustomer(customerId, updatedInfo),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['customer_details', customerId] });
            queryClient.invalidateQueries({ queryKey: ['customer_accounts'] });
            alert('Customer details updated successfully!');
        },
        onError: (err) => {
            console.error('Failed to update customer:', err);
            alert(`Error saving customer changes: ${err.message}`);
        }
    });

    // Mutation: Delete Customer
    const deleteCustomerMutation = useMutation({
        mutationFn: () => customerService.deleteCustomer(customerId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['customer_accounts'] });
            alert('Customer account deleted.');
            navigate('/accounts');
        },
        onError: (err) => {
            console.error('Failed to delete customer:', err);
            alert(`Error deleting customer: ${err.message}`);
        }
    });

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setCustomerInfo((prev) => ({ ...prev, [name]: value }));
    };

    const handleSaveChanges = () => {
        if (!customerInfo.customerName.trim()) {
            alert('Customer name cannot be empty.');
            return;
        }
        updateCustomerMutation.mutate(customerInfo);
    };

    const handleDeleteAccount = () => {
        if (!window.confirm(`Are you sure you want to delete ${customerInfo.customerName}? This action cannot be undone.`)) return;
        deleteCustomerMutation.mutate();
    };

    const handleOrderClick = (order) => {
        if (order.type === 'CI') {
            navigate(`/charge-invoice-details/${order.id}`);
        } else {
            navigate(`/sales-invoices-details/${order.id}`);
        }
    };

    // Separate orders into Current (unpaid/partial/pending) and Past (paid/completed/cancelled)
    const allOrders = data?.orders || [];
    const currentOrders = useMemo(() => 
        allOrders.filter((o) => ['unpaid', 'partial', 'pending'].includes(o.status?.toLowerCase())),
        [allOrders]
    );
    const pastOrders = useMemo(() => 
        allOrders.filter((o) => ['paid', 'completed', 'cancelled'].includes(o.status?.toLowerCase())),
        [allOrders]
    );

    // Search and filter helper
    const filterOrders = (ordersList) => {
        return ordersList.filter((order) => {
            const matchesType = typeFilter === 'ALL' || order.type === typeFilter;
            const matchesSearch = 
                String(order.id).toLowerCase().includes(searchQuery.toLowerCase()) ||
                String(order.date || '').includes(searchQuery) ||
                String(order.status || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                String(order.amount || '').includes(searchQuery);

            return matchesType && matchesSearch;
        });
    };

    const filteredCurrentOrders = useMemo(() => filterOrders(currentOrders), [currentOrders, typeFilter, searchQuery]);
    const filteredPastOrders = useMemo(() => filterOrders(pastOrders), [pastOrders, typeFilter, searchQuery]);

    const lifetimeTotal = useMemo(() => 
        allOrders.reduce((sum, order) => sum + (Number(order.amount) || 0), 0),
        [allOrders]
    );

    if (!customerId) {
        return (
            <div className="flex flex-col h-screen items-center justify-center gap-4 text-gray-500 text-[1vw]">
                <p>No customer selected.</p>
                <button 
                    onClick={() => navigate('/accounts')}
                    className="px-4 py-1 text-[0.8vw] bg-[#5FA5DA] text-white rounded-full cursor-pointer"
                >
                    Back to Accounts
                </button>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center text-gray-400 text-[1vw]">
                Loading customer details...
            </div>
        );
    }

    return (
        <div className="flex flex-col h-screen">
            {/* Header */}
            <div id="pageHeader" className="flex flex-col justify-between shrink-0 p-6">
                <div className="flex items-center justify-between border-b-2 pb-2">
                    <div className="flex items-center gap-4">
                        <h1 className="text-xl font-bold">{customerInfo.customerName || 'Customer Account Details'}</h1>
                    </div>
                    <div className="flex items-center gap-2">
                        <button 
                            type="button"
                            onClick={handleSaveChanges}
                            disabled={updateCustomerMutation.isPending}
                            className="flex items-center gap-2 border-2 border-[#22E11F] text-[#22E11F] text-[0.8vw] px-3 py-1 rounded-full hover:bg-[#22E11F] hover:text-white transition-colors cursor-pointer font-semibold disabled:opacity-50"
                        >
                            <i className="far fa-check"></i>
                            {updateCustomerMutation.isPending ? 'Saving...' : 'Save Changes'}
                        </button>
                        <button 
                            type="button"
                            onClick={handleDeleteAccount}
                            disabled={deleteCustomerMutation.isPending}
                            className="flex items-center gap-2 border-2 border-[#DC1D10] text-[#DC1D10] text-[0.8vw] px-3 py-1 rounded-full hover:bg-[#DC1D10] hover:text-white transition-colors cursor-pointer font-semibold disabled:opacity-50"
                        >
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
                            <label className="text-[0.8vw] font-medium text-gray-700">Company / Customer Name:</label>
                            <input 
                                type="text" 
                                name="customerName"
                                value={customerInfo.customerName}
                                onChange={handleInputChange}
                                placeholder="Enter customer name..."
                                className="bg-white border border-gray-300 rounded-md p-2 text-[0.8vw] focus:outline-none" 
                            />
                        </div>
                        <div className="flex flex-col gap-1.5 w-1/2">
                            <label className="text-[0.8vw] font-medium text-gray-700">Registered Name:</label>
                            <input 
                                type="text" 
                                name="registeredName"
                                value={customerInfo.registeredName}
                                onChange={handleInputChange}
                                placeholder="Optional official name..."
                                className="bg-white border border-gray-300 rounded-md p-2 text-[0.8vw] focus:outline-none" 
                            />
                        </div>
                    </div>

                    <div className="flex gap-4 shrink-0">
                        <div className="flex flex-col gap-1.5 w-1/3">
                            <label className="text-[0.8vw] font-medium text-gray-700">TIN:</label>
                            <input 
                                type="text" 
                                name="tin"
                                value={customerInfo.tin}
                                onChange={handleInputChange}
                                placeholder="000-000-000-000"
                                className="bg-white border border-gray-300 rounded-md p-2 text-[0.8vw] focus:outline-none" 
                            />
                        </div>
                        <div className="flex flex-col gap-1.5 w-1/3">
                            <label className="text-[0.8vw] font-medium text-gray-700">Contact Person:</label>
                            <input 
                                type="text" 
                                name="contactPerson"
                                value={customerInfo.contactPerson}
                                onChange={handleInputChange}
                                placeholder="Primary representative..."
                                className="bg-white border border-gray-300 rounded-md p-2 text-[0.8vw] focus:outline-none" 
                            />
                        </div>
                        <div className="flex flex-col gap-1.5 w-1/3">
                            <label className="text-[0.8vw] font-medium text-gray-700">Contact Number:</label>
                            <input 
                                type="text" 
                                name="contactNumber"
                                value={customerInfo.contactNumber}
                                onChange={handleInputChange}
                                placeholder="Phone or mobile..."
                                className="bg-white border border-gray-300 rounded-md p-2 text-[0.8vw] focus:outline-none" 
                            />
                        </div>
                    </div>

                    <div className="flex flex-col gap-1.5 shrink-0">
                        <label className="text-[0.8vw] font-medium text-gray-700">Business Address:</label>
                        <input 
                            type="text" 
                            name="businessAddress"
                            value={customerInfo.businessAddress}
                            onChange={handleInputChange}
                            placeholder="Complete billing address..."
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
                        <label className="text-[1vw] font-bold text-gray-800">Current Orders (Outstanding)</label>
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
                                            <td className="p-3 text-gray-600">{order.date || '—'}</td>
                                            <td className="p-3 capitalize font-semibold text-amber-600">{order.status}</td>
                                            <td className="p-3 text-right font-semibold text-gray-800">
                                                ₱{Number(order.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                            </td>
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
                                            No outstanding orders match your search filter.
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
                        <label className="text-[1vw] font-bold text-gray-800">Past Orders (Completed / Paid)</label>
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
                                            <td className="p-3 text-gray-500">{order.date || '—'}</td>
                                            <td className="p-3 capitalize font-medium text-emerald-600">{order.status}</td>
                                            <td className="p-3 text-right font-semibold text-gray-700">
                                                ₱{Number(order.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                            </td>
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
                <div className="flex gap-3 items-center text-[0.9vw]">
                    {/* Back Button positioned to the left of Tools */}
                    <button
                        onClick={() => navigate('/accounts')}
                        className="flex items-center gap-1.5 px-3 py-1 text-[0.8vw] rounded-full border border-gray-300 text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors cursor-pointer"
                    >
                        <i className="far fa-arrow-left"></i>
                        Back
                    </button>

                    <div className="w-px h-5 bg-gray-300"></div>

                    <label className="font-semibold text-gray-700">Tools:</label>
                    <button 
                        onClick={() => navigate('/charge-invoices')}
                        className="px-3 py-1 text-[0.8vw] rounded-full border-2 border-[#5FA5DA] cursor-pointer bg-[#F4F8FB] text-[#5FA5DA] font-medium hover:bg-[#5FA5DA] hover:text-white transition-colors"
                    >
                        + Create New Charge Invoice
                    </button>
                </div>
                <div className="flex gap-2 items-center font-bold text-[0.9vw]">
                    <label className="text-gray-700">Lifetime Total:</label>
                    <span className="text-[#FF8DCE] text-[1.1vw]">
                        ₱{lifetimeTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                </div>
            </div>
        </div>
    );
}

export default AccountDetails;