/** Port of lib/screens/trip_detail/view/trip_detail.dart. */
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, View } from 'react-native';

import { AppBar } from '@/components/app-bar';
import { OverflowMenu } from '@/components/overflow-menu';
import { AppColors, Primary } from '@/core/constants/colors';
import {
  DocumentType,
  type DocumentTypeValue,
  TripStatus,
  TripStatusNumber,
} from '@/core/constants/enums';
import { Strings } from '@/core/constants/strings';
import {
  activeDestination,
  canShowRoute,
  ensureLocationPermission,
  openRoute,
} from '@/core/utils/maps';
import { useDashboardStore } from '@/features/dashboard/dashboard-store';
import { BottomActionBar } from '@/features/trip/bottom-action-bar';
import { CancelTripDialog } from '@/features/trip/cancel-trip-dialog';
import { CompanyDetails } from '@/features/trip/company-details';
import { ConfirmLoadSheet } from '@/features/trip/confirm-load-sheet';
import { KnowMoreSheet } from '@/features/trip/know-more-sheet';
import { OrderDetails } from '@/features/trip/order-details';
import { PickupLoadingDetail } from '@/features/trip/pickup-loading-detail';
import { ShipmentStatusTracker } from '@/features/trip/shipment-status-tracker';
import { TripLiveMap } from '@/features/trip/trip-live-map';
import { TripStatusTopView } from '@/features/trip/trip-status-top-view';
import { useTripDetailStore } from '@/features/trip/trip-detail-store';

export default function TripDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [knowMoreOpen, setKnowMoreOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);

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

  /**
   * Handing an accepted trip back is offered on tempo trips only, and only
   * before Vehicle There — the server enforces the same window. Computed here
   * rather than inside the action bar because the app bar's menu needs it too.
   */
  const canCancel =
    trip?.orderKind === 'tempo' && status === TripStatusNumber.accepted;

  const changeStatus = async (next: string, goBack = false) => {
    const result = await useTripDetailStore.getState().statusChanged(id, next);
    if (!result.ok) {
      // Mostly the cancel-after-Vehicle-There refusal, which carries a
      // sentence written for the driver; keep them on the trip either way.
      Alert.alert(Strings.cancelTripFailed, result.message);
      return;
    }
    // The dashboard refetches on focus, so a decline can just pop.
    if (goBack) router.back();
  };

  /**
   * Handing back a trip the driver already accepted. Offered only on tempo
   * trips and only before Vehicle There — the server enforces the same window,
   * this just stops the driver reaching for a button that would be refused.
   */
  const confirmCancel = () => {
    setCancelOpen(false);
    void changeStatus(TripStatus.rejected, true);
  };

  // Routes from the driver's current location to wherever the trip is headed
  // next. The API sends address components rather than coordinates, so the
  // link is built from text and geocoded by Maps.
  // Permission is normally granted at the On Duty toggle; asking again here
  // covers a refusal or revocation. Routing proceeds regardless.
  const openDirections = () => {
    void (async () => {
      await ensureLocationPermission();
      await openRoute(activeDestination(trip));
    })();
  };

  return (
    <View style={styles.screen}>
      <AppBar
        title={`Trip: ${String(tripCount).padStart(2, '0')}`}
        leading="back"
        onLeadingPress={() => router.back()}
        variant="white"
        centerTitle={false}
        actions={
          canCancel ? (
            <OverflowMenu
              accessibilityLabel={Strings.moreOptions}
              items={[
                {
                  title: Strings.cancelTripMenu,
                  icon: 'close-circle-outline',
                  destructive: true,
                  onPress: () => setCancelOpen(true),
                },
              ]}
            />
          ) : undefined
        }
      />

      {isLoading && trip == null ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={AppColors.primary} />
        </View>
      ) : (
        <>
          <ScrollView contentContainerStyle={styles.content}>
            <View style={styles.divider} />
            <TripStatusTopView
              status={status}
              onKnowMorePress={() => setKnowMoreOpen(true)}
            />
            <ShipmentStatusTracker status={status} />

            {/* Renders itself away outside accepted…in-transit, so the trip
                screen does not need to duplicate that condition. */}
            <TripLiveMap trip={trip} />

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
            canRoute={canShowRoute(activeDestination(trip))}
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

      <CancelTripDialog
        visible={cancelOpen}
        onConfirm={confirmCancel}
        onCancel={() => setCancelOpen(false)}
      />

      <KnowMoreSheet
        visible={knowMoreOpen}
        status={status}
        isOrderLoaded={trip?.isOrderLoaded}
        onClose={() => setKnowMoreOpen(false)}
      />

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
  canRoute,
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
  canRoute: boolean;
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
      // Directions are offered whenever both ends resolve to an address.
      // Cancelling lives in the app bar's overflow menu, not here — see
      // components/overflow-menu.tsx for why it is not a button in this row.
      return (
        <BottomActionBar
          secondary={
            canRoute
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
