import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatDistance,
  formatHeight,
  formatTemperature,
  formatWind,
  parseCoordinates,
  weatherSymbol,
} from '../src/lib/format.js';

test('nautical distance and wind conversions use 1.852 exactly', () => {
  assert.equal(formatDistance(12.4, 'double'), '12,4 km / 6,7 NM');
  assert.equal(formatDistance(12.4, 'nautical'), '6,7 NM');
  assert.equal(formatWind(24, 'double'), '24 km/h · 13 kn');
  assert.equal(formatWind(24, 'nautical'), '13 kn');
});

test('missing environmental values remain unavailable instead of becoming zero', () => {
  assert.equal(formatTemperature(null), '—');
  assert.equal(formatHeight(null), '—');
  assert.equal(weatherSymbol(null), '—');
});

test('GPS input accepts signed decimal coordinates and rejects out-of-range values', () => {
  assert.deepEqual(parseCoordinates('44.8378, -0.5792'), { latitude: 44.8378, longitude: -0.5792 });
  assert.deepEqual(parseCoordinates('48,8566; 2,3522'), { latitude: 48.8566, longitude: 2.3522 });
  assert.equal(parseCoordinates('194, 2'), null);
});
