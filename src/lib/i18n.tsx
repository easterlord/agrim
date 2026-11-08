"use client";

/* ============================================================
 * EzFame — i18n engine.
 *  • Native localized strings for UI chrome (en / ne / hi).
 *  • Dynamic content (service names, admin-entered text) is
 *    auto-translated on demand through Google Translate's free
 *    gtx endpoint, with localStorage caching and silent failure.
 * ============================================================ */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Lang } from "./types";

/* ---------------- dictionary (synced triplets) ---------------- */

type Tri = { en: string; ne: string; hi: string };

export const dict = {
  nav: {
    home: { en: "Home", ne: "गृह", hi: "होम" },
    services: { en: "Services", ne: "सेवाहरू", hi: "सेवाएँ" },
    orders: { en: "My Orders", ne: "मेरा अर्डरहरू", hi: "मेरे ऑर्डर" },
    account: { en: "Account", ne: "खाता", hi: "खाता" },
    login: { en: "Sign In", ne: "साइन इन", hi: "साइन इन" },
    logout: { en: "Sign Out", ne: "साइन आउट", hi: "साइन आउट" },
    admin: { en: "Admin", ne: "एडमिन", hi: "एडमिन" },
    checkout: { en: "Checkout", ne: "चेकआउट", hi: "चेकआउट" },
  },
  hero: {
    badge: {
      en: "Nepal's #1 SMM & Game Top-Up Store",
      ne: "नेपालको #१ SMM तथा गेम टप-अप स्टोर",
      hi: "नेपाल का #1 SMM और गेम टॉप-अप स्टोर",
    },
    title1: { en: "Grow Your Social,", ne: "सोशल बढाउनुहोस्,", hi: "अपना सोशल बढ़ाएँ," },
    title2: { en: "Top-Up Your Game.", ne: "गेम टप-अप गर्नुहोस्।", hi: "गेम टॉप-अप करें।" },
    sub: {
      en: "Instant followers, likes, views & in-game currency at Nepal's lowest prices. Pay with eSewa, Khalti, bank transfer or crypto.",
      ne: "नेपालकै सस्तो मूल्यमा तत्काल फलोअर्स, लाइक, भ्यूज र इन-गेम करेन्सी। eSewa, Khalti, बैंक वा क्रिप्टोबाट भुक्तानी गर्नुहोस्।",
      hi: "नेपाल की सबसे किफायती दरों पर तुरंत फॉलोअर्स, लाइक, व्यूज़ और इन-गेम करेंसी। eSewa, Khalti, बैंक या क्रिप्टो से भुगतान करें।",
    },
    cta1: { en: "Start Ordering", ne: "अर्डर सुरु गर्नुहोस्", hi: "ऑर्डर शुरू करें" },
    cta2: { en: "View Pricing", ne: "मूल्य हेर्नुहोस्", hi: "कीमत देखें" },
    stat1: { en: "Live Services", ne: "लाइभ सेवाहरू", hi: "लाइव सेवाएँ" },
    stat2: { en: "Orders Done", ne: "अर्डर पूरा", hi: "ऑर्डर पूर्ण" },
    stat3: { en: "Happy Clients", ne: "सन्तुष्ट ग्राहक", hi: "संतुष्ट ग्राहक" },
    stat4: { en: "Avg. Rating", ne: "औसत रेटिङ", hi: "औसत रेटिंग" },
  },
  shop: {
    title: { en: "Build Your Order", ne: "अर्डर बनाउनुहोस्", hi: "अपना ऑर्डर बनाएँ" },
    sub: {
      en: "Pick a platform, choose a service, set the quantity — the price updates live.",
      ne: "प्लेटफर्म छान्नुहोस्, सेवा रोज्नुहोस्, परिमाण सेट गर्नुहोस् — मूल्य तत्काल अपडेट हुन्छ।",
      hi: "प्लेटफ़ॉर्म चुनें, सेवा चुनें, मात्रा सेट करें — कीमत लाइव अपडेट होती है।",
    },
    platform: { en: "Platform", ne: "प्लेटफर्म", hi: "प्लेटफ़ॉर्म" },
    service: { en: "Service Type", ne: "सेवाको प्रकार", hi: "सेवा प्रकार" },
    quantity: { en: "Quantity", ne: "परिमाण", hi: "मात्रा" },
    package: { en: "Select Package", ne: "प्याकेज छान्नुहोस्", hi: "पैकेज चुनें" },
    uidLabel: { en: "Player ID / UID", ne: "खेलाडी ID / UID", hi: "प्लेयर ID / UID" },
    uidHint: { en: "Your game UID or player ID", ne: "तपाईंको गेम UID वा Player ID", hi: "आपका गेम UID या प्लेयर ID" },
    linkHint: { en: "Your public profile or post URL", ne: "तपाईंको सार्वजनिक प्रोफाइल वा पोस्ट URL", hi: "आपका सार्वजनिक प्रोफ़ाइल या पोस्ट URL" },
    price: { en: "Total Price", ne: "कुल मूल्य", hi: "कुल कीमत" },
    buyNow: { en: "Buy Now", ne: "अहिले किन्नुहोस्", hi: "अभी खरीदें" },
    perK: { en: "per 1,000", ne: "प्रति १,०००", hi: "प्रति 1,000" },
    speed: { en: "Delivery", ne: "डेलिभरी", hi: "डिलीवरी" },
    warranty: { en: "Warranty", ne: "वारेन्टी", hi: "वारंटी" },
    min: { en: "Min", ne: "न्यूनतम", hi: "न्यूनतम" },
    max: { en: "Max", ne: "अधिकतम", hi: "अधिकतम" },
    social: { en: "Social Media", ne: "सोशल मिडिया", hi: "सोशल मीडिया" },
    games: { en: "Game Top-Up", ne: "गेम टप-अप", hi: "गेम टॉप-अप" },
    selectPrompt: { en: "Select a platform to begin", ne: "सुरु गर्न प्लेटफर्म छान्नुहोस्", hi: "शुरू करने के लिए प्लेटफ़ॉर्म चुनें" },
    dropNote: {
      en: "Note: drops in social media counts can occur over time — refill/warranty terms apply per service.",
      ne: "नोट: सामाजिक सञ्जालका संख्याहरूमा समयसँगै गिरावट आउन सक्छ — रिफिल/वारेन्टी सर्तहरू सेवा अनुसार लागू हुन्छन्।",
      hi: "नोट: सोशल मीडिया काउंट समय के साथ गिर सकते हैं — रीफिल/वारंटी शर्तें सेवा अनुसार लागू होती हैं।",
    },
  },
  checkout: {
    title: { en: "Checkout", ne: "चेकआउट", hi: "चेकआउट" },
    summary: { en: "Order Summary", ne: "अर्डर सारांश", hi: "ऑर्डर सारांश" },
    contact: { en: "Contact (Telegram / Phone)", ne: "सम्पर्क (टेलिग्राम / फोन)", hi: "संपर्क (टेलीग्राम / फ़ोन)" },
    contactPh: { en: "@username or 98XXXXXXXX", ne: "@username वा 98XXXXXXXX", hi: "@username या 98XXXXXXXX" },
    payMethod: { en: "Payment Method", ne: "भुक्तानी विधि", hi: "भुगतान विधि" },
    txId: { en: "Transaction ID", ne: "लेनदेन ID", hi: "ट्रांजेक्शन ID" },
    txPh: { en: "Paste TxID / reference number", ne: "TxID / रेफरेन्स नम्बर टाँस्नुहोस्", hi: "TxID / रेफ़रेंस नंबर पेस्ट करें" },
    receipt: { en: "Receipt / voucher URL", ne: "रसिद / भौचर URL", hi: "रसीद / वाउचर URL" },
    upload: { en: "Upload screenshot", ne: "स्क्रिनसट अपलोड", hi: "स्क्रीनशॉट अपलोड" },
    submit: { en: "Submit Order", ne: "अर्डर पेश गर्नुहोस्", hi: "ऑर्डर सबमिट करें" },
    submitting: { en: "Submitting…", ne: "पेश हुँदै…", hi: "सबमिट हो रहा है…" },
    total: { en: "Total", ne: "जम्मा", hi: "कुल" },
    payFirst: {
      en: "Complete the payment first, then submit the transaction details below.",
      ne: "पहिले भुक्तानी सम्पन्न गर्नुहोस्, त्यसपछि तल लेनदेन विवरण पेश गर्नुहोस्।",
      hi: "पहले भुगतान पूरा करें, फिर नीचे ट्रांजेक्शन विवरण सबमिट करें।",
    },
    needTx: {
      en: "Please enter the transaction ID or upload a receipt screenshot.",
      ne: "कृपया लेनदेन ID हाल्नुहोस् वा रसिद स्क्रिनसट अपलोड गर्नुहोस्।",
      hi: "कृपया ट्रांजेक्शन ID दर्ज करें या रसीद स्क्रीनशॉट अपलोड करें।",
    },
    success: { en: "Order Placed!", ne: "अर्डर सफल!", hi: "ऑर्डर सफल!" },
    successMsg: {
      en: "Your order is pending payment verification. We usually verify within 10–30 minutes.",
      ne: "तपाईंको अर्डर भुक्तानी प्रमाणीकरणको प्रतीक्षामा छ। सामान्यतया १०–३० मिनेटभित्र प्रमाणित हुन्छ।",
      hi: "आपका ऑर्डर भुगतान सत्यापन की प्रतीक्षा में है। सामान्यतः 10–30 मिनट में सत्यापित हो जाता है।",
    },
    viewOrders: { en: "Track My Order", ne: "अर्डर ट्र्याक गर्नुहोस्", hi: "ऑर्डर ट्रैक करें" },
    orderIdCopy: { en: "Order ID copied", ne: "अर्डर ID कपी भयो", hi: "ऑर्डर ID कॉपी हो गया" },
    empty: { en: "Your cart is empty — configure a service first.", ne: "कार्ट खाली छ — पहिले सेवा छान्नुहोस्।", hi: "आपकी कार्ट खाली है — पहले सेवा चुनें।" },
    copy: { en: "Copy", ne: "कपी", hi: "कॉपी" },
    copied: { en: "Copied!", ne: "कपी भयो!", hi: "कॉपी हो गया!" },
    scan: { en: "Scan & pay", ne: "स्क्यान गरी तिर्नुहोस्", hi: "स्कैन करके भुगतान करें" },
    accountName: { en: "Account Name", ne: "खाताको नाम", hi: "खाता नाम" },
    accountNumber: { en: "Account / Number", ne: "खाता / नम्बर", hi: "खाता / नंबर" },
    wallet: { en: "Wallet", ne: "वालेट", hi: "वॉलेट" },
    address: { en: "Address", ne: "ठेगाना", hi: "एड्रेस" },
    back: { en: "Back to shop", ne: "पसलमा फर्क", hi: "दुकान पर वापस" },
    ackDrops: {
      en: "I acknowledge that drops can occur and EzFame is not responsible for social media platform updates.",
      ne: "म न्यीकार्छु कि गिरावट आउन सक्छ र सामाजिक मिडिया प्लेटफर्म अपडेटका लागि EzFame जिम्मेवार छैन।",
      hi: "मैं स्वीकार करता/करती हूँ कि गिरावट हो सकती है और सोशल मीडिया प्लेटफ़ॉर्म अपडेट के लिए EzFame ज़िम्मेदार नहीं है।",
    },
    ackRequired: {
      en: "Please tick the acknowledgement checkbox before submitting.",
      ne: "पेश गर्नु अघि कृपया स्वीकृति बाकस टिक गर्नुहोस्।",
      hi: "सबमिट करने से पहले कृपया स्वीकृति बॉक्स पर टिक करें।",
    },
    signInToBuy: {
      en: "Sign in to place an order",
      ne: "अर्डर गर्न साइन इन गर्नुहोस्",
      hi: "ऑर्डर देने के लिए साइन इन करें",
    },
    signInToBuyMsg: {
      en: "Create an account or sign in to complete your purchase — guest checkout is currently disabled.",
      ne: "खरिद पूरा गर्न खाता बनाउनुहोस् वा साइन इन गर्नुहोस् — गेस्ट चेकआउट अहिले बन्द छ।",
      hi: "अपनी खरीद पूरी करने के लिए खाता बनाएँ या साइन इन करें — गेस्ट चेकआउट अभी बंद है।",
    },
  },
  orders: {
    title: { en: "My Orders", ne: "मेरा अर्डरहरू", hi: "मेरे ऑर्डर" },
    empty: { en: "No orders yet. Your orders will appear here.", ne: "अझै कुनै अर्डर छैन। तपाईंका अर्डर यहाँ देखिनेछन्।", hi: "अभी कोई ऑर्डर नहीं है। आपके ऑर्डर यहाँ दिखेंगे।" },
    lookup: { en: "Track any order", ne: "कुनै पनि अर्डर ट्र्याक", hi: "कोई भी ऑर्डर ट्रैक करें" },
    lookupBtn: { en: "Track", ne: "ट्र्याक", hi: "ट्रैक" },
    notFound: { en: "Order not found", ne: "अर्डर भेटिएन", hi: "ऑर्डर नहीं मिला" },
    pending: { en: "Pending", ne: "पेन्डिङ", hi: "लंबित" },
    processing: { en: "Processing", ne: "प्रक्रियामा", hi: "प्रोसेसिंग" },
    completed: { en: "Completed", ne: "पूरा भयो", hi: "पूर्ण" },
    rejected: { en: "Rejected", ne: "अस्वीकृत", hi: "अस्वीकृत" },
    cancelled: { en: "Cancelled", ne: "रद्द", hi: "रद्द" },
    date: { en: "Date", ne: "मिति", hi: "तारीख" },
    payment: { en: "Payment", ne: "भुक्तानी", hi: "भुगतान" },
    adminNote: { en: "Admin note", ne: "एडमिन नोट", hi: "एडमिन नोट" },
    items: { en: "Items", ne: "वस्तुहरू", hi: "आइटम" },
  },
  account: {
    title: { en: "My Account", ne: "मेरो खाता", hi: "मेरा खाता" },
    guest: { en: "Guest session", ne: "गेस्ट सेसन", hi: "गेस्ट सेशन" },
    signedIn: { en: "Signed in as", ne: "साइन इन", hi: "साइन इन" },
    provider: { en: "Provider", ne: "प्रदायक", hi: "प्रदाता" },
    memberSince: { en: "Member since", ne: "सदस्य मिति", hi: "सदस्य बने से" },
    theme: { en: "Theme", ne: "थिम", hi: "थीम" },
    language: { en: "Language", ne: "भाषा", hi: "भाषा" },
    currency: { en: "Currency", ne: "मुद्रा", hi: "मुद्रा" },
    support: { en: "Support", ne: "समर्थन", hi: "सहायता" },
    clearCache: { en: "Clear offline cache", ne: "अफलाइन क्यास खाली", hi: "ऑफ़लाइन कैश साफ़ करें" },
    admin: { en: "Admin Panel", ne: "एडमिन प्यानल", hi: "एडमिन पैनल" },
  },
  gate: {
    pendingTitle: { en: "Account pending approval", ne: "खाता स्वीकृतिको प्रतीक्षामा", hi: "खाता अनुमोदन लंबित है" },
    pendingMsg: {
      en: "Your account was created successfully and is waiting for admin approval. You'll get full access as soon as an administrator approves it — usually within a few hours.",
      ne: "तपाईंको खाता सफलतापूर्वक बन्यो र एडमिन स्वीकृतिको प्रतीक्षामा छ। एडमिनले स्वीकृत गरेपछि पूर्ण पहुँच पाउनुहुनेछ — सामान्यतया केही घण्टाभित्र।",
      hi: "आपका खाता सफलतापूर्वक बन गया है और एडमिन अनुमोदन की प्रतीक्षा में है। एडमिन द्वारा अनुमोदन के तुरंत बाद पूर्ण एक्सेस मिल जाएगा — आमतौर पर कुछ घंटों में।",
    },
    suspendedTitle: { en: "Account suspended", ne: "खाता निलम्बित", hi: "खाता निलंबित" },
    suspendedMsg: {
      en: "This account has been suspended by an administrator. If you believe this is a mistake, contact support.",
      ne: "यो खाता एडमिनद्वारा निलम्बित गरिएको छ। गल्ती भएको विश्वास गर्नुहुन्छ भने सहयोगमा सम्पर्क गर्नुहोस्।",
      hi: "यह खाता एडमिन द्वारा निलंबित किया गया है। यदि आपको लगता है कि यह गलती है, तो सहायता से संपर्क करें।",
    },
  },
  auth: {
    welcome: { en: "Welcome to EzFame", ne: "EzFame मा स्वागत छ", hi: "EzFame में स्वागत है" },
    sub: { en: "Sign in to track orders & unlock faster support.", ne: "अर्डर ट्र्याक गर्न र छिटो सहयोग पाउन साइन इन गर्नुहोस्।", hi: "ऑर्डर ट्रैक करने और तेज़ सहायता के लिए साइन इन करें।" },
    signIn: { en: "Sign In", ne: "साइन इन", hi: "साइन इन" },
    signUp: { en: "Create Account", ne: "खाता बनाउनुहोस्", hi: "खाता बनाएँ" },
    name: { en: "Full name", ne: "पूरा नाम", hi: "पूरा नाम" },
    email: { en: "Email", ne: "इमेल", hi: "ईमेल" },
    password: { en: "Password", ne: "पासवर्ड", hi: "पासवर्ड" },
    or: { en: "or continue with", ne: "वा यसरी जारी राख्नुहोस्", hi: "या जारी रखें" },
    guest: { en: "Continue as Guest", ne: "गेस्ट रूपमा जारी", hi: "गेस्ट के रूप में जारी रखें" },
    noAccount: { en: "No account?", ne: "खाता छैन?", hi: "खाता नहीं है?" },
    haveAccount: { en: "Have an account?", ne: "खाता छ?", hi: "खाता है?" },
    oauthHint: {
      en: "Google / Apple sign-in activates once Firebase keys are set (Admin ▸ Settings).",
      ne: "Firebase किहरू थपिएपछि Google / Apple साइन इन सक्रिय हुन्छ (एडमिन ▸ सेटिङ)।",
      hi: "Firebase की सेट होने पर Google / Apple साइन इन सक्रिय हो जाता है (एडमिन ▸ सेटिंग्स)।",
    },
    errEmail: { en: "Enter a valid email", ne: "मान्य इमेल हाल्नुहोस्", hi: "मान्य ईमेल दर्ज करें" },
    errPass: { en: "Password must be 6+ characters", ne: "पासवर्ड ६+ अक्षरको हुनुपर्छ", hi: "पासवर्ड 6+ अक्षरों का होना चाहिए" },
    errUser: { en: "No account found with this email", ne: "यो इमेलसँग कुनै खाता भेटिएन", hi: "इस ईमेल से कोई खाता नहीं मिला" },
    errWrong: { en: "Incorrect password", ne: "गलत पासवर्ड", hi: "गलत पासवर्ड" },
    errExists: { en: "Email already registered", ne: "इमेल पहिले नै दर्ता छ", hi: "ईमेल पहले से पंजीकृत है" },
    errGoogle: { en: "Google sign-in failed. Try again or use email.", ne: "Google साइन इन असफल भयो। फेरि प्रयास गर्नुहोस्।", hi: "Google साइन इन विफल। दोबारा कोशिश करें।" },
    errApple: { en: "Apple sign-in failed. Try again or use email.", ne: "Apple साइन इन असफल भयो। फेरि प्रयास गर्नुहोस्।", hi: "Apple साइन इन विफल। दोबारा कोशिश करें।" },
    errDefault: { en: "Sign-in failed. Please try again.", ne: "साइन इन असफल भयो। फेरि प्रयास गर्नुहोस्।", hi: "साइन इन विफल। दोबारा कोशिश करें।" },
  },
  chat: {
    title: { en: "Support Assistant", ne: "सहयोग सहायक", hi: "सहायक" },
    placeholder: { en: "Ask about pricing, orders…", ne: "मूल्य, अर्डरबारे सोध्नुहोस्…", hi: "कीमत, ऑर्डर के बारे में पूछें…" },
    typing: { en: "typing…", ne: "टाइप गर्दै…", hi: "टाइप कर रहा है…" },
  },
  admin: {
    gate: { en: "Admin Access", ne: "एडमिन पहुँच", hi: "एडमिन एक्सेस" },
    gateSub: { en: "Sign in with the admin username and password to open the control center.", ne: "नियन्त्रण केन्द्र खोल्न एडमिन प्रयोगकर्तानाम र पासवर्ड हाल्नुहोस्।", hi: "कंट्रोल सेंटर खोलने के लिए एडमिन उपयोगकर्तानाम और पासवर्ड दर्ज करें।" },
    username: { en: "Username", ne: "प्रयोगकर्तानाम", hi: "उपयोगकर्तानाम" },
    password: { en: "Password", ne: "पासवर्ड", hi: "पासवर्ड" },
    enter: { en: "Unlock", ne: "अनलक", hi: "अनलॉक" },
    wrong: { en: "Wrong username or password", ne: "गलत प्रयोगकर्तानाम वा पासवर्ड", hi: "गलत उपयोगकर्तानाम या पासवर्ड" },
    title: { en: "Control Center", ne: "नियन्त्रण केन्द्र", hi: "कंट्रोल सेंटर" },
    revenue: { en: "Revenue (USD)", ne: "आम्दानी (USD)", hi: "राजस्व (USD)" },
    totalOrders: { en: "Total Orders", ne: "कुल अर्डर", hi: "कुल ऑर्डर" },
    rate: { en: "Exchange rate (NPR per $1)", ne: "विनिमय दर ($१ = कति रु)", hi: "एक्सचेंज दर ($1 = कितन रु)" },
    siteName: { en: "Site name", ne: "साइट नाम", hi: "साइट नाम" },
    tagline: { en: "Tagline", ne: "ट्यागलाइन", hi: "टैगलाइन" },
    userNew: { en: "New username (blank = keep current)", ne: "नयाँ प्रयोगकर्तानाम (खाली = पुरानै)", hi: "नया उपयोगकर्तानाम (खाली = वही)" },
    passNew: { en: "New password (blank = keep current)", ne: "नयाँ पासवर्ड (खाली = पुरानै)", hi: "नया पासवर्ड (खाली = वही)" },
    saved: { en: "Saved successfully", ne: "सुरक्षित भयो", hi: "सेव हो गया" },
    addService: { en: "Add service", ne: "सेवा थप्नुहोस्", hi: "सेवा जोड़ें" },
    addPackage: { en: "Add package", ne: "प्याकेज थप्नुहोस्", hi: "पैकेज जोड़ें" },
    addFaq: { en: "Add FAQ", ne: "FAQ थप्नुहोस्", hi: "FAQ जोड़ें" },
    addWallet: { en: "Add wallet", ne: "वालेट थप्नुहोस्", hi: "वॉलेट जोड़ें" },
    confirmDelete: { en: "Delete this item?", ne: "यो मेट्ने हो?", hi: "यह हटाएँ?" },
    welcomeMsg: { en: "Welcome message", ne: "स्वागत सन्देश", hi: "स्वागत संदेश" },
    sysPrompt: { en: "System instructions", ne: "प्रणाली निर्देशन", hi: "सिस्टम निर्देश" },
    uploadQr: { en: "Upload QR image", ne: "QR तस्बिर अपलोड", hi: "QR इमेज अपलोड" },
    qrUrl: { en: "QR image URL", ne: "QR तस्बिर URL", hi: "QR इमेज URL" },
    enabled: { en: "Enabled", ne: "सक्रिय", hi: "सक्रिय" },
    disabled: { en: "Disabled", ne: "निष्क्रिय", hi: "निष्क्रिय" },
    verify: { en: "Verify payment", ne: "भुक्तानी रुजु", hi: "भुगतान सत्यापित" },
    reject: { en: "Reject", ne: "अस्वीकार", hi: "अस्वीकार" },
    complete: { en: "Mark completed", ne: "पूरा भयो", hi: "पूर्ण चिह्नित" },
    processing: { en: "Mark processing", ne: "प्रक्रियामा", hi: "प्रोसेसिंग" },
    firebase: { en: "Firebase config (JSON)", ne: "Firebase कन्फिग (JSON)", hi: "Firebase कॉन्फ़िग (JSON)" },
    firebaseHint: {
      en: "Paste your Firebase web config to enable Google / Apple sign-in & cloud accounts.",
      ne: "Google / Apple साइन इन र क्लाउड खाताका लागि Firebase web config टाँस्नुहोस्।",
      hi: "Google / Apple साइन इन और क्लाउड खातों के लिए Firebase वेब कॉन्फ़िग पेस्ट करें।",
    },
    exportData: { en: "Export data (JSON)", ne: "डाटा निर्यात (JSON)", hi: "डेटा एक्सपोर्ट (JSON)" },
    resetCache: { en: "Clear local cache", ne: "लोकल क्यास खाली", hi: "लोकल कैश साफ़" },
    approve: { en: "Approve", ne: "स्वीकृत", hi: "स्वीकृत" },
    apiKey: { en: "API key (optional — external AI)", ne: "API की (वैकल्पिक — बाह्य AI)", hi: "API की (वैकल्पिक — एक्सटर्नल AI)" },
    endpoint: { en: "AI endpoint (OpenAI-compatible URL)", ne: "AI एन्डपोइन्ट (OpenAI-मिल्ने URL)", hi: "AI एंडपॉइंट (OpenAI-संगत URL)" },
    quickActions: { en: "Quick action buttons", ne: "द्रुत कार्य बटनहरू", hi: "क्विक एक्शन बटन" },
    active: { en: "Active", ne: "सक्रिय", hi: "सक्रिय" },
    priceUsd: { en: "Price USD", ne: "मूल्य USD", hi: "कीमत USD" },
    pricePerK: { en: "Price per 1000 (USD)", ne: "प्रति १००० मूल्य (USD)", hi: "प्रति 1000 कीमत (USD)" },
    logs: { en: "System Logs", ne: "सिस्टम लग", hi: "सिस्टम लॉग्स" },
    logsEmpty: { en: "No admin activity recorded yet.", ne: "अझै कुनै एडमिन गतिविधि छैन।", hi: "अभी कोई एडमिन गतिविधि दर्ज नहीं है।" },
    clearLogs: { en: "Clear logs", ne: "लग खाली", hi: "लॉग साफ़ करें" },
    viewReceipt: { en: "View receipt", ne: "रसिद हेर्नुहोस्", hi: "रसीद देखें" },
    cryptoVisibility: { en: "Show Crypto on checkout", ne: "चेकआउटमा क्रिप्टो देखाउनुहोस्", hi: "चेकआउट पर क्रिप्टो दिखाएँ" },
    cryptoVisibilityHint: {
      en: "When off, all crypto payment options stay hidden from customers.",
      ne: "अफ मा, सबै क्रिप्टो भुक्तानी विकल्पहरू ग्राहकबाट लुकाइएका हुन्छन्।",
      hi: "बंद होने पर सभी क्रिप्टो भुगतान विकल्प ग्राहकों से छिपे रहते हैं।",
    },
    users: { en: "User Management", ne: "प्रयोगकर्ता व्यवस्थापन", hi: "उपयोगकर्ता प्रबंधन" },
    usersHint: {
      en: "Approve new sign-ups, suspend or restore access, and manage roles. Changes apply in real time.",
      ne: "नयाँ दर्ता स्वीकृत गर्नुहोस्, पहुँच निलम्बित वा पुनर्स्थापित गर्नुहोस्, र भूमिकाहरू व्यवस्थापन गर्नुहोस्। परिवर्तनहरू तत्काल लागू हुन्छन्।",
      hi: "नई साइन-अप स्वीकृत करें, एक्सेस निलंबित/पुनर्स्थापित करें, और भूमिकाएँ प्रबंधित करें। बदलाव तुरंत लागू होते हैं।",
    },
    statusPending: { en: "Pending", ne: "पेन्डिङ", hi: "लंबित" },
    statusActive: { en: "Active", ne: "सक्रिय", hi: "सक्रिय" },
    statusSuspended: { en: "Suspended", ne: "निलम्बित", hi: "निलंबित" },
    suspend: { en: "Suspend", ne: "निलम्बित", hi: "निलंबित" },
    unban: { en: "Restore", ne: "पुनर्स्थापित", hi: "पुनर्स्थापित" },
    deleteUser: { en: "Delete user", ne: "प्रयोगकर्ता मेट्नुहोस्", hi: "उपयोगकर्ता हटाएँ" },
    confirmDeleteUser: {
      en: "Permanently delete this user? They will be signed out everywhere.",
      ne: "यो प्रयोगकर्ता स्थायी रूपमा मेट्ने हो? उनी सबै ठाउँबाट साइन आउट हुनेछन्।",
      hi: "इस उपयोगकर्ता को स्थायी रूप से हटाएँ? वे हर जगह से साइन आउट हो जाएँगे।",
    },
    lastLogin: { en: "Last login", ne: "अन्तिम लगइन", hi: "अंतिम लॉगिन" },
    pendingCount: { en: "pending approval", ne: "स्वीकृति प्रतीक्षामा", hi: "अनुमोदन लंबित" },
    masterSession: { en: "master session", ne: "मास्टर सेसन", hi: "मास्टर सेशन" },
    roleAdmin: { en: "role: admin", ne: "भूमिका: एडमिन", hi: "भूमिका: एडमिन" },
    accessUnlocked: { en: "access unlocked", ne: "पहुँच खुल्यो", hi: "एक्सेस अनलॉक" },
    credentialsHint: {
      en: "Master credentials on fresh installs: agrim / ramesh — change them here.",
      ne: "नयाँ इन्स्टलमा मास्टर प्रमाणहरू: agrim / ramesh — यहाँ परिवर्तन गर्नुहोस्।",
      hi: "नए इंस्टॉल पर मास्टर क्रेडेंशियल: agrim / ramesh — यहाँ बदलें।",
    },
  },
  features: {
    f1t: { en: "Lightning Delivery", ne: "बिजुली गतिको डेलिभरी", hi: "बिजली जैसी डिलीवरी" },
    f1d: {
      en: "Orders start within 0–1 hour and game top-ups land in 5–30 minutes.",
      ne: "अर्डर ०–१ घण्टाभित्र सुरु हुन्छन् र गेम टप-अप ५–३० मिनेटमा आइपुग्छन्।",
      hi: "ऑर्डर 0–1 घंटे में शुरू होते हैं और गेम टॉप-अप 5–30 मिनट में पहुँच जाते हैं।",
    },
    f2t: { en: "100% Safe", ne: "१००% सुरक्षित", hi: "100% सुरक्षित" },
    f2d: {
      en: "No passwords needed — only public links & game UIDs. Privacy-first delivery.",
      ne: "पासवर्ड आवश्यक छैन — सार्वजनिक लिंक र गेम UID मात्र। गोपनीयता-पहिलो डेलिभरी।",
      hi: "पासवर्ड की ज़रूरत नहीं — केवल सार्वजनिक लिंक और गेम UID। प्राइवेसी-फर्स्ट डिलीवरी।",
    },
    f3t: { en: "AI Support 24/7", ne: "AI सहयोग २४/७", hi: "AI सहायता 24/7" },
    f3d: {
      en: "AI assistant answers pricing & order questions instantly, around the clock.",
      ne: "AI सहायकले मूल्य र अर्डरका प्रश्नहरूको तत्काल जवाफ दिन्छ, चौबिसै घण्टा।",
      hi: "AI सहायक कीमत और ऑर्डर के सवालों का तुरंत जवाब देता है, चौबिसों घंटे।",
    },
    f4t: { en: "Best Rates", ne: "उत्कृष्ट दर", hi: "बेस्ट रेट्स" },
    f4d: {
      en: "Live USD ⇄ NPR conversion with the lowest prices in Nepal — updated by the store.",
      ne: "जीवित USD ⇄ NPR रूपान्तरण — नेपालकै सस्तो मूल्य, पसलद्वारा अपडेट।",
      hi: "लाइव USD ⇄ NPR रूपांतरण — नेपाल की सबसे किफायती कीमतें, स्टोर द्वारा अपडेट।",
    },
  },
  how: {
    s3t: { en: "Delivered & Tracked", ne: "डेलिभरी र ट्र्याकिङ", hi: "डिलीवरी और ट्रैकिंग" },
  },
  footer: {
    about: {
      en: "Nepal's fastest SMM & game top-up store — instant delivery, 24/7 support.",
      ne: "नेपालको सबैभन्दा छिटो SMM तथा गेम टप-अप स्टोर — तत्काल डेलिभरी, २४/७ सहयोग।",
      hi: "नेपाल का सबसे तेज़ SMM और गेम टॉप-अप स्टोर — तुरंत डिलीवरी, 24/7 सहायता।",
    },
    links: { en: "Quick Links", ne: "द्रुत लिंक", hi: "क्विक लिंक" },
    support: { en: "Support", ne: "समर्थन", hi: "सहायता" },
    payments: { en: "We Accept", ne: "हामी स्वीकार गर्छौं", hi: "हम स्वीकार करते हैं" },
    rights: { en: "All rights reserved.", ne: "सर्वाधिकार सुरक्षित।", hi: "सर्वाधिकार सुरक्षित।" },
  },
  sync: {
    online: { en: "Cloud synced", ne: "क्लाउड सिंक", hi: "क्लाउड सिंक" },
    local: { en: "Offline mode", ne: "अफलाइन मोड", hi: "ऑफ़लाइन मोड" },
    connecting: { en: "Connecting…", ne: "जोड्दै…", hi: "कनेक्ट हो रहा है…" },
    offline: { en: "Reconnecting…", ne: "पुनः जोड्दै…", hi: "पुनः कनेक्ट…" },
  },
  theme: {
    dark: { en: "Dark", ne: "डार्क", hi: "डार्क" },
    light: { en: "Light", ne: "लाइट", hi: "लाइट" },
  },
  common: {
    save: { en: "Save", ne: "सुरक्षित", hi: "सेव" },
    cancel: { en: "Cancel", ne: "रद्द", hi: "रद्द" },
    delete: { en: "Delete", ne: "मेट्नुहोस्", hi: "हटाएँ" },
    edit: { en: "Edit", ne: "सम्पादन", hi: "संपादित" },
    add: { en: "Add", ne: "थप्नुहोस्", hi: "जोड़ें" },
    close: { en: "Close", ne: "बन्द", hi: "बंद करें" },
    loading: { en: "Loading…", ne: "लोड हुँदै…", hi: "लोड हो रहा है…" },
    optional: { en: "optional", ne: "वैकल्पिक", hi: "वैकल्पिक" },
    search: { en: "Search", ne: "खोज्नुहोस्", hi: "खोजें" },
    new: { en: "New", ne: "नयाँ", hi: "नया" },
    live: { en: "LIVE", ne: "लाइभ", hi: "लाइव" },
  },
} as const;

