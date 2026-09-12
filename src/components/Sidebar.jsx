import React from 'react';
import { Link } from 'react-router-dom';
import Logo from '../assets/Logo.svg';
import '../Global.css';
import './Sidebar.css';
import classNames from 'classnames';

export default function Sidebar({ isCollapsed, toggleSidebar }) {
  const items = [
    {
      routerLink: "/",
      icon: "fal fa-home",
      label: "Home"
    },
    {
      routerLink: "/charge-invoices",
      icon: "fal fa-regular fa-badge-dollar",
      label: "Charge Invoices"
    },
    {
      routerLink: "/collection-receipts",
      icon: "fal fa-regular fa-receipt",
      label: "Collection Receipts"
    },
    {
      routerLink: "/delivery-receipts",
      icon: "fal fa-regular fa-truck",
      label: "Delivery Receipts"
    },
    {
      routerLink: "/sales-invoices",
      icon: "fal fa-regular fa-money-check",
      label: "Sales Invoices"
    },
    {
      routerLink: "/accounts",
      icon: "fal fa-regular fa-users",
      label: "Accounts"
    },
  ];

  return (
    <div className={classNames("sidenav", { "sidenav-collapsed": isCollapsed })}>
      <div className="logo-container">
        {/* Logo button toggles expand ONLY when isCollapsed is true */}
        <button 
          className="logo" 
          onClick={isCollapsed ? toggleSidebar : undefined}
          style={{ cursor: isCollapsed ? 'pointer' : 'default' }}
        >
          <img src={Logo} alt="Logo" className="logo-image" />
        </button>

        {/* Elements render ONLY when expanded */}
        {!isCollapsed && (
          <>
            <div className="logo-text">
              Hana Grafix <br/> Sales System
            </div>
            
            <button className="btn-close" onClick={toggleSidebar}>
              <i className="fas fa-times close-icon"></i>
            </button>
          </>
        )}
      </div>

      <ul className="sidenav-nav">
        {items.map((item) => (
          <li key={item.label} className="sidenav-nav-item">
            <Link to={item.routerLink} className="sidenav-nav-link">
              <i
                className={classNames({
                  "sidenav-link-icon": true,
                  [item.icon]: true,
                })}
              ></i>
              {!isCollapsed && <span className="sidenav-link-text">{item.label}</span>}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}