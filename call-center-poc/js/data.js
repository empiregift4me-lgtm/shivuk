/* ===================================================================
   DEFAULT_DATA - נתוני דמו (Mock Data) למוקד ההזמנות.
   זהו "מצב המנהל" ההתחלתי: מסעדות, סניפים, זרימת מסכים, תפריט וחוקים.
   כל עריכה בתצוגת המנהל משוכפלת לעותק חי ב-store.js (localStorage),
   כך שהאובייקט הזה עצמו נשאר קבוע ומשמש גם לכפתור "איפוס דמו".
=================================================================== */

const DEFAULT_DATA = {

  menuCategories: [
    { id: 'mains', name: "מנות עיקריות וסושי" },
    { id: 'party', name: "מגשי מסיבה" },
    { id: 'sides', name: "תוספות וסלטים" },
    { id: 'drinks', name: "שתייה" }
  ],

  menuItems: [
    { id: 'rol-cali', name: "רול קליפורניה", price: 42, categoryId: 'mains', tags: ['פופולרי', 'ללא גלוטן'], image: null, desc: "אבוקדו, סורימי, מלפפון"},
    { id: 'rol-salmon', name: "רול סלמון חריף", price: 46, categoryId: 'mains', tags: ['חריף', 'פופולרי'], image: null, desc: "סלמון, מיונז חריף, בצל ירוק" },
    { id: 'rol-tuna', name: "רול טונה", price: 48, categoryId: 'mains', tags: [], image: null, desc: "טונה טרייה, מלפפון, שומשום" },
    { id: 'rol-veg', name: "רול אבוקדו טבעוני", price: 36, categoryId: 'mains', tags: ['טבעוני', 'ללא גלוטן'], image: null, desc: "אבוקדו, מלפפון, גזר" },
    { id: 'sushi-24', name: "מגש 24 חלקים", price: 96, categoryId: 'mains', tags: ['פופולרי'], image: null, desc: "מבחר רולים משתנה" },
    { id: 'sushi-40', name: "מגש 40 חלקים", price: 158, categoryId: 'mains', tags: [], image: null, desc: "מבחר רולים משתנה, מומלץ לזוג" },
    { id: 'party-tray', name: "מגש מסיבה (60 חלקים)", price: 249, categoryId: 'party', tags: ['מומלץ לאירועים'], special: 'party-tray', image: null, desc: "חצי צמחוני, חצי עם דגים - בכפוף לנוהל המגשים" },
    { id: 'edamame', name: "אדממה", price: 18, categoryId: 'sides', tags: ['טבעוני'], image: null, desc: "פולי סויה מאודים במלח ים" },
    { id: 'miso', name: "מרק מיסו", price: 16, categoryId: 'sides', tags: ['טבעוני'], image: null, desc: "מרק סויה מסורתי" },
    { id: 'kale-salad', name: "סלט קייל ומנגו", price: 24, categoryId: 'sides', tags: ['טבעוני', 'בריא'], image: null, desc: "קייל, מנגו, בצל סגול, רוטב פונזו" },
    { id: 'sweet-fries', name: "צ'יפס בטטה", price: 22, categoryId: 'sides', tags: ['טבעוני'], image: null, desc: "מוגש עם מיונז וואסבי" },
    { id: 'ginger-shot', name: "שוט ג'ינג'ר סחוט", price: 12, categoryId: 'drinks', tags: ['בריא'], image: null, desc: "" },
    { id: 'soda', name: "שתייה קלה", price: 12, categoryId: 'drinks', tags: [], image: null, desc: "פחית 330 מ״ל" },
    { id: 'water', name: "מים מינרלים", price: 8, categoryId: 'drinks', tags: [], image: null, desc: "בקבוק 500 מ״ל" }
  ],

  knownCustomers: [
    { phone: '0501234567', fullName: "דוד כהן" },
    { phone: '0521112233', fullName: "מיכל לוי" }
  ],

  restaurants: [
    {
      id: 'japan',
      name: "ג'אפן",
      kinds: ['פרווה', 'סושי'],
      active: true,
      branches: [
        {
          id: 'japan-goh',
          name: "ג'אפן גוש עציון",
          shortName: "גוש עציון",
          address: "מרכז מסחרי אלון שבות, גוש עציון",
          minOrderDelivery: null,
          busySlot: '18:00',
          flow: [
            { id: 'goh-q1', type: 'question', key: 'phone', label: "מה מספר הנייד לביצוע ההזמנה?", inputType: 'tel', autofill: true, required: true, enabled: true },
            { id: 'goh-q2', type: 'question', key: 'fullName', label: "מה השם המלא?", inputType: 'text', autofill: true, required: true, enabled: true },
            { id: 'goh-q3', type: 'question', key: 'fulfillment', label: "משלוח או איסוף?", inputType: 'choice', options: ['משלוח', 'איסוף'], required: true, enabled: true },
            { id: 'goh-q4', type: 'question', key: 'addressOrPickup', dynamic: 'fulfillment-followup', inputType: 'dynamic-fulfillment', required: true, enabled: true },
            { id: 'goh-q5', type: 'question', key: 'timing', label: "ההזמנה היא לעכשיו או ליותר מאוחר?", inputType: 'timing', options: ['עכשיו', 'ליותר מאוחר'], required: true, enabled: true },
            { id: 'goh-menu-mains', type: 'menu', title: "מנות עיקריות, סושי ומגשים", categoryFilter: ['mains', 'party'], entryScript: "מעולה, עכשיו נזמין את המנות שתרצה. אחרי מנות העיקריות נעבור לתוספות ולשתייה בנפרד.", enabled: true },
            { id: 'goh-menu-sides', type: 'menu', title: "תוספות, סלטים ושתייה", categoryFilter: ['sides', 'drinks'], enabled: true },
            { id: 'goh-payment', type: 'payment', title: "תשלום", enabled: true },
            { id: 'goh-summary', type: 'summary', title: "סיכום הזמנה", enabled: true }
          ]
        },
        {
          id: 'japan-pt',
          name: "ג'אפן פתח תקווה",
          shortName: "פתח תקווה",
          address: "רחוב חנקין 12, פתח תקווה",
          minOrderDelivery: 100,
          busySlot: null,
          flow: [
            { id: 'pt-q1', type: 'question', key: 'timing', label: "ההזמנה היא לעכשיו או עתידית?", inputType: 'timing-gate', options: ['עכשיו', 'עתידי'], required: true, enabled: true },
            { id: 'pt-q2', type: 'question', key: 'fulfillment', label: "משלוח או איסוף?", inputType: 'choice', options: ['משלוח', 'איסוף'], required: true, enabled: true },
            { id: 'pt-q3', type: 'question', key: 'phone', label: "מה מספר הנייד לביצוע ההזמנה?", inputType: 'tel', autofill: true, required: true, enabled: true },
            { id: 'pt-q4', type: 'question', key: 'fullName', label: "מה השם המלא?", inputType: 'text', autofill: true, required: true, enabled: true },
            { id: 'pt-q5', type: 'question', key: 'memberCard', label: "התשלום יתבצע בכרטיס \"חבר\"?", inputType: 'choice', options: ['כן', 'לא'], required: true, enabled: true },
            { id: 'pt-q6', type: 'question', key: 'addressOrPickup', dynamic: 'fulfillment-followup', inputType: 'dynamic-fulfillment', required: true, enabled: true },
            { id: 'pt-menu-mains', type: 'menu', title: "מנות עיקריות, סושי ומגשים", categoryFilter: ['mains', 'party'], entryScript: "מעולה, עכשיו נזמין את המנות שתרצה. שימי לב: תוספות ושתייה נמצאות במסך הבא בנפרד.", enabled: true },
            { id: 'pt-menu-sides', type: 'menu', title: "תוספות, סלטים ושתייה", categoryFilter: ['sides', 'drinks'], enabled: true },
            { id: 'pt-payment', type: 'payment', title: "תשלום", enabled: true },
            { id: 'pt-summary', type: 'summary', title: "סיכום הזמנה", enabled: true }
          ]
        }
      ]
    },
    { id: 'sushi-bambu', name: "סושי במבו", kinds: ['סושי'], active: false,
      note: "מוצג לצורך השוואה בלבד: אותה שרשרת עסקית, אך ללא נוהל \"דגים נאים/מטוגנים\" במגשי מסיבה - כי אצלם הנוהל הזה פשוט לא קיים." },
    { id: 'meat-demo', name: "בשריית הפינה", kinds: ['בשרי'], active: false,
      note: "מסעדה לדוגמה בלבד - ממחישה את קנה המידה (עד 50 מסעדות), לא מוגדרת בפועל ב-POC הזה." },
    { id: 'dairy-demo', name: "קפה ולחם", kinds: ['חלבי'], active: false,
      note: "מסעדה לדוגמה בלבד - ממחישה את קנה המידה (עד 50 מסעדות), לא מוגדרת בפועל ב-POC הזה." }
  ],

  /* ---------------------------------------------------------------
     rules - מנוע החוקים והאוטומציות.
     kind:
       blocking       -> עוצר את התהליך, חייבים לבחור כפתור
       reminder       -> תזכורת/תסריט לנציגה, ניתן לסגירה
       guided-choice  -> "תסריט בירור" שממשיך את הזרימה לפי הבחירה
       suggestion     -> הצעה יזומה עם כן/לא, יכולה להפעיל פעולה באתר (כמו שינוי סינון)
     scope: { restaurantId } = חל על כל סניפי השרשרת | { branchId } = סניף בודד בלבד
  --------------------------------------------------------------- */
  rules: [
    {
      id: 'rule-pt-future-delivery',
      scope: { branchId: 'japan-pt' },
      kind: 'blocking',
      name: "חסימת משלוח עתידי",
      triggerNote: "נדלק אחרי מענה על \"עכשיו/עתידי\" ו-\"משלוח/איסוף\" כששני התנאים מתקיימים יחד",
      message: "סליחה, אין לנו משלוחים עתידיים. אפשר עתידי רק באיסוף. תרצה שאבצע לך את ההזמנה באיסוף?",
      buttons: [
        { label: "כן, רוצה איסוף", action: 'set:fulfillment=איסוף' },
        { label: "לא, תעשי לי לעכשיו", action: 'set:timing=עכשיו' },
        { label: "לא, אני מבטל את ההזמנה", action: 'cancelOrder' }
      ],
      enabled: true
    },
    {
      id: 'rule-japan-party-tray-member-card',
      scope: { restaurantId: 'japan' },
      kind: 'blocking',
      name: "חסימת כרטיס חבר על מגש מסיבה",
      triggerNote: "נדלק כשמנסים להוסיף \"מגש מסיבה\" לעגלה ובשאילתות נענה שהתשלום בכרטיס חבר",
      message: "אי אפשר לשלם אצלנו בכרטיס חבר על מגש זה.",
      buttons: [
        { label: "הבנתי, מסיר מהעגלה", action: 'removeFromCart' }
      ],
      enabled: true
    },
    {
      id: 'rule-japan-party-tray-fish',
      scope: { restaurantId: 'japan' },
      kind: 'guided-choice',
      name: "בירור הכנת דגים במגש מסיבה",
      triggerNote: "נדלק כשמוסיפים \"מגש מסיבה\" לעגלה (ואין חסימת כרטיס חבר)",
      message: "נוהל המגשים שלנו הוא שהם מגיעים חצי צמחוני ללא דגים, והחצי השני עם דגים. תרצה את חצי הדגים נאים או מטוגנים?",
      buttons: [
        { label: "דגים נאים", action: 'setItemNote:נאים' },
        { label: "דגים מטוגנים", action: 'setItemNote:מטוגנים' }
      ],
      enabled: true
    },
    {
      id: 'rule-japan-party-tray-tuna',
      scope: { restaurantId: 'japan' },
      kind: 'reminder',
      name: "תזכורת החלפת טונה בסלמון",
      triggerNote: "נדלק מיד אחרי שנבחרו \"דגים נאים\" בבירור המגש",
      message: "מעולה, שמתי לך דגים נאים. רק חשוב לי לציין שלא מגישים אצלנו טונה נאה, אז במקום טונה תקבלו סלמון.",
      buttons: [
        { label: "הבנתי", action: 'dismiss' }
      ],
      enabled: true
    },
    {
      id: 'rule-pt-min-order',
      scope: { branchId: 'japan-pt' },
      kind: 'suggestion',
      name: "השלמת מינימום הזמנה למשלוח",
      triggerNote: "נדלק בכל שינוי בעגלה כשנבחר \"משלוח\" והסכום קרוב למינימום ההזמנה (100 ₪) אך לא מגיע אליו",
      message: "אדוני, חסר לך {{gap}} ₪ להשלמת מינימום ההזמנה למשלוח ({{min}} ₪). תרצה שאציע לך מוצרים במחיר הזה?",
      buttons: [
        { label: "כן, תציע לי מוצרים", action: 'applyPriceFilterToGap' },
        { label: "לא תודה", action: 'dismiss' }
      ],
      enabled: true
    },
    {
      id: 'rule-goh-busy-slot',
      scope: { branchId: 'japan-goh' },
      kind: 'reminder',
      name: "תזכורת עומס בשעת משלוח",
      triggerNote: "נדלק כשנבחרת שעת משלוח עמוסה (18:00) בשאלת התזמון",
      message: "אתה מזמין ליותר מאוחר לשעה 18:00 - חשוב לי לציין מראש שיכול להיות עיכוב של עד 30 דקות בשעה הזו.",
      buttons: [
        { label: "הבנתי, ממשיך", action: 'dismiss' }
      ],
      enabled: true
    }
  ]
};
