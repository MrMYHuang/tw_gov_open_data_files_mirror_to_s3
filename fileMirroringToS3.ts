import AWS from 'aws-sdk';
import AdmZip from 'adm-zip';
import axios from 'axios';
import parse from 'csv-parse/lib/sync.js';
import {
  IFreeChargingItem,
  IFreeWifiItem,
} from "tfwc-data";
import { createRequire } from 'node:module';
import {
  ISourceFreeChargingItem,
  ISourceFreeWifiItem,
  getSourceFreeChargingItemErrors,
  getSourceFreeWifiItemErrors,
  mapToFreeChargingItem,
  mapToFreeWifiItem,
  isSourceFreeChargingItem,
  isSourceFreeWifiItem,
} from './SourceModels.js';
const require = createRequire(import.meta.url);
import params from './params.json';
//const params = require("./params.json");

export enum SourceDataName {
  ChargeStationList = 'charge_station_list',
  HotspotList = 'hotspotlist',
}

const data = [
  { name: SourceDataName.ChargeStationList, url: 'https://itaiwan.gov.tw/ITaiwanDW/GetFile?fileName=charge_station_list.csv&type=6', isZip: false },
  { name: SourceDataName.HotspotList, url: 'https://itaiwan.gov.tw/ITaiwanDW/GetFile?fileName=hotspotlist_tw.csv&type=6', isZip: false },
];

export default data;

const s3bucket = new AWS.S3({
  accessKeyId: params.IAM_USER_KEY,
  secretAccessKey: params.IAM_USER_SECRET
});

type NormalizedSourceData = Array<ISourceFreeChargingItem> | Array<ISourceFreeWifiItem>;
type TargetData = Array<IFreeChargingItem> | Array<IFreeWifiItem>;

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
  if (!isSourceDataName(name)) {
    throw new Error(`Unsupported source name: ${name}`);
  }

  const downloadData = await downloadSource(url);
  const csvText = Buffer.from(downloadData).toString('utf8');
  const parsedData = parse(csvText, {
    bom: true,
    columns: true,
    skip_empty_lines: true,
    trim: true,
  }) as Array<Record<string, unknown>>;
  const normalizedSourceData = normalizeSourceData(name, parsedData);
  await validateDownloadData(name, normalizedSourceData);
  const mappedData = mapToTargetData(name, normalizedSourceData);
  return convertRowsToCsv(mappedData);
}

function isSourceDataName(name: string): name is SourceDataName {
  return name === SourceDataName.ChargeStationList || name === SourceDataName.HotspotList;
}

function normalizeSourceData(
  name: SourceDataName,
  downloadData: Array<Record<string, unknown>>,
): NormalizedSourceData {
  if (name === SourceDataName.ChargeStationList) {
    return downloadData.map((item) => ({
      ...item,
      緯度: normalizeCoordinate(item.緯度),
      經度: normalizeCoordinate(item.經度),
    })) as Array<ISourceFreeChargingItem>;
  }

  return downloadData.map((item) => ({
    ...item,
    Latitude: normalizeCoordinate(item.Latitude),
    Longitude: normalizeCoordinate(item.Longitude),
  })) as Array<ISourceFreeWifiItem>;
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

function mapToTargetData(name: SourceDataName, downloadData: NormalizedSourceData): TargetData {
  if (name === SourceDataName.ChargeStationList) {
    return (downloadData as Array<ISourceFreeChargingItem>).map(mapToFreeChargingItem);
  }

  return (downloadData as Array<ISourceFreeWifiItem>).map(mapToFreeWifiItem);
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

async function validateDownloadData(name: SourceDataName, downloadData: NormalizedSourceData) {
  if (!Array.isArray(downloadData) || downloadData.length === 0) {
    throw new Error(`Downloaded data is empty for ${name}`);
  }

  const validator =
    name === SourceDataName.ChargeStationList ? isSourceFreeChargingItem : isSourceFreeWifiItem;
  const getErrors =
    name === SourceDataName.ChargeStationList
      ? getSourceFreeChargingItemErrors
      : getSourceFreeWifiItemErrors;

  const firstItem = downloadData[0];
  if (!validator(firstItem)) {
    const errorText = getErrors()
      ?.map((error) => `${error.instancePath || '/'} ${error.message}`)
      .join('; ');
    await dispatchWorkflowOnValidationError(name, errorText);
    throw new Error(`Schema check failed for ${name} at row 1${errorText ? `: ${errorText}` : ''}`);
  }
}

async function dispatchWorkflowOnValidationError(name: SourceDataName, errorText?: string) {
  const token = params.GITHUB_TOKEN;
  const owner = params.GITHUB_OWNER;
  const repo = params.GITHUB_REPO;
  const workflowFile = params.GITHUB_WORKFLOW_FILE;
  const ref = "main";

  if (!token || !owner || !repo || !workflowFile) {
    console.warn(
      "Skipping workflow dispatch. Required params: GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO, GITHUB_WORKFLOW_FILE.",
    );
    return;
  }

  const response = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/actions/workflows/${workflowFile}/dispatches`,
    {
      method: "POST",
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        ref,
        inputs: {
          source_name: name,
          error_message: errorText ?? "",
        },
      }),
    },
  );

  if (!response.ok) {
    const body = await response.text();
    console.warn(`Workflow dispatch failed with ${response.status}: ${body}`);
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
