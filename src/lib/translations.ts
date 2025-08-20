import { useState } from 'react'

export type Language = 'rw' | 'en'

export interface Translations {
  // Common
  loading: string
  error: string
  success: string
  cancel: string
  confirm: string
  save: string
  delete: string
  edit: string
  add: string
  back: string
  next: string
  previous: string
  close: string
  search: string
  filter: string
  sort: string
  refresh: string
  retry: string
  noData: string

  // Navigation
  home: string
  dashboard: string
  profile: string
  settings: string

  // Authentication
  signIn: string
  signUp: string
  signOut: string
  email: string
  password: string
  confirmPassword: string
  phoneNumber: string
  forgotPassword: string
  resetPassword: string
  loginSuccess: string
  loginError: string
  registerSuccess: string
  registerError: string
  logoutConfirm: string
  logoutSuccess: string

  // Profile
  myAccount: string
  myProfile: string
  personalInfo: string
  fullName: string
  phone: string
  role: string
  subscription: string
  paymentMode: string
  nextPayment: string
  freeTier: string
  notSet: string
  nothingRequired: string
  signInToViewProfile: string

  // Settings
  language: string
  darkMode: string
  notifications: string
  privacy: string
  security: string
  about: string
  help: string
  contact: string
  terms: string
  privacyPolicy: string

  // Generic UI
  selectLanguage: string

  // Properties
  property: string
  properties: string
  addProperty: string
  editProperty: string
  deleteProperty: string
  propertyName: string
  propertyType: string
  propertyAddress: string
  propertyDescription: string
  propertyStatus: string
  propertyPrice: string
  propertySize: string
  propertyRooms: string
  propertyBathrooms: string
  propertyFeatures: string
  propertyImages: string
  propertyDocuments: string
  propertyLocation: string
  propertyContact: string
  propertyOwner: string
  propertyManager: string

  // Tenants
  tenant: string
  tenants: string
  addTenant: string
  editTenant: string
  deleteTenant: string
  tenantName: string
  tenantEmail: string
  tenantPhone: string
  tenantStatus: string
  tenantLease: string
  tenantRent: string
  tenantDeposit: string
  tenantMoveIn: string
  tenantMoveOut: string
  tenantDocuments: string
  tenantHistory: string

  // Payments
  payment: string
  payments: string
  addPayment: string
  editPayment: string
  deletePayment: string
  paymentAmount: string
  paymentDate: string
  paymentMethod: string
  paymentStatus: string
  paymentType: string
  paymentDescription: string
  paymentReceipt: string
  paymentHistory: string
  paymentDue: string
  paymentOverdue: string
  paymentPending: string
  paymentCompleted: string
  paymentFailed: string
  paymentRefunded: string

  // Reports
  report: string
  reports: string
  generateReport: string
  exportReport: string
  reportType: string
  reportDate: string
  reportPeriod: string
  reportSummary: string
  reportDetails: string
  reportChart: string
  reportTable: string
  reportPDF: string
  reportExcel: string

  // Messages
  message: string
  messages: string
  newMessage: string
  sendMessage: string
  reply: string
  messageSubject: string
  messageBody: string
  messageRecipient: string
  messageSender: string
  messageDate: string
  messageStatus: string
  messageUnread: string
  messageRead: string
  messageReplied: string
  noMessages: string

  // Roles
  roleTenant: string
  roleLandlord: string
  roleManager: string
  roleAdmin: string
  roleMember: string

  // Status
  statusActive: string
  statusInactive: string
  statusPending: string
  statusApproved: string
  statusRejected: string
  statusCompleted: string
  statusCancelled: string
  statusOverdue: string
  statusPaid: string
  statusUnpaid: string

  // Actions
  actionView: string
  actionEdit: string
  actionDelete: string
  actionAdd: string
  actionSave: string
  actionCancel: string
  actionConfirm: string
  actionApprove: string
  actionReject: string
  actionComplete: string
  actionArchive: string
  actionRestore: string

  // Alerts
  alertTitle: string
  alertMessage: string
  alertConfirm: string
  alertCancel: string
  alertDelete: string
  alertDeleteConfirm: string
  alertDeleteMessage: string
  alertSuccess: string
  alertError: string
  alertWarning: string
  alertInfo: string

  // Language specific
  languageChanged: string
  languageChangedTo: string
  languageKinyarwanda: string
  languageEnglish: string

