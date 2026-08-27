/**
 * Port of lib/screens/trip_detail/subview/{pickup_loading_detail,
 * upload_button_image_view}.dart.
 *
 * Shows what was actually loaded plus the two photo slots. Both the upload and
 * the delete are only offered at statusNumber 3 (at pickup) — once the trip is
 * in transit the attachments are locked, as in the Flutter build.
 */
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { Images } from '@/core/constants/assets';
import { AppColors, Primary } from '@/core/constants/colors';
import { DocumentType, TripStatusNumber } from '@/core/constants/enums';
import { Strings } from '@/core/constants/strings';
import { Typography } from '@/core/constants/typography';
import type { TripDetailsData } from '@/types/trip';
import { ProductTable, type ProductRow } from './product-table';
import type { TripAttachment } from './trip-detail-store';

interface Props {
  details: TripDetailsData | null;
  weightSlip: TripAttachment | null;
  invoice: TripAttachment | null;
  onUpload: (documentType: string) => void;
  onDelete: (documentType: string) => void;
}

export function PickupLoadingDetail({
  details,
  weightSlip,
  invoice,
  onUpload,
  onDelete,
}: Props) {
  const dispatched = details?.productDifferences?.dispatched ?? [];
  const editable = details?.statusNumber === TripStatusNumber.pickup;

  const totalQty = dispatched.reduce((sum, p) => sum + (p.qty ?? 0), 0);
  const totalWeight = dispatched.reduce((sum, p) => sum + (p.weight ?? 0), 0);

  // A changed line reports the substituted product, not the ordered one.
  const rows: ProductRow[] = dispatched.map((p) => {
    const product = p.changeInProduct ?? p.product;
    const subItem = p.changeInSubItem ?? p.subItem;
    return {
      label: `${product?.name ?? ''}${subItem ? ` ${subItem.name ?? ''}` : ''}`,
      qty: `${Math.trunc(p.qty ?? 0)}Box`,
      weight: `${Math.trunc(p.weight ?? 0)}KG`,
    };
  });

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>{Strings.pickupLoading}</Text>

      <View style={styles.card}>
        <ProductTable
          rows={rows}
          total={{
            label: Strings.total,
            qty: `${Math.trunc(totalQty)}Box`,
            weight: `${Math.trunc(totalWeight)}KG`,
          }}
        />
      </View>

      <Text style={styles.uploadTitle}>{Strings.uploadPhoto}</Text>

      <View style={styles.uploadRow}>
        <UploadSlot
          title={Strings.weightSlip}
          attachment={weightSlip}
          editable={editable}
          onUpload={() => onUpload(DocumentType.weightSlip)}
          onDelete={() => onDelete(DocumentType.weightSlip)}
        />
        <View style={styles.uploadGap} />
        <UploadSlot
          title={Strings.invoice}
          attachment={invoice}
          editable={editable}
          onUpload={() => onUpload(DocumentType.invoice)}
          onDelete={() => onDelete(DocumentType.invoice)}
        />
      </View>
    </View>
  );
}

function UploadSlot({
  title,
  attachment,
  editable,
  onUpload,
  onDelete,
}: {
  title: string;
  attachment: TripAttachment | null;
  editable: boolean;
  onUpload: () => void;
  onDelete: () => void;
}) {
  return (
    <View style={styles.slot}>
      <Pressable
        onPress={onUpload}
        // Only one photo per slot: the button is inert once filled.
        disabled={attachment != null || !editable}
        style={[styles.uploadButton, attachment != null && styles.uploadButtonFilled]}
      >
        <Text style={styles.uploadButtonText}>{title}</Text>
      </Pressable>

      {attachment && (
        <View style={styles.preview}>
          <Image source={{ uri: attachment.uri }} style={styles.previewImage} />
          {editable && (
            <Pressable onPress={onDelete} style={styles.deleteButton} hitSlop={8}>
              <Image source={Images.imageDelete} style={styles.deleteIcon} />
            </Pressable>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 15 },
  sectionTitle: { ...Typography.body1.extraBold, color: AppColors.text },
  card: {
    marginTop: 10,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: Primary.c300,
    overflow: 'hidden',
  },
  uploadTitle: {
    ...Typography.body1.extraBold,
    color: AppColors.text,
    marginTop: 10,
  },
  uploadRow: { flexDirection: 'row', marginTop: 10, paddingVertical: 5 },
  uploadGap: { width: 16 },
  slot: { flex: 1 },
  uploadButton: {
    paddingVertical: 10,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: Primary.c300,
    alignItems: 'center',
  },
  uploadButtonFilled: { opacity: 0.5 },
  uploadButtonText: { ...Typography.button2.extraBold, color: AppColors.primary },
  preview: { marginTop: 10, width: 100, height: 100 },
  previewImage: {
    width: 100,
    height: 100,
    borderRadius: 12,
    backgroundColor: '#E0E0E0',
    resizeMode: 'cover',
  },
  deleteButton: {
    position: 'absolute',
    top: 35,
    left: 35,
    padding: 8,
  },
  deleteIcon: { width: 30, height: 30, resizeMode: 'contain' },
});
