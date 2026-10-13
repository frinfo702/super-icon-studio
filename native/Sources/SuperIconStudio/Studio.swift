import Foundation
import SwiftUI

enum Store {
    private static var file: URL? {
        guard let base = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask).first
        else { return nil }
        let folder = base.appending(path: "SuperIconStudio", directoryHint: .isDirectory)
        try? FileManager.default.createDirectory(at: folder, withIntermediateDirectories: true)
        return folder.appending(path: "catalogue.json")
    }

    static func load() -> [Icon]? {
        guard let file, let data = try? Data(contentsOf: file) else { return nil }
        return try? JSONDecoder().decode([Icon].self, from: data)
    }

    static func save(_ icons: [Icon]) {
        guard let file else { return }
        let encoder = JSONEncoder()
        encoder.outputFormatting = [.prettyPrinted]
        guard let data = try? encoder.encode(icons) else { return }
        try? data.write(to: file, options: .atomic)
    }
}

enum DesignTab: String, CaseIterable, Identifiable {
    case size
    case gradient
    case highlight
    case card

    var id: String { rawValue }

    var title: String {
        switch self {
        case .size: "Size"
        case .gradient: "Gradient"
        case .highlight: "Highlight"
        case .card: "Card"
        }
    }
}

enum DesignLayout: String, CaseIterable, Identifiable {
    case hero
    case grid

    var id: String { rawValue }
}

@Observable
@MainActor
final class Studio {
    var icons: [Icon]
    private(set) var saved: [Icon]
    var selection: Icon.ID?
    var section: Section = .library
    var mode: AppearanceMode = .light
    var master: Double = 48
    var libraryZoom: Double = 1
    var canvasZoom: Double = 5
    var designTab: DesignTab = .size
    var designLayout: DesignLayout = .hero
    var showInspector = true

    init() {
        let start = Store.load() ?? Catalogue.icons
        icons = start
        saved = start
        selection = start.first?.id

        #if DEBUG
        // Development aid: open straight into a state you are working on.
        if let raw = ProcessInfo.processInfo.environment["SIS_SECTION"], let section = Section(rawValue: raw) {
            self.section = section
        }
        if ProcessInfo.processInfo.environment["SIS_MODE"] == "dark" {
            mode = .dark
        }
        #endif
    }

    var selected: Icon? { icons.first { $0.id == selection } }
    var dirty: Bool { icons != saved }

    func zoom(for section: Section) -> Double {
        section == .library ? libraryZoom : canvasZoom
    }

    func mutateSelected(_ mutate: (inout Icon) -> Void) {
        guard let index = icons.firstIndex(where: { $0.id == selection }) else { return }
        mutate(&icons[index])
    }

    func mutateAppearance(_ mutate: (inout Appearance) -> Void) {
        let mode = mode
        mutateSelected { icon in
            switch mode {
            case .light: mutate(&icon.light)
            case .dark: mutate(&icon.dark)
            }
        }
    }

    func iconBinding<T>(_ path: WritableKeyPath<Icon, T>, fallback: T) -> Binding<T> {
        Binding(
            get: { self.selected?[keyPath: path] ?? fallback },
            set: { new in self.mutateSelected { $0[keyPath: path] = new } }
        )
    }

    func appearanceBinding<T>(_ path: WritableKeyPath<Appearance, T>, fallback: T) -> Binding<T> {
        Binding(
            get: { self.selected?.appearance(self.mode)[keyPath: path] ?? fallback },
            set: { new in self.mutateAppearance { $0[keyPath: path] = new } }
        )
    }

    func addIcon() {
        let icon = Catalogue.blankIcon(index: icons.count)
        icons.append(icon)
        selection = icon.id
        section = .library
    }

    func deleteSelected() {
        guard let index = icons.firstIndex(where: { $0.id == selection }) else { return }
        icons.remove(at: index)
        selection = icons.indices.contains(index - 1) ? icons[index - 1].id : icons.first?.id
    }

    func importArtwork() {
        let panel = NSOpenPanel()
        panel.allowedContentTypes = [.svg]
        panel.allowsMultipleSelection = false
        guard panel.runModal() == .OK, let url = panel.url, let artwork = SVG.artwork(from: url) else { return }
        mutateSelected { $0.glyph = artwork }
    }

    func exportSelected() {
        guard let selected else { return }
        SVGExport.write(icon: selected, mode: mode, size: master)
    }

    func save() {
        saved = icons
        Store.save(icons)
    }

    func revert() {
        icons = saved
    }
}
