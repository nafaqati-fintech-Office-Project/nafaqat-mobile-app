import CryptoKit
import Foundation
import Security

/// The hand-over point between the Shortcuts actions (which run in the background, possibly with the phone locked) and
/// the app. Each captured item is one small encrypted file, so the actions never have to read or rewrite a shared file
/// and cannot clash with the app while it is draining the queue.
///
/// Privacy rules kept here:
///  - one-time passwords and verification codes are dropped before anything is written;
///  - the "test message" from the connection check is recognised and dropped, it only updates the timestamps;
///  - nothing is ever logged or printed: message text exists only inside the encrypted files.
public final class CaptureQueue {
  public static let shared = CaptureQueue()

  /// The backend's test SMS carries this marker. It never becomes a transaction.
  static let testMarker = "NFQ-TEST"

  private let fileManager = FileManager.default
  private let keyService = "com.nafaqati.capture"
  private let keyAccount = "queue-key-v1"

  private init() {}

  // MARK: Shared container

  private var groupId: String {
    if let configured = Bundle.main.object(forInfoDictionaryKey: "NafaqatiAppGroup") as? String, !configured.isEmpty {
      return configured
    }
    return "group.\(Bundle.main.bundleIdentifier ?? "com.intellivex.nafaqati")"
  }

  private var defaults: UserDefaults? { UserDefaults(suiteName: groupId) }

  private var queueDirectory: URL? {
    guard let root = fileManager.containerURL(forSecurityApplicationGroupIdentifier: groupId) else { return nil }
    let dir = root.appendingPathComponent("capture-queue", isDirectory: true)
    if !fileManager.fileExists(atPath: dir.path) {
      try? fileManager.createDirectory(
        at: dir,
        withIntermediateDirectories: true,
        attributes: [.protectionKey: FileProtectionType.completeUntilFirstUserAuthentication]
      )
    }
    return dir
  }

  // MARK: Key

  private func loadKey() -> SymmetricKey? {
    let query: [String: Any] = [
      kSecClass as String: kSecClassGenericPassword,
      kSecAttrService as String: keyService,
      kSecAttrAccount as String: keyAccount,
      kSecReturnData as String: true,
      kSecMatchLimit as String: kSecMatchLimitOne,
    ]
    var out: CFTypeRef?
    guard SecItemCopyMatching(query as CFDictionary, &out) == errSecSuccess, let data = out as? Data else { return nil }
    return SymmetricKey(data: data)
  }

  /// The key lives in the Keychain, readable after the first unlock so the actions can write while the phone is locked.
  private func key() -> SymmetricKey? {
    if let existing = loadKey() { return existing }
    let fresh = SymmetricKey(size: .bits256)
    let data = fresh.withUnsafeBytes { Data($0) }
    let add: [String: Any] = [
      kSecClass as String: kSecClassGenericPassword,
      kSecAttrService as String: keyService,
      kSecAttrAccount as String: keyAccount,
      kSecAttrAccessible as String: kSecAttrAccessibleAfterFirstUnlock,
      kSecValueData as String: data,
    ]
    let status = SecItemAdd(add as CFDictionary, nil)
    if status == errSecDuplicateItem { return loadKey() } // the app and an action created it at the same moment
    return status == errSecSuccess ? fresh : nil
  }

  // MARK: Writing (used by the Shortcuts actions)

  public func appendBankMessage(text: String, sender: String?) {
    let now = Date()
    defaults?.set(now.timeIntervalSince1970 * 1000, forKey: "lastBankAt")
    if text.contains(CaptureQueue.testMarker) {
      defaults?.set(now.timeIntervalSince1970 * 1000, forKey: "lastTestAt")
      return
    }
    if CaptureQueue.looksLikeSecretCode(text) { return }
    var item: [String: Any] = ["kind": "bank", "text": text]
    if let sender = sender, !sender.isEmpty { item["sender"] = sender }
    write(item, at: now)
  }

