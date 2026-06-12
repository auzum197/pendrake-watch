import Foundation
import UserNotifications

// The engine's Notifier, implemented in Swift. uniffi invokes `notify` from a
// runtime thread, which is fine for UNUserNotificationCenter. The deep link
// rides along in userInfo so the click handler can open it.
final class SwiftNotifier: FfiNotifier, @unchecked Sendable {
    func notify(title: String, body: String, deepLink: String) {
        let content = UNMutableNotificationContent()
        content.title = title
        content.body = body
        content.userInfo = ["url": deepLink]
        let request = UNNotificationRequest(
            identifier: UUID().uuidString,
            content: content,
            trigger: nil
        )
        UNUserNotificationCenter.current().add(request)
    }
}
