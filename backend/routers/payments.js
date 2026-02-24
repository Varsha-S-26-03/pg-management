const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const Payment = require('../models/Payment');

router.get('/', authMiddleware, async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Forbidden' });
    }
    const payments = await Payment.find().sort({ createdAt: -1 }).populate('tenant', 'name email');
    res.json({ payments });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/my', authMiddleware, async (req, res) => {
  try {
    const payments = await Payment.find({ tenant: req.userId })
      .sort({ createdAt: -1 })
      .populate('tenant', 'name email');
    res.json({ payments });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Admin: record a payment for a tenant (e.g., cash)
router.post('/admin', authMiddleware, async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Forbidden' });
    }
    const { tenantId, amount, paymentType, billingPeriod, method, referenceId, status } = req.body;
    if (!tenantId || !amount) {
      return res.status(400).json({ message: 'Tenant and amount are required' });
    }
    const create = {
      tenant: tenantId,
      amount,
      paymentType: paymentType || 'rent',
      billingPeriod: billingPeriod || '',
      method: method || 'cash',
      referenceId: referenceId || '',
      status: status || 'completed'
    };
    const payment = await Payment.create(create);
    const populated = await payment.populate('tenant', 'name email');
    res.status(201).json({ message: 'Payment recorded successfully', payment: populated });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/', authMiddleware, async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'tenant') {
      return res.status(403).json({ message: 'Only tenants can submit payments' });
    }
    const { amount, paymentType, billingPeriod, method, referenceId } = req.body;
    if (!amount) {
      return res.status(400).json({ message: 'Amount is required' });
    }
    const payment = await Payment.create({
      tenant: req.userId,
      amount,
      paymentType: paymentType || 'rent',
      billingPeriod: billingPeriod || '',
      method: method || 'upi',
      referenceId: referenceId || '',
      status: 'pending'
    });
    const populated = await payment.populate('tenant', 'name email');
    res.status(201).json({ message: 'Payment submitted successfully', payment: populated });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.patch('/:id', authMiddleware, async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Forbidden' });
    }
    const { status, adminReply } = req.body;
    const update = {};
    if (status) {
      update.status = status;
    }
    if (adminReply !== undefined) {
      update.adminReply = adminReply;
    }
    const payment = await Payment.findByIdAndUpdate(req.params.id, update, {
      new: true
    }).populate('tenant', 'name email');
    if (!payment) {
      return res.status(404).json({ message: 'Payment not found' });
    }
    res.json({ message: 'Payment updated successfully', payment });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Forbidden' });
    }
    const payment = await Payment.findByIdAndDelete(req.params.id);
    if (!payment) {
      return res.status(404).json({ message: 'Payment not found' });
    }
    res.json({ message: 'Payment deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Generate invoice for payment
router.post('/generate-invoice', authMiddleware, async (req, res) => {
  try {
    const { amount, billingPeriod, method, upiId, paymentApp } = req.body;
    
    if (!amount || !billingPeriod) {
      return res.status(400).json({ message: 'Amount and billing period are required' });
    }

    // Get tenant details
    const User = require('../models/User');
    const Invoice = require('../models/Invoice');
    const tenant = await User.findById(req.userId);
    if (!tenant) {
      return res.status(404).json({ message: 'Tenant not found' });
    }

    // Generate unique invoice number
    const invoiceNumber = Invoice.generateInvoiceNumber();
    
    // Calculate GST (if applicable)
    const gstRate = 0; // You can adjust this based on your requirements
    const gstAmount = amount * gstRate;
    const totalAmount = amount + gstAmount;

    // Create invoice
    const invoice = await Invoice.create({
      invoiceNumber,
      tenant: req.userId,
      amount,
      billingPeriod,
      paymentMethod: method,
      upiId: upiId || '',
      paymentApp: paymentApp || '',
      gstRate,
      gstAmount,
      totalAmount,
      status: 'pending',
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
    });

    // Populate tenant details
    await invoice.populate('tenant', 'name email phone');

    res.json({ 
      message: 'Invoice generated successfully',
      invoice 
    });

  } catch (error) {
    console.error('Error generating invoice:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update payment status
router.post('/update-payment-status', authMiddleware, async (req, res) => {
  try {
    const { invoiceId, status, transactionId, notes } = req.body;
    
    if (!invoiceId || !status) {
      return res.status(400).json({ message: 'Invoice ID and status are required' });
    }

    const Invoice = require('../models/Invoice');
    const Payment = require('../models/Payment');

    // Find the invoice
    const invoice = await Invoice.findById(invoiceId);
    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }

    // Verify the invoice belongs to the current user
    if (invoice.tenant.toString() !== req.userId) {
      return res.status(403).json({ message: 'Unauthorized access to invoice' });
    }

    // Update invoice status
    invoice.status = status;
    if (status === 'paid') {
      invoice.paidDate = new Date();
      invoice.transactionId = transactionId || invoice.transactionId;
    }
    if (notes) {
      invoice.notes = notes;
    }
    
    await invoice.save();

    // Create payment record if paid
    if (status === 'paid') {
      const payment = await Payment.create({
        tenant: req.userId,
        amount: invoice.totalAmount,
        paymentType: 'rent',
        billingPeriod: invoice.billingPeriod,
        method: invoice.paymentMethod,
        referenceId: transactionId || `INV-${invoice.invoiceNumber}`,
        status: 'completed'
      });

      // Link payment to invoice
      invoice.payment = payment._id;
      await invoice.save();
    }

    // Populate tenant details for response
    await invoice.populate('tenant', 'name email phone');

    res.json({ 
      message: 'Payment status updated successfully',
      invoice 
    });

  } catch (error) {
    console.error('Error updating payment status:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
