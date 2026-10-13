import SwiftUI

struct DesignView: View {
    @Environment(Studio.self) private var studio

    var body: some View {
        if let icon = studio.selected {
            switch studio.designLayout {
            case .hero: Hero(icon: icon)
            case .grid: EverySize(icon: icon)
            }
        } else {
            Text("Select an icon in Library to design it.")
                .font(.system(size: 12))
                .foregroundStyle(.tertiary)
        }
    }

    private struct Hero: View {
        @Environment(Studio.self) private var studio
        let icon: Icon

        var body: some View {
            VStack(spacing: 0) {
                Spacer(minLength: 0)
                IconArtwork(
                    icon: icon,
                    appearance: icon.appearance(studio.mode),
                    size: studio.master * studio.canvasZoom
                )
                Spacer(minLength: 0)
                HStack(alignment: .bottom, spacing: 12) {
                    ForEach(iconSizes, id: \.self) { size in
                        Button {
                            studio.master = size
                        } label: {
                            VStack(spacing: 4) {
                                IconFrame(
                                    icon: icon,
                                    appearance: icon.appearance(studio.mode),
                                    size: size,
                                    selected: size == studio.master
                                )
                                Text("\(Int(size))")
                                    .font(.system(size: 10))
                                    .foregroundStyle(size == studio.master ? Color.accentColor : .secondary)
                            }
                            .frame(width: 64)
                        }
                        .buttonStyle(.plain)
                    }
                }
                .padding(.bottom, 64)
            }
        }
    }

    private struct EverySize: View {
        @Environment(Studio.self) private var studio
        let icon: Icon

        var body: some View {
            LazyVGrid(columns: Array(repeating: GridItem(.fixed(150), spacing: 20), count: 3), spacing: 20) {
                ForEach(iconSizes, id: \.self) { size in
                    VStack(spacing: 8) {
                        IconFrame(icon: icon, appearance: icon.appearance(studio.mode), size: size * 2.5)
                        Text("\(Int(size)) pt")
                            .font(.system(size: 11))
                            .foregroundStyle(.secondary)
                    }
                }
            }
            .padding(.bottom, 76)
        }
    }
}

struct DesignInspectorView: View {
    @Environment(Studio.self) private var studio

    var body: some View {
        @Bindable var studio = studio

        return VStack(spacing: 0) {
            if let icon = studio.selected {
                ScrollView {
                    VStack(spacing: 0) {
                        IconArtwork(icon: icon, appearance: icon.appearance(studio.mode), size: 72)
                            .frame(maxWidth: .infinity, minHeight: 104)
                            .background(Color(nsColor: .quaternarySystemFill), in: RoundedRectangle(cornerRadius: 10, style: .continuous))
                            .padding(12)

                        HStack(spacing: 10) {
                            Text("Source")
                                .font(.system(size: 13))
                            Spacer(minLength: 0)
                            Text(icon.name)
                                .font(.system(size: 12))
                                .foregroundStyle(.secondary)
                            Image(systemName: "chevron.up.chevron.down")
                                .font(.system(size: 9))
                                .foregroundStyle(.tertiary)
                        }
                        .padding(.horizontal, 12)
                        .frame(height: 30)

                        Picker("Panel", selection: $studio.designTab) {
                            ForEach(DesignTab.allCases) { tab in
                                Image(systemName: tab.symbol).tag(tab)
                            }
                        }
                        .pickerStyle(.segmented)
                        .labelsHidden()
                        .padding(.horizontal, 12)
                        .padding(.vertical, 8)
                        .help("Size, Gradient, Highlight, Card")

                        InspectorSection(
                            title: studio.designTab.title,
                            hint: studio.designTab == .size ? nil : "\(studio.mode.title) Mode"
                        )
                        InspectorGroup {
                            switch studio.designTab {
                            case .size: sizeRows
                            case .gradient: gradientRows
                            case .highlight: highlightRows
                            case .card: cardRows
                            }
                        }
                        .padding(.bottom, 12)
                    }
                }

                Divider()
                InspectorFooter()
            } else {
                Text("Select an icon in Library to design it.")
                    .font(.system(size: 12))
                    .foregroundStyle(.tertiary)
                    .padding(28)
                    .frame(maxHeight: .infinity)
            }
        }
        .id("\(studio.selection ?? "none")-\(studio.mode.rawValue)")
    }

    @ViewBuilder private var sizeRows: some View {
        SliderRow(label: "Glyph scale", value: studio.iconBinding(\.metrics.glyphScale, fallback: 125), range: 50...150)
        Divider()
        SliderRow(label: "Corner radius", value: studio.iconBinding(\.metrics.cornerRadius, fallback: 30), range: 0...50)
    }

    @ViewBuilder private var gradientRows: some View {
        SliderRow(label: "Strength", value: studio.appearanceBinding(\.finish.strength, fallback: 200), range: 0...300)
        Divider()
        PickerRow(
            label: "Style",
            value: studio.appearanceBinding(\.finish.style, fallback: .radial),
            options: GradientStyle.allCases,
            title: \.rawValue
        )
        Divider()
        PickerRow(
            label: "Blend mode",
            value: studio.appearanceBinding(\.finish.blend, fallback: .normal),
            options: Blend.allCases,
            title: \.rawValue
        )
        Divider()
        SliderRow(label: "Offset X", value: studio.appearanceBinding(\.finish.offsetX, fallback: 0), range: -100...100)
        Divider()
        SliderRow(label: "Offset Y", value: studio.appearanceBinding(\.finish.offsetY, fallback: -50), range: -100...100)
        Divider()
        SliderRow(label: "Size X", value: studio.appearanceBinding(\.finish.sizeX, fallback: 300), range: 0...400)
        Divider()
        SliderRow(label: "Size Y", value: studio.appearanceBinding(\.finish.sizeY, fallback: 250), range: 0...400)
    }

    @ViewBuilder private var highlightRows: some View {
        ColorRow(label: "Color", value: studio.appearanceBinding(\.highlight.color, fallback: "#FFFFFF"))
        Divider()
        SliderRow(label: "Opacity", value: studio.appearanceBinding(\.highlight.opacity, fallback: 100), range: 0...100)
        Divider()
        PickerRow(
            label: "Blend mode",
            value: studio.appearanceBinding(\.highlight.blend, fallback: .normal),
            options: Blend.allCases,
            title: \.rawValue
        )
        Divider()
        SliderRow(label: "Blur", value: studio.appearanceBinding(\.highlight.blur, fallback: 0), range: 0...20)
    }

    @ViewBuilder private var cardRows: some View {
        ColorRow(label: "Color", value: studio.appearanceBinding(\.card, fallback: "#000000"))
    }
}

extension DesignTab {
    var symbol: String {
        switch self {
        case .size: "rectangle"
        case .gradient: "square.3.layers.3d.down.right"
        case .highlight: "square.dashed"
        case .card: "square.fill"
        }
    }
}
