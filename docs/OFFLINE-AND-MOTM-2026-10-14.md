# Public offline data and fan MOTM

GitHub Pages registers the existing service worker without requesting notification permission. The build emits a public asset manifest and hashes the cache version from asset names. Installation precaches HTML/JS/CSS; activation removes previous public shell caches. Network-first navigation falls back to the cached shell. No cross-origin Auth/API requests, private albums or token-bearing asset URLs are intercepted.

The dedicated /offline view reads whitelisted public match/event/club/table snapshots from this device, labels their saved time and does not require a network profile fetch. Storage is optional and bounded to 20 snapshots; failures cannot interrupt form input. Private journals, guesses, email, session credentials and private images are excluded. Three tests cover field exclusion, bounded storage and offline shell fallback/API isolation. Physical phone airplane-mode validation remains to be done.

Fan MOTM: verified starters and event participants only; one own vote, editable until 48 hours after kickoff. Public aggregate counts exclude voter identities. Six database checks passed in BEGIN/ROLLBACK with a temporary match; no real vote was cast. MOTM votes are included in personal export.

Participation refinement: verified cached starters can be included individually when the full eleven cannot be resolved; goals/assists/substitutions prove play, but a card alone does not. The rejection check includes a card-only player. A direct public-image download button allows saving a match card without opening native sharing.
