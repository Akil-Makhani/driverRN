/**
 * Replaces lib/screens/trip_detail/view_model/{trip_details,load}_view_model.dart.
 *
 * The Dart pair split as: TripDetailsViewModel owned the trip + attachments,
 * and it *created* a LoadViewModel to own the editable confirm-load rows. That
 * nested notifier is folded in here as `dispatchItems` + the two charge fields,
 * because a second store instance per trip buys nothing in RN and made the
 * sheet's provider wiring fragile.
 *
 * Attachments: Dart downloaded each existing attachment to a temp File just to
 * show it, then re-derived the S3 key from that temp path. Here an attachment
 * is `{ uri, name }` — a remote URL renders directly in <Image>, and the key is
 * kept explicitly rather than reverse-engineered from a filename.
 */
import { create } from 'zustand';
import * as ImagePicker from 'expo-image-picker';

import { downloadUrl } from '@/core/api/endpoints';
import { AppException } from '@/core/api/errors';
import type { DocumentTypeValue } from '@/core/constants/enums';
import { en } from '@/core/i18n/en';
import { DashboardRepository } from '@/core/services/dashboard-repository';
import { isSuccess } from '@/types/api';
import type {
  Charge,
  DispatchedProduct,
  FileDetail,
  Product,
  RequestedProduct,
  TripDetailsData,
} from '@/types/trip';

/** What a status PATCH did, so the screen can report a refusal to the driver. */
export interface StatusChangeResult {
  ok: boolean;
  message?: string;
}

/**
 * A weight slip / invoice as the screen needs it: something to render and the
 * S3 key to delete or submit. `uri` may be remote (loaded from the server) or
 * a local file:// (just picked).
 */
export interface TripAttachment {
  uri: string;
  name: string;
  /** S3 key: "<tripId>/<documentType>/<fileName>". */
  key: string;
  /** Byte length, sent as `size` in the in-transit payload. */
  size?: number;
}

/** One photo per document type; null while that slot is empty. */
export type TripFiles = Record<DocumentTypeValue, TripAttachment[]>;

/** Photos one slot can hold; enough for every side of a load. */
export const MAX_PHOTOS_PER_SLOT = 10;

const EMPTY_FILES: TripFiles = {
  loading_image: [],
  weight_slip: [],
  invoice: [],
  delivery_image: [],
  proof_of_delivery: [],
};

/** A photo to upload: a local file:// uri plus what the server needs. */
export interface PickedPhoto {
  uri: string;
  fileName?: string | null;
  mimeType?: string | null;
  fileSize?: number | null;
}

/** Where a photo comes from: the camera or the phone's gallery. */
export type PhotoSource = 'camera' | 'library';

/** Why pickAndUpload did not add a photo, so the screen can tell the driver. */
export type UploadOutcome = 'ok' | 'cancelled' | 'permission' | 'failed' | 'full';

interface TripDetailState {
  isLoading: boolean;
  /** True while a picked image is being pushed to S3. */
  isUploading: boolean;
  /** The slot whose photo is uploading right now, for its spinner. */
  uploading: DocumentTypeValue | null;
  tripCount: number;
  tripDetailData: TripDetailsData | null;

  files: TripFiles;

  // ── Confirm-load sheet (was LoadViewModel) ───────────────
  requestedItems: RequestedProduct[];
  dispatchItems: DispatchedProduct[];
  majuriCharge: string;
  kataparchiCharge: string;

  clearFiles: () => void;
  getTrip: (tripId: string, products: Product[]) => Promise<void>;
  statusChanged: (
    tripId: string,
    status: string,
    body?: Record<string, unknown>,
  ) => Promise<StatusChangeResult>;
  /** Resolves whether the server took the confirmed load. */
  updateTrip: (tripId: string) => Promise<boolean>;
  inTransit: (tripId: string, status: string) => Promise<void>;

  pickAndUpload: (
    tripId: string,
    documentType: DocumentTypeValue,
    source?: PhotoSource,
  ) => Promise<UploadOutcome>;
  /** Uploads photos chosen in the in-app gallery, one after another. */
  uploadPicked: (
    tripId: string,
    documentType: DocumentTypeValue,
    picked: PickedPhoto[],
  ) => Promise<UploadOutcome>;
  removeAttachment: (documentType: DocumentTypeValue, key: string) => Promise<void>;

