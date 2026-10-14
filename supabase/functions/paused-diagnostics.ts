// Legacy diagnostics are intentionally paused. The original sources are backed up locally.
// Production features use the guarded football-data / sync-football endpoints instead.
Deno.serve(() => Response.json({error:'Diagnostic disabled to preserve the shared GOAL request quota',providerRequests:0},{status:503,headers:{'Cache-Control':'no-store'}}));
