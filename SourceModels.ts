import Ajv from "ajv";
import Type from "typebox";

const ajv = new Ajv({ allErrors: true });

export const SourceFreeChargingItemSchema = Type.Object(
  {
    主管機關: Type.String(),
    地區: Type.String(),
    充電站名稱: Type.String(),
    地址: Type.String(),
    緯度: Type.Union([Type.Number(), Type.String()]),
    經度: Type.Union([Type.Number(), Type.String()]),
  },
  { additionalProperties: false },
);

export type ISourceFreeChargingItem = Type.Static<
  typeof SourceFreeChargingItemSchema
>;

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

export type ISourceFreeWifiItem = Type.Static<typeof SourceFreeWifiItemSchema>;

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