  updateProduct: (index: number, product: Product | null) => void;
  updateSubItem: (index: number, product: Product | null) => void;
  updateQty: (index: number, value: number) => void;
  updateWeight: (index: number, value: number) => void;
  /** Appends a blank line for goods loaded that the customer never ordered. */
  addItem: () => void;
  /** Drops an added line. Only extra lines are removable — see isAddedItem. */
  removeItem: (index: number) => void;
  setMajuriCharge: (v: string) => void;
  setKataparchiCharge: (v: string) => void;
}

/** Attachment → the FileDetail shape the in-transit PATCH expects. */
const toFileDetail = (a: TripAttachment): FileDetail => ({
  path: a.key,
  name: a.name,
  size: a.size != null ? String(a.size) : undefined,
});

/** A slot as the list the API takes: one file, or none. */
export const asFileList = (list: TripAttachment[]): FileDetail[] => list.map(toFileDetail);

/** A server list as a slot's photos, skipping any entry without a key. */
const fromServerList = (list: { name?: string; path?: string; size?: number }[]) =>
  list.filter((a) => a.path).map(fromServerAttachment);

/** A content type from the file name, for gallery photos that carry none. */
function mimeOf(name: string): string {
  const ext = name.split('.').pop()?.toLowerCase();
  if (ext === 'png') return 'image/png';
  if (ext === 'webp') return 'image/webp';
  if (ext === 'heic' || ext === 'heif') return 'image/heic';
  return 'image/jpeg';
}

/** Signs, PUTs to S3 and returns one picked photo as an attachment. */
async function uploadOne(
  tripId: string,
  documentType: DocumentTypeValue,
  asset: PickedPhoto,
): Promise<TripAttachment> {
  // Stamped, so two photos with the same name (two "image.jpg"s from the
  // gallery) do not overwrite each other in S3.
  const original = asset.fileName ?? asset.uri.split('/').pop() ?? 'upload.jpg';
  const fileName = `${Date.now()}_${original}`;
  const contentType = asset.mimeType ?? mimeOf(original);

  const signed = await DashboardRepository.uploadSignedUrl({
    fileName,
    contentType,
    documentType,
    tripId,
  });
  const uploadUrl = signed.data?.uploadUrl;
  if (!isSuccess(signed) || !uploadUrl) throw new Error('No upload URL returned');

  // PUT the bytes straight to S3. fetch accepts a Blob; reading the file into
  // a base64 string first would corrupt the binary and blow up memory.
  const blob = await (await fetch(asset.uri)).blob();
  const s3 = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': contentType },
    body: blob,
  });
  if (!s3.ok) throw new Error(`Upload failed: ${s3.status}`);

  return {
    uri: asset.uri,
    name: fileName,
    key: signed.data?.fileKey || `${tripId}/${documentType}/${fileName}`,
    size: asset.fileSize ?? blob.size,
  };
}

/** Server attachment → renderable TripAttachment. */
function fromServerAttachment(
  a: { name?: string; path?: string; size?: number },
): TripAttachment {
  const key = a.path ?? '';
  return {
    uri: downloadUrl(key),
    name: a.name ?? key.split('/').pop() ?? '',
    key,
    size: a.size,
  };
}

