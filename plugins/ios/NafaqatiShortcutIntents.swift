import AppIntents
import NafaqatiCapture

// The two actions that appear in Apple's Shortcuts app once Nafaqati is installed. They only save what they are given and
// return, so they finish well inside Shortcuts' time limit and never open the app, show a dialog or send a notification.
// Parsing, filtering and the network all happen later, inside the app (see src/features/iosCapture).

@available(iOS 17.0, *)
struct LogBankMessageIntent: AppIntent {
  static var title: LocalizedStringResource = "intent.bank.title"
  static var description = IntentDescription("intent.bank.description")
  static var openAppWhenRun: Bool = false

  @Parameter(title: "intent.bank.message")
  var message: String

  @Parameter(title: "intent.bank.sender")
  var sender: String?

  func perform() async throws -> some IntentResult {
    CaptureQueue.shared.appendBankMessage(text: message, sender: sender)
    return .result()
  }
}

// The Wallet "Transaction" trigger sometimes passes an empty merchant or an amount of zero, so every value is optional
// text: whatever arrives is stored and the app decides what to do with it.
@available(iOS 17.0, *)
struct LogCardPaymentIntent: AppIntent {
  static var title: LocalizedStringResource = "intent.card.title"
  static var description = IntentDescription("intent.card.description")
  static var openAppWhenRun: Bool = false

  @Parameter(title: "intent.card.merchant")
  var merchant: String?

  @Parameter(title: "intent.card.amount")
  var amount: String?

  @Parameter(title: "intent.card.card")
  var card: String?

  func perform() async throws -> some IntentResult {
    CaptureQueue.shared.appendCardPayment(merchant: merchant, amount: amount, card: card)
    return .result()
  }
}
