# Match insights

Timeline filters: goals/cards/substitutions/VAR. Goal labels preserve provider own-goal and penalty types; cancelled goals are VAR events and never normal goals. Missing VAR coverage does not invent a correction. Explicit stoppage time is captured from provider 45+N / 90+N notation, never inferred from total minutes. Existing event totals remain unchanged.

Team starting-lineup average includes only available provider ratings in (0,10]. First/second-half views display only separately supplied statistics. Missing second half is not calculated from totals. Head-to-head uses finished, scored matches earlier than the selected fixture and preserves home/away direction; reports the available sample, up to 20 matches.

Four model tests cover overturned goals, explicit stoppage time, partial ratings and H2H exclusion. Sync code was compared with a local backup of the deployed source; the only changes add explicit clock fields. No production data was removed.