export const useTripDetailStore = create<TripDetailState>((set, get) => ({
  isLoading: false,
  isUploading: false,
  uploading: null,
  tripCount: 0,
  tripDetailData: null,
  files: EMPTY_FILES,
  requestedItems: [],
  dispatchItems: [],
  majuriCharge: '',
  kataparchiCharge: '',

  clearFiles: () =>
    set({ files: EMPTY_FILES, majuriCharge: '', kataparchiCharge: '' }),

  async getTrip(tripId, products) {
    set({ isLoading: true });
    try {
      const response = await DashboardRepository.getTripDetails(tripId);
      if (isSuccess(response) && response.data) {
        const data = response.data;
        const requested = data.productDifferences?.requested ?? [];
        let dispatched = data.productDifferences?.dispatched ?? [];

        // Before the driver confirms a load, the server sends `dispatched`
        // empty. Seed one editable row per requested line, pre-selecting the
        // matching Product/sub-item so the dropdowns open on the right value.
        if (dispatched.length === 0) {
          dispatched = requested.map((r) => {
            const selectedProduct =
              products.find((p) => p.id === r.product?.productId) ?? null;
            const selectedSubProduct =
              selectedProduct?.subItems.find(
                (s) => s.id === r.subItem?.productId,
              ) ?? null;
            return {
              product: r.product,
              subItem: r.subItem,
              qty: r.qty,
              weight: r.weight,
              selectedProduct,
              selectedSubProduct,
            };
          });
        }

        set({
          tripDetailData: data,
          tripCount: data.driverTripNumber ?? 0,
          requestedItems: requested,
          dispatchItems: dispatched,
          files: {
            loading_image: fromServerList(data.loadingImages),
            weight_slip: fromServerList(data.weightSlips),
            invoice: fromServerList(data.invoices),
            delivery_image: fromServerList(data.deliveryImages),
            proof_of_delivery: fromServerList(data.proofOfDelivery),
          },
        });
      }
    } catch (e) {
      if (__DEV__) console.log('getTrip failed:', e);
    }
    set({ isLoading: false });
  },

  async statusChanged(tripId, status, body) {
    set({ isLoading: true });
    try {
      const response = await DashboardRepository.statusChanged(tripId, status, body);
      if (isSuccess(response) && response.data) {
        set({ tripDetailData: response.data });
      }
      set({ isLoading: false });
      return { ok: isSuccess(response), message: response.message };
    } catch (e) {
      if (__DEV__) console.log('statusChanged failed:', e);
      set({ isLoading: false });
      // The server refuses a cancel that arrives after Vehicle There with a
      // 409 and a sentence written for the driver. Swallowing it left the
      // screen looking like the tap did nothing, so it is handed back for the
      // caller to show.
      const message = e instanceof AppException ? e.message : undefined;
      return { ok: false, message };
    }
  },

  async updateTrip(tripId) {
    set({ isLoading: true });
    const { majuriCharge, kataparchiCharge, requestedItems, dispatchItems, files } = get();

    // Only send a charge the driver actually typed a number into. Labels are
    // saved on the trip for the office, so they stay English whatever the
    // driver's app language.
    const charges: Charge[] = [];
    const majuri = Number.parseFloat(majuriCharge);
    const kataparchi = Number.parseFloat(kataparchiCharge);
    if (Number.isFinite(majuri)) {
      charges.push({ label: en.majuriCharge, charge: majuri });
    }
    if (Number.isFinite(kataparchi)) {
      charges.push({ label: en.kataparchiCharge, charge: kataparchi });
    }

    let ok = false;
    try {
      const response = await DashboardRepository.updateTrip(tripId, {
        productDifferences: { requested: requestedItems, dispatched: dispatchItems },
        charges,
        // Confirm Loading's photos go with the load, so the office has them
        // from the moment it is confirmed.
        loadingImages: asFileList(files.loading_image),
        weightSlips: asFileList(files.weight_slip),
        invoices: asFileList(files.invoice),
      });
      if (isSuccess(response) && response.data) {
        set({ tripDetailData: response.data });
        ok = true;
      }
    } catch (e) {
      if (__DEV__) console.log('updateTrip failed:', e);
    }
    set({ isLoading: false });
    return ok;
  },

  async inTransit(tripId, status) {
    const { files } = get();
    set({ isLoading: true });
    try {
      const response = await DashboardRepository.inTransit(tripId, status, {
        weightSlips: asFileList(files.weight_slip),
        invoice: asFileList(files.invoice),
      });
      if (isSuccess(response) && response.data) {
        set({ tripDetailData: response.data });
      }
    } catch (e) {
      if (__DEV__) console.log('inTransit failed:', e);
    }
    set({ isLoading: false });
  },

  async pickAndUpload(tripId, documentType, source = 'library') {
    const permission =
      source === 'camera'
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return 'permission';

    const room = MAX_PHOTOS_PER_SLOT - get().files[documentType].length;
    if (room <= 0) return 'full';

    // A photo for the office only has to be legible; 0.6 keeps it small on a
    // weak connection at the pickup or the drop. The gallery lets the driver
    // tick several at once; the camera takes one per shot.
    const result =
      source === 'camera'
        ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.6 })
        : await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            quality: 0.6,
            allowsMultipleSelection: true,
            selectionLimit: room,
            orderedSelection: true,
          });
    if (result.canceled || result.assets.length === 0) return 'cancelled';

    return get().uploadPicked(tripId, documentType, result.assets);
  },

  async uploadPicked(tripId, documentType, picked) {
    const room = MAX_PHOTOS_PER_SLOT - get().files[documentType].length;
    if (room <= 0) return 'full';
    if (picked.length === 0) return 'cancelled';

    set({ isUploading: true, uploading: documentType });
    let failed = 0;
    // One after another: a weak signal at a pickup copes better with that
    // than with several photos fighting for it.
    for (const asset of picked.slice(0, room)) {
      try {
        const attachment = await uploadOne(tripId, documentType, asset);
        const files = get().files;
        set({ files: { ...files, [documentType]: [...files[documentType], attachment] } });
      } catch (e) {
        failed += 1;
        if (__DEV__) console.log('pickAndUpload failed:', e);
      }
    }
    set({ isUploading: false, uploading: null });
    return failed === 0 ? 'ok' : 'failed';
  },

  async removeAttachment(documentType, key) {
    const attachment = get().files[documentType].find((a) => a.key === key);
    if (!attachment) return;

    set({ isLoading: true });
    try {
      const response = await DashboardRepository.removeFromS3(attachment.key);
      if (isSuccess(response)) {
        const files = get().files;
        set({
          files: { ...files, [documentType]: files[documentType].filter((a) => a.key !== key) },
        });
      }
    } catch (e) {
      if (__DEV__) console.log('removeAttachment failed:', e);
    }
    set({ isLoading: false });
  },

  // ── Confirm-load row edits ───────────────────────────────
  // Each writes an immutable copy: mutating the row in place (as Dart did)
  // would not re-render, since the array identity would be unchanged.

  updateProduct(index, product) {
    const next = [...get().dispatchItems];
    const ref = {
      productId: product?.id,
      name: product?.name,
      code: product?.code,
    };
    next[index] = {
      ...next[index],
      selectedProduct: product,
      changeInProduct: ref,
      // A different product invalidates the chosen sub-item.
      selectedSubProduct: null,
      changeInSubItem: undefined,
    };
    // An added line has no ordered counterpart, so `product` would otherwise
    // stay empty and the API would receive a line it cannot identify.
    if (isAddedItem(index, get().requestedItems.length)) {
      next[index].product = ref;
      next[index].subItem = undefined;
    }
    set({ dispatchItems: next });
  },

  updateSubItem(index, product) {
    const next = [...get().dispatchItems];
    const ref = {
      productId: product?.id,
      name: product?.name,
      code: product?.code,
    };
    next[index] = {
      ...next[index],
      selectedSubProduct: product,
      changeInSubItem: ref,
    };
    if (isAddedItem(index, get().requestedItems.length)) {
      next[index].subItem = ref;
    }
    set({ dispatchItems: next });
  },

  updateQty(index, value) {
    const { dispatchItems, requestedItems } = get();
    const next = [...dispatchItems];
    next[index] = {
      ...next[index],
      qty: value,
      changeInQty: value - (requestedItems[index]?.qty ?? 0),
    };
    set({ dispatchItems: next });
  },

  updateWeight(index, value) {
    const { dispatchItems, requestedItems } = get();
    const next = [...dispatchItems];
    next[index] = {
      ...next[index],
      weight: value,
      changeInWeight: value - (requestedItems[index]?.weight ?? 0),
    };
    set({ dispatchItems: next });
  },

  /**
   * Adds a line for goods loaded that the customer did not order.
   *
   * Only `dispatchItems` grows. `requested` is the customer's authoritative
   * order — the API's calculateSubOrderProductDifferences builds it from the
   * sub-order and every downstream stage walks it position-for-position, while
   * the driver's PATCH does a blunt Object.assign over the stored document. So
   * appending here would overwrite that record with a line the customer never
   * ordered. The extra row lives only in `dispatched`, leaving the arrays
   * different lengths by design.
   */
  addItem() {
    set({
      dispatchItems: [
        ...get().dispatchItems,
        {
          qty: 0,
          weight: 0,
          selectedProduct: null,
          selectedSubProduct: null,
          // Nothing was ordered, so the whole amount is the difference. Kept
          // in step with qty/weight by updateQty/updateWeight.
          changeInQty: 0,
          changeInWeight: 0,
        },
      ],
    });
  },

  removeItem(index) {
    // Added rows exist only past the end of requestedItems, so removing one
    // never disturbs the customer's lines.
    set({ dispatchItems: get().dispatchItems.filter((_, i) => i !== index) });
  },

  setMajuriCharge: (v) => set({ majuriCharge: v }),
  setKataparchiCharge: (v) => set({ kataparchiCharge: v }),
}));

/**
 * True when the dispatched line at `index` was added by the driver rather than
 * coming from the customer's order. Added lines sit past the end of
 * `requestedItems`, which is never extended.
 */
export function isAddedItem(index: number, requestedCount: number): boolean {
  return index >= requestedCount;
}
