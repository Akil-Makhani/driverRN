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
import { DocumentType, type DocumentTypeValue } from '@/core/constants/enums';
import { Strings } from '@/core/constants/strings';
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

interface TripDetailState {
  isLoading: boolean;
  /** True while a picked image is being pushed to S3. */
  isUploading: boolean;
  tripCount: number;
  tripDetailData: TripDetailsData | null;

  weightSlip: TripAttachment | null;
  invoice: TripAttachment | null;

  // ── Confirm-load sheet (was LoadViewModel) ───────────────
  requestedItems: RequestedProduct[];
  dispatchItems: DispatchedProduct[];
  majuriCharge: string;
  kataparchiCharge: string;

  clearFiles: () => void;
  getTrip: (tripId: string, products: Product[]) => Promise<void>;
  statusChanged: (tripId: string, status: string) => Promise<void>;
  updateTrip: (tripId: string) => Promise<void>;
  inTransit: (tripId: string, status: string) => Promise<void>;

  pickAndUpload: (tripId: string, documentType: DocumentTypeValue) => Promise<void>;
  removeAttachment: (documentType: DocumentTypeValue) => Promise<void>;

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
  tripCount: 0,
  tripDetailData: null,
  weightSlip: null,
  invoice: null,
  requestedItems: [],
  dispatchItems: [],
  majuriCharge: '',
  kataparchiCharge: '',

  clearFiles: () =>
    set({ weightSlip: null, invoice: null, majuriCharge: '', kataparchiCharge: '' }),

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
          weightSlip: data.weightSlips[0]
            ? fromServerAttachment(data.weightSlips[0])
            : null,
          invoice: data.invoices[0] ? fromServerAttachment(data.invoices[0]) : null,
        });
      }
    } catch (e) {
      if (__DEV__) console.log('getTrip failed:', e);
    }
    set({ isLoading: false });
  },

  async statusChanged(tripId, status) {
    set({ isLoading: true });
    try {
      const response = await DashboardRepository.statusChanged(tripId, status);
      if (isSuccess(response) && response.data) {
        set({ tripDetailData: response.data });
      }
    } catch (e) {
      if (__DEV__) console.log('statusChanged failed:', e);
    }
    set({ isLoading: false });
  },

  async updateTrip(tripId) {
    set({ isLoading: true });
    const { majuriCharge, kataparchiCharge, requestedItems, dispatchItems } = get();

    // Only send a charge the driver actually typed a number into.
    const charges: Charge[] = [];
    const majuri = Number.parseFloat(majuriCharge);
    const kataparchi = Number.parseFloat(kataparchiCharge);
    if (Number.isFinite(majuri)) {
      charges.push({ label: Strings.majuriCharge, charge: majuri });
    }
    if (Number.isFinite(kataparchi)) {
      charges.push({ label: Strings.kataparchiCharge, charge: kataparchi });
    }

    try {
      const response = await DashboardRepository.updateTrip(tripId, {
        productDifferences: { requested: requestedItems, dispatched: dispatchItems },
        charges,
      });
      if (isSuccess(response) && response.data) {
        set({ tripDetailData: response.data });
      }
    } catch (e) {
      if (__DEV__) console.log('updateTrip failed:', e);
    }
    set({ isLoading: false });
  },

  async inTransit(tripId, status) {
    const { weightSlip, invoice } = get();
    set({ isLoading: true });
    try {
      const response = await DashboardRepository.inTransit(tripId, status, {
        weightSlips: weightSlip ? [toFileDetail(weightSlip)] : [],
        invoice: invoice ? [toFileDetail(invoice)] : [],
      });
      if (isSuccess(response) && response.data) {
        set({ tripDetailData: response.data });
      }
    } catch (e) {
      if (__DEV__) console.log('inTransit failed:', e);
    }
    set({ isLoading: false });
  },

  async pickAndUpload(tripId, documentType) {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });
    if (result.canceled || result.assets.length === 0) return;

    const asset = result.assets[0];
    const fileName = asset.fileName ?? asset.uri.split('/').pop() ?? 'upload.jpg';
    const contentType = asset.mimeType ?? 'image/jpeg';
    const key = `${tripId}/${documentType}/${fileName}`;

    set({ isUploading: true });
    try {
      const signed = await DashboardRepository.uploadSignedUrl({
        fileName,
        contentType,
        documentType,
        tripId,
      });
      const uploadUrl = signed.data?.uploadUrl;
      if (!isSuccess(signed) || !uploadUrl) {
        throw new Error('No upload URL returned');
      }

      // PUT the bytes straight to S3. fetch accepts a Blob; reading the file
      // into a base64 string first (as some RN uploads do) would corrupt the
      // binary and blow up memory on a large photo.
      const blob = await (await fetch(asset.uri)).blob();
      const s3 = await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': contentType },
        body: blob,
      });
      if (!s3.ok) throw new Error(`Upload failed: ${s3.status}`);

      const attachment: TripAttachment = {
        uri: asset.uri,
        name: fileName,
        key,
        size: asset.fileSize ?? blob.size,
      };
      set(
        documentType === DocumentType.weightSlip
          ? { weightSlip: attachment }
          : { invoice: attachment },
      );
    } catch (e) {
      if (__DEV__) console.log('pickAndUpload failed:', e);
    }
    set({ isUploading: false });
  },

  async removeAttachment(documentType) {
    const isWeightSlip = documentType === DocumentType.weightSlip;
    const attachment = isWeightSlip ? get().weightSlip : get().invoice;
    if (!attachment) return;

    set({ isLoading: true });
    try {
      const response = await DashboardRepository.removeFromS3(attachment.key);
      if (isSuccess(response)) {
        set(isWeightSlip ? { weightSlip: null } : { invoice: null });
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
