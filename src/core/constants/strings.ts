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
  tension: 'Tension mat lo hojayega!',
  craftedWith: 'Crafted with ❤️ in Morbi, India',

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