  // Home page specific
  searchPlaceholder: string
  newest: string
  oldest: string
  lowPrice: string
  highPrice: string
  welcome: string
  welcomeSubtitle: string
  noPropertiesFound: string
  searchDifferentTerms: string
  haveProperty: string
  addPropertySubtitle: string
  addPropertyButton: string
  addPropertyAlert: string
  addPropertyAlertMessage: string
  goToDashboard: string
  dashboardInfo: string
  appFooter: string
  loadingProperties: string
  noRooms: string
  fullyOccupied: string
  allAvailable: string
  roomsAvailable: string
  pay: string
  view: string
  available: string

  // Property details modal
  propertyDetails: string
  propertyInfo: string
  loginToBook: string
  loginToBookMessage: string
  bookNow: string
  bookNowLocked: string
  inquiryPlaceholder: string
  shareProperty: string

  // Auth components
  selectRole: string
  fillPhoneEmailPassword: string
  enterValidPhoneEmail: string
  phoneEmailPasswordInvalid: string
  landlord: string
  manager: string
  admin: string
  floors: string
  rooms: string
  description: string
  ask: string

  // Dashboard specific
  reservations: string
  money: string
  announcements: string
  extendTime: string
  financialInfo: string
  totalPaid: string
  monthsPaid: string
  receipts: string
  recentPayments: string
  receiptNumber: string
  recentActivities: string
  loadingActivities: string
  reservationHistory: string
  noReservations: string
  messageHistory: string
  houseAnnouncements: string
  extendTimeButton: string
  extensionRequests: string
  noExtensionRequests: string
  messageSent: string
  messageSentSuccess: string
  messageSendError: string
  extensionRequestSent: string
  extensionRequestSuccess: string
  sendMessageModal: string
  messagePlaceholder: string
  fillSubjectMessage: string
  sendMessageAccessibility: string
  sendMessageHint: string
  requestExtensionModal: string
  requestExtensionAccessibility: string
  requestExtensionHint: string

  // Common error/success messages (app-specific)
  unableDetermineUser: string
  unableFetchProperties: string
  unableFetchRooms: string
  unableFetchTenants: string
  errorFetchingTenants: string
  mustSelectTenant: string
  mustSelectAtLeastOneRoom: string
  enterPaymentAmount: string
  selectPaymentDate: string
  selectNextDueDate: string
  paymentApprovedSuccess: string
  unableApprovePayment: string
  noAuthAccess: string
  noUserInfoAvailable: string
  errorFetchingYourInfo: string
  unableFetchAllPayments: string
  unableFetchAllUsers: string

  // Activities / Filters / Relative time
  all: string
  managers: string
  noActivitiesFound: string
  activitiesHelp: string
  momentsAgo: string
  minutesAgoSuffix: string
  hoursAgoSuffix: string
  daysAgoSuffix: string
}

