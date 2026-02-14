import Ajv from "ajv";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const Type = require("typebox");

const ajv = new Ajv({ allErrors: true });

export const SourceFreeChargingItemSchema = Type.Object(
  {
    主管機關: Type.String(),
    地區: Type.String(),
    充電站名稱: Type.String(),
    地址: Type.String(),
    緯度: Type.Number(),
    經度: Type.Number(),
  },
  { additionalProperties: false },
);

export type ISourceFreeChargingItem = {
  主管機關: string;
  地區: string;
  充電站名稱: string;
  地址: string;
  緯度: number;
  經度: number;
};

export const SourceFreeWifiItemSchema = Type.Object(
  {
    Ministry: Type.String(),
    Area: Type.String(),
    Agency: Type.String(),
    Name: Type.String(),
    Address: Type.String(),
    Administration: Type.String(),
    Latitude: Type.Union([Type.Number(), Type.String()]),
    Longitude: Type.Union([Type.Number(), Type.String()]),
  },
  { additionalProperties: false },
);

export type ISourceFreeWifiItem = {
  Ministry: string;
  Area: string;
  Agency: string;
  Name: string;
  Address: string;
  Administration: string;
  Latitude: number | string;
  Longitude: number | string;
};

const validateSourceFreeChargingItem = ajv.compile(SourceFreeChargingItemSchema);
const validateSourceFreeWifiItem = ajv.compile(SourceFreeWifiItemSchema);

export const isSourceFreeChargingItem = (
  data: unknown,
): data is ISourceFreeChargingItem => validateSourceFreeChargingItem(data);

export const isSourceFreeWifiItem = (
  data: unknown,
): data is ISourceFreeWifiItem => validateSourceFreeWifiItem(data);

export const getSourceFreeChargingItemErrors = () =>
  validateSourceFreeChargingItem.errors;

export const getSourceFreeWifiItemErrors = () =>
  validateSourceFreeWifiItem.errors;
