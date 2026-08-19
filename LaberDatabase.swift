import Foundation
import SQLite3

private let sqliteTransient = unsafeBitCast(-1, to: sqlite3_destructor_type.self)

enum LaberDatabaseError: LocalizedError {
    case open(String)
    case sqlite(String)
    case invalidSnapshot

    var errorDescription: String? {
        switch self {
        case .open(let message): return "SQLite konnte nicht geöffnet werden: \(message)"
        case .sqlite(let message): return "SQLite-Fehler: \(message)"
        case .invalidSnapshot: return "Der Persistenz-Snapshot ist ungültig."
        }
    }
}

final class LaberDatabase {
    private var database: OpaquePointer?

    init(databaseURL: URL? = nil) throws {
        let url: URL
        if let databaseURL {
            url = databaseURL
        } else {
            let appSupport = try FileManager.default.url(
                for: .applicationSupportDirectory,
                in: .userDomainMask,
                appropriateFor: nil,
                create: true
            )
            let directory = appSupport.appendingPathComponent("Laber", isDirectory: true)
            try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
            url = directory.appendingPathComponent("laber.sqlite3")
        }

        let flags = SQLITE_OPEN_CREATE | SQLITE_OPEN_READWRITE | SQLITE_OPEN_FULLMUTEX
        guard sqlite3_open_v2(url.path, &database, flags, nil) == SQLITE_OK else {
            let message = database.map { String(cString: sqlite3_errmsg($0)) } ?? "Unbekannter Fehler"
            sqlite3_close(database)
            database = nil
            throw LaberDatabaseError.open(message)
        }

        try execute("PRAGMA foreign_keys = ON")
        try execute("PRAGMA journal_mode = WAL")
        try execute("PRAGMA synchronous = NORMAL")
        try migrate()
    }

    deinit {
        sqlite3_close(database)
    }

    func saveSnapshot(_ snapshot: [String: Any]) throws {
        guard let state = snapshot["state"] as? [String: Any],
              let workspaces = state["workspaces"] as? [[String: Any]],
              !workspaces.isEmpty else {
            throw LaberDatabaseError.invalidSnapshot
        }

        try execute("BEGIN IMMEDIATE TRANSACTION")
        do {
            try execute("DELETE FROM entries")
            try execute("DELETE FROM glossary")
            try execute("DELETE FROM chats")
            try execute("DELETE FROM workspaces")
            try execute("DELETE FROM app_metadata")

            try setMetadata("state_version", value: String(intValue(state["version"], fallback: 3)))
            try setMetadata("active_workspace_id", value: stringValue(state["activeWorkspaceId"]))
            try setMetadata("active_session_id", value: stringValue(state["activeSessionId"]))
            try setMetadata("backup_version", value: String(intValue(snapshot["backupVersion"], fallback: 1)))
            try setMetadata("ui_language", value: stringValue(snapshot["uiLanguage"], fallback: "de"))
            try setMetadata("theme", value: stringValue(snapshot["theme"], fallback: "dark"))
            try setMetadata("app_settings_json", value: try jsonString(snapshot["appSettings"] ?? [:]))

            for (workspaceIndex, workspace) in workspaces.enumerated() {
                let defaults = workspace["defaults"] as? [String: Any] ?? [:]
                try execute(
                    """
                    INSERT INTO workspaces (
                        id, name, type, parent_customer_id,
                        default_source, default_target, default_category, default_tone, sort_index
                    ) VALUES (?, ?, ?, NULL, ?, ?, ?, ?, ?)
                    """,
                    bindings: [
                        stringValue(workspace["id"]),
                        stringValue(workspace["name"], fallback: "Workspace"),
                        stringValue(workspace["type"], fallback: "general"),
                        stringValue(defaults["source"], fallback: "auto"),
                        stringValue(defaults["target"], fallback: "de"),
                        stringValue(defaults["category"], fallback: "general"),
                        stringValue(defaults["tone"], fallback: "natural"),
                        workspaceIndex
                    ]
                )
            }

            for workspace in workspaces {
                let workspaceId = stringValue(workspace["id"])
                if let parentId = nullableString(workspace["parentCustomerId"]) {
                    try execute(
                        "UPDATE workspaces SET parent_customer_id = ? WHERE id = ?",
                        bindings: [parentId, workspaceId]
                    )
                }

                let glossary = workspace["glossary"] as? [[String: Any]] ?? []
                for (glossaryIndex, item) in glossary.enumerated() {
                    try execute(
                        "INSERT INTO glossary (workspace_id, source_text, target_text, sort_index) VALUES (?, ?, ?, ?)",
                        bindings: [
                            workspaceId,
                            stringValue(item["src"]),
                            stringValue(item["tgt"]),
                            glossaryIndex
                        ]
                    )
                }

                let chats = workspace["sessions"] as? [[String: Any]] ?? []
                for (chatIndex, chat) in chats.enumerated() {
                    let draft = chat["draft"] as? [String: Any] ?? [:]
                    let chatId = stringValue(chat["id"])
                    try execute(
                        """
                        INSERT INTO chats (
                            id, workspace_id, name, created_at, updated_at, use_context,
                            draft_input, draft_output, draft_mode, sort_index
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                        """,
                        bindings: [
                            chatId,
                            workspaceId,
                            stringValue(chat["name"], fallback: "Chat"),
                            stringValue(chat["createdAt"]),
                            stringValue(chat["updatedAt"]),
                            boolValue(chat["useContext"]) ? 1 : 0,
                            stringValue(draft["input"]),
                            stringValue(draft["output"]),
                            stringValue(draft["mode"], fallback: "translate"),
                            chatIndex
                        ]
                    )

                    let entries = chat["entries"] as? [[String: Any]] ?? []
                    for (entryIndex, entry) in entries.enumerated() {
                        try execute(
                            """
                            INSERT INTO entries (
                                id, chat_id, source_code, target_code, detected_language,
                                source_text, target_text, category, tone,
                                created_at, legacy_timestamp, sort_index
                            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                            """,
                            bindings: [
                                stringValue(entry["id"]),
                                chatId,
                                stringValue(entry["sourceCode"], fallback: "auto"),
                                stringValue(entry["targetCode"], fallback: "de"),
                                nullableString(entry["detectedLanguage"]),
                                stringValue(entry["sourceText"]),
                                stringValue(entry["targetText"]),
                                stringValue(entry["category"], fallback: "general"),
                                stringValue(entry["tone"], fallback: "natural"),
                                stringValue(entry["createdAt"]),
                                nullableString(entry["legacyTimestamp"]),
                                entryIndex
                            ]
                        )
                    }
                }
            }

            try execute("COMMIT")
        } catch {
            try? execute("ROLLBACK")
            throw error
        }
    }

