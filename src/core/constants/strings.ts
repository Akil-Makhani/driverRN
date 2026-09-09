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
  // Handing an accepted order back. Only offered before Vehicle There — after
  // that the server refuses it, so the wording says so up front.
  // Sentence case: this one is a menu row, not a button.
  cancelTripMenu: 'Cancel this trip',
  moreOptions: 'More options',
  cancelTripTitle: 'Cancel this trip?',
  cancelTripBody:
    'The order goes back to all on-duty drivers and someone else can take it. '
    + 'You will not be able to cancel once you mark Vehicle There.',
  cancelTripConfirm: 'Yes, cancel',
  cancelTripDismiss: 'Keep trip',
  cancelTripFailed: 'Could not cancel this trip',
  sideBarCancelledTrips: 'Cancelled Trips',
  cancelledTripsEmpty: 'You have not cancelled any trips.',
  cancelledTripsSubtitle: 'Trips you handed back before Vehicle There',
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
  // Registration Screen. New in the RN app: the Flutter build had no
  // self-registration flow, so unlike everything above there is no
  // strings.dart counterpart these have to match.
  // Sits above the REGISTER button under LOG IN, saying who that button is for.
  registerLoginHint: 'New driver? Register first — an admin has to approve you before you can log in.',
  registerCta: 'REGISTER',
  // The register screen's own mobile step, which is separate from the login
  // field on purpose: the two screens ask for the number for different reasons.
  registerMobileTitle: 'Driver Registration',
  registerMobileSubtitle: 'Enter your mobile number to start.\nWe will send you an OTP to verify it.',
  registerMobileLabel: 'Mobile Number',
  registerSendOtp: 'SEND OTP',
  registerHaveAccount: 'Already registered? Go back and log in.',
  registerTitle: 'Driver Registration',
  registerSubtitle:
    'Fill in your details below. An admin will review them and approve your account.',
  registerDriverName: 'Driver Name',
  registerDriverNameHint: 'As printed on your licence',
  registerMobile: 'Mobile Number',
  registerMobileVerified: 'Verified with the OTP you just entered.',
  registerVehicleNumber: 'Vehicle Number',
  registerVehicleHint: 'UP32KH0320',
  registerLicenceNumber: 'Driver Licence Number',
  registerLicenceHint: 'GJ18 20220001846',
  registerDob: 'Date of Birth',
  registerDobHint: 'YYYY-MM-DD',
  registerSubmit: 'SUBMIT FOR APPROVAL',
  registerBackToLogin: 'Back to login',

  // Inline validation. These catch a typo before the round trip; ULIP
  // remains the authority on whether a number really exists.
  registerNameValidation: 'Please enter your full name',
  registerVehicleValidation: 'Enter a valid vehicle number, e.g. UP32KH0320',
  registerLicenceValidation: 'Enter a valid licence number, e.g. GJ18 20220001846',
  registerDobValidation: 'Enter your date of birth as YYYY-MM-DD',
  registerDobAgeValidation: 'A driver must be at least 18 years old',
  somethingWentWrong: 'Something went Wrong',

  // The panels that show back what the vahan / sarthi-driver lookups found.
  registerVehicleDetails: 'Vehicle Details',
  registerLicenceDetails: 'Licence Details',
  registerVerifying: 'Fetching details...',
  registerVerifyFailed: 'Could not fetch details. You can still submit.',
  registerOwner: 'Owner',
  registerModel: 'Model',
  registerVehicleClass: 'Class',
  registerFitnessUpto: 'Fitness upto',
  registerInsuranceUpto: 'Insurance upto',
  registerLicenceHolder: 'Holder',
  registerLicenceValidUpto: 'Valid upto',
  registerLicenceClasses: 'Vehicle classes',
  registerRto: 'RTO',

  // The outcome popups.
  registerRequiredTitle: 'Registration pending',
  registerRequiredMessage: 'This number has not been registered yet. Please complete your registration first — an admin will review it and approve your account.',
  registerNow: 'REGISTER NOW',
  registerWaitingTitle: 'Waiting for approval',
  registerPendingMessage: 'Your registration has been sent for approval.',
  registerWaitingMessage: 'Your registration is still being reviewed by the admin. You will be notified as soon as a decision is made.',
  registerApprovedTitle: 'Registration approved',
  registerApprovedMessage: 'Your registration has been approved. You can now log in with your mobile number.',
  registerRejectedTitle: 'Registration rejected',
  registerRejectedMessage: 'Your registration was not approved by the admin.',
  registerRejectedReasonLabel: 'Reason',
  registerExistsTitle: 'Already registered',
  registerExistsMessage: 'This vehicle or licence is already registered with us.',
  registerOk: 'OK',
  registerGoToLogin: 'GO TO LOGIN',
  registerEditAndResubmit: 'EDIT DETAILS',

  // Broadcast dispatch (new — no Flutter counterpart)
  newOrderTitle: 'NEW ORDER',
  offerPickup: 'PICKUP',
  offerDrop: 'DROP',
  offerAway: 'away',
  offerAccept: 'ACCEPT',
  offerReject: 'REJECT',
  offerExpiresIn: 'Expires in',
  offerSeconds: 's',
  offerTaken: 'Another driver took this order',
  offerExpiredNotice: 'The order expired before you answered',
  offerCancelledNotice: 'This order was cancelled',
  offerFailedNotice: 'Could not accept the order. Please try again.',
  offerWaiting: 'Confirming…',
  offerYouEarn: 'YOU EARN',
  offerFare: 'ORDER FARE',
  offerLoad: 'LOAD',
  offerMinimise: 'Dismiss for now',
  offerPending: 'NEW ORDERS',
  offerTapToOpen: 'Tap to view',

  // Live tracking
  liveTracking: 'Live Tracking',
  trackingOffline: 'Reconnecting…',
  trackingOn: 'Customer can see you live',
  trackingPermissionNeeded:
    'Background location is off, so the customer only sees you while this app is open. Enable "Allow all the time" in Settings for full tracking.',
  youAreHere: 'You',
} as const;
