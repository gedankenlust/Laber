import Cocoa
import WebKit
import NaturalLanguage

/// Unsichtbare native Leiste über dem WebView, die Maus-Events abfängt
/// und das Fenster per manueller Positionsberechnung zuverlässig verschiebt.
class DraggableHeaderView: NSView {
    var initialMouseLocation: NSPoint = .zero

    override init(frame frameRect: NSRect) {
        super.init(frame: frameRect)
        wantsLayer = true
        layer?.backgroundColor = NSColor.clear.cgColor
    }

    required init?(coder: NSCoder) {
        super.init(coder: coder)
    }

    override func acceptsFirstMouse(for event: NSEvent?) -> Bool {
        return true
    }

    override func mouseDown(with event: NSEvent) {
        initialMouseLocation = NSEvent.mouseLocation
    }

    override func mouseDragged(with event: NSEvent) {
        guard let window = self.window else { return }
        let current = NSEvent.mouseLocation
        var origin = window.frame.origin
        origin.x += current.x - initialMouseLocation.x
        origin.y += current.y - initialMouseLocation.y
        window.setFrameOrigin(origin)
        initialMouseLocation = current
    }

    override func mouseUp(with event: NSEvent) {
        if event.clickCount == 2 {
            window?.zoom(nil)
        }
    }
}

class AppDelegate: NSObject, NSApplicationDelegate, NSWindowDelegate, WKNavigationDelegate, WKUIDelegate, WKScriptMessageHandler {
    var window: NSWindow!
    var webView: WKWebView!
    var statusItem: NSStatusItem?
    var isMenuBarVisible: Bool = true
    var isKeepInBackground: Bool = true
    private let databaseQueue = DispatchQueue(label: "com.gedankenlust.laber.database", qos: .utility)
    private var database: LaberDatabase?
    private var terminationSaveInProgress = false

    func applicationDidFinishLaunching(_ notification: Notification) {
        databaseQueue.sync {
            do {
                database = try LaberDatabase()
            } catch {
                NSLog("Laber SQLite konnte nicht initialisiert werden: \(error.localizedDescription)")
            }
        }
        setupAppIcon()
        setupMainMenu()
        setupStatusItem()

        let windowRect = NSRect(x: 0, y: 0, width: 1280, height: 820)
        window = NSWindow(
            contentRect: windowRect,
            styleMask: [.titled, .closable, .miniaturizable, .resizable, .fullSizeContentView],
            backing: .buffered,
            defer: false
        )
        window.isReleasedWhenClosed = false
        window.delegate = self
        window.title = "Laber"
        window.titlebarAppearsTransparent = true
        window.titleVisibility = .hidden
        window.center()

        // WKWebView Konfiguration: localhost-Zugriff & Native Bridge
        let config = WKWebViewConfiguration()
        #if DEBUG
        config.preferences.setValue(true, forKey: "developerExtrasEnabled")
        #endif
        config.setValue(true, forKey: "allowUniversalAccessFromFileURLs")

        let contentController = WKUserContentController()
        contentController.add(self, name: "laberNative")
        config.userContentController = contentController

        let contentBounds = window.contentView!.bounds

        webView = WKWebView(frame: contentBounds, configuration: config)
        webView.autoresizingMask = [.width, .height]
        webView.navigationDelegate = self
        webView.uiDelegate = self

        let bundledURL = Bundle.main.url(forResource: "index", withExtension: "html")
        let developmentURL = URL(fileURLWithPath: FileManager.default.currentDirectoryPath)
            .appendingPathComponent("index.html")
        let url = bundledURL ?? developmentURL

        guard FileManager.default.fileExists(atPath: url.path) else {
            let alert = NSAlert()
            alert.messageText = "Laber konnte seine Benutzeroberfläche nicht laden."
            alert.informativeText = "Die Datei index.html fehlt im App-Bundle."
            alert.runModal()
            NSApp.terminate(nil)
            return
        }

        webView.loadFileURL(url, allowingReadAccessTo: url.deletingLastPathComponent())

        window.contentView!.addSubview(webView)

        // Drag-Zone über der separaten oberen macOS-Titelleiste.
        let headerHeight: CGFloat = 32.0
        let dragFrame = NSRect(
            x: 80,
            y: contentBounds.height - headerHeight,
            width: contentBounds.width - 80,
            height: headerHeight
        )
        let dragView = DraggableHeaderView(frame: dragFrame)
        dragView.autoresizingMask = [.width, .minYMargin]
        window.contentView!.addSubview(dragView, positioned: .above, relativeTo: webView)

        window.makeKeyAndOrderFront(nil)
        NSApp.activate(ignoringOtherApps: true)
    }

