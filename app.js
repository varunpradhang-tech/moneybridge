import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  RecaptchaVerifier,
  signInWithPhoneNumber
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import {
  addDoc,
  collection,
  doc,
  getDocs,
  getFirestore,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCC2x7648Che9NmplEif4q8tZcU8ukkZmg",
  authDomain: "moneybridge-8e31e.firebaseapp.com",
  projectId: "moneybridge-8e31e",
  storageBucket: "moneybridge-8e31e.firebasestorage.app",
  messagingSenderId: "216525072413",
  appId: "1:216525072413:web:5a7a4d8b748bd1f9c73ef4",
  measurementId: "G-4V4T4ZNTPR"
};

const firebaseApp = initializeApp(firebaseConfig);
const firebaseAuth = getAuth(firebaseApp);
const firebaseDb = getFirestore(firebaseApp);
firebaseAuth.useDeviceLanguage();

const demoListings = [
  {
    name: "Nisha Shah",
    type: "provider",
    city: "Mumbai",
    distance: "2.4 km",
    amount: 250000,
    interest: 14,
    duration: "12 months",
    verified: true,
    initials: "NS",
    terms: "Business loan only. Monthly repayment, signed agreement, verified PAN and two references required."
  },
  {
    name: "Amit Verma",
    type: "receiver",
    city: "Delhi",
    distance: "4.1 km",
    amount: 85000,
    interest: 16,
    duration: "8 months",
    verified: true,
    initials: "AV",
    terms: "Needs funds for medical bills. Can repay monthly with bank transfer proof and employment details."
  },
  {
    name: "Priya Nair",
    type: "provider",
    city: "Bengaluru",
    distance: "6.7 km",
    amount: 500000,
    interest: 12,
    duration: "18 months",
    verified: true,
    initials: "PN",
    terms: "Prefers salaried borrowers. Requires ID verification, income proof and repayment schedule."
  },
  {
    name: "Rahul Mehta",
    type: "receiver",
    city: "Pune",
    distance: "3.5 km",
    amount: 120000,
    interest: 18,
    duration: "10 months",
    verified: false,
    initials: "RM",
    terms: "Requires working capital for shop inventory. Open to weekly or monthly repayment."
  },
  {
    name: "Farah Khan",
    type: "provider",
    city: "Hyderabad",
    distance: "5.2 km",
    amount: 150000,
    interest: 10,
    duration: "6 months",
    verified: true,
    initials: "FK",
    terms: "Short-term loans for emergency needs. Requires signed digital agreement and location verification."
  },
  {
    name: "Dev Patel",
    type: "receiver",
    city: "Mumbai",
    distance: "1.9 km",
    amount: 45000,
    interest: 15,
    duration: "5 months",
    verified: true,
    initials: "DP",
    terms: "Education fee support. Can repay from monthly salary, documents available after match."
  }
];

let listings = [...demoListings];

listings[0].purpose = "Business";
listings[0].mobileVerified = true;
listings[0].aadharVerified = true;
listings[0].premium = true;
listings[0].phone = "+91 90000 11111";
listings[1].purpose = "Medical";
listings[1].mobileVerified = true;
listings[1].aadharVerified = true;
listings[1].premium = false;
listings[1].phone = "+91 90000 22222";
listings[2].purpose = "Let's discuss";
listings[2].mobileVerified = true;
listings[2].aadharVerified = true;
listings[2].premium = true;
listings[2].phone = "+91 90000 33333";
listings[3].purpose = "Business";
listings[3].mobileVerified = false;
listings[3].aadharVerified = false;
listings[3].premium = false;
listings[3].phone = "+91 90000 44444";
listings[4].purpose = "Personal emergency";
listings[4].mobileVerified = true;
listings[4].aadharVerified = true;
listings[4].premium = false;
listings[4].phone = "+91 90000 55555";
listings[5].purpose = "Education";
listings[5].mobileVerified = true;
listings[5].aadharVerified = true;
listings[5].premium = false;
listings[5].phone = "+91 90000 66666";

const messages = [
  ["Nisha Shah", "Shared lending terms for ₹2.5L", "10:42", "NS"],
  ["Amit Verma", "Requested profile verification review", "Yesterday", "AV"],
  ["Priya Nair", "Asked about repayment duration", "Mon", "PN"]
];

const listingGrid = document.querySelector("#listingGrid");
const resultCount = document.querySelector("#resultCount");
const searchInput = document.querySelector("#searchInput");
const locationFilter = document.querySelector("#locationFilter");
const typeFilter = document.querySelector("#typeFilter");
const interestFilter = document.querySelector("#interestFilter");
const amountFilter = document.querySelector("#amountFilter");
const purposeFilter = document.querySelector("#purposeFilter");
const verificationFilter = document.querySelector("#verificationFilter");
const detailDialog = document.querySelector("#detailDialog");
const detailName = document.querySelector("#detailName");
const detailBody = document.querySelector("#detailBody");
const postDialog = document.querySelector("#postDialog");
const themeSelect = document.querySelector("#themeSelect");
const languageSelect = document.querySelector("#languageSelect");
const notificationToggle = document.querySelector("#notificationToggle");
const notificationStatus = document.querySelector("#notificationStatus");
const permissionBtn = document.querySelector("#permissionBtn");
const shareReferralBtn = document.querySelector("#shareReferralBtn");
const shareStatus = document.querySelector("#shareStatus");
const referCode = document.querySelector("#referCode");
const contactVisibility = document.querySelector("#contactVisibility");
const otpDialog = document.querySelector("#otpDialog");
const borrowerSignupBtn = document.querySelector("#borrowerSignupBtn");
const borrowerSignupStatus = document.querySelector("#borrowerSignupStatus");
const otpHelp = document.querySelector("#otpHelp");
const otpMobile = document.querySelector("#otpMobile");
const otpInput = document.querySelector("#otpInput");
const borrowerPurpose = document.querySelector("#borrowerPurpose");
const sendOtpBtn = document.querySelector("#sendOtpBtn");
const paymentStatus = document.querySelector("#paymentStatus");
const termsDialog = document.querySelector("#termsDialog");
const termsAccept = document.querySelector("#termsAccept");
const acceptTermsBtn = document.querySelector("#acceptTermsBtn");
let recaptchaVerifier;
let firebaseOtpConfirmation;
const blockedUsers = new Set(JSON.parse(localStorage.getItem("moneybridge-blocked-users") || "[]"));
let freeLeadsUsed = Number(localStorage.getItem("moneybridge-free-leads-used") || "0");
let paidLeadCredits = Number(localStorage.getItem("moneybridge-paid-lead-credits") || "0");
let monthlyPostsUsed = Number(localStorage.getItem("moneybridge-monthly-posts-used") || "0");
let isPremiumUser = localStorage.getItem("moneybridge-premium-active") === "true";
let isVerifiedUser = localStorage.getItem("moneybridge-verified-profile") === "true";

const currency = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0
});

const paymentPlans = {
  verified: { label: "Verified profile", amount: 19900, display: "₹199" },
  lead: { label: "Lead unlock", amount: 2000, display: "₹20" },
  premium: { label: "Premium listing", amount: 49900, display: "₹499/month" }
};

