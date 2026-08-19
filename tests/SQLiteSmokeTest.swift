import Foundation

private enum SmokeTestError: Error {
    case failed(String)
}

private func require(_ condition: @autoclosure () -> Bool, _ message: String) throws {
    guard condition() else { throw SmokeTestError.failed(message) }
}

@main
struct SQLiteSmokeTest {
    static func main() throws {
        let directory = FileManager.default.temporaryDirectory
            .appendingPathComponent("laber-sqlite-test-\(UUID().uuidString)", isDirectory: true)
        try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
        defer { try? FileManager.default.removeItem(at: directory) }

        let database = try LaberDatabase(databaseURL: directory.appendingPathComponent("laber.sqlite3"))
        let snapshot: [String: Any] = [
            "schema": "laber-backup",
            "backupVersion": 1,
            "state": [
                "version": 3,
                "activeWorkspaceId": "project-1",
                "activeSessionId": "chat-1",
                "workspaces": [
                    [
                        "id": "customer-1",
                        "name": "Acme",
                        "type": "customer",
                        "parentCustomerId": NSNull(),
                        "defaults": ["source": "auto", "target": "de", "category": "general", "tone": "formal"],
                        "glossary": [["src": "Roadmap", "tgt": "Roadmap"]],
                        "sessions": [[
                            "id": "chat-customer",
                            "name": "Allgemein",
                            "createdAt": "2026-08-19T08:00:00Z",
                            "updatedAt": "2026-08-19T08:00:00Z",
                            "useContext": false,
                            "draft": ["input": "", "output": "", "mode": "translate"],
                            "entries": []
                        ]]
                    ],
                    [
                        "id": "project-1",
                        "name": "Website",
                        "type": "project",
                        "parentCustomerId": "customer-1",
                        "defaults": ["source": "auto", "target": "en", "category": "product", "tone": "natural"],
                        "glossary": [],
                        "sessions": [[
                            "id": "chat-1",
                            "name": "Launch",
                            "createdAt": "2026-08-19T09:00:00Z",
                            "updatedAt": "2026-08-19T10:00:00Z",
                            "useContext": true,
                            "draft": ["input": "Hallo", "output": "Hello", "mode": "translate"],
                            "entries": [[
                                "id": "entry-1",
                                "sourceCode": "de",
                                "targetCode": "en",
                                "detectedLanguage": "de",
                                "sourceText": "Guten Morgen",
                                "targetText": "Good morning",
                                "category": "email",
                                "tone": "formal",
                                "createdAt": "2026-08-19T10:00:00Z",
                                "legacyTimestamp": NSNull()
                            ]]
                        ]]
                    ]
                ]
            ],
            "appSettings": [
                "showMenuBarIcon": true,
                "keepInBackground": true,
                "translationModel": "translategemma:latest",
                "writingModel": "gemma3:4b"
            ],
            "uiLanguage": "de",
            "theme": "dark"
        ]

        try database.saveSnapshot(snapshot)
        guard let loaded = try database.loadSnapshot(),
              let state = loaded["state"] as? [String: Any],
              let workspaces = state["workspaces"] as? [[String: Any]] else {
            throw SmokeTestError.failed("Snapshot konnte nicht geladen werden")
        }

        try require(workspaces.count == 2, "Workspace-Anzahl stimmt nicht")
        let project = try requireWorkspace("project-1", in: workspaces)
        try require(project["parentCustomerId"] as? String == "customer-1", "Kundenbeziehung fehlt")
        guard let chats = project["sessions"] as? [[String: Any]], let chat = chats.first,
              let entries = chat["entries"] as? [[String: Any]], let entry = entries.first,
              let draft = chat["draft"] as? [String: Any] else {
            throw SmokeTestError.failed("Chat-Struktur fehlt")
        }
        try require(chat["useContext"] as? Bool == true, "Chat-Kontext wurde nicht gespeichert")
        try require(draft["input"] as? String == "Hallo", "Entwurf wurde nicht gespeichert")
        try require(entry["targetText"] as? String == "Good morning", "Eintrag wurde nicht gespeichert")
        try require(loaded["uiLanguage"] as? String == "de", "UI-Sprache wurde nicht gespeichert")
        try require(loaded["theme"] as? String == "dark", "Theme wurde nicht gespeichert")

        try database.saveSnapshot(snapshot)
        let secondLoad = try database.loadSnapshot()
        try require(secondLoad != nil, "Wiederholtes atomisches Speichern ist fehlgeschlagen")
        print("SQLite roundtrip passed.")
    }

    private static func requireWorkspace(_ id: String, in workspaces: [[String: Any]]) throws -> [String: Any] {
        guard let workspace = workspaces.first(where: { $0["id"] as? String == id }) else {
            throw SmokeTestError.failed("Workspace \(id) fehlt")
        }
        return workspace
    }
}
