/* ============================================================================
   MindBridge — language pack.
   The language chosen at sign-up drives both the on-screen labels and the
   voice narration locale. Languages without a full pack fall back to English
   text but keep their own speech locale where a voice exists.
   ==========================================================================*/

(function () {
  "use strict";

  var STRINGS = {
    en: {
      justNow: "just now", minsAgo: "{n}m ago", hoursAgo: "{n}h ago", yesterday: "yesterday", daysAgo: "{n}d ago",
      tagline: "Cognitive Care Companion",
      morning: "Good morning", afternoon: "Good afternoon", evening: "Good evening",
      caretakerSuffix: "caretaker",
      synced: "Synced", offline: "Offline", signOut: "Sign out",
      patientView: "Patient", caretakerView: "Caretaker",
      years: "years", dayStreak: "day streak",
      avgScore: "Average score", acrossSessions: "across {n} sessions",
      minutesActive: "Minutes active", thisWeek: "this week",
      bestScore: "Best score", personalBest: "personal best",
      weeklyProgress: "Weekly Progress", weeklyProgressSub: "Session scores over the past week",
      wellbeing: "Wellbeing Index", wellbeingSub: "AI-assessed cognitive mood",
      recentActivity: "Recent Activity", recentActivitySub: "Latest cognitive sessions",
      start: "Start", caregiverAlerts: "Caregiver Alerts", alertsSub: "Updates and reminders",
      outOf: "out of 100",
      stable: "Stable", needsSupport: "Needs support",
      memoryImproving: "Memory improving", memorySteady: "Memory steady",
      moodPositive: "Mood positive", moodWatchful: "Mood watchful",
      noSessions: "No sessions yet. Tap Start to begin the first exercise.",
      noAlerts: "All caught up. No new alerts.",
      chooseSession: "Start a session", chooseSessionSub: "Choose a cognitive exercise for {name}",
      sessionComplete: "Session complete!", done: "Done",
      questionOf: "Question {i} of {n}",
      excellent: "Excellent work today.", steady: "Nice and steady progress.", keepGoing: "Good effort — keep practising.",
      correct: "Correct!", notQuite: "Not quite.", tryAgain: "Try again.", matched: "Matched!",
      wordGarden: "Word Garden", memoryMatch: "Memory Match", picturePath: "Picture Path",
      language: "Language", memory: "Memory", focus: "Focus",
      findPairs: "Find all 4 pairs", tapOrder: "Tap the shapes in the order shown",
      acknowledged: "acknowledged"
    },

    hi: {
      justNow: "अभी", minsAgo: "{n} मिनट पहले", hoursAgo: "{n} घंटे पहले", yesterday: "कल", daysAgo: "{n} दिन पहले",
      tagline: "संज्ञानात्मक देखभाल साथी",
      morning: "सुप्रभात", afternoon: "नमस्कार", evening: "शुभ संध्या",
      caretakerSuffix: "देखभालकर्ता",
      synced: "सिंक हो गया", offline: "ऑफ़लाइन", signOut: "साइन आउट",
      patientView: "मरीज़", caretakerView: "देखभालकर्ता",
      years: "वर्ष", dayStreak: "दिन लगातार",
      avgScore: "औसत स्कोर", acrossSessions: "{n} सत्रों में",
      minutesActive: "सक्रिय मिनट", thisWeek: "इस सप्ताह",
      bestScore: "सर्वश्रेष्ठ स्कोर", personalBest: "व्यक्तिगत सर्वश्रेष्ठ",
      weeklyProgress: "साप्ताहिक प्रगति", weeklyProgressSub: "पिछले सप्ताह के सत्र स्कोर",
      wellbeing: "कल्याण सूचकांक", wellbeingSub: "एआई द्वारा आंका गया मानसिक भाव",
      recentActivity: "हाल की गतिविधि", recentActivitySub: "नवीनतम संज्ञानात्मक सत्र",
      start: "शुरू करें", caregiverAlerts: "देखभाल सूचनाएँ", alertsSub: "अपडेट और अनुस्मारक",
      outOf: "100 में से",
      stable: "स्थिर", needsSupport: "सहायता चाहिए",
      memoryImproving: "स्मृति बेहतर", memorySteady: "स्मृति स्थिर",
      moodPositive: "मनोदशा अच्छी", moodWatchful: "मनोदशा पर ध्यान",
      noSessions: "अभी कोई सत्र नहीं। पहला अभ्यास शुरू करने के लिए दबाएँ।",
      noAlerts: "सब कुछ पूरा। कोई नई सूचना नहीं।",
      chooseSession: "सत्र शुरू करें", chooseSessionSub: "{name} के लिए एक अभ्यास चुनें",
      sessionComplete: "सत्र पूरा हुआ!", done: "ठीक है",
      questionOf: "प्रश्न {i} / {n}",
      excellent: "आज बहुत अच्छा काम किया।", steady: "अच्छी और स्थिर प्रगति।", keepGoing: "अच्छा प्रयास — अभ्यास जारी रखें।",
      correct: "सही!", notQuite: "बिलकुल नहीं।", tryAgain: "फिर कोशिश करें।", matched: "मिल गया!",
      wordGarden: "शब्द बगीचा", memoryMatch: "स्मृति जोड़ी", picturePath: "चित्र पथ",
      language: "भाषा", memory: "स्मृति", focus: "एकाग्रता",
      findPairs: "चारों जोड़ियाँ खोजें", tapOrder: "आकृतियों को दिखाए क्रम में दबाएँ",
      acknowledged: "स्वीकृत"
    },

    as: {
      justNow: "এইমাত্ৰ", minsAgo: "{n} মিনিট আগত", hoursAgo: "{n} ঘণ্টা আগত", yesterday: "কালি", daysAgo: "{n} দিন আগত",
      tagline: "সজ্ঞানাত্মক যত্নৰ সংগী",
      morning: "শুভ ৰাতিপুৱা", afternoon: "শুভ আবেলি", evening: "শুভ সন্ধিয়া",
      caretakerSuffix: "যত্নকাৰী",
      synced: "চিংক হৈছে", offline: "অফলাইন", signOut: "চাইন আউট",
      patientView: "ৰোগী", caretakerView: "যত্নকাৰী",
      years: "বছৰ", dayStreak: "দিনৰ ধাৰা",
      avgScore: "গড় নম্বৰ", acrossSessions: "{n} টা অধিৱেশনত",
      minutesActive: "সক্ৰিয় মিনিট", thisWeek: "এই সপ্তাহত",
      bestScore: "সৰ্বোত্তম নম্বৰ", personalBest: "ব্যক্তিগত সৰ্বোত্তম",
      weeklyProgress: "সাপ্তাহিক প্ৰগতি", weeklyProgressSub: "যোৱা সপ্তাহৰ নম্বৰ",
      wellbeing: "সুস্থতা সূচক", wellbeingSub: "এআই-নিৰ্ধাৰিত মানসিক অৱস্থা",
      recentActivity: "শেহতীয়া কাৰ্যকলাপ", recentActivitySub: "শেহতীয়া অধিৱেশনসমূহ",
      start: "আৰম্ভ", caregiverAlerts: "যত্নকাৰীৰ সতৰ্কবাণী", alertsSub: "আপডেট আৰু মনত পেলোৱা",
      outOf: "১০০ ৰ ভিতৰত",
      stable: "স্থিৰ", needsSupport: "সহায় প্ৰয়োজন",
      memoryImproving: "স্মৃতি উন্নত", memorySteady: "স্মৃতি স্থিৰ",
      moodPositive: "মন ভাল", moodWatchful: "মনৰ প্ৰতি লক্ষ্য",
      noSessions: "এতিয়ালৈকে কোনো অধিৱেশন নাই। প্ৰথমটো আৰম্ভ কৰক।",
      noAlerts: "সকলো সম্পূৰ্ণ। নতুন সতৰ্কবাণী নাই।",
      chooseSession: "অধিৱেশন আৰম্ভ কৰক", chooseSessionSub: "{name} ৰ বাবে এটা অনুশীলন বাছক",
      sessionComplete: "অধিৱেশন সম্পূৰ্ণ!", done: "সম্পন্ন",
      questionOf: "প্ৰশ্ন {i} / {n}",
      excellent: "আজি অতি ভাল কৰিলে।", steady: "ভাল আৰু স্থিৰ প্ৰগতি।", keepGoing: "ভাল চেষ্টা — অনুশীলন কৰি থাকক।",
      correct: "শুদ্ধ!", notQuite: "সঠিক নহয়।", tryAgain: "আকৌ চেষ্টা কৰক।", matched: "মিলিল!",
      wordGarden: "শব্দ বাগিচা", memoryMatch: "স্মৃতি মিলন", picturePath: "ছবিৰ পথ",
      language: "ভাষা", memory: "স্মৃতি", focus: "মনোযোগ",
      findPairs: "চাৰিটা যোৰ বিচাৰক", tapOrder: "দেখুওৱা ক্ৰমত আকৃতিবোৰ টিপক",
      acknowledged: "স্বীকৃত"
    },

    bn: {
      justNow: "এইমাত্র", minsAgo: "{n} মিনিট আগে", hoursAgo: "{n} ঘণ্টা আগে", yesterday: "গতকাল", daysAgo: "{n} দিন আগে",
      tagline: "জ্ঞানীয় যত্নের সঙ্গী",
      morning: "শুভ সকাল", afternoon: "শুভ অপরাহ্ন", evening: "শুভ সন্ধ্যা",
      caretakerSuffix: "যত্নকারী",
      synced: "সিঙ্ক হয়েছে", offline: "অফলাইন", signOut: "সাইন আউট",
      patientView: "রোগী", caretakerView: "যত্নকারী",
      years: "বছর", dayStreak: "দিনের ধারা",
      avgScore: "গড় স্কোর", acrossSessions: "{n} টি সেশনে",
      minutesActive: "সক্রিয় মিনিট", thisWeek: "এই সপ্তাহে",
      bestScore: "সেরা স্কোর", personalBest: "ব্যক্তিগত সেরা",
      weeklyProgress: "সাপ্তাহিক অগ্রগতি", weeklyProgressSub: "গত সপ্তাহের সেশন স্কোর",
      wellbeing: "সুস্থতা সূচক", wellbeingSub: "এআই-নির্ধারিত মানসিক অবস্থা",
      recentActivity: "সাম্প্রতিক কার্যকলাপ", recentActivitySub: "সাম্প্রতিক সেশনসমূহ",
      start: "শুরু", caregiverAlerts: "যত্নকারীর সতর্কতা", alertsSub: "আপডেট ও অনুস্মারক",
      outOf: "১০০ এর মধ্যে",
      stable: "স্থিতিশীল", needsSupport: "সহায়তা প্রয়োজন",
      memoryImproving: "স্মৃতি উন্নত", memorySteady: "স্মৃতি স্থিতিশীল",
      moodPositive: "মেজাজ ভালো", moodWatchful: "মেজাজে নজর",
      noSessions: "এখনও কোনো সেশন নেই। প্রথমটি শুরু করুন।",
      noAlerts: "সব সম্পন্ন। নতুন সতর্কতা নেই।",
      chooseSession: "সেশন শুরু করুন", chooseSessionSub: "{name} এর জন্য একটি অনুশীলন বাছুন",
      sessionComplete: "সেশন সম্পূর্ণ!", done: "সম্পন্ন",
      questionOf: "প্রশ্ন {i} / {n}",
      excellent: "আজ চমৎকার কাজ।", steady: "ভালো ও স্থিতিশীল অগ্রগতি।", keepGoing: "ভালো চেষ্টা — অনুশীলন চালিয়ে যান।",
      correct: "সঠিক!", notQuite: "ঠিক নয়।", tryAgain: "আবার চেষ্টা করুন।", matched: "মিলেছে!",
      wordGarden: "শব্দ বাগান", memoryMatch: "স্মৃতি মিলন", picturePath: "ছবির পথ",
      language: "ভাষা", memory: "স্মৃতি", focus: "মনোযোগ",
      findPairs: "চারটি জোড়া খুঁজুন", tapOrder: "দেখানো ক্রমে আকৃতিগুলি স্পর্শ করুন",
      acknowledged: "স্বীকৃত"
    }
  };

  /* Word Garden question banks. Languages without a bank use the English one. */
  var WORD_SETS = {
    en: [
      { prompt: "Which word means 'happy'?",          options: ["Joyful", "Table", "Rainy", "Silent"],  answer: "Joyful" },
      { prompt: "Which word means 'to walk slowly'?", options: ["Sprint", "Stroll", "Shout", "Freeze"], answer: "Stroll" },
      { prompt: "Which word is a fruit?",             options: ["Mango", "Chair", "Cloud", "Pencil"],   answer: "Mango" }
    ],
    hi: [
      { prompt: "कौन सा शब्द 'खुश' का अर्थ देता है?", options: ["प्रसन्न", "मेज़", "बारिश", "चुप"],  answer: "प्रसन्न" },
      { prompt: "कौन सा शब्द 'धीरे चलना' है?",        options: ["दौड़ना", "टहलना", "चिल्लाना", "रुकना"], answer: "टहलना" },
      { prompt: "इनमें से कौन सा फल है?",             options: ["आम", "कुर्सी", "बादल", "पेंसिल"],  answer: "आम" }
    ],
    as: [
      { prompt: "কোনটো শব্দই 'সুখী' বুজায়?",        options: ["আনন্দিত", "মেজ", "বৰষুণ", "নিমাত"], answer: "আনন্দিত" },
      { prompt: "কোনটোৱে 'লাহে লাহে খোজ কঢ়া' বুজায়?", options: ["দৌৰা", "ভ্ৰমণ কৰা", "চিঞৰা", "ৰোৱা"], answer: "ভ্ৰমণ কৰা" },
      { prompt: "ইয়াৰ ভিতৰত কোনটো ফল?",            options: ["আম", "চকী", "ডাৱৰ", "পেঞ্চিল"],   answer: "আম" }
    ],
    bn: [
      { prompt: "কোন শব্দটি 'সুখী' বোঝায়?",        options: ["আনন্দিত", "টেবিল", "বৃষ্টি", "নীরব"], answer: "আনন্দিত" },
      { prompt: "কোনটি 'ধীরে হাঁটা' বোঝায়?",       options: ["দৌড়ানো", "পায়চারি", "চিৎকার", "থামা"], answer: "পায়চারি" },
      { prompt: "এর মধ্যে কোনটি ফল?",              options: ["আম", "চেয়ার", "মেঘ", "পেন্সিল"],   answer: "আম" }
    ]
  };

  /* Shape names read aloud in Picture Path. */
  var SHAPE_NAMES = {
    en: ["triangle", "blue circle", "black square", "star", "diamond", "green circle"],
    hi: ["त्रिभुज", "नीला गोला", "काला वर्ग", "तारा", "हीरा", "हरा गोला"],
    as: ["ত্ৰিভুজ", "নীলা বৃত্ত", "ক'লা বৰ্গ", "তৰা", "হীৰা", "সেউজীয়া বৃত্ত"],
    bn: ["ত্রিভুজ", "নীল বৃত্ত", "কালো বর্গ", "তারা", "হীরা", "সবুজ বৃত্ত"]
  };

  var current = "en";
  var speechLocale = "en-IN";

  function setLanguage(code, speech) {
    current = STRINGS[code] ? code : "en";
    speechLocale = speech || "en-IN";
    document.documentElement.setAttribute("lang", code || "en");
  }

  /** Translate a key, with {placeholder} substitution. */
  function t(key, values) {
    var pack = STRINGS[current] || STRINGS.en;
    var text = pack[key] != null ? pack[key] : STRINGS.en[key];
    if (text == null) return key;
    if (values) {
      Object.keys(values).forEach(function (name) {
        text = text.replace(new RegExp("\\{" + name + "\\}", "g"), values[name]);
      });
    }
    return text;
  }

  window.I18N = {
    setLanguage: setLanguage,
    t: t,
    get code() { return current; },
    get speech() { return speechLocale; },
    wordSets: function () { return WORD_SETS[current] || WORD_SETS.en; },
    shapeNames: function () { return SHAPE_NAMES[current] || SHAPE_NAMES.en; }
  };
})();
