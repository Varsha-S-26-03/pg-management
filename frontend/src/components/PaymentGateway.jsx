import React, { useState } from 'react';
import axios from 'axios';
import config from '../config';
import './PaymentGateway.css';

const PaymentGateway = ({ amount, billingPeriod, onPaymentSuccess, onPaymentCancel }) => {
  const [selectedApp, setSelectedApp] = useState('gpay');
  const [upiId, setUpiId] = useState(config.UPI_ID || '');
  const [generatingInvoice, setGeneratingInvoice] = useState(false);
  const [invoiceData, setInvoiceData] = useState(null);
  const [transactionId, setTransactionId] = useState('');

  const paymentApps = [
    { id: 'gpay', name: 'Google Pay', icon: '💳', scheme: 'tez://upi/pay' },
    { id: 'phonepe', name: 'PhonePe', icon: '📱', scheme: 'phonepe://pay' },
    { id: 'paytm', name: 'Paytm', icon: '💰', scheme: 'paytmmp://pay' },
    { id: 'upi', name: 'UPI App', icon: '🏦', scheme: 'upi://pay' }
  ];

  const generateInvoice = async (paymentData) => {
    setGeneratingInvoice(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${config.API_URL}/payments/generate-invoice`,
        paymentData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      setInvoiceData(response.data.invoice);
      return response.data.invoice;
    } catch (error) {
      console.error('Error generating invoice:', error);
      throw error;
    } finally {
      setGeneratingInvoice(false);
    }
  };

  const handlePayment = async () => {
    const receiverUpi = (config.UPI_ID || upiId || '').trim();
    if (!receiverUpi) {
      alert('Receiver UPI ID is not set. Please enter it here or set VITE_PG_UPI_ID.');
      return;
    }

    try {
      // Generate invoice first
      const invoice = await generateInvoice({
        amount,
        billingPeriod,
        method: 'upi',
        upiId: receiverUpi,
        paymentApp: selectedApp
      });

      // Generate UPI payment link
      const payeeName = 'PG Management';
      const transactionNote = `Rent payment for ${billingPeriod} - Invoice #${invoice.invoiceNumber}`;
      const scheme = (paymentApps.find(a => a.id === selectedApp)?.scheme) || 'upi://pay';
      const upiUrl = `${scheme}?pa=${encodeURIComponent(receiverUpi)}&pn=${encodeURIComponent(payeeName)}&am=${encodeURIComponent(String(amount))}&cu=INR&tn=${encodeURIComponent(transactionNote)}`;
      
      // Try to open the payment app
      try {
        window.location.href = upiUrl;
        
        // Wait for user to complete payment
        setTimeout(() => {
          if (onPaymentSuccess) {
            onPaymentSuccess({
              invoice,
              upiUrl
            });
          }
        }, 2000);
        
      } catch (error) {
        console.error('Error opening payment app:', error);
        // Fallback: show UPI details for manual payment
        alert(`Please pay ₹${amount} to UPI ID: ${receiverUpi} and enter the transaction ID after payment.`);
        if (onPaymentSuccess) {
          onPaymentSuccess({
            invoice,
            upiUrl
          });
        }
      }
      
    } catch (error) {
      console.error('Payment initiation failed:', error);
      alert('Failed to initiate payment. Please try again.');
    }
  };

  const downloadInvoice = () => {
    if (!invoiceData) return;
    
    // Create a printable HTML version of the invoice
    const invoiceHTML = generatePrintableInvoice(invoiceData);
    
    // Open in new window for printing
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    printWindow.document.write(invoiceHTML);
    printWindow.document.close();
    printWindow.focus();
    
    // Auto-trigger print dialog
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };

  const updatePaymentStatus = async (status) => {
    if (!invoiceData) return;
    
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${config.API_URL}/payments/update-payment-status`,
        {
          invoiceId: invoiceData._id,
          status: status,
          transactionId: transactionId,
          notes: `Payment completed via ${selectedApp}`
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      if (status === 'paid') {
        alert('Payment marked as completed! Invoice will be updated.');
      }
      
    } catch (error) {
      console.error('Error updating payment status:', error);
      alert('Error updating payment status. Please try again.');
    }
  };

  const generatePrintableInvoice = (invoice) => {
    const invoiceDate = new Date(invoice.date || Date.now()).toLocaleDateString('en-IN');
    const dueDate = new Date(invoice.dueDate || Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString('en-IN');
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Invoice ${invoice.invoiceNumber}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
            line-height: 1.6; 
            color: #333; 
            background: #fff;
            padding: 20px;
          }
          .invoice-container { 
            max-width: 800px; 
            margin: 0 auto; 
            background: white;
            box-shadow: 0 0 20px rgba(0,0,0,0.1);
            border-radius: 10px;
            overflow: hidden;
          }
          .invoice-header { 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            text-align: center;
          }
          .invoice-header h1 { 
            font-size: 2.5em; 
            margin-bottom: 10px; 
            font-weight: 300;
          }
          .invoice-header .company-info {
            font-size: 1.1em;
            opacity: 0.9;
          }
          .invoice-details { 
            display: flex; 
            justify-content: space-between; 
            padding: 30px;
            background: #f8f9fa;
            border-bottom: 1px solid #e9ecef;
          }
          .invoice-details h3 {
            color: #495057;
            margin-bottom: 15px;
            font-size: 1.2em;
          }
          .invoice-details p {
            margin-bottom: 8px;
            color: #6c757d;
          }
          .invoice-details .invoice-meta {
            text-align: right;
          }
          .invoice-meta .invoice-number {
            font-size: 1.5em;
            font-weight: bold;
            color: #667eea;
            margin-bottom: 10px;
          }
          .items-table { 
            width: 100%; 
            border-collapse: collapse; 
            margin: 30px 0;
            background: white;
          }
          .items-table th { 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 15px;
            text-align: left;
            font-weight: 600;
            text-transform: uppercase;
            font-size: 0.9em;
            letter-spacing: 0.5px;
          }
          .items-table td { 
            padding: 15px; 
            border-bottom: 1px solid #e9ecef;
            color: #495057;
          }
          .items-table tr:hover {
            background-color: #f8f9fa;
          }
          .total-section {
            padding: 30px;
            background: #f8f9fa;
            border-top: 2px solid #e9ecef;
          }
          .total-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 10px;
            font-size: 1.1em;
          }
          .total-row.final {
            font-size: 1.4em;
            font-weight: bold;
            color: #667eea;
            border-top: 2px solid #667eea;
            padding-top: 15px;
            margin-top: 15px;
          }
          .payment-info {
            padding: 30px;
            background: #e3f2fd;
            border-top: 1px solid #e9ecef;
          }
          .payment-info h4 {
            color: #1976d2;
            margin-bottom: 15px;
          }
          .payment-info p {
            margin-bottom: 8px;
            color: #424242;
          }
          .footer {
            text-align: center;
            padding: 30px;
            background: #343a40;
            color: white;
            font-size: 0.9em;
          }
          .status-badge {
            display: inline-block;
            padding: 5px 12px;
            border-radius: 20px;
            font-size: 0.8em;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .status-pending {
            background: #fff3cd;
            color: #856404;
            border: 1px solid #ffeaa7;
          }
          .status-paid {
            background: #d4edda;
            color: #155724;
            border: 1px solid #c3e6cb;
          }
          @media print {
            body { padding: 0; }
            .invoice-container { box-shadow: none; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="invoice-container">
          <div class="invoice-header">
            <h1>INVOICE</h1>
            <div class="company-info">
              <h2>PG Management System</h2>
              <p>Rent Payment Services</p>
            </div>
          </div>
          
          <div class="invoice-details">
            <div class="bill-to">
              <h3>Bill To:</h3>
              <p><strong>${invoice.tenantName || 'Tenant'}</strong></p>
              <p>${invoice.tenantEmail || ''}</p>
              <p>${invoice.tenantPhone || ''}</p>
            </div>
            <div class="invoice-meta">
              <div class="invoice-number">${invoice.invoiceNumber}</div>
              <p><strong>Invoice Date:</strong> ${invoiceDate}</p>
              <p><strong>Due Date:</strong> ${dueDate}</p>
              <p><strong>Status:</strong> <span class="status-badge status-pending">Pending Payment</span></p>
            </div>
          </div>
          
          <table class="items-table">
            <thead>
              <tr>
                <th>Description</th>
                <th>Period</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Rent Payment</td>
                <td>${invoice.billingPeriod}</td>
                <td>₹${invoice.amount.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>
          
          <div class="total-section">
            <div class="total-row">
              <span>Subtotal:</span>
              <span>₹${invoice.amount.toFixed(2)}</span>
            </div>
            ${invoice.gstAmount > 0 ? `
              <div class="total-row">
                <span>GST (${(invoice.gstRate * 100).toFixed(0)}%):</span>
                <span>₹${invoice.gstAmount.toFixed(2)}</span>
              </div>
            ` : ''}
            <div class="total-row final">
              <span>Total Amount:</span>
              <span>₹${invoice.totalAmount.toFixed(2)}</span>
            </div>
          </div>
          
          <div class="payment-info">
            <h4>Payment Instructions:</h4>
            <p><strong>Payment Method:</strong> ${invoice.paymentMethod?.toUpperCase() || 'UPI'}</p>
            ${invoice.upiId ? `<p><strong>UPI ID:</strong> ${invoice.upiId}</p>` : ''}
            ${invoice.paymentApp ? `<p><strong>Payment App:</strong> ${invoice.paymentApp}</p>` : ''}
            <p><strong>Notes:</strong> Please complete the payment using the provided payment details. Save your transaction ID for verification.</p>
          </div>
          
          <div class="footer">
            <p>Thank you for your business!</p>
            <p>For any queries, please contact the PG management.</p>
          </div>
        </div>
        
        <script>
          // Auto-print when page loads
          window.addEventListener('load', function() {
            setTimeout(function() {
              window.print();
            }, 500);
          });
        </script>
      </body>
      </html>
    `;
  };

  return (
    <div className="payment-gateway">
      <div className="payment-gateway-header">
        <h2>Secure Payment</h2>
        <button className="close-btn" onClick={onPaymentCancel}>×</button>
      </div>
      
      <div className="payment-amount">
        <h3>Amount: ₹{amount}</h3>
        <p>Period: {billingPeriod}</p>
      </div>

      <div className="payment-form">
        <div className="form-group">
          <label>Select Payment App:</label>
          <div className="payment-apps-grid">
            {paymentApps.map(app => (
              <div
                key={app.id}
                className={`payment-app-option ${selectedApp === app.id ? 'selected' : ''}`}
                onClick={() => setSelectedApp(app.id)}
              >
                <span className="app-icon">{app.icon}</span>
                <span className="app-name">{app.name}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="form-group">
          <label>Receiver UPI ID:</label>
          <input
            type="text"
            className="form-input"
            value={upiId}
            onChange={(e) => setUpiId(e.target.value)}
            placeholder="example@upi"
          />
          <small className="form-help">This is the PG’s UPI ID that will receive the payment</small>
        </div>

        <div className="payment-actions">
          <button
            className="btn-primary"
            onClick={handlePayment}
            disabled={generatingInvoice}
          >
            {generatingInvoice ? 'Generating Invoice...' : 'Proceed to Pay'}
          </button>
          <button
            className="btn-secondary"
            onClick={onPaymentCancel}
          >
            Cancel
          </button>
        </div>

        {invoiceData && (
          <div className="invoice-section">
            <h4>Invoice Generated Successfully!</h4>
            <div className="invoice-details">
              <p><strong>Invoice Number:</strong> {invoiceData.invoiceNumber}</p>
              <p><strong>Amount:</strong> ₹{invoiceData.totalAmount}</p>
              <p><strong>Due Date:</strong> {new Date(invoiceData.dueDate).toLocaleDateString()}</p>
            </div>
            
            <div className="payment-tracking">
              <h4>Payment Status</h4>
              <div className="status-section">
                <div className="form-group">
                  <label>Transaction ID (from your payment app):</label>
                  <input
                    type="text"
                    className="form-input"
                    value={transactionId}
                    onChange={(e) => setTransactionId(e.target.value)}
                    placeholder="Enter UPI transaction ID or reference number"
                  />
                </div>
                <div className="status-actions">
                  <button 
                    className="btn btn-success" 
                    onClick={() => updatePaymentStatus('paid')}
                    disabled={!transactionId.trim()}
                  >
                    ✅ Mark as Paid
                  </button>
                  <button 
                    className="btn btn-danger" 
                    onClick={() => updatePaymentStatus('cancelled')}
                  >
                    ❌ Cancel Payment
                  </button>
                </div>
              </div>
            </div>
            
            <div className="invoice-actions">
              <button 
                className="btn btn-primary" 
                onClick={downloadInvoice}
              >
                📄 Download Invoice
              </button>
              <button 
                className="btn btn-secondary" 
                onClick={() => setInvoiceData(null)}
              >
                Generate New Invoice
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="payment-security-note">
        <p>🔒 Your payment is secure. You'll be redirected to your chosen payment app to complete the transaction.</p>
        <p>After payment, please save the transaction ID for verification.</p>
      </div>
    </div>
  );
};

export default PaymentGateway;
