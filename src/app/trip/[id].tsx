/** Port of lib/screens/trip_detail/view/trip_detail.dart. */
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

import { AppBar } from '@/components/app-bar';
import { AppColors, Primary } from '@/core/constants/colors';
import {
  DocumentType,
  type DocumentTypeValue,
  TripStatus,
  TripStatusNumber,
} from '@/core/constants/enums';
import { Strings } from '@/core/constants/strings';
import { useDashboardStore } from '@/features/dashboard/dashboard-store';
import { BottomActionBar } from '@/features/trip/bottom-action-bar';
import { CompanyDetails } from '@/features/trip/company-details';
import { ConfirmLoadSheet } from '@/features/trip/confirm-load-sheet';
import { OrderDetails } from '@/features/trip/order-details';
import { PickupLoadingDetail } from '@/features/trip/pickup-loading-detail';
import { ShipmentStatusTracker } from '@/features/trip/shipment-status-tracker';
import { TripStatusTopView } from '@/features/trip/trip-status-top-view';
import { useTripDetailStore } from '@/features/trip/trip-detail-store';

export default function TripDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [sheetOpen, setSheetOpen] = useState(false);

  const isLoading = useTripDetailStore((s) => s.isLoading);
  const trip = useTripDetailStore((s) => s.tripDetailData);
  const tripCount = useTripDetailStore((s) => s.tripCount);
  const weightSlip = useTripDetailStore((s) => s.weightSlip);
  const invoice = useTripDetailStore((s) => s.invoice);
  const products = useDashboardStore((s) => s.products);

  useEffect(() => {
    void useTripDetailStore.getState().getTrip(id, products);
    // Clear the previous trip's attachments and charges on unmount, matching
    // the Flutter deactivate() hook.
    return () => useTripDetailStore.getState().clearFiles();
    // Deliberately keyed on the trip id only: `products` arriving later must
    // not refetch and clobber edits in progress.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const status = trip?.statusNumber ?? TripStatusNumber.assigned;

  const changeStatus = async (next: string, goBack = false) => {
    await useTripDetailStore.getState().statusChanged(id, next);
    // The dashboard refetches on focus, so a decline can just pop.
    if (goBack) router.back();
  };

  const openDirections = () => {
    const { latitude, longitude } = trip?.pickupAddress ?? {};
    if (!latitude || !longitude) return;
    void Linking.openURL(
      `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`,
    );
  };

  return (
    <View style={styles.screen}>
      <AppBar
        title={`Trip: ${String(tripCount).padStart(2, '0')}`}
        leading="back"
        onLeadingPress={() => router.back()}
        variant="white"
        centerTitle={false}
      />

      {isLoading && trip == null ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={AppColors.primary} />
        </View>
      ) : (
        <>
          <ScrollView contentContainerStyle={styles.content}>
            <View style={styles.divider} />
            <TripStatusTopView status={status} />
            <ShipmentStatusTracker status={status} />
            <View style={styles.divider} />

            <View style={styles.section}>
              <OrderDetails details={trip} />
            </View>

            {trip?.isOrderLoaded && (
              <>
                <View style={styles.divider} />
                <View style={styles.section}>
                  <PickupLoadingDetail
                    details={trip}
                    weightSlip={weightSlip}
                    invoice={invoice}
                    onUpload={(documentType) =>
                      void useTripDetailStore
                        .getState()
                        .pickAndUpload(id, documentType as DocumentTypeValue)
                    }
                    onDelete={(documentType) =>
                      void useTripDetailStore
                        .getState()
                        .removeAttachment(documentType as DocumentTypeValue)
                    }
                  />
                </View>
              </>
            )}

            <View style={styles.divider} />
            <View style={styles.section}>
              <CompanyDetails details={trip} />
            </View>
          </ScrollView>

          <ActionBar
            status={status}
            hasCoordinates={
              trip?.pickupAddress?.latitude != null &&
              trip?.pickupAddress?.longitude != null
            }
            isOrderLoaded={trip?.isOrderLoaded ?? false}
            onDecline={() => void changeStatus(TripStatus.rejected, true)}
            onAccept={() => void changeStatus(TripStatus.accepted)}
            onDirections={openDirections}
            onVehicleThere={() => void changeStatus(TripStatus.pickup)}
            onConfirmLoading={() => setSheetOpen(true)}
            onInTransit={() =>
              void useTripDetailStore.getState().inTransit(id, TripStatus.inTransit)
            }
            onDelivered={() => void changeStatus(TripStatus.delivered)}
          />
        </>
      )}

      <ConfirmLoadSheet
        visible={sheetOpen}
        products={products}
        onCancel={() => setSheetOpen(false)}
        onConfirm={() => {
          setSheetOpen(false);
          void useTripDetailStore.getState().updateTrip(id);
        }}
      />
    </View>
  );
}

/**
 * Which actions the bottom bar offers, by trip status. Mirrors
 * setBottomViewForStatusScreen.
 */
function ActionBar({
  status,
  hasCoordinates,
  isOrderLoaded,
  onDecline,
  onAccept,
  onDirections,
  onVehicleThere,
  onConfirmLoading,
  onInTransit,
  onDelivered,
}: {
  status: number;
  hasCoordinates: boolean;
  isOrderLoaded: boolean;
  onDecline: () => void;
  onAccept: () => void;
  onDirections: () => void;
  onVehicleThere: () => void;
  onConfirmLoading: () => void;
  onInTransit: () => void;
  onDelivered: () => void;
}) {
  switch (status) {
    case TripStatusNumber.assigned:
      return (
        <BottomActionBar
          secondary={{ title: Strings.decline.toUpperCase(), onPress: onDecline }}
          primary={{ title: Strings.accept.toUpperCase(), onPress: onAccept }}
        />
      );

    case TripStatusNumber.accepted:
      // Directions are only offered when the pickup has coordinates.
      return (
        <BottomActionBar
          secondary={
            hasCoordinates
              ? { title: Strings.getDirection, onPress: onDirections }
              : undefined
          }
          primary={{ title: Strings.vehicleThere, onPress: onVehicleThere }}
        />
      );

    case TripStatusNumber.pickup:
      // Before the load is confirmed the button opens the sheet; after, it
      // submits the trip as in transit.
      return (
        <BottomActionBar
          primary={
            isOrderLoaded
              ? { title: Strings.inTransit.toUpperCase(), onPress: onInTransit }
              : { title: Strings.confirmLoading, onPress: onConfirmLoading }
          }
        />
      );

    case TripStatusNumber.inTransit:
      return (
        <BottomActionBar
          primary={{
            title: Strings.statusDelivered.toUpperCase(),
            onPress: onDelivered,
          }}
        />
      );

    default:
      // Delivered: nothing left to do.
      return null;
  }
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: AppColors.white },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { paddingVertical: 10, paddingBottom: 40 },
  divider: { height: 10, backgroundColor: Primary.c100, marginVertical: 10 },
  section: { marginVertical: 5 },
});
