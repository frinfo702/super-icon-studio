import AppKit
import Foundation
import SwiftUI

@MainActor
enum SVGExport {
    /// Writes the finished icon as a standalone SVG: rim, card, finish and glyph. The drop
    /// shadow is drawn with an SVG filter. Artwork imported as SVG is embedded as vectors;
    /// SF Symbols have no path data to read, so those are embedded as a raster image.
    static func markup(for icon: Icon, mode: AppearanceMode, size: Double) -> String {
        let appearance = icon.appearance(mode)
        let ring = max(1, size * 0.032)
        let total = size + ring * 2
        let radius = size * icon.metrics.cornerRadius / 100
        let shadow = size * 0.045
        let card = "<rect x=\"\(svgNumber(ring))\" y=\"\(svgNumber(ring))\" width=\"\(svgNumber(size))\" height=\"\(svgNumber(size))\" rx=\"\(svgNumber(radius))\" fill=\"\(appearance.card)\"/>"

        return [
            "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"\(svgNumber(size))\" height=\"\(svgNumber(size))\" viewBox=\"0 0 \(svgNumber(total)) \(svgNumber(total))\">",
            "<title>\(icon.name)</title>",
            "<defs>",
            finishMarkup(appearance.finish, size: size, offset: ring),
            "<filter id=\"shadow\" x=\"-25%\" y=\"-25%\" width=\"150%\" height=\"160%\">",
            "<feDropShadow dx=\"0\" dy=\"\(svgNumber(shadow))\" stdDeviation=\"\(svgNumber(shadow))\" flood-color=\"#000000\" flood-opacity=\"0.16\"/>",
            "</filter>",
            "</defs>",
            "<g filter=\"url(#shadow)\">\(card)</g>",
            "<rect width=\"\(svgNumber(total))\" height=\"\(svgNumber(total))\" rx=\"\(svgNumber(radius + ring))\" fill=\"\(appearance.highlight.color)\" fill-opacity=\"\(svgNumber(appearance.highlight.opacity / 100))\"/>",
            card,
            "<rect x=\"\(svgNumber(ring))\" y=\"\(svgNumber(ring))\" width=\"\(svgNumber(size))\" height=\"\(svgNumber(size))\" rx=\"\(svgNumber(radius))\" fill=\"url(#finish)\"/>",
            glyphMarkup(icon: icon, colour: appearance.glyph, side: icon.glyphSide(for: size), center: total / 2),
            "</svg>",
        ].joined()
    }

    private static func finishMarkup(_ finish: Finish, size: Double, offset: Double) -> String {
        let stops = "<stop offset=\"0\" stop-color=\"#FFFFFF\" stop-opacity=\"\(svgNumber(finish.peak))\"/>"
            + "<stop offset=\"\(svgNumber(finish.fade))\" stop-color=\"#FFFFFF\" stop-opacity=\"0\"/>"

        if finish.style == .linear {
            let radians = (180 + finish.offsetX) * .pi / 180
            let dx = sin(radians)
            let dy = -cos(radians)
            let length = abs(dx) * size + abs(dy) * size
            let x1 = (50 + finish.offsetX) / 100 * size - dx * length / 2 + offset
            let y1 = (50 + finish.offsetY) / 100 * size - dy * length / 2 + offset
            return "<linearGradient id=\"finish\" gradientUnits=\"userSpaceOnUse\""
                + " x1=\"\(svgNumber(x1))\" y1=\"\(svgNumber(y1))\""
                + " x2=\"\(svgNumber(x1 + dx * length))\" y2=\"\(svgNumber(y1 + dy * length))\">\(stops)</linearGradient>"
        }

        // Angular gradients have no SVG 1.1 equivalent; they export as the radial shape.
        let cx = (50 + finish.offsetX) / 100 * size + offset
        let cy = (50 + finish.offsetY) / 100 * size + offset
        let radiusX = finish.sizeX / 100 * size
        let radiusY = finish.sizeY / 100 * size
        let squash = radiusX > 0 ? radiusY / radiusX : 1
        let transform = "translate(\(svgNumber(cx)) \(svgNumber(cy))) scale(1 \(svgNumber(squash))) translate(\(svgNumber(-cx)) \(svgNumber(-cy)))"
        return "<radialGradient id=\"finish\" gradientUnits=\"userSpaceOnUse\""
            + " cx=\"\(svgNumber(cx))\" cy=\"\(svgNumber(cy))\" r=\"\(svgNumber(radiusX))\""
            + " gradientTransform=\"\(transform)\">\(stops)</radialGradient>"
    }

    private static func glyphMarkup(icon: Icon, colour: String, side: Double, center: Double) -> String {
        switch icon.glyph {
        case .custom(let artwork):
            let box = max(artwork.bounds.width, artwork.bounds.height) / SVG.fill
            guard box > 0 else { return "" }
            let scale = side / box
            let x = center - artwork.bounds.midX * scale
            let y = center - artwork.bounds.midY * scale
            return "<g transform=\"translate(\(svgNumber(x)) \(svgNumber(y))) scale(\(svgNumber(scale)))\" color=\"\(colour)\" fill=\"currentColor\">\(artwork.svg)</g>"

        case .symbol(let name):
            guard let png = symbolPNG(name: name, side: side, colour: colour) else { return "" }
            let x = center - side / 2
            return "<image x=\"\(svgNumber(x))\" y=\"\(svgNumber(x))\" width=\"\(svgNumber(side))\" height=\"\(svgNumber(side))\" href=\"data:image/png;base64,\(png.base64EncodedString())\"/>"
        }
    }

    private static func symbolPNG(name: String, side: Double, colour: String) -> Data? {
        let pixels = max(16, Int((side * 4).rounded()))
        let configuration = NSImage.SymbolConfiguration(pointSize: CGFloat(pixels), weight: .regular)
        guard let symbol = NSImage(systemSymbolName: name, accessibilityDescription: nil)?
            .withSymbolConfiguration(configuration)
        else { return nil }

        guard let rep = NSBitmapImageRep(
            bitmapDataPlanes: nil,
            pixelsWide: pixels,
            pixelsHigh: pixels,
            bitsPerSample: 8,
            samplesPerPixel: 4,
            hasAlpha: true,
            isPlanar: false,
            colorSpaceName: .deviceRGB,
            bytesPerRow: 0,
            bitsPerPixel: 0
        ) else { return nil }

        NSGraphicsContext.saveGraphicsState()
        NSGraphicsContext.current = NSGraphicsContext(bitmapImageRep: rep)
        let box = NSRect(x: 0, y: 0, width: pixels, height: pixels)
        symbol.draw(in: box, from: .zero, operation: .sourceOver, fraction: 1)
        NSColor(Color(hex: colour)).set()
        box.fill(using: .sourceAtop)
        NSGraphicsContext.restoreGraphicsState()

        return rep.representation(using: .png, properties: [:])
    }

    static func write(icon: Icon, mode: AppearanceMode, size: Double) {
        let panel = NSSavePanel()
        panel.nameFieldStringValue = "\(icon.identifier)-\(mode.rawValue).svg"
        panel.allowedContentTypes = [.svg]
        panel.canCreateDirectories = true
        guard panel.runModal() == .OK, let url = panel.url else { return }
        try? markup(for: icon, mode: mode, size: size).write(to: url, atomically: true, encoding: .utf8)
    }
}
