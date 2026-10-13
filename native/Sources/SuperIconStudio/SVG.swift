import AppKit
import Foundation

func svgNumber(_ value: Double) -> String {
    var text = String(format: "%.2f", value)
    guard text.contains(".") else { return text }
    while text.hasSuffix("0") { text.removeLast() }
    if text.hasSuffix(".") { text.removeLast() }
    return text
}

@MainActor
enum SVG {
    /// How much of its box bundled glyph art fills; imported art is fitted to the same.
    static let fill: CGFloat = 0.833

    static func artwork(from url: URL) -> GlyphSource? {
        guard let contents = try? String(contentsOf: url, encoding: .utf8) else { return nil }
        return artwork(from: contents)
    }

    static func artwork(from contents: String) -> GlyphSource? {
        guard let opening = contents.range(of: "<svg"),
              let openingEnd = contents[opening.lowerBound...].firstIndex(of: ">"),
              let closing = contents.range(of: "</svg>", options: .backwards),
              openingEnd < closing.lowerBound
        else { return nil }

        let attributes = String(contents[opening.lowerBound...openingEnd]).lowercased()
        let canvas = canvasSize(attributes: attributes)
        let body = monochrome(String(contents[contents.index(after: openingEnd)..<closing.lowerBound]))

        let wrapped = "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 \(canvas.width) \(canvas.height)\">\(body)</svg>"
        guard let image = NSImage(data: Data(wrapped.utf8)),
              let bounds = artworkBounds(of: image)
        else { return nil }

        return .custom(Artwork(svg: body, canvas: canvas, bounds: bounds))
    }

    /// Reads the coordinate space the artwork is drawn in: the viewBox when there is one,
    /// otherwise the file's own width and height.
    private static func canvasSize(attributes: String) -> CGSize {
        func number(_ name: String) -> CGFloat? {
            guard let match = attributes.range(of: "\(name)=\"") else { return nil }
            let rest = attributes[match.upperBound...]
            let value = rest.prefix { $0.isNumber || $0 == "." || $0 == "-" }
            return value.isEmpty ? nil : Double(value).map { CGFloat($0) }
        }

        if let viewBox = attributes.range(of: "viewbox=\"") {
            let parts = attributes[viewBox.upperBound...]
                .prefix { $0 != "\"" }
                .split(separator: " ")
                .compactMap { Double($0) }
            if parts.count == 4, parts[2] > 0, parts[3] > 0 {
                return CGSize(width: parts[2], height: parts[3])
            }
        }
        return CGSize(width: number("width") ?? 100, height: number("height") ?? 100)
    }

    /// The app draws one glyph colour, so imported art is re-pointed at `currentColor`.
    private static func monochrome(_ body: String) -> String {
        let pattern = try! NSRegularExpression(pattern: "(fill|stroke)=\"(?!none|url|currentColor)([^\"]+)\"")
        return pattern.stringByReplacingMatches(
            in: body,
            range: NSRange(body.startIndex..., in: body),
            withTemplate: "$1=\"currentColor\""
        )
    }

    /// Measures artwork by rasterising it and taking the bounding box of the pixels it covers.
    /// Returns bounds in the artwork's own top-down coordinate space.
    static func artworkBounds(of image: NSImage, longestSide: CGFloat = 512) -> CGRect? {
        let size = image.size
        guard size.width > 0, size.height > 0 else { return nil }

        let scale = min(2, longestSide / max(size.width, size.height))
        let pixelWidth = max(8, Int((size.width * scale).rounded()))
        let pixelHeight = max(8, Int((size.height * scale).rounded()))
        guard let rep = NSBitmapImageRep(
            bitmapDataPlanes: nil,
            pixelsWide: pixelWidth,
            pixelsHigh: pixelHeight,
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
        image.draw(
            in: NSRect(x: 0, y: 0, width: pixelWidth, height: pixelHeight),
            from: .zero,
            operation: .sourceOver,
            fraction: 1
        )
        NSGraphicsContext.restoreGraphicsState()

        guard let pixels = rep.bitmapData else { return nil }
        let samples = rep.samplesPerPixel
        var minX = pixelWidth
        var minY = pixelHeight
        var maxX = -1
        var maxY = -1

        for y in 0..<pixelHeight {
            let row = pixels + y * rep.bytesPerRow
            for x in 0..<pixelWidth where row[x * samples + 3] > 5 {
                minX = min(minX, x)
                maxX = max(maxX, x)
                minY = min(minY, y)
                maxY = max(maxY, y)
            }
        }
        guard maxX >= minX, maxY >= minY else { return nil }

        return CGRect(
            x: CGFloat(minX) / scale,
            y: CGFloat(minY) / scale,
            width: CGFloat(maxX - minX + 1) / scale,
            height: CGFloat(maxY - minY + 1) / scale
        )
    }
}
