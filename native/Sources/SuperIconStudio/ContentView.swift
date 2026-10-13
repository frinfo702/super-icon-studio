import SwiftUI

struct ContentView: View {
    @Environment(Studio.self) private var studio

    var body: some View {
        @Bindable var studio = studio

        NavigationSplitView {
            SidebarView()
        } detail: {
            CanvasView()
                .inspector(isPresented: $studio.showInspector) {
                    InspectorView()
                        .inspectorColumnWidth(min: 236, ideal: 264, max: 320)
                }
        }
        .navigationTitle("Super Icon Studio")
    }
}

struct SidebarView: View {
    @Environment(Studio.self) private var studio

    var body: some View {
        List(selection: Binding(get: { studio.section }, set: { studio.section = $0 ?? .library })) {
            ForEach(Section.allCases) { section in
                Label {
                    HStack(spacing: 6) {
                        Text(section.title)
                        if studio.dirty {
                            Text("Unsaved")
                                .font(.system(size: 10, weight: .medium))
                                .foregroundStyle(Color.accentColor)
                                .padding(.horizontal, 5)
                                .padding(.vertical, 1.5)
                                .background(Color.accentColor.opacity(0.16), in: RoundedRectangle(cornerRadius: 4, style: .continuous))
                        }
                    }
                } icon: {
                    Image(systemName: section.symbol)
                }
                .tag(section)
            }
        }
        .navigationSplitViewColumnWidth(210)
    }
}

struct CanvasView: View {
    @Environment(Studio.self) private var studio

    var body: some View {
        Group {
            switch studio.section {
            case .library: LibraryView()
            case .design: DesignView()
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Color(nsColor: .textBackgroundColor))
        .overlay(alignment: .bottom) { ZoomBar() }
        .toolbar { toolbar }
    }

    @ToolbarContentBuilder private var toolbar: some ToolbarContent {
        @Bindable var studio = studio

        ToolbarItem(placement: .navigation) {
            Picker("Appearance", selection: $studio.mode) {
                Image(systemName: "sun.max").tag(AppearanceMode.light)
                Image(systemName: "moon").tag(AppearanceMode.dark)
            }
            .pickerStyle(.segmented)
            .labelsHidden()
            .frame(width: 84)
            .help("Edit the light or the dark appearance")
        }

        ToolbarItem(placement: .principal) {
            ModeSwitch()
        }

        ToolbarItemGroup(placement: .primaryAction) {
            if studio.section == .library {
                Button { studio.addIcon() } label: {
                    Image(systemName: "plus")
                }
                .help("Add an icon")
            } else {
                Picker("Layout", selection: $studio.designLayout) {
                    Image(systemName: "rectangle.grid.1x2").tag(DesignLayout.hero)
                    Image(systemName: "square.grid.2x2").tag(DesignLayout.grid)
                }
                .pickerStyle(.segmented)
                .labelsHidden()
                .frame(width: 76)
                .help("One preview, or every size at once")
            }

            Button { studio.exportSelected() } label: {
                Image(systemName: "square.and.arrow.up")
            }
            .disabled(studio.selected == nil)
            .help("Export this icon as SVG")

            Button { studio.showInspector.toggle() } label: {
                Image(systemName: "sidebar.right")
            }
            .help("Show or hide the inspector")
        }
    }
}

/// Studio / Composer, as in the original. Composer is not part of this build.
private struct ModeSwitch: View {
    var body: some View {
        HStack(spacing: 1) {
            Text("Studio")
                .font(.system(size: 12, weight: .medium))
                .padding(.horizontal, 11)
                .padding(.vertical, 3)
                .background(Color(nsColor: .textBackgroundColor), in: RoundedRectangle(cornerRadius: 6, style: .continuous))
                .shadow(color: .black.opacity(0.14), radius: 1, y: 0.5)
            Text("Composer")
                .font(.system(size: 12))
                .foregroundStyle(.tertiary)
                .padding(.horizontal, 11)
                .padding(.vertical, 3)
        }
        .padding(2)
        .background(Color(nsColor: .quaternarySystemFill), in: RoundedRectangle(cornerRadius: 8, style: .continuous))
        .help("Composer is not part of this build")
    }
}

struct ZoomBar: View {
    @Environment(Studio.self) private var studio

    var body: some View {
        let isLibrary = studio.section == .library

        HStack(spacing: 8) {
            Slider(
                value: Binding(
                    get: { studio.zoom(for: studio.section) },
                    set: { new in
                        if isLibrary { studio.libraryZoom = new } else { studio.canvasZoom = new }
                    }
                ),
                in: isLibrary ? 0.5...2 : 1...10
            )
            .controlSize(.small)
            .frame(width: 190)
            .padding(.horizontal, 12)
            .padding(.vertical, 9)
            .background(.regularMaterial, in: Capsule())

            Button {
                if isLibrary { studio.libraryZoom = 1 } else { studio.canvasZoom = 5 }
            } label: {
                Image(systemName: "arrow.up.left.and.arrow.down.right")
                    .font(.system(size: 11))
            }
            .buttonStyle(.plain)
            .frame(width: 30, height: 30)
            .background(.regularMaterial, in: Circle())
            .help("Reset the zoom")
        }
        .padding(.bottom, 14)
    }
}

struct InspectorView: View {
    @Environment(Studio.self) private var studio

    var body: some View {
        switch studio.section {
        case .library: LibraryInspectorView()
        case .design: DesignInspectorView()
        }
    }
}
