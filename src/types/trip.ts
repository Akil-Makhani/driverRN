/**
 * Ports lib/screens/dashboard/model/trip_list_response.dart and
 * lib/screens/trip_detail/model/{trip_detail_model,product_response,
 * presigned_url_data,file_attachment_model,product_difference_request,
 * trip_id_model}.dart.
 *
 * Dart declared `TripState` three times (once per file); it is one type here.
 */
import { Envelope, list, num, str } from './api';

// ── Shared ───────────────────────────────────────────────────

export interface TripState {
  label?: string;
  code?: string;
  description?: string;
}

export const parseTripState = (j: any): TripState => ({
  label: str(j?.label),
  code: str(j?.code),
  description: str(j?.description),
});

export interface Address {
  contactName?: string;
  contactNumber?: string;
  companyName?: string;
  addressId?: string;
  pincode?: string;
  city?: string;
  locality?: string;
  buildingName?: string;
  landmark?: string;
  type?: string;
  id?: string;
  latitude?: string;
  longitude?: string;
}

export const parseAddress = (j: any): Address => ({
  contactName: str(j?.contactName),
  contactNumber: str(j?.contactNumber),
  companyName: str(j?.companyName),
  addressId: str(j?.addressId),
  pincode: str(j?.pincode),
  city: str(j?.city),
  locality: str(j?.locality),
  buildingName: str(j?.buildingName),
  landmark: str(j?.landmark),
  type: str(j?.type),
  id: str(j?._id),
  latitude: str(j?.latitude),
  // BUG PARITY NOTE: Dart read `json['latitude']` for longitude too, so the
  // "Get Direction" button was fed a duplicated coordinate. Reading the real
  // field here — the button only gates on both being present, and a wrong
  // longitude would send the driver to the wrong place.
  longitude: str(j?.longitude),
});

// ── Products ─────────────────────────────────────────────────

export interface Product {
  id?: string;
  name?: string;
  code?: string;
  price?: number;
  bstOfficePrice?: number;
  subItems: Product[];
}

export function parseProduct(j: any): Product {
  return {
    id: str(j?._id),
    name: str(j?.name),
    code: str(j?.code),
    price: num(j?.price),
    bstOfficePrice: num(j?.bstOfficePrice),
    subItems: list(j?.subItems, parseProduct),
  };
}

export type ProductResponse = Envelope<Product[]>;

export const parseProductResponse = (j: any): ProductResponse => ({
  status: j?.status,
  message: j?.message,
  data: j?.data ? list(j.data, parseProduct) : null,
});

/** Dart gave Product `==`/`hashCode` on id so dropdowns could match by value. */
export const sameProduct = (a?: Product | null, b?: Product | null): boolean =>
  a?.id === b?.id;

// ── Trip list (dashboard) ────────────────────────────────────

export interface TripItem {
  id?: string;
  subOrderId?: string;
  orderId?: string;
  statusNumber?: number;
  state?: TripState;
  driverTripNumber?: number;
  createdAt?: string;
  updatedAt?: string;
  pickupAddress?: string;
  totalWeight?: number;
  tempoNumber?: string;
  truckNumber?: string;
  lrNumber?: string;
}

export const parseTripItem = (j: any): TripItem => ({
  id: str(j?._id),
  subOrderId: str(j?.subOrderId),
  orderId: str(j?.orderId),
  statusNumber: num(j?.statusNumber),
  state: j?.state ? parseTripState(j.state) : undefined,
  driverTripNumber: num(j?.driverTripNumber),
  createdAt: str(j?.createdAt),
  updatedAt: str(j?.updatedAt),
  pickupAddress: str(j?.pickupAddress),
  totalWeight: num(j?.totalWeight),
  tempoNumber: str(j?.tempoNumber),
  truckNumber: str(j?.truckNumber),
  lrNumber: str(j?.lrNumber),
});

export interface TripListData {
  active: TripItem[];
  inTransit: TripItem[];
  total?: number;
  activeCount?: number;
  inTransitCount?: number;
  completedTripCount?: number;
}

export type TripListResponse = Envelope<TripListData>;

export const parseTripListResponse = (j: any): TripListResponse => ({
  status: j?.status,
  message: j?.message,
  data: j?.data
    ? {
        active: list(j.data.active, parseTripItem),
        inTransit: list(j.data.inTransit, parseTripItem),
        total: num(j.data.total),
        activeCount: num(j.data.activeCount),
        inTransitCount: num(j.data.inTransitCount),
        completedTripCount: num(j.data.completedTripCount),
      }
    : null,
});

