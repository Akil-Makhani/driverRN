/**
 * The Tiles Drop Saathi privacy policy, in each app language.
 *
 * The website copy (tilesdrop.com/saathi-privacy.php, the URL Play links to)
 * is English only, so the app carries its own: a driver reading Gujarati gets
 * the policy in Gujarati, and it opens without a network. The English text is
 * the website's word for word. When the policy changes, change the website
 * file (~/Desktop/TilesDropSaathi-Website/saathi-privacy.php) and all three
 * languages here together, and move LAST_UPDATED.
 */
import type { Language } from '@/core/i18n/language';

interface PolicyCopy {
  title: string;
  updated: string;
  body: string;
}

const MAIL = 'info@tilesdrop.in';
const DELETE_MAIL = `mailto:${MAIL}?subject=Delete%20my%20Tiles%20Drop%20Saathi%20account`;

const COPY: Record<Language, PolicyCopy> = {
  en: {
    title: 'Tiles Drop Saathi – Privacy Policy',
    updated: 'Last updated: 8 October 2026',
    body: `
  <p>This Privacy Policy explains how Tiles Drop (Morbi, Gujarat, India) collects, uses and protects information when drivers and vehicle owners use the <strong>Tiles Drop Saathi</strong> mobile app (package <code>com.tilesdrop.partner</code>). The app lets registered drivers receive transport orders, navigate to pickup and delivery points, and complete trips for Tiles Drop.</p>
  <p>For customers of Tiles Drop, our general policy is at <a href="https://www.tilesdrop.com/privacy.php">tilesdrop.com/privacy.php</a>.</p>

  <h2>1. Information we collect</h2>
  <ul>
    <li><strong>Registration details:</strong> name, mobile number, date of birth, driving licence number and vehicle number.</li>
    <li><strong>Location:</strong> precise location of your device. See section 2.</li>
    <li><strong>Photos:</strong> photos you take or choose in the app, such as the weight slip and invoice for a trip.</li>
    <li><strong>Trip and earnings records:</strong> orders offered to you, trips you accept and complete, and your wallet balance and earnings.</li>
    <li><strong>Device information:</strong> a notification token and a device identifier, used to send you new orders and keep you signed in.</li>
  </ul>

  <h2>2. Location, including background location</h2>
  <div class="box">
    <p><strong>Tiles Drop Saathi collects location data to send you nearby orders and to let the office and the customer follow the vehicle along its route. It does this while you are On Duty or carrying an order, including when the app is closed or not in use.</strong></p>
    <p>Location is not collected when you are Off Duty and have no active trip. While location is being collected, Android shows a notification. You can stop it at any time by going Off Duty, or by changing the location permission in your phone settings. Without location the app cannot offer you orders or complete trips.</p>
  </div>

  <h2>3. How we use your information</h2>
  <ul>
    <li>To verify and approve your driver account.</li>
    <li>To offer you orders near you and ring your phone when a new order arrives.</li>
    <li>To show directions to pickup and delivery addresses.</li>
    <li>To show live trip progress to the Tiles Drop office and to the customer of that order.</li>
    <li>To record trip proof (weight slip, invoice) and calculate your earnings.</li>
    <li>To provide support, prevent fraud and meet legal requirements.</li>
  </ul>
  <p>We do not sell your personal information and we do not use it for advertising.</p>

  <h2>4. Who we share it with</h2>
  <ul>
    <li><strong>Tiles Drop staff</strong> who manage dispatch, support and payments.</li>
    <li><strong>The customer of an order</strong>: your name, vehicle number and live location during that trip only.</li>
    <li><strong>Service providers</strong> who run parts of the service for us: Google Firebase (notifications), Google Maps (maps and directions) and our cloud hosting providers. They process data only on our behalf.</li>
    <li><strong>Authorities</strong>, when required by law.</li>
  </ul>

  <h2>5. Security and retention</h2>
  <p>All data travels between the app and our servers over encrypted (HTTPS) connections. We keep your account data while your account is active. Trip and payment records may be kept for as long as required for accounting, tax and legal purposes, even after the account is deleted.</p>

  <h2 id="delete-account">6. Deleting your account and data</h2>
  <p>You can delete your account in either of these ways:</p>
  <ul>
    <li><strong>In the app:</strong> open the menu → <strong>Delete Account</strong> → confirm.</li>
    <li><strong>By email:</strong> write to <a href="${DELETE_MAIL}">${MAIL}</a> from any address, with the subject "Delete my Tiles Drop Saathi account" and your registered mobile number. We will confirm and complete the request within 30 days.</li>
  </ul>
  <p>When your account is deleted, we delete or anonymise your profile, registration details, location history and photos. We may keep completed trip and payment records that we must retain by law, and delete them when that period ends.</p>

  <h2>7. Children</h2>
  <p>The app is only for adult drivers (18 years and above) with a valid driving licence. We do not knowingly collect data from children.</p>

  <h2>8. Changes to this policy</h2>
  <p>We may update this policy. The latest version will always be available on this page, with the date it was last updated.</p>

  <h2>9. Contact us</h2>
  <p>Tiles Drop, Morbi, Gujarat, India<br>
  Email: <a href="mailto:${MAIL}">${MAIL}</a><br>
  Phone: <a href="tel:+919737201001">+91 9737201001</a></p>`,
  },

  hi: {
    title: 'Tiles Drop Saathi – प्राइवेसी पॉलिसी',
    updated: 'आख़िरी बदलाव: 8 अक्टूबर 2026',
    body: `
  <p>यह प्राइवेसी पॉलिसी बताती है कि जब ड्राइवर और गाड़ी मालिक <strong>Tiles Drop Saathi</strong> मोबाइल ऐप (पैकेज <code>com.tilesdrop.partner</code>) इस्तेमाल करते हैं, तब Tiles Drop (मोरबी, गुजरात, भारत) उनकी जानकारी कैसे इकट्ठा करता है, इस्तेमाल करता है और सुरक्षित रखता है। इस ऐप से रजिस्टर्ड ड्राइवर ट्रांसपोर्ट ऑर्डर पाते हैं, पिकअप और डिलीवरी की जगह तक रास्ता देखते हैं, और Tiles Drop के लिए ट्रिप पूरी करते हैं।</p>
  <p>Tiles Drop के ग्राहकों के लिए हमारी आम पॉलिसी <a href="https://www.tilesdrop.com/privacy.php">tilesdrop.com/privacy.php</a> पर है।</p>

  <h2>1. हम कौन-सी जानकारी लेते हैं</h2>
  <ul>
    <li><strong>रजिस्ट्रेशन की जानकारी:</strong> नाम, मोबाइल नंबर, जन्म तारीख, ड्राइविंग लाइसेंस नंबर और गाड़ी नंबर।</li>
    <li><strong>लोकेशन:</strong> आपके फ़ोन की सटीक लोकेशन। भाग 2 देखें।</li>
    <li><strong>फ़ोटो:</strong> ऐप में आप जो फ़ोटो खींचते या चुनते हैं, जैसे ट्रिप की वज़न पर्ची और बिल।</li>
    <li><strong>ट्रिप और कमाई का रिकॉर्ड:</strong> आपको भेजे गए ऑर्डर, आपकी ली और पूरी की गई ट्रिप, और आपका वॉलेट बैलेंस और कमाई।</li>
    <li><strong>फ़ोन की जानकारी:</strong> एक नोटिफ़िकेशन टोकन और एक डिवाइस पहचान, ताकि आपको नए ऑर्डर भेजे जा सकें और आप लॉगिन रहें।</li>
  </ul>

  <h2>2. लोकेशन, बैकग्राउंड लोकेशन समेत</h2>
  <div class="box">
    <p><strong>Tiles Drop Saathi आपकी लोकेशन लेता है ताकि आपको पास के ऑर्डर भेजे जा सकें और ऑफ़िस व ग्राहक रास्ते में गाड़ी को देख सकें। यह तब होता है जब आप ड्यूटी पर हों या कोई ऑर्डर ले जा रहे हों — तब भी जब ऐप बंद हो या इस्तेमाल में न हो।</strong></p>
    <p>जब आप ड्यूटी से बाहर हों और कोई चालू ट्रिप न हो, तब लोकेशन नहीं ली जाती। लोकेशन लेते समय Android एक नोटिफ़िकेशन दिखाता है। आप कभी भी ड्यूटी बंद करके, या फ़ोन की सेटिंग में लोकेशन की अनुमति बदलकर इसे रोक सकते हैं। लोकेशन के बिना ऐप आपको ऑर्डर नहीं दे सकता और ट्रिप पूरी नहीं हो सकती।</p>
  </div>

  <h2>3. हम आपकी जानकारी का इस्तेमाल कैसे करते हैं</h2>
  <ul>
    <li>आपका ड्राइवर अकाउंट जाँचने और मंज़ूर करने के लिए।</li>
    <li>आपके पास के ऑर्डर देने के लिए, और नया ऑर्डर आने पर आपका फ़ोन बजाने के लिए।</li>
    <li>पिकअप और डिलीवरी के पते तक रास्ता दिखाने के लिए।</li>
    <li>Tiles Drop ऑफ़िस और उस ऑर्डर के ग्राहक को ट्रिप की लाइव स्थिति दिखाने के लिए।</li>
    <li>ट्रिप का सबूत (वज़न पर्ची, बिल) रखने और आपकी कमाई का हिसाब करने के लिए।</li>
    <li>मदद देने, धोखाधड़ी रोकने और क़ानूनी ज़रूरतें पूरी करने के लिए।</li>
  </ul>
  <p>हम आपकी निजी जानकारी बेचते नहीं हैं और विज्ञापन के लिए इस्तेमाल नहीं करते।</p>

  <h2>4. हम जानकारी किसके साथ साझा करते हैं</h2>
  <ul>
    <li><strong>Tiles Drop का स्टाफ़</strong>, जो डिस्पैच, मदद और भुगतान संभालता है।</li>
    <li><strong>ऑर्डर का ग्राहक</strong>: सिर्फ़ उसी ट्रिप के दौरान आपका नाम, गाड़ी नंबर और लाइव लोकेशन।</li>
    <li><strong>सेवा देने वाली कंपनियाँ</strong>, जो हमारे लिए सेवा के कुछ हिस्से चलाती हैं: Google Firebase (नोटिफ़िकेशन), Google Maps (नक़्शा और रास्ता) और हमारी क्लाउड होस्टिंग कंपनियाँ। ये सिर्फ़ हमारी ओर से डेटा पर काम करती हैं।</li>
    <li><strong>सरकारी विभाग</strong>, जब क़ानून के तहत ज़रूरी हो।</li>
  </ul>

  <h2>5. सुरक्षा और डेटा कितने समय रखा जाता है</h2>
  <p>ऐप और हमारे सर्वर के बीच सारा डेटा एन्क्रिप्टेड (HTTPS) कनेक्शन से जाता है। जब तक आपका अकाउंट चालू है, हम आपका अकाउंट डेटा रखते हैं। ट्रिप और भुगतान के रिकॉर्ड हिसाब-किताब, टैक्स और क़ानूनी कारणों से जितने समय ज़रूरी हो उतने समय रखे जा सकते हैं, अकाउंट डिलीट होने के बाद भी।</p>

  <h2 id="delete-account">6. अपना अकाउंट और डेटा डिलीट करना</h2>
  <p>आप इनमें से किसी भी तरीक़े से अपना अकाउंट डिलीट कर सकते हैं:</p>
  <ul>
    <li><strong>ऐप में:</strong> मेन्यू खोलें → <strong>अकाउंट डिलीट करें</strong> → पक्का करें।</li>
    <li><strong>ईमेल से:</strong> किसी भी पते से <a href="${DELETE_MAIL}">${MAIL}</a> पर लिखें, विषय "Delete my Tiles Drop Saathi account" और अपना रजिस्टर्ड मोबाइल नंबर दें। हम 30 दिन के अंदर पुष्टि करके अनुरोध पूरा करेंगे।</li>
  </ul>
  <p>अकाउंट डिलीट होने पर हम आपकी प्रोफ़ाइल, रजिस्ट्रेशन की जानकारी, लोकेशन हिस्ट्री और फ़ोटो डिलीट कर देते हैं या उनसे आपकी पहचान हटा देते हैं। जो पूरी हुई ट्रिप और भुगतान के रिकॉर्ड क़ानून के तहत रखने ज़रूरी हैं, उन्हें हम रख सकते हैं और वह समय पूरा होने पर डिलीट कर देते हैं।</p>

  <h2>7. बच्चे</h2>
  <p>यह ऐप सिर्फ़ बालिग़ ड्राइवरों (18 साल और उससे ज़्यादा) के लिए है जिनके पास सही ड्राइविंग लाइसेंस हो। हम जानबूझकर बच्चों की जानकारी नहीं लेते।</p>

  <h2>8. इस पॉलिसी में बदलाव</h2>
  <p>हम यह पॉलिसी बदल सकते हैं। नया वर्ज़न हमेशा यहीं मिलेगा, आख़िरी बदलाव की तारीख़ के साथ।</p>

  <h2>9. हमसे संपर्क करें</h2>
  <p>Tiles Drop, मोरबी, गुजरात, भारत<br>
  ईमेल: <a href="mailto:${MAIL}">${MAIL}</a><br>
  फ़ोन: <a href="tel:+919737201001">+91 9737201001</a></p>`,
  },

  gu: {
    title: 'Tiles Drop Saathi – પ્રાઇવસી પોલિસી',
    updated: 'છેલ્લો ફેરફાર: 8 ઑક્ટોબર 2026',
    body: `
  <p>આ પ્રાઇવસી પોલિસી સમજાવે છે કે જ્યારે ડ્રાઇવરો અને વાહન માલિકો <strong>Tiles Drop Saathi</strong> મોબાઇલ એપ (પેકેજ <code>com.tilesdrop.partner</code>) વાપરે છે, ત્યારે Tiles Drop (મોરબી, ગુજરાત, ભારત) તેમની માહિતી કેવી રીતે ભેગી કરે છે, વાપરે છે અને સુરક્ષિત રાખે છે. આ એપથી રજિસ્ટર્ડ ડ્રાઇવરો ટ્રાન્સપોર્ટ ઓર્ડર મેળવે છે, પિકઅપ અને ડિલિવરીની જગ્યા સુધીનો રસ્તો જુએ છે, અને Tiles Drop માટે ટ્રિપ પૂરી કરે છે.</p>
  <p>Tiles Drop ના ગ્રાહકો માટે અમારી સામાન્ય પોલિસી <a href="https://www.tilesdrop.com/privacy.php">tilesdrop.com/privacy.php</a> પર છે.</p>

  <h2>1. અમે કઈ માહિતી લઈએ છીએ</h2>
  <ul>
    <li><strong>રજિસ્ટ્રેશનની માહિતી:</strong> નામ, મોબાઇલ નંબર, જન્મ તારીખ, ડ્રાઇવિંગ લાઇસન્સ નંબર અને વાહન નંબર.</li>
    <li><strong>લોકેશન:</strong> તમારા ફોનનું ચોક્કસ લોકેશન. ભાગ 2 જુઓ.</li>
    <li><strong>ફોટા:</strong> એપમાં તમે જે ફોટા પાડો કે પસંદ કરો, જેમ કે ટ્રિપની વજન પાવતી અને બિલ.</li>
    <li><strong>ટ્રિપ અને કમાણીનો રેકોર્ડ:</strong> તમને મોકલેલા ઓર્ડર, તમે સ્વીકારેલી અને પૂરી કરેલી ટ્રિપ, અને તમારું વૉલેટ બેલેન્સ અને કમાણી.</li>
    <li><strong>ફોનની માહિતી:</strong> એક નોટિફિકેશન ટોકન અને એક ડિવાઇસ ઓળખ, જેથી તમને નવા ઓર્ડર મોકલી શકાય અને તમે લૉગિન રહો.</li>
  </ul>

  <h2>2. લોકેશન, બેકગ્રાઉન્ડ લોકેશન સહિત</h2>
  <div class="box">
    <p><strong>Tiles Drop Saathi તમારું લોકેશન લે છે જેથી તમને નજીકના ઓર્ડર મોકલી શકાય અને ઑફિસ તથા ગ્રાહક રસ્તામાં વાહનને જોઈ શકે. આ ત્યારે થાય છે જ્યારે તમે ડ્યુટી પર હો અથવા કોઈ ઓર્ડર લઈ જતા હો — એપ બંધ હોય કે વપરાશમાં ન હોય ત્યારે પણ.</strong></p>
    <p>જ્યારે તમે ડ્યુટી બંધ પર હો અને કોઈ ચાલુ ટ્રિપ ન હોય, ત્યારે લોકેશન લેવાતું નથી. લોકેશન લેવાતું હોય ત્યારે Android એક નોટિફિકેશન બતાવે છે. તમે ગમે ત્યારે ડ્યુટી બંધ કરીને, અથવા ફોનના સેટિંગમાં લોકેશનની પરવાનગી બદલીને તેને રોકી શકો છો. લોકેશન વગર એપ તમને ઓર્ડર આપી શકતી નથી અને ટ્રિપ પૂરી થઈ શકતી નથી.</p>
  </div>

  <h2>3. અમે તમારી માહિતીનો ઉપયોગ કેવી રીતે કરીએ છીએ</h2>
  <ul>
    <li>તમારું ડ્રાઇવર એકાઉન્ટ ચકાસવા અને મંજૂર કરવા માટે.</li>
    <li>તમારી નજીકના ઓર્ડર આપવા માટે, અને નવો ઓર્ડર આવે ત્યારે તમારો ફોન વગાડવા માટે.</li>
    <li>પિકઅપ અને ડિલિવરીના સરનામા સુધીનો રસ્તો બતાવવા માટે.</li>
    <li>Tiles Drop ઑફિસ અને તે ઓર્ડરના ગ્રાહકને ટ્રિપની લાઇવ સ્થિતિ બતાવવા માટે.</li>
    <li>ટ્રિપનો પુરાવો (વજન પાવતી, બિલ) રાખવા અને તમારી કમાણીનો હિસાબ કરવા માટે.</li>
    <li>મદદ આપવા, છેતરપિંડી રોકવા અને કાયદાકીય જરૂરિયાતો પૂરી કરવા માટે.</li>
  </ul>
  <p>અમે તમારી અંગત માહિતી વેચતા નથી અને જાહેરાત માટે વાપરતા નથી.</p>

  <h2>4. અમે માહિતી કોની સાથે શેર કરીએ છીએ</h2>
  <ul>
    <li><strong>Tiles Drop નો સ્ટાફ</strong>, જે ડિસ્પેચ, મદદ અને ચુકવણી સંભાળે છે.</li>
    <li><strong>ઓર્ડરનો ગ્રાહક</strong>: ફક્ત તે ટ્રિપ દરમિયાન તમારું નામ, વાહન નંબર અને લાઇવ લોકેશન.</li>
    <li><strong>સેવા આપતી કંપનીઓ</strong>, જે અમારા માટે સેવાના અમુક ભાગ ચલાવે છે: Google Firebase (નોટિફિકેશન), Google Maps (નકશો અને રસ્તો) અને અમારી ક્લાઉડ હોસ્ટિંગ કંપનીઓ. તેઓ ફક્ત અમારા વતી ડેટા પર કામ કરે છે.</li>
    <li><strong>સરકારી વિભાગો</strong>, જ્યારે કાયદા હેઠળ જરૂરી હોય.</li>
  </ul>

  <h2>5. સુરક્ષા અને ડેટા કેટલો સમય રાખીએ છીએ</h2>
  <p>એપ અને અમારા સર્વર વચ્ચે બધો ડેટા એન્ક્રિપ્ટેડ (HTTPS) કનેક્શનથી જાય છે. તમારું એકાઉન્ટ ચાલુ હોય ત્યાં સુધી અમે તમારો એકાઉન્ટ ડેટા રાખીએ છીએ. ટ્રિપ અને ચુકવણીના રેકોર્ડ હિસાબ, ટેક્સ અને કાયદાકીય કારણોસર જેટલો સમય જરૂરી હોય તેટલો સમય રાખી શકાય છે, એકાઉન્ટ ડિલીટ થયા પછી પણ.</p>

  <h2 id="delete-account">6. તમારું એકાઉન્ટ અને ડેટા ડિલીટ કરવું</h2>
  <p>તમે આમાંથી કોઈ પણ રીતે તમારું એકાઉન્ટ ડિલીટ કરી શકો છો:</p>
  <ul>
    <li><strong>એપમાં:</strong> મેનુ ખોલો → <strong>એકાઉન્ટ ડિલીટ કરો</strong> → પુષ્ટિ કરો.</li>
    <li><strong>ઈમેલથી:</strong> કોઈ પણ સરનામેથી <a href="${DELETE_MAIL}">${MAIL}</a> પર લખો, વિષય "Delete my Tiles Drop Saathi account" અને તમારો રજિસ્ટર્ડ મોબાઇલ નંબર આપો. અમે 30 દિવસમાં પુષ્ટિ કરીને વિનંતી પૂરી કરીશું.</li>
  </ul>
  <p>એકાઉન્ટ ડિલીટ થાય ત્યારે અમે તમારી પ્રોફાઇલ, રજિસ્ટ્રેશનની માહિતી, લોકેશન હિસ્ટ્રી અને ફોટા ડિલીટ કરીએ છીએ અથવા તેમાંથી તમારી ઓળખ દૂર કરીએ છીએ. જે પૂરી થયેલી ટ્રિપ અને ચુકવણીના રેકોર્ડ કાયદા હેઠળ રાખવા જરૂરી હોય, તે અમે રાખી શકીએ છીએ અને તે સમય પૂરો થાય ત્યારે ડિલીટ કરીએ છીએ.</p>

  <h2>7. બાળકો</h2>
  <p>આ એપ ફક્ત પુખ્ત ડ્રાઇવરો (18 વર્ષ અને તેથી વધુ) માટે છે જેમની પાસે માન્ય ડ્રાઇવિંગ લાઇસન્સ હોય. અમે જાણીજોઈને બાળકોની માહિતી લેતા નથી.</p>

  <h2>8. આ પોલિસીમાં ફેરફાર</h2>
  <p>અમે આ પોલિસી બદલી શકીએ છીએ. નવું વર્ઝન હંમેશા અહીં જ મળશે, છેલ્લા ફેરફારની તારીખ સાથે.</p>

  <h2>9. અમારો સંપર્ક કરો</h2>
  <p>Tiles Drop, મોરબી, ગુજરાત, ભારત<br>
  ઈમેલ: <a href="mailto:${MAIL}">${MAIL}</a><br>
  ફોન: <a href="tel:+919737201001">+91 9737201001</a></p>`,
  },
};