export const translations: Record<Language, Translations> = {
  rw: {
    // Common
    loading: 'Gukura...',
    error: 'Hari ikibazo',
    success: 'Byagenze neza',
    cancel: 'Reka',
    confirm: 'Uremeza',
    save: 'Bika',
    delete: 'Siba',
    edit: 'Hindura',
    add: 'Ongera',
    back: 'Subira inyuma',
    next: 'Ukurikira',
    previous: 'Ubanza',
    close: 'Funga',
    search: 'Shakisha',
    filter: 'Shungura',
    sort: 'Shungura',
    refresh: 'Vugurura',
    retry: 'Ongera ugerageze',
    noData: 'Nta makuru ahari',

    // Navigation
    home: 'Ahabanza',
    dashboard: 'Ikibaho',
    profile: 'Konti',

    // Authentication
    signIn: 'Injira',
    signUp: 'Iyandikishe',
    signOut: 'Sohoka',
    email: 'Imeri',
    password: 'Ijambo ry\'ibanga',
    confirmPassword: 'Uremeza ijambo ry\'ibanga',
    phoneNumber: 'Telefoni',
    forgotPassword: 'Wibagiwe ijambo ry\'ibanga?',
    resetPassword: 'Vugurura ijambo ry\'ibanga',
    loginSuccess: 'Winjiye neza',
    loginError: 'Hari ikibazo mu kwinjira',
    registerSuccess: 'Iyandikishijwe neza',
    registerError: 'Hari ikibazo mu kwiyandikisha',
    logoutConfirm: 'Uremeza ko ushaka gusohoka?',
    logoutSuccess: 'Wasohotse neza',

    // Profile
    myAccount: 'Konti yawe',
    myProfile: 'Konti yawe',
    personalInfo: 'Amakuru yawe',
    fullName: 'Amazina',
    phone: 'Telefoni',
    role: 'Uruhare',
    subscription: 'Kwishyura',
    paymentMode: 'Uko wishyura',
    nextPayment: 'Kwishyura gikurikira',
    freeTier: 'Kubuntu (0 RWF)',
    notSet: 'Ntabwo byashyizwemo',
    nothingRequired: 'Kubuntu - ntacyo gisabwa',
    signInToViewProfile: 'Injira kugira ngo urebye amakuru yawe',

    // Settings
    settings: 'Igenamiterere',
    language: 'Ururimi',
    darkMode: 'Uko kwerekana',
    notifications: 'Kumenyesha',
    privacy: 'Amabwiriza',
    security: 'Umutekano',
    about: 'Ibyerekeye',
    help: 'Ubufasha',
    contact: 'Twandikire',
    terms: 'Amabwiriza',
    privacyPolicy: 'Politiki y\'ibitugu',

    // Generic UI
    selectLanguage: 'Hitamo Ururimi',

    // Properties
    property: 'Inyubako',
    properties: 'Inyubako',
    addProperty: 'Ongera inyubako',
    editProperty: 'Hindura inyubako',
    deleteProperty: 'Siba inyubako',
    propertyName: 'Izina ry\'inyubako',
    propertyType: 'Ubwoko bw\'inyubako',
    propertyAddress: 'Aderesi y\'inyubako',
    propertyDescription: 'Ibisobanura by\'inyubako',
    propertyStatus: 'Uko inyubako ihagaze',
    propertyPrice: 'Igiciro cy\'inyubako',
    propertySize: 'Ubunini bw\'inyubako',
    propertyRooms: 'Amazu y\'inyubako',
    propertyBathrooms: 'Amazu y\'ikiyuhagiro',
    propertyFeatures: 'Ibintu by\'inyubako',
    propertyImages: 'Ifoto z\'inyubako',
    propertyDocuments: 'Inyandiko z\'inyubako',
    propertyLocation: 'Aho inyubako ihari',
    propertyContact: 'Twandikire',
    propertyOwner: 'Nyir\'inyubako',
    propertyManager: 'Umuyobozi',

    // Tenants
    tenant: 'Umukode',
    tenants: 'Abakodeshi',
    addTenant: 'Ongera umukode',
    editTenant: 'Hindura umukode',
    deleteTenant: 'Siba umukode',
    tenantName: 'Izina ry\'umukode',
    tenantEmail: 'Imeri y\'umukode',
    tenantPhone: 'Telefoni y\'umukode',
    tenantStatus: 'Uko umukode ahagaze',
    tenantLease: 'Umushinga w\'umukode',
    tenantRent: 'Umwishyura w\'umukode',
    tenantDeposit: 'Umwishyura w\'umukode',
    tenantMoveIn: 'Umunsi umukode yinjira',
    tenantMoveOut: 'Umunsi umukode asohoka',
    tenantDocuments: 'Inyandiko z\'umukode',
    tenantHistory: 'Amateka y\'umukode',

    // Payments
    payment: 'Kwishyura',
    payments: 'Kwishyura',
    addPayment: 'Ongera kwishyura',
    editPayment: 'Hindura kwishyura',
    deletePayment: 'Siba kwishyura',
    paymentAmount: 'Amafaranga y\'ishyura',
    paymentDate: 'Umunsi w\'ishyura',
    paymentMethod: 'Uko wishyura',
    paymentStatus: 'Uko ishyura rihagaze',
    paymentType: 'Ubwoko bw\'ishyura',
    paymentDescription: 'Ibisobanura by\'ishyura',
    paymentReceipt: 'Inyandiko y\'ishyura',
    paymentHistory: 'Amateka y\'ishyura',
    paymentDue: 'Ishyura rigomba',
    paymentOverdue: 'Ishyura rishize',
    paymentPending: 'Ishyura rihagaze',
    paymentCompleted: 'Ishyura ryagenze',
    paymentFailed: 'Ishyura ryarangiriye',
    paymentRefunded: 'Ishyura ryasubijwe',

    // Reports
    report: 'Raporo',
    reports: 'Raporo',
    generateReport: 'Kora raporo',
    exportReport: 'Ohereza raporo',
    reportType: 'Ubwoko bw\'apororo',
    reportDate: 'Itariki y\'apororo',
    reportPeriod: 'Igihe cy\'apororo',
    reportSummary: 'Ibisobanura by\'apororo',
    reportDetails: 'Ibisobanura by\'apororo',
    reportChart: 'Ishusho y\'apororo',
    reportTable: 'Imbonerahamwe y\'apororo',
    reportPDF: 'PDF y\'apororo',
    reportExcel: 'Excel y\'apororo',

    // Messages
    message: 'Ubutumwa',
    messages: 'Ubutumwa',
    newMessage: 'Ubutumwa bushya',
    sendMessage: 'Ohereza ubutumwa',
    reply: 'Igisubizo',
    messageSubject: 'Icyo ubutumwa buvuga',
    messageBody: 'Inyandiko y\'ubutumwa',
    messageRecipient: 'Uwo ubutumwa buhererwa',
    messageSender: 'Uwo ubutumwa buherewe',
    messageDate: 'Itariki y\'ubutumwa',
    messageStatus: 'Uko ubutumwa buhagaze',
    messageUnread: 'Ubutumwa butasomwe',
    messageRead: 'Ubutumwa busomwe',
    messageReplied: 'Ubutumwa buhagaze',
    noMessages: 'Nta butumwa',

    // Roles
    roleTenant: 'Umukode',
    roleLandlord: 'Nyir\'inyubako',
    roleManager: 'Umuyobozi',
    roleAdmin: 'Umugenzuzi mukuru',
    roleMember: 'Umunyamuryango',

    // Status
    statusActive: 'Gikora',
    statusInactive: 'Ntigikora',
    statusPending: 'Hagaze',
    statusApproved: 'Byemewe',
    statusRejected: 'Byanze',
    statusCompleted: 'Byagenze',
    statusCancelled: 'Byahagaritswe',
    statusOverdue: 'Rishize',
    statusPaid: 'Rishyuwe',
    statusUnpaid: 'Ntirishyuwe',

    // Actions
    actionView: 'Reba',
    actionEdit: 'Hindura',
    actionDelete: 'Siba',
    actionAdd: 'Ongera',
    actionSave: 'Bika',
    actionCancel: 'Reka',
    actionConfirm: 'Uremeza',
    actionApprove: 'Emeza',
    actionReject: 'Nanza',
    actionComplete: 'Manza',
    actionArchive: 'Bika',
    actionRestore: 'Subira',

    // Alerts
    alertTitle: 'Kumenyesha',
    alertMessage: 'Ubutumwa',
    alertConfirm: 'Uremeza',
    alertCancel: 'Reka',
    alertDelete: 'Siba',
    alertDeleteConfirm: 'Uremeza ko ushaka gusiba?',
    alertDeleteMessage: 'Iki gice kizasibwa.',
    alertSuccess: 'Byagenze neza',
    alertError: 'Hari ikibazo',
    alertWarning: 'Iburira',
    alertInfo: 'Amakuru',

    // Language specific
    languageChanged: 'Ururimi ruhindujwe',
    languageChangedTo: 'Ururimi ruhindujwe rwaba',
    languageKinyarwanda: 'Kinyarwanda',
    languageEnglish: 'Icyongereza',

    // Home page specific
    searchPlaceholder: 'Shakisha inyubako... (Ahantu, ubwoko, igiciro)',
    newest: 'Inshyashya Cyane',
    oldest: 'Iyakera cyane',
    lowPrice: 'Igiciro gito',
    highPrice: 'Ihenze cyane',
    welcome: 'Murakaza neza',
    welcomeSubtitle: 'Hitamo icumbi rikunogeye 🤗 inzu yo gukoreramo mu nyubako zikunzwe mu Rwanda ku giciro gito 😍',
    noPropertiesFound: 'Nta nyubako ibonetse',
    searchDifferentTerms: 'Shakisha inyubako ukoresha amagambo atandukanye',
    haveProperty: 'Ufite inyubako?',
    addPropertySubtitle: 'Ongeramo inyubako yawe kuri Icumbi ukore ubukode bworoshye',
    addPropertyButton: 'Ongeramo Inyubako',
    addPropertyAlert: 'Ongeramo Inyubako',
    addPropertyAlertMessage: 'Kugira ngo wongeramo inyubako, ugomba kujya kuri website ya Icumbi.com cyangwa ukoreshe dashboard ya landlord.',
    goToDashboard: 'Jya kuri Dashibodi',
    dashboardInfo: 'Jya kuri Dashibodi kugira ngo ukoreshe amahitamo yo kongeramo inyubako.',
    appFooter: 'Icumbi © 2025 — "Ubukode bworoshye, ubuzima bwiza."',
    loadingProperties: 'Gukura inyubako...',
    noRooms: 'Nta byumba',
    fullyOccupied: 'Yarafashwe',
    allAvailable: 'Byose bihari',
    roomsAvailable: 'bihari',
    pay: 'Ishyura',
    view: 'Reba',
    available: 'ibihari',

    // Property details modal
    propertyDetails: 'Amakuru y\'inyubako',
    propertyInfo: 'Amakuru',
    loginToBook: 'Injira kugira ngo ushobore kubaza, gufata booking, cyangwa kwishyura 👤',
    loginToBookMessage: 'Ugomba kwinjira mbere yo kwishyura inyubako.',
    bookNow: 'Ishyura',
    bookNowLocked: '🔒 Ishyura',
    inquiryPlaceholder: 'Andika ibibazo byawe, ibibazo ku giciro, amahoro, n\'ibindi...',
    shareProperty: 'Check out this property:',

    // Auth components
    selectRole: 'Hitamo uruhare rwawe.',
    fillPhoneEmailPassword: 'Uzuza telefoni/imeri n\'ijambo ry\'ibanga.',
    enterValidPhoneEmail: 'Andika telefoni y\'imibare 10 cyangwa imeri nyayo.',
    phoneEmailPasswordInvalid: 'Telefoni/imeri cyangwa ijambo ry\'ibanga bitatubahirije.',
    landlord: 'Nyirinyubako',
    manager: 'Umuyobozi',
    admin: 'Admin',
    floors: 'Amagorofa',
    rooms: 'Ibyumba',
    description: 'Ibisobanuro',
    ask: 'Kubaza',

    // Dashboard specific
    reservations: 'Rezervasiyo',
    money: 'Amafaranga',
    announcements: 'Amatangazo',
    extendTime: 'Kongera igihe',
    financialInfo: 'Amakuru y\'amafaranga',
    totalPaid: 'Yishyuwe yose',
    monthsPaid: 'Amezi yishyuwe',
    receipts: 'Inyemezabwishyu',
    recentPayments: 'Kwishyura biheruka',
    receiptNumber: 'Inyemezabwishyu:',
    recentActivities: 'Ibikorwa biheruka',
    loadingActivities: 'Gukurura ibikorwa...',
    reservationHistory: 'Amateka ya rezervasiyo',
    noReservations: 'Nta rezervasiyo zihari',
    messageHistory: 'Amateka y\'ubutumwa',
    houseAnnouncements: 'Amatangazo y\'inzu',
    extendTimeButton: 'Kongera igihe',
    extensionRequests: 'Ibyifuzo byo kongera igihe',
    noExtensionRequests: 'Nta byifuzo byo kongera igihe',
    messageSent: 'Ubutumwa bwoherejwe',
    messageSentSuccess: 'Ubutumwa bwawe bwoherejwe neza.',
    messageSendError: 'Ntibyashoboye kohereza ubutumwa. Ongera ugerageze.',
    extensionRequestSent: 'Icyifuzo cyoherejwe',
    extensionRequestSuccess: 'Icyifuzo cyo kongera igihe cyoherejwe neza.',
    sendMessageModal: 'Ohereza ubutumwa',
    messagePlaceholder: 'Ubutumwa bwawe...',
    fillSubjectMessage: 'Nyamuneka uzuza insanganyamatsiko n\'ubutumwa.',
    sendMessageAccessibility: 'Ohereza ubutumwa',
    sendMessageHint: 'Kanda kugira ngo wohereze ubutumwa kuri nyirinyubako',
    requestExtensionModal: 'Saba kongera igihe',
    requestExtensionAccessibility: 'Ohereza icyifuzo cyo kongera igihe',
    requestExtensionHint: 'Kanda kugira ngo wohereze icyifuzo cyo kongera igihe kuri nyirinyubako',
    
    // Common error/success messages (app-specific)
    unableDetermineUser: 'Ntiwashoboye kumenya uwowe. Ongera ukinjire.',
    unableFetchProperties: 'Ntiyashoboye gushaka inyubako zawe.',
    unableFetchRooms: 'Ntiyashoboye gushaka ibyumba.',
    unableFetchTenants: 'Ntiyashoboye gushaka abakodesha.',
    errorFetchingTenants: 'Habaye ikosa mu gushaka abakodesha.',
    mustSelectTenant: 'Hitamo umukodesha',
    mustSelectAtLeastOneRoom: 'Hitamo byibura icyumba kimwe',
    enterPaymentAmount: 'Andika amafaranga yishyuwe',
    selectPaymentDate: 'Hitamo itariki y\'ubwishyu',
    selectNextDueDate: 'Hitamo itariki ikurikira y\'ubwishyu',
    paymentApprovedSuccess: 'Ubwishyu bwemejwe neza.',
    unableApprovePayment: 'Ntibyashoboye kwemeza ubwishyu.',
    noAuthAccess: 'Nta bucukumbuzi bwemerewe busanganywe.',
    noUserInfoAvailable: 'Nta makuru y\'umukoresha asanganywe.',
    errorFetchingYourInfo: 'Hari ikosa ryabaye mu gushaka amakuru yawe.',
    unableFetchAllPayments: 'Ntibyashoboye gukura ubwishyu bwose.',
    unableFetchAllUsers: 'Ntibyashoboye gukura abakoresha bose.',

    // Activities / Filters / Relative time
    all: 'Byose',
    managers: 'Abayobozi',
    noActivitiesFound: 'Nta bikorwa bibonetse',
    activitiesHelp: 'Ibikorwa bizagaragara hano igihe cyose ucuruza ubukode.',
    momentsAgo: 'Hashize gato',
    minutesAgoSuffix: 'iminota ishize',
    hoursAgoSuffix: 'isaha ishize',
    daysAgoSuffix: 'umunsi ushize',
  },
  en: {
    // Common
    loading: 'Loading...',
    error: 'An error occurred',
    success: 'Success',
    cancel: 'Cancel',
    confirm: 'Confirm',
    save: 'Save',
    delete: 'Delete',
    edit: 'Edit',
    add: 'Add',
    back: 'Back',
    next: 'Next',
    previous: 'Previous',
    close: 'Close',
    search: 'Search',
    filter: 'Filter',
    sort: 'Sort',
    refresh: 'Refresh',
    retry: 'Retry',
    noData: 'No data available',

    // Navigation
    home: 'Home',
    dashboard: 'Dashboard',
    profile: 'Profile',

    // Authentication
    signIn: 'Sign In',
    signUp: 'Sign Up',
    signOut: 'Sign Out',
    email: 'Email',
    password: 'Password',
    confirmPassword: 'Confirm Password',
    phoneNumber: 'Phone Number',
    forgotPassword: 'Forgot Password?',
    resetPassword: 'Reset Password',
    loginSuccess: 'Successfully signed in',
    loginError: 'Error signing in',
    registerSuccess: 'Successfully registered',
    registerError: 'Error registering',
    logoutConfirm: 'Are you sure you want to sign out?',
    logoutSuccess: 'Successfully signed out',

    // Profile
    myAccount: 'My Account',
    myProfile: 'My Profile',
    personalInfo: 'Personal Information',
    fullName: 'Full Name',
    phone: 'Phone',
    role: 'Role',
    subscription: 'Subscription',
    paymentMode: 'Payment Mode',
    nextPayment: 'Next Payment',
    freeTier: 'Free (0 RWF)',
    notSet: 'Not set',
    nothingRequired: 'Free - nothing required',
    signInToViewProfile: 'Sign in to view your information',

    // Settings
    settings: 'Settings',
    language: 'Language',
    darkMode: 'Dark Mode',
    notifications: 'Notifications',
    privacy: 'Privacy',
    security: 'Security',
    about: 'About',
    help: 'Help',
    contact: 'Contact',
    terms: 'Terms',
    privacyPolicy: 'Privacy Policy',

    // Generic UI
    selectLanguage: 'Select Language',

    // Properties
    property: 'Property',
    properties: 'Properties',
    addProperty: 'Add Property',
    editProperty: 'Edit Property',
    deleteProperty: 'Delete Property',
    propertyName: 'Property Name',
    propertyType: 'Property Type',
    propertyAddress: 'Property Address',
    propertyDescription: 'Property Description',
    propertyStatus: 'Property Status',
    propertyPrice: 'Property Price',
    propertySize: 'Property Size',
    propertyRooms: 'Property Rooms',
    propertyBathrooms: 'Property Bathrooms',
    propertyFeatures: 'Property Features',
    propertyImages: 'Property Images',
    propertyDocuments: 'Property Documents',
    propertyLocation: 'Property Location',
    propertyContact: 'Contact',
    propertyOwner: 'Property Owner',
    propertyManager: 'Property Manager',

    // Tenants
    tenant: 'Tenant',
    tenants: 'Tenants',
    addTenant: 'Add Tenant',
    editTenant: 'Edit Tenant',
    deleteTenant: 'Delete Tenant',
    tenantName: 'Tenant Name',
    tenantEmail: 'Tenant Email',
    tenantPhone: 'Tenant Phone',
    tenantStatus: 'Tenant Status',
    tenantLease: 'Tenant Lease',
    tenantRent: 'Tenant Rent',
    tenantDeposit: 'Tenant Deposit',
    tenantMoveIn: 'Tenant Move In Date',
    tenantMoveOut: 'Tenant Move Out Date',
    tenantDocuments: 'Tenant Documents',
    tenantHistory: 'Tenant History',

    // Payments
    payment: 'Payment',
    payments: 'Payments',
    addPayment: 'Add Payment',
    editPayment: 'Edit Payment',
    deletePayment: 'Delete Payment',
    paymentAmount: 'Payment Amount',
    paymentDate: 'Payment Date',
    paymentMethod: 'Payment Method',
    paymentStatus: 'Payment Status',
    paymentType: 'Payment Type',
    paymentDescription: 'Payment Description',
    paymentReceipt: 'Payment Receipt',
    paymentHistory: 'Payment History',
    paymentDue: 'Payment Due',
    paymentOverdue: 'Payment Overdue',
    paymentPending: 'Payment Pending',
    paymentCompleted: 'Payment Completed',
    paymentFailed: 'Payment Failed',
    paymentRefunded: 'Payment Refunded',

    // Reports
    report: 'Report',
    reports: 'Reports',
    generateReport: 'Generate Report',
    exportReport: 'Export Report',
    reportType: 'Report Type',
    reportDate: 'Report Date',
    reportPeriod: 'Report Period',
    reportSummary: 'Report Summary',
    reportDetails: 'Report Details',
    reportChart: 'Report Chart',
    reportTable: 'Report Table',
    reportPDF: 'Report PDF',
    reportExcel: 'Report Excel',

    // Messages
    message: 'Message',
    messages: 'Messages',
    newMessage: 'New Message',
    sendMessage: 'Send Message',
    reply: 'Reply',
    messageSubject: 'Message Subject',
    messageBody: 'Message Body',
    messageRecipient: 'Message Recipient',
    messageSender: 'Message Sender',
    messageDate: 'Message Date',
    messageStatus: 'Message Status',
    messageUnread: 'Message Unread',
    messageRead: 'Message Read',
    messageReplied: 'Message Replied',
    noMessages: 'No messages',

    // Roles
    roleTenant: 'Tenant',
    roleLandlord: 'Landlord',
    roleManager: 'Manager',
    roleAdmin: 'Admin',
    roleMember: 'Member',

    // Status
    statusActive: 'Active',
    statusInactive: 'Inactive',
    statusPending: 'Pending',
    statusApproved: 'Approved',
    statusRejected: 'Rejected',
    statusCompleted: 'Completed',
    statusCancelled: 'Cancelled',
    statusOverdue: 'Overdue',
    statusPaid: 'Paid',
    statusUnpaid: 'Unpaid',

    // Actions
    actionView: 'View',
    actionEdit: 'Edit',
    actionDelete: 'Delete',
    actionAdd: 'Add',
    actionSave: 'Save',
    actionCancel: 'Cancel',
    actionConfirm: 'Confirm',
    actionApprove: 'Approve',
    actionReject: 'Reject',
    actionComplete: 'Complete',
    actionArchive: 'Archive',
    actionRestore: 'Restore',

    // Alerts
    alertTitle: 'Alert',
    alertMessage: 'Message',
    alertConfirm: 'Confirm',
    alertCancel: 'Cancel',
    alertDelete: 'Delete',
    alertDeleteConfirm: 'Are you sure you want to delete?',
    alertDeleteMessage: 'This item will be deleted.',
    alertSuccess: 'Success',
    alertError: 'Error',
    alertWarning: 'Warning',
    alertInfo: 'Information',

    // Language specific
    languageChanged: 'Language Changed',
    languageChangedTo: 'Language changed to',
    languageKinyarwanda: 'Kinyarwanda',
    languageEnglish: 'English',

    // Home page specific
    searchPlaceholder: 'Search property... (Location, type, price)',
    newest: 'Newest',
    oldest: 'Oldest',
    lowPrice: 'Low Price',
    highPrice: 'High Price',
    welcome: 'Welcome',
    welcomeSubtitle: 'Choose a suitable home 🤗 a house to work in among the popular properties in Rwanda at a low price 😍',
    noPropertiesFound: 'No properties found',
    searchDifferentTerms: 'Search properties using different terms',
    haveProperty: 'Have a property?',
    addPropertySubtitle: 'Add your property to Icumbi and make easy rentals',
    addPropertyButton: 'Add Property',
    addPropertyAlert: 'Add Property',
    addPropertyAlertMessage: 'To add a property, you need to go to the Icumbi.com website or use the landlord dashboard.',
    goToDashboard: 'Go to Dashboard',
    dashboardInfo: 'Go to Dashboard to use the property addition options.',
    appFooter: 'Icumbi © 2025 — "Easy rentals, better life."',
    loadingProperties: 'Loading properties...',
    noRooms: 'No rooms',
    fullyOccupied: 'Fully occupied',
    allAvailable: 'All available',
    roomsAvailable: 'available',
    pay: 'Pay',
    view: 'View',
    available: 'available',

    // Property details modal
    propertyDetails: 'Property Details',
    propertyInfo: 'Information',
    loginToBook: 'Sign in to ask questions, make bookings, or pay 👤',
    loginToBookMessage: 'You need to sign in before booking this property.',
    bookNow: 'Book Now',
    bookNowLocked: '🔒 Book Now',
    inquiryPlaceholder: 'Write your questions, price inquiries, peace, and more...',
    shareProperty: 'Check out this property:',

    // Auth components
    selectRole: 'Please select your role.',
    fillPhoneEmailPassword: 'Please fill in phone/email and password.',
    enterValidPhoneEmail: 'Please enter a valid 10-digit phone number or email.',
    phoneEmailPasswordInvalid: 'Phone/email or password is invalid.',
    landlord: 'Landlord',
    manager: 'Manager',
    admin: 'Admin',
    floors: 'Floors',
    rooms: 'Rooms',
    description: 'Description',
    ask: 'Ask',

    // Dashboard specific
    reservations: 'Reservations',
    money: 'Money',
    announcements: 'Announcements',
    extendTime: 'Extend Time',
    financialInfo: 'Financial Information',
    totalPaid: 'Total Paid',
    monthsPaid: 'Months Paid',
    receipts: 'Receipts',
    recentPayments: 'Recent Payments',
    receiptNumber: 'Receipt:',
    recentActivities: 'Recent Activities',
    loadingActivities: 'Loading activities...',
    reservationHistory: 'Reservation History',
    noReservations: 'No reservations available',
    messageHistory: 'Message History',
    houseAnnouncements: 'House Announcements',
    extendTimeButton: 'Extend Time',
    extensionRequests: 'Extension Requests',
    noExtensionRequests: 'No extension requests',
    messageSent: 'Message Sent',
    messageSentSuccess: 'Your message has been sent successfully.',
    messageSendError: 'Failed to send message. Please try again.',
    extensionRequestSent: 'Extension Request Sent',
    extensionRequestSuccess: 'Your extension request has been sent successfully.',
    sendMessageModal: 'Send Message',
    messagePlaceholder: 'Your message...',
    fillSubjectMessage: 'Please fill in subject and message.',
    sendMessageAccessibility: 'Send message',
    sendMessageHint: 'Tap to send message to landlord',
    requestExtensionModal: 'Request Extension',
    requestExtensionAccessibility: 'Send extension request',
    requestExtensionHint: 'Tap to send extension request to landlord',
    
    // Common error/success messages (app-specific)
    unableDetermineUser: 'Could not determine your session. Please sign in again.',
    unableFetchProperties: 'Unable to fetch your properties.',
    unableFetchRooms: 'Unable to fetch rooms.',
    unableFetchTenants: 'Unable to fetch tenants.',
    errorFetchingTenants: 'An error occurred while fetching tenants.',
    mustSelectTenant: 'Please select a tenant',
    mustSelectAtLeastOneRoom: 'Please select at least one room',
    enterPaymentAmount: 'Please enter payment amount',
    selectPaymentDate: 'Please select payment date',
    selectNextDueDate: 'Please select next due date',
    paymentApprovedSuccess: 'Payment approved successfully.',
    unableApprovePayment: 'Unable to approve payment.',
    noAuthAccess: 'No authorized access available.',
    noUserInfoAvailable: 'No user info available.',
    errorFetchingYourInfo: 'An error occurred while fetching your info.',
    unableFetchAllPayments: 'Unable to fetch all payments.',
    unableFetchAllUsers: 'Unable to fetch users.',

    // Activities / Filters / Relative time
    all: 'All',
    managers: 'Managers',
    noActivitiesFound: 'No activities found',
    activitiesHelp: 'Activities will appear here as you use the app.',
    momentsAgo: 'Just now',
    minutesAgoSuffix: 'minutes ago',
    hoursAgoSuffix: 'hours ago',
    daysAgoSuffix: 'days ago',
  },
}

export const useTranslation = () => {
  const [currentLanguage, setCurrentLanguage] = useState<Language>('rw')

  const t = (key: keyof Translations): string => {
    return translations[currentLanguage][key] || key
  }

  const changeLanguage = (language: Language) => {
    setCurrentLanguage(language)
  }

  return {
    t,
    currentLanguage,
    changeLanguage,
  }
} 