// ── Product differences (requested vs dispatched) ────────────

export interface ProductInfo {
  productId?: string;
  code?: string;
  name?: string;
}

export const parseProductInfo = (j: any): ProductInfo => ({
  productId: str(j?.productId),
  code: str(j?.code),
  name: str(j?.name),
});

export const productInfoToJson = (p?: ProductInfo | null) =>
  p == null ? null : { productId: p.productId, code: p.code, name: p.name };

/** What the customer ordered. Read-only in the driver app. */
export interface RequestedProduct {
  product?: ProductInfo;
  subItem?: ProductInfo;
  qty?: number;
  weight?: number;
}

export const parseRequestedProduct = (j: any): RequestedProduct => ({
  product: j?.product ? parseProductInfo(j.product) : undefined,
  subItem: j?.subItem ? parseProductInfo(j.subItem) : undefined,
  qty: num(j?.qty),
  weight: num(j?.weight),
});

export const requestedProductToJson = (p: RequestedProduct) => ({
  product: productInfoToJson(p.product),
  subItem: productInfoToJson(p.subItem),
  qty: p.qty,
  weight: p.weight,
});

/**
 * What the driver actually loaded. The `changeIn*` fields carry the delta
 * against the requested line and are omitted from the payload when unset —
 * the server treats "absent" as "no change".
 *
 * `selectedProduct` / `selectedSubProduct` are UI-only: the full Product
 * objects backing the dropdowns, never sent to the server.
 */
export interface DispatchedProduct {
  product?: ProductInfo;
  subItem?: ProductInfo;
  changeInProduct?: ProductInfo;
  changeInSubItem?: ProductInfo;
  qty?: number;
  weight?: number;
  changeInQty?: number;
  changeInWeight?: number;
  selectedProduct?: Product | null;
  selectedSubProduct?: Product | null;
}

export function parseDispatchedProduct(j: any): DispatchedProduct {
  const product = j?.product ? parseProductInfo(j.product) : undefined;
  const subItem = j?.subItem ? parseProductInfo(j.subItem) : undefined;
  return {
    product,
    subItem,
    changeInProduct: j?.changeInProduct
      ? parseProductInfo(j.changeInProduct)
      : undefined,
    changeInSubItem: j?.changeInSubItem
      ? parseProductInfo(j.changeInSubItem)
      : undefined,
    qty: num(j?.qty),
    weight: num(j?.weight),
    changeInQty: num(j?.changeInQty),
    changeInWeight: num(j?.changeInWeight),
    // Seed the dropdown selections from the dispatched line so reopening the
    // sheet shows what was chosen last time.
    selectedProduct: product
      ? { id: product.productId, name: product.name, code: product.code, subItems: [] }
      : null,
    selectedSubProduct: subItem
      ? { id: subItem.productId, name: subItem.name, code: subItem.code, subItems: [] }
      : null,
  };
}

export function dispatchedProductToJson(p: DispatchedProduct) {
  return {
    product: productInfoToJson(p.product),
    subItem: productInfoToJson(p.subItem),
    ...(p.changeInProduct
      ? { changeInProduct: productInfoToJson(p.changeInProduct) }
      : {}),
    ...(p.changeInSubItem
      ? { changeInSubItem: productInfoToJson(p.changeInSubItem) }
      : {}),
    qty: p.qty,
    weight: p.weight,
    ...(p.changeInQty != null ? { changeInQty: p.changeInQty } : {}),
    ...(p.changeInWeight != null ? { changeInWeight: p.changeInWeight } : {}),
  };
}

export interface ProductDifferences {
  requested: RequestedProduct[];
  dispatched: DispatchedProduct[];
}

export const parseProductDifferences = (j: any): ProductDifferences => ({
  requested: list(j?.requested, parseRequestedProduct),
  dispatched: list(j?.dispatched, parseDispatchedProduct),
});

export interface Charge {
  label?: string;
  charge?: number;
}

/** PATCH /driver/trips/{id} body. */
export interface ProductDifferenceRequest {
  productDifferences?: ProductDifferences;
  charges?: Charge[];
}

export function productDifferenceRequestToJson(r: ProductDifferenceRequest) {
  return {
    productDifferences: r.productDifferences
      ? {
          requested: r.productDifferences.requested.map(requestedProductToJson),
          dispatched: r.productDifferences.dispatched.map(dispatchedProductToJson),
        }
      : null,
    // Dart omitted `charges` entirely when empty rather than sending [].
    ...(r.charges && r.charges.length > 0
      ? { charges: r.charges.map((c) => ({ label: c.label, charge: c.charge })) }
      : {}),
  };
}

