import { test } from 'node:test';
import assert from 'node:assert/strict';
import { esc } from '../src/lib/html.js';

test('esc turns markup into plain text', () => {
  assert.equal(esc('<img src=x onerror="alert(1)">'), '&lt;img src=x onerror=&quot;alert(1)&quot;&gt;');
  assert.equal(esc("O'Brien & co"), 'O&#39;Brien &amp; co');
  assert.equal(esc(42), '42');
});
