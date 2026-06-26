import Foundation
import UserNotifications

// The service's Notifier, implemented in Swift. uniffi invokes `notify` from a
// runtime thread, which is fine for UNUserNotificationCenter. The deep link
// rides along in userInfo so the click handler can open it.
//
// `add` reports its outcome asynchronously, so wait on it and throw on failure.
// The service then leaves the txid unmarked and retries later. (A user who denied
// notifications still gets a nil error here, so denial can't be detected, only
// system and scheduling failures.) Blocking is safe: this runs on a runtime
// thread, not the UI thread, and the completion handler fires on its own queue.
final class SwiftNotifier: FfiNotifier, @unchecked Sendable {
    func notify(title: String, body: String, deepLink: String) throws {
        let content = UNMutableNotificationContent()
        content.title = title
        content.body = body
        content.userInfo = ["url": deepLink]
        let request = UNNotificationRequest(
            identifier: UUID().uuidString,
            content: content,
            trigger: nil
        )
        let sem = DispatchSemaphore(value: 0)
        var addError: Error?
        UNUserNotificationCenter.current().add(request) { error in
            addError = error
            sem.signal()
        }
        sem.wait()
        if let addError {
            throw NotifyError.Failed(message: addError.localizedDescription)
        }
    }
}