// ── Trip detail ──────────────────────────────────────────────

export interface Attachment {
  name?: string;
  path?: string;
  size?: number;
}

export const parseAttachment = (j: any): Attachment => ({
  name: str(j?.name),
  path: str(j?.path),
  size: num(j?.size),
});

export interface Delivery {
  id?: string;
  address?: Address;
  items?: unknown[];
}

export const parseDelivery = (j: any): Delivery => ({
  id: str(j?._id),
  address: j?.address ? parseAddress(j.address) : undefined,
  items: Array.isArray(j?.items) ? j.items : [],
});

export interface HistoryCompact {
  status?: string;
  statusNumber?: number;
  remarks?: string;
  by?: string;
  at?: string;
}

export const parseHistoryCompact = (j: any): HistoryCompact => ({
  status: str(j?.status),
  statusNumber: num(j?.statusNumber),
  remarks: str(j?.remarks),
  by: str(j?.by),
  at: str(j?.at),
});

export interface TripDetailsData {
  id?: string;
  subOrderId?: string;
  orderId?: string;
  statusNumber?: number;
  state?: TripState;
  deliveries: Delivery[];
  historyCompact: HistoryCompact[];
  productDifferences?: ProductDifferences;
  createdAt?: string;
  updatedAt?: string;
  driverTripNumber?: number;
  pickupAddress?: Address;
  truckNumber?: string;
  lrNumber?: string;
  totalWeight?: number;
  tempoNumber?: string;
  isOrderLoaded?: boolean;
  weightSlips: Attachment[];
  invoices: Attachment[];
}

export type TripDetailsResponse = Envelope<TripDetailsData>;

export const parseTripDetailsResponse = (j: any): TripDetailsResponse => ({
  status: j?.status,
  message: j?.message,
  data: j?.data
    ? {
        id: str(j.data._id),
        subOrderId: str(j.data.subOrderId),
        orderId: str(j.data.orderId),
        statusNumber: num(j.data.statusNumber),
        state: j.data.state ? parseTripState(j.data.state) : undefined,
        deliveries: list(j.data.deliveries, parseDelivery),
        historyCompact: list(j.data.historyCompact, parseHistoryCompact),
        productDifferences: j.data.productDifferences
          ? parseProductDifferences(j.data.productDifferences)
          : undefined,
        createdAt: str(j.data.createdAt),
        updatedAt: str(j.data.updatedAt),
        driverTripNumber: num(j.data.driverTripNumber),
        pickupAddress: j.data.pickupAddress
          ? parseAddress(j.data.pickupAddress)
          : undefined,
        truckNumber: str(j.data.truckNumber),
        lrNumber: str(j.data.lrNumber),
        totalWeight: num(j.data.totalWeight),
        tempoNumber: str(j.data.tempoNumber),
        isOrderLoaded: j.data.isOrderLoaded === true,
        weightSlips: list(j.data.weightSlips, parseAttachment),
        invoices: list(j.data.invoices, parseAttachment),
      }
    : null,
});

// ── Upload / attachments ─────────────────────────────────────

export interface PresignedUrlData {
  uploadUrl?: string;
  fileKey?: string;
  expiresAt?: string;
}

export type PresignedUrlResponse = Envelope<PresignedUrlData>;

export const parsePresignedUrlResponse = (j: any): PresignedUrlResponse => ({
  status: j?.status,
  message: j?.message,
  data: j?.data
    ? {
        uploadUrl: str(j.data.uploadUrl),
        fileKey: str(j.data.fileKey),
        expiresAt: str(j.data.expiresAt),
      }
    : null,
});

export interface FileDetail {
  path?: string;
  name?: string;
  size?: string;
}

/**
 * Body for the in-transit PATCH. Note the asymmetry, preserved from Dart: the
 * field is read as `invoice` but SENT as `invoices` (plural).
 */
export interface FileAttachmentModel {
  weightSlips?: FileDetail[];
  invoice?: FileDetail[];
}

export const fileAttachmentToJson = (m: FileAttachmentModel) => ({
  ...(m.weightSlips ? { weightSlips: m.weightSlips } : {}),
  ...(m.invoice ? { invoices: m.invoice } : {}),
});

/** Body for POST /driver/trips/delivered-all. */
export interface TripIdModel {
  tripIds?: string[];
}
