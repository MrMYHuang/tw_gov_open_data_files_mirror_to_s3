import assert from 'node:assert/strict';
import test from 'node:test';
import parse from 'csv-parse/lib/sync.js';

import data, { buildMappedCsvData } from './fileMirroringToS3.js';

test('buildMappedCsvData maps charge_station_list with network call', async () => {
  const chargeStation = data.find((item) => item.name === 'charge_station_list');
  assert.ok(chargeStation);
  const mappedCsvData = await buildMappedCsvData('charge_station_list', chargeStation.url);
  assert.ok(mappedCsvData.length > 0);

  const parsedData = parse(mappedCsvData, {
    bom: true,
    columns: true,
    skip_empty_lines: true,
    trim: true,
  }) as Array<Record<string, unknown>>;

  assert.ok(parsedData.length > 0);
  const first = parsedData[0];
  assert.equal(typeof first.主管機關, 'string');
  assert.equal(typeof first.地區, 'string');
  assert.equal(typeof first.充電站名稱, 'string');
  assert.equal(typeof first.地址, 'string');
  assert.ok(Number.isFinite(Number(first.緯度)));
  assert.ok(Number.isFinite(Number(first.經度)));
});

test('buildMappedCsvData maps hotspotlist with network call', async () => {
  const hotspotList = data.find((item) => item.name === 'hotspotlist');
  assert.ok(hotspotList);
  const mappedCsvData = await buildMappedCsvData('hotspotlist', hotspotList.url);
  assert.ok(mappedCsvData.length > 0);

  const parsedData = parse(mappedCsvData, {
    bom: true,
    columns: true,
    skip_empty_lines: true,
    trim: true,
  }) as Array<Record<string, unknown>>;

  assert.ok(parsedData.length > 0);
  const first = parsedData[0];
  assert.equal(typeof first.主管機關, 'string');
  assert.equal(typeof first.地區, 'string');
  assert.equal(typeof first.機關, 'string');
  assert.equal(typeof first.熱點名稱, 'string');
  assert.equal(typeof first.地址, 'string');
  assert.equal(typeof first.管理單位, 'string');
  assert.ok(Number.isFinite(Number(first.緯度)));
  assert.ok(Number.isFinite(Number(first.經度)));
});