const translations = {
  en: {
    home: "Home", settings: "Settings", profile: "Profile", messages: "Messages", post: "Post",
    eyebrow: "Verified lending marketplace", searchPlaceholder: "Search by amount, city, name, lender or receiver",
    location: "Location", type: "Type", maxInterest: "Max interest", amount: "Amount", all: "All", any: "Any",
    verification: "Verification", allUsers: "All users", verifiedOnlyUsers: "Verified users only", unverifiedOnlyUsers: "Unverified users only",
    provider: "Provider", receiver: "Receiver", providing: "Providing", requiring: "Requiring",
    verifiedMarked: "Govt. ID verified profiles are marked", settingsIntro: "Control security, notifications, location and account preferences.",
    theme: "Theme", themeHelp: "Choose how the app looks on this device.", systemTheme: "Use device setting", light: "Light", dark: "Dark",
    language: "Language", languageHelp: "Choose your preferred app language.", useLocation: "Use current location",
    useLocationHelp: "Show nearby providers and receivers first.", alerts: "New match alerts", alertsHelp: "Notify when a matching amount appears near you.",
    permissionHelp: "Browser permission is required before alerts can be sent.", notSupported: "Notifications not supported",
    enabled: "Notifications enabled", blocked: "Notifications blocked in browser", notEnabled: "Notifications not enabled", allow: "Allow",
    hideAddress: "Hide exact address", hideAddressHelp: "Only city and distance will be visible publicly.",
    requireVerified: "Require verified ID to message", requireVerifiedHelp: "Reduce spam and unsafe contact.",
    refer: "Refer & Earn", referHelp: "Invite verified users and earn rewards after their first completed agreement.", shareInvite: "Share invite",
    inviteShared: "Invite shared.", inviteCopied: "Referral invite copied.", inviteText: "Join me on MoneyBridge with referral code",
    contactVisibility: "Contact visibility", contactVisibilityHelp: "Choose who can see your mobile number.",
    matchedOnly: "Only matched users", verifiedOnly: "Verified users only", everyone: "Everyone", hidden: "Hide from everyone",
    borrowerOtpSignup: "Borrower mobile OTP signup", borrowerNotVerified: "Borrower mobile not verified", borrowerVerified: "Borrower mobile verified",
    sendOtp: "Send OTP", enterOtp: "Enter OTP", otpHelp: "Enter your mobile number, complete the security check, then send OTP.", verifyBorrower: "Verify and create borrower account",
    otpSent: "OTP sent:", otpInvalid: "Invalid OTP. Please check the code and try again.", contactRule: "Contact visibility",
    loanPurpose: "Loan purpose", letsDiscuss: "Let's discuss", mobileVerified: "Mobile verified", aadharVerified: "Aadhaar verified",
    premiumListing: "Premium listing", reportUser: "Report user", blockUser: "Block user", userBlocked: "User blocked from your home feed.",
    userReported: "Report saved for admin review.", paymentReady: "Razorpay integration placeholder ready for", verifiedProfilePlan: "Verified profile",
    premiumPlan: "Premium listing", leadPlan: "Lead unlock", termsRequired: "Please accept terms to continue.",
    freeLeadNotice: "First 3 leads are free. After that each contact/chat lead is ₹20.",
    verifyBoost: "Verified users have a higher chance of getting deals. Get verified to build trust and move your listings above normal free listings.",
    verifyBeforeLead: "Please verify your profile first. ₹20 lead unlock is available only for verified users.",
    verifiedNow: "Profile verified. Your listings now get better trust and higher placement than normal free listings.",
    freeLeadUsed: "Free lead used", leadUnlocked: "Lead unlocked. Contact number:", buyLeadNeeded: "Free leads finished. Buy a ₹20 lead to see contact number or chat.",
    paidLeadUsed: "Paid lead used", premiumActive: "Premium active: unlimited posts and top results.", freePostLimit: "Free listing limit reached: 3 posts per month. Buy Premium for ₹499/month for unlimited posts.",
    postPlanFree: "Free listing: 3 posts per month. Premium: unlimited posts and top results.",
    idVerified: "Govt. ID verified", pending: "Verification pending", viewProfile: "View profile", message: "Message",
    interest: "interest", moneyProvider: "Money provider", moneyReceiver: "Money receiver", duration: "Duration",
    startSecureMessage: "Start secure message", messagesIntro: "Conversations with matched lenders and receivers.",
    createPost: "Create post", profiles: "profiles", profileSingle: "profile"
  },
  hi: {
    home: "होम", settings: "सेटिंग्स", profile: "प्रोफाइल", messages: "संदेश", post: "पोस्ट",
    eyebrow: "सत्यापित ऋण मार्केटप्लेस", searchPlaceholder: "राशि, शहर, नाम, lender या receiver से खोजें",
    location: "स्थान", type: "प्रकार", maxInterest: "अधिकतम ब्याज", amount: "राशि", all: "सभी", any: "कोई भी",
    verification: "Verification", allUsers: "सभी users", verifiedOnlyUsers: "केवल verified users", unverifiedOnlyUsers: "केवल unverified users",
    provider: "देने वाला", receiver: "लेने वाला", providing: "दे रहे हैं", requiring: "चाहिए",
    verifiedMarked: "सरकारी ID सत्यापित प्रोफाइल चिह्नित हैं", settingsIntro: "सुरक्षा, सूचनाएं, स्थान और खाते की सेटिंग नियंत्रित करें।",
    theme: "थीम", themeHelp: "इस डिवाइस पर ऐप कैसा दिखे चुनें।", systemTheme: "डिवाइस सेटिंग", light: "लाइट", dark: "डार्क",
    language: "भाषा", languageHelp: "अपनी पसंदीदा ऐप भाषा चुनें।", useLocation: "वर्तमान स्थान उपयोग करें",
    useLocationHelp: "पास के providers और receivers पहले दिखाएं।", alerts: "नई मैच alerts", alertsHelp: "नजदीक matching amount आए तो सूचित करें।",
    permissionHelp: "Alerts भेजने के लिए browser permission चाहिए।", notSupported: "Notifications supported नहीं हैं",
    enabled: "Notifications enabled", blocked: "Notifications browser में blocked हैं", notEnabled: "Notifications enabled नहीं हैं", allow: "अनुमति दें",
    hideAddress: "सटीक पता छिपाएं", hideAddressHelp: "सार्वजनिक रूप से केवल शहर और दूरी दिखेगी।",
    requireVerified: "Message के लिए verified ID जरूरी", requireVerifiedHelp: "Spam और unsafe contact कम करें।",
    refer: "Refer & Earn", referHelp: "Verified users को invite करें और reward earn करें।", shareInvite: "Invite share करें",
    inviteShared: "Invite share हो गया।", inviteCopied: "Referral invite copy हो गया।", inviteText: "MoneyBridge पर मेरे साथ जुड़ें, referral code",
    contactVisibility: "Contact visibility", contactVisibilityHelp: "कौन आपका मोबाइल नंबर देख सकता है, चुनें।",
    matchedOnly: "केवल matched users", verifiedOnly: "केवल verified users", everyone: "सभी", hidden: "सबसे छिपाएं",
    borrowerOtpSignup: "Borrower mobile OTP signup", borrowerNotVerified: "Borrower mobile verified नहीं है", borrowerVerified: "Borrower mobile verified",
    sendOtp: "OTP भेजें", enterOtp: "OTP दर्ज करें", otpHelp: "Mobile number डालें, security check पूरा करें, फिर OTP भेजें।", verifyBorrower: "Verify करके borrower account बनाएं",
    otpSent: "OTP भेजा गया:", otpInvalid: "गलत OTP. Code check करके फिर try करें।", contactRule: "Contact visibility",
    loanPurpose: "Loan purpose", letsDiscuss: "Let's discuss", mobileVerified: "Mobile verified", aadharVerified: "Aadhaar verified",
    premiumListing: "Premium listing", reportUser: "User report करें", blockUser: "User block करें", userBlocked: "User home feed से block हो गया।",
    userReported: "Report admin review के लिए save हो गई।", paymentReady: "Razorpay integration placeholder ready for", verifiedProfilePlan: "Verified profile",
    premiumPlan: "Premium listing", leadPlan: "Lead unlock", termsRequired: "Continue करने के लिए terms accept करें।",
    freeLeadNotice: "पहले 3 leads free हैं। उसके बाद contact/chat lead ₹20 की होगी।",
    verifyBoost: "Verified users की deals मिलने की chance ज्यादा होती है। Trust बढ़ाने और free listings से ऊपर दिखने के लिए profile verify करें।",
    verifyBeforeLead: "पहले profile verify करें। ₹20 lead unlock केवल verified users के लिए है।",
    verifiedNow: "Profile verified. आपकी listings normal free listings से ऊपर दिखेंगी।",
    freeLeadUsed: "Free lead used", leadUnlocked: "Lead unlocked. Contact number:", buyLeadNeeded: "Free leads खत्म हो गईं। Contact number या chat के लिए ₹20 lead खरीदें।",
    paidLeadUsed: "Paid lead used", premiumActive: "Premium active: unlimited posts और top results.", freePostLimit: "Free listing limit reached: महीने में 3 posts. Unlimited posts के लिए ₹499/month Premium खरीदें।",
    postPlanFree: "Free listing: महीने में 3 posts. Premium: unlimited posts और top results.",
    idVerified: "सरकारी ID verified", pending: "Verification pending", viewProfile: "Profile देखें", message: "Message",
    interest: "ब्याज", moneyProvider: "Money provider", moneyReceiver: "Money receiver", duration: "अवधि",
    startSecureMessage: "Secure message शुरू करें", messagesIntro: "Matched lenders और receivers से बातचीत।",
    createPost: "Post बनाएं", profiles: "profiles", profileSingle: "profile"
  },
  pa: { home: "ਹੋਮ", settings: "ਸੈਟਿੰਗਜ਼", profile: "ਪ੍ਰੋਫਾਈਲ", messages: "ਸੁਨੇਹੇ", post: "ਪੋਸਟ", language: "ਭਾਸ਼ਾ", languageHelp: "ਆਪਣੀ ਪਸੰਦੀਦਾ ਐਪ ਭਾਸ਼ਾ ਚੁਣੋ।", providing: "ਦੇ ਰਹੇ ਹਨ", requiring: "ਲੋੜ ਹੈ", provider: "ਦੇਣ ਵਾਲਾ", receiver: "ਲੈਣ ਵਾਲਾ", location: "ਸਥਾਨ", type: "ਕਿਸਮ", amount: "ਰਕਮ", all: "ਸਭ", any: "ਕੋਈ ਵੀ", theme: "ਥੀਮ", light: "ਲਾਈਟ", dark: "ਡਾਰਕ", settingsIntro: "ਸੁਰੱਖਿਆ, ਨੋਟੀਫਿਕੇਸ਼ਨ, ਸਥਾਨ ਅਤੇ ਖਾਤਾ ਸੈਟਿੰਗਾਂ ਕੰਟਰੋਲ ਕਰੋ।", refer: "Refer & Earn", shareInvite: "Invite share ਕਰੋ", viewProfile: "ਪ੍ਰੋਫਾਈਲ ਵੇਖੋ", message: "ਸੁਨੇਹਾ" },
  mr: { home: "होम", settings: "सेटिंग्ज", profile: "प्रोफाइल", messages: "संदेश", post: "पोस्ट", language: "भाषा", languageHelp: "तुमची पसंतीची अॅप भाषा निवडा.", providing: "देणारे", requiring: "आवश्यक", provider: "देणारा", receiver: "घेणारा", location: "स्थान", type: "प्रकार", amount: "रक्कम", all: "सर्व", any: "कोणतेही", theme: "थीम", light: "लाईट", dark: "डार्क", settingsIntro: "सुरक्षा, सूचना, स्थान आणि खाते सेटिंग्ज नियंत्रित करा.", refer: "Refer & Earn", shareInvite: "Invite share करा", viewProfile: "प्रोफाइल पहा", message: "संदेश" },
  gu: { home: "હોમ", settings: "સેટિંગ્સ", profile: "પ્રોફાઇલ", messages: "સંદેશા", post: "પોસ્ટ", language: "ભાષા", languageHelp: "તમારી પસંદગીની એપ ભાષા પસંદ કરો.", providing: "આપી રહ્યા છે", requiring: "જરૂર છે", provider: "આપનાર", receiver: "લેનાર", location: "સ્થાન", type: "પ્રકાર", amount: "રકમ", all: "બધા", any: "કોઈપણ", theme: "થીમ", light: "લાઇટ", dark: "ડાર્ક", settingsIntro: "સુરક્ષા, સૂચનાઓ, સ્થાન અને એકાઉન્ટ સેટિંગ્સ નિયંત્રિત કરો.", refer: "Refer & Earn", shareInvite: "Invite share કરો", viewProfile: "પ્રોફાઇલ જુઓ", message: "સંદેશ" },
  ta: { home: "முகப்பு", settings: "அமைப்புகள்", profile: "சுயவிவரம்", messages: "செய்திகள்", post: "பதிவு", language: "மொழி", languageHelp: "உங்களுக்கு விருப்பமான பயன்பாட்டு மொழியைத் தேர்வுசெய்க.", providing: "வழங்குபவர்", requiring: "தேவைப்படுபவர்", provider: "வழங்குபவர்", receiver: "பெறுபவர்", location: "இருப்பிடம்", type: "வகை", amount: "தொகை", all: "அனைத்தும்", any: "எதுவும்", theme: "தீம்", light: "ஒளி", dark: "இருள்", settingsIntro: "பாதுகாப்பு, அறிவிப்புகள், இருப்பிடம் மற்றும் கணக்கு அமைப்புகளை கட்டுப்படுத்தவும்.", refer: "Refer & Earn", shareInvite: "அழைப்பை பகிர்", viewProfile: "சுயவிவரம் காண்க", message: "செய்தி" },
  te: { home: "హోమ్", settings: "సెట్టింగ్స్", profile: "ప్రొఫైల్", messages: "సందేశాలు", post: "పోస్ట్", language: "భాష", languageHelp: "మీకు ఇష్టమైన యాప్ భాషను ఎంచుకోండి.", providing: "ఇస్తున్నారు", requiring: "అవసరం", provider: "ఇచ్చేవారు", receiver: "తీసుకునేవారు", location: "లొకేషన్", type: "రకం", amount: "మొత్తం", all: "అన్నీ", any: "ఏదైనా", theme: "థీమ్", light: "లైట్", dark: "డార్క్", settingsIntro: "భద్రత, నోటిఫికేషన్లు, లొకేషన్ మరియు అకౌంట్ సెట్టింగ్స్ నియంత్రించండి.", refer: "Refer & Earn", shareInvite: "ఆహ్వానం షేర్ చేయండి", viewProfile: "ప్రొఫైల్ చూడండి", message: "సందేశం" },
  kn: { home: "ಮುಖಪುಟ", settings: "ಸೆಟ್ಟಿಂಗ್ಸ್", profile: "ಪ್ರೊಫೈಲ್", messages: "ಸಂದೇಶಗಳು", post: "ಪೋಸ್ಟ್", language: "ಭಾಷೆ", languageHelp: "ನಿಮ್ಮ ಮೆಚ್ಚಿನ ಆಪ್ ಭಾಷೆಯನ್ನು ಆಯ್ಕೆಮಾಡಿ.", providing: "ನೀಡುವವರು", requiring: "ಅಗತ್ಯವಿರುವವರು", provider: "ನೀಡುವವರು", receiver: "ಪಡೆಯುವವರು", location: "ಸ್ಥಳ", type: "ಪ್ರಕಾರ", amount: "ಮೊತ್ತ", all: "ಎಲ್ಲ", any: "ಯಾವುದೇ", theme: "ಥೀಮ್", light: "ಲೈಟ್", dark: "ಡಾರ್ಕ್", settingsIntro: "ಭದ್ರತೆ, ಸೂಚನೆಗಳು, ಸ್ಥಳ ಮತ್ತು ಖಾತೆ ಸೆಟ್ಟಿಂಗ್ಸ್ ನಿಯಂತ್ರಿಸಿ.", refer: "Refer & Earn", shareInvite: "ಆಹ್ವಾನ ಹಂಚಿಕೊಳ್ಳಿ", viewProfile: "ಪ್ರೊಫೈಲ್ ನೋಡಿ", message: "ಸಂದೇಶ" },
  or: { home: "ହୋମ୍", settings: "ସେଟିଂସ୍", profile: "ପ୍ରୋଫାଇଲ୍", messages: "ସନ୍ଦେଶ", post: "ପୋଷ୍ଟ", language: "ଭାଷା", languageHelp: "ଆପଣଙ୍କ ପସନ୍ଦର ଆପ୍ ଭାଷା ବାଛନ୍ତୁ।", providing: "ଦେଉଛନ୍ତି", requiring: "ଆବଶ୍ୟକ", provider: "ଦେବାଳା", receiver: "ନେବାଳା", location: "ସ୍ଥାନ", type: "ପ୍ରକାର", amount: "ରାଶି", all: "ସମସ୍ତ", any: "ଯେକୌଣସି", theme: "ଥିମ୍", light: "ଲାଇଟ୍", dark: "ଡାର୍କ", settingsIntro: "ସୁରକ୍ଷା, ସୂଚନା, ସ୍ଥାନ ଓ ଖାତା ସେଟିଂସ୍ ନିୟନ୍ତ୍ରଣ କରନ୍ତୁ।", refer: "Refer & Earn", shareInvite: "ଆମନ୍ତ୍ରଣ ସେୟାର କରନ୍ତୁ", viewProfile: "ପ୍ରୋଫାଇଲ୍ ଦେଖନ୍ତୁ", message: "ସନ୍ଦେଶ" },
  bn: { home: "হোম", settings: "সেটিংস", profile: "প্রোফাইল", messages: "বার্তা", post: "পোস্ট", language: "ভাষা", languageHelp: "আপনার পছন্দের অ্যাপ ভাষা বেছে নিন।", providing: "দিচ্ছেন", requiring: "প্রয়োজন", provider: "দাতা", receiver: "গ্রহীতা", location: "লোকেশন", type: "ধরন", amount: "পরিমাণ", all: "সব", any: "যেকোনো", theme: "থিম", light: "লাইট", dark: "ডার্ক", settingsIntro: "নিরাপত্তা, নোটিফিকেশন, লোকেশন এবং অ্যাকাউন্ট সেটিংস নিয়ন্ত্রণ করুন।", refer: "Refer & Earn", shareInvite: "আমন্ত্রণ শেয়ার করুন", viewProfile: "প্রোফাইল দেখুন", message: "বার্তা" },
  es: { home: "Inicio", settings: "Ajustes", profile: "Perfil", messages: "Mensajes", post: "Publicar", language: "Idioma", languageHelp: "Elige tu idioma preferido.", providing: "Ofrece", requiring: "Necesita", provider: "Proveedor", receiver: "Receptor", location: "Ubicación", type: "Tipo", amount: "Importe", all: "Todo", any: "Cualquiera", theme: "Tema", light: "Claro", dark: "Oscuro", settingsIntro: "Controla seguridad, notificaciones, ubicación y cuenta.", refer: "Invita y gana", shareInvite: "Compartir invitación", viewProfile: "Ver perfil", message: "Mensaje" },
  zh: { home: "首页", settings: "设置", profile: "资料", messages: "消息", post: "发布", language: "语言", languageHelp: "选择首选应用语言。", providing: "提供资金", requiring: "需要资金", provider: "提供者", receiver: "接收者", location: "位置", type: "类型", amount: "金额", all: "全部", any: "任意", theme: "主题", light: "浅色", dark: "深色", settingsIntro: "管理安全、通知、位置和账户偏好。", refer: "推荐赚取", shareInvite: "分享邀请", viewProfile: "查看资料", message: "消息" },
  de: { home: "Start", settings: "Einstellungen", profile: "Profil", messages: "Nachrichten", post: "Posten", language: "Sprache", languageHelp: "Wähle deine bevorzugte App-Sprache.", providing: "Bietet an", requiring: "Benötigt", provider: "Anbieter", receiver: "Empfänger", location: "Standort", type: "Typ", amount: "Betrag", all: "Alle", any: "Beliebig", theme: "Design", light: "Hell", dark: "Dunkel", settingsIntro: "Sicherheit, Benachrichtigungen, Standort und Konto steuern.", refer: "Empfehlen & verdienen", shareInvite: "Einladung teilen", viewProfile: "Profil ansehen", message: "Nachricht" }
};

