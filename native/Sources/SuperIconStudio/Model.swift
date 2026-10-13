import CoreGraphics
import SwiftUI

enum Section: String, CaseIterable, Identifiable, Hashable {
    case library
    case design

    var id: String { rawValue }

    var title: String {
        switch self {
        case .library: "Library"
        case .design: "Design"
        }
    }

    var symbol: String {
        switch self {
        case .library: "square.grid.2x2"
        case .design: "pencil"
        }
    }
}

enum AppearanceMode: String, Codable, CaseIterable, Identifiable {
    case light
    case dark

    var id: String { rawValue }
    var title: String { self == .light ? "Light" : "Dark" }
}

enum GradientStyle: String, Codable, CaseIterable, Identifiable {
    case radial = "Radial"
    case linear = "Linear"
    case angular = "Angular"

    var id: String { rawValue }
}

enum Blend: String, Codable, CaseIterable, Identifiable {
    case normal = "Normal"
    case multiply = "Multiply"
    case screen = "Screen"
    case overlay = "Overlay"
    case softLight = "Soft light"

    var id: String { rawValue }

    var shape: BlendMode {
        switch self {
        case .normal: .normal
        case .multiply: .multiply
        case .screen: .screen
        case .overlay: .overlay
        case .softLight: .softLight
        }
    }
}

/// The light that falls across the card.
struct Finish: Codable, Equatable {
    var strength: Double = 200
    var style: GradientStyle = .radial
    var blend: Blend = .normal
    var offsetX: Double = 0
    var offsetY: Double = -50
    var sizeX: Double = 300
    var sizeY: Double = 250

    /// Opacity of the light where it is strongest.
    var peak: Double { min(1, strength / 100) * 0.35 }

    /// Where the light has faded out, as a fraction of its own radius.
    var fade: Double { min(max(sizeY / 6, 10), 95) / 100 }
}

/// The rim drawn around the card.
struct Highlight: Codable, Equatable {
    var color: String = "#FFFFFF"
    var opacity: Double = 100
    var blend: Blend = .normal
    var blur: Double = 0
}

/// One icon's finish for one appearance.
struct Appearance: Codable, Equatable {
    var card: String
    var glyph: String = "#FFFFFF"
    var finish = Finish()
    var highlight = Highlight()

    static func fresh(card: String, glyph: String = "#FFFFFF", mode: AppearanceMode) -> Appearance {
        var appearance = Appearance(card: card, glyph: glyph)
        if mode == .dark {
            appearance.finish.strength = 150
            appearance.highlight.opacity = 40
        }
        return appearance
    }
}

struct Metrics: Codable, Equatable {
    var glyphScale: Double = 125
    var cornerRadius: Double = 30
}

/// Imported artwork. `svg` is the file's contents with its outer tag stripped, in a space
/// where one user unit is one point; `bounds` is the artwork inside that space.
struct Artwork: Codable, Equatable {
    var svg: String
    var canvas: CGSize
    var bounds: CGRect
}

enum GlyphSource: Codable, Equatable {
    case symbol(String)
    case custom(Artwork)
}

struct Icon: Identifiable, Codable, Equatable {
    var id: String
    var name: String
    var identifier: String
    var glyph: GlyphSource
    var metrics = Metrics()
    var light: Appearance
    var dark: Appearance

    func appearance(_ mode: AppearanceMode) -> Appearance {
        mode == .light ? light : dark
    }

    /// How much of the card the glyph covers before the glyph scale is applied.
    static let glyphBase: Double = 0.44

    func glyphSide(for size: Double) -> Double {
        size * Icon.glyphBase * metrics.glyphScale / 100
    }
}

/// Sizes the catalogue ships at, in points.
let iconSizes: [Double] = [12, 16, 24, 32, 48]
