// swift-tools-version: 6.2
import PackageDescription

let package = Package(
    name: "SuperIconStudio",
    platforms: [.macOS(.v14)],
    targets: [
        .executableTarget(
            name: "SuperIconStudio",
            path: "Sources/SuperIconStudio"
        )
    ]
)
