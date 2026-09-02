/** 1:1 port of lib/utility/strings.dart. Copy verbatim — no rewording. */
export const Strings = {
  rupeesSign: '₹',
  onDuty: 'ON DUTY',

  // Sidebar
  sideBarHome: 'Home',
  sideBarMyWallet: 'My Wallet',
  sideBarTripHistory: 'Trip History',
  sideBarProfile: 'Profile',
  sideBarDeleteAccount: 'Delete Account',
  deleteAccountConfirm:
    'We are sorry to see you go. Are you sure you want to delete your account? This action cannot be undone, and you will lose all your data associated with the account',
  logout: 'Logout',
  deleteAccount: 'Delete Account',
  delete: 'Delete',
  areYouSureLogout: 'Are you sure you want to logout?',

  // Wallet Screen
  totalBalance: 'Total Balance',
  recentTransactions: 'Recent Transactions',

  // Trip History Screen
  tripComplete: 'Trip Complete',
  statusComplete: 'Complete',
  statusInProcess: 'In Process',
  recentTripHistory: 'Recent Trips History',

  // Dashboard Screen
  kg: 'KG',
  truckNumber: 'Truck Number',
  lrNumber: 'LR Number',
  tripInProcess: 'Trip in process',
  accepted: 'ACCEPTED',
  deliverAll: 'DELIVER ALL',
  acceptTrip: 'Accept Trip',
  noTripAssigned: 'No Trip\nAssigned',

  // Login Screen
  loginWelcomeMessage: 'Welcome to BST',
  loginEnterMobile: 'Enter your mobile number to\ncontinue driver app.',
  mobileValidation: 'Please enter your 10 digit mobile number',
  login: 'LOG IN',
  commonCountryCode: '91',

  // OTP Screen
  verify: 'VERIFY',
  verifyMobile: 'Verify Mobile number',
  oneTimeString: 'One Time password (OTP) has been sent to ',
  pleaseEnterOtp: 'Please enter OTP',
  pleaseEnterCompleteOtp: 'Please enter complete OTP',
  resendOTPText: 'Resend OTP in ',
  resendOTP: 'Resend OTP',

  // Profile Screen
  mobileNumber: 'Mobile Number',
  aadharNumber: 'Aadhar Number',
  panNumber: 'Pan Number',

  // Notification Screen
  notification: 'Notifications',
  clearAll: 'CLEAR ALL',

  // Trip Details Screen
  acceptTripDesc: 'Accept this trip to continue working on the order',
  pickupOrder: 'Pickup order',
  pickupOrderDesc: 'Please reach the destination to continue the order',
  inTransit: 'In Transit',
  inTransitDesc:
    'Please confirm the loaded material and mark it as in transit.',
  inTransitDesc2:
    'On arrival at the delivery location, update the status to delivered',
  successfullyDelivered: 'Successfully delivered',
  successfullyDeliveredDesc: 'Order has beed successfully delivered.',
  // "Know more" sheet — the fuller explanation behind each status banner.
  knowMore: 'Know More',
  knowMoreAcceptTitle: 'Accept this trip',
  knowMoreAcceptBody:
    'This trip has been assigned to you. Review the pickup address, product and weight, then tap ACCEPT to take it on, or DECLINE to send it back to the office.\n\nOnce accepted, the trip stays on your dashboard until it is delivered.',
  knowMorePickupTitle: 'Reach the pickup point',
  knowMorePickupBody:
    'Drive to the pickup address shown under Order Details. Tap GET DIRECTION for turn-by-turn navigation from where you are.\n\nWhen you arrive, tap VEHICLE THERE so the office knows the vehicle is on site.',
  knowMoreLoadingTitle: 'Confirm what you loaded',
  knowMoreLoadingBody:
    'Tap CONFIRM LOADING and check every line against what actually went on the truck. Change the product, size, quantity or weight if it differs, and use Add Item for anything loaded that was not ordered.\n\nAdd the Majuri and Kataparchi charges if they apply, then confirm to mark the trip in transit.',
  knowMoreTransitTitle: 'On the way to delivery',
  knowMoreTransitBody:
    'The load is recorded and you are on the way. Upload the weight slip and invoice photos if you have not already.\n\nWhen you reach the delivery location, tap DELIVERED to close the trip.',
  knowMoreDeliveredTitle: 'Trip complete',
  knowMoreDeliveredBody:
    'This trip is delivered and counted towards your completed trips. No further action is needed.\n\nYou can still view it any time under Trip History.',
  gotIt: 'GOT IT',

  statusAccept: 'Accept',
  statusPickup: 'Pickup',
  statusInTransit: 'In Transit',
  statusDelivered: 'Delivered',
  orderDetails: 'Order Details',
  productSize: 'Product & Size',
  quantity: 'Quantity',
  weight: 'Weight',
  tempoNumber: 'Tempo Number',
  companyDetails: 'Company Details',
  name: 'Name',
  total: 'Total',
  getDirection: 'GET DIRECTION',
  viewRoute: 'View Route',
  routeUnavailable: 'No address available for this trip yet.',
  addItem: 'Add Item',
  removeItem: 'Remove item',
  extraItem: 'EXTRA ITEM',
  selectProductFirst: 'Choose a product for every added item before confirming.',
  enterWeightFirst: 'Enter a weight for every added item before confirming.',
  selectProduct: 'Select product',
  selectSize: 'Select size',
  locationPermissionDenied:
    'Location access is needed to route from where you are. Enable it in Settings to use directions.',
  vehicleThere: 'VEHICLE THERE',
  accept: 'Accept',
  decline: 'Decline',
  confirmLoading: 'CONFIRM LOADING',
  pickupLoading: 'Pickup Loading details',
  uploadPhoto: 'Upload Photo',
  weightSlip: 'WEIGHT SLIP',
  invoice: 'INVOICE',

  // Confirm Load Popup
  confirmLoad: 'Confirm Load',
  pickupLoad: 'PICKUP LOAD',
  customerLoad: 'Customer Load',
  tiles: 'Tiles',
  majuriCharge: 'Majuri Charge',
  kataparchiCharge: 'Kataparchi Charge',
  cancel: 'CANCEL',
  confirm: 'CONFIRM',
  enterAmount: 'Enter Amount',
} as const;