type Dict = typeof dict;

/* ---------------- lookup ---------------- */

export function lookup(lang: Lang, path: string): string {
  const segs = path.split(".");
  let node: unknown = dict as unknown;
  for (const seg of segs) {
    if (!node || typeof node !== "object") return path;
    node = (node as Record<string, unknown>)[seg];
  }
  if (node && typeof node === "object" && lang in (node as Record<string, string>)) {
    return (node as Record<string, string>)[lang] ?? (node as Tri).en;
  }
  // fallback to english
  if (node && typeof node === "object" && "en" in (node as Record<string, string>)) {
    return (node as Tri).en;
  }
  return path;
}

/* ---------------- Google auto-translate (dynamic content) ---------------- */

const LS_TX = "ezfame:txcache";
const txMem = new Map<string, string>();

function txCacheGet(key: string): string | null {
  if (txMem.has(key)) return txMem.get(key) ?? null;
  try {
    const raw = localStorage.getItem(LS_TX);
    if (raw) {
      const map = JSON.parse(raw) as Record<string, string>;
      if (map[key]) {
        txMem.set(key, map[key]);
        return map[key];
      }
    }
  } catch {
    /* ignore */
  }
  return null;
}

function txCacheSet(key: string, value: string) {
  txMem.set(key, value);
  try {
    const raw = localStorage.getItem(LS_TX);
    const map = raw ? (JSON.parse(raw) as Record<string, string>) : {};
    map[key] = value;
    const keys = Object.keys(map);
    if (keys.length > 400) keys.slice(0, 100).forEach((k) => delete map[k]);
    localStorage.setItem(LS_TX, JSON.stringify(map));
  } catch {
    /* ignore */
  }
}