    func loadSnapshot() throws -> [String: Any]? {
        let workspaceRows = try query("SELECT * FROM workspaces ORDER BY sort_index ASC")
        guard !workspaceRows.isEmpty else { return nil }

        let metadata = try loadMetadata()
        var workspaces: [[String: Any]] = []

        for workspaceRow in workspaceRows {
            let workspaceId = stringValue(workspaceRow["id"])
            let glossaryRows = try query(
                "SELECT source_text, target_text FROM glossary WHERE workspace_id = ? ORDER BY sort_index ASC",
                bindings: [workspaceId]
            )
            let glossary = glossaryRows.map { row in
                ["src": stringValue(row["source_text"]), "tgt": stringValue(row["target_text"])]
            }

            let chatRows = try query(
                "SELECT * FROM chats WHERE workspace_id = ? ORDER BY sort_index ASC",
                bindings: [workspaceId]
            )
            var chats: [[String: Any]] = []
            for chatRow in chatRows {
                let chatId = stringValue(chatRow["id"])
                let entryRows = try query(
                    "SELECT * FROM entries WHERE chat_id = ? ORDER BY sort_index ASC",
                    bindings: [chatId]
                )
                let entries: [[String: Any]] = entryRows.map { row in
                    [
                        "id": stringValue(row["id"]),
                        "sourceCode": stringValue(row["source_code"], fallback: "auto"),
                        "targetCode": stringValue(row["target_code"], fallback: "de"),
                        "detectedLanguage": nullableString(row["detected_language"]) ?? NSNull(),
                        "sourceText": stringValue(row["source_text"]),
                        "targetText": stringValue(row["target_text"]),
                        "category": stringValue(row["category"], fallback: "general"),
                        "tone": stringValue(row["tone"], fallback: "natural"),
                        "createdAt": stringValue(row["created_at"]),
                        "legacyTimestamp": nullableString(row["legacy_timestamp"]) ?? NSNull()
                    ]
                }

                chats.append([
                    "id": chatId,
                    "name": stringValue(chatRow["name"], fallback: "Chat"),
                    "createdAt": stringValue(chatRow["created_at"]),
                    "updatedAt": stringValue(chatRow["updated_at"]),
                    "useContext": intValue(chatRow["use_context"]) != 0,
                    "draft": [
                        "input": stringValue(chatRow["draft_input"]),
                        "output": stringValue(chatRow["draft_output"]),
                        "mode": stringValue(chatRow["draft_mode"], fallback: "translate")
                    ],
                    "entries": entries
                ])
            }

            workspaces.append([
                "id": workspaceId,
                "name": stringValue(workspaceRow["name"], fallback: "Workspace"),
                "type": stringValue(workspaceRow["type"], fallback: "general"),
                "parentCustomerId": nullableString(workspaceRow["parent_customer_id"]) ?? NSNull(),
                "defaults": [
                    "source": stringValue(workspaceRow["default_source"], fallback: "auto"),
                    "target": stringValue(workspaceRow["default_target"], fallback: "de"),
                    "category": stringValue(workspaceRow["default_category"], fallback: "general"),
                    "tone": stringValue(workspaceRow["default_tone"], fallback: "natural")
                ],
                "glossary": glossary,
                "sessions": chats
            ])
        }

        let settingsValue: Any
        if let data = metadata["app_settings_json"]?.data(using: .utf8),
           let decoded = try? JSONSerialization.jsonObject(with: data) {
            settingsValue = decoded
        } else {
            settingsValue = [String: Any]()
        }

        return [
            "schema": "laber-backup",
            "backupVersion": Int(metadata["backup_version"] ?? "1") ?? 1,
            "app": "Laber",
            "state": [
                "version": Int(metadata["state_version"] ?? "3") ?? 3,
                "activeWorkspaceId": metadata["active_workspace_id"] ?? stringValue(workspaces.first?["id"]),
                "activeSessionId": metadata["active_session_id"] ?? firstChatId(in: workspaces),
                "workspaces": workspaces
            ],
            "appSettings": settingsValue,
            "uiLanguage": metadata["ui_language"] ?? "de",
            "theme": metadata["theme"] ?? "dark"
        ]
    }

