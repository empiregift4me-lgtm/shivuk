/* ===================================================================
   DEFAULT_DATA - נתוני דמו (Mock Data) למוקד ההזמנות.
   זהו "מצב המנהל" ההתחלתי: מסעדות, סניפים, זרימת מסכים, תפריט, מרכיבים
   וחוקים. כל עריכה בתצוגת המנהל משוכפלת לעותק חי ב-store.js
   (localStorage), כך שהאובייקט הזה עצמו נשאר קבוע ומשמש גם לכפתור
   "איפוס דמו".

   SCHEMA_VERSION: כל שינוי במבנה הנתונים (למשל הוספת שדה חובה חדש)
   חייב להעלות את המספר הזה. store.js משווה אותו לגרסה השמורה ב-
   localStorage, וכשיש אי-התאמה מתעלם מהעותק הישן וטוען מחדש את
   ברירת המחדל - כדי שדפדפן שנשאר עם נתונים מסבב-בדיקה קודם לא יקרוס
   בשקט על שדות שעדיין לא קיימים אצלו.

   מסך מסוג 'question' מורכב מרצף blocks (זה מה שמאפשר לבנות אותו
   בגרירה בתצוגת המנהל, ולערבב בו כמה שאילתות/תסריטים/פופאפים):
     { kind:'script',   text }                       - טקסט מוטמע במסך
     { kind:'popup',    text }                        - פופאפ תזכורת חד-פעמי בכניסה למסך
     { kind:'question', key, label, responseType, ... } - שאילתה בפועל
   responseType: 'buttons' | 'dropdown' | 'multiselect' | 'short-text'
   מסכי menu/payment/summary נשארים במבנה הייעודי שלהם, אך גם הם יכולים
   לשאת leadingBlocks (script/popup) שמוצגים לפני התוכן הראשי שלהם.
   מסך מסוג 'menu' הוא מסך אחד לכל סניף, עם לשוניות-קטגוריה לפי
   restaurant.menuCategoryIds (מוגדר בתצוגת מנהל).
=================================================================== */

const SCHEMA_VERSION = 4;

