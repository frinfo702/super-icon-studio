import Foundation

/// The starting catalogue. Glyphs are SF Symbols, dressed in the palette the original
/// icon set uses.
enum Catalogue {
    private struct Seed {
        let name: String
        let identifier: String
        let symbol: String
        let card: String
        var glyph: String = "#FFFFFF"
    }

    private static let seeds: [Seed] = [
        Seed(name: "Browser", identifier: "browser", symbol: "safari", card: "#0061FF"),
        Seed(name: "Codex", identifier: "codex", symbol: "atom", card: "#3B3F6B"),
        Seed(name: "Git Changes", identifier: "gitChanges", symbol: "arrow.triangle.branch", card: "#34C759"),
        Seed(name: "Shell", identifier: "shell", symbol: "terminal", card: "#1C1C1E", glyph: "#D4FF3F"),
        Seed(name: "Superlogical", identifier: "superlogical", symbol: "point.bottomleft.forward.to.point.topright.scurvepath", card: "#BEE9F7", glyph: "#0F5F6E"),
        Seed(name: "Trailhead", identifier: "trailhead", symbol: "point.3.connected.trianglepath.dotted", card: "#4B4BE8"),
        Seed(name: "Metrics", identifier: "metrics", symbol: "gauge.with.dots.needle.67percent", card: "#FF9500"),
        Seed(name: "Storage", identifier: "storage", symbol: "cylinder.split.1x2", card: "#8E8E93"),
        Seed(name: "Secrets", identifier: "secrets", symbol: "key", card: "#AF52DE"),
        Seed(name: "Mailbox", identifier: "mailbox", symbol: "envelope", card: "#64D2FF"),
        Seed(name: "Registry", identifier: "registry", symbol: "shippingbox", card: "#A2845E"),
        Seed(name: "Scheduler", identifier: "scheduler", symbol: "timer", card: "#E91E63"),
        Seed(name: "Webhooks", identifier: "webhooks", symbol: "bolt", card: "#FFB020"),
        Seed(name: "Auth", identifier: "auth", symbol: "touchid", card: "#C4241C"),
        Seed(name: "Logs", identifier: "logs", symbol: "text.magnifyingglass", card: "#1C1C1E"),
        Seed(name: "Telemetry", identifier: "telemetry", symbol: "waveform.path.ecg", card: "#30C79B"),
        Seed(name: "Cloud Sync", identifier: "cloudSync", symbol: "cloud", card: "#64D2FF"),
        Seed(name: "Backups", identifier: "backups", symbol: "externaldrive", card: "#8E8E93"),
        Seed(name: "Deploy", identifier: "deploy", symbol: "paperplane", card: "#AF52DE"),
        Seed(name: "Firewall", identifier: "firewall", symbol: "shield.lefthalf.filled", card: "#1C1C1E"),
        Seed(name: "Region", identifier: "region", symbol: "globe", card: "#0061FF"),
        Seed(name: "Queue", identifier: "queue", symbol: "square.stack.3d.up", card: "#4B4BE8"),
        Seed(name: "Studio", identifier: "studio", symbol: "circle.hexagongrid", card: "#00C7BE"),
        Seed(name: "Circuit", identifier: "circuit", symbol: "cpu", card: "#3B3F6B"),
    ]

    static var icons: [Icon] {
        seeds.enumerated().map { index, seed in
            Icon(
                id: "icon-\(index)",
                name: seed.name,
                identifier: seed.identifier,
                glyph: .symbol(seed.symbol),
                light: .fresh(card: seed.card, glyph: seed.glyph, mode: .light),
                dark: .fresh(card: seed.card, glyph: seed.glyph, mode: .dark)
            )
        }
    }

    static func blankIcon(index: Int) -> Icon {
        let palette = ["#0061FF", "#34C759", "#FF9500", "#AF52DE", "#E91E63"]
        let card = palette[index % palette.count]
        return Icon(
            id: "icon-new-\(index)-\(UUID().uuidString)",
            name: "Untitled Icon",
            identifier: "untitledIcon",
            glyph: .symbol("atom"),
            light: .fresh(card: card, mode: .light),
            dark: .fresh(card: card, mode: .dark)
        )
    }
}