    private func migrate() throws {
        try execute(
            """
            CREATE TABLE IF NOT EXISTS app_metadata (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL
            )
            """
        )
        try execute(
            """
            CREATE TABLE IF NOT EXISTS workspaces (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                type TEXT NOT NULL,
                parent_customer_id TEXT REFERENCES workspaces(id) ON DELETE SET NULL,
                default_source TEXT NOT NULL,
                default_target TEXT NOT NULL,
                default_category TEXT NOT NULL,
                default_tone TEXT NOT NULL,
                sort_index INTEGER NOT NULL
            )
            """
        )
        try execute(
            """
            CREATE TABLE IF NOT EXISTS chats (
                id TEXT PRIMARY KEY,
                workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
                name TEXT NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                use_context INTEGER NOT NULL DEFAULT 0,
                draft_input TEXT NOT NULL DEFAULT '',
                draft_output TEXT NOT NULL DEFAULT '',
                draft_mode TEXT NOT NULL DEFAULT 'translate',
                sort_index INTEGER NOT NULL
            )
            """
        )
        try execute(
            """
            CREATE TABLE IF NOT EXISTS entries (
                id TEXT PRIMARY KEY,
                chat_id TEXT NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
                source_code TEXT NOT NULL,
                target_code TEXT NOT NULL,
                detected_language TEXT,
                source_text TEXT NOT NULL,
                target_text TEXT NOT NULL,
                category TEXT NOT NULL,
                tone TEXT NOT NULL,
                created_at TEXT NOT NULL,
                legacy_timestamp TEXT,
                sort_index INTEGER NOT NULL
            )
            """
        )
        try execute(
            """
            CREATE TABLE IF NOT EXISTS glossary (
                workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
                source_text TEXT NOT NULL,
                target_text TEXT NOT NULL,
                sort_index INTEGER NOT NULL,
                PRIMARY KEY (workspace_id, sort_index)
            )
            """
        )
        try execute("CREATE INDEX IF NOT EXISTS idx_chats_workspace ON chats(workspace_id, sort_index)")
        try execute("CREATE INDEX IF NOT EXISTS idx_entries_chat ON entries(chat_id, sort_index)")
        try execute("CREATE INDEX IF NOT EXISTS idx_entries_created ON entries(created_at)")
        try execute("PRAGMA user_version = 1")
    }

    private func setMetadata(_ key: String, value: String) throws {
        try execute(
            "INSERT INTO app_metadata (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
            bindings: [key, value]
        )
    }

    private func loadMetadata() throws -> [String: String] {
        let rows = try query("SELECT key, value FROM app_metadata")
        return Dictionary(uniqueKeysWithValues: rows.map {
            (stringValue($0["key"]), stringValue($0["value"]))
        })
    }

    private func execute(_ sql: String, bindings: [Any?] = []) throws {
        guard let database else { throw LaberDatabaseError.sqlite("Datenbank ist geschlossen") }
        var statement: OpaquePointer?
        guard sqlite3_prepare_v2(database, sql, -1, &statement, nil) == SQLITE_OK else {
            throw currentError()
        }
        defer { sqlite3_finalize(statement) }
        try bind(bindings, to: statement)
        while true {
            let result = sqlite3_step(statement)
            if result == SQLITE_DONE { break }
            guard result == SQLITE_ROW else { throw currentError() }
        }
    }