translations.fr = { home: "Accueil", settings: "Paramètres", profile: "Profil", messages: "Messages", post: "Publier", language: "Langue", languageHelp: "Choisissez la langue de l'application.", providing: "Propose", requiring: "Recherche", provider: "Fournisseur", receiver: "Demandeur", location: "Lieu", type: "Type", amount: "Montant", all: "Tous", any: "Tous", theme: "Thème", light: "Clair", dark: "Sombre", settingsIntro: "Contrôlez la sécurité, les notifications, la localisation et le compte.", refer: "Parrainer et gagner", shareInvite: "Partager l'invitation", viewProfile: "Voir le profil", message: "Message" };
translations.ar = { home: "الرئيسية", settings: "الإعدادات", profile: "الملف الشخصي", messages: "الرسائل", post: "نشر", language: "اللغة", languageHelp: "اختر لغة التطبيق المفضلة.", providing: "يقدم", requiring: "يحتاج", provider: "مقدم", receiver: "مستلم", location: "الموقع", type: "النوع", amount: "المبلغ", all: "الكل", any: "أي", theme: "المظهر", light: "فاتح", dark: "داكن", settingsIntro: "تحكم في الأمان والإشعارات والموقع والحساب.", refer: "ادع واربح", shareInvite: "مشاركة الدعوة", viewProfile: "عرض الملف", message: "رسالة" };
translations.pt = { home: "Início", settings: "Configurações", profile: "Perfil", messages: "Mensagens", post: "Publicar", language: "Idioma", languageHelp: "Escolha o idioma preferido.", providing: "Oferece", requiring: "Precisa", provider: "Fornecedor", receiver: "Recebedor", location: "Localização", type: "Tipo", amount: "Valor", all: "Todos", any: "Qualquer", theme: "Tema", light: "Claro", dark: "Escuro", settingsIntro: "Controle segurança, notificações, localização e conta.", refer: "Indique e ganhe", shareInvite: "Compartilhar convite", viewProfile: "Ver perfil", message: "Mensagem" };
translations.ru = { home: "Главная", settings: "Настройки", profile: "Профиль", messages: "Сообщения", post: "Опубликовать", language: "Язык", languageHelp: "Выберите язык приложения.", providing: "Предлагает", requiring: "Требуется", provider: "Поставщик", receiver: "Получатель", location: "Местоположение", type: "Тип", amount: "Сумма", all: "Все", any: "Любой", theme: "Тема", light: "Светлая", dark: "Темная", settingsIntro: "Управляйте безопасностью, уведомлениями, местоположением и аккаунтом.", refer: "Пригласи и заработай", shareInvite: "Поделиться приглашением", viewProfile: "Смотреть профиль", message: "Сообщение" };
translations.ja = { home: "ホーム", settings: "設定", profile: "プロフィール", messages: "メッセージ", post: "投稿", language: "言語", languageHelp: "アプリの言語を選択してください。", providing: "提供中", requiring: "必要", provider: "提供者", receiver: "受取人", location: "場所", type: "種類", amount: "金額", all: "すべて", any: "任意", theme: "テーマ", light: "ライト", dark: "ダーク", settingsIntro: "セキュリティ、通知、位置情報、アカウントを管理します。", refer: "紹介して獲得", shareInvite: "招待を共有", viewProfile: "プロフィールを見る", message: "メッセージ" };
translations.ko = { home: "홈", settings: "설정", profile: "프로필", messages: "메시지", post: "게시", language: "언어", languageHelp: "원하는 앱 언어를 선택하세요.", providing: "제공 중", requiring: "필요함", provider: "제공자", receiver: "수신자", location: "위치", type: "유형", amount: "금액", all: "전체", any: "상관없음", theme: "테마", light: "라이트", dark: "다크", settingsIntro: "보안, 알림, 위치 및 계정 설정을 관리합니다.", refer: "추천하고 받기", shareInvite: "초대 공유", viewProfile: "프로필 보기", message: "메시지" };

