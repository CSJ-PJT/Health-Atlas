# AGENTS

## Health App

- This app is the source of truth for raw health data and provider synchronization.
- Preserve existing social, admin, analytics, AI coach, and monitoring flows.
- Game integration must remain lightweight and safe.

## Game Link

- Expose only derived game-safe parameters.
- Never route raw `health_data` directly into the standalone game app.
- Keep connect/disconnect, mission preview, reward sync, and derived stat preview readable and simple.
- Treat private-product as a separate deployable product. The health app should launch or link to it, not embed the full standalone game loop.
- Preserve Pulse Frontier and the lightweight entertainment hub here.
