import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useLocation } from 'react-router-dom';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatTransactionDate } from '../utils/dateFormatter';
import '../styles/pages/TransactionHistory.css';

const TransactionHistory = () => {
    const location = useLocation();
    const user = location.state || null;
    const [allTransactions, setAllTransactions] = useState([]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (user?.mobileNumber) {
            setIsLoading(true);
            api.get(`/transactions/${user.mobileNumber}`)
                .then(response => {
                    setAllTransactions(response.data || []);
                    console.log(response.data);
                })
                .catch(error => {
                    console.error("Failed to load transactions", error);
                })
                .finally(() => {
                    setIsLoading(false);
                });
        }
    }, [user?.mobileNumber]);

    const [filterType, setFilterType] = useState('all');
    const [filterDate, setFilterDate] = useState('');

    // Filter Logic
    const filteredTransactions = allTransactions
        .sort((a, b) => new Date(b.timestamp || b.date) - new Date(a.timestamp || a.date))
        .filter(t => {
            const isReceived = t.toNumber === user?.mobileNumber;
            const mappedType = isReceived ? 'credit' : 'debit';
            const matchesType = filterType === 'all' || mappedType === filterType;
            const rawDate = (t.timestamp || t.date)?.split('T')[0];
            const matchesDate = filterDate === '' || rawDate === filterDate;
            return matchesType && matchesDate;
        });

    const handleDownloadPDF = () => {
        const doc = new jsPDF();

        // Add Header
        doc.setFontSize(22);
        doc.setTextColor(40, 40, 40);
        doc.text('ELITETRUST BANK', 14, 22);

        doc.setFontSize(12);
        doc.setTextColor(100, 100, 100);
        doc.text('Transaction History Statement', 14, 30);
        doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 38);
        if (user?.name) {
            doc.text(`Customer: ${user.name}`, 14, 46);
        }

        // Add Table
        const tableColumn = ["Type", "Counterparty", "Date", "Status", "Amount"];
        const tableRows = [];

        filteredTransactions.forEach(t => {
            const isReceived = t.toNumber === user?.mobileNumber;
            const typeLabel = isReceived ? 'Received' : 'Sent';
            const counterparty = isReceived ? t.fromNumber : t.toNumber;
            const maskedCounterparty = counterparty ? `XXXXXX${counterparty.slice(-4)}` : 'N/A';

            const transactionData = [
                typeLabel,
                maskedCounterparty,
                formatTransactionDate(t.timestamp || t.date),
                t.status || 'SUCCESS',
                `${isReceived ? '+' : '-'}Rs.${t.amount.toFixed(2)}`
            ];
            tableRows.push(transactionData);
        });

        autoTable(doc, {
            head: [tableColumn],
            body: tableRows,
            startY: 55,
            theme: 'grid',
            headStyles: { fillColor: [16, 185, 129], textColor: 255 },
            alternateRowStyles: { fillColor: [245, 250, 248] },
        });

        doc.save(`elitetrust_bank_statement_${Date.now()}.pdf`);
    };

    return (
        <div className="history-container">
            <div className="history-header">
                <div>
                    <h1>Transaction History</h1>
                    <p style={{ color: 'var(--text-secondary)' }}>View and manage your past transactions.</p>
                </div>
                <div className="header-actions">
                    <button className="btn-download" onClick={handleDownloadPDF}>
                        <span>⬇ PDF</span> Download
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="filters-section glass-panel">
                <div className="filter-group">
                    <label>Type:</label>
                    <select
                        className="filter-select"
                        value={filterType}
                        onChange={(e) => setFilterType(e.target.value)}
                    >
                        <option value="all">All Transactions</option>
                        <option value="credit">Credit (Incoming)</option>
                        <option value="debit">Debit (Outgoing)</option>
                    </select>
                </div>
                <div className="filter-group">
                    <label>Date:</label>
                    <input
                        type="date"
                        className="filter-date"
                        value={filterDate}
                        onChange={(e) => setFilterDate(e.target.value)}
                    />
                </div>
                {(filterType !== 'all' || filterDate !== '') && (
                    <button
                        onClick={() => { setFilterType('all'); setFilterDate(''); }}
                        style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--primary)',
                            cursor: 'pointer',
                            textDecoration: 'underline',
                            fontSize: '0.9rem'
                        }}
                    >
                        Clear Filters
                    </button>
                )}
            </div>

            {/* Transactions List */}
            <div className="transactions-table-container glass-panel">
                {isLoading ? (
                    <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-secondary)' }}>
                        <p>Loading transactions...</p>
                    </div>
                ) : (
                    <table className="transactions-table">
                        <thead>
                            <tr>
                                <th>Type</th>
                                <th>Counterparty</th>
                                <th>Date & Time</th>
                                 <th>Category</th>
                                <th>Status</th>
                                <th style={{ textAlign: 'right' }}>Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredTransactions.length > 0 ? (
                                filteredTransactions.map((t) => {
                                    const isReceived = t.toNumber === user?.mobileNumber;
                                    const typeLabel = isReceived ? 'Received' : 'Sent';
                                    const iconSign = isReceived ? '↓' : '↑';
                                    const amountSign = isReceived ? '+' : '-';
                                    const amountClass = isReceived ? 'positive' : 'negative';
                                    
                                    const counterparty = isReceived ? t.fromNumber : t.toNumber;
                                    const maskedCounterparty = counterparty ? `XXXXXX${counterparty.slice(-4)}` : 'N/A';
                                    const category = t.category || 'Other';

                                    return (
                                        <tr key={t.id}>
                                            <td>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                    <div className="t-icon-small" style={{ background: isReceived ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)', color: isReceived ? '#10b981' : '#ef4444' }}>
                                                        {iconSign}
                                                    </div>
                                                    <span style={{ fontWeight: '500' }}>{typeLabel}</span>
                                                </div>
                                            </td>
                                            <td>{maskedCounterparty}</td>
                                            <td>{formatTransactionDate(t.timestamp || t.date)}</td>
                                            <td>{category}</td>
                                            <td>
                                                <span className={`status-pill status-${(t.status || 'SUCCESS').toLowerCase()}`}>
                                                    {t.status || 'Success'}
                                                </span>
                                            </td>
                                            
                                            <td style={{ textAlign: 'right' }}>
                                                <span className={`amount ${amountClass}`}>
                                                    {amountSign}₹{t.amount.toFixed(2)}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td colSpan="5" className="no-transactions" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                                        No transactions found for this account.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
};

export default TransactionHistory;
