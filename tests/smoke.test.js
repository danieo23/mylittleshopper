/**
 * Smoke tests for mylilshopper pure functions.
 * Uses Node 18's built-in test runner — no additional dependencies.
 * Run with: npm test
 *
 * Imports only lib/agent-utils.js which has zero I/O dependencies,
 * so no Supabase URL or API keys are required.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseBudget,
  hexToBucket,
  parseRequestSlots,
  researchOccasion,
  buildShoppingBoard,
  SLOT_DEFS,
} from '../lib/agent-utils.js';

// ── parseBudget ───────────────────────────────────────────────────────

describe('parseBudget', () => {
  test('extracts explicit dollar amount', () => {
    assert.equal(parseBudget('I have a budget of $150'), 150);
    assert.equal(parseBudget('under $200 please'), 200);
    assert.equal(parseBudget('max $250'), 250);
    assert.equal(parseBudget('around $300'), 300);
    assert.equal(parseBudget('no more than $175'), 175);
  });

  test('handles plain number formats', () => {
    assert.equal(parseBudget('250 more or less'), 250);
    assert.equal(parseBudget('100 dollars'), 100);
    assert.equal(parseBudget('50 bucks'), 50);
  });

  test('returns null when no budget is stated', () => {
    assert.equal(parseBudget('find me a rooftop dinner fit'), null);
    assert.equal(parseBudget('I need some summer clothes'), null);
    assert.equal(parseBudget(''), null);
    assert.equal(parseBudget(null), null);
  });

  test('ignores numbers too small to be a budget', () => {
    assert.equal(parseBudget('size 10 shoe'), null);
    assert.equal(parseBudget('2 graphic tees'), null);
  });
});

// ── hexToBucket ───────────────────────────────────────────────────────

describe('hexToBucket', () => {
  test('maps pure black', () => {
    assert.equal(hexToBucket('#000000'), 'black');
    assert.equal(hexToBucket('#111111'), 'black');
  });

  test('maps pure white', () => {
    assert.equal(hexToBucket('#ffffff'), 'white');
    assert.equal(hexToBucket('#fafafa'), 'white');
  });

  test('maps navy hex', () => {
    assert.equal(hexToBucket('#0a3570'), 'navy');
    assert.equal(hexToBucket('#1a237e'), 'navy');
  });

  test('maps earth-tone hex to camel/tan/beige', () => {
    const result = hexToBucket('#d2b48c');  // classic CSS tan
    assert.ok(['camel', 'tan', 'beige'].includes(result), `Expected camel/tan/beige, got ${result}`);
  });

  test('returns null for bad input', () => {
    assert.equal(hexToBucket(null), null);
    assert.equal(hexToBucket(undefined), null);
    assert.equal(hexToBucket(''), null);
  });
});

// ── parseRequestSlots ─────────────────────────────────────────────────

describe('parseRequestSlots', () => {
  test('returns empty for vague/open requests', () => {
    assert.deepEqual(parseRequestSlots('find me a rooftop dinner fit'), []);
    assert.deepEqual(parseRequestSlots('I need summer clothes'), []);
    assert.deepEqual(parseRequestSlots('something nice to wear'), []);
  });

  test('parses specific top types', () => {
    const slots = parseRequestSlots('I want a graphic tee and a button-down shirt');
    assert.ok(slots.length >= 2, `Expected ≥2 slots, got ${slots.length}`);
    assert.ok(slots.every(s => s.category === 'tops'), `All should be tops: ${JSON.stringify(slots.map(s => s.category))}`);
  });

  test('parses bottom types', () => {
    const slots = parseRequestSlots('cargo pants and baggy jeans');
    assert.ok(slots.length >= 2);
    assert.ok(slots.every(s => s.category === 'bottoms'));
  });

  test('parses shoes', () => {
    const slots = parseRequestSlots('show me some sneakers');
    assert.ok(slots.some(s => s.category === 'shoes'));
  });

  test('parses outerwear', () => {
    const slots = parseRequestSlots('I need a hoodie');
    assert.ok(slots.some(s => s.category === 'outerwear'));
  });

  test('numeric count creates multiple slots of same type', () => {
    const slots = parseRequestSlots('2 graphic tees');
    const topSlots = slots.filter(s => s.category === 'tops');
    assert.ok(topSlots.length >= 2, `Expected ≥2 top slots, got ${topSlots.length}`);
  });

  test('each slot has required fields', () => {
    const slots = parseRequestSlots('a flannel and some sneakers');
    for (const s of slots) {
      assert.ok(s.id,       `Slot missing id`);
      assert.ok(s.category, `Slot missing category`);
      assert.ok(s.label,    `Slot missing label`);
    }
  });
});

// ── researchOccasion ──────────────────────────────────────────────────

describe('researchOccasion', () => {
  test('returns brief for rooftop dinner', () => {
    const brief = researchOccasion('find me a rooftop dinner fit');
    assert.ok(brief,                        'Expected a brief');
    assert.ok(brief.event,                  'Brief must have event');
    assert.ok(brief.dresscode,              'Brief must have dresscode');
    assert.ok(brief.formality,              'Brief must have formality');
    assert.ok(brief.typicalItems?.length,   'Brief must have typicalItems');
    assert.ok(brief.searchTerms?.length,    'Brief must have searchTerms');
  });

  test('returns null for unknown occasions', () => {
    assert.equal(researchOccasion('I need some casual clothes'), null);
    assert.equal(researchOccasion('summer clothes'), null);
    assert.equal(researchOccasion(''), null);
  });

  test('recognises wedding', () => {
    const brief = researchOccasion('what should I wear to a wedding');
    assert.ok(brief,                        'Expected a wedding brief');
    assert.ok(brief.formality >= 7,         `Wedding formality should be ≥7, got ${brief.formality}`);
  });

  test('recognises black tie with formality 10', () => {
    const brief = researchOccasion('I need a black tie look for a gala');
    assert.ok(brief);
    assert.equal(brief.formality, 10);
  });

  test('recognises music festival', () => {
    const brief = researchOccasion('going to a music festival');
    assert.ok(brief);
    assert.ok(brief.formality <= 3, `Festival should be low formality, got ${brief.formality}`);
  });
});

// ── buildShoppingBoard ────────────────────────────────────────────────

describe('buildShoppingBoard', () => {
  test('returns one outfit for empty slot list', () => {
    const result = buildShoppingBoard([], {});
    assert.ok(Array.isArray(result));
    assert.equal(result.length, 1);
    assert.equal(result[0].items.length, 0);
  });

  test('picks one product per slot when show_options is false', () => {
    const slot = { ...SLOT_DEFS.graphic_tee, id: 'tops_0', show_options: false };
    const product = { name: 'Vintage Band Tee', price: 45 };
    const result = buildShoppingBoard([slot], { tops_0: [product] });
    assert.equal(result[0].items.length, 1);
    assert.equal(result[0].items[0].product.name, 'Vintage Band Tee');
  });

  test('picks up to 4 products in show_options mode', () => {
    const slot = { ...SLOT_DEFS.sneakers, id: 'shoes_0', show_options: true };
    const products = Array.from({ length: 6 }, (_, i) => ({ name: `Sneaker ${i}`, price: 80 }));
    const result = buildShoppingBoard([slot], { shoes_0: products });
    assert.ok(result[0].items.length <= 4, `Expected ≤4, got ${result[0].items.length}`);
  });

  test('computes total_price correctly', () => {
    const slotA = { ...SLOT_DEFS.generic_top,    id: 'tops_0',    show_options: false };
    const slotB = { ...SLOT_DEFS.generic_bottom,  id: 'bottoms_0', show_options: false };
    const result = buildShoppingBoard(
      [slotA, slotB],
      { tops_0: [{ name: 'Tee', price: 40 }], bottoms_0: [{ name: 'Jeans', price: 80 }] }
    );
    assert.equal(result[0].total_price, 120);
  });

  test('deduplicates the same product across slots', () => {
    const slotA = { ...SLOT_DEFS.generic_top,  id: 'tops_0', show_options: false };
    const slotB = { ...SLOT_DEFS.graphic_tee,  id: 'tops_1', show_options: false };
    const sameProduct = { name: 'Stüssy Tee', price: 65 };
    const result = buildShoppingBoard([slotA, slotB], { tops_0: [sameProduct], tops_1: [sameProduct] });
    const names = result[0].items.map(i => i.product.name);
    assert.equal(new Set(names).size, names.length, `Duplicate found: ${names}`);
  });

  test('SLOT_DEFS covers all major clothing categories', () => {
    const categories = new Set(Object.values(SLOT_DEFS).map(d => d.category));
    for (const cat of ['tops', 'bottoms', 'shoes', 'outerwear']) {
      assert.ok(categories.has(cat), `SLOT_DEFS missing category: ${cat}`);
    }
  });
});