    private func query(_ sql: String, bindings: [Any?] = []) throws -> [[String: Any]] {
        guard let database else { throw LaberDatabaseError.sqlite("Datenbank ist geschlossen") }
        var statement: OpaquePointer?
        guard sqlite3_prepare_v2(database, sql, -1, &statement, nil) == SQLITE_OK else {
            throw currentError()
        }
        defer { sqlite3_finalize(statement) }
        try bind(bindings, to: statement)

        var rows: [[String: Any]] = []
        while true {
            let result = sqlite3_step(statement)
            if result == SQLITE_DONE { break }
            guard result == SQLITE_ROW else { throw currentError() }
            var row: [String: Any] = [:]
            for index in 0..<sqlite3_column_count(statement) {
                let name = String(cString: sqlite3_column_name(statement, index))
                switch sqlite3_column_type(statement, index) {
                case SQLITE_INTEGER:
                    row[name] = sqlite3_column_int64(statement, index)
                case SQLITE_FLOAT:
                    row[name] = sqlite3_column_double(statement, index)
                case SQLITE_TEXT:
                    row[name] = String(cString: sqlite3_column_text(statement, index))
                case SQLITE_BLOB:
                    let count = Int(sqlite3_column_bytes(statement, index))
                    if let bytes = sqlite3_column_blob(statement, index) {
                        row[name] = Data(bytes: bytes, count: count)
                    } else {
                        row[name] = Data()
                    }
                default:
                    row[name] = NSNull()
                }
            }
            rows.append(row)
        }
        return rows
    }

    private func bind(_ values: [Any?], to statement: OpaquePointer?) throws {
        for (offset, rawValue) in values.enumerated() {
            let index = Int32(offset + 1)
            let value = rawValue.flatMap { $0 is NSNull ? nil : $0 }
            let result: Int32
            switch value {
            case nil:
                result = sqlite3_bind_null(statement, index)
            case let string as String:
                result = sqlite3_bind_text(statement, index, string, -1, sqliteTransient)
            case let bool as Bool:
                result = sqlite3_bind_int(statement, index, bool ? 1 : 0)
            case let int as Int:
                result = sqlite3_bind_int64(statement, index, sqlite3_int64(int))
            case let int64 as Int64:
                result = sqlite3_bind_int64(statement, index, sqlite3_int64(int64))
            case let number as NSNumber:
                result = sqlite3_bind_double(statement, index, number.doubleValue)
            case let double as Double:
                result = sqlite3_bind_double(statement, index, double)
            default:
                result = sqlite3_bind_text(statement, index, String(describing: value!), -1, sqliteTransient)
            }
            guard result == SQLITE_OK else { throw currentError() }
        }
    }

    private func currentError() -> LaberDatabaseError {
        guard let database else { return .sqlite("Datenbank ist geschlossen") }
        return .sqlite(String(cString: sqlite3_errmsg(database)))
    }

    private func jsonString(_ value: Any) throws -> String {
        guard JSONSerialization.isValidJSONObject(value) else { throw LaberDatabaseError.invalidSnapshot }
        let data = try JSONSerialization.data(withJSONObject: value, options: [.sortedKeys])
        guard let string = String(data: data, encoding: .utf8) else { throw LaberDatabaseError.invalidSnapshot }
        return string
    }

    private func firstChatId(in workspaces: [[String: Any]]) -> String {
        guard let firstWorkspace = workspaces.first,
              let chats = firstWorkspace["sessions"] as? [[String: Any]],
              let firstChat = chats.first else { return "" }
        return stringValue(firstChat["id"])
    }

    private func stringValue(_ value: Any?, fallback: String = "") -> String {
        guard let value, !(value is NSNull) else { return fallback }
        return value as? String ?? String(describing: value)
    }

    private func nullableString(_ value: Any?) -> String? {
        let value = stringValue(value)
        return value.isEmpty ? nil : value
    }

    private func intValue(_ value: Any?, fallback: Int = 0) -> Int {
        if let value = value as? Int { return value }
        if let value = value as? Int64 { return Int(value) }
        if let value = value as? NSNumber { return value.intValue }
        if let value = value as? String, let parsed = Int(value) { return parsed }
        return fallback
    }

    private func boolValue(_ value: Any?) -> Bool {
        if let value = value as? Bool { return value }
        if let value = value as? NSNumber { return value.boolValue }
        return false
    }
}
