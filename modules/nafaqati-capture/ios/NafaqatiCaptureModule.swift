import ExpoModulesCore

public class NafaqatiCaptureModule: Module {
  public func definition() -> ModuleDefinition {
    Name("NafaqatiCapture")

    // Items the Shortcuts actions left for the app (oldest first).
    AsyncFunction("drain") { () -> [[String: Any]] in
      CaptureQueue.shared.drain()
    }

    // Deletes handled items. Called only after they were parsed and saved (retention: raw text does not stay).
    AsyncFunction("acknowledge") { (ids: [String]) in
      CaptureQueue.shared.remove(ids)
    }

    // When each automation last delivered something (timestamps only).
    AsyncFunction("getStatus") { () -> [String: Any] in
      CaptureQueue.shared.status()
    }

    // The user deleted their data: remove everything still waiting.
    AsyncFunction("clearAll") {
      CaptureQueue.shared.clearAll()
    }
  }
}
