import AWS from 'aws-sdk';
import AdmZip from 'adm-zip';
import axios from 'axios';
import parse from 'csv-parse/lib/sync.js';
import { FreeChargingItem, FreeWifiItem } from "tfwc-data";
import { createRequire } from 'node:module';
import {
  getSourceFreeChargingItemErrors,
  getSourceFreeWifiItemErrors,
  isSourceFreeChargingItem,
  isSourceFreeWifiItem,
} from './SourceModels.js';
const require = createRequire(import.meta.url);
const params = require("./params.json");

const data = [
  { name: 'charge_station_list', url: 'https://itaiwan.gov.tw/ITaiwanDW/GetFile?fileName=charge_station_list.csv&type=6', isZip: false },
  { name: 'hotspotlist', url: 'https://itaiwan.gov.tw/ITaiwanDW/GetFile?fileName=hotspotlist_tw.csv&type=6', isZip: false },
];

export default data;

const s3bucket = new AWS.S3({
  accessKeyId: params.IAM_USER_KEY,
  secretAccessKey: params.IAM_USER_SECRET
});

export async function fileMirroringToS3() {
  for (let i = 0; i < data.length; i++) {
    try {
      const datum = data[i];
      const zipBuffer = await createZipBuffer(datum.name, datum.url);
      await uploadObjectToS3Bucket(`${datum.name}.zip`, zipBuffer);
      console.log(`File mirroring success!`);
    } catch (err) {
      console.error(`File mirroring failed: ` + err);
    }
  }
}

async function createZipBuffer(name: string, url: string) {
  const mappedCsvData = await buildMappedCsvData(name, url);

  const zip = new AdmZip();
  zip.addFile(name, Buffer.from(mappedCsvData, 'utf8'));
  return zip.toBuffer();
}

export async function buildMappedCsvData(name: string, url: string) {
  const downloadData = await downloadSource(url);
  const csvText = Buffer.from(downloadData).toString('utf8');
  const parsedData = parse(csvText, {
    bom: true,
    columns: true,
    skip_empty_lines: true,
    trim: true,
  }) as Array<Record<string, unknown>>;
  const normalizedSourceData = normalizeSourceData(name, parsedData);
  validateDownloadData(name, normalizedSourceData);
  const mappedData = mapToTargetData(name, normalizedSourceData);
  return convertRowsToCsv(mappedData);
}

function normalizeSourceData(name: string, downloadData: Array<Record<string, unknown>>) {
  if (name === "charge_station_list") {
    return downloadData.map((item) => ({
      ...item,
      緯度: normalizeCoordinate(item.緯度),
      經度: normalizeCoordinate(item.經度),
    }));
  }

  if (name === "hotspotlist") {
    return downloadData.map((item) => ({
      ...item,
      Latitude: normalizeCoordinate(item.Latitude),
      Longitude: normalizeCoordinate(item.Longitude),
    }));
  }

  return downloadData;
}

function normalizeCoordinate(value: unknown) {
  if (typeof value === "number") {
    return value;
  }
  if (typeof value === "string") {
    const numericValue = Number(value);
    return Number.isFinite(numericValue) ? numericValue : value;
  }
  return value;
}

function mapToTargetData(name: string, downloadData: Array<Record<string, unknown>>) {
  if (name === 'charge_station_list') {
    return downloadData.map((item) => new FreeChargingItem(item));
  }

  return downloadData.map((item) => new FreeWifiItem(item));
}

function convertRowsToCsv(rows: Array<object>) {
  if (rows.length === 0) {
    return '';
  }

  const headers = Object.keys(rows[0]);
  const escapeCell = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`;
  const lines = rows.map((row) => {
    const record = row as Record<string, unknown>;
    return headers.map((header) => escapeCell(record[header])).join(',');
  });
  return [headers.join(','), ...lines].join('\n');
}

export async function downloadSource(url: string) {
  const res = await axios.get(url, { responseType: 'arraybuffer' });
  if (res.status == 200) {
    return res.data;
  } else {
    throw `Download source error: ${res.statusText}`;
  }
}

function validateDownloadData(name: string, downloadData: Array<Record<string, unknown>>) {
  if (!Array.isArray(downloadData) || downloadData.length === 0) {
    throw new Error(`Downloaded data is empty for ${name}`);
  }

  const validator = name === 'charge_station_list' ? isSourceFreeChargingItem : isSourceFreeWifiItem;
  const getErrors =
    name === 'charge_station_list' ? getSourceFreeChargingItemErrors : getSourceFreeWifiItemErrors;

  const firstItem = downloadData[0];
  if (!validator(firstItem)) {
    const errorText = getErrors()
      ?.map((error) => `${error.instancePath || '/'} ${error.message}`)
      .join('; ');
    throw new Error(
      `Schema check failed for ${name} at row 1${errorText ? `: ${errorText}` : ''}`,
    );
  }
}

async function uploadObjectToS3Bucket(objectName: string, objectData: any) {
  return new Promise<void>((ok, fail) => {
    const s3params: AWS.S3.PutObjectRequest = {
      Bucket: params.BUCKET_NAME,
      Key: objectName,
      Body: objectData,
      ACL: 'public-read'
    };
    s3bucket.upload(s3params, function (err: Error, data: { Location: any; }) {
      if (err) {
        fail(err);
        return;
      }

      ok();
    });
  });
}
