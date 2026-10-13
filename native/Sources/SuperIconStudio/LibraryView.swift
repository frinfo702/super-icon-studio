import SwiftUI

struct LibraryView: View {
    @Environment(Studio.self) private var studio

    var body: some View {
        ScrollView {
            LazyVGrid(
                columns: [GridItem(.adaptive(minimum: 84 * studio.libraryZoom), spacing: 3)],
                spacing: 3
            ) {
                ForEach(studio.icons) { icon in
                    Cell(icon: icon)
                }
            }
            .padding(.horizontal, 14)
            .padding(.top, 10)
            .padding(.bottom, 76)
        }
    }

    private struct Cell: View {
        @Environment(Studio.self) private var studio
        let icon: Icon

        var body: some View {
            let selected = icon.id == studio.selection

            Button {
                studio.selection = icon.id
            } label: {
                VStack(spacing: 6) {
                    IconArtwork(
                        icon: icon,
                        appearance: icon.appearance(studio.mode),
                        size: 64 * studio.libraryZoom
                    )
                    Text(icon.name)
                        .font(.system(size: 11))
                        .foregroundStyle(.secondary)
                        .lineLimit(1)
                        .truncationMode(.middle)
                }
                .padding(6)
                .frame(maxWidth: .infinity)
                .background {
                    RoundedRectangle(cornerRadius: 10, style: .continuous)
                        .fill(selected ? Color(nsColor: .textBackgroundColor) : Color(nsColor: .quaternarySystemFill))
                }
                .overlay {
                    if selected {
                        RoundedRectangle(cornerRadius: 10, style: .continuous)
                            .strokeBorder(Color.accentColor, lineWidth: 2)
                    }
                }
            }
            .buttonStyle(.plain)
        }
    }
}

struct LibraryInspectorView: View {
    @Environment(Studio.self) private var studio

    var body: some View {
        VStack(spacing: 0) {
            if let icon = studio.selected {
                ScrollView {
                    VStack(spacing: 0) {
                        IconArtwork(icon: icon, appearance: icon.appearance(studio.mode), size: 64)
                            .frame(maxWidth: .infinity, minHeight: 104)
                            .background(Color(nsColor: .quaternarySystemFill), in: RoundedRectangle(cornerRadius: 10, style: .continuous))
                            .padding(12)

                        InspectorSection(title: "Details")
                        InspectorGroup {
                            TextRow(label: "Name", value: studio.iconBinding(\.name, fallback: ""))
                            Divider()
                            GlyphRow(icon: icon)
                            Divider()
                            TextRow(label: "Identifier", value: studio.iconBinding(\.identifier, fallback: ""))
                            Divider()
                            VStack(spacing: 8) {
                                HStack(spacing: 8) {
                                    Button(icon.isCustom ? "Replace SVG…" : "Import SVG…") {
                                        studio.importArtwork()
                                    }
                                    .controlSize(.small)
                                    .frame(maxWidth: .infinity)

                                    if icon.isCustom {
                                        Button("Built-in glyph") {
                                            studio.mutateSelected { $0.glyph = .symbol("atom") }
                                        }
                                        .controlSize(.small)
                                        .frame(maxWidth: .infinity)
                                        .help("Go back to a bundled glyph")
                                    }
                                }
                            }
                            .padding(.horizontal, 12)
                            .padding(.vertical, 8)
                        }

                        InspectorSection(title: "Colors", hint: studio.mode.title)
                        InspectorGroup {
                            ColorRow(label: "Card", value: studio.appearanceBinding(\.card, fallback: "#000000"))
                            Divider()
                            ColorRow(label: "Glyph", value: studio.appearanceBinding(\.glyph, fallback: "#FFFFFF"))
                        }
                        .padding(.bottom, 12)
                    }
                }

                Divider()
                InspectorFooter(onDelete: { studio.deleteSelected() })
            } else {
                Text("Select an icon in Library to inspect its glyph and colors.")
                    .font(.system(size: 12))
                    .foregroundStyle(.tertiary)
                    .multilineTextAlignment(.center)
                    .padding(28)
                    .frame(maxHeight: .infinity)
            }
        }
        .id(studio.selection)
    }

    private struct GlyphRow: View {
        let icon: Icon

        var body: some View {
            HStack(spacing: 10) {
                Text("Glyph")
                    .font(.system(size: 13))
                    .frame(maxWidth: .infinity, alignment: .leading)
                GlyphView(source: icon.glyph, color: .primary, size: 16)
                    .frame(width: 30, height: 30)
                    .background(Color(nsColor: .controlBackgroundColor).opacity(0.55), in: RoundedRectangle(cornerRadius: 7, style: .continuous))
            }
            .padding(.horizontal, 12)
            .frame(height: 40)
        }
    }
}

extension Icon {
    var isCustom: Bool {
        if case .custom = glyph { return true }
        return false
    }
}
