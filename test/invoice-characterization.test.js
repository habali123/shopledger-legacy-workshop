var test = require('node:test');
var assert = require('node:assert/strict');

var pricing = require('../lib/pricing');
var invoice = require('../lib/invoice');

test('invoice HSN slab and totals match the customer-billed order figures', function () {
  var items = [
    { id: 1, name: 'Rice', sku: 'GRN-001', hsn: '1006', price: 100, qty: 1 }
  ];
  var ledger = pricing.computeTotals(items, '');
  var printedInvoice = invoice.computeInvoiceFigures({
    items: items,
    coupon: '',
    subtotal: ledger.subtotal,
    discount: ledger.discount,
    tax: ledger.tax,
    total: ledger.total
  });

  assert.equal(ledger.subtotal, 100);
  assert.equal(ledger.tax, 5);
  assert.equal(ledger.cgst, 2.5);
  assert.equal(ledger.sgst, 2.5);
  assert.equal(ledger.total, 105);

  assert.equal(printedInvoice.subtotal, 100);
  assert.equal(printedInvoice.tax, 5);
  assert.equal(printedInvoice.cgst, 2.5);
  assert.equal(printedInvoice.sgst, 2.5);
  assert.equal(printedInvoice.total, 105);
});

test('invoice total and GST breakdown match the customer-billed order figures', function () {
  var order = {
    id: 7001,
    date: '22/11/2026',
    customer: 'In-memory Customer',
    paymentMode: 'cash',
    status: 'completed',
    coupon: '',
    items: [
      { id: 1, sku: 'RICE-1', name: 'Rice', hsn: '1006', price: 100, qty: 1 }
    ],
    subtotal: 100,
    discount: 0,
    tax: 5,
    total: 105
  };

  var figures = invoice.computeInvoiceFigures(order);

  assert.equal(figures.subtotal, order.subtotal);
  assert.equal(figures.discount, order.discount);
  assert.equal(figures.tax, order.tax);
  assert.equal(figures.cgst, 2.5);
  assert.equal(figures.sgst, 2.5);
  assert.equal(figures.total, order.total);
});

test('CURRENT BEHAVIOUR: explicit line gstRate overrides the HSN slab in both calculations', function () {
  var items = [
    { id: 1, name: 'Rice', sku: 'GRN-001', hsn: '1006', gstRate: 12, price: 100, qty: 1 }
  ];
  var ledger = pricing.computeTotals(items, '');
  var printedInvoice = invoice.computeInvoiceFigures({
    items: items,
    coupon: '',
    subtotal: ledger.subtotal,
    discount: ledger.discount,
    tax: ledger.tax,
    total: ledger.total
  });

  assert.equal(ledger.tax, 12);
  assert.equal(ledger.total, 112);
  assert.equal(printedInvoice.tax, 12);
  assert.equal(printedInvoice.total, 112);
});

test('SAVE10 invoice discount and GST match the customer-billed order figures', function () {
  var items = [
    { id: 1, name: 'Packaged tea', sku: 'BEV-001', hsn: '0902', price: 600, qty: 1 }
  ];
  var ledger = pricing.computeTotals(items, 'SAVE10');
  var printedInvoice = invoice.computeInvoiceFigures({
    items: items,
    coupon: 'SAVE10',
    subtotal: ledger.subtotal,
    discount: ledger.discount,
    tax: ledger.tax,
    total: ledger.total
  });

  assert.equal(ledger.discount, 60);
  assert.equal(ledger.tax, 97.2);
  assert.equal(ledger.total, 637.2);

  assert.equal(printedInvoice.discount, 60);
  assert.equal(printedInvoice.tax, 97.2);
  assert.equal(printedInvoice.total, 637.2);
  assert.equal(printedInvoice.tax, ledger.tax);
  assert.equal(printedInvoice.discount, ledger.discount);
});

test('invoice uses the billed totals when coupon does not meet the ledger minimum', function () {
  var items = [
    { id: 2, name: 'Staples', sku: 'GRN-002', hsn: '0713', price: 200, qty: 1 }
  ];
  var ledger = pricing.computeTotals(items, 'SAVE10');
  var printedInvoice = invoice.computeInvoiceFigures({
    items: items,
    coupon: 'SAVE10',
    subtotal: ledger.subtotal,
    discount: ledger.discount,
    tax: ledger.tax,
    total: ledger.total
  });

  assert.equal(ledger.discount, 0);
  assert.equal(ledger.tax, 10);
  assert.equal(ledger.total, 210);

  assert.equal(printedInvoice.discount, 0);
  assert.equal(printedInvoice.tax, 10);
  assert.equal(printedInvoice.total, 210);
});

test('rendered invoice displays customer-billed total without a mismatch notice', function () {
  var order = {
    id: 123,
    date: '01/01/2026',
    customer: 'Test Customer',
    paymentMode: 'cash',
    status: 'completed',
    coupon: '',
    items: [
      { id: 1, name: 'Rice', sku: 'GRN-001', hsn: '1006', price: 100, qty: 1 }
    ],
    total: 105
  };

  var html = invoice.render(order);

  assert.match(html, /Invoice Total<\/td><td class="r">₹105\.00/);
  assert.doesNotMatch(html, /Accountant Reconciliation Notice/);
});
