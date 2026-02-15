import Ajv from "ajv";
import { IFreeChargingItem, IFreeWifiItem } from "tfwc-data";
import Type from "typebox";

const ajv = new Ajv({ allErrors: true });

export const SourceFreeChargingItemSchema = Type.Object(
  {
    主管機: Type.String(),
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

export const mapToFreeChargingItem = (
  item: ISourceFreeChargingItem,
): IFreeChargingItem => ({
  主管機關: item.主管機關,
  地區: item.地區,
  充電站名稱: item.充電站名稱,
  地址: item.地址,
  緯度: typeof item.緯度 === 'string' ? +item.緯度 : item.緯度,
  經度: typeof item.經度 === 'string' ? +item.經度 : item.經度,
});

export const mapToFreeWifiItem = (item: ISourceFreeWifiItem): IFreeWifiItem => {
  const lat = +item.Latitude;
  const lng = +item.Longitude;
  return {
    主管機關: item.Ministry,
    地區: item.Area,
    機關: item.Agency,
    熱點名稱: item.Name,
    地址: item.Address,
    管理單位: item.Administration,
    緯度: Number.isFinite(lat) ? lat : 0,
    經度: Number.isFinite(lng) ? lng : 0,
  };
};