  /// All three values may be empty and the amount may be zero: Wallet sometimes sends them like that. Never fails.
  public func appendCardPayment(merchant: String?, amount: String?, card: String?) {
    let now = Date()
    defaults?.set(now.timeIntervalSince1970 * 1000, forKey: "lastWalletAt")
    var item: [String: Any] = ["kind": "wallet"]
    if let merchant = merchant { item["merchant"] = merchant }
    if let amount = amount { item["amount"] = amount }
    if let card = card { item["card"] = card }
    write(item, at: now)
  }

  private func write(_ item: [String: Any], at date: Date) {
    guard let dir = queueDirectory, let key = key() else { return }
    var payload = item
    payload["receivedAt"] = Int64(date.timeIntervalSince1970 * 1000)
    guard let json = try? JSONSerialization.data(withJSONObject: payload),
          let sealed = try? AES.GCM.seal(json, using: key).combined else { return }
    let name = "\(Int64(date.timeIntervalSince1970 * 1000))-\(UUID().uuidString).item"
    try? sealed.write(to: dir.appendingPathComponent(name), options: [.completeFileProtectionUntilFirstUserAuthentication, .atomic])
  }

  // MARK: Reading (used by the app)

  /// Everything waiting, oldest first. Each item carries its file name as `id`; hand the ids back to `remove` once the
  /// items are safely handled, so an app that is killed half way through loses nothing.
  public func drain() -> [[String: Any]] {
    guard let dir = queueDirectory, let key = key(),
          let names = try? fileManager.contentsOfDirectory(atPath: dir.path) else { return [] }
    var items: [[String: Any]] = []
    for name in names.filter({ $0.hasSuffix(".item") }).sorted() {
      let url = dir.appendingPathComponent(name)
      guard let data = try? Data(contentsOf: url),
            let box = try? AES.GCM.SealedBox(combined: data),
            let plain = try? AES.GCM.open(box, using: key),
            var item = (try? JSONSerialization.jsonObject(with: plain)) as? [String: Any] else {
        try? fileManager.removeItem(at: url) // unreadable (damaged or from an old key): nothing to recover
        continue
      }
      item["id"] = name
      items.append(item)
    }
    return items
  }

  public func remove(_ ids: [String]) {
    guard let dir = queueDirectory else { return }
    for id in ids where !id.contains("/") && id.hasSuffix(".item") {
      try? fileManager.removeItem(at: dir.appendingPathComponent(id))
    }
  }

  public func clearAll() {
    guard let dir = queueDirectory else { return }
    try? fileManager.removeItem(at: dir)
  }

  /// Timestamps only (ms since 1970, 0 when never). No message content.
  public func status() -> [String: Any] {
    let d = defaults
    return [
      "lastBankAt": d?.double(forKey: "lastBankAt") ?? 0,
      "lastWalletAt": d?.double(forKey: "lastWalletAt") ?? 0,
      "lastTestAt": d?.double(forKey: "lastTestAt") ?? 0,
      "available": queueDirectory != nil,
    ]
  }

  // MARK: One-time passwords

  private static let secretWords = try! NSRegularExpression(
    pattern: #"\b(?:otp|one[- ]time|verification|passcode|cvv|pin)\b|رمز\s*(?:التحقق|سري|الدخول)|كلمة\s*(?:المرور|السر)\s*المؤقتة|رمز\s*مؤقت"#,
    options: [.caseInsensitive]
  )
  private static let codeNearWord = try! NSRegularExpression(
    pattern: #"\b(?:code|رمز)\b[^.]{0,30}?\b\d{4,8}\b|\b\d{4,8}\s+is\s+(?:your|the)\b"#,
    options: [.caseInsensitive]
  )

  /// Conservative on purpose: a code that is dropped by mistake costs one transaction, a code that is kept is a leak.
  static func looksLikeSecretCode(_ text: String) -> Bool {
    let range = NSRange(text.startIndex..., in: text)
    return secretWords.firstMatch(in: text, range: range) != nil || codeNearWord.firstMatch(in: text, range: range) != nil
  }
}
