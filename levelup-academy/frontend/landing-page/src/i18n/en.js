/**
 * English strings for the landing page — the only source of text for the en version.
 *
 * The structure must match ru.js and uz.js key for key: a missing key renders as
 * `undefined` in the markup rather than failing the build.
 *
 * CEO note: the English version targets global queries ("school management software",
 * "student management system", "learning center software", "education CRM"), not
 * translations of the Russian ones. The product is the same; the search intent is not.
 */
export default {
  lang: { code: 'en', label: 'EN', switchTo: 'Русский', switchToCode: 'ru' },

  nav: {
    features: 'Features',
    roles: 'Roles',
    finance: 'Finance',
    pricing: 'Pricing',
    langSchool: 'Language schools',
    courses: 'Courses & tutors',
    vsExcel: 'CRM vs Excel',
    vsModme: 'Compared to Modme',
    vsUmai: 'Compared to Umai CRM',
    blog: 'Knowledge base',
    gamification: 'Motivation',
    faq: 'FAQ',
    about: 'About us',
    team: 'Team',
    contacts: 'Contact',
    home: 'Home',
    login: 'Log in',
    menu: 'Menu',
    skipToContent: 'Skip to content',
    primaryLabel: 'Primary navigation',
    mobileLabel: 'Mobile menu',
  },

  common: {
    trial: 'First week free — no card, no commitment',
    leaderboardWeek: 'Leaderboard · Week',
    coins: '★ coins',
  },

  cta: {
    defaultTitle: 'Ready to get your center under control?',
    defaultText:
      'Connect LevelUp Academy and move payments, studies and motivation into one system today.',
    button: 'Get in touch',
  },

  footer: {
    tagline: 'School management software: finance, studies and motivation in one system.',
    product: 'Product',
    navigation: 'Navigation',
    contact: 'Contact',
    writeUs: 'Message us',
    leaveRequest: 'Request a demo',
    rights: '© 2026 LevelUp Academy. All rights reserved.',
    madeIn: 'Made in Uzbekistan 🇺🇿',
  },

  home: {
    badge: 'School management software',
    h1: 'Your learning center, fully under control',
    lead: 'Payments, attendance, exams, gamification and chats — in one system. Six roles, a live online counter and Telegram notifications out of the box.',
    ctaPrimary: 'Request a demo',
    ctaSecondary: 'See the features',

    dash: {
      title: 'Administrator dashboard',
      sub: 'Branch: Chilanzar',
      revenue: 'Revenue / mo',
      students: 'Students',
      debtors: 'Debtors',
      chart: 'Grade distribution',
    },

    band: {
      roles: 'roles in one system',
      modules: 'working modules',
      live: 'live online counter',
      telegram: 'Telegram notifications',
    },

    featuresHead: 'Everything you need to run a center',
    featuresLead:
      'One product instead of a dozen spreadsheets and chats. Finance, studies and motivation in a shared system with roles and permissions.',
    features: [
      {
        icon: 'coin',
        title: 'Finance under control',
        text: 'Split payments (cash + card), invoices and receipts. Debts and revenue update in real time.',
      },
      {
        icon: 'check',
        title: 'Attendance',
        text: 'A mentor register and a history for parents. A missed class triggers an automatic Telegram notification.',
      },
      {
        icon: 'clock',
        title: 'Timed exams',
        text: 'Test builder, server-side deadline and auto-submit. Grading on a transparent 0–100 scale.',
      },
      {
        icon: 'star',
        title: 'Motivation',
        text: 'Coins for performance and activity, a rewards shop and weekly and monthly leaderboards. The coin ledger is append-only.',
      },
      {
        icon: 'chat',
        title: 'Realtime chats',
        text: 'A center-wide chat and a direct parent-to-administrator channel. Live presence and instant delivery.',
      },
      {
        icon: 'grid',
        title: 'Reports and roles',
        text: 'Revenue, debts, mentor payroll. RBAC across 6 roles and multi-branch support from day one.',
      },
    ],

    rolesHead: 'Six roles — six workspaces',
    rolesLead:
      'After login, the role in the token opens the right workspace by itself. Nobody sees more than they should — the server decides access.',
    roles: [
      { tag: 'C', title: 'CEO', text: 'The whole branch network and global reports with no branch filter.' },
      { tag: 'A', title: 'Admin', text: 'Payments, groups, students and reports for their own branch.' },
      { tag: 'M', title: 'Mentor', text: 'Attendance, homework review, coins, exams and their own payroll.' },
      { tag: 'ME', title: 'Methodist', text: 'Curriculum, topics and lessons with video, question bank for tests.' },
      { tag: 'P', title: 'Parent', text: "Their child's performance, attendance, debt and a direct chat." },
      { tag: 'S', title: 'Student', text: 'Tests, homework, video, the coin shop and the leaderboard.' },
    ],

    motivationBadge: 'Motivation',
    motivationH2: 'Motivation you can actually see',
    motivationLead:
      'Coins are awarded for grades, attendance and activity — and turn into rewards right away. Students compete instead of sitting through classes.',
    motivationList: [
      'Coins for performance and activity',
      'Rewards shop — coins spent on a real storefront',
      'Weekly and monthly leaderboards, append-only history',
    ],

    invoice: {
      title: 'Invoice #1042',
      sub: 'Aziza Rakhimova · Frontend Pro',
      paid: 'Paid',
      totalLabel: 'Invoice total',
      total: '1,200,000 UZS',
      splitCaption: 'Split payment',
      cash: 'Cash',
      cashValue: '700,000 UZS',
      card: 'Card',
      cardValue: '500,000 UZS',
      resultCaption: 'Result',
      receipt: 'Receipt',
      receiptValue: 'Attached to the payment',
      debt: 'Student debt',
      debtValue: '0 UZS',
    },
    financeH2: 'Money under control — down to the last coin',
    financeLead:
      'One invoice — several transactions sharing a split_batch_id. The receipt is stored with the payment, and debts show up in the dashboard instantly.',
    financeList: [
      'Cash + card within a single payment',
      'A receipt is attached to every payment',
      'Invoice and transactions linked by one batch',
      'Archived ≠ deleted: read-only, not data loss',
    ],

    faqHead: 'Frequently asked questions',
    faqLead: 'A short rundown of what LevelUp Academy is and how it works.',
    faq: [
      {
        q: 'What is LevelUp Academy?',
        a: 'LevelUp Academy is a SaaS platform (CRM) for managing learning centers: students, groups, attendance, tests and homework, finance (payments and split payments), gamification (coins, shop, leaderboards), chats and Telegram notifications — all in one system.',
      },
      {
        q: 'Who is LevelUp Academy for?',
        a: 'For learning centers, language schools and course providers that want to automate student records, attendance, finance and student motivation.',
      },
      {
        q: 'How much does it cost?',
        a: 'The first week is free, with no card and no commitment. After that the price depends on all active accounts in the organization — students, parents and staff.',
      },
      {
        q: 'What roles does the system have?',
        a: 'Main Admin (platform owner), CEO (organization), Admin (branch), Mentor (teacher), Student, Parent and Methodist — each role has its own workspace and permissions.',
      },
      {
        q: 'What can it do?',
        a: 'Payments and split payments, attendance, tests with a server-side timer, homework, coins and leaderboards, realtime chats, reports and a Telegram bot for notifications.',
      },
      {
        q: 'How do we get started?',
        a: 'Send a request on the site — we will create your organization and turn on the first free week.',
      },
    ],
  },

  features: {
    badge: 'Features',
    h1: '12+ modules that work as one',
    lead: 'LevelUp Academy replaces spreadsheets, messengers and handmade registers. Everything is connected: a payment unlocks access, a missed class sends a notification, a grade awards coins.',
    modules: [
      {
        icon: 'coin',
        title: 'Payments and invoices',
        text: 'A complete payment loop: invoice, transactions, split payment in cash and by card, receipt in the cloud. Branch revenue is recalculated instantly.',
        tags: ['Split payments', 'Invoices', 'Receipts in S3', 'Live revenue'],
      },
      {
        icon: 'calendar',
        title: 'Groups and schedule',
        text: 'Groups with a mentor, a price and a class schedule. When a student leaves a group the history stays — nothing is lost.',
        tags: ['Schedule', 'Group mentor', 'Membership history'],
      },
      {
        icon: 'check',
        title: 'Attendance tracking',
        text: 'A mentor marks a whole group in a minute. Parents see the attendance history, and a missed class goes out as a notification immediately — no calls from the administrator.',
        tags: ['Mentor register', 'History for parents', 'Auto notifications'],
      },
      {
        icon: 'clock',
        title: 'Tests and exams',
        text: 'A test builder with a question bank. The timer lives on the server, not in the browser: once the deadline passes, submission closes and answers cannot be faked.',
        tags: ['Server-side timer', 'Auto-submit', '0–100 scale'],
      },
      {
        icon: 'book',
        title: 'Homework',
        text: 'Assignments with attachments, deadlines and grading. Files upload straight to the cloud — fast even from a phone. Submitted homework earns the student coins.',
        tags: ['Attachments', 'Deadlines', 'Coins for submission'],
      },
      {
        icon: 'star',
        title: 'Motivation',
        text: 'Coins, a rewards shop and weekly/monthly leaderboards. Every coin operation is written to a permanent ledger — history is never edited.',
        tags: ['Coins', 'Shop', 'Leaderboards', 'Append-only'],
      },
      {
        icon: 'chat',
        title: 'Realtime chats',
        text: 'A center-wide chat and a private parent-to-administrator channel. Messages arrive instantly, history is stored and loads as you scroll.',
        tags: ['Socket.io', 'Live presence', 'History'],
      },
      {
        icon: 'video',
        title: 'Video lessons',
        text: 'Lesson recordings are available only to students of the right group. Video links expire — the content does not leak outside.',
        tags: ['Group-based access', 'Protected links'],
      },
      {
        icon: 'grid',
        title: 'Reports',
        text: 'Revenue, debts, mentor payroll and attendance — per branch or across the whole network. The numbers agree because there is a single source.',
        tags: ['Finance', 'Payroll', 'Branches'],
      },
      {
        icon: 'send',
        title: 'Telegram bot',
        text: 'A parent links their account with a one-time code and receives everything that matters: payments, absences, grades, debts. No app to install.',
        tags: ['Link by code', 'Notification queue'],
      },
      {
        icon: 'building',
        title: 'Multi-branch',
        text: 'Every branch is isolated: an admin sees only their own. The CEO looks at the whole network — compares branches and finds room to grow.',
        tags: ['Data isolation', 'Branch network'],
      },
    ],
    flowHead: 'A day with LevelUp Academy',
    flowLead: 'The system saves time for every role — from the director to the student.',
    flow: [
      {
        title: "The administrator's morning",
        text: 'Opened the dashboard — revenue, debtors and who is online are already on screen. No manual summaries: the numbers assembled themselves.',
      },
      {
        title: "The mentor's day",
        text: 'Marked attendance in a minute, reviewed homework, awarded coins for activity. Parents already got their notifications — nobody has to call.',
      },
      {
        title: "The student's evening",
        text: 'Submitted a test before the server deadline, watched a video lesson, spent coins in the shop and checked their place on the weekly leaderboard.',
      },
    ],
    faqHead: 'Frequently asked questions',
    faq: [
      {
        q: 'Does the system work for non-IT subjects?',
        a: 'Yes. LevelUp Academy is subject-agnostic: English, mathematics, exam preparation — any subject. Nothing inside is tied to programming.',
      },
      {
        q: 'How many branches can we connect?',
        a: 'There is no limit. Multi-branch support is built in from day one: each branch is isolated, while the CEO sees the entire network.',
      },
      {
        q: 'Do parents need to install an app?',
        a: 'No. Telegram is enough: a parent links their account with a one-time code and notifications arrive on their own. The parent workspace opens in a phone browser.',
      },
      {
        q: 'What happens to the data when a student leaves?',
        a: 'Nothing is physically deleted. Archiving is a read-only mode: payment, grade and coin history stays available for reports. If the student comes back, so does their history.',
      },
    ],
    ctaTitle: 'Want to see every module in action?',
    ctaText: 'Send a request — we will walk you through the system and answer your questions.',
  },

  roles: {
    badge: 'Roles',
    h1: 'A workspace for everyone',
    lead: 'One login, and the system opens the right interface by itself. Access is decided by the server (RBAC), so peeking at someone else’s data from the browser is impossible.',
    items: [
      {
        tag: 'C',
        title: 'CEO — the whole network at a glance',
        text: 'Sees every branch and the entire network at once: total revenue, debts, a live online counter. Manages branches, admins and the global chat.',
        list: [
          'Consolidated reports across all branches, no filter',
          'Branch comparison: revenue, debts, attendance',
          'Live counter — how many students are online right now',
          'Creating branches and assigning administrators',
        ],
      },
      {
        tag: 'A',
        title: 'Admin — in charge of their branch',
        text: 'Full control of the branch: takes payments (including split), runs groups and students, answers parents in a direct chat.',
        list: [
          'Accepting payments: cash, card, split',
          'Full CRUD for groups, students and mentors of the branch',
          'Freezing a student — the debt stops growing, history stays intact',
          'Branch reports: revenue, debtors, attendance',
        ],
      },
      {
        tag: 'M',
        title: 'Mentor — less routine, more teaching',
        text: 'Marks attendance in a minute, reviews homework and tests, awards coins to students and sees their own payroll insights.',
        list: [
          'Attendance for their groups in a couple of clicks',
          'Reviewing homework and timed exams',
          'Coins ± with a mandatory reason — everything in the ledger',
          'Their own payroll and workload — transparently',
        ],
      },
      {
        tag: 'ME',
        title: 'Methodist — learning materials without chaos',
        text: 'Builds the curriculum: tracks → topics → lessons, with video and files. Collects a question bank for tests and sees which topics students struggle with most.',
        list: [
          'Curriculum: tracks → topics → lessons in one structure',
          'Video and files per lesson — uploaded straight to S3',
          'Question bank for tests, in batches across several lessons',
          'Difficulty report — which topics are hardest to get through',
        ],
      },
      {
        tag: 'P',
        title: 'Parent — peace of mind without phone calls',
        text: "Sees the child's performance, attendance and debt. An absence, a grade or a debt arrives in Telegram automatically.",
        list: [
          "The child's performance and attendance in real time",
          'The debt is visible immediately — no surprises',
          'A direct chat with the administrator and the mentor',
          'Telegram notifications: absence, payment, debt',
        ],
      },
      {
        tag: 'S',
        title: 'Student — studying that pulls you in',
        text: 'A personal workspace: tests, homework, video lessons. Coins for achievements, a rewards shop and leaderboards — competition instead of boredom.',
        list: [
          'Tests with an honest server-side timer',
          'Homework with file uploads straight from a phone',
          'Video lessons for their own group',
          'Rewards shop and weekly/monthly leaderboards',
        ],
      },
    ],
    howHead: 'How it works under the hood',
    howLead: 'The role is baked into the token and checked on the server with every request.',
    how: [
      {
        title: 'Login',
        text: 'Phone and password. The server issues a short-lived access token and refreshes it on its own — no need to log out and back in.',
      },
      {
        title: 'Routing by role',
        text: 'The system reads the role from the token and opens the right workspace: an admin gets the branch, a parent gets their child, a student gets their studies.',
      },
      {
        title: 'Checked on the server',
        text: "Every request goes through RBAC and a branch filter. Even knowing someone else's resource URL will not open it — the server refuses.",
      },
    ],
    ctaTitle: 'One login — the right workspace',
    ctaText: 'Send a request — we will show how roles and permissions bring order to your center.',
  },

  finance: {
    badge: 'Finance',
    h1: 'Center finances — down to the last coin',
    lead: 'Split payments, invoices, debt control and live reports. A cash gap becomes visible in advance, not at the end of the month.',
    payHead: 'Payment the way parents actually pay',
    payLead: 'Every method real centers deal with.',
    pay: [
      {
        icon: 'coin',
        title: 'Full payment',
        text: 'One invoice — one transaction. Cash or card, the receipt is attached to the payment and stored in the cloud. Branch revenue updates the same second.',
      },
      {
        icon: 'swap',
        title: 'Split payment',
        text: '700,000 in cash plus 500,000 by card? Not a problem: one invoice, several transactions sharing a batch number. The parts are validated against the total before posting — they never drift apart.',
      },
      {
        icon: 'receipt',
        title: 'Invoice and receipt',
        text: 'Every payment is tied to an invoice, and the receipt is stored in the cloud next to it. A dispute six months later? Open the invoice — everything is there.',
      },
    ],
    debtHead: 'Debts are visible immediately',
    debtLead:
      'A month goes unpaid and the student lands on the debtor list automatically. The administrator sees it in the dashboard right away instead of finding out at month end.',
    debt: [
      {
        title: 'The payment did not arrive',
        text: "The student's debt grew — the system recalculated it the moment the invoice was issued. No manual summaries.",
      },
      {
        title: 'A reminder to the parent',
        text: 'The parent sees the debt in their workspace and gets a Telegram notification. Most debts are settled after the first reminder.',
      },
      {
        title: 'Freeze when needed',
        text: 'A student is taking a break? Freeze them — the debt stops growing and the full payment history is preserved.',
      },
    ],
    compareHead: 'Before and after LevelUp Academy',
    compare: {
      task: 'Task',
      before: 'Spreadsheets and chats',
      after: 'LevelUp Academy',
      rows: [
        {
          task: 'Taking a split payment',
          before: 'Two rows in different files, easy to lose',
          after: 'One invoice, linked transactions',
        },
        {
          task: 'Debt control',
          before: 'By hand, from a notebook and memory',
          after: 'The debtor list updates itself',
        },
        {
          task: 'Monthly revenue',
          before: 'Takes a day or two to compile, with errors',
          after: 'A live number in the dashboard',
        },
        {
          task: "A specific student's debt",
          before: '"Call the accountant"',
          after: 'Visible to the parent and the admin instantly',
        },
        {
          task: 'History after a student leaves',
          before: 'Row deleted — data gone',
          after: 'Read-only archive: everything is kept',
        },
      ],
    },
    safetyHead: 'Bank-grade reliability',
    safetyLead: 'Rules that cannot be broken even by accident.',
    safety: [
      {
        icon: 'lock',
        title: 'Money moves only in transactions',
        text: 'Every monetary operation is atomic: it either goes through entirely or not at all. Half-finished payments do not exist.',
      },
      {
        icon: 'receipt',
        title: 'Exact arithmetic',
        text: 'No floating-point cents: amounts are stored in an exact monetary format. 1,200,000 is exactly 1,200,000.',
      },
      {
        icon: 'shield',
        title: 'Nothing disappears',
        text: 'There is no physical deletion — only archiving and soft delete. Any payment can be pulled up a year later, for a report or a dispute.',
      },
    ],
    ctaTitle: 'Shall we put your center finances in order?',
    ctaText: 'Send a request — we will show how LevelUp Academy handles payments and debtors.',
  },

  pricing: {
    badge: 'Pricing',
    h1: 'A fair price for order in your center',
    lead: 'A fixed price based on all active accounts in the organization — students, parents and staff. Branches are included without limit.',
    positioning:
      'We are not the cheapest CRM, and we are not trying to be. The price is the quality: secure payments, daily backups and a launch within a week. Reliability is not something you should have to pay for twice.',

    plansHead: 'Plans — by number of active accounts',
    plansLead:
      'Every active account counts: students, parents, CEO, admins, mentors, methodists, branch managers and finance managers.',
    free: 'Free',
    negotiable: 'On request',
    per: 'UZS/mo',
    popular: 'Popular',
    cardCta: 'Request a demo',
    plans: [
      { id: 'free', name: 'Free', amount: 0, range: '0–30 active accounts' },
      { id: 'start', name: 'Start', amount: 199000, range: '31–100 active accounts' },
      { id: 'standard', name: 'Standard', amount: 349000, range: '101–300 active accounts', popular: true },
      { id: 'pro', name: 'Pro', amount: 599000, range: '301–600 active accounts' },
      { id: 'business', name: 'Business', amount: 799000, range: '601–1,000 active accounts' },
      { id: 'network', name: 'Network', amount: null, range: '1,000+ active accounts' },
    ],
    perksHead: 'Included in every plan',
    perks: [
      'Unlimited branches included',
      'Annual payment — 15% discount',
      'First week free, full access',
    ],

    trialHead: 'The first week is free',
    trialLead: 'Try everything for real, with no risk and no card.',
    trial: [
      {
        icon: 'check',
        title: 'Full functionality',
        text: 'Every module without limits: payments, attendance, tests, coins, chats and reports — exactly as on a paid plan.',
      },
      {
        icon: 'shield',
        title: 'No card required',
        text: 'No card on file and no automatic charges. When the week ends, nothing is billed by itself.',
      },
    ],

    guaranteeHead: 'Our guarantees',
    guaranteeLead: 'We take on the risk — you are left with the result.',
    guarantee: [
      {
        icon: 'refresh',
        title: '30-day refund',
        text: 'Not a fit? We refund 100% within 30 days — no arguments, no conditions.',
      },
      {
        icon: 'shield',
        title: 'Your data will not be lost',
        text: 'Daily backups of all your information. Payments, grades and student history are safe.',
      },
      {
        icon: 'rocket',
        title: 'Launch within a week',
        text: 'We set up and launch your center in 7 days. If we miss it, the next month is on us.',
      },
    ],

    extraHead: 'A center website in your own brand',
    extraText:
      'We can build your center its own website and design in its brand style, on our platform. A separate service, scoped individually to what the center needs.',
    extraCta: 'Discuss a website',

    faqHead: 'Pricing questions',
    faq: [
      {
        q: 'How much does LevelUp Academy cost?',
        a: 'The price depends on all active accounts in the organization: students, parents and staff. Free (up to 30) is free, Start (31–100) is 199,000 UZS/mo, Standard (101–300) is 349,000, Pro (301–600) is 599,000 and Business (601–1,000) is 799,000. Above 1,000 accounts the price is agreed individually.',
      },
      {
        q: 'Does the number of branches affect the price?',
        a: 'No. Branches are included without limit on every plan. Billing is based on all active accounts in the organization, not on the number of branches.',
      },
      {
        q: 'Is there a free trial?',
        a: 'Yes, the first week is free with full functionality and no limits. No card is required and there are no automatic charges.',
      },
      {
        q: 'Is there a discount for paying yearly?',
        a: 'Yes, annual payment comes with a 15% discount off the plan price.',
      },
      {
        q: 'What if the system does not fit?',
        a: 'A refund guarantee applies: within 30 days we return 100% of the payment, with no conditions and no arguments.',
      },
      {
        q: 'What happens to our data?',
        a: 'We run daily backups. Payments, grades, attendance and student history are not lost — even archived records stay available for reports.',
      },
    ],

    ctaTitle: 'Ready to work out your plan?',
    ctaText:
      'Send a request — we will match a plan to the size of your center and turn on the first free week.',
  },

  langSchool: {
    badge: 'For language schools',
    h1: 'CRM for language schools',
    lead: 'Level-based groups, attendance, homework, payments and student motivation — in one system. LevelUp Academy runs the whole language center: from enrolling a student to the revenue report.',
    intro:
      'English, IELTS/CEFR, Korean, Arabic, Russian — LevelUp Academy is not tied to a subject. It is a system for a learning center where language is the core focus: there is nothing "developer-specific" inside.',
    pricingLink: 'See pricing',

    fitHead: 'Built for a language center',
    fitLead: 'What language schools handle by hand works on its own here.',
    fit: [
      {
        icon: 'calendar',
        title: 'Level-based groups',
        text: 'A1–C1, beginners and continuers, IELTS and conversation clubs — each with its own mentor, schedule and price. A student moves up a level and their history moves with them.',
      },
      {
        icon: 'check',
        title: 'Attendance',
        text: 'The mentor marks attendance in a minute. Parents see whether their child attended, and an absence reaches Telegram immediately — no calls from the administrator.',
      },
      {
        icon: 'book',
        title: 'Homework',
        text: 'Assignments with attachments and deadlines: essays, speaking audio, grammar. Files upload from a phone, and a submission earns the student coins.',
      },
      {
        icon: 'clock',
        title: 'Tests and exams',
        text: 'A test builder with a server-side timer: vocabulary, grammar, IELTS/CEFR mocks. Once the deadline passes, submission closes and answers cannot be faked.',
      },
      {
        icon: 'coin',
        title: 'Payments and debts',
        text: 'Payment per course or monthly, in cash and by card, split payments included. Miss a payment and the student lands on the debtor list automatically.',
      },
      {
        icon: 'star',
        title: 'Motivation to keep learning',
        text: 'Coins for grades, attendance and submitted homework, a rewards shop and leaderboards. Students learn out of drive, not obligation.',
      },
    ],

    howHead: 'From enrollment to report',
    howLead: 'A day at a language school running on LevelUp Academy.',
    how: [
      {
        title: 'The student is enrolled',
        text: 'The administrator adds the student, places them in a level-based group and takes payment for the course. The parent receives access and Telegram notifications.',
      },
      {
        title: 'Classes run',
        text: 'The mentor marks attendance, sets homework and tests, awards coins for speaking activity. Parents see progress in real time.',
      },
      {
        title: 'You see the result',
        text: 'Revenue, debts and attendance in the dashboard. Which students are close to dropping out from absences is visible in advance, not at the end of the course.',
      },
    ],

    faqHead: 'Frequently asked questions',
    faq: [
      {
        q: 'Is LevelUp Academy suitable for a language school?',
        a: 'Yes. It is a CRM for a learning center of any profile: English, IELTS, Korean, Arabic, Russian. Level-based groups, attendance, homework, tests, payments and motivation all fit a language center. Nothing inside is tied to a specific subject.',
      },
      {
        q: 'Can we run level-based groups (A1–C1, IELTS)?',
        a: 'Yes. Each group has its own mentor, level, schedule and price. When a student moves to the next level, their attendance, grade and payment history is preserved.',
      },
      {
        q: 'How do parents learn about grades and absences?',
        a: 'Through Telegram. The parent links their account with a one-time code and receives notifications: absence, grade, debt. No app installation needed.',
      },
      {
        q: 'How many language school branches can we connect?',
        a: 'There is no limit. Each branch is isolated, while the director sees the whole network and compares revenue, attendance and debts across branches.',
      },
      {
        q: 'How much does it cost for a language school?',
        a: 'The price is fixed by the total number of active accounts, and branches are included without limit. The first week is free, no card required. Details are on the pricing page.',
      },
    ],

    ctaTitle: 'Shall we bring order to your language school?',
    ctaText:
      'Send a request — we will show how LevelUp Academy runs groups, payments and motivation in a language center. The first week is free.',
  },

  courses: {
    badge: 'For courses and tutors',
    h1: 'CRM for courses and tutoring centers',
    lead: 'Groups and one-to-one lessons, attendance, homework, course payments and motivation — in one system. Works for large cohorts and for individual tutors alike.',
    intro:
      'IT and programming, design, exam preparation, school subjects — LevelUp Academy is not tied to a field. It runs both big cohorts and solo tutoring.',
    pricingLink: 'See pricing',

    fitHead: 'Built for courses and tutoring',
    fitLead: 'What eats an administrator’s and a tutor’s time is automated here.',
    fit: [
      {
        icon: 'calendar',
        title: 'Groups and one-to-one',
        text: 'Cohort courses in groups and one-to-one lessons — each with its own mentor, schedule and price. A student finishes a module or switches tutor and the history is preserved.',
      },
      {
        icon: 'check',
        title: 'Attendance',
        text: 'The mentor marks attendance in a minute. The parent or the student sees the absence, and the notification goes to Telegram right away.',
      },
      {
        icon: 'book',
        title: 'Homework and projects',
        text: 'Assignments and projects with attachments and deadlines. Files upload from a phone, and a submission earns the student coins.',
      },
      {
        icon: 'clock',
        title: 'Tests and exams',
        text: 'A test builder with a server-side timer: midterms, finals, mocks. Once the deadline passes, submission closes and answers cannot be faked.',
      },
      {
        icon: 'coin',
        title: 'Course payments and debts',
        text: 'Payment per course, per module or monthly, in cash and by card, split payments included. Miss a payment and the student lands on the debtor list automatically.',
      },
      {
        icon: 'star',
        title: 'Motivation to finish',
        text: 'Coins for grades, attendance and submitted homework, a rewards shop and leaderboards. Fewer students quit halfway.',
      },
    ],

    howHead: 'From enrollment to result',
    howLead: 'One course cohort running on LevelUp Academy.',
    how: [
      {
        title: 'Enrolled on the course',
        text: 'The administrator adds the student to a group or a tutor and takes payment for the course. Student and parent receive access and Telegram notifications.',
      },
      {
        title: 'Classes run',
        text: 'The mentor marks attendance, sets homework and tests, awards coins for activity. Progress is visible in real time.',
      },
      {
        title: 'You see the result',
        text: 'Revenue, debts and attendance in the dashboard. Who is at risk of dropping the course based on absences is visible in advance.',
      },
    ],

    faqHead: 'Frequently asked questions',
    faq: [
      {
        q: 'Is LevelUp Academy suitable for courses and tutors?',
        a: 'Yes. It is a CRM for a learning center in any field: IT courses, design, exam preparation, tutoring. Groups and one-to-one lessons, attendance, homework, tests, payments and motivation all fit the needs of a course provider or a tutoring center.',
      },
      {
        q: 'Can we run both groups and one-to-one lessons?',
        a: 'Yes. A group or a one-to-one lesson each has its own mentor, schedule and price. Student history is preserved when moving between groups and tutors.',
      },
      {
        q: 'How do we take payment per course or per module?',
        a: 'Payment for a whole course, per module or monthly — in cash, by card or as a split payment. Debts are calculated automatically and debtors are visible immediately.',
      },
      {
        q: 'How many course branches can we connect?',
        a: 'There is no limit. Each branch is isolated, while the director sees the whole network: revenue, attendance and debts per branch.',
      },
      {
        q: 'How much does it cost for courses?',
        a: 'The price is fixed by the total number of active accounts, and branches are included without limit. The first week is free, no card required. Details are on the pricing page.',
      },
    ],

    ctaTitle: 'Shall we bring order to your course?',
    ctaText:
      'Send a request — we will show how LevelUp Academy runs groups, payments and motivation for courses and tutoring. The first week is free.',
  },

  vsExcel: {
    badge: 'CRM vs Excel',
    h1: 'CRM instead of Excel for a learning center',
    lead: 'Spreadsheets hold up until you pass a hundred students. After that: lost debts, numbers that disagree and evenings spent assembling a report.',
    intro:
      'LevelUp Academy replaces the "spreadsheet + notebook + chats" combination with one system: payments, attendance, homework and parent notifications live in one place and calculate themselves.',
    pricingLink: 'See pricing',

    painHead: 'Where spreadsheets break',
    painLead: 'Not because Excel is bad, but because it has no roles, no history and no reminders.',
    pain: [
      {
        icon: 'swap',
        title: 'The numbers disagree',
        text: 'The same student sits in three files: the administrator’s, the mentor’s and the finance sheet. A month later there are three different totals and none of them is right.',
      },
      {
        icon: 'coin',
        title: 'Debts surface at month end',
        text: 'A spreadsheet does not calculate debt by itself — someone has to sit down and reconcile. Until they do, the student keeps attending and the amount keeps growing.',
      },
      {
        icon: 'shield',
        title: 'Delete a row, lose the history',
        text: 'A student left and the row was cleaned up. Payments, grades and attendance went with it: six months later there is nothing to settle a dispute with.',
      },
      {
        icon: 'lock',
        title: 'Everyone sees the file',
        text: 'There are no access rights: whoever has the link sees revenue, payroll and parents’ phone numbers. A mentor sees exactly what the owner sees.',
      },
      {
        icon: 'send',
        title: 'Nobody writes to parents',
        text: 'A spreadsheet will not send a notification about an absence or a debt. Every reminder is manual work for the administrator.',
      },
      {
        icon: 'clock',
        title: 'A report costs an evening',
        text: 'Monthly revenue takes a day or two to assemble and still has errors. By the time the number is ready it is already out of date.',
      },
    ],

    compareHead: 'Excel and LevelUp Academy — task by task',
    compare: {
      task: 'Task',
      before: 'Excel and spreadsheets',
      after: 'LevelUp Academy',
      rows: [
        {
          task: 'Student record',
          before: 'A row in a file, duplicates and typos',
          after: 'A profile with history, groups and status',
        },
        {
          task: 'Student debt',
          before: 'Reconciled by hand, visible at month end',
          after: 'Recalculated automatically when the invoice is issued',
        },
        {
          task: 'Attendance',
          before: "The mentor's notebook — the administrator cannot see it",
          after: 'An electronic register visible to admin and parent',
        },
        {
          task: 'Parent notifications',
          before: 'Manual calls from the administrator',
          after: 'Automatically via Telegram',
        },
        {
          task: 'Access rights',
          before: 'Whoever has the file sees everything',
          after: 'Seven roles, access decided by the server',
        },
        {
          task: 'Revenue report',
          before: 'Takes a day or two, with errors',
          after: 'A live number in the dashboard',
        },
        {
          task: 'History after a student leaves',
          before: 'Row deleted — data gone',
          after: 'Read-only archive: everything is kept',
        },
        {
          task: 'Working from a phone',
          before: 'A spreadsheet is not editable on a phone',
          after: 'Mentor, student and parent workspaces',
        },
      ],
    },

    howHead: 'The switch takes a week',
    howLead: 'You do not need to migrate the whole history — or abandon spreadsheets on day one.',
    how: [
      {
        title: 'Set up the structure',
        text: 'Branches, groups, mentors and prices — half an hour of work. Only what is live now gets moved, not three years of archive.',
      },
      {
        title: 'Move students and debts',
        text: 'Active students by group and open debts. Debts are mandatory: without them the very first reconciliation will not add up.',
      },
      {
        title: 'Run in parallel for a week',
        text: 'The spreadsheet stays as insurance: for a week you reconcile revenue and debts. Once they match, the spreadsheets can be closed.',
      },
    ],
    guideLink: 'Step-by-step guide to migrating from Excel',

    faqHead: 'Frequently asked questions',
    faq: [
      {
        q: 'Why is a CRM better than Excel for a learning center?',
        a: 'Excel stores data but does not calculate debts, does not separate access and does not write to parents. A CRM does all of it: debt is recalculated the moment an invoice is issued, attendance is visible to the administrator and the parent, notifications go out via Telegram, and student history does not vanish along with a deleted row.',
      },
      {
        q: 'How long does moving from Excel to a CRM take?',
        a: 'Usually a week. First branches, groups and mentors are set up, then active students and open debts. For a week the center runs in parallel with the spreadsheet and reconciles revenue and debts — once they match, the spreadsheets can be closed.',
      },
      {
        q: 'Can we import data from Excel?',
        a: 'Yes. What needs moving is active students, groups and open debts — the full history of past years does not have to come along and can stay in the spreadsheet as an archive. The step-by-step order is described in the migration guide.',
      },
      {
        q: 'What should we do with the old spreadsheets afterwards?',
        a: 'Keep them read-only as an archive. In LevelUp Academy data is never physically deleted: a student moves to the archive while their payments, grades and attendance are preserved in full.',
      },
      {
        q: 'How much does replacing Excel with a CRM cost?',
        a: 'Up to 30 active accounts it is free; after that all active student, parent and staff accounts count. Branches are included without limit.',
      },
    ],

    ctaTitle: 'Time to leave spreadsheets behind?',
    ctaText:
      'Send a request — we will show, on your own data, what your center looks like without Excel. First week free, no card.',
  },

  blog: {
    badge: 'Knowledge base',
    h1: 'Knowledge base for learning centers',
    lead: 'How to bring order to a center’s records, finances and attendance — no fluff, based on real CRM work. Read it and apply it.',
    readMore: 'Read',
    minutesLabel: 'min',
    backToBlog: '← Back to knowledge base',
    tocLabel: 'Published',
    articles: {
      'excel-to-crm': {
        title: 'How to move a learning center from Excel to a CRM',
        ceoTitle: 'Excel to CRM migration: a guide for learning centers | LevelUp',
        ceoDescription:
          'A step-by-step move from Excel to a CRM for a learning center: what to migrate (students, groups, payments, debts), how to lose nothing and where to start. Migration checklist.',
        excerpt:
          'Spreadsheets break somewhere past the second hundred students. Here is what to move into a CRM, how to lose nothing and where to start.',
        date: '2026-07-16',
        reading: 6,
        body: [
          { type: 'p', text: 'Excel and Google Sheets work while there are few students. But as a center grows, spreadsheets turn into a source of errors: numbers stop matching, debts get lost, and a student’s history disappears along with a deleted row. Let us look at how to move to a CRM without losing anything.' },
          { type: 'h2', text: 'Where Excel starts to fail' },
          { type: 'ul', items: [
            'Duplicates and drift: the same data in different files stops matching.',
            'Debt is only visible manually — you find out at the end of the month.',
            'Delete a student row and the whole payment and grade history goes with it.',
            'No access rights: anyone with the file sees everything.',
            'No automatic notifications to parents about absences and debts.',
          ] },
          { type: 'h2', text: 'What to move into the CRM first' },
          { type: 'ul', items: [
            'Students and groups (with level, mentor and price).',
            'Mentors and the class schedule.',
            'Current payments and, most importantly, open debts.',
            'Attendance history for at least the current period.',
          ] },
          { type: 'h2', text: 'How to move without losing anything' },
          { type: 'p', text: 'Do not move everything at once and do not drop Excel on day one. The safest route is running in parallel for one or two weeks: enter data into the CRM and reconcile it against the spreadsheet until you are sure everything adds up.' },
          { type: 'ul', items: [
            'Set up branches and groups.',
            'Move active students and assign them to groups.',
            'Enter open debts — that is what shows you the real picture.',
            'Connect parents with a one-time Telegram code.',
            'Run in parallel with Excel for a week and reconcile revenue and debts.',
          ] },
          { type: 'h2', text: 'Where to start' },
          { type: 'p', text: 'Start with a single group: create it, take a couple of payments, mark attendance — and compare it with how it worked in the spreadsheet. In LevelUp Academy the first week is free and needs no card, so you can trial the migration at no risk.' },
        ],
      },
      'student-debts': {
        title: 'How to stop losing money on student debts',
        ceoTitle: 'How to stop losing money on student debts | LevelUp',
        ceoDescription:
          'Why student debts grow unnoticed and how to control them: an automatic debtor list, Telegram reminders to parents and freezing without losing history.',
        excerpt:
          'Debts in a learning center pile up quietly and surface at month end. How to make them visible and recover the money without conflict.',
        date: '2026-07-16',
        reading: 5,
        body: [
          { type: 'p', text: 'Tuition debt rarely appears all at once — it builds up bit by bit and becomes noticeable when the amount is already large and the conversation with the parent is awkward. The problem is not the parents; it is that the debt is not visible in time. Here is how to fix that.' },
          { type: 'h2', text: 'Why debts grow unnoticed' },
          { type: 'ul', items: [
            'A monthly payment is easy to forget — for the center and for the parent.',
            'A spreadsheet does not calculate debt by itself: someone has to reconcile manually.',
            'Until the debt is reconciled the student keeps attending and the amount grows.',
            'Reminding is uncomfortable: administrators do not want to chase money.',
          ] },
          { type: 'h2', text: 'Make the debt visible' },
          { type: 'p', text: 'The main rule: debt must be calculated automatically the moment an invoice is issued, not at the end of the month. Then a debtor appears on the list immediately and you react while the amount is still small.' },
          { type: 'ul', items: [
            'The debtor list updates itself — visible in the dashboard.',
            'The parent sees the debt in their own workspace, without a phone call.',
            'A debt notification goes to Telegram automatically.',
          ] },
          { type: 'h2', text: 'Recover the money without conflict' },
          { type: 'p', text: 'Most debts are settled after the very first reminder — provided it arrives on time and comes from the system rather than as a personal reproach. If a student is temporarily not attending, they can be frozen: the debt stops growing and the payment history is preserved in full.' },
          { type: 'h2', text: 'In short' },
          { type: 'p', text: 'Debt is not about strictness, it is about timing. When a center sees a debtor on the day the debt appears, the money almost always comes back. In LevelUp Academy this works out of the box — try the first week free.' },
        ],
      },
      'attendance-automation': {
        title: 'How to automate attendance tracking in a learning center',
        ceoTitle: 'Automating attendance tracking in a center | LevelUp',
        ceoDescription:
          'How to stop tracking attendance on paper: an electronic register filled in a minute, automatic Telegram alerts to parents about absences and reports for the admin.',
        excerpt:
          'A paper attendance register steals time and does not prevent absences. How to move attendance into electronic form and notify parents automatically.',
        date: '2026-07-16',
        reading: 5,
        body: [
          { type: 'p', text: 'Attendance is routine that eats a mentor’s time and barely affects the outcome while it is kept on paper. Parents learn about absences late, and the administrator only when the student is already close to dropping out. An electronic register changes that.' },
          { type: 'h2', text: 'What is wrong with a paper register' },
          { type: 'ul', items: [
            "The data stays in the mentor's notebook — the administrator never sees it.",
            'The parent finds out about an absence in the evening, or not at all.',
            'There is no history: you cannot tell who misses classes systematically.',
            'Reconciling attendance with payments by hand is nearly impossible.',
          ] },
          { type: 'h2', text: 'How an electronic register works' },
          { type: 'p', text: 'The mentor marks the group in a minute straight from a phone. The system does the rest: the parent immediately sees whether the child attended, and the absence goes out as a Telegram notification — no calls from the administrator.' },
          { type: 'ul', items: [
            'Marking a group in a couple of clicks, no paper.',
            'An automatic notification to the parent at that same moment.',
            'Attendance history — you can see who misses classes systematically.',
            'The data is linked to payments and branch reports.',
          ] },
          { type: 'h2', text: 'What the center gains' },
          { type: 'p', text: 'Parents are calm because they are informed. The administrator sees who is close to dropping out in advance and has time to keep the student. And the mentor spends a minute on the register instead of ten. You can try the electronic register in LevelUp Academy free for the first week.' },
        ],
      },
    },
  },

  gamification: {
    badge: 'Motivation',
    h1: 'Students compete instead of sitting it out',
    lead: 'Coins for achievements, a rewards shop and live leaderboards. Motivation stops being words at a meeting — every student sees it every day.',
    earnHead: 'How coins are earned',
    earnLead:
      'Coins are awarded for real achievements, and every operation requires a reason — there is no such thing as "just because".',
    earnList: [
      'High grades on tests and exams',
      'Homework submitted on time',
      'Attendance without absences',
      'Activity in class — marked by the mentor',
    ],
    spendHead: 'How coins are spent',
    spendLead:
      'The rewards shop is a storefront the center fills itself: merch, certificates, free classes, whatever you like.',
    spend: [
      {
        title: 'The center storefront',
        text: 'The administrator lists rewards and their prices in coins. The price is locked at the moment of purchase — it cannot change retroactively.',
      },
      {
        title: 'A student buys',
        text: 'The student saves and spends straight from their workspace. The balance cannot go negative — the system will not let them spend more than they have.',
      },
      {
        title: 'Handover and records',
        text: 'The order shows up for the administrator and the reward is handed over in person. The full purchase history is kept forever.',
      },
    ],
    journalBadge: 'Fairness',
    journalH2: 'A ledger that cannot be rewritten',
    journalLead:
      'Every coin award and deduction is written to the ledger permanently: who, to whom, how much and what for. Entries are never edited or deleted — only appended.',
    journalList: [
      'A reason is mandatory for every operation',
      'Balance and ledger only ever change together',
      'Leaderboards are recalculated automatically',
      'A dispute? The ledger shows everything',
    ],
    journalTitle: 'Coin ledger',
    journalRows: [
      { amount: '+50', text: 'Aziza R. — exam scored 96/100' },
      { amount: '+20', text: 'Bekzod K. — homework submitted before the deadline' },
      { amount: '−300', text: 'Dilnoza T. — purchase: center T-shirt' },
      { amount: '+10', text: 'Sanjar U. — activity in class' },
    ],
    boardHead: 'Weekly and monthly leaderboards',
    boardLead:
      'The ranking resets every week and every month — a newcomer always has a chance to catch up. Past wins are kept in snapshots: the record of achievements never disappears.',
    board: [
      {
        icon: 'zap',
        title: 'Live ranking',
        text: 'Coins awarded, position updated immediately. Students watch the movement in real time.',
      },
      {
        icon: 'refresh',
        title: 'A fair reset',
        text: 'Each week and month starts from zero for everyone. The contest never turns into a race behind an unreachable leader.',
      },
      {
        icon: 'trophy',
        title: 'A record of wins',
        text: 'The winners of each period are recorded. The center’s hall of fame builds itself.',
      },
    ],
    ctaTitle: 'Turn on the contest in your center',
    ctaText: 'Coins, the shop and leaderboards are configured to your center’s own rules.',
  },

  contacts: {
    badge: 'Contact',
    h1: 'Let us talk about your center',
    lead: 'Send a request — we will tell you about LevelUp Academy and answer all your questions.',
    form: {
      name: 'Name',
      namePlaceholder: 'What should we call you',
      phone: 'Phone',
      center: 'Learning center',
      centerPlaceholder: 'Center name',
      size: 'Center size',
      sizePlaceholder: 'How many students',
      sizeOptions: ['Up to 100 students', '100–500 students', '500–1000 students', { value: '1000+', label: 'More than 1000 students' }, 'A branch network'],
      message: 'Message',
      messagePlaceholder: 'What would you like to improve in running your center?',
      submit: 'Send request',
      sending: 'Sending…',
      success: 'Request received! We will get in touch shortly.',
      note: 'By clicking the button you agree to our data processing policy.',
      errorRate: 'Too many attempts — wait a minute and send again.',
      errorGeneric: 'Could not send the request. Check your name and phone and try again.',
      errorNetwork: 'The server is unavailable. Try later or message us on Telegram.',
    },
    info: [
      {
        icon: 'send',
        title: 'Live consultation',
        text: 'We will review your center workflows and show what LevelUp Academy can automate.',
      },
      {
        icon: 'rocket',
        title: 'Implementation plan',
        text: 'We will prepare a clear plan for data migration, team onboarding and branch launch.',
      },
      {
        icon: 'shield',
        title: 'Personal estimate',
        text: 'We will calculate pricing for your number of students and staff with no hidden commitments.',
      },
    ],
  },

  vsModme: {
    badge: 'Comparison',
    h1: 'LevelUp Academy vs Modme',
    lead: 'Both systems solve the same job — tracking students, payments and attendance in an education center. The difference is in price, in what the plan includes, and in how mature the mobile side is.',
    checkedNote:
      'Modme’s prices and terms are taken from their pricing page and were checked on 5 August 2026. Verify them on their site before deciding — terms may have changed.',

    priceHead: 'Cost per month',
    priceLead:
      'Modme bills in blocks of at least 3 months, so their price is converted to a monthly figure for comparison.',
    priceTable: {
      param: 'Center size',
      us: 'LevelUp Academy',
      them: 'Modme',
      rows: [
        { task: 'Up to 30 students', before: 'free plan', after: 'no free plan' },
        { task: '100 students', before: '199,000 UZS/mo', after: '500,000 UZS/mo (1,500,000 per 3 months)' },
        { task: '300 students', before: '349,000 UZS/mo', after: '1,040,000 UZS/mo (3,120,000 per 3 months)' },
        { task: '600 students', before: '599,000 UZS/mo', after: '1,560,000 UZS/mo (4,680,000 per 3 months)' },
        { task: 'Over 1,000 students', before: 'custom quote', after: '3,000,000 UZS/mo (9,000,000 per 3 months)' },
      ],
    },

    compareHead: 'What the price includes',
    compare: {
      task: 'Item',
      before: 'LevelUp Academy',
      after: 'Modme',
      rows: [
        { task: 'Minimum billing period', before: 'one month', after: 'three months' },
        { task: 'Free trial', before: 'first week, no card', after: 'demo version, up to 7 days' },
        { task: 'Gamification (coins, leaderboards)', before: 'included in every plan', after: 'separate module, 150,000 UZS/mo' },
        { task: 'Branches', before: 'unlimited on every plan', after: 'tied to the student-count plan' },
        { task: 'Long-term discount', before: '15% on annual billing', after: '+2 bonus months on the 12-month plan' },
        { task: 'Refund', before: '30 days, 100% of the amount', after: 'per their public offer' },
        { task: 'Mobile apps', before: 'none — runs in the phone browser', after: 'yes: student and teacher apps' },
        { task: 'Site and material languages', before: "русский, o'zbekcha, English", after: "o'zbekcha, русский, English" },
      ],
    },

    themHead: 'When Modme is the fairer choice',
    themLead: 'We do not claim to fit everyone. Here is where they make more sense.',
    them: [
      {
        icon: 'grid',
        title: 'You need native apps',
        text: 'Modme ships separate apps for students and teachers. With us everything runs in the phone browser — functionally the same, but there is no icon on the home screen.',
      },
      {
        icon: 'check',
        title: 'You are already on Modme and happy',
        text: 'Switching for the sake of switching does not pay off. If the system covers the center’s needs and the team knows it, the savings are not worth a week of migration.',
      },
      {
        icon: 'building',
        title: 'Vendor track record matters to you',
        text: 'Modme has been on the market longer and is better known. We were founded in 2026 — if that is a dealbreaker, it is fairer to say so up front.',
      },
    ],

    usHead: 'When we work out cheaper',
    us: [
      {
        icon: 'coin',
        title: 'A center under 30 students',
        text: 'That is our free plan, with no time limit. Modme has no free plan — you start with a three-month payment.',
      },
      {
        icon: 'receipt',
        title: 'You would rather not prepay a quarter',
        text: 'We bill monthly: if it does not fit, you simply do not renew. On top of that, there are 30 days to get the full amount back if the system turns out to be wrong for you.',
      },
      {
        icon: 'trophy',
        title: 'You want motivation from day one',
        text: 'Coins, the rewards shop and leaderboards are in every plan. At Modme, gamification is a separate module at 150,000 UZS per month on top of the plan.',
      },
      {
        icon: 'building',
        title: 'A network of branches',
        text: 'Branches are unlimited on every plan; billing is based on all active accounts in the organization. The owner sees revenue, debt and attendance across the whole network.',
      },
    ],

    faqHead: 'Questions about switching',
    faq: [
      {
        q: 'Which is cheaper for a 300-student center — LevelUp Academy or Modme?',
        a: 'LevelUp Academy: 349,000 UZS per month. Modme at that size is the Basic plan — 3,120,000 UZS per 3 months, i.e. 1,040,000 UZS per month. That is roughly a threefold difference, and gamification is included in our plan while Modme charges a separate 150,000 UZS per month for it. Figures from Modme’s site as of 5 August 2026.',
      },
      {
        q: 'Can data be migrated from Modme?',
        a: 'Yes. What needs to move is active students, groups, mentors and outstanding debts — years of history do not have to come along. We have no automatic Modme import: our team does the migration as part of the 7-day launch. For the first week a center usually runs both systems and reconciles revenue and debt.',
      },
      {
        q: 'Does LevelUp Academy have a mobile app?',
        a: 'There is no separate app — the system opens in the phone browser, and students submit homework, take tests and watch video lessons from there. Notifications arrive in Telegram. Modme does have native apps, so if that is essential, it counts in their favour.',
      },
      {
        q: 'How does LevelUp Academy handle payments differently?',
        a: 'One invoice can be closed by several payments — part cash, part card — and the remaining balance stays exact. When an invoice goes overdue, the student’s access is blocked automatically and comes back immediately after payment, with no recalculation to wait for.',
      },
    ],

    ctaTitle: 'Want the difference calculated for your center?',
    ctaText:
      'Send a request — we will price it for your student count and walk through the system on your workflows. First week free.',
  },

  vsUmai: {
    badge: 'Comparison',
    h1: 'LevelUp Academy vs Umai CRM',
    lead: 'Umai CRM is a strong system leaning towards sales and marketing: pipelines, an AI bot, broadcasts. We lean towards the teaching side and price. Below are facts, not slogans.',
    checkedNote:
      'Umai CRM’s prices and features are taken from their site and pricing page and were checked on 5 August 2026. Verify them on their site before deciding.',

    priceHead: 'Cost per month',
    priceLead:
      'Umai CRM’s price does not depend on student count — it depends on the feature set. Ours is the opposite: one feature set, with price growing as the center grows.',
    priceTable: {
      param: 'Center size',
      us: 'LevelUp Academy',
      them: 'Umai CRM',
      rows: [
        { task: 'Up to 30 students', before: 'free plan', after: 'no free plan' },
        { task: '100 students', before: '199,000 UZS/mo', after: 'from 500,000 UZS/mo (416,667 on annual billing)' },
        { task: '300 students', before: '349,000 UZS/mo', after: 'from 500,000 UZS/mo — price is not tied to student count' },
        { task: '600 students', before: '599,000 UZS/mo', after: 'from 500,000 UZS/mo' },
        { task: 'Over 1,000 students', before: 'custom quote', after: 'Enterprise plan — custom quote' },
      ],
    },

    compareHead: 'What the price includes',
    compare: {
      task: 'Item',
      before: 'LevelUp Academy',
      after: 'Umai CRM',
      rows: [
        { task: 'Free trial', before: 'first week, no card', after: '7 days, no card' },
        { task: 'What the price depends on', before: 'total active account count', after: 'feature set; unlimited students' },
        { task: 'Top plan', before: '799,000 UZS/mo (601–1,000 students)', after: '2,250,000 UZS/mo — the AI plan (annual billing)' },
        { task: 'Onboarding and setup', before: 'included, live in 7 days', after: '3,750,000 UZS one-off; free on a 12-month payment' },
        { task: 'Expert hour', before: 'included in support', after: '375,000 UZS' },
        { task: 'Sales pipelines, lead kanban, AI chatbot', before: 'no', after: 'yes, from the extended plans up' },
        { task: 'WhatsApp and Instagram broadcasts', before: 'no — notifications go through Telegram', after: 'yes' },
        { task: 'Mobile apps', before: 'none — runs in the phone browser', after: 'yes: student, teacher and administrator apps' },
        { task: 'Refund', before: '30 days, 100% of the amount', after: 'per their offer, up to 21 business days' },
      ],
    },

    themHead: 'When Umai CRM is the fairer choice',
    themLead: 'Their strengths are real — here is where choosing them is justified.',
    them: [
      {
        icon: 'send',
        title: 'The center runs on sales',
        text: 'If the real pain is not record-keeping but lead handling: pipelines, a lead kanban, an AI bot and broadcasts over WhatsApp and Instagram. We do not have that, and it is not on the near-term roadmap.',
      },
      {
        icon: 'grid',
        title: 'You need native apps',
        text: 'Umai CRM has three apps — for students, teachers and administrators. With us everything runs in the phone browser.',
      },
      {
        icon: 'building',
        title: 'A very large center',
        text: 'Their price does not grow with student count. Past a thousand active students, a flat plan may well beat ours.',
      },
    ],

    usHead: 'When we work out cheaper',
    us: [
      {
        icon: 'coin',
        title: 'Small and mid-sized centers',
        text: 'Up to 30 students is free, up to 100 is 199,000 UZS per month. Umai CRM’s entry plan starts at 500,000 UZS per month whether you have ten students or three hundred.',
      },
      {
        icon: 'rocket',
        title: 'You would rather not pay for onboarding separately',
        text: 'We configure and launch the center in 7 days, and that is part of the plan. At Umai CRM onboarding is a separate 3,750,000 UZS, free only if you pay 12 months up front.',
      },
      {
        icon: 'book',
        title: 'The teaching side is what matters',
        text: 'Attendance, server-timed tests, homework, video lessons, coins and leaderboards. We invest in what happens in class rather than in marketing funnels.',
      },
      {
        icon: 'lock',
        title: 'Branch isolation matters',
        text: 'Every request is checked on the server and scoped to the organization and branch: an administrator of one branch cannot see another’s data, even knowing the URL.',
      },
    ],

    faqHead: 'Questions about switching',
    faq: [
      {
        q: 'Which is cheaper for a 100-student center — LevelUp Academy or Umai CRM?',
        a: 'LevelUp Academy: 199,000 UZS per month. Umai CRM: from 500,000 UZS per month on monthly billing (416,667 UZS if paid annually), plus 3,750,000 UZS for onboarding unless you pay 12 months up front. Figures from Umai CRM’s site as of 5 August 2026.',
      },
      {
        q: 'Does LevelUp Academy integrate with WhatsApp and Instagram?',
        a: 'No. Notifications to parents and students about absences, payments and debts go through a Telegram bot. If a center needs marketing broadcasts and pipelines on WhatsApp and Instagram, Umai CRM has that and we do not.',
      },
      {
        q: 'Can data be migrated from Umai CRM?',
        a: 'Yes. We move active students, groups, mentors and outstanding debts; years of history do not have to come along. We have no automatic Umai CRM import — our team does the migration as part of the 7-day launch.',
      },
      {
        q: 'Is it true that LevelUp Academy’s price grows with student count?',
        a: 'Yes. Every active student, parent and staff account counts. Up to 30 accounts is free; 31–100 is 199,000; 101–300 is 349,000; 301–600 is 599,000; 601–1,000 is 799,000 UZS per month. Branches are unlimited on every plan.',
      },
    ],

    ctaTitle: 'Want the difference calculated for your center?',
    ctaText:
      'Send a request — we will price it for your student count and tell you honestly if your case fits another product better.',
  },

  faqHub: {
    badge: 'FAQ',
    h1: 'Frequently asked questions about LevelUp Academy',
    lead: 'Answers to what people ask before signing up: how students log in, what happens when a payment is overdue, who can see what, and how a center is migrated into the system.',
    intro:
      'Questions about pricing, moving off Excel and running a language school live on their own pages — links at the bottom.',

    groups: [
      {
        title: 'Getting started',
        items: [
          {
            q: 'Is there anything to install?',
            a: 'No. LevelUp Academy runs in the browser — on a desktop, a tablet or a phone. There is no separate mobile app to install: students submit homework and watch video lessons straight from the phone browser.',
          },
          {
            q: 'Who sets the system up — you or the center?',
            a: 'We do. We create the branches, groups, mentors and active students and take the center live in 7 days. If we miss that deadline, the next month is free.',
          },
          {
            q: 'How do students and parents log in?',
            a: 'Students and parents have no email: an administrator issues them an 8-character login code and a 6-digit password. The code excludes look-alike characters (0/O, 1/I) so it can be read out over the phone without mistakes. Staff — administrators, mentors, methodists — sign in with an email and password.',
          },
          {
            q: 'How are Telegram notifications set up?',
            a: 'An account is linked to the bot through a one-time link from the dashboard — it lives for a few minutes and works once. After linking, alerts about absences, payments and debts arrive in regular Telegram; no extra app is needed.',
          },
        ],
      },
      {
        title: 'Payments and debts',
        items: [
          {
            q: 'What happens when a student pays late?',
            a: 'Once an invoice goes overdue, the student’s access to homework, tests, video lessons and the rewards shop is blocked automatically. As soon as a payment goes through — even a partial one — access is restored on the very next page load, with no nightly recalculation to wait for.',
          },
          {
            q: 'Can a payment be split across methods?',
            a: 'Yes. One invoice can be closed by several payments — part in cash at the desk, part by card. Every payment is tied to the same invoice, so the remaining balance is exact rather than approximate.',
          },
          {
            q: 'How is a student’s debt calculated?',
            a: 'The system recalculates the balance when an invoice is issued and when it is paid — nothing is totted up by hand. A branch administrator sees the list of debtors and the branch total; the network owner sees every branch at once.',
          },
          {
            q: 'Can a student be put on hold?',
            a: 'Yes. A freeze stops the charges: the debt does not grow while the student is away, and the payment, grade and attendance history is kept in full. When they come back, they pick up where they left off.',
          },
        ],
      },
      {
        title: 'Coursework, access and data',
        items: [
          {
            q: 'Can the test timer be cheated?',
            a: 'No. The test clock runs on the server, not in the browser: reloading the page, losing connection or opening a second window does not extend it.',
          },
          {
            q: 'Who on staff can see what?',
            a: 'A mentor sees only their own groups, an administrator only their own branch, and the network owner sees every branch. Permissions are checked on the server on every request, so knowing a URL is not enough to open someone else’s branch.',
          },
          {
            q: 'What do parents see?',
            a: 'Their own child’s performance, attendance and outstanding balance, plus a direct chat with the administrator and the mentor. Absences, grades and payment reminders arrive in Telegram on their own — no phone calls needed.',
          },
          {
            q: 'What happens to the center’s data over time?',
            a: 'Nothing is physically deleted: a departed student moves to a read-only archive, and their payments, grades and attendance stay available for reporting. On top of that, a backup is taken every day.',
          },
        ],
      },
    ],

    moreHead: 'Topic-specific questions live on their own pages',
    more: [
      { label: 'Pricing, plans and refunds', path: '/landing/pricing' },
      { label: 'Moving from Excel to a CRM', path: '/landing/crm-vs-excel' },
      { label: 'For language schools', path: '/landing/for-language-school' },
      { label: 'For courses and tutors', path: '/landing/for-courses' },
      { label: 'Roles and access rights', path: '/landing/roles' },
      { label: 'About us', path: '/landing/about' },
    ],

    ctaTitle: 'Did not find your question?',
    ctaText: 'Send a request — we will answer for your setup and walk you through the system live.',
  },

  about: {
    badge: 'About us',
    h1: 'The company behind LevelUp Academy',
    lead: 'LevelUp Academy is student management software for education centers: enrollment, payments, attendance and coursework all live in one system. It is built by a team of six; the company was founded in 2026 in Uzbekistan.',
    intro:
      'We are not a school and not a coding academy. We build the software that education centers run on every day.',

    whyHead: 'Three problems the product is built around',
    whyLead: 'These are the ones that repeat in almost every center — and the reason the system exists.',
    why: [
      {
        icon: 'receipt',
        title: 'Money lives in scattered spreadsheets',
        text: 'Payments, debts and installments sit in different files kept by different people. The total outstanding balance almost never adds up on the first try.',
      },
      {
        icon: 'calendar',
        title: 'Attendance is never consolidated',
        text: 'Attendance is marked on paper, and by the end of the month it turns out a student missed half the classes. Parents are the last to find out.',
      },
      {
        icon: 'grid',
        title: 'Branches cannot be compared',
        text: 'Every branch keeps its own records, so there is no network-wide picture: where revenue dipped and where debt is growing only becomes visible after the fact.',
      },
    ],

    principlesHead: 'The principles the system is built on',
    principlesLead: 'Not slogans — decisions baked into the architecture.',
    principles: [
      {
        icon: 'lock',
        title: 'The server decides access',
        text: 'The role is carried in the token and checked on every request, and data is scoped to the organization and branch. Knowing a URL is not enough to open another branch.',
      },
      {
        icon: 'shield',
        title: 'Data outranks new features',
        text: 'Daily backups, and deletion is soft: payment, grade and attendance history stays available for reporting even for archived records.',
      },
      {
        icon: 'coin',
        title: 'Every number is a ledger entry',
        text: 'Payments (including cash and card splits) and coins change only through a ledger entry with a stated reason. Balances cannot be rewritten after the fact.',
      },
      {
        icon: 'rocket',
        title: 'Live in a week',
        text: 'We migrate a center into the system in 7 days, and the first week of use is free. If we miss the deadline, the next month is on us.',
      },
    ],

    factsHead: 'Company card',
    factsLead: 'A short reference for anyone checking who they are dealing with.',
    facts: [
      { label: 'Name', value: 'LevelUp Academy (LevelUp Academy CRM)' },
      { label: 'What it is', value: 'SaaS platform for running an education center' },
      { label: 'Founded', value: '2026' },
      { label: 'Team', value: '6 people' },
      { label: 'Founder', value: 'Azizbek Amangeldiev' },
      { label: 'Country', value: 'Uzbekistan' },
      { label: 'Languages', value: "русский, o'zbekcha, English" },
      {
        label: 'Built for',
        value: 'Education centers, language schools, course providers and tutoring businesses',
      },
      { label: 'Website', value: 'levelup-academy.uz' },
      { label: 'Email', value: 'info@levelup-academy.uz' },
      { label: 'Telegram', value: '@levelupacademycrm' },
      { label: 'Instagram', value: '@levelup_academy_uz' },
      { label: "Founder's LinkedIn", value: 'linkedin.com/in/azizbek-amangeldiev-6045a342b' },
    ],

    sameHead: 'We are often confused with others',
    sameText:
      'Organizations in the USA, Serbia, Singapore, Moldova and Tajikistan share the name LevelUp Academy — schools, courses and IT academies. We are not affiliated with any of them: LevelUp Academy at levelup-academy.uz is a CRM system for education centers in Uzbekistan, that is, software rather than a place where classes are taught.',

    linksHead: 'Where to go next',
    links: [
      { label: 'Founder — Azizbek Amangeldiev', path: '/landing/team/azizbek-amangeldiev' },
      { label: 'What the system does', path: '/landing/features' },
      { label: 'Pricing', path: '/landing/pricing' },
      { label: 'Roles and access', path: '/landing/roles' },
      { label: 'Contact us', path: '/landing/contacts' },
    ],

    ctaTitle: 'Want to see the system from the inside?',
    ctaText:
      'Send a request — we will walk through LevelUp Academy on your center’s workflow and set up the first week free.',
  },

  founder: {
    badge: 'Founder',
    h1: 'Azizbek Amangeldiev',
    subName: 'Азизбек Амангелдиев',
    location: 'Tashkent, Uzbekistan',
    lead: 'Founder of LevelUp Academy — a SaaS CRM for education centers in Uzbekistan. Focused on product and backend: system architecture, authentication, payments and multi-branch support.',
    tags: ['Full-stack', 'Product', 'SaaS'],
    contactsHead: 'How to reach me',
    contactsLead: 'I respond fastest on Telegram — usually within the day.',
    contactTelegramLabel: 'Telegram',
    contactTelegramNote: 'Fastest',
    contactEmailLabel: 'Email',
    contactLinkedinLabel: 'LinkedIn',
    stackHead: 'What the product is built on',
    stackLead: "LevelUp Academy's real technology stack — from the server to deployment.",
    stackGroups: [
      { label: 'Backend', icon: 'lock', items: ['Node.js', 'Express', 'PostgreSQL', 'Redis', 'BullMQ', 'Socket.io'] },
      { label: 'Frontend', icon: 'grid', items: ['React 18', 'Vite', 'Tailwind CSS', 'DaisyUI', 'TanStack Query', 'Redux Toolkit'] },
      { label: 'Infrastructure', icon: 'building', items: ['Render', 'Vercel', 'MinIO / S3', 'Telegram Bot (grammY)'] },
    ],
    highlights: [
      {
        icon: 'rocket',
        title: 'Product & backend',
        text: 'System architecture, authentication, payments and multi-branch support — from idea to production.',
      },
      {
        icon: 'calendar',
        title: 'Since 2026',
        text: 'Founded LevelUp Academy in Uzbekistan — now used by a team of six.',
      },
      {
        icon: 'building',
        title: 'Tashkent, Uzbekistan',
        text: 'Builds SaaS for education centers — software people use every day.',
      },
    ],
    bioHead: 'Who is Azizbek Amangeldiev',
    bioText:
      'Azizbek Amangeldiev (Азизбек Амангелдиев) is the founder of LevelUp Academy, a SaaS platform for education centers in Uzbekistan founded in 2026. He works on product and backend: system architecture, authentication, payments and multi-branch support. Based in Tashkent, Uzbekistan.',
    linksHead: 'What to check next',
    links: [
      { label: 'About the company', path: '/landing/about' },
      { label: 'Product features', path: '/landing/features' },
    ],
  },

  notFound: {
    badge: '404',
    h1: 'This page does not exist',
    text: 'The link may be out of date or the address may have a typo. Head back to the home page — every section of LevelUp Academy is reachable from there.',
    button: 'Go to home page',
  },

  ceo: {
    home: {
      title: 'School Management Software & Education CRM | LevelUp',
      description:
        'Student management system for learning centers: payments and debts, attendance and an electronic register, tests, motivation and Telegram alerts in one CRM. First week free.',
    },
    features: {
      title: 'Features — 12+ CRM modules | LevelUp Academy',
      description:
        'Payments, attendance tracking, tests with a server-side timer, homework, coins, chats, video lessons, reports and a Telegram bot — every LevelUp Academy module.',
    },
    roles: {
      title: 'Roles and permissions — 6 workspaces | LevelUp Academy',
      description:
        'CEO, Admin, Mentor, Methodist, Parent and Student — each role has its own workspace. Access is decided by server-side RBAC: nobody sees more than they should.',
    },
    finance: {
      title: 'Student payment and debt tracking | LevelUp Academy',
      description:
        'Student payment and debt tracking: split payments in cash and by card, invoices, receipts in the cloud and live revenue reports. Center finances down to the last coin.',
    },
    pricing: {
      title: 'Pricing — education CRM for learning centers | LevelUp',
      description:
        'LevelUp Academy pricing: free up to 30 students, then from 199,000 UZS/mo. Fixed price by student count, unlimited branches, first week free.',
    },
    langSchool: {
      title: 'CRM for language schools — groups, payments | LevelUp',
      description:
        'CRM for a language school: level-based groups (A1–C1, IELTS), attendance, homework, tests, payments and student motivation in one system. First week free.',
    },
    courses: {
      title: 'CRM for courses and tutoring centers | LevelUp Academy',
      description:
        'CRM for training courses and tutoring centers: groups and one-to-one lessons, attendance, homework, tests, course payments and motivation. First week free.',
    },
    vsExcel: {
      title: 'CRM instead of Excel for a learning center | LevelUp',
      description:
        'Why learning centers move from Excel to a CRM: debts calculate themselves, attendance and payments live in one system, parents get notified. Switch in a week.',
    },
    blog: {
      title: 'Knowledge base for learning centers | LevelUp Academy',
      description:
        'Articles on bringing order to a learning center: moving from Excel to a CRM, controlling student debts and automating attendance tracking.',
    },
    gamification: {
      title: 'Motivation and gamification | LevelUp Academy',
      description:
        'Coins for performance, a rewards shop and live weekly and monthly leaderboards. An append-only coin ledger — motivation you can see every day.',
    },
    contacts: {
      title: 'Contact and request a demo | LevelUp Academy',
      description:
        'Send a request — we will tell you about LevelUp Academy and answer your questions. First week free, no card and no commitment.',
    },
    vsModme: {
      title: 'LevelUp Academy vs Modme — pricing and features compared',
      description:
        'An honest comparison of LevelUp Academy and Modme: price by student count, minimum billing period, gamification in the plan and mobile apps. Data checked 05.08.2026.',
    },
    vsUmai: {
      title: 'LevelUp Academy vs Umai CRM — pricing and features compared',
      description:
        'An honest comparison of LevelUp Academy and Umai CRM: what drives the price, onboarding cost, sales pipelines and mobile apps. Data checked 05.08.2026.',
    },
    faqHub: {
      title: 'FAQ — student management software | LevelUp Academy',
      description:
        'Answers about LevelUp Academy: student login codes, access blocked on overdue invoices, split payments, freezing a student, access rights and how center data is kept.',
    },
    about: {
      title: 'About us — the team behind LevelUp Academy',
      description:
        'LevelUp Academy is student management software from Uzbekistan: founded in 2026, a team of six. Who we are, how the system is built and what we are not.',
    },
    founder: {
      title: 'Azizbek Amangeldiev — Founder of LevelUp Academy',
      description:
        'Azizbek Amangeldiev (Азизбек Амангелдиев) is the founder of LevelUp Academy, a SaaS CRM for education centers in Uzbekistan founded in 2026.',
    },
    notFound: {
      title: 'Page not found — LevelUp Academy',
      description: 'This page does not exist. Head back to the LevelUp Academy home page.',
    },
    breadcrumbHome: 'Home',
  },
};
