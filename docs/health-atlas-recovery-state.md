# Health Atlas Recovery State

CURRENT_HEAD=8c532cc
REMOTE_HEAD=4d7f4e1
SUPABASE=ACTIVE_HEALTHY
DB_ROWS=0
AUTH_USERS=0
RPC=health_get_dashboard and health_ingest_daily present; SECURITY DEFINER; restricted search_path
EDGE_FUNCTION=send-health-data ACTIVE verify_jwt=true; not redeployed in this session
WEB_ENV=root envDir wired for health-web; prebuild env assertion added; public values not printed
WEB_AUTH=email/password signup and login wired; signed-out state shows login required; no-data timestamps show none
ANDROID=health-app envDir wired; session-gated sync preserved; production provider locked to Samsung Health
ACTIVE_PROVIDER=SAMSUNG_HEALTH
INTEGRATION_LAYER=ANDROID_HEALTH_CONNECT
NON_SAMSUNG_PROVIDER_RUNTIME=DISABLED
SAMSUNG_DATA_ORIGIN_FILTER=PASS_STATIC_NATIVE_BUILD_BLOCKED_BY_DISK
SAMSUNG_PERMISSION=PASS_STATIC_DEVICE_PENDING
SAMSUNG_FIRST_SYNC=PENDING
OCI_ACCESS=SSH to 161.33.17.84 closes before auth; OCI CLI/SDK not locally available for Run Command execution
OCI_DEPLOY=blocked before deployment; no production files changed
ANDROID_NATIVE_BUILD=BLOCKED_DISK_SPACE
NEXT_COMMAND=free disk space or repair Gradle cache, run android assembleDebug, verify Samsung origin on device, then deploy health-web dist only to /health/
