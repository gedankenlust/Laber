/* -------------------------------------------------------------
   LABER - LOKALE ARBEITSBEREICHE, SESSIONS & SPRACHERKENNUNG
------------------------------------------------------------- */

document.addEventListener('DOMContentLoaded', () => {
  const $ = (id) => document.getElementById(id);
  const STATE_KEY = 'laber_state_v3';
  const PREVIOUS_STATE_KEY = 'laber_state_v2';
  const STATE_VERSION = 3;
  const MAX_TEXT_FILE_BYTES = 256 * 1024;
  const MAX_BACKUP_FILE_BYTES = 10 * 1024 * 1024;
  const SUPPORTED_TEXT_EXTENSIONS = new Set(['txt', 'md', 'json', 'csv', 'srt', 'html', 'js', 'py']);
  const NATIVE_PERSISTENCE_TIMEOUT_MS = 5000;

  const inputText = $('inputText');
  const outputText = $('outputText');
  const sourceLang = $('sourceLang');
  const targetLang = $('targetLang');
  const categorySelect = $('categorySelect');
  const toneSelect = $('toneSelect');
  const translateBtn = $('translateBtn');
  const swapLangsBtn = $('swapLangsBtn');
  const clearInputBtn = $('clearInputBtn');
  const copyOutputBtn = $('copyOutputBtn');
  const charCount = $('charCount');
  const statusIndicator = $('statusIndicator');
  const loadingSpinner = $('loadingSpinner');
  const detectedLanguageBadge = $('detectedLanguageBadge');
  const backendStatusDot = $('backendStatusDot');
  const historyList = $('historyList');
  const historySearch = $('historySearch');
  const historyCountBadge = $('historyCountBadge');

  const glossaryModal = $('glossaryModal');
  const glossaryTitle = $('glossaryTitle');
  const glossaryDesc = $('glossaryDesc');
  const glossarySrc = $('glossarySrc');
  const glossaryTgt = $('glossaryTgt');
  const glossaryList = $('glossaryList');

  const workspaceModal = $('workspaceModal');
  const workspaceForm = $('workspaceForm');
  const workspaceName = $('workspaceName');
  const workspaceType = $('workspaceType');
  const workspaceCustomer = $('workspaceCustomer');
  const workspaceSource = $('workspaceSource');
  const workspaceTarget = $('workspaceTarget');
  const workspaceCategory = $('workspaceCategory');
  const workspaceTone = $('workspaceTone');
  const deleteWorkspaceBtn = $('deleteWorkspaceBtn');

  const sessionModal = $('sessionModal');
  const sessionForm = $('sessionForm');
  const sessionName = $('sessionName');

  const translations = {
    de: {
      glossaryBtnLabel: 'Gedächtnis',
      glossaryTitle: 'GEDÄCHTNIS & REGELLISTE',
      glossaryDesc: 'Diese Regeln gelten nur für „{workspace}“. Produktnamen, Fachbegriffe und Kundenanreden anderer Arbeitsbereiche bleiben davon getrennt.',
      exChip1: '<strong>Beispiel 1:</strong> "DeepL" ➔ "Laber" (Eigene Markennamen schützen)',
      exChip2: '<strong>Beispiel 2:</strong> "Dear Client" ➔ "Sehr geehrte/r Kundin/Kunde" (Kundentonfall)',
      lblGlossarySrc: 'ORIGINALBEGRIFF / SATZ',
      lblGlossaryTgt: 'SO SOLL ES IMMER HEISSEN',
      glossarySrcPlaceholder: 'z.B. Dear Customer',
      glossaryTgtPlaceholder: 'z.B. Sehr geehrte Kundschaft',
      addGlossaryBtn: 'Regel speichern',
      emptyGlossary: 'Für diesen Arbeitsbereich sind noch keine Regeln hinterlegt',
      lblSourceLang: 'QUELLSPRACHE',
      lblTargetLang: 'ZIELSPRACHE',
      lblCategory: 'TEXT-TYP / KONTEXT',
      lblTone: 'TONALITÄT',
      sourceAuto: 'Auto-Erkennung',
      languageNames: {
        auto: 'Auto-Erkennung',
        de: 'Deutsch',
        en: 'Englisch',
        fa: 'Farsi (Persisch)',
        fr: 'Französisch',
        es: 'Spanisch'
      },
      categories: {
        general: 'Allgemein',
        email: 'E-Mail & B2B Kommunikation',
        email_reply: 'E-Mail Antwort-Entwurf',
        academic: 'Wissenschaft & Technik',
        product: 'Produkt & Marketing',
        summary: 'Zusammenfassendes Protokoll'
      },
      tones: {
        natural: 'Natürlich',
        formal: 'Formell (B2B Sie)',
        informal: 'Informell (Du)',
        creative: 'Kreativ',
        direct: 'Direkt & Präzise'
      },
      titleInput: 'EINGABE',
      charCount: (length) => `${length} Zeichen`,
      inputPlaceholder: 'Text eingeben... (CMD + ENTER zum Übersetzen)',
      clearInput: 'Text löschen',
      translate: 'ÜBERSETZEN',
      titleOutput: 'ÜBERSETZUNG',
      outputPlaceholder: 'Übersetzung erscheint hier...',
      statusReady: 'Bereit',
      statusTranslating: 'Übersetze...',
      statusDone: 'Fertig',
      statusError: 'Fehler',
      statusEnterText: 'Text eingeben',
      loading: 'Verarbeite mit translategemma...',
      copy: 'In Zwischenablage kopieren',
      copied: '✓ Kopiert!',
      titleHistory: 'CHAT-VERLAUF',
      historySearch: 'Chat durchsuchen...',
      clearHistory: 'Chat leeren',
      emptyHistory: 'Dieser Chat enthält noch keine Übersetzungen',
      confirmClearHistory: 'Möchtest du alle Einträge dieses Chats löschen?',
      footerPrivacy: 'Laber Enterprise • Lokale Arbeitsbereiche • 100% lokale Übersetzung',
      footerEngine: 'Ollama Engine • translategemma:latest',
      engineError: 'Ollama ist nicht erreichbar oder das ausgewählte Modell fehlt.',
      detected: (language) => `${language} erkannt`,
      workspaces: 'ARBEITSBEREICHE',
      newWorkspace: 'Neuer Arbeitsbereich',
      workspaceSettings: 'Einstellungen',
      newSession: '+ Chat',
      deleteSession: 'Chat löschen',
      confirmDeleteSession: 'Möchtest du diesen Chat mit allen Übersetzungen löschen?',
      chatContextOn: 'Kontext an',
      chatContextOff: 'Kontext aus',
      chatContextTitle: 'Vorherige Chat-Einträge für konsistente Übersetzungen berücksichtigen',
      workspaceModalNew: 'NEUER ARBEITSBEREICH',
      workspaceModalEdit: 'ARBEITSBEREICH BEARBEITEN',
      workspaceName: 'NAME',
      workspaceType: 'TYP',
      workspaceCustomer: 'ZUGEHÖRIGER KUNDE',
      workspaceNoCustomer: 'Ohne Kunde',
      workspaceSource: 'STANDARD-QUELLSPRACHE',
      workspaceTarget: 'STANDARD-ZIELSPRACHE',
      workspaceCategory: 'STANDARD-KONTEXT',
      workspaceTone: 'STANDARD-TONALITÄT',
      workspaceTypes: { customer: 'Kunde', project: 'Projekt', general: 'Allgemein' },
      save: 'Speichern',
      cancel: 'Abbrechen',
      cancelSession: 'Abbrechen',
      deleteSessionTitle: 'Aktuelle Session löschen',
      swapLangsTitle: 'Sprachen tauschen',
      closeAria: 'Schließen',
      deleteWorkspace: 'Arbeitsbereich löschen',
      confirmDeleteWorkspace: 'Möchtest du diesen Arbeitsbereich mit allen Chats und Regeln löschen?',
      sessionModalTitle: 'NEUER CHAT',
      sessionName: 'CHAT-NAME',
      sessionPlaceholder: 'z.B. Angebots-E-Mail',
      create: 'Erstellen',
      defaultSession: 'Neuer Chat',
      migratedSession: 'Bisheriger Verlauf',
      defaultWorkspace: 'Allgemein',
      export: 'Export',
      import: 'Import',
      confirmImport: 'Der Import ersetzt die aktuell gespeicherten Arbeitsbereiche. Fortfahren?',
      importError: 'Die Datei enthält keine gültigen Laber-Daten.',
      importSuccess: 'Daten erfolgreich importiert.',
      exportName: 'laber-daten',
      deleteOnlyWorkspace: 'Der einzige Arbeitsbereich kann nicht gelöscht werden.',
      cmdKTitle: 'Schnellwechsler',
      themeToggleAria: 'Farbmodus umschalten',
      glossaryButtonAria: 'Gedächtnis und Regelliste öffnen',
      workspaceNavAria: 'Arbeitsbereiche und Chats',
      activeWorkspaceAria: 'Aktiver Arbeitsbereich',
      toolbarAria: 'Übersetzungseinstellungen',
      historyAria: 'Chatverlauf',
      cmdKPlaceholder: 'Arbeitsbereich, Chat oder Aktion suchen... (Cmd+K)',
      paletteSectionWorkspaces: 'Arbeitsbereiche',
      paletteSectionSessions: 'Chats',
      paletteSectionActions: 'Aktionen',
      paletteResults: 'Suchergebnisse',
      paletteEntries: (count) => `${count} ${count === 1 ? 'Eintrag' : 'Einträge'}`,
      paletteSubAction: 'Aktion',
      paletteSubDialog: 'Dialog',
      paletteSubSwitch: 'Umschalten',
      paletteSubTheme: 'Darstellung',
      paletteSubData: 'Daten',
      toastSelected: (name) => `${name} ausgewählt`,
      paletteActionNewSession: 'Neuen Chat erstellen',
      paletteActionNewWorkspace: 'Neuen Arbeitsbereich anlegen',
      paletteActionGlossary: 'Firmen-Gedächtnis öffnen',
      paletteActionToggleLang: 'Sprache umschalten (DE / EN)',
      paletteActionToggleTheme: 'Farbmodus wechseln (Hell / Dunkel)',
      paletteActionExport: 'Daten exportieren (JSON)',
      paletteActionClearSession: 'Aktuelle Session leeren',
      paletteNoResults: 'Keine passenden Treffer gefunden',
      quickRefineLabel: 'Schnellaktionen:',
      refineFormal: 'Formeller',
      refineShort: 'Kompakter',
      refineReply: 'Antwort',
      refiningStatus: 'Verfeinere...',
      toastCopied: 'In die Zwischenablage kopiert',
      toastGlossarySaved: 'Regel im Gedächtnis gespeichert',
      toastGlossaryDeleted: 'Regel gelöscht',
      toastWorkspaceRenamed: 'Arbeitsbereich umbenannt',
      toastSessionRenamed: 'Chat umbenannt',
      toastSessionCreated: 'Neuer Chat erstellt',
      toastWorkspaceCreated: 'Neuer Arbeitsbereich erstellt',
      toastTemplateApplied: 'Vorlage geladen',
      toastNoOutputToRefine: 'Bitte erstelle zuerst eine Übersetzung',
      emptyHistoryLead: 'Dieser Chat enthält noch keine Übersetzungen',
      lblStarterTemplates: 'Oder starte direkt mit einer Vorlage:',
      tplEmailTitle: 'Kunden-Mail',
      tplEmailDesc: 'B2B Angebot & Rückfrage (Formell)',
      tplAcademicTitle: 'Technischer Text',
      tplAcademicDesc: 'Spezifikation & Fachbegriffe',
      tplSummaryTitle: 'Zusammenfassung',
      tplSummaryDesc: 'Kompakte Stichpunkte & Notizen',
      lblModeTranslate: 'Übersetzen',
      lblModePolish: 'Text polieren',
      lblPolishStyle: 'POLIER-STIL',
      lblPasteBtn: 'Einfügen',
      lblUploadBtn: 'Datei',
      dropOverlayTitle: 'Datei hier ablegen',
      dropOverlaySub: '.txt, .md, .csv, .json, .srt',
      btnTranslate: 'ÜBERSETZEN',
      btnPolish: 'POLIEREN',
      inputPlaceholderPolish: 'Text eingeben zum Polieren und Verbessern... (CMD + ENTER)',
      toastFileLoaded: 'Datei geladen',
      toastFileTooLarge: 'Die Datei ist größer als 256 KB',
      toastFileUnsupported: 'Dieser Dateityp wird nicht unterstützt',
      toastFileReadError: 'Die Datei konnte nicht gelesen werden',
      toastClipboardEmpty: 'Die Zwischenablage ist leer',
      toastClipboardError: 'Die Zwischenablage konnte nicht gelesen werden',
      toastPasted: 'Aus der Zwischenablage eingefügt',
      toastRequestCancelled: 'Verarbeitung abgebrochen',
      toastResultSavedElsewhere: 'Ergebnis wurde in der ursprünglichen Session gespeichert',
      toastRefineApplied: (action) => `${action} angewendet`,
      statusPolishing: 'Poliere Text...',
      appSettingsTitle: 'ALLGEMEINE EINSTELLUNGEN',
      appSettingsBtnLabel: 'Optionen',
      lblSettingMenuBar: 'Menüleisten-Symbol',
      descSettingMenuBar: 'Symbol in der oberen Mac-Menüleiste (neben der Uhrzeit) anzeigen',
      lblSettingBackground: 'Hintergrundbetrieb',
      descSettingBackground: 'Beim Schließen des Fensters im Hintergrund geöffnet bleiben',
      lblSettingAutoTranslate: 'Sofort übersetzen beim Einfügen',
      descSettingAutoTranslate: 'Startet die Übersetzung direkt nach Klick auf „Einfügen“ oder Datei-Ablegen',
      lblSettingTranslationModel: 'ÜBERSETZUNGSMODELL',
      descSettingTranslationModel: 'Lokales Ollama-Modell für Übersetzungen',
      lblSettingWritingModel: 'SCHREIBMODELL',
      descSettingWritingModel: 'Lokales Ollama-Modell für Polieren und Antwortentwürfe',
      toastSettingsSaved: 'Einstellungen gespeichert',
      modelMissing: (model) => `Ollama-Modell nicht installiert: ${model}`,
      persistenceFallback: 'SQLite ist nicht verfügbar – Laber verwendet den Browser-Speicher als Fallback.',
      polishLanguageMismatch: (language) => `Das Schreibmodell hat nicht auf ${language} geantwortet. Es wurde kein falsches Ergebnis gespeichert.`,
      polishStyles: {
        formal: 'B2B Formell & Höflich',
        concise: 'Kompakt & Prägnant',
        grammar: 'Grammatik & Korrektur',
        natural: 'Flüssig & Natürlich'
      }
    },
    en: {
      glossaryBtnLabel: 'Memory',
      glossaryTitle: 'MEMORY & RULES',
      glossaryDesc: 'These rules apply only to “{workspace}”. Product names, terminology, and customer greetings remain separate from other workspaces.',
      exChip1: '<strong>Example 1:</strong> "DeepL" ➔ "Laber" (Protect brand names)',
      exChip2: '<strong>Example 2:</strong> "Dear Client" ➔ "Hello Customer" (Customer tone)',
      lblGlossarySrc: 'ORIGINAL TERM / PHRASE',
      lblGlossaryTgt: 'ALWAYS TRANSLATE AS',
      glossarySrcPlaceholder: 'e.g. Dear Customer',
      glossaryTgtPlaceholder: 'e.g. Hello Customer',
      addGlossaryBtn: 'Save rule',
      emptyGlossary: 'No rules have been added to this workspace yet',
      lblSourceLang: 'SOURCE LANGUAGE',
      lblTargetLang: 'TARGET LANGUAGE',
      lblCategory: 'TEXT TYPE / CONTEXT',
      lblTone: 'TONALITY',
      sourceAuto: 'Auto detect',
      languageNames: {
        auto: 'Auto detect',
        de: 'German',
        en: 'English',
        fa: 'Farsi (Persian)',
        fr: 'French',
        es: 'Spanish'
      },
      categories: {
        general: 'General',
        email: 'Email & Business Communication',
        email_reply: 'Email Reply Draft',
        academic: 'Academic & Technical',
        product: 'Product & Marketing',
        summary: 'Summary & Action Points'
      },
      tones: {
        natural: 'Natural',
        formal: 'Formal (B2B)',
        informal: 'Informal',
        creative: 'Creative',
        direct: 'Direct & Precise'
      },
      titleInput: 'INPUT',
      charCount: (length) => `${length} characters`,
      inputPlaceholder: 'Enter text... (CMD + ENTER to translate)',
      clearInput: 'Clear text',
      translate: 'TRANSLATE',
      titleOutput: 'TRANSLATION',
      outputPlaceholder: 'Translation appears here...',
      statusReady: 'Ready',
      statusTranslating: 'Translating...',
      statusDone: 'Done',
      statusError: 'Error',
      statusEnterText: 'Enter text',
      loading: 'Processing with translategemma...',
      copy: 'Copy to clipboard',
      copied: '✓ Copied!',
      titleHistory: 'CHAT HISTORY',
      historySearch: 'Search chat...',
      clearHistory: 'Clear chat',
      emptyHistory: 'This chat does not contain any translations yet',
      confirmClearHistory: 'Do you want to delete all entries in this chat?',
      footerPrivacy: 'Laber Enterprise • Local workspaces • 100% local translation',
      footerEngine: 'Ollama Engine • translategemma:latest',
      engineError: 'Ollama is unavailable or the selected model is not installed.',
      detected: (language) => `${language} detected`,
      workspaces: 'WORKSPACES',
      newWorkspace: 'New workspace',
      workspaceSettings: 'Settings',
      newSession: '+ Chat',
      deleteSession: 'Delete chat',
      confirmDeleteSession: 'Do you want to delete this chat and all its translations?',
      chatContextOn: 'Context on',
      chatContextOff: 'Context off',
      chatContextTitle: 'Use previous chat entries for consistent translations',
      workspaceModalNew: 'NEW WORKSPACE',
      workspaceModalEdit: 'EDIT WORKSPACE',
      workspaceName: 'NAME',
      workspaceType: 'TYPE',
      workspaceCustomer: 'CUSTOMER',
      workspaceNoCustomer: 'No customer',
      workspaceSource: 'DEFAULT SOURCE LANGUAGE',
      workspaceTarget: 'DEFAULT TARGET LANGUAGE',
      workspaceCategory: 'DEFAULT CONTEXT',
      workspaceTone: 'DEFAULT TONE',
      workspaceTypes: { customer: 'Customer', project: 'Project', general: 'General' },
      save: 'Save',
      cancel: 'Cancel',
      cancelSession: 'Cancel',
      deleteSessionTitle: 'Delete current session',
      swapLangsTitle: 'Swap languages',
      closeAria: 'Close',
      deleteWorkspace: 'Delete workspace',
      confirmDeleteWorkspace: 'Do you want to delete this workspace, all chats, and all rules?',
      sessionModalTitle: 'NEW CHAT',
      sessionName: 'CHAT NAME',
      sessionPlaceholder: 'e.g. Quote email',
      create: 'Create',
      defaultSession: 'New Chat',
      migratedSession: 'Previous History',
      defaultWorkspace: 'General',
      export: 'Export',
      import: 'Import',
      confirmImport: 'Importing replaces the currently saved workspaces. Continue?',
      importError: 'The file does not contain valid Laber data.',
      importSuccess: 'Data imported successfully.',
      exportName: 'laber-data',
      deleteOnlyWorkspace: 'The only workspace cannot be deleted.',
      cmdKTitle: 'Quick Switcher',
      themeToggleAria: 'Toggle color theme',
      glossaryButtonAria: 'Open memory and rules',
      workspaceNavAria: 'Workspaces and chats',
      activeWorkspaceAria: 'Active workspace',
      toolbarAria: 'Translation settings',
      historyAria: 'Chat history',
      cmdKPlaceholder: 'Search workspaces, chats, or actions... (Cmd+K)',
      paletteSectionWorkspaces: 'Workspaces',
      paletteSectionSessions: 'Chats',
      paletteSectionActions: 'Actions',
      paletteResults: 'Search results',
      paletteEntries: (count) => `${count} ${count === 1 ? 'entry' : 'entries'}`,
      paletteSubAction: 'Action',
      paletteSubDialog: 'Dialog',
      paletteSubSwitch: 'Switch',
      paletteSubTheme: 'Theme',
      paletteSubData: 'Data',
      toastSelected: (name) => `${name} selected`,
      paletteActionNewSession: 'Create new chat',
      paletteActionNewWorkspace: 'Create new workspace',
      paletteActionGlossary: 'Open company memory',
      paletteActionToggleLang: 'Toggle language (DE / EN)',
      paletteActionToggleTheme: 'Toggle theme (Light / Dark)',
      paletteActionExport: 'Export data (JSON)',
      paletteActionClearSession: 'Clear current session',
      paletteNoResults: 'No matching results found',
      quickRefineLabel: 'Quick actions:',
      refineFormal: 'More formal',
      refineShort: 'More concise',
      refineReply: 'Draft reply',
      refiningStatus: 'Refining...',
      toastCopied: 'Copied to clipboard',
      toastGlossarySaved: 'Rule saved to memory',
      toastGlossaryDeleted: 'Rule deleted',
      toastWorkspaceRenamed: 'Workspace renamed',
      toastSessionRenamed: 'Chat renamed',
      toastSessionCreated: 'New chat created',
      toastWorkspaceCreated: 'New workspace created',
      toastTemplateApplied: 'Template loaded',
      toastNoOutputToRefine: 'Please generate a translation first',
      emptyHistoryLead: 'This chat does not contain any translations yet',
      lblStarterTemplates: 'Or start directly with a template:',
      tplEmailTitle: 'Customer Email',
      tplEmailDesc: 'B2B offer & inquiry (Formal)',
      tplAcademicTitle: 'Technical Text',
      tplAcademicDesc: 'Specifications & technical terms',
      tplSummaryTitle: 'Summary',
      tplSummaryDesc: 'Compact bullet points & notes',
      lblModeTranslate: 'Translate',
      lblModePolish: 'Polish text',
      lblPolishStyle: 'POLISH STYLE',
      lblPasteBtn: 'Paste',
      lblUploadBtn: 'File',
      dropOverlayTitle: 'Drop file here',
      dropOverlaySub: '.txt, .md, .csv, .json, .srt',
      btnTranslate: 'TRANSLATE',
      btnPolish: 'POLISH',
      inputPlaceholderPolish: 'Enter text to polish and improve... (CMD + ENTER)',
      toastFileLoaded: 'File loaded',
      toastFileTooLarge: 'The file is larger than 256 KB',
      toastFileUnsupported: 'This file type is not supported',
      toastFileReadError: 'The file could not be read',
      toastClipboardEmpty: 'Clipboard is empty',
      toastClipboardError: 'The clipboard could not be read',
      toastPasted: 'Pasted from clipboard',
      toastRequestCancelled: 'Processing cancelled',
      toastResultSavedElsewhere: 'Result saved to the original session',
      toastRefineApplied: (action) => `${action} applied`,
      statusPolishing: 'Polishing text...',
      appSettingsTitle: 'APP SETTINGS',
      appSettingsBtnLabel: 'Settings',
      lblSettingMenuBar: 'Menu Bar Icon',
      descSettingMenuBar: 'Show icon in the macOS top menu bar (next to the clock)',
      lblSettingBackground: 'Background Mode',
      descSettingBackground: 'Keep app open in the background when closing the window',
      lblSettingAutoTranslate: 'Auto-translate on paste',
      descSettingAutoTranslate: 'Starts translation immediately after clicking Paste or dropping a file',
      lblSettingTranslationModel: 'TRANSLATION MODEL',
      descSettingTranslationModel: 'Local Ollama model used for translations',
      lblSettingWritingModel: 'WRITING MODEL',
      descSettingWritingModel: 'Local Ollama model used for polishing and reply drafts',
      toastSettingsSaved: 'Settings saved',
      modelMissing: (model) => `Ollama model is not installed: ${model}`,
      persistenceFallback: 'SQLite is unavailable – Laber is using browser storage as a fallback.',
      polishLanguageMismatch: (language) => `The writing model did not answer in ${language}. The incorrect result was not saved.`,
      polishStyles: {
        formal: 'B2B Formal & Polite',
        concise: 'Compact & Direct',
        grammar: 'Grammar & Proofread',
        natural: 'Fluent & Natural'
      }
    }
  };

  const DEFAULT_SETTINGS = {
    showMenuBarIcon: true,
    keepInBackground: true,
    autoTranslateOnPaste: false,
    translationModel: 'translategemma:latest',
    writingModel: 'gemma3:4b'
  };

  let appSettings = loadAppSettings();
  let currentMode = 'translate';
  let currentUILang = localStorage.getItem('laber_ui_lang') || 'de';
  let state = loadState();
  let editingWorkspaceId = null;
  let lastDetectedLanguage = null;
  let activeAIRequest = null;
  let languageDetectionSequence = 0;
  let languagePreviewSequence = 0;
  let installedOllamaModels = [];
  let modalReturnFocus = null;
  let draftSaveTimer = null;
  let nativePersistenceAvailable = Boolean(window.webkit?.messageHandlers?.laberNative);
  let nativePersistenceReady = !nativePersistenceAvailable;
  let nativePersistenceDirty = false;
  let nativeSaveTimer = null;
  let nativeRequestSequence = 0;
  const pendingNativePersistenceRequests = new Map();
  const pendingLanguageDetections = new Map();

  initTheme();
  bindEvents();
  applyUILanguage(currentUILang);
  syncNativeSettings();
  updateEngineBadge();
  bindActiveWorkspaceSettings();
  renderAll();
  restoreActiveDraft();
  updateRTL();
  checkAndInitializeEngine();
  initializeNativePersistence();

  function uid(prefix) {
    if (window.crypto && typeof window.crypto.randomUUID === 'function') {
      return `${prefix}_${window.crypto.randomUUID()}`;
    }
    return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
  }

  function showModal(modal, focusTarget = null) {
    modalReturnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    modal.classList.remove('hidden');
    setTimeout(() => {
      const target = focusTarget || modal.querySelector('input, select, button, [tabindex]:not([tabindex="-1"])');
      target?.focus();
    }, 0);
  }

  function hideModal(modal) {
    modal.classList.add('hidden');
    const returnTarget = modalReturnFocus;
    modalReturnFocus = null;
    setTimeout(() => returnTarget?.focus(), 0);
  }

  function getVisibleModal() {
    return Array.from(document.querySelectorAll('.modal-overlay')).find((modal) => !modal.classList.contains('hidden')) || null;
  }

  function closeVisibleModal(modal) {
    if (!modal) return;
    if (modal === glossaryModal) hideModal(glossaryModal);
    else if (modal === workspaceModal) closeWorkspaceModal();
    else if (modal === sessionModal) closeSessionModal();
    else if (modal === $('appSettingsModal')) closeAppSettingsModal();
    else if (modal === $('commandPaletteModal')) closeCommandPalette();
  }

  function trapModalFocus(event, modal) {
    const focusable = Array.from(modal.querySelectorAll(
      'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )).filter((element) => !element.hidden && element.offsetParent !== null);
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  function safeParse(value, fallback) {
    try {
      return value ? JSON.parse(value) : fallback;
    } catch {
      return fallback;
    }
  }

  function createSession(name, entries = []) {
    const now = new Date().toISOString();
    return {
      id: uid('session'),
      name,
      createdAt: now,
      updatedAt: now,
      draft: { input: '', output: '', mode: 'translate' },
      useContext: false,
      entries: entries.map(normalizeEntry)
    };
  }

  function createWorkspace(name, type = 'customer', defaults = {}) {
    return {
      id: uid('workspace'),
      name,
      type,
      parentCustomerId: type === 'project' ? (defaults.parentCustomerId || null) : null,
      defaults: {
        source: defaults.source || 'auto',
        target: defaults.target || 'de',
        category: defaults.category || 'general',
        tone: defaults.tone || 'formal'
      },
      glossary: Array.isArray(defaults.glossary) ? defaults.glossary : [],
      sessions: [createSession(translations[currentUILang]?.defaultSession || 'Neue Session')]
    };
  }

  function normalizeEntry(entry) {
    const sourceCode = entry.sourceCode || legacyLanguageCode(entry.srcLang) || 'auto';
    const targetCode = entry.targetCode || legacyLanguageCode(entry.tgtLang) || 'en';
    return {
      id: entry.id || uid('entry'),
      sourceCode,
      targetCode,
      detectedLanguage: entry.detectedLanguage || (sourceCode !== 'auto' ? sourceCode : null),
      sourceText: String(entry.sourceText ?? entry.srcText ?? ''),
      targetText: String(entry.targetText ?? entry.tgtText ?? ''),
      category: entry.category || 'general',
      tone: entry.tone || 'natural',
      createdAt: entry.createdAt || new Date().toISOString(),
      legacyTimestamp: entry.timestamp || null
    };
  }

  function legacyLanguageCode(label) {
    if (!label) return null;
    const value = String(label).toLowerCase();
    const map = {
      auto: 'auto',
      'auto-erkennung': 'auto',
      deutsch: 'de',
      german: 'de',
      englisch: 'en',
      english: 'en',
      farsi: 'fa',
      'farsi (persisch)': 'fa',
      'farsi (persian)': 'fa',
      französisch: 'fr',
      french: 'fr',
      spanisch: 'es',
      spanish: 'es'
    };
    return map[value] || null;
  }

  function loadState() {
    const stored = safeParse(localStorage.getItem(STATE_KEY) || localStorage.getItem(PREVIOUS_STATE_KEY), null);
    if (stored) {
      try {
        const normalized = normalizeState(stored);
        localStorage.setItem(STATE_KEY, JSON.stringify(normalized));
        return normalized;
      } catch (error) {
        console.warn('Gespeicherte Arbeitsbereiche konnten nicht geladen werden:', error);
      }
    }

    const legacyHistory = safeParse(
      localStorage.getItem('laber_history') || localStorage.getItem('transetzer_history'),
      []
    );
    const legacyGlossary = safeParse(localStorage.getItem('laber_glossary'), []);
    const migratedSession = createSession(
      translations[currentUILang]?.migratedSession || 'Bisheriger Verlauf',
      Array.isArray(legacyHistory) ? legacyHistory : []
    );
    const workspace = createWorkspace(
      translations[currentUILang]?.defaultWorkspace || 'Allgemein',
      'general',
      { source: 'auto', target: 'en', category: 'general', tone: 'natural', glossary: legacyGlossary }
    );
    workspace.sessions = [migratedSession];

    const migratedState = {
      version: STATE_VERSION,
      activeWorkspaceId: workspace.id,
      activeSessionId: migratedSession.id,
      workspaces: [workspace]
    };
    localStorage.setItem(STATE_KEY, JSON.stringify(migratedState));
    return migratedState;
  }

  function normalizeState(candidate) {
    if (!candidate || !Array.isArray(candidate.workspaces) || candidate.workspaces.length === 0) {
      throw new Error('Missing workspaces');
    }

    const workspaces = candidate.workspaces.map((workspace) => {
      if (!workspace || typeof workspace.name !== 'string') {
        throw new Error('Invalid workspace');
      }

      const sessions = Array.isArray(workspace.sessions) && workspace.sessions.length > 0
        ? workspace.sessions.map((session) => ({
            id: session.id || uid('session'),
            name: String(session.name || 'Session'),
            createdAt: session.createdAt || new Date().toISOString(),
            updatedAt: session.updatedAt || new Date().toISOString(),
            draft: {
              input: String(session.draft?.input || ''),
              output: String(session.draft?.output || ''),
              mode: session.draft?.mode === 'polish' ? 'polish' : 'translate'
            },
            useContext: Boolean(session.useContext),
            entries: Array.isArray(session.entries) ? session.entries.map(normalizeEntry) : []
          }))
        : [createSession('Neue Session')];

      return {
        id: workspace.id || uid('workspace'),
        name: workspace.name.trim() || 'Arbeitsbereich',
        type: ['customer', 'project', 'general'].includes(workspace.type) ? workspace.type : 'general',
        parentCustomerId: workspace.type === 'project' && workspace.parentCustomerId
          ? String(workspace.parentCustomerId)
          : null,
        defaults: {
          source: workspace.defaults?.source || 'auto',
          target: workspace.defaults?.target || 'de',
          category: workspace.defaults?.category || 'general',
          tone: workspace.defaults?.tone || 'natural'
        },
        glossary: Array.isArray(workspace.glossary)
          ? workspace.glossary
              .filter((item) => item && item.src != null && item.tgt != null)
              .map((item) => ({ src: String(item.src), tgt: String(item.tgt) }))
          : [],
        sessions
      };
    });

    const customerIds = new Set(workspaces.filter((workspace) => workspace.type === 'customer').map((workspace) => workspace.id));
    workspaces.forEach((workspace) => {
      if (workspace.type !== 'project' || !customerIds.has(workspace.parentCustomerId)) {
        workspace.parentCustomerId = null;
      }
    });

    const activeWorkspace = workspaces.find((workspace) => workspace.id === candidate.activeWorkspaceId) || workspaces[0];
    const activeSession = activeWorkspace.sessions.find((session) => session.id === candidate.activeSessionId) || activeWorkspace.sessions[0];

    return {
      version: STATE_VERSION,
      activeWorkspaceId: activeWorkspace.id,
      activeSessionId: activeSession.id,
      workspaces
    };
  }

  function saveState() {
    state.version = STATE_VERSION;
    if (nativePersistenceAvailable) {
      scheduleNativePersistence();
      return;
    }
    saveLocalStateFallback();
  }

  function saveLocalStateFallback() {
    try {
      localStorage.setItem(STATE_KEY, JSON.stringify(state));
    } catch (error) {
      console.error('Lokaler Speicher konnte nicht aktualisiert werden:', error);
    }
  }

  function postNativePersistence(action, payload = {}) {
    const bridge = window.webkit?.messageHandlers?.laberNative;
    if (!bridge) return Promise.reject(new Error('Native persistence bridge unavailable'));
    const requestId = `persistence_${++nativeRequestSequence}`;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        pendingNativePersistenceRequests.delete(requestId);
        reject(new Error('Native persistence timeout'));
      }, NATIVE_PERSISTENCE_TIMEOUT_MS);
      pendingNativePersistenceRequests.set(requestId, { resolve, timer });
      bridge.postMessage({ action, requestId, ...payload });
    });
  }

  window.__laberNativePersistenceReceive = (payload) => {
    const pending = pendingNativePersistenceRequests.get(payload?.requestId);
    if (!pending) return;
    clearTimeout(pending.timer);
    pendingNativePersistenceRequests.delete(payload.requestId);
    pending.resolve(payload);
  };

  async function initializeNativePersistence() {
    if (!nativePersistenceAvailable) return;
    document.body.classList.add('persistence-loading');
    try {
      const response = await postNativePersistence('loadPersistenceSnapshot');
      if (!response.ok) throw new Error(response.error || 'SQLite load failed');
      if (response.snapshot && typeof response.snapshot === 'object') {
        hydratePersistenceSnapshot(response.snapshot);
      }
      nativePersistenceReady = true;
      document.body.classList.remove('persistence-loading');
      if (!response.snapshot || nativePersistenceDirty) scheduleNativePersistence({ immediate: true });
    } catch (error) {
      activateLocalPersistenceFallback(error);
    }
  }

  function hydratePersistenceSnapshot(snapshot) {
    state = normalizeState(snapshot.state || snapshot);
    if (snapshot.appSettings && typeof snapshot.appSettings === 'object') {
      appSettings = normalizeAppSettings(snapshot.appSettings);
    }
    if (snapshot.uiLanguage === 'de' || snapshot.uiLanguage === 'en') {
      currentUILang = snapshot.uiLanguage;
    }
    if (snapshot.theme === 'dark' || snapshot.theme === 'light') {
      document.documentElement.setAttribute('data-theme', snapshot.theme);
    }
    applyUILanguage(currentUILang);
    syncNativeSettings();
    updateEngineBadge();
    bindActiveWorkspaceSettings();
    historySearch.value = '';
    renderAll();
    restoreActiveDraft();
    checkAndInitializeEngine();
  }

  function scheduleNativePersistence({ immediate = false } = {}) {
    nativePersistenceDirty = true;
    if (!nativePersistenceAvailable || !nativePersistenceReady) return;
    clearTimeout(nativeSaveTimer);
    nativeSaveTimer = setTimeout(flushNativePersistence, immediate ? 0 : 180);
  }

  async function flushNativePersistence() {
    clearTimeout(nativeSaveTimer);
    nativeSaveTimer = null;
    if (!nativePersistenceAvailable || !nativePersistenceReady || !nativePersistenceDirty) return;
    nativePersistenceDirty = false;
    try {
      const response = await postNativePersistence('savePersistenceSnapshot', {
        snapshot: createBackupPayload()
      });
      if (!response.ok) throw new Error(response.error || 'SQLite save failed');
    } catch (error) {
      nativePersistenceDirty = true;
      activateLocalPersistenceFallback(error);
    }
  }

  function activateLocalPersistenceFallback(error) {
    console.error('SQLite-Persistenz nicht verfügbar:', error);
    nativePersistenceAvailable = false;
    nativePersistenceReady = true;
    document.body.classList.remove('persistence-loading');
    saveLocalStateFallback();
    saveLocalPreferencesFallback();
    showToast(translations[currentUILang].persistenceFallback, 'error');
  }

  function saveLocalPreferencesFallback() {
    try {
      localStorage.setItem('laber_app_settings', JSON.stringify(appSettings));
      localStorage.setItem('laber_ui_lang', currentUILang);
      localStorage.setItem('laber_theme', document.documentElement.getAttribute('data-theme') || 'dark');
    } catch (error) {
      console.error('Lokale Einstellungen konnten nicht gespeichert werden:', error);
    }
  }

  function getActiveWorkspace() {
    let workspace = state.workspaces.find((item) => item.id === state.activeWorkspaceId);
    if (!workspace) {
      workspace = state.workspaces[0];
      state.activeWorkspaceId = workspace.id;
    }
    return workspace;
  }

  function getActiveSession() {
    const workspace = getActiveWorkspace();
    let session = workspace.sessions.find((item) => item.id === state.activeSessionId);
    if (!session) {
      session = workspace.sessions[0];
      state.activeSessionId = session.id;
    }
    return session;
  }

  function bindEvents() {
    inputText.addEventListener('input', () => {
      charCount.textContent = translations[currentUILang].charCount(inputText.value.length);
      updateDetectedLanguagePreview();
      scheduleDraftSave();
    });

    inputText.addEventListener('keydown', (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
        event.preventDefault();
        handleTranslation();
      }
    });

    translateBtn.addEventListener('click', handleTranslation);

    [sourceLang, targetLang, categorySelect, toneSelect].forEach((select) => {
      select.addEventListener('change', () => {
        persistActiveDefaults();
        updateDetectedLanguagePreview();
        updateRTL();
      });
    });

    swapLangsBtn.addEventListener('click', () => {
      const effectiveSource = sourceLang.value === 'auto'
        ? (lastDetectedLanguage?.code || 'de')
        : sourceLang.value;
      const oldTarget = targetLang.value;
      sourceLang.value = oldTarget;
      targetLang.value = effectiveSource;

      const previousInput = inputText.value;
      inputText.value = outputText.value;
      outputText.value = previousInput;
      charCount.textContent = translations[currentUILang].charCount(inputText.value.length);

      persistActiveDefaults();
      updateDetectedLanguagePreview();
      updateRTL();
      scheduleDraftSave();
    });

    clearInputBtn.addEventListener('click', clearEditor);
    $('pasteInputBtn').addEventListener('click', handlePasteFromClipboard);
    $('uploadFileBtn').addEventListener('click', () => $('fileUploadInput').click());
    $('fileUploadInput').addEventListener('change', (e) => {
      const file = e.target.files?.[0];
      if (file) loadTextFromFile(file);
      e.target.value = '';
    });

    $('btnModeTranslate').addEventListener('click', () => { setMode('translate'); scheduleDraftSave(); });
    $('btnModePolish').addEventListener('click', () => { setMode('polish'); scheduleDraftSave(); });

    $('appSettingsBtn').addEventListener('click', openAppSettingsModal);
    $('closeAppSettingsBtn').addEventListener('click', closeAppSettingsModal);
    $('saveAppSettingsBtn').addEventListener('click', saveAppSettingsFromModal);
    $('appSettingsModal').addEventListener('click', (e) => {
      if (e.target === $('appSettingsModal')) closeAppSettingsModal();
    });

    setupDragAndDrop();

    copyOutputBtn.addEventListener('click', async () => {
      if (!outputText.value) return;
      try {
        await navigator.clipboard.writeText(outputText.value);
        const original = copyOutputBtn.textContent;
        copyOutputBtn.textContent = translations[currentUILang].copied;
        setTimeout(() => {
          copyOutputBtn.textContent = original;
        }, 1800);
        showToast(translations[currentUILang].toastCopied);
      } catch (error) {
        console.error('Fehler beim Kopieren:', error);
      }
    });

    $('btnRefineFormal').addEventListener('click', () => handleQuickRefine('formal'));
    $('btnRefineShort').addEventListener('click', () => handleQuickRefine('short'));
    $('btnRefineReply').addEventListener('click', () => handleQuickRefine('reply'));

    $('commandPaletteBtn').addEventListener('click', openCommandPalette);
    $('commandPaletteModal').addEventListener('click', (event) => {
      if (event.target === $('commandPaletteModal')) closeCommandPalette();
    });
    $('commandPaletteInput').addEventListener('input', () => renderCommandPaletteList());
    $('commandPaletteInput').addEventListener('keydown', handleCommandPaletteKeydown);

    window.addEventListener('keydown', (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        toggleCommandPalette();
        return;
      }
      const visibleModal = getVisibleModal();
      if (event.key === 'Escape' && visibleModal) {
        event.preventDefault();
        closeVisibleModal(visibleModal);
      } else if (event.key === 'Tab' && visibleModal) {
        trapModalFocus(event, visibleModal);
      }
    });

    $('themeToggle').addEventListener('click', () => {
      const theme = document.documentElement.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
      document.documentElement.setAttribute('data-theme', theme);
      persistPreferences();
    });

    $('langToggle').addEventListener('click', () => {
      currentUILang = currentUILang === 'de' ? 'en' : 'de';
      applyUILanguage(currentUILang);
      renderAll();
      updateDetectedLanguagePreview();
      persistPreferences();
    });

    $('glossaryBtn').addEventListener('click', () => {
      updateGlossaryHeading();
      showModal(glossaryModal, glossarySrc);
    });
    $('closeGlossaryBtn').addEventListener('click', () => hideModal(glossaryModal));
    glossaryModal.addEventListener('click', (event) => {
      if (event.target === glossaryModal) hideModal(glossaryModal);
    });

    $('addGlossaryBtn').addEventListener('click', addGlossaryRule);
    [glossarySrc, glossaryTgt].forEach((input) => {
      input.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
          event.preventDefault();
          addGlossaryRule();
        }
      });
    });

    historySearch.addEventListener('input', () => renderHistory(historySearch.value.trim().toLowerCase()));
    $('clearHistoryBtn').addEventListener('click', () => {
      if (!confirm(translations[currentUILang].confirmClearHistory)) return;
      const session = getActiveSession();
      session.entries = [];
      session.updatedAt = new Date().toISOString();
      saveState();
      renderAll();
      clearEditor();
    });

    $('newWorkspaceBtn').addEventListener('click', () => openWorkspaceModal());
    $('workspaceSettingsBtn').addEventListener('click', () => openWorkspaceModal(getActiveWorkspace().id));
    $('closeWorkspaceModalBtn').addEventListener('click', closeWorkspaceModal);
    $('cancelWorkspaceBtn').addEventListener('click', closeWorkspaceModal);
    workspaceModal.addEventListener('click', (event) => {
      if (event.target === workspaceModal) closeWorkspaceModal();
    });
    workspaceForm.addEventListener('submit', saveWorkspaceFromModal);
    deleteWorkspaceBtn.addEventListener('click', deleteEditingWorkspace);
    workspaceType.addEventListener('change', updateWorkspaceCustomerField);

    $('newSessionBtn').addEventListener('click', openSessionModal);
    $('closeSessionModalBtn').addEventListener('click', closeSessionModal);
    $('cancelSessionBtn').addEventListener('click', closeSessionModal);
    sessionModal.addEventListener('click', (event) => {
      if (event.target === sessionModal) closeSessionModal();
    });
    sessionForm.addEventListener('submit', createSessionFromModal);
    $('deleteSessionBtn').addEventListener('click', deleteActiveSession);
    $('chatContextBtn').addEventListener('click', () => {
      const session = getActiveSession();
      session.useContext = !session.useContext;
      saveState();
      renderActiveContext();
    });

    $('exportDataBtn').addEventListener('click', exportData);
    $('importDataBtn').addEventListener('click', () => $('importDataInput').click());
    $('importDataInput').addEventListener('change', importData);
  }

  function applyUILanguage(lang) {
    const t = translations[lang];
    document.documentElement.setAttribute('data-ui-lang', lang);
    $('langToggleText').textContent = lang.toUpperCase();

    const textBindings = {
      glossaryBtnLabel: 'glossaryBtnLabel',
      lblGlossarySrc: 'lblGlossarySrc',
      lblGlossaryTgt: 'lblGlossaryTgt',
      addGlossaryBtn: 'addGlossaryBtn',
      lblSourceLang: 'lblSourceLang',
      lblTargetLang: 'lblTargetLang',
      lblCategory: 'lblCategory',
      lblTone: 'lblTone',
      titleInput: 'titleInput',
      clearInput: 'clearInputBtn',
      translate: 'btnTranslateLabel',
      titleOutput: 'titleOutput',
      loading: 'loadingLabel',
      copy: 'copyOutputBtn',
      titleHistory: 'titleHistory',
      clearHistory: 'clearHistoryBtn',
      workspaces: 'titleWorkspaces',
      newSession: 'newSessionBtn',
      deleteSession: 'deleteSessionBtn',
      workspaceSettings: 'workspaceSettingsBtn',
      export: 'exportDataBtn',
      import: 'importDataBtn',
      workspaceName: 'lblWorkspaceName',
      workspaceType: 'lblWorkspaceType',
      workspaceCustomer: 'lblWorkspaceCustomer',
      workspaceSource: 'lblWorkspaceSource',
      workspaceTarget: 'lblWorkspaceTarget',
      workspaceCategory: 'lblWorkspaceCategory',
      workspaceTone: 'lblWorkspaceTone',
      cancel: 'cancelWorkspaceBtn',
      cancelSession: 'cancelSessionBtn',
      save: 'saveWorkspaceBtn',
      deleteWorkspace: 'deleteWorkspaceBtn',
      sessionModalTitle: 'sessionModalTitle',
      sessionName: 'lblSessionName',
      create: 'saveSessionBtn',
      quickRefineLabel: 'lblQuickRefine',
      refineFormal: 'lblRefineFormal',
      refineShort: 'lblRefineShort',
      refineReply: 'lblRefineReply',
      emptyHistoryLead: 'emptyHistoryText',
      lblStarterTemplates: 'lblStarterTemplates',
      tplEmailTitle: 'tplEmailTitle',
      tplEmailDesc: 'tplEmailDesc',
      tplAcademicTitle: 'tplAcademicTitle',
      tplAcademicDesc: 'tplAcademicDesc',
      tplSummaryTitle: 'tplSummaryTitle',
      tplSummaryDesc: 'tplSummaryDesc',
      lblModeTranslate: 'lblModeTranslate',
      lblModePolish: 'lblModePolish',
      lblPolishStyle: 'lblPolishStyle',
      lblPasteBtn: 'lblPasteBtn',
      lblUploadBtn: 'lblUploadBtn',
      dropOverlayTitle: 'dropOverlayTitle',
      dropOverlaySub: 'dropOverlaySub',
      appSettingsTitle: 'appSettingsTitle',
      appSettingsBtnLabel: 'appSettingsBtnLabel',
      lblSettingMenuBar: 'lblSettingMenuBar',
      descSettingMenuBar: 'descSettingMenuBar',
      lblSettingBackground: 'lblSettingBackground',
      descSettingBackground: 'descSettingBackground',
      lblSettingAutoTranslate: 'lblSettingAutoTranslate',
      descSettingAutoTranslate: 'descSettingAutoTranslate',
      lblSettingTranslationModel: 'lblSettingTranslationModel',
      descSettingTranslationModel: 'descSettingTranslationModel',
      lblSettingWritingModel: 'lblSettingWritingModel',
      descSettingWritingModel: 'descSettingWritingModel'
    };

    Object.entries(textBindings).forEach(([key, id]) => {
      const element = $(id);
      if (element) element.textContent = t[key];
    });

    $('newWorkspaceBtn').title = t.newWorkspace;
    $('newWorkspaceBtn').setAttribute('aria-label', t.newWorkspace);
    $('deleteSessionBtn').title = t.deleteSessionTitle;
    $('swapLangsBtn').title = t.swapLangsTitle;
    $('swapLangsBtn').setAttribute('aria-label', t.swapLangsTitle);

    ['closeGlossaryBtn', 'closeWorkspaceModalBtn', 'closeSessionModalBtn', 'closeAppSettingsBtn'].forEach(id => {
      const el = $(id);
      if (el) el.setAttribute('aria-label', t.closeAria);
    });

    $('commandPaletteBtn').setAttribute('aria-label', t.cmdKTitle);
    $('appSettingsBtn').setAttribute('aria-label', t.appSettingsBtnLabel);
    $('glossaryBtn').setAttribute('aria-label', t.glossaryButtonAria);
    $('themeToggle').setAttribute('aria-label', t.themeToggleAria);
    document.querySelector('.workspace-sidebar').setAttribute('aria-label', t.workspaceNavAria);
    document.querySelector('.active-context-bar').setAttribute('aria-label', t.activeWorkspaceAria);
    document.querySelector('.toolbar-card').setAttribute('aria-label', t.toolbarAria);
    document.querySelector('.history-card').setAttribute('aria-label', t.historyAria);
    $('commandPaletteModal').setAttribute('aria-label', t.cmdKTitle);
    $('commandPaletteList').setAttribute('aria-label', t.paletteResults);
    $('commandPaletteInput').placeholder = t.cmdKPlaceholder;

    inputText.placeholder = t.inputPlaceholder;
    outputText.placeholder = t.outputPlaceholder;
    historySearch.placeholder = t.historySearch;
    glossarySrc.placeholder = t.glossarySrcPlaceholder;
    glossaryTgt.placeholder = t.glossaryTgtPlaceholder;
    sessionName.placeholder = t.sessionPlaceholder;
    $('footerPrivacy').textContent = t.footerPrivacy;
    $('footerEngine').textContent = `Ollama Engine • ${appSettings.translationModel}`;
    charCount.textContent = t.charCount(inputText.value.length);

    const statusTranslations = {
      Bereit: t.statusReady,
      Ready: t.statusReady,
      Fertig: t.statusDone,
      Done: t.statusDone,
      Fehler: t.statusError,
      Error: t.statusError,
      'Text eingeben': t.statusEnterText,
      'Enter text': t.statusEnterText
    };
    statusIndicator.textContent = statusTranslations[statusIndicator.textContent] || statusIndicator.textContent;

    $('exChip1').innerHTML = t.exChip1;
    $('exChip2').innerHTML = t.exChip2;

    setLanguageSelectLabels(sourceLang, true);
    setLanguageSelectLabels(targetLang, false);
    setLanguageSelectLabels(workspaceSource, true);
    setLanguageSelectLabels(workspaceTarget, false);
    setCategorySelectLabels(categorySelect);
    setCategorySelectLabels(workspaceCategory);
    setToneSelectLabels(toneSelect);
    setToneSelectLabels(workspaceTone);
    setPolishStyleSelectLabels($('polishStyleSelect'));

    Array.from(workspaceType.options).forEach((option) => {
      option.textContent = t.workspaceTypes[option.value] || option.value;
    });
    populateWorkspaceCustomerOptions(workspaceCustomer.value || null);

    setMode(currentMode);
    updateGlossaryHeading();
  }

  function setPolishStyleSelectLabels(select) {
    if (!select) return;
    const styles = translations[currentUILang].polishStyles;
    Array.from(select.options).forEach((option) => {
      option.textContent = styles[option.value] || option.value;
    });
  }

  function setLanguageSelectLabels(select, includesAuto) {
    const names = translations[currentUILang].languageNames;
    Array.from(select.options).forEach((option) => {
      if (option.value === 'auto' && !includesAuto) return;
      option.textContent = names[option.value] || option.value;
    });
  }

  function setCategorySelectLabels(select) {
    const categories = translations[currentUILang].categories;
    Array.from(select.options).forEach((option) => {
      option.textContent = categories[option.value] || option.value;
    });
  }

  function setToneSelectLabels(select) {
    const tones = translations[currentUILang].tones;
    Array.from(select.options).forEach((option) => {
      option.textContent = tones[option.value] || option.value;
    });
  }

  function bindActiveWorkspaceSettings() {
    const defaults = getActiveWorkspace().defaults;
    sourceLang.value = defaults.source;
    targetLang.value = defaults.target;
    categorySelect.value = defaults.category;
    toneSelect.value = defaults.tone;
    updateRTL();
  }

  function persistActiveDefaults() {
    const workspace = getActiveWorkspace();
    workspace.defaults = {
      source: sourceLang.value,
      target: targetLang.value,
      category: categorySelect.value,
      tone: toneSelect.value
    };
    saveState();
  }

  function renderAll() {
    renderNavigation();
    renderActiveContext();
    renderGlossary();
    renderHistory(historySearch.value.trim().toLowerCase());
  }

  function renderNavigation() {
    const container = $('workspaceList');
    const t = translations[currentUILang];
    container.innerHTML = '';

    const nestedProjectIds = new Set();
    const orderedWorkspaces = [];
    state.workspaces.filter((workspace) => workspace.type !== 'project').forEach((workspace) => {
      orderedWorkspaces.push(workspace);
      if (workspace.type === 'customer') {
        state.workspaces
          .filter((project) => project.type === 'project' && project.parentCustomerId === workspace.id)
          .forEach((project) => {
            nestedProjectIds.add(project.id);
            orderedWorkspaces.push(project);
          });
      }
    });
    state.workspaces
      .filter((workspace) => workspace.type === 'project' && !nestedProjectIds.has(workspace.id))
      .forEach((workspace) => orderedWorkspaces.push(workspace));

    orderedWorkspaces.forEach((workspace) => {
      const wrapper = document.createElement('div');
      wrapper.className = `workspace-nav-item${workspace.id === state.activeWorkspaceId ? ' active' : ''}`;
      if (workspace.type === 'project' && workspace.parentCustomerId) wrapper.classList.add('project-child');

      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'workspace-nav-button';

      const icon = document.createElement('span');
      icon.className = 'workspace-nav-icon';
      icon.textContent = workspace.name.slice(0, 2);

      const copy = document.createElement('span');
      copy.className = 'workspace-nav-copy';

      const name = document.createElement('span');
      name.className = 'workspace-nav-name';
      name.textContent = workspace.name;

      const type = document.createElement('span');
      type.className = 'workspace-nav-type';
      const parentCustomer = workspace.parentCustomerId
        ? state.workspaces.find((item) => item.id === workspace.parentCustomerId)
        : null;
      type.textContent = parentCustomer
        ? `${t.workspaceTypes[workspace.type]} · ${parentCustomer.name}`
        : (t.workspaceTypes[workspace.type] || workspace.type);
      name.addEventListener('dblclick', (e) => {
        e.stopPropagation();
        startInlineRename(name, workspace.name, (newName) => {
          if (newName && newName !== workspace.name) {
            workspace.name = newName;
            saveState();
            renderAll();
            showToast(t.toastWorkspaceRenamed);
          }
        });
      });

      copy.append(name, type);
      button.append(icon, copy);
      button.addEventListener('click', () => switchWorkspace(workspace.id));
      wrapper.appendChild(button);

      if (workspace.id === state.activeWorkspaceId) {
        const sessionList = document.createElement('div');
        sessionList.className = 'session-nav-list';

        workspace.sessions.forEach((session) => {
          const sessionButton = document.createElement('button');
          sessionButton.type = 'button';
          sessionButton.className = `session-nav-button${session.id === state.activeSessionId ? ' active' : ''}`;

          const sessionLabel = document.createElement('span');
          sessionLabel.className = 'session-nav-name';
          sessionLabel.textContent = session.name;
          sessionLabel.title = currentUILang === 'de' ? 'Doppelklick zum Umbenennen' : 'Double click to rename';

          sessionLabel.addEventListener('dblclick', (e) => {
            e.stopPropagation();
            startInlineRename(sessionLabel, session.name, (newName) => {
              if (newName && newName !== session.name) {
                session.name = newName;
                session.updatedAt = new Date().toISOString();
                saveState();
                renderAll();
                showToast(t.toastSessionRenamed);
              }
            });
          });

          const count = document.createElement('span');
          count.className = 'session-nav-count';
          count.textContent = String(session.entries.length);

          sessionButton.append(sessionLabel, count);
          sessionButton.addEventListener('click', () => switchSession(session.id));
          sessionList.appendChild(sessionButton);
        });

        wrapper.appendChild(sessionList);
      }

      container.appendChild(wrapper);
    });
  }

  function startInlineRename(element, currentValue, onSave) {
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'inline-edit-input';
    input.value = currentValue;
    element.replaceWith(input);
    input.focus();
    input.select();

    let finished = false;
    const finish = (save) => {
      if (finished) return;
      finished = true;
      const val = input.value.trim();
      input.replaceWith(element);
      if (save && val) onSave(val);
      else renderNavigation();
    };

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        finish(true);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        finish(false);
      }
    });
    input.addEventListener('blur', () => finish(true));
  }

  function renderActiveContext() {
    const workspace = getActiveWorkspace();
    const session = getActiveSession();
    const t = translations[currentUILang];
    const parentCustomer = workspace.parentCustomerId
      ? state.workspaces.find((item) => item.id === workspace.parentCustomerId)
      : null;
    $('activeWorkspaceType').textContent = parentCustomer
      ? `${t.workspaceTypes[workspace.type]} · ${parentCustomer.name}`.toUpperCase()
      : (t.workspaceTypes[workspace.type] || workspace.type).toUpperCase();
    $('activeWorkspaceName').textContent = workspace.name;
    $('activeSessionName').textContent = session.name;
    $('deleteSessionBtn').disabled = workspace.sessions.length === 1 && session.entries.length === 0;
    $('chatContextBtn').textContent = session.useContext ? t.chatContextOn : t.chatContextOff;
    $('chatContextBtn').title = t.chatContextTitle;
    $('chatContextBtn').setAttribute('aria-label', t.chatContextTitle);
    $('chatContextBtn').setAttribute('aria-pressed', session.useContext ? 'true' : 'false');
    updateGlossaryHeading();
  }

  function switchWorkspace(workspaceId) {
    if (workspaceId === state.activeWorkspaceId) return;
    const workspace = state.workspaces.find((item) => item.id === workspaceId);
    if (!workspace) return;
    persistActiveDraft();
    state.activeWorkspaceId = workspace.id;
    state.activeSessionId = workspace.sessions[0].id;
    saveState();
    bindActiveWorkspaceSettings();
    historySearch.value = '';
    restoreActiveDraft();
    renderAll();
    updateDetectedLanguagePreview();
  }

  function switchSession(sessionId) {
    const workspace = getActiveWorkspace();
    if (!workspace.sessions.some((session) => session.id === sessionId)) return;
    if (sessionId === state.activeSessionId) return;
    persistActiveDraft();
    state.activeSessionId = sessionId;
    saveState();
    historySearch.value = '';
    restoreActiveDraft();
    renderAll();
  }

  function openWorkspaceModal(workspaceId = null) {
    editingWorkspaceId = workspaceId;
    const t = translations[currentUILang];
    const workspace = workspaceId
      ? state.workspaces.find((item) => item.id === workspaceId)
      : null;

    $('workspaceModalTitle').textContent = workspace ? t.workspaceModalEdit : t.workspaceModalNew;
    workspaceName.value = workspace?.name || '';
    workspaceType.value = workspace?.type || 'customer';
    populateWorkspaceCustomerOptions(workspace?.parentCustomerId || null);
    updateWorkspaceCustomerField();
    workspaceSource.value = workspace?.defaults.source || 'auto';
    workspaceTarget.value = workspace?.defaults.target || 'de';
    workspaceCategory.value = workspace?.defaults.category || 'general';
    workspaceTone.value = workspace?.defaults.tone || 'formal';
    deleteWorkspaceBtn.classList.toggle('hidden', !workspace);
    deleteWorkspaceBtn.disabled = state.workspaces.length === 1;

    showModal(workspaceModal, workspaceName);
  }

  function populateWorkspaceCustomerOptions(selectedId = null) {
    const t = translations[currentUILang];
    workspaceCustomer.textContent = '';
    const empty = document.createElement('option');
    empty.value = '';
    empty.textContent = t.workspaceNoCustomer;
    workspaceCustomer.appendChild(empty);
    state.workspaces
      .filter((workspace) => workspace.type === 'customer' && workspace.id !== editingWorkspaceId)
      .forEach((workspace) => {
        const option = document.createElement('option');
        option.value = workspace.id;
        option.textContent = workspace.name;
        workspaceCustomer.appendChild(option);
      });
    workspaceCustomer.value = selectedId || '';
  }

  function updateWorkspaceCustomerField() {
    $('fieldWorkspaceCustomer').classList.toggle('hidden', workspaceType.value !== 'project');
  }

  function closeWorkspaceModal() {
    hideModal(workspaceModal);
    workspaceForm.reset();
    editingWorkspaceId = null;
  }

  function saveWorkspaceFromModal(event) {
    event.preventDefault();
    const name = workspaceName.value.trim();
    if (!name) return;

    if (editingWorkspaceId) {
      const workspace = state.workspaces.find((item) => item.id === editingWorkspaceId);
      if (!workspace) return;
      workspace.name = name;
      workspace.type = workspaceType.value;
      workspace.parentCustomerId = workspaceType.value === 'project' ? (workspaceCustomer.value || null) : null;
      workspace.defaults = {
        source: workspaceSource.value,
        target: workspaceTarget.value,
        category: workspaceCategory.value,
        tone: workspaceTone.value
      };
      if (workspace.id === state.activeWorkspaceId) bindActiveWorkspaceSettings();
    } else {
      persistActiveDraft();
      const workspace = createWorkspace(name, workspaceType.value, {
        source: workspaceSource.value,
        target: workspaceTarget.value,
        category: workspaceCategory.value,
        tone: workspaceTone.value,
        parentCustomerId: workspaceCustomer.value || null
      });
      state.workspaces.push(workspace);
      state.activeWorkspaceId = workspace.id;
      state.activeSessionId = workspace.sessions[0].id;
      bindActiveWorkspaceSettings();
      clearEditor();
    }

    saveState();
    closeWorkspaceModal();
    renderAll();
    updateDetectedLanguagePreview();
  }

  function deleteEditingWorkspace() {
    const t = translations[currentUILang];
    if (state.workspaces.length === 1) {
      alert(t.deleteOnlyWorkspace);
      return;
    }
    if (!confirm(t.confirmDeleteWorkspace)) return;

    state.workspaces = state.workspaces.filter((workspace) => workspace.id !== editingWorkspaceId);
    state.workspaces.forEach((workspace) => {
      if (workspace.parentCustomerId === editingWorkspaceId) workspace.parentCustomerId = null;
    });
    const nextWorkspace = state.workspaces[0];
    state.activeWorkspaceId = nextWorkspace.id;
    state.activeSessionId = nextWorkspace.sessions[0].id;
    saveState();
    closeWorkspaceModal();
    bindActiveWorkspaceSettings();
    restoreActiveDraft();
    renderAll();
    updateDetectedLanguagePreview();
  }

  function openSessionModal() {
    sessionName.value = '';
    showModal(sessionModal, sessionName);
  }

  function closeSessionModal() {
    hideModal(sessionModal);
    sessionForm.reset();
  }

  function createSessionFromModal(event) {
    event.preventDefault();
    const name = sessionName.value.trim();
    if (!name) return;
    const workspace = getActiveWorkspace();
    persistActiveDraft();
    const session = createSession(name);
    workspace.sessions.unshift(session);
    state.activeSessionId = session.id;
    saveState();
    closeSessionModal();
    historySearch.value = '';
    clearEditor();
    renderAll();
  }

  function deleteActiveSession() {
    const t = translations[currentUILang];
    const workspace = getActiveWorkspace();
    const session = getActiveSession();
    if (!confirm(t.confirmDeleteSession)) return;

    workspace.sessions = workspace.sessions.filter((item) => item.id !== session.id);
    if (workspace.sessions.length === 0) {
      workspace.sessions = [createSession(t.defaultSession)];
    }
    state.activeSessionId = workspace.sessions[0].id;
    saveState();
    historySearch.value = '';
    restoreActiveDraft();
    renderAll();
  }

  function updateGlossaryHeading() {
    const t = translations[currentUILang];
    const workspace = getActiveWorkspace();
    const titleSpan = glossaryTitle.querySelector('span');
    if (titleSpan) titleSpan.textContent = t.glossaryTitle;
    glossaryDesc.textContent = t.glossaryDesc.replace('{workspace}', workspace.name);
  }

  function addGlossaryRule() {
    const t = translations[currentUILang];
    const src = glossarySrc.value.trim();
    const tgt = glossaryTgt.value.trim();
    if (!src || !tgt) return;
    getActiveWorkspace().glossary.push({ src, tgt });
    glossarySrc.value = '';
    glossaryTgt.value = '';
    saveState();
    renderGlossary();
    showToast(t.toastGlossarySaved);
    glossarySrc.focus();
  }

  function renderGlossary() {
    const t = translations[currentUILang];
    const glossary = getActiveWorkspace().glossary;
    glossaryList.innerHTML = '';

    if (glossary.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'empty-history';
      empty.textContent = t.emptyGlossary;
      glossaryList.appendChild(empty);
      return;
    }

    glossary.forEach((item, index) => {
      const row = document.createElement('div');
      row.className = 'glossary-item';

      const pair = document.createElement('div');
      pair.className = 'glossary-pair';

      const src = document.createElement('span');
      src.textContent = item.src;
      const arrow = document.createElement('span');
      arrow.className = 'glossary-arrow';
      arrow.textContent = '➔';
      const tgt = document.createElement('span');
      tgt.textContent = item.tgt;
      pair.append(src, arrow, tgt);

      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'btn-icon-danger';
      remove.title = currentUILang === 'de' ? 'Löschen' : 'Delete';
      remove.textContent = '×';
      remove.addEventListener('click', () => {
        getActiveWorkspace().glossary.splice(index, 1);
        saveState();
        renderGlossary();
        showToast(t.toastGlossaryDeleted);
      });

      row.append(pair, remove);
      glossaryList.appendChild(row);
    });
  }

  function renderHistory(filter = '') {
    const t = translations[currentUILang];
    const entries = getActiveSession().entries;
    historyCountBadge.textContent = String(entries.length);
    historyList.innerHTML = '';

    const filtered = entries.filter((entry) => {
      if (!filter) return true;
      return entry.sourceText.toLowerCase().includes(filter) || entry.targetText.toLowerCase().includes(filter);
    });

    if (filtered.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'empty-history';

      const lead = document.createElement('p');
      lead.className = 'empty-history-lead';
      lead.textContent = t.emptyHistoryLead;
      empty.appendChild(lead);

      const templatesGroup = document.createElement('div');
      templatesGroup.className = 'starter-templates-group';

      const heading = document.createElement('span');
      heading.className = 'starter-templates-heading';
      heading.textContent = t.lblStarterTemplates;
      templatesGroup.appendChild(heading);

      const grid = document.createElement('div');
      grid.className = 'starter-templates-grid';

      const tpls = [
        { type: 'email', icon: '✉️', title: t.tplEmailTitle, desc: t.tplEmailDesc },
        { type: 'academic', icon: '🔬', title: t.tplAcademicTitle, desc: t.tplAcademicDesc },
        { type: 'summary', icon: '📋', title: t.tplSummaryTitle, desc: t.tplSummaryDesc }
      ];

      tpls.forEach((tpl) => {
        const card = document.createElement('button');
        card.type = 'button';
        card.className = 'starter-template-card';
        card.innerHTML = `
          <div class="starter-card-icon">${tpl.icon}</div>
          <div class="starter-card-text">
            <strong>${tpl.title}</strong>
            <span>${tpl.desc}</span>
          </div>
        `;
        card.addEventListener('click', () => applyStarterTemplate(tpl.type));
        grid.appendChild(card);
      });

      templatesGroup.appendChild(grid);
      empty.appendChild(templatesGroup);
      historyList.appendChild(empty);
      return;
    }

    filtered.forEach((entry) => {
      const row = document.createElement('div');
      row.className = 'history-item';

      const meta = document.createElement('div');
      meta.className = 'history-item-meta';

      const languageMeta = document.createElement('span');
      const displayedSource = entry.detectedLanguage || entry.sourceCode;
      languageMeta.textContent = `${languageName(displayedSource)} ➔ ${languageName(entry.targetCode)}`;

      const rightMeta = document.createElement('div');
      rightMeta.className = 'history-meta-actions';
      const time = document.createElement('span');
      time.textContent = formatEntryTime(entry);
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'btn-icon-danger delete-history-btn';
      remove.title = currentUILang === 'de' ? 'Löschen' : 'Delete';
      remove.textContent = '×';
      remove.addEventListener('click', (event) => {
        event.stopPropagation();
        const session = getActiveSession();
        session.entries = session.entries.filter((item) => item.id !== entry.id);
        session.updatedAt = new Date().toISOString();
        saveState();
        renderAll();
      });
      rightMeta.append(time, remove);
      meta.append(languageMeta, rightMeta);

      const content = document.createElement('div');
      content.className = 'history-item-content';
      const source = document.createElement('div');
      source.className = 'history-src-text';
      source.textContent = entry.sourceText;
      const target = document.createElement('div');
      target.className = 'history-tgt-text';
      target.textContent = entry.targetText;
      content.append(source, target);

      row.append(meta, content);
      row.addEventListener('click', () => {
        inputText.value = entry.sourceText;
        outputText.value = entry.targetText;
        charCount.textContent = t.charCount(entry.sourceText.length);
        lastDetectedLanguage = entry.detectedLanguage
          ? { code: entry.detectedLanguage, confidence: 1 }
          : null;
        updateDetectedLanguagePreview();
        window.scrollTo({ top: 0, behavior: 'smooth' });
        scheduleDraftSave();
      });

      historyList.appendChild(row);
    });
  }

  function formatEntryTime(entry) {
    if (entry.legacyTimestamp) return entry.legacyTimestamp;
    const date = new Date(entry.createdAt);
    if (Number.isNaN(date.getTime())) return '';
    return new Intl.DateTimeFormat(currentUILang === 'de' ? 'de-DE' : 'en-US', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  }

  function languageName(code) {
    const knownName = translations[currentUILang].languageNames[code];
    if (knownName) return knownName;
    try {
      const displayNames = new Intl.DisplayNames([currentUILang], { type: 'language' });
      return displayNames.of(code) || String(code || '').toUpperCase();
    } catch {
      return String(code || '').toUpperCase();
    }
  }

  function detectTextLanguage(text) {
    const raw = String(text || '').trim();
    if (raw.length < 2) return null;

    if (/[\u0600-\u06FF]/u.test(raw)) {
      return /[پچژگک‌ی]/u.test(raw) ? { code: 'fa', confidence: 0.95 } : null;
    }

    const normalized = raw
      .toLowerCase()
      .replace(/[’']/g, ' ')
      .replace(/[^\p{L}\p{M}]+/gu, ' ')
      .trim();
    const tokens = normalized.split(/\s+/u).filter(Boolean);
    if (tokens.length === 0) return null;

    const markers = {
      de: new Set([
        'aber', 'alle', 'auch', 'auf', 'bitte', 'das', 'dass', 'dein', 'der', 'die', 'ein', 'eine',
        'für', 'guten', 'hallo', 'haben', 'ich', 'ist', 'kann', 'können', 'mit', 'morgen', 'nicht',
        'oder', 'schicken', 'sehr', 'sie', 'sind', 'und', 'uns', 'von', 'wir', 'wie', 'zu'
      ]),
      en: new Set([
        'a', 'also', 'and', 'are', 'can', 'could', 'dear', 'for', 'from', 'good', 'have', 'hello',
        'how', 'i', 'is', 'it', 'morning', 'not', 'of', 'offer', 'or', 'please', 'send', 'the',
        'this', 'to', 'updated', 'us', 'we', 'with', 'you', 'your'
      ]),
      fr: new Set([
        'avec', 'bonjour', 'ce', 'cette', 'de', 'des', 'est', 'et', 'je', 'la', 'le', 'les', 'merci',
        'nous', 'offre', 'ou', 'pas', 'pouvez', 'pour', 'que', 'une', 'vous', 'votre'
      ]),
      es: new Set([
        'actualizada', 'buenos', 'con', 'de', 'el', 'enviar', 'es', 'esta', 'gracias', 'hola', 'la',
        'los', 'nos', 'oferta', 'para', 'pero', 'por', 'puedes', 'que', 'una', 'usted', 'ustedes', 'y'
      ])
    };

    const scores = { de: 0, en: 0, fr: 0, es: 0 };
    tokens.forEach((token) => {
      Object.entries(markers).forEach(([code, words]) => {
        if (words.has(token)) scores[code] += token.length <= 2 ? 1 : 2;
      });
    });

    if (/[äöüß]/u.test(normalized)) scores.de += 5;
    if (/[ñ¿¡]/u.test(normalized)) scores.es += 5;
    if (/[œç]/u.test(normalized)) scores.fr += 5;
    if (/\b(qu|aux|est-ce|s'il)\b/u.test(normalized)) scores.fr += 2;
    if (/\b(que|por|usted|buenos)\b/u.test(normalized)) scores.es += 2;
    if (/\b(the|please|hello|your)\b/u.test(normalized)) scores.en += 2;
    if (/\b(der|die|das|nicht|bitte)\b/u.test(normalized)) scores.de += 2;

    const ranked = Object.entries(scores).sort((a, b) => b[1] - a[1]);
    const [bestCode, bestScore] = ranked[0];
    const secondScore = ranked[1][1];
    if (bestScore < 2 || (bestScore === secondScore && bestScore < 5)) return null;

    const confidence = Math.min(0.99, 0.55 + (bestScore - secondScore) * 0.08 + Math.min(tokens.length, 8) * 0.02);
    return { code: bestCode, confidence };
  }

  function detectTextLanguageAsync(text) {
    const fallback = detectTextLanguage(text);
    const bridge = window.webkit?.messageHandlers?.laberNative;
    if (!bridge) return Promise.resolve(fallback);

    const requestId = `language_${++languageDetectionSequence}`;
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        pendingLanguageDetections.delete(requestId);
        resolve(fallback);
      }, 800);
      pendingLanguageDetections.set(requestId, { resolve, timer, fallback });
      bridge.postMessage({ action: 'detectLanguage', requestId, text: String(text || '').slice(0, 12000) });
    });
  }

  window.__laberReceiveLanguageDetection = (payload) => {
    const pending = pendingLanguageDetections.get(payload?.requestId);
    if (!pending) return;
    clearTimeout(pending.timer);
    pendingLanguageDetections.delete(payload.requestId);
    const confidence = Number(payload.confidence || 0);
    const result = payload.code && confidence >= 0.35
      ? { code: String(payload.code), confidence }
      : pending.fallback;
    pending.resolve(result);
  };

  async function updateDetectedLanguagePreview() {
    const previewSequence = ++languagePreviewSequence;
    if (sourceLang.value !== 'auto' || !inputText.value.trim()) {
      lastDetectedLanguage = null;
      detectedLanguageBadge.classList.add('hidden');
      updateRTL();
      return;
    }

    const currentText = inputText.value;
    const detected = await detectTextLanguageAsync(currentText);
    if (previewSequence !== languagePreviewSequence || inputText.value !== currentText || sourceLang.value !== 'auto') return;
    lastDetectedLanguage = detected;
    if (!lastDetectedLanguage) {
      detectedLanguageBadge.classList.add('hidden');
      updateRTL();
      return;
    }

    detectedLanguageBadge.textContent = translations[currentUILang].detected(
      languageName(lastDetectedLanguage.code)
    );
    detectedLanguageBadge.classList.remove('hidden');
    updateRTL();
  }

  async function handleTranslation() {
    const t = translations[currentUILang];
    const text = inputText.value.trim();
    if (!text) {
      statusIndicator.textContent = t.statusEnterText;
      return;
    }

    const requestContext = {
      workspaceId: state.activeWorkspaceId,
      sessionId: state.activeSessionId,
      mode: currentMode
    };
    const selectedSource = sourceLang.value;
    const target = targetLang.value;
    const category = categorySelect.value;
    const tone = toneSelect.value;
    const polishStyle = $('polishStyleSelect')?.value || 'formal';
    const conversationContext = buildConversationContext(getActiveSession());
    const detection = selectedSource === 'auto' ? await detectTextLanguageAsync(text) : null;
    const effectiveSource = selectedSource === 'auto' ? (detection?.code || 'auto') : selectedSource;

    if (detection) {
      lastDetectedLanguage = detection;
      detectedLanguageBadge.textContent = t.detected(languageName(detection.code));
      detectedLanguageBadge.classList.remove('hidden');
    }

    const activeModel = requestContext.mode === 'polish'
        ? appSettings.writingModel
        : appSettings.translationModel;
    if (!isModelAvailable(activeModel)) {
      statusIndicator.textContent = t.statusError;
      showToast(t.modelMissing(activeModel), 'error');
      return;
    }
    const request = beginAIRequest();
    statusIndicator.textContent = requestContext.mode === 'polish' ? t.statusPolishing : t.statusTranslating;

    try {
      const promptArguments = [
        text,
        effectiveSource,
        target,
        category,
        tone,
        requestContext.mode,
        polishStyle,
        conversationContext
      ];
      let translation = await generateOllamaText(
        activeModel,
        buildPrompt(...promptArguments),
        0.1,
        request.controller.signal
      );

      if (requestContext.mode === 'polish' && effectiveSource !== 'auto') {
        let outputLanguage = await detectTextLanguageAsync(translation);
        if (isConfidentLanguageMismatch(outputLanguage, effectiveSource)) {
          translation = await generateOllamaText(
            activeModel,
            buildPrompt(...promptArguments, true),
            0.05,
            request.controller.signal
          );
          outputLanguage = await detectTextLanguageAsync(translation);
          if (isConfidentLanguageMismatch(outputLanguage, effectiveSource)) {
            const mismatchError = new Error(`Unexpected output language: ${outputLanguage.code}`);
            mismatchError.code = 'OUTPUT_LANGUAGE_MISMATCH';
            throw mismatchError;
          }
        }
      }

      const polishStyleName = t.polishStyles[polishStyle] || polishStyle;

      addEntryToSession(requestContext.workspaceId, requestContext.sessionId, {
        id: uid('entry'),
        sourceCode: selectedSource,
        targetCode: requestContext.mode === 'polish' ? effectiveSource : target,
        detectedLanguage: detection?.code || (selectedSource !== 'auto' ? selectedSource : null),
        sourceText: requestContext.mode === 'polish' ? `[${t.lblModePolish}: ${polishStyleName}] ${text}` : text,
        targetText: translation,
        category: requestContext.mode === 'polish' ? 'polish' : category,
        tone: requestContext.mode === 'polish' ? polishStyle : tone,
        createdAt: new Date().toISOString(),
        legacyTimestamp: null
      });

      if (isRequestContextActive(requestContext)) {
        outputText.value = translation;
        statusIndicator.textContent = t.statusDone;
        updateRTL();
        scheduleDraftSave();
      } else {
        showToast(t.toastResultSavedElsewhere, 'info');
      }
    } catch (error) {
      if (error.name === 'AbortError') return;
      console.error('Übersetzungsfehler:', error);
      if (isRequestContextActive(requestContext)) {
        statusIndicator.textContent = t.statusError;
      }
      const message = error.code === 'OUTPUT_LANGUAGE_MISMATCH'
        ? t.polishLanguageMismatch(languageName(effectiveSource))
        : t.engineError;
      showToast(message, 'error');
    } finally {
      finishAIRequest(request);
    }
  }

  async function generateOllamaText(model, prompt, temperature, signal) {
    const response = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        prompt,
        stream: false,
        options: { temperature }
      }),
      signal
    });

    if (!response.ok) throw new Error(`Ollama Status: ${response.status}`);
    const data = await response.json();
    const result = data.response ? data.response.trim() : '';
    if (!result) throw new Error('Leere Modellantwort');
    return result;
  }

  function isConfidentLanguageMismatch(detection, expectedLanguage) {
    return Boolean(
      detection?.code
      && detection.code !== expectedLanguage
      && Number(detection.confidence || 0) >= 0.45
    );
  }

  function buildPrompt(text, sourceCode, targetCode, category, tone, mode = currentMode, selectedPolishStyle = null, conversationContext = '', strictLanguage = false) {
    if (mode === 'polish') {
      const polishStyle = selectedPolishStyle || $('polishStyleSelect')?.value || 'formal';
      const sourceName = sourceCode === 'auto' ? null : englishLanguageName(sourceCode);
      const polishInstructions = {
        formal: 'Rewrite and improve the following text in an impeccable, polite, and formal B2B business tone in the same language. Correct any grammatical or spelling errors.',
        concise: 'Condense and tighten the following text into clear, direct, and concise wording in the same language without unnecessary fluff. Correct any grammatical or spelling errors.',
        grammar: 'Carefully proofread and correct all spelling, grammar, and punctuation mistakes in the following text in the same language while preserving the exact meaning and original tone.',
        natural: 'Improve the phrasing, flow, and natural readability of the following text in the same language while maintaining its exact meaning.'
      };
      const languageRequirement = sourceName
        ? `The required output language is ${sourceName} (${sourceCode}). Do not translate the text into another language.`
        : 'Identify the language of the input and preserve that exact language in the result.';
      const retryRequirement = strictLanguage && sourceName
        ? `CRITICAL: A previous response used the wrong language. Return the result strictly in ${sourceName} (${sourceCode}) only.`
        : '';
      return `You are a professional editor and writing assistant.
${polishInstructions[polishStyle] || polishInstructions.formal}
${languageRequirement}
${retryRequirement}
Produce ONLY the final improved text in the required language, without explanations, markdown backticks, or commentary.

Text to polish:
${text}`;
    }

    const contextInstructions = {
      general: 'Translate accurately and preserve the meaning and structure of the original.',
      email: 'Preserve email structure, greeting, closing, names, dates, and business terminology.',
      email_reply: 'Create a professional reply in the target language based on the incoming email.',
      academic: 'Use precise technical terminology and an objective academic style.',
      product: 'Use clear, appealing, audience-appropriate product and marketing language.',
      summary: 'Translate the content, then present its key points and action items as concise bullet points.'
    };
    const toneInstructions = {
      natural: 'Use natural, fluent language.',
      formal: 'Use a formal and professional B2B tone.',
      informal: 'Use a friendly and informal tone.',
      creative: 'Translate idiomatically with vivid, engaging wording while preserving the meaning.',
      direct: 'Use direct, concise, and precise wording without embellishment.'
    };

    const targetName = englishLanguageName(targetCode);
    const sourceName = englishLanguageName(sourceCode);
    const sourceInstruction = sourceCode === 'auto'
      ? `Detect the source language and translate it into ${targetName} (${targetCode}).`
      : `You are a professional ${sourceName} (${sourceCode}) to ${targetName} (${targetCode}) translator.`;

    const glossary = getActiveWorkspace().glossary;
    const glossaryInstructions = glossary.length > 0
      ? `\nMandatory terminology for this workspace:\n${glossary.map((item) => `- "${item.src}" -> "${item.tgt}"`).join('\n')}`
      : '';

    const contextBlock = conversationContext
      ? `\nPrevious chat translations for terminology and continuity only:\n${conversationContext}\nDo not translate the previous turns again.\n`
      : '';

    return `${sourceInstruction}
Your goal is to accurately convey the meaning and nuances of the original text while adhering to ${targetName} grammar, vocabulary, and cultural sensitivities.
Context: ${contextInstructions[category] || contextInstructions.general}
Style: ${toneInstructions[tone] || toneInstructions.natural}${glossaryInstructions}${contextBlock}
Produce only the final ${targetName} result, without explanations or commentary.
Please translate the following text into ${targetName}:


${text}`;
  }

  function englishLanguageName(code) {
    const knownNames = {
      auto: 'automatically detected language',
      de: 'German',
      en: 'English',
      fa: 'Persian',
      fr: 'French',
      es: 'Spanish'
    };
    if (knownNames[code]) return knownNames[code];
    try {
      return new Intl.DisplayNames(['en'], { type: 'language' }).of(code) || code;
    } catch {
      return code;
    }
  }

  function buildConversationContext(session) {
    if (!session?.useContext || session.entries.length === 0) return '';
    return session.entries
      .slice(0, 3)
      .reverse()
      .map((entry, index) => {
        const source = entry.sourceText.slice(0, 1200);
        const target = entry.targetText.slice(0, 1200);
        return `Turn ${index + 1}:\nSource: ${source}\nResult: ${target}`;
      })
      .join('\n\n');
  }

  function addEntryToSession(workspaceId, sessionId, entry) {
    const workspace = state.workspaces.find((item) => item.id === workspaceId);
    const session = workspace?.sessions.find((item) => item.id === sessionId);
    if (!session) return false;
    session.entries.unshift(entry);
    session.updatedAt = new Date().toISOString();
    saveState();
    renderAll();
    return true;
  }

  function addEntryToActiveSession(entry) {
    return addEntryToSession(state.activeWorkspaceId, state.activeSessionId, entry);
  }

  function isRequestContextActive(context) {
    return state.activeWorkspaceId === context.workspaceId
      && state.activeSessionId === context.sessionId
      && currentMode === context.mode;
  }

  function beginAIRequest() {
    if (activeAIRequest) activeAIRequest.controller.abort();
    const request = { controller: new AbortController() };
    activeAIRequest = request;
    setLoading(true);
    return request;
  }

  function finishAIRequest(request) {
    if (activeAIRequest !== request) return;
    activeAIRequest = null;
    setLoading(false);
  }

  function cancelActiveAIRequest() {
    if (!activeAIRequest) return;
    activeAIRequest.controller.abort();
    activeAIRequest = null;
    setLoading(false);
  }

  function scheduleDraftSave() {
    clearTimeout(draftSaveTimer);
    draftSaveTimer = setTimeout(() => persistActiveDraft(), 300);
  }

  function persistActiveDraft() {
    clearTimeout(draftSaveTimer);
    draftSaveTimer = null;
    const session = getActiveSession();
    session.draft = {
      input: inputText.value,
      output: outputText.value,
      mode: currentMode
    };
    saveState();
  }

  function restoreActiveDraft() {
    clearTimeout(draftSaveTimer);
    draftSaveTimer = null;
    const draft = getActiveSession().draft || { input: '', output: '', mode: 'translate' };
    setMode(draft.mode === 'polish' ? 'polish' : 'translate');
    inputText.value = draft.input || '';
    outputText.value = draft.output || '';
    charCount.textContent = translations[currentUILang].charCount(inputText.value.length);
    statusIndicator.textContent = outputText.value
      ? translations[currentUILang].statusDone
      : translations[currentUILang].statusReady;
    lastDetectedLanguage = null;
    updateDetectedLanguagePreview();
    updateRTL();
  }

  function clearEditor() {
    cancelActiveAIRequest();
    inputText.value = '';
    outputText.value = '';
    charCount.textContent = translations[currentUILang].charCount(0);
    statusIndicator.textContent = translations[currentUILang].statusReady;
    lastDetectedLanguage = null;
    detectedLanguageBadge.classList.add('hidden');
    updateRTL();
    persistActiveDraft();
  }

  function setMode(mode) {
    if (currentMode !== mode) cancelActiveAIRequest();
    currentMode = mode;
    const t = translations[currentUILang];
    const isPolish = mode === 'polish';

    $('btnModeTranslate').classList.toggle('active', !isPolish);
    $('btnModeTranslate').setAttribute('aria-selected', !isPolish ? 'true' : 'false');
    $('btnModePolish').classList.toggle('active', isPolish);
    $('btnModePolish').setAttribute('aria-selected', isPolish ? 'true' : 'false');

    $('fieldTargetLang').classList.toggle('hidden', isPolish);
    $('fieldCategory').classList.toggle('hidden', isPolish);
    $('fieldTone').classList.toggle('hidden', isPolish);
    $('swapLangsBtn').classList.toggle('hidden', isPolish);
    $('fieldPolishStyle').classList.toggle('hidden', !isPolish);

    $('btnTranslateLabel').textContent = isPolish ? t.btnPolish : t.btnTranslate;
    inputText.placeholder = isPolish ? t.inputPlaceholderPolish : t.inputPlaceholder;
  }

  function setupDragAndDrop() {
    const dropOverlay = $('dropOverlay');
    let dragCounter = 0;

    window.addEventListener('dragenter', (e) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounter++;
      dropOverlay.classList.remove('hidden');
    });

    window.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.stopPropagation();
    });

    window.addEventListener('dragleave', (e) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounter--;
      if (dragCounter <= 0) {
        dragCounter = 0;
        dropOverlay.classList.add('hidden');
      }
    });

    window.addEventListener('drop', (e) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounter = 0;
      dropOverlay.classList.add('hidden');
      const files = e.dataTransfer?.files;
      if (files && files.length > 0) {
        loadTextFromFile(files[0]);
      }
    });
  }

  function loadTextFromFile(file) {
    if (!file) return;
    const t = translations[currentUILang];
    const extension = file.name.includes('.') ? file.name.split('.').pop().toLowerCase() : '';
    if (!SUPPORTED_TEXT_EXTENSIONS.has(extension)) {
      showToast(t.toastFileUnsupported, 'error');
      return;
    }
    if (file.size > MAX_TEXT_FILE_BYTES) {
      showToast(t.toastFileTooLarge, 'error');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = String(e.target.result || '');
      inputText.value = text;
      charCount.textContent = translations[currentUILang].charCount(text.length);
      updateDetectedLanguagePreview();
      updateRTL();
      scheduleDraftSave();
      showToast(`${translations[currentUILang].toastFileLoaded}: ${file.name}`);
      if (appSettings.autoTranslateOnPaste && text.trim()) {
        handleTranslation();
      }
    };
    reader.onerror = () => showToast(t.toastFileReadError, 'error');
    reader.readAsText(file);
  }

  async function handlePasteFromClipboard() {
    try {
      const text = await navigator.clipboard.readText();
      if (!text || !text.trim()) {
        showToast(translations[currentUILang].toastClipboardEmpty, 'info');
        return;
      }
      inputText.value = text;
      charCount.textContent = translations[currentUILang].charCount(text.length);
      updateDetectedLanguagePreview();
      updateRTL();
      scheduleDraftSave();
      showToast(translations[currentUILang].toastPasted);
      if (appSettings.autoTranslateOnPaste && text.trim()) {
        handleTranslation();
      }
    } catch (err) {
      console.error('Zwischenablage Fehler:', err);
      showToast(translations[currentUILang].toastClipboardError, 'error');
    }
  }
  window.__laberPasteFromClipboard = handlePasteFromClipboard;

  function loadAppSettings() {
    try {
      const saved = localStorage.getItem('laber_app_settings');
      if (!saved) return { ...DEFAULT_SETTINGS };
      return normalizeAppSettings(JSON.parse(saved));
    } catch (e) {
      return { ...DEFAULT_SETTINGS };
    }
  }

  function normalizeAppSettings(candidate) {
    const parsed = candidate && typeof candidate === 'object' ? candidate : {};
    const legacyModel = parsed.ollamaModel;
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      translationModel: parsed.translationModel || legacyModel || DEFAULT_SETTINGS.translationModel,
      writingModel: parsed.writingModel || DEFAULT_SETTINGS.writingModel
    };
  }

  function saveAppSettings() {
    if (nativePersistenceAvailable) scheduleNativePersistence();
    else saveLocalPreferencesFallback();
    syncNativeSettings();
    updateEngineBadge();
  }

  function persistPreferences() {
    if (nativePersistenceAvailable) scheduleNativePersistence();
    else saveLocalPreferencesFallback();
  }

  function syncNativeSettings() {
    if (window.webkit?.messageHandlers?.laberNative) {
      window.webkit.messageHandlers.laberNative.postMessage({
        action: 'setMenuBarVisible',
        value: appSettings.showMenuBarIcon
      });
      window.webkit.messageHandlers.laberNative.postMessage({
        action: 'setKeepInBackground',
        value: appSettings.keepInBackground
      });
    }
  }

  function updateEngineBadge() {
    const badge = document.querySelector('.engine-badge');
    if (badge) {
      const modelName = (appSettings.translationModel || DEFAULT_SETTINGS.translationModel).split(':')[0];
      badge.textContent = modelName;
    }
    $('footerEngine').textContent = `Ollama Engine • ${appSettings.translationModel}`;
  }

  function isModelAvailable(model) {
    return installedOllamaModels.length === 0 || installedOllamaModels.includes(model);
  }

  function openAppSettingsModal() {
    $('settingMenuBarToggle').checked = appSettings.showMenuBarIcon;
    $('settingBackgroundToggle').checked = appSettings.keepInBackground;
    $('settingAutoTranslateToggle').checked = appSettings.autoTranslateOnPaste;
    $('settingTranslationModel').value = appSettings.translationModel;
    $('settingWritingModel').value = appSettings.writingModel;
    showModal($('appSettingsModal'), $('settingTranslationModel'));
  }

  function closeAppSettingsModal() {
    hideModal($('appSettingsModal'));
  }

  function saveAppSettingsFromModal() {
    appSettings.showMenuBarIcon = $('settingMenuBarToggle').checked;
    appSettings.keepInBackground = $('settingBackgroundToggle').checked;
    appSettings.autoTranslateOnPaste = $('settingAutoTranslateToggle').checked;
    appSettings.translationModel = $('settingTranslationModel').value.trim() || DEFAULT_SETTINGS.translationModel;
    appSettings.writingModel = $('settingWritingModel').value.trim() || DEFAULT_SETTINGS.writingModel;
    delete appSettings.ollamaModel;
    saveAppSettings();
    closeAppSettingsModal();
    showToast(translations[currentUILang].toastSettingsSaved);
    checkAndInitializeEngine();
  }

  function setLoading(isLoading) {
    loadingSpinner.classList.toggle('hidden', !isLoading);
    translateBtn.disabled = isLoading;
    ['btnRefineFormal', 'btnRefineShort', 'btnRefineReply'].forEach((id) => {
      $(id).disabled = isLoading;
    });
    if (isLoading) {
      const model = currentMode === 'polish' ? appSettings.writingModel : appSettings.translationModel;
      $('loadingLabel').textContent = currentUILang === 'de'
        ? `Verarbeite mit ${model}...`
        : `Processing with ${model}...`;
    }
  }

  function updateRTL() {
    const detectedSource = sourceLang.value === 'auto' ? lastDetectedLanguage?.code : sourceLang.value;
    if (detectedSource === 'fa') {
      inputText.setAttribute('dir', 'rtl');
    } else {
      inputText.removeAttribute('dir');
    }
    if (targetLang.value === 'fa') {
      outputText.setAttribute('dir', 'rtl');
    } else {
      outputText.removeAttribute('dir');
    }
  }

  function initTheme() {
    const savedTheme = localStorage.getItem('laber_theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
  }

  async function checkAndInitializeEngine() {
    try {
      const response = await fetch('http://localhost:11434/api/tags');
      if (!response.ok) throw new Error(`Ollama Status: ${response.status}`);
      const data = await response.json();
      installedOllamaModels = Array.isArray(data.models)
        ? data.models.map((model) => model.name).filter(Boolean)
        : [];
      const modelList = $('ollamaModelsList');
      modelList.textContent = '';
      installedOllamaModels.forEach((name) => {
        const option = document.createElement('option');
        option.value = name;
        modelList.appendChild(option);
      });

      const requiredModels = [appSettings.translationModel, appSettings.writingModel];
      const missingModels = requiredModels.filter((name) => name && !installedOllamaModels.includes(name));
      backendStatusDot.classList.toggle('online', missingModels.length === 0);
      backendStatusDot.classList.toggle('offline', missingModels.length > 0);
      backendStatusDot.title = missingModels.length === 0
        ? 'Ollama aktiv'
        : `Ollama aktiv – Modell fehlt: ${missingModels.join(', ')}`;
    } catch {
      installedOllamaModels = [];
      backendStatusDot.classList.remove('online');
      backendStatusDot.classList.add('offline');
      backendStatusDot.title = 'Ollama nicht erreichbar';
    }
  }

  function exportData() {
    const t = translations[currentUILang];
    const payload = createBackupPayload();
    downloadBackup(payload, `${t.exportName}-${new Date().toISOString().slice(0, 10)}.json`);
  }

  function createBackupPayload() {
    return {
      schema: 'laber-backup',
      backupVersion: 1,
      exportedAt: new Date().toISOString(),
      app: 'Laber',
      state,
      appSettings,
      uiLanguage: currentUILang,
      theme: document.documentElement.getAttribute('data-theme') || 'dark'
    };
  }

  window.__laberCreatePersistenceSnapshot = () => {
    persistActiveDraft();
    return createBackupPayload();
  };

  function downloadBackup(payload, filename) {
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function importData(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    const t = translations[currentUILang];
    if (file.size > MAX_BACKUP_FILE_BYTES) {
      showToast(t.importError, 'error');
      return;
    }
    if (!confirm(t.confirmImport)) return;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        const imported = normalizeState(parsed.state || parsed);
        if (!nativePersistenceAvailable) {
          try {
            localStorage.setItem('laber_pre_import_backup', JSON.stringify(createBackupPayload()));
          } catch (backupError) {
            console.warn('Sicherungsstand vor Import konnte nicht gespeichert werden:', backupError);
          }
        }
        state = imported;
        if (parsed.appSettings && typeof parsed.appSettings === 'object') {
          appSettings = normalizeAppSettings(parsed.appSettings);
          saveAppSettings();
        }
        if (parsed.uiLanguage === 'de' || parsed.uiLanguage === 'en') {
          currentUILang = parsed.uiLanguage;
        }
        if (parsed.theme === 'dark' || parsed.theme === 'light') {
          document.documentElement.setAttribute('data-theme', parsed.theme);
        }
        saveState();
        bindActiveWorkspaceSettings();
        restoreActiveDraft();
        applyUILanguage(currentUILang);
        renderAll();
        showToast(translations[currentUILang].importSuccess);
        checkAndInitializeEngine();
      } catch (error) {
        console.error('Importfehler:', error);
        showToast(t.importError, 'error');
      }
    };
    reader.onerror = () => showToast(t.importError, 'error');
    reader.readAsText(file);
  }

  function showToast(message, type = 'success') {
    const container = $('toastContainer');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    const icon = document.createElement('span');
    icon.className = 'toast-icon';
    icon.innerHTML = `<svg class="lucide-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;

    const text = document.createElement('span');
    text.className = 'toast-text';
    text.textContent = message;

    toast.append(icon, text);
    container.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('toast-hiding');
      setTimeout(() => toast.remove(), 220);
    }, 2400);
  }

  function applyStarterTemplate(type) {
    const t = translations[currentUILang];
    const templates = {
      email: {
        de: "Sehr geehrte Damen und Herren,\n\nvielen Dank für die Zusendung des aktuellen Angebots. Wir haben die Konditionen geprüft und möchten gerne einen kurzen Abstimmungstermin für nächste Woche vereinbaren.\n\nMit freundlichen Grüßen,\nIhr Projektteam",
        en: "Dear Sir or Madam,\n\nThank you for providing the current proposal. We have reviewed the terms and would like to schedule a brief follow-up meeting next week.\n\nKind regards,\nProject Team",
        tone: 'formal',
        category: 'email'
      },
      academic: {
        de: "Die Implementierung des lokalen Sprachmodells reduziert die Latenzzeit signifikant und gewährleistet vollständige Datensouveränität ohne externe Netzwerkaufrufe.",
        en: "The implementation of the local language model significantly reduces latency and ensures complete data sovereignty without external network requests.",
        tone: 'direct',
        category: 'academic'
      },
      summary: {
        de: "Projektstatus Q3:\n• Backend-Migration abgeschlossen\n• Benutzeroberfläche modernisiert\n• Sicherheitsprüfungen erfolgreich durchgeführt\n• Nächster Meilenstein: Rollout an Pilotkunden",
        en: "Project status Q3:\n• Backend migration completed\n• User interface modernized\n• Security audits successfully passed\n• Next milestone: Rollout to pilot customers",
        tone: 'direct',
        category: 'summary'
      }
    };

    const chosen = templates[type];
    if (!chosen) return;

    inputText.value = chosen[currentUILang] || chosen.de;
    toneSelect.value = chosen.tone;
    categorySelect.value = chosen.category;
    charCount.textContent = t.charCount(inputText.value.length);
    updateDetectedLanguagePreview();
    updateRTL();
    scheduleDraftSave();
    window.scrollTo({ top: 0, behavior: 'smooth' });
    showToast(t.toastTemplateApplied);
  }

  async function handleQuickRefine(refineType) {
    const t = translations[currentUILang];
    const currentTranslation = outputText.value.trim();
    if (!currentTranslation) {
      showToast(t.toastNoOutputToRefine, 'info');
      return;
    }

    const requestContext = {
      workspaceId: state.activeWorkspaceId,
      sessionId: state.activeSessionId,
      mode: currentMode
    };
    const detectedSource = sourceLang.value === 'auto' ? lastDetectedLanguage?.code : sourceLang.value;
    const target = refineType === 'reply' ? (detectedSource || targetLang.value) : targetLang.value;
    const targetName = englishLanguageName(target);

    const sourceForRefine = refineType === 'reply' ? (inputText.value.trim() || currentTranslation) : currentTranslation;
    const conversationContext = buildConversationContext(getActiveSession());
    const instructions = {
      formal: `Rewrite and refine the following ${targetName} text in an elevated, polite, and highly professional B2B business tone in ${targetName}. Do not add explanations.`,
      short: `Condense and tighten the following ${targetName} text into clear, concise, and punchy wording in ${targetName}. Do not add explanations.`,
      reply: `Draft a polite, professional, and helpful response in ${targetName} to the following incoming message. Output only the reply and do not add explanations.`
    };

    const prompt = `${instructions[refineType] || instructions.formal}
${conversationContext ? `\nPrevious chat context:\n${conversationContext}\n` : ''}

Original text:
${sourceForRefine}

Refined result in ${targetName}:`;

    if (!isModelAvailable(appSettings.writingModel)) {
      statusIndicator.textContent = t.statusError;
      showToast(t.modelMissing(appSettings.writingModel), 'error');
      return;
    }
    const request = beginAIRequest();
    statusIndicator.textContent = t.refiningStatus;

    try {
      const response = await fetch('http://localhost:11434/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: appSettings.writingModel,
          prompt,
          stream: false,
          options: { temperature: 0.2 }
        }),
        signal: request.controller.signal
      });

      if (!response.ok) throw new Error(`Ollama Status: ${response.status}`);
      const data = await response.json();
      const refinedText = data.response ? data.response.trim() : '';
      if (!refinedText) throw new Error('Leere Antwort');

      addEntryToSession(requestContext.workspaceId, requestContext.sessionId, {
        id: uid('entry'),
        sourceCode: sourceLang.value,
        targetCode: target,
        detectedLanguage: lastDetectedLanguage?.code || null,
        sourceText: `[${t['refine' + refineType.charAt(0).toUpperCase() + refineType.slice(1)] || refineType}] ${sourceForRefine}`,
        targetText: refinedText,
        category: categorySelect.value,
        tone: refineType === 'formal' ? 'formal' : toneSelect.value,
        createdAt: new Date().toISOString(),
        legacyTimestamp: null
      });

      if (isRequestContextActive(requestContext)) {
        outputText.value = refinedText;
        statusIndicator.textContent = t.statusDone;
        scheduleDraftSave();
      } else {
        showToast(t.toastResultSavedElsewhere, 'info');
      }
      const actionLabel = t['refine' + refineType.charAt(0).toUpperCase() + refineType.slice(1)] || refineType;
      showToast(t.toastRefineApplied(actionLabel));
    } catch (err) {
      if (err.name === 'AbortError') return;
      console.error('Refine Fehler:', err);
      if (isRequestContextActive(requestContext)) statusIndicator.textContent = t.statusError;
      showToast(t.statusError, 'error');
    } finally {
      finishAIRequest(request);
    }
  }

  /* Command Palette State & Methods */
  let paletteSelectedIndex = 0;
  let paletteItems = [];

  function openCommandPalette() {
    const modal = $('commandPaletteModal');
    const input = $('commandPaletteInput');
    input.value = '';
    paletteSelectedIndex = 0;
    renderCommandPaletteList();
    showModal(modal, input);
  }

  function closeCommandPalette() {
    hideModal($('commandPaletteModal'));
  }

  function toggleCommandPalette() {
    if ($('commandPaletteModal').classList.contains('hidden')) {
      openCommandPalette();
    } else {
      closeCommandPalette();
    }
  }

  function renderCommandPaletteList() {
    const query = $('commandPaletteInput').value.trim().toLowerCase();
    const list = $('commandPaletteList');
    const t = translations[currentUILang];
    list.textContent = '';
    paletteItems = [];

    const workspaces = state.workspaces
      .filter((workspace) => !query || workspace.name.toLowerCase().includes(query))
      .map((workspace) => ({
          type: 'workspace',
          id: workspace.id,
          label: workspace.name,
          sub: workspace.parentCustomerId
            ? `${t.workspaceTypes[workspace.type]} · ${state.workspaces.find((item) => item.id === workspace.parentCustomerId)?.name || ''}`
            : (t.workspaceTypes[workspace.type] || workspace.type),
          icon: '🏢',
          action: () => {
            switchWorkspace(workspace.id);
            closeCommandPalette();
            showToast(t.toastSelected(workspace.name));
          }
        }));

    const currentWorkspace = getActiveWorkspace();
    const sessions = currentWorkspace.sessions
      .filter((session) => !query || session.name.toLowerCase().includes(query))
      .map((session) => ({
          type: 'session',
          id: session.id,
          label: session.name,
          sub: t.paletteEntries(session.entries.length),
          icon: '💬',
          action: () => {
            switchSession(session.id);
            closeCommandPalette();
            showToast(t.toastSelected(session.name));
          }
        }));

    const actions = [
      { id: 'new_session', label: t.paletteActionNewSession, icon: '➕', sub: t.paletteSubAction, action: () => { closeCommandPalette(); openSessionModal(); } },
      { id: 'new_workspace', label: t.paletteActionNewWorkspace, icon: '📁', sub: t.paletteSubAction, action: () => { closeCommandPalette(); openWorkspaceModal(); } },
      { id: 'glossary', label: t.paletteActionGlossary, icon: '🧠', sub: t.paletteSubDialog, action: () => { closeCommandPalette(); $('glossaryBtn').click(); } },
      { id: 'toggle_lang', label: t.paletteActionToggleLang, icon: '🌐', sub: t.paletteSubSwitch, action: () => { closeCommandPalette(); $('langToggle').click(); } },
      { id: 'toggle_theme', label: t.paletteActionToggleTheme, icon: '🌗', sub: t.paletteSubTheme, action: () => { closeCommandPalette(); $('themeToggle').click(); } },
      { id: 'export', label: t.paletteActionExport, icon: '💾', sub: t.paletteSubData, action: () => { closeCommandPalette(); exportData(); } }
    ].filter(a => !query || a.label.toLowerCase().includes(query));

    const groups = [
      { title: t.paletteSectionWorkspaces, items: workspaces },
      { title: t.paletteSectionSessions, items: sessions },
      { title: t.paletteSectionActions, items: actions }
    ].filter((group) => group.items.length > 0);

    paletteItems = groups.flatMap((group) => group.items);

    if (paletteItems.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'empty-history';
      empty.textContent = t.paletteNoResults;
      list.appendChild(empty);
      paletteSelectedIndex = -1;
      return;
    }

    paletteSelectedIndex = Math.min(Math.max(paletteSelectedIndex, 0), paletteItems.length - 1);

    let itemIndex = 0;
    groups.forEach((group) => {
      const category = document.createElement('div');
      category.className = 'palette-category-title';
      category.textContent = group.title;
      list.appendChild(category);

      group.items.forEach((item) => {
        const index = itemIndex++;
        const button = document.createElement('button');
        button.type = 'button';
        button.className = `palette-item${index === paletteSelectedIndex ? ' selected' : ''}`;
        button.setAttribute('role', 'option');
        button.setAttribute('aria-selected', index === paletteSelectedIndex ? 'true' : 'false');

        const main = document.createElement('span');
        main.className = 'palette-item-main';
        const icon = document.createElement('span');
        icon.className = 'palette-item-icon';
        icon.setAttribute('aria-hidden', 'true');
        icon.textContent = item.icon;
        const label = document.createElement('span');
        label.className = 'palette-item-label';
        label.textContent = item.label;
        const sub = document.createElement('span');
        sub.className = 'palette-item-sub';
        sub.textContent = item.sub;
        main.append(icon, label);
        button.append(main, sub);

        button.addEventListener('click', () => item.action());
        button.addEventListener('mouseenter', () => {
          paletteSelectedIndex = index;
          updatePaletteSelectionVisual();
        });
        list.appendChild(button);
      });
    });
  }

  function updatePaletteSelectionVisual() {
    const list = $('commandPaletteList');
    const items = list.querySelectorAll('.palette-item');
    items.forEach((el, index) => {
      el.classList.toggle('selected', index === paletteSelectedIndex);
      el.setAttribute('aria-selected', index === paletteSelectedIndex ? 'true' : 'false');
      if (index === paletteSelectedIndex) {
        el.scrollIntoView({ block: 'nearest' });
      }
    });
  }

  function handleCommandPaletteKeydown(event) {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (paletteItems.length > 0) {
        paletteSelectedIndex = (paletteSelectedIndex + 1) % paletteItems.length;
        updatePaletteSelectionVisual();
      }
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (paletteItems.length > 0) {
        paletteSelectedIndex = (paletteSelectedIndex - 1 + paletteItems.length) % paletteItems.length;
        updatePaletteSelectionVisual();
      }
    } else if (event.key === 'Enter') {
      event.preventDefault();
      if (paletteSelectedIndex >= 0 && paletteSelectedIndex < paletteItems.length) {
        paletteItems[paletteSelectedIndex].action();
      }
    }
  }

  window.__laberTest = {
    detectTextLanguage,
    buildPrompt,
    getState: () => JSON.parse(JSON.stringify(state))
  };
});
