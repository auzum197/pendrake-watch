// swift-tools-version: 5.9
import Foundation
import PackageDescription

let profile = ProcessInfo.processInfo.environment["PENDRAKE_HELPER_PROFILE"] ?? "release"
let cargoTarget = "\(Context.packageDirectory)/../../../crates/target/\(profile)"

let package = Package(
    name: "PendrakeSync",
    platforms: [.macOS(.v13)],
    targets: [
        .systemLibrary(name: "pendrake_ffiFFI"),
        .target(name: "PendrakeFFI", dependencies: ["pendrake_ffiFFI"]),
        .executableTarget(
            name: "PendrakeSync",
            dependencies: ["PendrakeFFI"],
            linkerSettings: [
                .linkedLibrary("pendrake_ffi"),
                .linkedFramework("AppKit"),
                .linkedFramework("UserNotifications"),
                .unsafeFlags([
                    "-L", cargoTarget,
                    "-Xlinker", "-rpath", "-Xlinker", cargoTarget,
                ]),
            ]
        ),
    ]
)