function t(key) {
  const language = languageSelect?.value || localStorage.getItem("moneybridge-language") || "en";
  return translations[language]?.[key] || translations.en[key] || key;
}

function setText(selector, value) {
  document.querySelectorAll(selector).forEach((element) => {
    element.textContent = value;
  });
}

function setOptionText(selector, value, text) {
  const option = document.querySelector(`${selector} option[value="${value}"]`);
  if (option) option.textContent = text;
}

function applyTheme(theme) {
  if (theme === "system") {
    document.documentElement.removeAttribute("data-theme");
  } else {
    document.documentElement.setAttribute("data-theme", theme);
  }
  localStorage.setItem("moneybridge-theme", theme);
  themeSelect.value = theme;
}

function updateNotificationStatus() {
  if (!("Notification" in window)) {
    notificationStatus.textContent = t("notSupported");
    permissionBtn.disabled = true;
    notificationToggle.disabled = true;
    return;
  }

  const permission = Notification.permission;
  notificationStatus.textContent = permission === "granted"
    ? t("enabled")
    : permission === "denied"
      ? t("blocked")
      : t("notEnabled");
  notificationToggle.checked = permission === "granted";
  permissionBtn.textContent = permission === "granted" ? t("enabled") : t("allow");
  permissionBtn.disabled = permission === "granted";
}

