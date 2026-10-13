import SwiftUI

/// A named block of rows, with the appearance it edits on the right.
struct InspectorSection: View {
    let title: String
    var hint: String?

    var body: some View {
        HStack(spacing: 8) {
            Text(title)
            Spacer(minLength: 0)
            if let hint {
                Text(hint).foregroundStyle(.tertiary)
            }
        }
        .font(.system(size: 11, weight: .medium))
        .foregroundStyle(.secondary)
        .padding(.horizontal, 12)
        .padding(.top, 14)
        .padding(.bottom, 5)
    }
}

/// Rows on a tinted card, separated by hairlines.
struct InspectorGroup<Content: View>: View {
    @ViewBuilder var content: Content

    var body: some View {
        VStack(spacing: 0) {
            content
        }
        .background(Color(nsColor: .quaternarySystemFill), in: RoundedRectangle(cornerRadius: 9, style: .continuous))
        .padding(.horizontal, 12)
    }
}

struct SliderRow: View {
    let label: String
    @Binding var value: Double
    let range: ClosedRange<Double>
    var suffix = "%"

    var body: some View {
        HStack(spacing: 10) {
            Text(label)
                .font(.system(size: 13))
                .lineLimit(1)
                .frame(maxWidth: .infinity, alignment: .leading)
            Slider(value: $value, in: range)
                .controlSize(.small)
                .frame(width: 76)
            Text("\(Int(value.rounded()))\(suffix)")
                .font(.system(size: 12).monospacedDigit())
                .foregroundStyle(.secondary)
                .frame(width: 42, alignment: .trailing)
        }
        .padding(.horizontal, 12)
        .frame(height: 34)
    }
}

struct ToggleRow: View {
    let label: String
    @Binding var value: Bool

    var body: some View {
        HStack(spacing: 10) {
            Text(label)
                .font(.system(size: 13))
                .frame(maxWidth: .infinity, alignment: .leading)
            Toggle("", isOn: $value)
                .labelsHidden()
                .toggleStyle(.switch)
                .controlSize(.mini)
        }
        .padding(.horizontal, 12)
        .frame(height: 34)
    }
}

struct PickerRow<Value: Hashable & Identifiable>: View {
    let label: String
    @Binding var value: Value
    let options: [Value]
    let title: (Value) -> String

    var body: some View {
        HStack(spacing: 10) {
            Text(label)
                .font(.system(size: 13))
                .frame(maxWidth: .infinity, alignment: .leading)
            Picker("", selection: $value) {
                ForEach(options) { option in
                    Text(title(option)).tag(option)
                }
            }
            .labelsHidden()
            .pickerStyle(.menu)
            .fixedSize()
        }
        .padding(.horizontal, 12)
        .frame(height: 34)
    }
}

/// A hex field and a colour well, both editing the same value.
struct ColorRow: View {
    let label: String
    @Binding var value: String
    @State private var draft = ""

    private var color: Binding<Color> {
        Binding(get: { Color(hex: value) }, set: { value = $0.hexString })
    }

    var body: some View {
        HStack(spacing: 8) {
            Text(label)
                .font(.system(size: 13))
                .frame(maxWidth: .infinity, alignment: .leading)
            TextField("", text: $draft)
                .textFieldStyle(.plain)
                .multilineTextAlignment(.center)
                .font(.system(size: 12).monospacedDigit())
                .frame(width: 76)
                .padding(.vertical, 3)
                .background(Color(nsColor: .controlBackgroundColor).opacity(0.55), in: RoundedRectangle(cornerRadius: 6))
                .onAppear { draft = value }
                .onChange(of: value) { _, new in draft = new }
                .onChange(of: draft) { _, new in
                    if let hex = normalisedHex(new) { value = hex }
                }
                .onSubmit { draft = value }
            ColorPicker("", selection: color, supportsOpacity: false)
                .labelsHidden()
        }
        .padding(.horizontal, 12)
        .frame(height: 34)
    }
}

struct TextRow: View {
    let label: String
    @Binding var value: String

    var body: some View {
        HStack(spacing: 8) {
            Text(label)
                .font(.system(size: 13))
                .frame(maxWidth: .infinity, alignment: .leading)
            TextField("", text: $value)
                .textFieldStyle(.plain)
                .multilineTextAlignment(.center)
                .font(.system(size: 12))
                .frame(width: max(72, CGFloat(value.count) * 7 + 24))
                .padding(.vertical, 3)
                .background(Color(nsColor: .controlBackgroundColor).opacity(0.55), in: RoundedRectangle(cornerRadius: 6))
        }
        .padding(.horizontal, 12)
        .frame(height: 34)
    }
}

/// The Revert / Save pair, and the delete button when there is one.
struct InspectorFooter: View {
    @Environment(Studio.self) private var studio
    var onDelete: (() -> Void)?

    var body: some View {
        HStack(spacing: 8) {
            if let onDelete {
                Button(action: onDelete) {
                    Image(systemName: "trash")
                }
                .buttonStyle(.bordered)
                .controlSize(.small)
                .help("Delete icon")
            }
            Button("Revert") { studio.revert() }
                .buttonStyle(.bordered)
                .controlSize(.small)
                .frame(maxWidth: .infinity)
                .disabled(!studio.dirty)
            Button("Save") { studio.save() }
                .buttonStyle(.borderedProminent)
                .controlSize(.small)
                .frame(maxWidth: .infinity)
                .disabled(!studio.dirty)
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 10)
    }
}
