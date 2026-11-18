/**
 * Port of lib/screens/trip_detail/subview/{pickup_loading_detail,
 * upload_button_image_view}.dart.
 *
 * Shows what was actually loaded plus the two photo slots. Both the upload and
 * the delete are only offered at statusNumber 3 (at pickup) — once the trip is
 * in transit the attachments are locked, as in the Flutter build.
 */
import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AppColors, Primary, TextShade } from '@/core/constants/colors';
import { DocumentType, type DocumentTypeValue, TripStatusNumber } from '@/core/constants/enums';
import { Strings } from '@/core/constants/strings';
import { Typography } from '@/core/constants/typography';
import type { TripDetailsData } from '@/types/trip';
import { openPhotoViewer } from './photo-viewer';
import { ProductTable, type ProductRow } from './product-table';
import { MAX_PHOTOS_PER_SLOT, type TripFiles, useTripDetailStore } from './trip-detail-store';

interface Props {
  details: TripDetailsData | null;
  files: TripFiles;
  onUpload: (documentType: string) => void;
  onDelete: (documentType: string, key: string) => void;
}

export function PickupLoadingDetail({ details, files, onUpload, onDelete }: Props) {
  const dispatched = details?.productDifferences?.dispatched ?? [];
  // A tempo load's photos were required at Confirm Load and went to the
  // office with it, so here they are only shown. A truck trip still adds its
  // weight slip and invoice at the pickup, as before.
  const isTempo = details?.orderKind === 'tempo';
  const editable = !isTempo && details?.statusNumber === TripStatusNumber.pickup;
  const uploading = useTripDetailStore((s) => s.uploading);

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

  const slots: { type: DocumentTypeValue; label: string }[] = isTempo
    ? [
        { type: DocumentType.loadingImage, label: Strings.loadingPhoto },
        { type: DocumentType.weightSlip, label: Strings.weightSlipPhoto },
        { type: DocumentType.invoice, label: Strings.companyInvoicePhoto },
      ]
    : [
        { type: DocumentType.weightSlip, label: Strings.weightSlip },
        { type: DocumentType.invoice, label: Strings.invoice },
      ];

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

      {slots.map((slot) => {
        const list = files[slot.type];
        const canAdd = editable && list.length < MAX_PHOTOS_PER_SLOT;
        return (
          <View key={slot.type} style={styles.slot}>
            <Text style={styles.slotLabel}>
              {slot.label}
              {list.length ? <Text style={styles.slotCount}>  ·  {list.length}</Text> : null}
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.strip}>
              {list.map((photo, i) => (
                <View key={photo.key} style={styles.photoBox}>
                  <Pressable onPress={() => openPhotoViewer(slot.label, list, i)}>
                    <Image source={{ uri: photo.uri }} style={styles.photo} />
                  </Pressable>
                  {editable ? (
                    <Pressable
                      onPress={() => onDelete(slot.type, photo.key)}
                      style={styles.remove}
                      hitSlop={8}
                      accessibilityLabel={Strings.profilePhotoRemove}
                    >
                      <Ionicons name="close" size={14} color={AppColors.white} />
                    </Pressable>
                  ) : null}
                </View>
              ))}
              {uploading === slot.type ? (
                <View style={[styles.photo, styles.addTile]}>
                  <ActivityIndicator color={AppColors.primary} />
                </View>
              ) : canAdd ? (
                <Pressable
                  onPress={() => onUpload(slot.type)}
                  disabled={uploading != null}
                  style={[styles.photo, styles.addTile]}
                >
                  <Ionicons name="add" size={26} color={AppColors.primary} />
                  <Text style={styles.addText}>{Strings.addPhoto}</Text>
                </Pressable>
              ) : list.length === 0 ? (
                <Text style={styles.none}>—</Text>
              ) : null}
            </ScrollView>
          </View>
        );
      })}
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
  slot: { marginTop: 10 },
  slotLabel: { ...Typography.body2.extraBold, color: AppColors.text },
  slotCount: { ...Typography.body2.medium, color: TextShade.c700 },
  strip: { gap: 10, paddingTop: 6, paddingRight: 8 },
  photoBox: { paddingTop: 6, paddingRight: 6 },
  photo: { width: 84, height: 84, borderRadius: 12, backgroundColor: '#E0E0E0' },
  remove: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: AppColors.error500,
    borderWidth: 2,
    borderColor: AppColors.white,
  },
  addTile: {
    marginTop: 6,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: Primary.c300,
    backgroundColor: Primary.c100,
  },
  addText: { ...Typography.caption.regular, color: AppColors.primary, marginTop: 2 },
  none: { ...Typography.body2.medium, color: TextShade.c500, paddingVertical: 8 },
});
