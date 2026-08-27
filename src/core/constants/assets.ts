/**
 * Static image map. Metro needs literal `require` paths, so every asset the
 * Flutter app referenced as "images/x.png" is registered once here and reached
 * as `Images.x` from components.
 */
export const Images = {
  avatar: require('../../../assets/images/avatar.png'),
  bstPaid: require('../../../assets/images/bst_paid.png'),
  call: require('../../../assets/images/call.png'),
  clearAll: require('../../../assets/images/clear_all.png'),
  close: require('../../../assets/images/close.png'),
  // NOTE: the Flutter tracker passed 'disable.png' for the ACTIVE node and
  // 'enable.png' for the inactive one — the filenames read backwards. Kept as
  // named here; ShipmentStatusTracker maps them to active/inactive explicitly.
  disable: require('../../../assets/images/disable.png'),
  enable: require('../../../assets/images/enable.png'),
  greenIcon: require('../../../assets/images/green_icon.png'),
  greenTruck: require('../../../assets/images/green_truck.png'),
  imageDelete: require('../../../assets/images/image_delete.png'),
  knowMore: require('../../../assets/images/know_more.png'),
  loadWeight: require('../../../assets/images/load_weight.png'),
  locationRed: require('../../../assets/images/location_red.png'),
  loginImage: require('../../../assets/images/login_image.png'),
  majuri: require('../../../assets/images/majuri.png'),
  splashLogo: require('../../../assets/images/splash_logo.png'),
  truck: require('../../../assets/images/truck.png'),
  truckImage: require('../../../assets/images/truck_image.png'),
  umbrella: require('../../../assets/images/umbrella.png'),
  wallet: require('../../../assets/images/wallet.png'),
} as const;