/** The full page, styled like the website's, ready for a WebView. */
export function privacyPolicyHtml(language: Language): string {
  const { title, updated, body } = COPY[language];
  return `<!doctype html>
<html lang="${language}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
  :root { --text: #3f5f6b; --heading: #003547; --header: #0a3f52; --footer: #001f2a; --bg: #f7fafb; }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; color: var(--text); background: var(--bg); line-height: 1.65; }
  header { background: var(--header); color: #fff; padding: 28px 16px; text-align: center; }
  header h1 { margin: 0; font-size: 1.6rem; }
  header p { margin: 6px 0 0; opacity: .85; }
  main { max-width: 820px; margin: 0 auto; padding: 24px 16px 48px; }
  h2 { color: var(--heading); font-size: 1.15rem; margin-top: 32px; }
  ul { padding-left: 22px; }
  li { margin: 4px 0; }
  .box { background: #fff; border-left: 4px solid var(--heading); padding: 14px 18px; border-radius: 6px; }
  footer { background: var(--footer); color: #cfdde2; text-align: center; padding: 20px 16px; font-size: .9rem; }
  a { color: var(--heading); }
</style>
</head>
<body>
<header>
  <h1>${title}</h1>
  <p>${updated}</p>
</header>
<main>${body}
</main>
<footer>© 2026 Tiles Drop · Morbi | Pune | Mumbai</footer>
</body>
</html>`;
}
