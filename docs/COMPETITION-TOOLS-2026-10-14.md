# Competition tools

Home and away tables use the exact homeLeague/awayLeague fields inspected in the current provider response; missing values never fall back to overall totals. Rank zero is treated as unknown. Recent form uses at most five completed matches with known scores in the same competition and season, labels the available sample and keeps home/away team IDs. Scenario choices stay only in component memory and add prospective points without writes, inferred scores or tie-break claims.

Three model tests cover zero versus missing, cross-side recent form and immutable simulation excluding past/finished fixtures.

Current-season fallback: cached club standings and player summaries are limited to 2026/27; fixture-derived totals exclude other/unknown seasons, missing scores and unrelated clubs. An absent result is shown as missing, never a 0:0 draw. Missing legacy match statistics are also omitted rather than converted to zero. A fourth model test verifies season isolation and known-zero handling.
