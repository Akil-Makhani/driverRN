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
  // Sits above the form when it opens carrying a rejected registration's
  // details. Said here rather than in a popup: the reason is worth reading
  // while the fields it is about are on screen and being corrected.
  registerRejectedBanner:
    'Your last registration was not approved. Correct the details below and submit again.',
  registerSubmit: 'SUBMIT FOR APPROVAL',
  registerBackToLogin: 'Back to login',
  // The mobile verification is good for 15 minutes, which a driver waiting on
  // the two ULIP lookups can outlast. Said as a step, not a failure, because
  // the app takes them straight back to the OTP with the form still filled in.
  registerVerifyExpired:
    'Your mobile verification has expired. We are sending you a new OTP — your details are saved.',

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
  // Both lookups have to succeed before the form can be sent, so a failure is
  // a step to repeat rather than something to shrug at and carry on past.
  registerVerifyFailed: 'Could not fetch details. Check what you entered, or try again.',
  registerRetryLookup: 'TRY AGAIN',
  registerConfirmVehicle:
    'We could not confirm this vehicle number yet. Check it and try again before submitting.',
  registerConfirmLicence:
    'We could not confirm this licence number and date of birth yet. Check them and try again before submitting.',
  registerConfirmBoth:
    'We could not confirm your vehicle and licence details yet. Check them and try again before submitting.',
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
  registerApprovedTitle: 'Registration approved',
  registerApprovedMessage: 'Your registration has been approved. You can now log in with your mobile number.',
  registerRejectedTitle: 'Registration rejected',
  registerRejectedMessage: 'Your registration was not approved by the admin.',
  registerRejectedReasonLabel: 'Reason',
  // The form was refused because the vehicle or licence is on someone else's
  // record. Titled as an error, not as an approval — the message under it is
  // the server's, and says which of the two is already saved.
  registerErrorTitle: 'Registration error',
  registerExistsTitle: 'Already registered',
  registerExistsMessage: 'This vehicle or licence is already registered with us.',
  registerOk: 'OK',
  registerGoToLogin: 'GO TO LOGIN',
  registerBackToLoginCta: 'BACK TO LOGIN',

  // The waiting screen. Submitting used to end at a popup and a trip back to
  // login, which left the driver holding nothing — no confirmation they could
  // return to, and a LOG IN button that would not let them in. This screen is
  // where a pending driver lives instead, and the decision arrives on it.
  pendingBody:
    'We have your details. An admin will review them and approve your account — this usually takes a few hours.',
  // The big status words, in the circle the dashboard uses for "no trip".
  pendingCircleWaiting: 'Waiting for\nApproval',
  pendingSubmittedTitle: 'What you submitted',
  pendingVehicle: 'Vehicle',
  pendingLicence: 'Licence',
  pendingSubmittedAt: 'Submitted',
  pendingNotifyNote:
    'You will get a notification as soon as a decision is made. You can close the app — we check again every time you open it.',
  pendingCheckStatus: 'CHECK STATUS',
  pendingCheckFailed: 'Could not reach the server. Check your connection and try again.',

} as const;