const DEFAULT_DATA = {
  _schemaVersion: SCHEMA_VERSION,

  menuCategories: [
    { id: 'mains', name: "מנות עיקריות וסושי" },
    { id: 'party', name: "מגשי מסיבה" },
    { id: 'sides', name: "תוספות וסלטים" },
    { id: 'drinks', name: "שתייה" }
  ],

  menuItems: [
    { id: 'rol-cali', name: "רול קליפורניה", price: 42, categoryId: 'mains', tags: ['פופולרי', 'ללא גלוטן'], image: null, desc: "אבוקדו, סורימי, מלפפון" },
    { id: 'rol-salmon', name: "רול סלמון חריף", price: 46, categoryId: 'mains', tags: ['חריף', 'פופולרי'], image: null, desc: "סלמון, מיונז חריף, בצל ירוק" },
    { id: 'rol-tuna', name: "רול טונה", price: 48, categoryId: 'mains', tags: [], image: null, desc: "טונה טרייה, מלפפון, שומשום" },
    { id: 'rol-veg', name: "רול אבוקדו טבעוני", price: 36, categoryId: 'mains', tags: ['טבעוני', 'ללא גלוטן'], image: null, desc: "אבוקדו, מלפפון, גזר" },
    {
      id: 'build-your-own', name: "רול לבחירה אישית", price: 44, categoryId: 'mains', tags: ['התאמה אישית'], image: null,
      desc: "לוחצים על המנה ובוחרים מילוי בעצמכם", customizable: true,
      ingredientIds: ['ing-sweet-potato', 'ing-cucumber', 'ing-avocado', 'ing-salmon', 'ing-tuna', 'ing-carrot', 'ing-cream-cheese']
    },
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

  /* ספריית רכיבים מובנים לפלטת הגרירה בתצוגת מנהל - תבניות מוכנות
     שאפשר לגרור (או ללחוץ עליהן) כדי להוסיף לבניית מסך. "יצירת חדש"
     בכל קטגוריה מוסיפה בלוק ריק לעריכה. */
  blockLibrary: {
    questions: [
      { label: "טלפון נייד", template: { key: 'phone', label: "מה מספר הנייד לביצוע ההזמנה?", responseType: 'short-text', inputMode: 'tel', autofill: true, required: true } },
      { label: "שם מלא", template: { key: 'fullName', label: "מה השם המלא?", responseType: 'short-text', autofill: true, required: true } },
      { label: "משלוח או איסוף", template: { key: 'fulfillment', label: "משלוח או איסוף?", responseType: 'buttons', options: ['משלוח', 'איסוף'], required: true } },
      { label: "עכשיו או עתידי", template: { key: 'timing', label: "ההזמנה היא לעכשיו או עתידית?", responseType: 'buttons', options: ['עכשיו', 'עתידי'], required: true } },
      { label: "שאלת כן/לא (תפריט נפתח)", template: { key: 'customYesNo', label: "שאלה חדשה...", responseType: 'dropdown', options: ['כן', 'לא'], required: false } },
      { label: "אלרגיות (בחירה מרובה)", template: { key: 'allergies', label: "יש אלרגיות שכדאי לדעת עליהן?", responseType: 'multiselect', options: ['בוטנים', 'גלוטן', 'ביצים', 'שומשום'], required: false } }
    ],
    scripts: [
      { label: "פתיחה - איסוף פרטים", template: { text: "לפני שאני מתחילה אני אשאל אותך מספר שאלות כדי לבצע את ההזמנה על הצד הטוב ביותר" } },
      { label: "מעבר לתפריט", template: { text: "מעולה, עכשיו נזמין את המנות שתרצה." } }
    ],
    popups: [
      { label: "תזכורת כללית לנציגה", template: { text: "תזכורת לנציגה: לוודא את כל פרטי ההזמנה מול הלקוח לפני הסיום." } }
    ]
  },

  restaurants: [
    {
      id: 'japan',
      name: "ג'אפן",
      kinds: ['פרווה', 'סושי'],
      active: true,
      menuCategoryIds: ['mains', 'party', 'sides', 'drinks'],
      ingredients: [
        { id: 'ing-sweet-potato', name: 'בטטה' },
        { id: 'ing-cucumber', name: 'מלפפון' },
        { id: 'ing-avocado', name: 'אבוקדו' },
        { id: 'ing-salmon', name: 'סלמון' },
        { id: 'ing-tuna', name: 'טונה' },
        { id: 'ing-carrot', name: 'גזר' },
        { id: 'ing-cream-cheese', name: 'גבינת שמנת' }
      ],
      branches: [
        {
          id: 'japan-goh',
          name: "ג'אפן גוש עציון",
          shortName: "גוש עציון",
          address: "מרכז מסחרי אלון שבות, גוש עציון",
          openingHours: "א'-ה' 12:00-23:00 · ו' 11:00-15:00 · מוצ״ש שעה אחרי צאת השבת עד 23:00",
          kashrut: "בד״ץ בית יוסף - פרווה",
          busySlot: '18:00',
          unavailableIngredientIds: [],
          deliveryZones: [
            { id: 'zone-goh-local', name: "גוש עציון (מקומי)", minOrder: 0, deliveryFee: 15, waitMin: 45, waitMax: 60 }
          ],
          flow: [
            {
              id: 'goh-s1', type: 'question', title: "פרטי התקשרות", enabled: true,
              blocks: [
                { id: 'goh-s1-b1', kind: 'script', text: "לפני שאני מתחילה אני אשאל אותך מספר שאלות כדי לבצע את ההזמנה על הצד הטוב ביותר" },
                { id: 'goh-s1-b2', kind: 'question', key: 'phone', label: "מה מספר הנייד לביצוע ההזמנה?", responseType: 'short-text', inputMode: 'tel', autofill: true, required: true },
                { id: 'goh-s1-b3', kind: 'question', key: 'fullName', label: "מה השם המלא?", responseType: 'short-text', autofill: true, required: true },
                { id: 'goh-s1-b4', kind: 'question', key: 'allergies', label: "יש אלרגיות שכדאי לדעת עליהן?", responseType: 'multiselect', options: ['בוטנים', 'גלוטן', 'ביצים', 'שומשום'], required: false }
              ]
            },
            {
              id: 'goh-s2', type: 'question', title: "משלוח או איסוף", enabled: true,
              blocks: [
                { id: 'goh-s2-b1', kind: 'question', key: 'fulfillment', label: "משלוח או איסוף?", responseType: 'buttons', options: ['משלוח', 'איסוף'], required: true }
              ]
            },
            {
              id: 'goh-s3', type: 'question', title: "כתובת / איסוף", enabled: true,
              blocks: [
                { id: 'goh-s3-b1', kind: 'question', key: 'addressOrPickup', dynamic: 'fulfillment-followup', responseType: 'dynamic-fulfillment', required: true }
              ]
            },
            {
              id: 'goh-s4', type: 'question', title: "תזמון ההזמנה", enabled: true,
              blocks: [
                { id: 'goh-s4-b1', kind: 'question', key: 'timing', label: "ההזמנה היא לעכשיו או ליותר מאוחר?", responseType: 'timing-slots', options: ['עכשיו', 'ליותר מאוחר'], required: true }
              ]
            },
            {
              id: 'goh-menu', type: 'menu', title: "תפריט", enabled: true,
              leadingBlocks: [{ id: 'goh-mm-b1', kind: 'popup', text: "מעולה, עכשיו נזמין את המנות שתרצה. אפשר לדפדף בין הלשוניות למעלה." }]
            },
            { id: 'goh-payment', type: 'payment', title: "תשלום", enabled: true, leadingBlocks: [] },
            { id: 'goh-summary', type: 'summary', title: "סיכום הזמנה", enabled: true, leadingBlocks: [] }
          ]
        },
        {
          id: 'japan-pt',
          name: "ג'אפן פתח תקווה",
          shortName: "פתח תקווה",
          address: "רחוב חנקין 12, פתח תקווה",
          openingHours: "א'-ה' 12:00-23:30 · ו' 11:00-15:30 · מוצ״ש שעה אחרי צאת השבת עד 00:00",
          kashrut: "רבנות פתח תקווה - פרווה",
          busySlot: null,
          unavailableIngredientIds: ['ing-cucumber'],
          deliveryZones: [
            { id: 'zone-pt-local', name: "פתח תקווה (מקומי)", minOrder: 0, deliveryFee: 12, waitMin: 60, waitMax: 60 },
            { id: 'zone-pt-nehalim', name: "נחלים", minOrder: 120, deliveryFee: 30, waitMin: 60, waitMax: 75 }
          ],
          flow: [
            {
              id: 'pt-s1', type: 'question', title: "פתיחה + תזמון", enabled: true,
              blocks: [
                { id: 'pt-s1-b1', kind: 'script', text: "לפני שאני מתחילה אני אשאל אותך מספר שאלות כדי לבצע את ההזמנה על הצד הטוב ביותר" },
                { id: 'pt-s1-b2', kind: 'question', key: 'timing', label: "ההזמנה היא לעכשיו או עתידית?", responseType: 'buttons', options: ['עכשיו', 'עתידי'], required: true }
              ]
            },
            {
              id: 'pt-s2', type: 'question', title: "משלוח או איסוף", enabled: true,
              blocks: [
                { id: 'pt-s2-b1', kind: 'question', key: 'fulfillment', label: "משלוח או איסוף?", responseType: 'buttons', options: ['משלוח', 'איסוף'], required: true }
              ]
            },
            {
              id: 'pt-s3', type: 'question', title: "פרטי התקשרות", enabled: true,
              blocks: [
                { id: 'pt-s3-b1', kind: 'question', key: 'phone', label: "מה מספר הנייד לביצוע ההזמנה?", responseType: 'short-text', inputMode: 'tel', autofill: true, required: true },
                { id: 'pt-s3-b2', kind: 'question', key: 'fullName', label: "מה השם המלא?", responseType: 'short-text', autofill: true, required: true }
              ]
            },
            {
              id: 'pt-s4', type: 'question', title: "אמצעי תשלום מועדף", enabled: true,
              blocks: [
                { id: 'pt-s4-b1', kind: 'question', key: 'memberCard', label: "התשלום יתבצע בכרטיס \"חבר\"?", responseType: 'dropdown', options: ['כן', 'לא'], required: true },
                { id: 'pt-s4-b2', kind: 'script', text: "יש לוודא מול הלקוח את מספר כרטיס ה\"חבר\" ולציין אותו בפרטי ההזמנה - לתשומת לב: במגשי מסיבה לא ניתן לשלם בכרטיס חבר.", condition: { key: 'memberCard', equals: 'כן' } }
              ]
            },
            {
              id: 'pt-s5', type: 'question', title: "כתובת / איסוף", enabled: true,
              blocks: [
                { id: 'pt-s5-b1', kind: 'question', key: 'addressOrPickup', dynamic: 'fulfillment-followup', responseType: 'dynamic-fulfillment', required: true }
              ]
            },
            {
              id: 'pt-menu', type: 'menu', title: "תפריט", enabled: true,
              leadingBlocks: [{ id: 'pt-mm-b1', kind: 'popup', text: "מעולה, עכשיו נזמין את המנות שתרצה. אפשר לדפדף בין הלשוניות למעלה." }]
            },
            { id: 'pt-payment', type: 'payment', title: "תשלום", enabled: true, leadingBlocks: [] },
            { id: 'pt-summary', type: 'summary', title: "סיכום הזמנה", enabled: true, leadingBlocks: [] }
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
     rules - מנוע החוקים והאוטומציות החוצות-מסכים (הלשונית "אוטומציות").
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
      triggerNote: "נדלק כשלוחצים \"המשך\" מהתפריט הלאה לתשלום, אם נבחר \"משלוח\" והסכום קרוב למינימום ההזמנה של אזור המשלוח שנבחר (למשל אזור נחלים: 120 ₪) אך לא מגיע אליו",
      message: "אדוני, חסר לך {{gap}} ₪ להשלמת מינימום ההזמנה למשלוח ({{min}} ₪). תרצה שאציע לך מוצרים במחיר הזה?",
      buttons: [
        { label: "כן, תציע לי מוצרים", action: 'applyPriceFilterToGap' },
        { label: "לא, המשך לתשלום", action: 'dismiss' }
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
