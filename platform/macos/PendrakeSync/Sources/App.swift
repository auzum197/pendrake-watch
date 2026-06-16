import AppKit
import UserNotifications

// Background-only helper (LSUIElement): no Dock icon, still a GUI-session app so
// it can post notifications and own a notification delegate. It runs the Pendrake
// engine in-process via the uniffi `start` call and posts a notification for each
// engine event. Clicking one opens the pendrake:// deep link, which launches or
// focuses the main Tauri app.
@main
final class AppDelegate: NSObject, NSApplicationDelegate, UNUserNotificationCenterDelegate {
    private var handle: EngineHandle?

    static func main() {
        let app = NSApplication.shared
        app.setActivationPolicy(.accessory)
        let delegate = AppDelegate()
        app.delegate = delegate
        app.run()
    }

    func applicationDidFinishLaunching(_ note: Notification) {
        let center = UNUserNotificationCenter.current()
        center.delegate = self
        center.requestAuthorization(options: [.alert, .sound]) { granted, error in
            NSLog("pendrake-sync: notification authorization granted=\(granted) error=\(String(describing: error))")
        }

        do {
            handle = try start(config: Config(dataDir: nil), notifier: SwiftNotifier())
            NSLog("pendrake-sync: engine started")
        } catch {
            // Sync still mattered less than the GUI working; log and stay alive so
            // a later relaunch can retry, but there's nothing to notify about.
            NSLog("pendrake-sync: engine start failed: \(error)")
        }
    }

    // Show the banner even though this helper is the foreground app for the alert.
    func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        willPresent notification: UNNotification,
        withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void
    ) {
        completionHandler([.banner, .sound])
    }

    // Click: open the deep link carried in the notification, then let go.
    func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        didReceive response: UNNotificationResponse,
        withCompletionHandler completionHandler: @escaping () -> Void
    ) {
        if let raw = response.notification.request.content.userInfo["url"] as? String,
           let url = URL(string: raw) {
            NSWorkspace.shared.open(url)
        }
        completionHandler()
    }
}
