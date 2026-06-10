---
"sanding-monitoring-web-app": minor
---

Support `rdk:service:video` video stores in the video store dropdown alongside generic components (`rdk:component:generic`). The selector now constructs the SDK client that matches the selected resource's type — `VideoClient` for video services, `GenericComponentClient` for generic components — so `doCommand` routes to the correct gRPC API.

This required upgrading `@viamrobotics/sdk` from `^0.57.0` to `^0.72.0`: the video service runtime client (`VideoClient`) did not exist in 0.57.0, which only shipped its type stubs.
