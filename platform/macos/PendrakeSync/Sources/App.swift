import AppKit
import UserNotifications

// Background-only helper (LSUIElement): no Dock icon, still a GUI-session app so
// it can post notifications and own a notification delegate. It runs the Pendrake
// service in-process via the uniffi `start` call and posts a notification for each
// service event. Clicking one opens the pendrake:// deep link, which launches or
// focuses the main Tauri app.
@main
final class AppDelegate: NSObject, NSApplicationDelegate, UNUserNotificationCenterDelegate {
    private var handle: ServiceHandle?

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
            NSLog("pendrake-sync: service started")
        } catch FfiError.AlreadyRunning {
            // A working service already owns this data dir, so this launch has
            // nothing to serve. Exit instead of lingering: a windowless accessory
            // app left alive just steals focus each time it's activated, and a pile
            // of them builds up as the GUI re-probes the socket.
            NSLog("pendrake-sync: another instance already running, exiting")
            NSApp.terminate(nil)
        } catch {
            // A genuine start failure. Sync mattered less than the GUI working, so
            // log and stay alive for a later relaunch to retry, with nothing to notify.
            NSLog("pendrake-sync: service start failed: \(error)")
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