function applyLanguage(language) {
  localStorage.setItem("moneybridge-language", language);
  languageSelect.value = language;
  document.documentElement.lang = language;
  translatePage();
  renderListings();
  renderMessages();
  updateNotificationStatus();
}

function setContactVisibility(value) {
  localStorage.setItem("moneybridge-contact-visibility", value);
  contactVisibility.value = value;
}

function setBorrowerVerified(isVerified) {
  localStorage.setItem("moneybridge-borrower-verified", String(isVerified));
  borrowerSignupStatus.textContent = isVerified ? t("borrowerVerified") : t("borrowerNotVerified");
}

async function saveUserProfile(user, extra = {}) {
  if (!user?.uid) return;
  await setDoc(doc(firebaseDb, "users", user.uid), {
    phone: user.phoneNumber || localStorage.getItem("moneybridge-borrower-mobile") || "",
    mobileVerified: Boolean(user.phoneNumber) || localStorage.getItem("moneybridge-borrower-verified") === "true",
    borrowerPurpose: localStorage.getItem("moneybridge-borrower-purpose") || borrowerPurpose?.value || "Let's discuss",
    verifiedProfile: isVerifiedUser,
    premium: isPremiumUser,
    leadCredits: paidLeadCredits,
    updatedAt: serverTimestamp(),
    ...extra
  }, { merge: true });
}

async function updateCurrentUserProfile(extra = {}) {
  if (!firebaseAuth.currentUser) return;
  await saveUserProfile(firebaseAuth.currentUser, extra);
}

function listingFromDoc(snapshot) {
  const data = snapshot.data();
  return {
    id: snapshot.id,
    name: data.name || "MoneyBridge user",
    type: data.type || "receiver",
    city: data.city || "Mumbai",
    distance: data.distance || "Current location",
    amount: Number(data.amount || 0),
    interest: data.interest ?? "Let's discuss",
    duration: data.duration || "Let's discuss",
    verified: Boolean(data.verified),
    mobileVerified: Boolean(data.mobileVerified),
    aadharVerified: Boolean(data.aadharVerified),
    premium: Boolean(data.premium),
    purpose: data.purpose || "Let's discuss",
    initials: data.initials || "MB",
    phone: data.phone || "",
    terms: data.terms || "Terms can be discussed after matching."
  };
}

async function loadFirestoreListings() {
  try {
    const listingQuery = query(collection(firebaseDb, "listings"), orderBy("createdAt", "desc"), limit(50));
    const snapshot = await getDocs(listingQuery);
    const firestoreListings = snapshot.docs.map(listingFromDoc);
    listings = [...firestoreListings, ...demoListings];
    renderListings();
  } catch (error) {
    paymentStatus.textContent = `Database read needs Firestore rules update: ${error.message}`;
  }
}

