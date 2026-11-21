'use strict';

var test = require('node:test');
var assert = require('node:assert/strict');
var invoice = require('../lib/invoice');
var pricing = require('../lib/pricing');
var tax = require('../lib/tax');

test('invoice totals use the same item GST slab and coupon calculation as order pricing', function () {
  var items = [{ id: 1, name: 'Rice', hsn: '1006', price: 1000, qty: 1 }];
  var priced = pricing.computeTotals(items, 'FLAT50');
  var invoiced = invoice.computeInvoiceFigures({ items: items, coupon: 'FLAT50' });

  assert.deepEqual(
    { subtotal: invoiced.subtotal, discount: invoiced.discount, tax: invoiced.tax, total: invoiced.total },
    { subtotal: priced.subtotal, discount: priced.discount, tax: priced.tax, total: priced.total }
  );
  assert.equal(invoiced.rows[0].gstPercent, priced.lines[0].gstPercent);
  assert.equal(invoiced.rows[0].lineTax, priced.lines[0].tax);
});

test('invoice and order pricing resolve the same HSN slab', function () {
  var items = [{ id: 1, name: 'Rice', hsn: '1006', price: 1000, qty: 1 }];
  var priced = pricing.computeTotals(items, '');
  var invoiced = invoice.computeInvoiceFigures({ items: items, coupon: '' });

  assert.equal(tax.getRateForItem(items[0]), 0.05);
  assert.equal(priced.tax, 50);
  assert.equal(priced.total, 1050);
  assert.equal(invoiced.tax, 50);
  assert.equal(invoiced.total, 1050);
  assert.equal(invoiced.rows[0].gstPercent, 5);
});

test('invoice applies a flat coupon to taxable value before GST', function () {
  var items = [{ id: 1, name: 'Rice', hsn: '1006', price: 1000, qty: 1 }];
  var priced = pricing.computeTotals(items, 'FLAT50');
  var invoiced = invoice.computeInvoiceFigures({ items: items, coupon: 'FLAT50' });

  assert.deepEqual(
    { subtotal: priced.subtotal, discount: priced.discount, tax: priced.tax, total: priced.total },
    { subtotal: 1000, discount: 50, tax: 47.5, total: 997.5 }
  );
  assert.deepEqual(
    { subtotal: invoiced.subtotal, discount: invoiced.discount, tax: invoiced.tax, total: invoiced.total },
    { subtotal: 1000, discount: 50, tax: 47.5, total: 997.5 }
  );
});

test('invoice percent coupon discount uses the same subtotal basis as order pricing', function () {
  var items = [{ id: 1, name: 'Tea', hsn: '0902', gstRate: 18, price: 1000, qty: 1 }];
  var priced = pricing.computeTotals(items, 'WELCOME');
  var invoiced = invoice.computeInvoiceFigures({ items: items, coupon: 'WELCOME' });

  assert.deepEqual(
    { discount: priced.discount, tax: priced.tax, total: priced.total },
    { discount: 50, tax: 171, total: 1121 }
  );
  assert.deepEqual(
    { discount: invoiced.discount, tax: invoiced.tax, total: invoiced.total },
    { discount: 50, tax: 171, total: 1121 }
  );
});

test('rendered invoice agrees with the recorded order total when calculations match', function () {
  var html = invoice.render({
    id: 7,
    date: '2026-11-21',
    items: [{ id: 1, name: 'Rice', hsn: '1006', price: 1000, qty: 1 }],
    coupon: 'FLAT50',
    total: 997.5
  });

  assert.match(html, /Invoice Total<\/td><td class="r">₹997\.50/);
  assert.doesNotMatch(html, /differs from Order Ledger recorded total/);
});
