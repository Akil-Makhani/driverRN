/** Gujarati copy. Keys mirror en.ts; brand names, LR, OTP and KG stay as is. */
import type { Translations } from './en';

export const gu: Translations = {
  rupeesSign: '₹',
  onDuty: 'ડ્યુટી પર',

  // Sidebar
  sideBarHome: 'હોમ',
  sideBarMyWallet: 'મારું વૉલેટ',
  sideBarTripHistory: 'ટ્રિપ હિસ્ટ્રી',
  sideBarProfile: 'પ્રોફાઇલ',
  sideBarDeleteAccount: 'એકાઉન્ટ ડિલીટ કરો',
  deleteAccountConfirm:
    'તમે જઈ રહ્યા છો તેનું અમને દુઃખ છે. શું તમે ખરેખર તમારું એકાઉન્ટ ડિલીટ કરવા માંગો છો? આ પાછું નહીં થાય, અને એકાઉન્ટ સાથે જોડાયેલો તમારો બધો ડેટા જતો રહેશે.',
  logout: 'લૉગઆઉટ',
  deleteAccount: 'એકાઉન્ટ ડિલીટ કરો',
  delete: 'ડિલીટ',
  areYouSureLogout: 'શું તમે ખરેખર લૉગઆઉટ કરવા માંગો છો?',

  // Wallet Screen
  totalBalance: 'કુલ બેલેન્સ',
  recentTransactions: 'તાજેતરના વ્યવહાર',

  // Trip History Screen
  tripComplete: 'ટ્રિપ પૂરી',
  statusComplete: 'પૂરી',
  statusInProcess: 'ચાલુ',
  recentTripHistory: 'તાજેતરની ટ્રિપ્સ',

  // Dashboard Screen
  kg: 'KG',
  truckNumber: 'ટ્રક નંબર',
  lrNumber: 'LR નંબર',
  tripInProcess: 'ટ્રિપ ચાલુ છે',
  accepted: 'સ્વીકારી',
  vehicleThereStatus: 'ગાડી પહોંચી',
  inTransitStatus: 'રસ્તામાં',
  deliverAll: 'બધી ડિલિવર કરો',
  acceptTrip: 'ટ્રિપ સ્વીકારો',
  noTripAssigned: 'કોઈ ટ્રિપ\nનથી',

  // Login Screen
  loginWelcomeMessage: 'BST માં તમારું સ્વાગત છે',
  loginEnterMobile: 'ડ્રાઇવર એપ ચાલુ રાખવા માટે\nતમારો મોબાઇલ નંબર નાખો.',
  mobileValidation: 'કૃપા કરીને તમારો 10 અંકનો મોબાઇલ નંબર નાખો',
  login: 'લૉગ ઇન',
  commonCountryCode: '91',

  // OTP Screen
  verify: 'વેરિફાઇ કરો',
  verifyMobile: 'મોબાઇલ નંબર વેરિફાઇ કરો',
  oneTimeString: 'આ નંબર પર વન ટાઇમ પાસવર્ડ (OTP) મોકલ્યો છે: ',
  pleaseEnterOtp: 'કૃપા કરીને OTP નાખો',
  pleaseEnterCompleteOtp: 'કૃપા કરીને પૂરો OTP નાખો',
  resendOTPText: 'ફરી મોકલવામાં ',
  resendOTP: 'OTP ફરી મોકલો',

  // Profile Screen
  mobileNumber: 'મોબાઇલ નંબર',
  aadharNumber: 'આધાર નંબર',
  panNumber: 'પાન નંબર',

  // Notification Screen
  notification: 'સૂચનાઓ',
  clearAll: 'બધું હટાવો',

  // Trip Details Screen
  acceptTripDesc: 'ઓર્ડર પર કામ ચાલુ રાખવા માટે આ ટ્રિપ સ્વીકારો',
  pickupOrder: 'પિકઅપ ઓર્ડર',
  pickupOrderDesc: 'ઓર્ડર ચાલુ રાખવા માટે પિકઅપની જગ્યાએ પહોંચો',
  inTransit: 'રસ્તામાં',
  inTransitDesc: 'લોડ કરેલો માલ કન્ફર્મ કરો અને તેને રસ્તામાં તરીકે માર્ક કરો.',
  inTransitDesc2: 'ડિલિવરીની જગ્યાએ પહોંચો ત્યારે સ્ટેટસ ડિલિવર્ડ કરો',
  successfullyDelivered: 'સફળતાપૂર્વક ડિલિવર થયું',
  successfullyDeliveredDesc: 'ઓર્ડર સફળતાપૂર્વક ડિલિવર થઈ ગયો છે.',
  knowMore: 'વધુ જાણો',
  knowMoreAcceptTitle: 'આ ટ્રિપ સ્વીકારો',
  knowMoreAcceptBody:
    'આ ટ્રિપ તમને આપવામાં આવી છે. પિકઅપનું સરનામું, માલ અને વજન જુઓ, પછી લેવા માટે સ્વીકારો દબાવો, અથવા ઓફિસને પાછી મોકલવા માટે ના પાડો દબાવો.\n\nસ્વીકાર્યા પછી ટ્રિપ ડિલિવર થાય ત્યાં સુધી તમારા ડેશબોર્ડ પર રહેશે.',
  knowMorePickupTitle: 'પિકઅપની જગ્યાએ પહોંચો',
  knowMorePickupBody:
    'ઓર્ડર વિગતમાં આપેલા પિકઅપ સરનામે જાઓ. રસ્તો જોવા માટે રસ્તો જુઓ દબાવો.\n\nપહોંચો ત્યારે ગાડી પહોંચી દબાવો જેથી ઓફિસને ખબર પડે કે ગાડી ત્યાં છે.',
  knowMoreLoadingTitle: 'લોડ કરેલો માલ કન્ફર્મ કરો',
  knowMoreLoadingBody:
    'લોડિંગ કન્ફર્મ કરો દબાવો અને દરેક લાઇનને ટ્રકમાં ખરેખર ચઢેલા માલ સાથે મેળવો. માલ, સાઇઝ, જથ્થો કે વજન અલગ હોય તો બદલો, અને ઓર્ડરમાં ન હતો પણ લોડ થયો એવા માલ માટે આઇટમ ઉમેરો વાપરો.\n\nમજૂરી અને કાંટા પરચી ચાર્જ હોય તો ઉમેરો, પછી કન્ફર્મ કરીને ટ્રિપને રસ્તામાં તરીકે માર્ક કરો.',
  knowMoreTransitTitle: 'ડિલિવરીના રસ્તે',
  knowMoreTransitBody:
    'લોડ નોંધાઈ ગયો છે અને તમે રસ્તામાં છો. હજી ન કર્યું હોય તો વજન પરચી અને ઇન્વૉઇસના ફોટા અપલોડ કરો.\n\nડિલિવરીની જગ્યાએ પહોંચીને ટ્રિપ બંધ કરવા માટે ડિલિવર્ડ દબાવો.',
  knowMoreDeliveredTitle: 'ટ્રિપ પૂરી',
  knowMoreDeliveredBody:
    'આ ટ્રિપ ડિલિવર થઈ ગઈ છે અને તમારી પૂરી થયેલી ટ્રિપ્સમાં ગણાઈ ગઈ છે. હવે કંઈ કરવાની જરૂર નથી.\n\nતમે તેને ગમે ત્યારે ટ્રિપ હિસ્ટ્રીમાં જોઈ શકો છો.',
  gotIt: 'સમજાઈ ગયું',

  statusAccept: 'સ્વીકાર',
  statusPickup: 'પિકઅપ',
  statusInTransit: 'રસ્તામાં',
  statusDelivered: 'ડિલિવર્ડ',
  orderDetails: 'ઓર્ડર વિગત',
  productSize: 'માલ અને સાઇઝ',
  quantity: 'જથ્થો',
  weight: 'વજન',
  tempoNumber: 'ટેમ્પો નંબર',
  companyDetails: 'કંપની વિગત',
  name: 'નામ',
  total: 'કુલ',
  getDirection: 'રસ્તો જુઓ',
  viewRoute: 'રૂટ જુઓ',
  routeUnavailable: 'આ ટ્રિપનું સરનામું હજી ઉપલબ્ધ નથી.',
  addItem: 'આઇટમ ઉમેરો',
  removeItem: 'આઇટમ હટાવો',
  extraItem: 'વધારાની આઇટમ',
  selectProductFirst: 'કન્ફર્મ કરતા પહેલા દરેક ઉમેરેલી આઇટમ માટે માલ પસંદ કરો.',
  enterWeightFirst: 'કન્ફર્મ કરતા પહેલા દરેક ઉમેરેલી આઇટમનું વજન નાખો.',
  selectProduct: 'માલ પસંદ કરો',
  selectSize: 'સાઇઝ પસંદ કરો',
  locationPermissionDenied:
    'તમારી જગ્યાએથી રસ્તો બતાવવા માટે લોકેશનની પરવાનગી જોઈએ. રસ્તો જોવા માટે સેટિંગ્સમાં તેને ચાલુ કરો.',

  // Background-location prominent disclosure (Google Play policy): must name
  // the data, say collection continues when the app is closed, and give the
  // purpose.
  locationDisclosureTitle: 'BST Driver બેકગ્રાઉન્ડમાં લોકેશન લે છે',
  locationDisclosureBody:
    'તમે ડ્યુટી પર હો ત્યારે BST Driver તમારું લોકેશન લે છે, એપ બંધ હોય કે વપરાતી ન હોય ત્યારે પણ, જેથી ઓફિસ તમારી ગાડીનો રસ્તો જોઈ શકે.',
  locationDisclosureUsage:
    'તમારા રસ્તાથી ગ્રાહકોને તેમની ડિલિવરીની માહિતી અપાય છે, તમારી પૂરી થયેલી ટ્રિપ્સની ખાતરી થાય છે, અને ટ્રિપમાં મદદ જોઈએ તો ઓફિસ તમારા સુધી પહોંચી શકે છે.',
  locationDisclosureControl:
    'ડ્યુટી બંધ કરતાં જ લોકેશન લેવાનું બંધ થાય છે, અને ડ્યુટી બંધ હોય ત્યારે ક્યારેય ચાલતું નથી. તમે તેને ગમે ત્યારે ડ્યુટી સ્વિચથી કે ફોનના સેટિંગ્સમાંથી બંધ કરી શકો છો.',
  locationDisclosureAccept: 'પરવાનગી આપો',
  locationDisclosureDecline: 'હમણાં નહીં',
  vehicleThere: 'ગાડી પહોંચી',
  somethingWentWrong: 'કંઈક ખોટું થયું. કૃપા કરીને ફરી પ્રયાસ કરો.',
  statusUpdateFailed: 'સ્ટેટસ અપડેટ ન થયું',
  deliveredViaTitle: 'ડિલિવરી શેનાથી થઈ?',
  deliveredViaMessage: 'જે ગાડીથી આ માલ ડિલિવર થયો તે પસંદ કરો.',
  deliveredViaTajMahal: 'તાજ મહલ',
  deliveredViaTempo: 'ટેમ્પો',
  accept: 'સ્વીકારો',
  decline: 'ના પાડો',
  confirmLoading: 'લોડિંગ કન્ફર્મ કરો',
  pickupLoading: 'પિકઅપ લોડિંગ વિગત',
  uploadPhoto: 'ફોટો અપલોડ કરો',
  weightSlip: 'વજન પરચી',
  invoice: 'ઇન્વૉઇસ',

  // Lorry Receipt card
  lorryReceipt: 'લોરી રસીદ (LR)',
  lorryReceiptHint: 'પિકઅપ અને ડિલિવરી પર માંગે તો આ બતાવો.',
  viewLr: 'LR જુઓ',
  downloadLr: 'ડાઉનલોડ',
  lrDownloadAgain: 'ફરી ડાઉનલોડ કરો',
  lrDownloadSuccess: 'ડાઉનલોડ થઈ ગયું',
  lrDownloadedOkay: 'બરાબર',
  lrSavedToDownloads: 'Downloads › BST LR માં સેવ થયું',
  lrSavedOnPhone: 'તમારા ફોનમાં સેવ થયું',
  lrDownloaded: 'LR સેવ થયું',
  lrDownloadFailed: 'LR ડાઉનલોડ ન થયું. ઇન્ટરનેટ તપાસો અને ફરી પ્રયાસ કરો.',
  lrOpenFailed: 'હમણાં LR ખૂલી શક્યું નહીં. કૃપા કરીને ફરી પ્રયાસ કરો.',
  lrRenderFailed: 'LR બની શક્યું નહીં. કૃપા કરીને ફરી પ્રયાસ કરો.',

  // Confirm Load Popup
  confirmLoad: 'લોડ કન્ફર્મ કરો',
  pickupLoad: 'પિકઅપ લોડ',
  customerLoad: 'ગ્રાહકનો લોડ',
  tiles: 'ટાઇલ્સ',
  majuriCharge: 'મજૂરી ચાર્જ',
  kataparchiCharge: 'કાંટા પરચી ચાર્જ',
  cancel: 'રદ કરો',
  confirm: 'કન્ફર્મ કરો',
  enterAmount: 'રકમ નાખો',

  // Shared
  dialogCancel: 'રદ કરો',
  trip: 'ટ્રિપ',

  // Language picker (profile)
  language: 'ભાષા',
  languageHint: 'એપ તમે પસંદ કરેલી ભાષામાં દેખાશે.',
};