async function saveListing(listing) {
  const user = firebaseAuth.currentUser;
  if (!user) {
    throw new Error("Please complete OTP login before publishing a real post.");
  }
  const docRef = await addDoc(collection(firebaseDb, "listings"), {
    ...listing,
    userId: user.uid,
    phone: user.phoneNumber || localStorage.getItem("moneybridge-borrower-mobile") || "",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
  return { ...listing, id: docRef.id };
}

async function savePaymentStatus(plan, payment = {}) {
  const user = firebaseAuth.currentUser;
  if (!user) return;
  await addDoc(collection(firebaseDb, "payments"), {
    userId: user.uid,
    plan,
    paymentId: payment.paymentId || "",
    orderId: payment.orderId || "",
    createdAt: serverTimestamp()
  });
  await updateCurrentUserProfile({
    verifiedProfile: isVerifiedUser,
    premium: isPremiumUser,
    leadCredits: paidLeadCredits
  });
}

function normalizePhoneNumber(value) {
  const cleaned = value.trim().replace(/[^\d+]/g, "");
  if (cleaned.startsWith("+")) return cleaned;
  if (cleaned.length === 10) return `+91${cleaned}`;
  return cleaned;
}

function getRecaptchaVerifier() {
  if (!recaptchaVerifier) {
    recaptchaVerifier = new RecaptchaVerifier(firebaseAuth, "recaptcha-container", {
      size: "normal",
      callback: () => {
        otpHelp.textContent = "Security check completed. You can send OTP now.";
      },
      "expired-callback": () => {
        otpHelp.textContent = "Security check expired. Please tick it again before sending OTP.";
      }
    });
  }
  return recaptchaVerifier;
}

function translatePage() {
  setText('.rail [data-view="home"] span:last-child, .bottom-nav [data-view="home"] small', t("home"));
  setText('.rail [data-view="settings"] span:last-child, .bottom-nav [data-view="settings"] small', t("settings"));
  setText('.rail [data-view="profile"] span:last-child, .bottom-nav [data-view="profile"] small', t("profile"));
  setText('.rail [data-view="messages"] span:last-child, .bottom-nav [data-view="messages"] small', t("messages"));
  document.querySelector("#desktopPostBtn").textContent = `+ ${t("post")}`;
  document.querySelector(".eyebrow").textContent = t("eyebrow");
  searchInput.placeholder = t("searchPlaceholder");
  document.querySelector(".filters label:nth-child(1)").childNodes[0].textContent = `${t("location")}\n              `;
  document.querySelector(".filters label:nth-child(2)").childNodes[0].textContent = `${t("type")}\n              `;
  document.querySelector(".filters label:nth-child(3)").childNodes[0].textContent = `${t("maxInterest")}\n              `;
  document.querySelector(".filters label:nth-child(4)").childNodes[0].textContent = `${t("amount")}\n              `;
  document.querySelector(".filters label:nth-child(5)").childNodes[0].textContent = `${t("loanPurpose")}\n              `;
  document.querySelector(".filters label:nth-child(6)").childNodes[0].textContent = `${t("verification")}\n              `;
  setOptionText("#locationFilter", "", t("all"));
  setOptionText("#typeFilter", "", t("all"));
  setOptionText("#typeFilter", "provider", t("provider"));
  setOptionText("#typeFilter", "receiver", t("receiver"));
  setOptionText("#interestFilter", "", t("any"));
  setOptionText("#amountFilter", "", t("any"));
  setOptionText("#purposeFilter", "", t("all"));
  setOptionText("#purposeFilter", "Let's discuss", t("letsDiscuss"));
  setOptionText("#verificationFilter", "", t("allUsers"));
  setOptionText("#verificationFilter", "verified", t("verifiedOnlyUsers"));
  setOptionText("#verificationFilter", "unverified", t("unverifiedOnlyUsers"));
  document.querySelector(".status-row span:last-child").textContent = t("verifiedMarked");
  document.querySelector("#settings .section-head h2").textContent = t("settings");
  document.querySelector("#settings .section-head p").textContent = t("settingsIntro");
  document.querySelector(".settings-list .toggle-row:nth-child(1) strong").textContent = t("theme");
  document.querySelector(".settings-list .toggle-row:nth-child(1) small").textContent = t("themeHelp");
  setOptionText("#themeSelect", "system", t("systemTheme"));
  setOptionText("#themeSelect", "light", t("light"));
  setOptionText("#themeSelect", "dark", t("dark"));
  document.querySelector(".settings-list .toggle-row:nth-child(2) strong").textContent = t("language");
  document.querySelector(".settings-list .toggle-row:nth-child(2) small").textContent = t("languageHelp");
  document.querySelector(".settings-list .toggle-row:nth-child(3) strong").textContent = t("useLocation");
  document.querySelector(".settings-list .toggle-row:nth-child(3) small").textContent = t("useLocationHelp");
  document.querySelector(".settings-list .toggle-row:nth-child(4) strong").textContent = t("alerts");
  document.querySelector(".settings-list .toggle-row:nth-child(4) small").textContent = t("alertsHelp");
  document.querySelector(".permission-row small").textContent = t("permissionHelp");
  document.querySelector(".settings-list .toggle-row:nth-child(6) strong").textContent = t("hideAddress");
  document.querySelector(".settings-list .toggle-row:nth-child(6) small").textContent = t("hideAddressHelp");
  document.querySelector(".settings-list .toggle-row:nth-child(7) strong").textContent = t("contactVisibility");
  document.querySelector(".settings-list .toggle-row:nth-child(7) small").textContent = t("contactVisibilityHelp");
  setOptionText("#contactVisibility", "matched", t("matchedOnly"));
  setOptionText("#contactVisibility", "verified", t("verifiedOnly"));
  setOptionText("#contactVisibility", "everyone", t("everyone"));
  setOptionText("#contactVisibility", "hidden", t("hidden"));
  document.querySelector(".settings-list .toggle-row:nth-child(8) strong").textContent = t("requireVerified");
  document.querySelector(".settings-list .toggle-row:nth-child(8) small").textContent = t("requireVerifiedHelp");
  document.querySelector(".refer-card strong").textContent = t("refer");
  document.querySelector(".refer-card small").textContent = t("referHelp");
  shareReferralBtn.textContent = t("shareInvite");
  borrowerSignupBtn.textContent = t("borrowerOtpSignup");
  borrowerSignupStatus.textContent = localStorage.getItem("moneybridge-borrower-verified") === "true" ? t("borrowerVerified") : t("borrowerNotVerified");
  document.querySelector("#messages .section-head h2").textContent = t("messages");
  document.querySelector("#messages .section-head p").textContent = t("messagesIntro");
  document.querySelector("#postDialog .dialog-head h2").textContent = t("createPost");
  document.querySelector("#postPlanStatus").textContent = isPremiumUser ? t("premiumActive") : `${t("postPlanFree")} Posts used: ${monthlyPostsUsed}/3.`;
  if (paymentStatus && !paymentStatus.textContent) {
    paymentStatus.textContent = `${t("verifyBoost")} ${t("freeLeadNotice")} Free leads used: ${freeLeadsUsed}/3. Paid lead credits: ${paidLeadCredits}.`;
  }
  document.querySelector("#otpDialog .dialog-head h2").textContent = t("borrowerOtpSignup");
  document.querySelector("#sendOtpBtn").textContent = t("sendOtp");
  document.querySelector("label[for='otpInput']");
}

function renderListings() {
  const query = searchInput.value.trim().toLowerCase();
  const maxInterest = Number(interestFilter.value || Infinity);
  const maxAmount = Number(amountFilter.value || Infinity);

  const filtered = listings.filter((item) => {
    const itemInterest = Number(item.interest);
    const searchable = `${item.name} ${item.type} ${item.city} ${item.amount} ${item.interest} ${item.purpose || ""}`.toLowerCase();
    return (!query || searchable.includes(query))
      && !blockedUsers.has(item.name)
      && (!locationFilter.value || item.city === locationFilter.value)
      && (!typeFilter.value || item.type === typeFilter.value)
      && (!purposeFilter.value || item.purpose === purposeFilter.value)
      && (!verificationFilter.value || (verificationFilter.value === "verified" ? item.verified : !item.verified))
      && (!Number.isFinite(maxInterest) || (Number.isFinite(itemInterest) && itemInterest <= maxInterest))
      && item.amount <= maxAmount;
  }).sort((a, b) => {
    const rank = (item) => item.premium ? 3 : item.verified ? 2 : 1;
    return rank(b) - rank(a);
  });

  resultCount.textContent = `${filtered.length} ${filtered.length === 1 ? t("profileSingle") : t("profiles")}`;
  listingGrid.innerHTML = filtered.map((item, index) => cardMarkup(item, index)).join("");

  listingGrid.querySelectorAll("[data-open]").forEach((button) => {
    button.addEventListener("click", () => showDetails(filtered[Number(button.dataset.open)]));
  });
  listingGrid.querySelectorAll("[data-lead]").forEach((button) => {
    button.addEventListener("click", () => unlockLead(filtered[Number(button.dataset.lead)]));
  });
}

function cardMarkup(item, index) {
  const noun = item.type === "provider" ? t("providing") : t("requiring");
  const interestText = Number.isFinite(Number(item.interest)) ? `${item.interest}% ${t("interest")}` : t("letsDiscuss");
  return `
    <article class="listing-card ${item.type}">
      <div class="card-top">
        <div class="avatar">${item.initials}</div>
        <div class="card-title">
          <h3>${item.name} <span class="name-status ${item.verified ? "ok" : "no"}">${item.verified ? "Verified" : "Unverified"}</span></h3>
          <p>${item.city} · ${item.distance}</p>
        </div>
      </div>
      <div class="badge-row">
        <span class="badge ${item.type}">${noun}</span>
        <span class="verified">${item.verified ? t("idVerified") : t("pending")}</span>
        ${item.mobileVerified ? `<span class="badge trust-badge">${t("mobileVerified")}</span>` : ""}
        ${item.aadharVerified ? `<span class="badge trust-badge">${t("aadharVerified")}</span>` : ""}
        ${item.premium ? `<span class="badge premium-badge">${t("premiumListing")}</span>` : ""}
      </div>
      <p class="amount">${currency.format(item.amount)}</p>
      <p class="terms">${interestText} · ${item.duration}<br>${t("loanPurpose")}: ${item.purpose || t("letsDiscuss")}<br>${item.terms}</p>
      <div class="card-actions">
        <button class="secondary-btn" data-open="${index}">${t("viewProfile")}</button>
        <button class="secondary-btn" data-lead="${index}">${t("message")}</button>
      </div>
    </article>
  `;
}

function showDetails(item) {
  const interestText = Number.isFinite(Number(item.interest)) ? `${item.interest}%` : t("letsDiscuss");
  detailName.innerHTML = `${item.name} <span class="name-status ${item.verified ? "ok" : "no"}">${item.verified ? "Verified" : "Unverified"}</span>`;
  detailBody.innerHTML = `
    <div class="badge-row">
      <span class="badge ${item.type}">${item.type === "provider" ? t("moneyProvider") : t("moneyReceiver")}</span>
      <span class="verified">${item.verified ? t("idVerified") : t("pending")}</span>
      ${item.mobileVerified ? `<span class="badge trust-badge">${t("mobileVerified")}</span>` : ""}
      ${item.aadharVerified ? `<span class="badge trust-badge">${t("aadharVerified")}</span>` : ""}
      ${item.premium ? `<span class="badge premium-badge">${t("premiumListing")}</span>` : ""}
    </div>
    <div class="detail-grid">
      <div class="detail-cell"><span>${t("amount")}</span>${currency.format(item.amount)}</div>
      <div class="detail-cell"><span>${t("interest")}</span>${interestText}</div>
      <div class="detail-cell"><span>${t("duration")}</span>${item.duration}</div>
      <div class="detail-cell"><span>${t("location")}</span>${item.city}, ${item.distance}</div>
      <div class="detail-cell"><span>${t("loanPurpose")}</span>${item.purpose || t("letsDiscuss")}</div>
      <div class="detail-cell"><span>${t("contactRule")}</span>${contactVisibility.options[contactVisibility.selectedIndex].text}</div>
    </div>
    <p class="terms">${item.terms}</p>
    <div class="detail-actions">
      <button class="primary-btn" data-action="message" type="button">${t("startSecureMessage")}</button>
      <button class="secondary-btn" data-action="report" type="button">${t("reportUser")}</button>
      <button class="danger-btn" data-action="block" type="button">${t("blockUser")}</button>
    </div>
  `;
  detailBody.querySelector('[data-action="message"]').addEventListener("click", () => unlockLead(item));
  detailBody.querySelector('[data-action="report"]').addEventListener("click", () => {
    detailBody.querySelector(".terms").textContent = t("userReported");
  });
  detailBody.querySelector('[data-action="block"]').addEventListener("click", () => {
    blockedUsers.add(item.name);
    localStorage.setItem("moneybridge-blocked-users", JSON.stringify([...blockedUsers]));
    detailDialog.close();
    renderListings();
  });
  detailDialog.showModal();
}

function persistLeadState() {
  localStorage.setItem("moneybridge-free-leads-used", String(freeLeadsUsed));
  localStorage.setItem("moneybridge-paid-lead-credits", String(paidLeadCredits));
}

function unlockLead(item) {
  let status = "";
  if (freeLeadsUsed < 3) {
    freeLeadsUsed += 1;
    status = `${t("freeLeadUsed")} ${freeLeadsUsed}/3. ${t("leadUnlocked")} ${item.phone || "Hidden"}`;
  } else if (paidLeadCredits > 0) {
    paidLeadCredits -= 1;
    status = `${t("paidLeadUsed")}. ${t("leadUnlocked")} ${item.phone || "Hidden"}`;
  } else {
    status = t("buyLeadNeeded");
  }
  persistLeadState();
  if (detailDialog.open && detailBody.querySelector(".terms")) {
    detailBody.querySelector(".terms").textContent = status;
  } else {
    paymentStatus.textContent = status;
    switchView("settings");
  }
}

function applyPaidPlan(plan) {
  if (plan === "lead") {
    paidLeadCredits += 1;
    persistLeadState();
    paymentStatus.textContent = `Payment verified. ${t("leadPlan")} added. Lead credits: ${paidLeadCredits}.`;
    return;
  }
  if (plan === "premium") {
    isPremiumUser = true;
    localStorage.setItem("moneybridge-premium-active", "true");
    paymentStatus.textContent = `Payment verified. ${t("premiumActive")}`;
    translatePage();
    renderListings();
    return;
  }
  isVerifiedUser = true;
  localStorage.setItem("moneybridge-verified-profile", "true");
  paymentStatus.textContent = `Payment verified. ${t("verifiedNow")}`;
  renderListings();
}

async function postJson(url, payload) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || "Payment service error. Please try again.");
  }
  return data;
}

