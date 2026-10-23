# Matrix schema notes

The preferred V2 matrix is event-level. A row/event is one screen that appears in the experiment.

Required or strongly recommended fields:

| Field | Meaning |
|---|---|
| `event_id` | Unique event ID inside the matrix |
| `trial_number` | Display order inside the selected matrix |
| `block_id` | Block name, e.g. `picture_block_1` |
| `block_type` | `picture` or `text` |
| `cue_type` | `picture_correct`, `picture_incorrect`, `text_correct`, `text_incorrect` |
| `cue_validity` | `correct` or `incorrect` |
| `target_object` | Real target object of the Mooney image |
| `target_label_ka` | Correct Georgian target label |
| `cue_object` | Object used as the cue; differs from target in incorrect cue trials |
| `cue_text_ka` | Word shown in passive word-cue events |
| `phase` | `pre`, `cue`, or `post` |
| `event_type` | `image_response` or `passive_word_cue` |
| `image_kind` | `mooney` or `clear` for image events |
| `stimulus_src` | Image path for image events |

The code follows the event order exactly. It does not shuffle.

Use `image_response` for:

- pre-Mooney
- post-Mooney
- clear picture cue in the picture-cue block

Use `passive_word_cue` for:

- word cue in the text-cue block

If an image path is missing or broken, the experiment displays the appropriate placeholder.
