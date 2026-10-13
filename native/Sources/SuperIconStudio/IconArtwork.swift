import AppKit
import SwiftUI

/// How far past its own box an icon's finish reaches: the highlight rim plus room for the
/// drop shadow. Frames that draw a border around an icon size themselves with this, so the
/// card can never paint over the frame.
func frameInset(_ size: CGFloat) -> CGFloat {
    let ring = max(1, size * 0.032)
    return (ring + size * 0.045 + 2).rounded(.up)
}

/// An icon, drawn the way the catalogue renders it.
struct IconArtwork: View {
    let icon: Icon
    let appearance: Appearance
    let size: CGFloat

    var body: some View {
        card
            .frame(width: size, height: size)
            .clipShape(shape)
            .background { rim }
            .shadow(color: .black.opacity(size > 40 ? 0.16 : 0.1), radius: size * 0.045, y: size * 0.045)
    }

    private var radius: CGFloat { size * icon.metrics.cornerRadius / 100 }
    private var ring: CGFloat { max(1, size * 0.032) }
    private var shape: RoundedRectangle { RoundedRectangle(cornerRadius: radius, style: .continuous) }

    private var card: some View {
        ZStack {
            shape.fill(
                Color(hex: appearance.card)
                    .shadow(.inner(color: .black.opacity(0.07), radius: max(1, size * 0.04)))
            )
            finish
            GlyphView(source: icon.glyph, color: Color(hex: appearance.glyph), size: icon.glyphSide(for: size))
        }
    }

    @ViewBuilder private var finish: some View {
        let finishing = appearance.finish
        let stops = Gradient(stops: [
            .init(color: .white.opacity(finishing.peak), location: 0),
            .init(color: .white.opacity(0), location: finishing.fade),
        ])
        let center = UnitPoint(x: (50 + finishing.offsetX) / 100, y: (50 + finishing.offsetY) / 100)

        Group {
            switch finishing.style {
            case .radial:
                let radiusX = finishing.sizeX / 100 * size
                let radiusY = finishing.sizeY / 100 * size
                RadialGradient(gradient: stops, center: center, startRadius: 0, endRadius: max(radiusX, 1))
                    .scaleEffect(x: 1, y: radiusX > 0 ? radiusY / radiusX : 1, anchor: center)

            case .linear:
                let radians = (180 + finishing.offsetX) * .pi / 180
                let dx = sin(radians)
                let dy = -cos(radians)
                let length = abs(dx) + abs(dy)
                let cx = (50 + finishing.offsetX) / 100
                let cy = (50 + finishing.offsetY) / 100
                LinearGradient(
                    gradient: stops,
                    startPoint: UnitPoint(x: cx - dx * length / 2, y: cy - dy * length / 2),
                    endPoint: UnitPoint(x: cx + dx * length / 2, y: cy + dy * length / 2)
                )

            case .angular:
                AngularGradient(gradient: stops, center: center, angle: .degrees(finishing.offsetX * 3.6))
            }
        }
        .blendMode(finishing.blend.shape)
    }

    private var rim: some View {
        RoundedRectangle(cornerRadius: radius + ring, style: .continuous)
            .fill(Color(hex: appearance.highlight.color).opacity(appearance.highlight.opacity / 100))
            .padding(-ring)
            .blur(radius: appearance.highlight.blur * size / 72)
            .blendMode(appearance.highlight.blend.shape)
    }
}

/// An icon placed in a frame that can show selection without the card covering it.
struct IconFrame: View {
    let icon: Icon
    let appearance: Appearance
    let size: CGFloat
    var selected = false

    var body: some View {
        IconArtwork(icon: icon, appearance: appearance, size: size)
            .padding(frameInset(size))
            .background {
                if selected {
                    RoundedRectangle(cornerRadius: 9, style: .continuous)
                        .strokeBorder(Color.accentColor, lineWidth: 2)
                }
            }
    }
}

struct GlyphView: View {
    let source: GlyphSource
    let color: Color
    let size: CGFloat

    var body: some View {
        switch source {
        case .symbol(let name):
            Image(systemName: name)
                .font(.system(size: size))
                .foregroundStyle(color)
                .frame(width: size, height: size)

        case .custom(let artwork):
            ArtworkCanvas(artwork: artwork, tint: NSColor(color))
                .frame(width: size, height: size)
        }
    }
}

/// Draws imported artwork, cropped to the bounds measured at import, tinted with the glyph
/// colour and centred in its box.
struct ArtworkCanvas: NSViewRepresentable {
    let artwork: Artwork
    let tint: NSColor

    func makeNSView(context: Context) -> ArtworkCanvasView {
        let view = ArtworkCanvasView()
        view.show(artwork: artwork, tint: tint)
        return view
    }

    func updateNSView(_ view: ArtworkCanvasView, context: Context) {
        view.show(artwork: artwork, tint: tint)
    }
}

final class ArtworkCanvasView: NSView {
    private var image: NSImage?
    private var source: NSRect = .zero
    private var tint: NSColor = .white
    private var rendered: NSImage?

    func show(artwork: Artwork, tint: NSColor) {
        let reloaded = image == nil || source.isEmpty
        if reloaded {
            image = NSImage(data: Data("<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 \(artwork.canvas.width) \(artwork.canvas.height)\">\(artwork.svg)</svg>".utf8))
            // Artwork bounds are measured top-down, like the SVG file itself; AppKit draws y-up.
            source = NSRect(
                x: artwork.bounds.minX,
                y: artwork.canvas.height - artwork.bounds.maxY,
                width: artwork.bounds.width,
                height: artwork.bounds.height
            )
        }
        if reloaded || self.tint != tint {
            self.tint = tint
            rendered = image.map { $0.tinted(tint) }
        }
        needsDisplay = true
    }

    override func draw(_ dirtyRect: NSRect) {
        guard let rendered, let context = NSGraphicsContext.current?.cgContext, source.width > 0 else { return }

        var width = bounds.width
        var height = width * source.height / source.width
        if height > bounds.height {
            height = bounds.height
            width = height * source.width / source.height
        }
        let target = NSRect(
            x: bounds.midX - width / 2,
            y: bounds.midY - height / 2,
            width: width,
            height: height
        )
        context.interpolationQuality = .high
        rendered.draw(in: target, from: source, operation: .sourceOver, fraction: 1)
    }
}

extension NSImage {
    /// Paints the artwork in a single colour, keeping its alpha.
    func tinted(_ color: NSColor) -> NSImage {
        let copy = NSImage(size: size)
        copy.lockFocus()
        color.set()
        let rect = NSRect(origin: .zero, size: size)
        draw(in: rect, from: .zero, operation: .sourceOver, fraction: 1)
        rect.fill(using: .sourceAtop)
        copy.unlockFocus()
        return copy
    }
}
