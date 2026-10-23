# Bako Mooney V2 Skeleton / Placeholder Build

This package is a technical skeleton for the planned V2 Georgian Mooney-image experiment. It is meant to test the experiment structure before the real counterbalanced matrices are prepared.

## What this skeleton does

The experiment attempts to load a participant-level design matrix from:

```text
data/design_matrices_v2.json
```

If that file is missing, empty, invalid, or if the requested matrix is not found, the experiment automatically runs a placeholder fallback matrix. In placeholder mode:

- Mooney placeholders are shown as a gray rectangle with `PLACEHOLDER`.
- Clear/picture-cue placeholders are shown as a white rectangle with `PLACEHOLDER`.
- Passive word cues show the word `PLACEHOLDER`.

This makes it possible to test the full experiment skeleton even before real stimuli and real matrices are inserted.

## Timing

The timing matches the intended V2 structure and the original task timing logic:

- Fixation: 1000 ms
- Recognition response window: 5000 ms
- Label response window: 20000 ms
- Passive word cue duration: 2000 ms

Recognition response keys:

- `L / ლ` = yes, recognized
- `J / ჯ` = no, not recognized

The recognition key handler accepts both physical L/J keys and Georgian layout ლ/ჯ.

## V2 design logic

One participant should receive one participant-level matrix. That one matrix should already contain both blocks:

- picture-cue block
- text-cue block

The matrix should list events in the exact order they should be shown. The code does not shuffle trial order live.

Picture-cue block structure:

```text
Mooney pre        -> recognition + label
Clear picture cue -> recognition + label
Mooney post       -> recognition + label
```

Text-cue block structure:

```text
Mooney pre        -> recognition + label
Word cue          -> passive display only, 2000 ms
Mooney post       -> recognition + label
```

Correct and incorrect cues are both supported. No-cue is not included in this skeleton, because the current plan is to first test correct/incorrect picture and word cues.

## Running locally

From inside the package folder:

```bash
python -m http.server 8000
```

Then open:

```text
http://localhost:8000/
```

You can also force placeholder mode:

```text
http://localhost:8000/?placeholder=1
```

If real matrices are added, use a requested design number:

```text
http://localhost:8000/?design=1
http://localhost:8000/?design=2
```

Or request by design ID:

```text
http://localhost:8000/?matrix=design_001
```

## Matrix file

The active matrix file is:

```text
data/design_matrices_v2.json
```

Right now it is intentionally empty:

```json
{
  "version": "v2_placeholder_empty",
  "matrices": []
}
```

The example schema is in:

```text
data/design_matrices_v2_EXAMPLE_DO_NOT_LOAD.json
```

Do not rename the example file to `design_matrices_v2.json` unless you actually want the experiment to load it.

## Event-level schema

The preferred matrix format is event-level, not object-level. This means the matrix contains every displayed event in the exact order it should appear.

A matrix can look like this:

```json
{
  "version": "v2_real_matrices",
  "matrices": [
    {
      "design_id": "design_001",
      "events": [
        {
          "event_id": "p001_pre",
          "trial_number": 1,
          "block_id": "picture_block_1",
          "block_type": "picture",
          "cue_type": "picture_correct",
          "cue_validity": "correct",
          "target_object": "strawberry",
          "target_label_ka": "მარწყვი",
          "cue_object": "strawberry",
          "cue_text_ka": null,
          "phase": "pre",
          "event_type": "image_response",
          "image_kind": "mooney",
          "stimulus_src": "stimuli/01_strawberry_mooney.jpg"
        },
        {
          "event_id": "p001_cue",
          "trial_number": 2,
          "block_id": "picture_block_1",
          "block_type": "picture",
          "cue_type": "picture_correct",
          "cue_validity": "correct",
          "target_object": "strawberry",
          "target_label_ka": "მარწყვი",
          "cue_object": "strawberry",
          "cue_text_ka": null,
          "phase": "cue",
          "event_type": "image_response",
          "image_kind": "clear",
          "stimulus_src": "stimuli/01_strawberry_gray.jpg"
        },
        {
          "event_id": "p001_post",
          "trial_number": 3,
          "block_id": "picture_block_1",
          "block_type": "picture",
          "cue_type": "picture_correct",
          "cue_validity": "correct",
          "target_object": "strawberry",
          "target_label_ka": "მარწყვი",
          "cue_object": "strawberry",
          "cue_text_ka": null,
          "phase": "post",
          "event_type": "image_response",
          "image_kind": "mooney",
          "stimulus_src": "stimuli/01_strawberry_mooney.jpg"
        },
        {
          "event_id": "t001_cue",
          "trial_number": 4,
          "block_id": "text_block_1",
          "block_type": "text",
          "cue_type": "text_correct",
          "cue_validity": "correct",
          "target_object": "jar",
          "target_label_ka": "ქილა",
          "cue_object": "jar",
          "cue_text_ka": "ქილა",
          "phase": "cue",
          "event_type": "passive_word_cue",
          "image_kind": null,
          "stimulus_src": null
        }
      ]
    }
  ]
}
```

## Output CSV

The output CSV saves one row for each image response with a label and one row for each passive word cue. Important columns include:

- `subject`
- `design_id`
- `matrix_selection_status`
- `block_id`
- `block_type`
- `cue_type`
- `cue_validity`
- `target_object`
- `target_label_ka`
- `cue_object`
- `cue_text_ka`
- `phase`
- `event_type`
- `image_kind`
- `stimulus_src`
- `cue_response_required`
- `subj_recog`
- `recognition_rt`
- `recognition_timeout`
- `label_response`
- `verbal_id_ka`
- `label_rt`
- `label_timeout`
- `stimulus_displayed_as_placeholder`

## Notes

This is not the final experiment. It is a skeleton to verify timing, block logic, placeholder behavior, matrix selection, key responses, label timing, and CSV output before real matrices are added.

## Excel-to-matrix builder

The package now includes a converter so peers only fill the authoritative Excel sheet. The converter reads `Blank Copy` when that sheet exists; otherwise it reads `Sheet1`. It ignores `Example`, `Instructions`, and the `row_check` output column.

Current test source:

```text
matrix_source/TEMPLATE_filled_preserving_format.xlsx
```

On Windows, double-click:

```text
build_test_matrices.bat
```

Or run:

```bash
python tools/build_matrices.py matrix_source/TEMPLATE_filled_preserving_format.xlsx
```

The converter validates the workbook. If it passes, it creates:

```text
data/design_matrices_v2.json
data/matrix_build_report.txt
```

Each spreadsheet assignment is expanded automatically into three event-level matrix entries: pre, cue, and post. Within each block, the generated order is all pre events, then all cue events, then all post events. Blocks follow `block_order` exactly.

The included test workbook creates two matrices:

```text
TEST_01 = picture first, text second
TEST_02 = text first, picture second
```

Test a specific matrix with:

```text
http://localhost:8000/?matrix=TEST_01
http://localhost:8000/?matrix=TEST_02
```

The test image paths intentionally do not contain real images, so the experiment displays the gray Mooney and white clear-image placeholders while still loading and following the generated matrices.


## DataPipe / OSF upload test

This build includes automatic result upload through DataPipe. The embedded experiment ID is `Ocl82q2wBw9q`. At the end of a completed run, the experiment uploads only rows with `save_trial: true` as a CSV. If DataPipe does not confirm success, it attempts a local CSV download and displays a manual backup button.

Test normally with `http://localhost:8000/?matrix=TEST_01`. To test without sending anything to OSF, use `http://localhost:8000/?matrix=TEST_01&no_upload=1`. See `DATAPIPE_TESTING.txt`.


## Debug build note
This build fixes the DataPipe result logger for plugin-pipe v0.4. The plugin stores the server response in `data.result`, not `data.response`. Failed uploads now display the real DataPipe error code and message.