async function startRazorpayPayment(plan) {
  const selectedPlan = paymentPlans[plan];
  if (!selectedPlan) return;
  if (plan === "lead" && !isVerifiedUser) {
    paymentStatus.textContent = t("verifyBeforeLead");
    return;
  }
  if (!window.Razorpay) {
    paymentStatus.textContent = "Razorpay checkout could not load. Check internet connection and try again.";
    return;
  }

  paymentStatus.textContent = `Creating ${selectedPlan.label} payment order...`;
  try {
    const order = await postJson("/.netlify/functions/create-razorpay-order", {
      plan,
      phone: localStorage.getItem("moneybridge-borrower-mobile") || "",
      firebaseUid: localStorage.getItem("moneybridge-firebase-uid") || ""
    });

    const checkout = new window.Razorpay({
      key: order.keyId,
      amount: order.amount,
      currency: order.currency,
      name: "MoneyBridge",
      description: `${selectedPlan.label} ${selectedPlan.display}`,
      order_id: order.orderId,
      prefill: {
        name: "Arjun Rao",
        contact: localStorage.getItem("moneybridge-borrower-mobile") || ""
      },
      theme: { color: "#0f766e" },
      handler: async (response) => {
        paymentStatus.textContent = "Verifying payment...";
        const verifiedPayment = await postJson("/.netlify/functions/verify-razorpay-payment", {
          plan,
          orderId: response.razorpay_order_id,
          paymentId: response.razorpay_payment_id,
          signature: response.razorpay_signature
        });
        applyPaidPlan(plan);
        await savePaymentStatus(plan, verifiedPayment);
      },
      modal: {
        ondismiss: () => {
          paymentStatus.textContent = "Payment cancelled. No plan was activated.";
        }
      }
    });

    checkout.open();
  } catch (error) {
    paymentStatus.textContent = error.message || "Could not start payment. Please try again.";
  }
}

