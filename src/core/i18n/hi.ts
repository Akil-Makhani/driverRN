/** Hindi copy. Keys mirror en.ts; brand names, LR, OTP and KG stay as is. */
import type { Translations } from './en';

export const hi: Translations = {
  rupeesSign: '₹',
  onDuty: 'ड्यूटी पर',

  // Sidebar
  sideBarHome: 'होम',
  sideBarMyWallet: 'मेरा वॉलेट',
  sideBarTripHistory: 'ट्रिप हिस्ट्री',
  sideBarProfile: 'प्रोफ़ाइल',
  sideBarDeleteAccount: 'अकाउंट डिलीट करें',
  deleteAccountConfirm:
    'हमें आपके जाने का दुख है। क्या आप सच में अपना अकाउंट डिलीट करना चाहते हैं? यह वापस नहीं किया जा सकता, और अकाउंट से जुड़ा आपका सारा डेटा हट जाएगा।',
  logout: 'लॉगआउट',
  deleteAccount: 'अकाउंट डिलीट करें',
  delete: 'डिलीट',
  areYouSureLogout: 'क्या आप सच में लॉगआउट करना चाहते हैं?',

  // Wallet Screen
  totalBalance: 'कुल बैलेंस',
  recentTransactions: 'हाल के लेन-देन',

  // Trip History Screen
  tripComplete: 'ट्रिप पूरी',
  statusComplete: 'पूरी',
  statusInProcess: 'चालू',
  recentTripHistory: 'हाल की ट्रिप्स',

  // Dashboard Screen
  kg: 'KG',
  truckNumber: 'ट्रक नंबर',
  lrNumber: 'LR नंबर',
  tripInProcess: 'ट्रिप चालू है',
  accepted: 'स्वीकार की गई',
  vehicleThereStatus: 'गाड़ी पहुँची',
  inTransitStatus: 'रास्ते में',
  deliverAll: 'सभी डिलीवर करें',
  acceptTrip: 'ट्रिप स्वीकार करें',
  noTripAssigned: 'कोई ट्रिप\nनहीं',

  // Login Screen
  loginWelcomeMessage: 'BST में आपका स्वागत है',
  loginEnterMobile: 'ड्राइवर ऐप चलाने के लिए\nअपना मोबाइल नंबर डालें।',
  mobileValidation: 'कृपया अपना 10 अंकों का मोबाइल नंबर डालें',
  login: 'लॉग इन',
  commonCountryCode: '91',

  // OTP Screen
  verify: 'वेरिफ़ाई करें',
  verifyMobile: 'मोबाइल नंबर वेरिफ़ाई करें',
  oneTimeString: 'इस नंबर पर वन टाइम पासवर्ड (OTP) भेजा गया है: ',
  pleaseEnterOtp: 'कृपया OTP डालें',
  pleaseEnterCompleteOtp: 'कृपया पूरा OTP डालें',
  resendOTPText: 'दोबारा भेजने में ',
  resendOTP: 'OTP दोबारा भेजें',

  // Profile Screen
  mobileNumber: 'मोबाइल नंबर',
  aadharNumber: 'आधार नंबर',
  panNumber: 'पैन नंबर',

  // Notification Screen
  notification: 'सूचनाएँ',
  clearAll: 'सब हटाएँ',

  // Trip Details Screen
  acceptTripDesc: 'ऑर्डर पर काम जारी रखने के लिए यह ट्रिप स्वीकार करें',
  pickupOrder: 'पिकअप ऑर्डर',
  pickupOrderDesc: 'ऑर्डर जारी रखने के लिए पिकअप जगह पर पहुँचें',
  inTransit: 'रास्ते में',
  inTransitDesc: 'लोड किया गया माल कन्फ़र्म करें और उसे रास्ते में मार्क करें।',
  inTransitDesc2: 'डिलीवरी की जगह पहुँचने पर स्टेटस डिलीवर्ड करें',
  successfullyDelivered: 'सफलतापूर्वक डिलीवर हुआ',
  successfullyDeliveredDesc: 'ऑर्डर सफलतापूर्वक डिलीवर हो गया है।',
  knowMore: 'और जानें',
  knowMoreAcceptTitle: 'यह ट्रिप स्वीकार करें',
  knowMoreAcceptBody:
    'यह ट्रिप आपको दी गई है। पिकअप पता, माल और वज़न देखें, फिर इसे लेने के लिए स्वीकार करें दबाएँ, या ऑफ़िस को वापस भेजने के लिए मना करें दबाएँ।\n\nस्वीकार करने के बाद ट्रिप डिलीवर होने तक आपके डैशबोर्ड पर रहेगी।',
  knowMorePickupTitle: 'पिकअप जगह पर पहुँचें',
  knowMorePickupBody:
    'ऑर्डर डिटेल में दिए पिकअप पते पर जाएँ। रास्ता देखने के लिए रास्ता देखें दबाएँ।\n\nपहुँचने पर गाड़ी पहुँची दबाएँ ताकि ऑफ़िस को पता चले कि गाड़ी वहाँ है।',
  knowMoreLoadingTitle: 'लोड किया माल कन्फ़र्म करें',
  knowMoreLoadingBody:
    'लोडिंग कन्फ़र्म करें दबाएँ और हर लाइन को ट्रक पर असल में चढ़े माल से मिलाएँ। अगर माल, साइज़, मात्रा या वज़न अलग है तो बदलें, और जो माल ऑर्डर में नहीं था पर लोड हुआ उसके लिए आइटम जोड़ें इस्तेमाल करें।\n\nमजदूरी और कांटा पर्ची शुल्क हो तो जोड़ें, फिर कन्फ़र्म करके ट्रिप को रास्ते में मार्क करें।',
  knowMoreTransitTitle: 'डिलीवरी के रास्ते पर',
  knowMoreTransitBody:
    'लोड दर्ज हो गया है और आप रास्ते में हैं। अगर अभी तक नहीं किया है तो वज़न पर्ची और इनवॉइस की फ़ोटो अपलोड करें।\n\nडिलीवरी की जगह पहुँचकर ट्रिप बंद करने के लिए डिलीवर्ड दबाएँ।',
  knowMoreDeliveredTitle: 'ट्रिप पूरी',
  knowMoreDeliveredBody:
    'यह ट्रिप डिलीवर हो गई है और आपकी पूरी की गई ट्रिप्स में गिनी गई है। अब कुछ करने की ज़रूरत नहीं है।\n\nआप इसे कभी भी ट्रिप हिस्ट्री में देख सकते हैं।',
  gotIt: 'समझ गया',

  statusAccept: 'स्वीकार',
  statusPickup: 'पिकअप',
  statusInTransit: 'रास्ते में',
  statusDelivered: 'डिलीवर्ड',
  orderDetails: 'ऑर्डर डिटेल',
  productSize: 'माल और साइज़',
  quantity: 'मात्रा',
  weight: 'वज़न',
  tempoNumber: 'टेम्पो नंबर',
  companyDetails: 'कंपनी डिटेल',
  name: 'नाम',
  total: 'कुल',
  getDirection: 'रास्ता देखें',
  viewRoute: 'रूट देखें',
  routeUnavailable: 'इस ट्रिप का पता अभी उपलब्ध नहीं है।',
  addItem: 'आइटम जोड़ें',
  removeItem: 'आइटम हटाएँ',
  extraItem: 'अतिरिक्त आइटम',
  selectProductFirst: 'कन्फ़र्म करने से पहले हर जोड़े गए आइटम का माल चुनें।',
  enterWeightFirst: 'कन्फ़र्म करने से पहले हर जोड़े गए आइटम का वज़न डालें।',
  selectProduct: 'माल चुनें',
  selectSize: 'साइज़ चुनें',
  locationPermissionDenied:
    'आपकी जगह से रास्ता दिखाने के लिए लोकेशन की अनुमति चाहिए। रास्ता देखने के लिए सेटिंग्स में इसे चालू करें।',

  // Background-location prominent disclosure (Google Play policy): must name
  // the data, say collection continues when the app is closed, and give the
  // purpose.
  locationDisclosureTitle: 'BST Driver बैकग्राउंड में लोकेशन लेता है',
  locationDisclosureBody:
    'जब आप ड्यूटी पर होते हैं, तब BST Driver आपकी लोकेशन लेता है, ऐप बंद होने या इस्तेमाल न होने पर भी, ताकि ऑफ़िस आपकी गाड़ी का रास्ता देख सके।',
  locationDisclosureUsage:
    'आपके रास्ते से ग्राहकों को उनकी डिलीवरी की जानकारी दी जाती है, आपकी पूरी की गई ट्रिप्स की पुष्टि होती है, और ट्रिप में मदद चाहिए हो तो ऑफ़िस आप तक पहुँच पाता है।',
  locationDisclosureControl:
    'ड्यूटी बंद करते ही लोकेशन लेना बंद हो जाता है, और ड्यूटी बंद रहने पर कभी नहीं चलता। आप इसे कभी भी ड्यूटी स्विच से या फ़ोन की सेटिंग्स से बंद कर सकते हैं।',
  locationDisclosureAccept: 'अनुमति दें',
  locationDisclosureDecline: 'अभी नहीं',
  vehicleThere: 'गाड़ी पहुँची',
  somethingWentWrong: 'कुछ गड़बड़ हो गई। कृपया फिर से कोशिश करें।',
  statusUpdateFailed: 'स्टेटस अपडेट नहीं हुआ',
  deliveredViaTitle: 'डिलीवरी किससे हुई?',
  deliveredViaMessage: 'जिस गाड़ी से यह माल डिलीवर हुआ, उसे चुनें।',
  deliveredViaTajMahal: 'ताज महल',
  deliveredViaTempo: 'टेम्पो',
  accept: 'स्वीकार करें',
  decline: 'मना करें',
  confirmLoading: 'लोडिंग कन्फ़र्म करें',
  pickupLoading: 'पिकअप लोडिंग डिटेल',
  uploadPhoto: 'फ़ोटो अपलोड करें',
  weightSlip: 'वज़न पर्ची',
  invoice: 'इनवॉइस',

  // Lorry Receipt card
  lorryReceipt: 'लॉरी रसीद (LR)',
  lorryReceiptHint: 'पिकअप और डिलीवरी पर माँगे जाने पर यह दिखाएँ।',
  viewLr: 'LR देखें',
  downloadLr: 'डाउनलोड',
  lrDownloadAgain: 'फिर से डाउनलोड करें',
  lrDownloadSuccess: 'डाउनलोड हो गया',
  lrDownloadedOkay: 'ठीक है',
  lrSavedToDownloads: 'Downloads › BST LR में सेव हुआ',
  lrSavedOnPhone: 'आपके फ़ोन में सेव हुआ',
  lrDownloaded: 'LR सेव हुआ',
  lrDownloadFailed: 'LR डाउनलोड नहीं हो सका। इंटरनेट देखें और फिर से कोशिश करें।',
  lrOpenFailed: 'अभी LR नहीं खुल सका। कृपया फिर से कोशिश करें।',
  lrRenderFailed: 'LR नहीं बन सका। कृपया फिर से कोशिश करें।',

  // Confirm Load Popup
  confirmLoad: 'लोड कन्फ़र्म करें',
  pickupLoad: 'पिकअप लोड',
  customerLoad: 'ग्राहक का लोड',
  tiles: 'टाइल्स',
  majuriCharge: 'मजदूरी शुल्क',
  kataparchiCharge: 'कांटा पर्ची शुल्क',
  cancel: 'रद्द करें',
  confirm: 'कन्फ़र्म करें',
  enterAmount: 'रकम डालें',

  // Shared
  dialogCancel: 'रद्द करें',
  trip: 'ट्रिप',

  // Language picker (profile)
  language: 'भाषा',
  languageHint: 'ऐप आपकी चुनी हुई भाषा में दिखेगा।',
};
