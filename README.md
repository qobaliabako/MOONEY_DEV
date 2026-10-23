# Mooney Visual Perception — browser experiment source

**Project:** Visual ambiguity resolution and mental representations using Mooney images  
**Research context:** Supervised cognitive neuroscience project at the Free University of Tbilisi  
**Implementation:** Bako Kobalia independently coded and implemented the jsPsych-based experimental task, under scientific supervision  
**Status:** Development and testing; this repository is **not** evidence of completed participant recruitment, validated outcome data, or a published experiment.

## Research question

How do visual picture cues and written labels shape recognition and re-interpretation of ambiguous Mooney images? The task supports correct and incorrect cues and captures recognition choices and free-text labels in Georgian. The current code is a development/test snapshot, not a validated final study release.

## Where the code is

| Path | Description |
| --- | --- |
| [`experiment.js`](experiment.js) | Main browser task; trials, recognition input, labels, timing, records and optional DataPipe upload |
| [`index.html`](index.html), [`style.css`](style.css) | Browser entry point and presentation |
| [`data/design_matrices.json`](data/design_matrices.json) | Example/test participant-level event sequences; not production counterbalancing |
| [`data/design_matrices_v2_EXAMPLE_DO_NOT_LOAD.json`](data/design_matrices_v2_EXAMPLE_DO_NOT_LOAD.json) | Additional schema examples |
| [`tools/build_matrices.py`](tools/build_matrices.py) | Design-matrix generator |
| [`matrix_source/MATRIX_SOURCE.xlsx`](matrix_source/MATRIX_SOURCE.xlsx) | Workbook for the design matrix source |
| [`docs/matrix_schema.md`](docs/matrix_schema.md) | Event schema notes |
| [`docs/README_ORIGINAL_SNAPSHOT.md`](docs/README_ORIGINAL_SNAPSHOT.md) | Original archive README; some path descriptions refer to an earlier skeleton layout |

## Current task structure

- Picture-cue block: ambiguous image before and after a clear picture cue.
- Text-cue block: ambiguous image before and after a briefly displayed word cue.
- Correct and incorrect cue variants are supported in the example trial schemas.
- Stimulus timing in the snapshot: 1,000 ms fixation; 5,000 ms recognition window; 20,000 ms free-text label window; 2,000 ms passive word cue.
- Recognition inputs: physical `L`/`J` keys or Georgian-layout equivalents.

## Running the development snapshot

1. Clone or download the repository.
2. Run `python3 -m http.server 8000` from the repository root.
3. Open `http://localhost:8000/?placeholder=1&no_upload=1` for a safe, placeholder-only preview.
4. Example matrix IDs, where supported by the current JSON: `?matrix=TEST_01&no_upload=1` or `?matrix=TEST_02&no_upload=1`.

**Limitations:** The archived build does not include the real Mooney and clear-image stimulus files referenced in some matrices. Those trials may show fallbacks or unavailable images. `data/design_matrices.json` contains test designs, not the full finalized counterbalanced study. The older README references `design_matrices_v2.json`, whereas this snapshot's `experiment.js` actually uses `data/design_matrices.json`.

## Public-source privacy and data collection

This publicly browsable source copy intentionally replaces the original embedded DataPipe/OSF collection identifier with `CONFIGURE_PRIVATE_DATAPIPE_ID`; uploading is disabled while that placeholder remains. **Do not commit live experiment identifiers, participants' responses, or private credentials.** If authorized real data collection is required, configure the experiment identifier only in a private deployment and follow the research team's approved data-collection procedures.

Source attribution: this is the implementation snapshot from the repository's original `mooney_latest_build.rar`, unpacked for readable browsing and with the upload identifier disabled in the public copy. The original archive has been retained as a private backup and removed from the current public repository because it contained a configured upload identifier. That identifier may remain in earlier Git history and should be disabled or replaced if still active. This code should not be presented as completed study results.

## Permissions

Project materials are provided for academic inspection; no new open-source license is asserted by this README. Contact the project owners for permission to reuse any copyrighted stimuli or study materials.