function switchView(view) {
  document.querySelectorAll(".view").forEach((section) => {
    section.classList.toggle("active-view", section.id === view);
  });
  document.querySelectorAll("[data-view]").forEach((button) => {
    button.classList.toggle("active", button.dataset.view === view);
  });
}

function renderMessages() {
  document.querySelector("#messageList").innerHTML = messages.map(([name, body, time, initials]) => `
    <article class="message-row">
      <div class="avatar">${initials}</div>
      <div><h3>${name}</h3><p>${body}</p></div>
      <span class="time">${time}</span>
    </article>
  `).join("");
}

[searchInput, locationFilter, typeFilter, interestFilter, amountFilter, purposeFilter, verificationFilter].forEach((control) => {
  control.addEventListener("input", renderListings);
});

document.querySelectorAll("[data-view]").forEach((button) => {
  button.addEventListener("click", () => switchView(button.dataset.view));
});

document.querySelector("#closeDetail").addEventListener("click", () => detailDialog.close());
document.querySelector("#closePost").addEventListener("click", () => postDialog.close());
document.querySelector("#closeOtp").addEventListener("click", () => otpDialog.close());
document.querySelector("#desktopPostBtn").addEventListener("click", () => postDialog.showModal());
document.querySelector("#mobilePostBtn").addEventListener("click", () => postDialog.showModal());

themeSelect.addEventListener("change", () => applyTheme(themeSelect.value));
languageSelect.addEventListener("change", () => applyLanguage(languageSelect.value));
contactVisibility.addEventListener("change", () => setContactVisibility(contactVisibility.value));

borrowerSignupBtn.addEventListener("click", () => {
  otpInput.value = "";
  firebaseOtpConfirmation = null;
  otpHelp.textContent = "Enter your mobile number, complete the security check, then tap Send OTP.";
  otpDialog.showModal();
  getRecaptchaVerifier();
});

sendOtpBtn.addEventListener("click", async () => {
  const phoneNumber = normalizePhoneNumber(otpMobile.value);
  if (!phoneNumber.startsWith("+") || phoneNumber.length < 12) {
    otpHelp.textContent = "Enter a valid mobile number with country code, for example +919876543210.";
    return;
  }

  sendOtpBtn.disabled = true;
  otpHelp.textContent = "Sending OTP...";
  try {
    firebaseOtpConfirmation = await signInWithPhoneNumber(firebaseAuth, phoneNumber, getRecaptchaVerifier());
    otpHelp.textContent = `OTP sent to ${phoneNumber}. Enter the code to verify.`;
  } catch (error) {
    otpHelp.textContent = error?.message || "Could not send OTP. Check Firebase authorized domain and try again.";
    if (recaptchaVerifier) {
      await recaptchaVerifier.clear();
      recaptchaVerifier = null;
    }
    getRecaptchaVerifier();
  } finally {
    sendOtpBtn.disabled = false;
  }
});

document.querySelector("#otpForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!firebaseOtpConfirmation) {
    otpHelp.textContent = "Please send OTP first.";
    return;
  }
  otpHelp.textContent = "Verifying OTP...";
  try {
    const result = await firebaseOtpConfirmation.confirm(otpInput.value.trim());
    localStorage.setItem("moneybridge-borrower-mobile", result.user.phoneNumber || normalizePhoneNumber(otpMobile.value));
    localStorage.setItem("moneybridge-firebase-uid", result.user.uid);
    localStorage.setItem("moneybridge-borrower-purpose", borrowerPurpose.value);
    setBorrowerVerified(true);
    await saveUserProfile(result.user, {
      borrowerPurpose: borrowerPurpose.value,
      mobileVerified: true,
      createdAt: serverTimestamp()
    });
    otpDialog.close();
  } catch (error) {
    otpHelp.textContent = error?.message || "Invalid OTP. Please check the code and try again.";
  }
});

document.querySelectorAll(".payment-btn").forEach((button) => {
  button.addEventListener("click", () => startRazorpayPayment(button.dataset.plan));
});

acceptTermsBtn.addEventListener("click", () => {
  if (!termsAccept.checked) {
    acceptTermsBtn.textContent = t("termsRequired");
    return;
  }
  localStorage.setItem("moneybridge-terms-accepted", "true");
  termsDialog.close();
});

permissionBtn.addEventListener("click", async () => {
  if (!("Notification" in window)) return;
  await Notification.requestPermission();
  updateNotificationStatus();
});

notificationToggle.addEventListener("change", async () => {
  if (notificationToggle.checked && "Notification" in window && Notification.permission !== "granted") {
    await Notification.requestPermission();
  }
  updateNotificationStatus();
});

shareReferralBtn.addEventListener("click", async () => {
  const inviteText = `${t("inviteText")} ${referCode.textContent}`;
  try {
    if (navigator.share) {
      await navigator.share({ title: "MoneyBridge invite", text: inviteText });
      shareStatus.textContent = t("inviteShared");
      return;
    }
    await navigator.clipboard.writeText(inviteText);
    shareStatus.textContent = t("inviteCopied");
  } catch (error) {
    shareStatus.textContent = inviteText;
  }
});

document.querySelector("#postForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!isPremiumUser && monthlyPostsUsed >= 3) {
    document.querySelector("#postPlanStatus").textContent = t("freePostLimit");
    return;
  }
  const data = Object.fromEntries(new FormData(event.currentTarget));
  if (!isPremiumUser) {
    monthlyPostsUsed += 1;
    localStorage.setItem("moneybridge-monthly-posts-used", String(monthlyPostsUsed));
  }
  const listing = {
    name: "Arjun Rao",
    type: data.type,
    city: data.city,
    distance: "Current location",
    amount: Number(data.amount),
    interest: data.interestChoice === "Let's discuss" ? data.interestChoice : Number(data.interestChoice),
    duration: data.duration,
    verified: isVerifiedUser,
    mobileVerified: localStorage.getItem("moneybridge-borrower-verified") === "true",
    aadharVerified: false,
    premium: isPremiumUser,
    purpose: data.purpose || "Let's discuss",
    initials: "AR",
    terms: data.terms
  };
  try {
    const savedListing = await saveListing(listing);
    listings.unshift(savedListing);
    await updateCurrentUserProfile();
    postDialog.close();
    switchView("home");
    renderListings();
  } catch (error) {
    document.querySelector("#postPlanStatus").textContent = error.message;
  }
});

onAuthStateChanged(firebaseAuth, async (user) => {
  if (!user) return;
  localStorage.setItem("moneybridge-firebase-uid", user.uid);
  if (user.phoneNumber) {
    localStorage.setItem("moneybridge-borrower-mobile", user.phoneNumber);
    setBorrowerVerified(true);
  }
  await saveUserProfile(user);
  await loadFirestoreListings();
});

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("./service-worker.js").catch(() => {});
}

renderListings();
renderMessages();
applyTheme(localStorage.getItem("moneybridge-theme") || "system");
applyLanguage(localStorage.getItem("moneybridge-language") || "en");
setContactVisibility(localStorage.getItem("moneybridge-contact-visibility") || "matched");
setBorrowerVerified(localStorage.getItem("moneybridge-borrower-verified") === "true");
updateNotificationStatus();
if (localStorage.getItem("moneybridge-terms-accepted") !== "true") {
  termsDialog.showModal();
}
