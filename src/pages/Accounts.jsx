import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import CustomerBlock from '../components/CustomerBlock';

function Accounts() {
    const navigate = useNavigate();

    // Sample Customer Data
    const [customers] = useState([
        { id: 1, name: 'Davao Medical School Foundation', totalOrders: 12 },
        { id: 2, name: 'Ateneo de Davao University', totalOrders: 5 },
        { id: 3, name: 'Southern Philippines Medical Center', totalOrders: 28 }
    ]);

    return (
        <div className="flex flex-col h-screen">
            {/* Header */}
            <div id="pageHeader" className="flex items-center justify-between p-6 shrink-0">
                <h1>Customer Accounts</h1>
                <div className="flex items-center max-w-62.5 gap-2.5 bg-[#F4F8FB] text-[#5FA5DA] text-[0.8vw] border-3 border-[#5FA5DA] rounded-full px-4 py-2">
                    <i className="fal fa-search"></i>
                    <input
                        type="text"
                        placeholder="Search Customer"
                        className="w-full focus:outline-none"
                    />
                </div>
            </div>

            {/* Customer Blocks Container */}
            <div className="flex-1 overflow-y-auto px-6 pb-6">
                <div className="flex flex-wrap gap-4">
                    {customers.map((customer) => (
                        <CustomerBlock 
                            key={customer.id}
                            customerName={customer.name}
                            totalOrders={customer.totalOrders}
                            onClick={() => navigate(`/accounts-details`)}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
}

export default Accounts;