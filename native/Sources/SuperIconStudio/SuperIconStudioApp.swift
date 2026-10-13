import AppKit
import SwiftUI

@main
@MainActor
struct SuperIconStudioApp: App {
    @State private var studio = Studio()

    init() {
        // Lets `swift run` behave like a normal app without a bundle around it.
        Task { @MainActor in
            NSApplication.shared.setActivationPolicy(.regular)
            NSApplication.shared.activate()
        }
    }

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environment(studio)
                .preferredColorScheme(studio.mode == .dark ? .dark : .light)
                .frame(minWidth: 880, minHeight: 560)
        }
        .defaultSize(width: 1180, height: 780)
        .commands {
            CommandGroup(after: .newItem) {
                Button("Add Icon") { studio.addIcon() }
                Button("Import SVG…") { studio.importArtwork() }
                Divider()
                Button("Export SVG…") { studio.exportSelected() }
                    .keyboardShortcut("e", modifiers: [.command, .shift])
                    .disabled(studio.selected == nil)
            }
        }
    }
}
