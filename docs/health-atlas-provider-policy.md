# Health Atlas Provider Policy

Health Atlas production supports one health data provider:

- Samsung Health via Android Health Connect

Production data flow:

Samsung Health -> Health Connect -> Health Atlas Android App -> authenticated ingestion -> Supabase -> Health Web

Health Connect is used only as the Android integration layer. Health Atlas must not read all Health Connect data. Reads and aggregates must be scoped to the verified Samsung Health DataOrigin package. If the Samsung Health DataOrigin is not configured or verified, production sync must fail closed instead of falling back to mock, sample, or another provider.

Currently unsupported in production:

- Apple Health
- Garmin
- Strava
- Google Fit
- Mock/sample providers
- Manual health data provider fallback

Server ingestion remains authenticated-user owned. Client source metadata such as `samsung_health_connect` is diagnostic only and is not an ownership proof.