    /// Erstellt das native macOS Bearbeiten-Menü (Aktiviert CMD+C, CMD+V, CMD+X, CMD+A in allen Textfeldern)
    func setupAppIcon() {
        let bundledICNS = Bundle.main.url(forResource: "AppIcon", withExtension: "icns")
            ?? Bundle.main.url(forResource: "AppIcon", withExtension: "icns", subdirectory: "assets")
        let bundledPNG = Bundle.main.url(forResource: "app-icon", withExtension: "png", subdirectory: "assets")
        let devURL = URL(fileURLWithPath: FileManager.default.currentDirectoryPath).appendingPathComponent("assets/AppIcon.icns")

        if let url = bundledICNS ?? bundledPNG ?? (FileManager.default.fileExists(atPath: devURL.path) ? devURL : nil),
           let img = NSImage(contentsOf: url) {
            NSApp.applicationIconImage = img
        }
    }

    func setupMainMenu() {
        let mainMenu = NSMenu()

        // App Menu
        let appMenu = NSMenu(title: "Laber")
        appMenu.addItem(withTitle: "Über Laber", action: #selector(NSApplication.orderFrontStandardAboutPanel(_:)), keyEquivalent: "")
        appMenu.addItem(NSMenuItem.separator())
        appMenu.addItem(withTitle: "Laber ausblenden", action: #selector(NSApplication.hide(_:)), keyEquivalent: "h")
        let hideOthersItem = NSMenuItem(title: "Andere ausblenden", action: #selector(NSApplication.hideOtherApplications(_:)), keyEquivalent: "h")
        hideOthersItem.keyEquivalentModifierMask = [.command, .option]
        appMenu.addItem(hideOthersItem)
        appMenu.addItem(withTitle: "Alle einblenden", action: #selector(NSApplication.unhideAllApplications(_:)), keyEquivalent: "")
        appMenu.addItem(NSMenuItem.separator())
        appMenu.addItem(withTitle: "Laber beenden", action: #selector(NSApplication.terminate(_:)), keyEquivalent: "q")

        let appMenuItem = NSMenuItem()
        appMenuItem.submenu = appMenu
        mainMenu.addItem(appMenuItem)

        // Bearbeiten Menü (CMD+V, CMD+C, CMD+X, CMD+A)
        let editMenu = NSMenu(title: "Bearbeiten")
        editMenu.addItem(withTitle: "Rückgängig", action: Selector(("undo:")), keyEquivalent: "z")
        editMenu.addItem(withTitle: "Wiederholen", action: Selector(("redo:")), keyEquivalent: "Z")
        editMenu.addItem(NSMenuItem.separator())
        editMenu.addItem(withTitle: "Ausschneiden", action: #selector(NSText.cut(_:)), keyEquivalent: "x")
        editMenu.addItem(withTitle: "Kopieren", action: #selector(NSText.copy(_:)), keyEquivalent: "c")
        editMenu.addItem(withTitle: "Einfügen", action: #selector(NSText.paste(_:)), keyEquivalent: "v")
        editMenu.addItem(withTitle: "Alles auswählen", action: #selector(NSText.selectAll(_:)), keyEquivalent: "a")

        let editMenuItem = NSMenuItem()
        editMenuItem.submenu = editMenu
        mainMenu.addItem(editMenuItem)

        NSApp.mainMenu = mainMenu
    }

    func setupStatusItem() {
        guard isMenuBarVisible else { return }
        if statusItem != nil { return }

        statusItem = NSStatusBar.system.statusItem(withLength: NSStatusItem.variableLength)
        if let button = statusItem?.button {
            var iconImage: NSImage?
            let bundledURL = Bundle.main.url(forResource: "menu-icon", withExtension: "png", subdirectory: "assets")
                ?? Bundle.main.url(forResource: "menu-icon", withExtension: "png")
            let devURL = URL(fileURLWithPath: FileManager.default.currentDirectoryPath).appendingPathComponent("assets/menu-icon.png")

            if let bURL = bundledURL, let img = NSImage(contentsOf: bURL) {
                iconImage = img
            } else if let img = NSImage(contentsOf: devURL) {
                iconImage = img
            }

            if let img = iconImage {
                img.isTemplate = true
                img.size = NSSize(width: 18, height: 18)
                button.image = img
                button.imagePosition = .imageOnly
                button.title = ""
            } else {
                button.title = "⚡"
            }

            button.target = self
            button.action = #selector(toggleWindow)
        }

        let statusMenu = NSMenu()
        statusMenu.addItem(withTitle: "Laber anzeigen", action: #selector(showWindow), keyEquivalent: "o")
        statusMenu.addItem(withTitle: "Aus Zwischenablage einfügen", action: #selector(pasteFromClipboardAction), keyEquivalent: "v")
        statusMenu.addItem(NSMenuItem.separator())
        statusMenu.addItem(withTitle: "Laber beenden", action: #selector(NSApplication.terminate(_:)), keyEquivalent: "q")
        statusItem?.menu = statusMenu
    }

    func setMenuBarVisible(_ visible: Bool) {
        isMenuBarVisible = visible
        if visible {
            setupStatusItem()
        } else if let item = statusItem {
            NSStatusBar.system.removeStatusItem(item)
            statusItem = nil
        }
    }

    @objc func showWindow() {
        window.makeKeyAndOrderFront(nil)
        NSApp.activate(ignoringOtherApps: true)
    }

    @objc func toggleWindow() {
        if window.isVisible && window.isKeyWindow {
            window.orderOut(nil)
        } else {
            showWindow()
        }
    }

    @objc func pasteFromClipboardAction() {
        showWindow()
        webView.evaluateJavaScript("window.__laberPasteFromClipboard && window.__laberPasteFromClipboard();", completionHandler: nil)
    }

    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        guard message.name == "laberNative",
              let dict = message.body as? [String: Any],
              let action = dict["action"] as? String else { return }

        if action == "setMenuBarVisible", let visible = dict["value"] as? Bool {
            setMenuBarVisible(visible)
        } else if action == "setKeepInBackground", let keep = dict["value"] as? Bool {
            isKeepInBackground = keep
        } else if action == "detectLanguage",
                  let requestId = dict["requestId"] as? String,
                  let text = dict["text"] as? String {
            detectLanguage(text, requestId: requestId)
        } else if action == "loadPersistenceSnapshot",
                  let requestId = dict["requestId"] as? String {
            loadPersistenceSnapshot(requestId: requestId)
        } else if action == "savePersistenceSnapshot",
                  let requestId = dict["requestId"] as? String,
                  let snapshot = dict["snapshot"] as? [String: Any] {
            savePersistenceSnapshot(snapshot, requestId: requestId)
        }
    }

    func loadPersistenceSnapshot(requestId: String) {
        databaseQueue.async { [weak self] in
            guard let self else { return }
            do {
                let snapshot = try database?.loadSnapshot()
                sendPersistenceResponse([
                    "requestId": requestId,
                    "ok": true,
                    "snapshot": snapshot ?? NSNull()
                ])
            } catch {
                sendPersistenceResponse([
                    "requestId": requestId,
                    "ok": false,
                    "error": error.localizedDescription
                ])
            }
        }
    }

    func savePersistenceSnapshot(_ snapshot: [String: Any], requestId: String) {
        databaseQueue.async { [weak self] in
            guard let self else { return }
            do {
                guard let database else {
                    throw LaberDatabaseError.open("Datenbank ist nicht verfügbar")
                }
                try database.saveSnapshot(snapshot)
                sendPersistenceResponse(["requestId": requestId, "ok": true])
            } catch {
                sendPersistenceResponse([
                    "requestId": requestId,
                    "ok": false,
                    "error": error.localizedDescription
                ])
            }
        }
    }

    private func sendPersistenceResponse(_ payload: [String: Any]) {
        guard JSONSerialization.isValidJSONObject(payload),
              let data = try? JSONSerialization.data(withJSONObject: payload),
              let json = String(data: data, encoding: .utf8) else { return }
        DispatchQueue.main.async { [weak self] in
            self?.webView.evaluateJavaScript(
                "window.__laberNativePersistenceReceive && window.__laberNativePersistenceReceive(\(json));",
                completionHandler: nil
            )
        }
    }

    func detectLanguage(_ text: String, requestId: String) {
        let recognizer = NLLanguageRecognizer()
        recognizer.processString(text)
        let hypothesis = recognizer.languageHypotheses(withMaximum: 1).first
        let payload: [String: Any] = [
            "requestId": requestId,
            "code": hypothesis?.key.rawValue ?? "",
            "confidence": Double(hypothesis?.value ?? 0)
        ]

        guard let data = try? JSONSerialization.data(withJSONObject: payload),
              let json = String(data: data, encoding: .utf8) else { return }
        webView.evaluateJavaScript("window.__laberReceiveLanguageDetection && window.__laberReceiveLanguageDetection(\(json));", completionHandler: nil)
    }

    func windowShouldClose(_ sender: NSWindow) -> Bool {
        if isKeepInBackground || isMenuBarVisible {
            window.orderOut(nil)
            return false
        } else {
            NSApp.terminate(nil)
            return true
        }
    }

    func applicationShouldHandleReopen(_ sender: NSApplication, hasVisibleWindows flag: Bool) -> Bool {
        if !flag {
            showWindow()
        }
        return true
    }

    func applicationShouldTerminateAfterLastWindowClosed(_ sender: NSApplication) -> Bool {
        return !isKeepInBackground && statusItem == nil
    }

    func applicationShouldTerminate(_ sender: NSApplication) -> NSApplication.TerminateReply {
        if terminationSaveInProgress {
            return .terminateLater
        }
        guard webView != nil, database != nil else {
            return .terminateNow
        }

        terminationSaveInProgress = true
        webView.evaluateJavaScript(
            "window.__laberCreatePersistenceSnapshot && window.__laberCreatePersistenceSnapshot();"
        ) { [weak self] result, _ in
            guard let self else {
                sender.reply(toApplicationShouldTerminate: true)
                return
            }
            guard let snapshot = result as? [String: Any], let database else {
                sender.reply(toApplicationShouldTerminate: true)
                return
            }

            databaseQueue.async {
                do {
                    try database.saveSnapshot(snapshot)
                } catch {
                    NSLog("Laber konnte den letzten SQLite-Stand nicht speichern: \(error.localizedDescription)")
                }
                DispatchQueue.main.async {
                    sender.reply(toApplicationShouldTerminate: true)
                }
            }
        }
        return .terminateLater
    }

    // Mark: - WKUIDelegate Methods (Für JS alert und confirm)
    func webView(_ webView: WKWebView, runJavaScriptAlertPanelWithMessage message: String, initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping () -> Void) {
        let alert = NSAlert()
        alert.messageText = message
        alert.addButton(withTitle: "OK")
        alert.runModal()
        completionHandler()
    }

    func webView(_ webView: WKWebView, runJavaScriptConfirmPanelWithMessage message: String, initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping (Bool) -> Void) {
        let alert = NSAlert()
        alert.messageText = message
        alert.addButton(withTitle: "OK")
        alert.addButton(withTitle: "Abbrechen")
        let result = alert.runModal()
        completionHandler(result == .alertFirstButtonReturn)
    }
}

let app = NSApplication.shared
let delegate = AppDelegate()
app.delegate = delegate
app.run()
