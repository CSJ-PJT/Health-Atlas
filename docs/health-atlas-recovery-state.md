# Health Atlas Recovery State

CURRENT_HEAD=079f5b2
REMOTE_HEAD=4d7f4e1
SUPABASE=ACTIVE_HEALTHY
DB_ROWS=0
AUTH_USERS=0
RPC=health_get_dashboard and health_ingest_daily present; SECURITY DEFINER; restricted search_path
EDGE_FUNCTION=send-health-data ACTIVE verify_jwt=true; not redeployed in this session
WEB_ENV=root envDir wired for health-web; prebuild env assertion added; public values not printed
WEB_AUTH=email/password signup and login wired; signed-out state shows login required; no-data timestamps show none
ANDROID=health-app envDir wired to monorepo root; existing session-gated sync contract preserved; same VITE Supabase env family used
OCI_ACCESS=SSH to 161.33.17.84 closes before auth; OCI CLI/SDK not locally available for Run Command execution
OCI_DEPLOY=blocked before deployment; no production files changed
NEXT_COMMAND=restore OCI access via Run Command/console or working SSH, then deploy health-web dist only to /health/