/** Translate arbitrary text via Google Translate (free gtx endpoint). Silent-fail. */
export async function googleTranslate(text: string, target: Lang): Promise<string> {
  if (target === "en" || !text.trim()) return text;
  const key = `${target}:${text}`;
  const cached = txCacheGet(key);
  if (cached) return cached;
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 8000);
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${target}&dt=t&q=${encodeURIComponent(text)}`;
    const res = await fetch(url, { signal: ctrl.signal });
    clearTimeout(t);
    if (!res.ok) return text;
    const data = (await res.json()) as unknown;
    if (!Array.isArray(data) || !Array.isArray(data[0])) return text;
    const out = (data[0] as unknown[])
      .map((seg) => (Array.isArray(seg) ? String(seg[0] ?? "") : ""))
      .join("")
      .trim();
    if (!out) return text;
    txCacheSet(key, out);
    return out;
  } catch {
    return text;
  }
}

/* ---------------- context ---------------- */

const LS_LANG = "ezfame:lang";

interface I18nContextValue {
  lang: Lang;
  setLang: (l: Lang) => void;
  /** translate a dictionary key */
  t: (path: string) => string;
  /** translate dynamic content (service names, etc.) with Google fallback */
  auto: (text: string) => Promise<string>;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    if (typeof window === "undefined") return "en";
    try {
      const stored = localStorage.getItem(LS_LANG) as Lang | null;
      if (stored === "en" || stored === "ne" || stored === "hi") return stored;
    } catch {
      /* ignore */
    }
    return "en";
  });

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try {
      localStorage.setItem(LS_LANG, l);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    try {
      document.documentElement.lang = lang;
      document.documentElement.classList.toggle("lang-deva", lang !== "en");
    } catch {
      /* ignore */
    }
  }, [lang]);

  const t = useCallback((path: string) => lookup(lang, path), [lang]);
  const auto = useCallback((text: string) => googleTranslate(text, lang), [lang]);

  const value = useMemo(() => ({ lang, setLang, t, auto }), [lang, setLang, t, auto]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used inside <I18nProvider>");
  return ctx;
}

/** Renders dynamic (admin-defined) text with live Google auto-translation. */
export function Tx({ text, className }: { text: string; className?: string }) {
  const { lang, auto } = useI18n();
  const [out, setOut] = useState(text);

  useEffect(() => {
    let alive = true;
    // defer initial reset to a microtask (avoids sync setState in effect)
    Promise.resolve().then(() => {
      if (alive) setOut(text);
    });
    if (lang === "en" || !text) return;
    void auto(text).then((translated) => {
      if (alive && translated) setOut(translated);
    });
    return () => {
      alive = false;
    };
  }, [text, lang, auto]);

  return <span className={className}>{out}</span>;
}

export const LANGUAGES: Array<{ id: Lang; label: string; flag: string }> = [
  { id: "en", label: "English", flag: "🇬🇧" },
  { id: "ne", label: "नेपाली", flag: "🇳🇵" },
  { id: "hi", label: "हिन्दी", flag: "🇮🇳" },
];
