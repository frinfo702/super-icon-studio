import SwiftUI

extension Color {
    init(hex: String) {
        let cleaned = hex.trimmingCharacters(in: CharacterSet(charactersIn: "#")).uppercased()
        var value: UInt64 = 0
        Scanner(string: cleaned).scanHexInt64(&value)

        let red, green, blue: Double
        if cleaned.count == 3 {
            red = Double((value >> 8) & 0xF) / 15
            green = Double((value >> 4) & 0xF) / 15
            blue = Double(value & 0xF) / 15
        } else {
            red = Double((value >> 16) & 0xFF) / 255
            green = Double((value >> 8) & 0xFF) / 255
            blue = Double(value & 0xFF) / 255
        }
        self.init(.sRGB, red: red, green: green, blue: blue, opacity: 1)
    }

    var hexString: String {
        guard let color = NSColor(self).usingColorSpace(.sRGB) else { return "#000000" }
        let red = Int((color.redComponent * 255).rounded())
        let green = Int((color.greenComponent * 255).rounded())
        let blue = Int((color.blueComponent * 255).rounded())
        return String(format: "#%02X%02X%02X", red, green, blue)
    }
}

func normalisedHex(_ input: String) -> String? {
    let cleaned = input.trimmingCharacters(in: .whitespaces).replacingOccurrences(of: "#", with: "")
    guard cleaned.allSatisfy(\.isHexDigit), cleaned.count == 3 || cleaned.count == 6 else { return nil }
    if cleaned.count == 3 {
        return "#" + cleaned.map { "\($0)\($0)" }.joined().uppercased()
    }
    return "#" + cleaned.uppercased()
}
