import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import CustomerBlock from '../components/CustomerBlock';
import { customerService } from '../services/customerService';

function Accounts() {
    const navigate = useNavigate();
    const [searchTerm, setSearchTerm] = useState('');

    // TanStack Query: Cached Customer Data
    const { 
        data: customers = [], 
        isLoading: loading 
    } = useQuery({
        queryKey: ['customer_accounts'],
        queryFn: () => customerService.getCustomersWithStats(),
    });

    // Real-time search filter by customer name or company
    const filteredCustomers = customers.filter((cust) => {
        const name = (cust.name || '').toLowerCase();
        const contact = (cust.contactPerson || '').toLowerCase();
        const term = searchTerm.toLowerCase();
        return name.includes(term) || contact.includes(term);
    });

    return (
        <div className="flex flex-col h-screen">
            {/* Header */}
            <div id="pageHeader" className="flex items-center justify-between p-6 shrink-0">
                <div className="flex flex-col">
                    <h1 className="text-xl font-bold">Customer Accounts</h1>
                </div>
                <div className="flex items-center max-w-62.5 gap-2.5 bg-[#F4F8FB] text-[#5FA5DA] text-[0.8vw] border-3 border-[#5FA5DA] rounded-full px-4 py-2">
                    <i className="fal fa-search"></i>
                    <input
                        type="text"
                        placeholder="Search Customer..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full focus:outline-none"
                    />
                </div>
            </div>

            {/* Customer Blocks Container */}
            <div className="flex-1 overflow-y-auto px-6 pb-6 scrollbar-none">
                {loading && customers.length === 0 ? (
                    <div className="flex h-64 items-center justify-center text-gray-400 text-[0.9vw]">
                        Loading customer accounts...
                    </div>
                ) : filteredCustomers.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-gray-400 text-[0.85vw]">
                        <i className="far fa-users text-3xl mb-2"></i>
                        <span>No customer accounts found matching "{searchTerm}"</span>
                    </div>
                ) : (
                    <div className="flex flex-wrap gap-4">
                        {filteredCustomers.map((customer) => (
                            <CustomerBlock 
                                key={customer.id}
                                customerName={customer.name}
                                totalOrders={customer.totalOrders}
                                unpaidBalance={customer.unpaidBalance}
                                onClick={() => navigate(`/accounts-details?customerId=${customer.id}`)}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

export default Accounts;