const MATRIX_URL = 'data/design_matrices.json';
const DATAPIPE_EXPERIMENT_ID = 'Ocl82q2wBw9q';
const EXPERIMENT_VERSION = 'pending_pi_eval_run';

const TIMING = {
  fixation_ms: 1000,
  recognition_ms: 5000,
  label_ms: 20000,
  passive_word_cue_ms: 2000
};

const YES_KEY_LABEL = 'L / ლ';
const NO_KEY_LABEL = 'J / ჯ';
const RESPONSE_MAPPING = 'yes_l_no_j_physical_and_layout';

const urlParams = new URLSearchParams(window.location.search);
const requestedDesign = urlParams.get('design') || urlParams.get('matrix') || null;
const forcedPlaceholder = urlParams.get('placeholder') === '1';
const subjectId = urlParams.get('subject') || randomID(10);
const sessionId = `${subjectId}_${Date.now()}_${randomID(4)}`;
const disableUpload = urlParams.get('no_upload') === '1' || urlParams.get('upload') === '0';
let uploadState = {attempted: false, success: null, response: null, fallback_download_attempted: false};

function randomID(n) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let out = '';
  for (let i = 0; i < n; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

function escapeHTML(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function isYesEvent(e) {
  const key = String(e.key || '').toLowerCase();
  return e.code === 'KeyL' || key === 'l' || e.key === 'ლ';
}

function isNoEvent(e) {
  const key = String(e.key || '').toLowerCase();
  return e.code === 'KeyJ' || key === 'j' || e.key === 'ჯ';
}

function normalizeMatrixPayload(payload) {
  if (Array.isArray(payload)) return payload;
  if (payload && Array.isArray(payload.matrices)) return payload.matrices;
  if (payload && Array.isArray(payload.DM)) return payload.DM;
  return [];
}

async function loadMatrices() {
  if (forcedPlaceholder) {
    return {
      matrices: [],
      source: MATRIX_URL,
      status: 'forced_placeholder_by_url'
    };
  }

  try {
    const response = await fetch(MATRIX_URL, {cache: 'no-store'});
    if (!response.ok) {
      return {matrices: [], source: MATRIX_URL, status: `matrix_file_http_${response.status}`};
    }
    const payload = await response.json();
    const matrices = normalizeMatrixPayload(payload).filter(Boolean);
    return {
      matrices,
      source: MATRIX_URL,
      status: matrices.length > 0 ? 'loaded_valid_matrix_file' : 'matrix_file_loaded_but_empty'
    };
  } catch (err) {
    return {matrices: [], source: MATRIX_URL, status: `matrix_file_load_error_${err.name || 'unknown'}`};
  }
}

function chooseMatrix(matrices, loadInfo) {
  if (!matrices || matrices.length === 0) {
    return {
      matrix: makePlaceholderMatrix(),
      selection_status: 'fallback_placeholder_no_matrix_available',
      selected_index: null,
      requested_design: requestedDesign,
      matrix_count: 0,
      matrix_source: loadInfo.source,
      matrix_load_status: loadInfo.status
    };
  }

  if (requestedDesign) {
    const numeric = Number.parseInt(requestedDesign, 10);
    if (String(numeric) === String(requestedDesign).trim() && numeric >= 1 && numeric <= matrices.length) {
      return makeSelection(matrices[numeric - 1], numeric - 1, 'selected_requested_numeric_design', matrices, loadInfo);
    }
    const byIdIndex = matrices.findIndex(m => String(m.design_id || m.matrix_id || '') === requestedDesign);
    if (byIdIndex >= 0) {
      return makeSelection(matrices[byIdIndex], byIdIndex, 'selected_requested_design_id', matrices, loadInfo);
    }
    return {
      matrix: makePlaceholderMatrix(),
      selection_status: 'fallback_placeholder_requested_design_not_found',
      selected_index: null,
      requested_design: requestedDesign,
      matrix_count: matrices.length,
      matrix_source: loadInfo.source,
      matrix_load_status: loadInfo.status
    };
  }

  const idx = Math.floor(Math.random() * matrices.length);
  return makeSelection(matrices[idx], idx, 'selected_random_matrix', matrices, loadInfo);
}

function makeSelection(matrix, idx, status, matrices, loadInfo) {
  return {
    matrix,
    selection_status: status,
    selected_index: idx,
    requested_design: requestedDesign,
    matrix_count: matrices.length,
    matrix_source: loadInfo.source,
    matrix_load_status: loadInfo.status
  };
}

function makePlaceholderMatrix() {
  return {
    design_id: 'PLACEHOLDER_FALLBACK',
    matrix_notes: 'This fallback appears when no usable matrix is found. It is only for testing the experiment skeleton.',
    block_order: ['picture', 'text'],
    events: [
      // Picture-cue block: image response at pre, cue, and post. Includes correct and incorrect cue examples.
      placeholderImageEvent(1, 'picture_block_placeholder', 'picture', 'picture_correct', 'correct', 'P_TARGET_A', 'pre', 'mooney'),
      placeholderImageEvent(2, 'picture_block_placeholder', 'picture', 'picture_incorrect', 'incorrect', 'P_TARGET_B', 'pre', 'mooney'),
      placeholderImageEvent(3, 'picture_block_placeholder', 'picture', 'picture_correct', 'correct', 'P_TARGET_A', 'cue', 'clear', 'P_TARGET_A'),
      placeholderImageEvent(4, 'picture_block_placeholder', 'picture', 'picture_incorrect', 'incorrect', 'P_TARGET_B', 'cue', 'clear', 'P_WRONG_CUE_FOR_B'),
      placeholderImageEvent(5, 'picture_block_placeholder', 'picture', 'picture_correct', 'correct', 'P_TARGET_A', 'post', 'mooney'),
      placeholderImageEvent(6, 'picture_block_placeholder', 'picture', 'picture_incorrect', 'incorrect', 'P_TARGET_B', 'post', 'mooney'),

      // Text-cue block: image response at pre and post; passive word cue in the middle.
      placeholderImageEvent(7, 'text_block_placeholder', 'text', 'text_correct', 'correct', 'T_TARGET_A', 'pre', 'mooney'),
      placeholderImageEvent(8, 'text_block_placeholder', 'text', 'text_incorrect', 'incorrect', 'T_TARGET_B', 'pre', 'mooney'),
      placeholderWordEvent(9, 'text_block_placeholder', 'text', 'text_correct', 'correct', 'T_TARGET_A', 'cue', null, 'T_TARGET_A'),
      placeholderWordEvent(10, 'text_block_placeholder', 'text', 'text_incorrect', 'incorrect', 'T_TARGET_B', 'cue', null, 'T_WRONG_CUE_FOR_B'),
      placeholderImageEvent(11, 'text_block_placeholder', 'text', 'text_correct', 'correct', 'T_TARGET_A', 'post', 'mooney'),
      placeholderImageEvent(12, 'text_block_placeholder', 'text', 'text_incorrect', 'incorrect', 'T_TARGET_B', 'post', 'mooney')
    ]
  };
}

function placeholderImageEvent(trialNumber, blockId, blockType, cueType, cueValidity, targetObject, phase, imageKind, cueObject = null) {
  return {
    event_id: `placeholder_${trialNumber}`,
    trial_number: trialNumber,
    block_id: blockId,
    block_type: blockType,
    cue_type: cueType,
    cue_validity: cueValidity,
    target_object: targetObject,
    target_label_ka: 'PLACEHOLDER',
    cue_object: cueObject,
    cue_text_ka: null,
    phase: phase,
    event_type: 'image_response',
    image_kind: imageKind,
    stimulus_src: null,
    cue_response_required: true
  };
}

function placeholderWordEvent(trialNumber, blockId, blockType, cueType, cueValidity, targetObject, phase, cueText = null, cueObject = null) {
  return {
    event_id: `placeholder_${trialNumber}`,
    trial_number: trialNumber,
    block_id: blockId,
    block_type: blockType,
    cue_type: cueType,
    cue_validity: cueValidity,
    target_object: targetObject,
    target_label_ka: 'PLACEHOLDER',
    cue_object: cueObject,
    cue_text_ka: cueText,
    phase: phase,
    event_type: 'passive_word_cue',
    image_kind: null,
    stimulus_src: null,
    cue_response_required: false
  };
}

function flattenMatrixEvents(matrix) {
  if (Array.isArray(matrix.events)) {
    return matrix.events.map((event, idx) => normalizeEvent(event, idx));
  }

  if (Array.isArray(matrix.blocks)) {
    const out = [];
    matrix.blocks.forEach((block, blockIndex) => {
      const blockEvents = Array.isArray(block.events) ? block.events : [];
      blockEvents.forEach((event, eventIndex) => {
        out.push(normalizeEvent({...block, ...event}, out.length, blockIndex, eventIndex));
      });
    });
    return out;
  }

  return [];
}

function normalizeEvent(event, idx) {
  const normalized = {...event};
  normalized.trial_number = Number.isFinite(Number(normalized.trial_number)) ? Number(normalized.trial_number) : idx + 1;
  normalized.event_id = normalized.event_id || `event_${String(idx + 1).padStart(3, '0')}`;
  normalized.block_id = normalized.block_id || `${normalized.block_type || 'block'}_block`;
  normalized.block_type = normalized.block_type || inferBlockType(normalized);
  normalized.phase = normalized.phase || inferPhase(normalized);
  normalized.event_type = normalized.event_type || inferEventType(normalized);
  normalized.image_kind = normalized.image_kind || inferImageKind(normalized);
  normalized.cue_type = normalized.cue_type || inferCueType(normalized);
  normalized.cue_validity = normalized.cue_validity || 'unspecified';
  normalized.target_object = normalized.target_object || normalized.object_id || 'PLACEHOLDER_TARGET';
  normalized.target_label_ka = normalized.target_label_ka || normalized.target_ka || 'PLACEHOLDER';
  normalized.target_accepted_labels_ka = Array.isArray(normalized.target_accepted_labels_ka)
    ? normalized.target_accepted_labels_ka
    : [normalized.target_label_ka].filter(Boolean);
  normalized.cue_label_ka = normalized.cue_label_ka || normalized.cue_text_ka || normalized.cue_text || null;
  normalized.cue_text_ka = normalized.cue_text_ka || normalized.cue_text || null;
  normalized.displayed_object = normalized.displayed_object || normalized.target_object;
  normalized.expected_label_ka = normalized.expected_label_ka || normalized.target_label_ka;
  normalized.expected_accepted_labels_ka = Array.isArray(normalized.expected_accepted_labels_ka)
    ? normalized.expected_accepted_labels_ka
    : normalized.target_accepted_labels_ka;
  normalized.stimulus_src = normalized.stimulus_src || normalized.filename || normalized.image_src || null;
  normalized.cue_response_required = normalized.event_type === 'image_response';
  return normalized;
}

function inferBlockType(event) {
  if (String(event.cue_type || '').startsWith('text')) return 'text';
  if (String(event.cue_type || '').startsWith('picture')) return 'picture';
  if (event.event_type === 'passive_word_cue') return 'text';
  return 'picture';
}

function inferPhase(event) {
  if (event.condition === 'pre-disambiguation') return 'pre';
  if (event.condition === 'post-disambiguation') return 'post';
  if (event.condition === 'gray') return 'cue';
  return event.phase || 'unspecified';
}

function inferEventType(event) {
  if (event.phase === 'cue' && event.block_type === 'text') return 'passive_word_cue';
  return 'image_response';
}

function inferImageKind(event) {
  if (event.image_kind) return event.image_kind;
  if (event.phase === 'cue') return 'clear';
  return 'mooney';
}

function inferCueType(event) {
  if (event.block_type === 'text') return `text_${event.cue_validity || 'unspecified'}`;
  if (event.block_type === 'picture') return `picture_${event.cue_validity || 'unspecified'}`;
  return 'unspecified';
}

function collectImageSources(events) {
  const sources = [];
  events.forEach(e => {
    if (e.event_type === 'image_response' && isNonEmptyString(e.stimulus_src)) {
      sources.push(e.stimulus_src.trim());
    }
  });
  return [...new Set(sources)];
}

function imageStimulusHTML(event) {
  const kind = event.image_kind === 'clear' ? 'clear' : 'mooney';
  const placeholderClass = kind === 'clear' ? 'clear-placeholder' : 'mooney-placeholder';
  const src = isNonEmptyString(event.stimulus_src) ? event.stimulus_src.trim() : '';
  const imageHTML = src
    ? `<img src="${escapeHTML(src)}" alt="stimulus" onerror="this.remove(); this.parentElement.querySelector('.placeholder-text').style.display='block';" />`
    : '';
  const placeholderDisplay = src ? 'style="display:none"' : '';
  return `
    <div class="stim-wrap">
      <div class="stim-frame ${placeholderClass}">
        ${imageHTML}
        <div class="placeholder-text" ${placeholderDisplay}>PLACEHOLDER</div>
      </div>
    </div>
  `;
}

function fixationTrial(event) {
  return {
    type: jsPsychHtmlKeyboardResponse,
    stimulus: '<div class="fixation">+</div>',
    choices: 'NO_KEYS',
    trial_duration: TIMING.fixation_ms,
    data: {...baseData(event), save_trial: false, trial_phase: 'fixation'}
  };
}

function makeRecognitionTrial(event, recognitionStore) {
  return {
    type: jsPsychHtmlKeyboardResponse,
    stimulus: `
      ${imageStimulusHTML(event)}
      <div class="prompt">
        <p><strong>იცანით ობიექტი?</strong></p>
        <p><strong>${YES_KEY_LABEL}</strong> = კი &nbsp;&nbsp;&nbsp; <strong>${NO_KEY_LABEL}</strong> = არა</p>
        <p class="timeout-note">პასუხისთვის მაქსიმალური დრო: ${TIMING.recognition_ms / 1000} წამი.</p>
      </div>
    `,
    choices: 'NO_KEYS',
    response_ends_trial: false,
    data: {...baseData(event), save_trial: false, trial_phase: 'recognition_screen'},
    on_load: function() {
      const start = performance.now();
      let finished = false;
      let timerId = null;

      function finishRecognition(extra) {
        if (finished) return;
        finished = true;
        document.removeEventListener('keydown', keyHandler, true);
        if (timerId !== null) clearTimeout(timerId);
        recognitionStore[eventKey(event)] = extra;
        jsPsychInstance.finishTrial({...baseData(event), save_trial: false, trial_phase: 'recognition_screen', ...extra});
      }

      function keyHandler(e) {
        const rt = Math.round(performance.now() - start);
        if (isYesEvent(e)) {
          e.preventDefault();
          finishRecognition({
            subj_recog: 1,
            recognition_rt: rt,
            recognition_response_key: e.key,
            recognition_response_code: e.code,
            recognition_timeout: 0
          });
        } else if (isNoEvent(e)) {
          e.preventDefault();
          finishRecognition({
            subj_recog: 0,
            recognition_rt: rt,
            recognition_response_key: e.key,
            recognition_response_code: e.code,
            recognition_timeout: 0
          });
        }
      }

      document.addEventListener('keydown', keyHandler, true);
      timerId = setTimeout(() => {
        finishRecognition({
          subj_recog: null,
          recognition_rt: null,
          recognition_response_key: null,
          recognition_response_code: null,
          recognition_timeout: 1
        });
      }, TIMING.recognition_ms);
    }
  };
}

function makeLabelTrial(event, recognitionStore) {
  return {
    type: jsPsychHtmlKeyboardResponse,
    stimulus: `
      ${imageStimulusHTML(event)}
      <div class="prompt">
        <p>რა ობიექტი იყო? დაწერეთ ერთი ან რამდენიმე სიტყვით.</p>
        <input id="label-input" type="text" autocomplete="off" autofocus style="width:min(70vw,520px);" />
        <p><button id="label-submit" class="jspsych-btn">შემდეგი</button></p>
        <p class="timeout-note">label-ისთვის მაქსიმალური დრო: ${TIMING.label_ms / 1000} წამი. Enter-ითაც შეგიძლიათ გაგრძელება.</p>
      </div>
    `,
    choices: 'NO_KEYS',
    response_ends_trial: false,
    data: {...baseData(event), save_trial: false, trial_phase: 'label_screen'},
    on_load: function() {
      const start = performance.now();
      let finished = false;
      let timerId = null;
      const input = document.getElementById('label-input');
      const submit = document.getElementById('label-submit');

      function cleanup() {
        document.removeEventListener('keydown', keyHandler, true);
        if (submit) submit.removeEventListener('click', submitHandler, true);
        if (timerId !== null) clearTimeout(timerId);
      }

      function finishLabel(timeout) {
        if (finished) return;
        finished = true;
        const rt = timeout ? null : Math.round(performance.now() - start);
        const label = input ? input.value.trim() : '';
        cleanup();
        const recog = recognitionStore[eventKey(event)] || {};
        jsPsychInstance.finishTrial({
          ...baseData(event),
          save_trial: true,
          trial_phase: 'image_response_with_label',
          stimulus_displayed_as_placeholder: isNonEmptyString(event.stimulus_src) ? 0 : 1,
          subj_recog: recog.subj_recog ?? null,
          recognition_rt: recog.recognition_rt ?? null,
          recognition_response_key: recog.recognition_response_key ?? null,
          recognition_response_code: recog.recognition_response_code ?? null,
          recognition_timeout: recog.recognition_timeout ?? null,
          label_response: label,
          verbal_id_ka: label,
          label_rt: rt,
          label_timeout: timeout ? 1 : 0
        });
      }

      function submitHandler(e) {
        e.preventDefault();
        finishLabel(false);
      }

      function keyHandler(e) {
        if (e.key === 'Enter') {
          e.preventDefault();
          finishLabel(false);
        }
      }

      if (input) input.focus();
      if (submit) submit.addEventListener('click', submitHandler, true);
      document.addEventListener('keydown', keyHandler, true);
      timerId = setTimeout(() => finishLabel(true), TIMING.label_ms);
    }
  };
}

function makePassiveWordCueTrial(event) {
  const cueText = isNonEmptyString(event.cue_text_ka) ? event.cue_text_ka.trim() : 'PLACEHOLDER';
  return {
    type: jsPsychHtmlKeyboardResponse,
    stimulus: `
      <div class="word-cue-wrap">
        <div class="word-cue">${escapeHTML(cueText)}</div>
      </div>
      <div class="timeout-note">სიტყვა გამოჩნდება ${TIMING.passive_word_cue_ms / 1000} წამით.</div>
    `,
    choices: 'NO_KEYS',
    trial_duration: TIMING.passive_word_cue_ms,
    response_ends_trial: false,
    data: {
      ...baseData(event),
      save_trial: true,
      trial_phase: 'passive_word_cue',
      cue_response_required: false,
      cue_text_displayed: cueText,
      passive_word_cue_duration: TIMING.passive_word_cue_ms,
      stimulus_displayed_as_placeholder: cueText === 'PLACEHOLDER' ? 1 : 0,
      subj_recog: null,
      recognition_rt: null,
      recognition_timeout: null,
      label_response: null,
      verbal_id_ka: null,
      label_rt: null,
      label_timeout: null
    }
  };
}

function baseData(event) {
  return {
    subject: subjectId,
    design_id: selectedContext?.matrix?.design_id || selectedContext?.matrix?.matrix_id || 'UNKNOWN_DESIGN',
    matrix_selection_status: selectedContext?.selection_status || 'unknown',
    matrix_load_status: selectedContext?.matrix_load_status || 'unknown',
    matrix_source: selectedContext?.matrix_source || MATRIX_URL,
    matrix_count: selectedContext?.matrix_count ?? null,
    selected_index: selectedContext?.selected_index ?? null,
    requested_design: selectedContext?.requested_design ?? null,
    response_mapping: RESPONSE_MAPPING,
    yes_key: YES_KEY_LABEL,
    no_key: NO_KEY_LABEL,
    fixation_ms: TIMING.fixation_ms,
    recognition_max_ms: TIMING.recognition_ms,
    label_max_ms: TIMING.label_ms,
    passive_word_cue_ms: TIMING.passive_word_cue_ms,
    event_id: event.event_id,
    trial_number: event.trial_number,
    block_id: event.block_id,
    block_type: event.block_type,
    cue_type: event.cue_type,
    cue_validity: event.cue_validity,
    target_object: event.target_object,
    target_label_ka: event.target_label_ka,
    target_accepted_labels_ka: Array.isArray(event.target_accepted_labels_ka) ? event.target_accepted_labels_ka.join('; ') : null,
    target_clear_file: event.target_clear_file ?? null,
    cue_object: event.cue_object ?? null,
    cue_label_ka: event.cue_label_ka ?? null,
    cue_text_ka: event.cue_text_ka ?? null,
    displayed_object: event.displayed_object ?? null,
    expected_label_ka: event.expected_label_ka ?? null,
    expected_accepted_labels_ka: Array.isArray(event.expected_accepted_labels_ka) ? event.expected_accepted_labels_ka.join('; ') : null,
    source_excel_row: event.source_excel_row ?? null,
    matrix_notes: event.notes ?? null,
    experiment_version: EXPERIMENT_VERSION,
    session_id: sessionId,
    datapipe_experiment_id: DATAPIPE_EXPERIMENT_ID,
    phase: event.phase,
    event_type: event.event_type,
    image_kind: event.image_kind ?? null,
    stimulus_src: event.stimulus_src ?? null,
    cue_response_required: event.cue_response_required ? 1 : 0
  };
}

function eventKey(event) {
  return `${event.block_id}__${event.event_id}__${event.trial_number}__${event.phase}`;
}

function displayBlockType(blockType) {
  if (blockType === 'picture') return 'picture cue block';
  if (blockType === 'text') return 'text cue block';
  return blockType || 'block';
}

function displayPhase(phase) {
  if (phase === 'pre') return 'pre-Mooney';
  if (phase === 'cue') return 'cue';
  if (phase === 'post') return 'post-Mooney';
  return phase || 'phase';
}

function blockIntroTrial(blockId, blockType) {
  if (blockType === 'picture') return {
    type: jsPsychHtmlKeyboardResponse,
    stimulus: `
      <div class="page">
        <h2>${escapeHTML(displayBlockType(blockType))}</h2>
        <p>იწყება ფოტოების ბლოკი.</p>
        <p>ამ ბლოკში შეხვდებით ორნაირ სურათს, დაბურულს და ნათელს.<p>
        <p>სურათებზე უპასუხეთ, იცანით თუ არა ობიექტი, შემდეგ კი ჩაწერეთ დასახელება.<p>
        <p>დააჭირეთ ლ/L ღილაკს თუ იცანით, ჯ/J ღილაკს თუ არა.<p>
        <p>დააჭირეთ SPACE-ს გასაგრძელებლად.</p>
        <div class="dev-info">block_id: ${escapeHTML(blockId)}</div>
      </div>
    `,
    choices: [' '],
    data: {save_trial: false, trial_phase: 'block_intro', block_id: blockId, block_type: blockType}
  };
  if (blockType === 'text') return {
    type: jsPsychHtmlKeyboardResponse,
    stimulus: `
      <div class="page">
        <h2>${escapeHTML(displayBlockType(blockType))}</h2>
        <p>იწყება სიტყვების ბლოკი.</p>
        <p>ამ ბლოკში შეხვდებით დაბურულ ფოტოებს<p>
        <p>სურათებზე უპასუხეთ, იცანით თუ არა ობიექტი, შემდეგ კი ჩაწერეთ დასახელება.</p>
        <p>დააჭირეთ ლ/L ღილაკს თუ იცანით, ჯ/J ღილაკს თუ არა.<p>
        <p>ასევე შეხვდებით სიტყვებს ფოტოებს შორის. სიტყვები გამოჩნდებიან ორი წამით<p>
        <p>დააჭირეთ SPACE-ს გასაგრძელებლად.</p>
        <div class="dev-info">block_id: ${escapeHTML(blockId)}</div>
      </div>
    `,
    choices: [' '],
    data: {save_trial: false, trial_phase: 'block_intro', block_id: blockId, block_type: blockType}
  };
}

function makeWelcomeTrial(matrix, selection, events) {
  return {
    type: jsPsychHtmlKeyboardResponse,
    stimulus: `
      <div class="page">
        <h1>Mooney</h1>
        <p>ექსპერიმენტი შედგება ორი ბლოკისგან. პირველი ბლოკის განმავლობაში ეკრანზე გამოჩნდება ორი ტიპის ფოტო, დაბურული და ნათელი. თქვენ გევალებათ, პირველ რიგში, მიუთითოთ ფოტო იცანით თუ ვერა და, მომდევნოდ, ჩაწეროთ ობიექტის სახელი.
        მეორე ბლოკში ასევე შეხვდებით ფოტოებს, ამ შემთხვევაში მარტო დაბურულებს. მსგავსად უნდა მიუთითოთ ობიექტი იცანით თუ ვერა და თუ რა ობიექტი გგონიათ. ასევე შეხვდებით ტექსტობრივ სტიმულებს, სიტყვებს, რომლებიც ეკრანზე 2 წამით გამოჩნდებიან<p>
        <div class="keybox">
          <p><strong>${YES_KEY_LABEL}</strong> = კი, ვიცანი</p>
          <p><strong>${NO_KEY_LABEL}</strong> = არა, ვერ ვიცანი</p>
        </div>
        <p>ტაიმერები: სტიმულებს შორის ინტერვალი ${TIMING.fixation_ms / 1000} წამია, ამოიცანით თუ ვერა დრო გაქვთ ${TIMING.recognition_ms / 1000} წამი პასუხის დასაფიქსირებლად, სიტყვის ჩასაწერად ${TIMING.label_ms / 1000} წამი, ხოლო მეორე ბლოკში სიტყვები გამოჩნდებიან ${TIMING.passive_word_cue_ms / 1000} წამით.</p>
        <p>დააჭირეთ SPACE-ს დასაწყებად.</p>
        <div class="dev-info">
          <strong>Matrix selection:</strong><br>
          design_id: ${escapeHTML(matrix.design_id || matrix.matrix_id || 'UNKNOWN')}<br>
          status: ${escapeHTML(selection.selection_status)}<br>
          load_status: ${escapeHTML(selection.matrix_load_status)}<br>
          matrix_count: ${escapeHTML(selection.matrix_count)}<br>
          selected_index: ${escapeHTML(selection.selected_index)}<br>
          requested_design: ${escapeHTML(selection.requested_design)}<br>
          event_count: ${events.length}<br>
          upload_enabled: ${!disableUpload}<br>
          session_id: ${escapeHTML(sessionId)}
        </div>
      </div>
    `,
    choices: [' '],
    data: {save_trial: false, trial_phase: 'welcome'}
  };
}

function sanitizedFilenamePart(value) {
  return String(value ?? 'unknown')
    .normalize('NFKD')
    .replace(/[^a-zA-Z0-9_-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 80) || 'unknown';
}

function makeResultFilename(matrix) {
  const designId = sanitizedFilenamePart(matrix.design_id || matrix.matrix_id || 'unknown_design');
  const subject = sanitizedFilenamePart(subjectId);
  const session = sanitizedFilenamePart(sessionId);
  return `bako_mooney_v2_${designId}_${subject}_${session}.csv`;
}

function getResultDataCSV() {
  return jsPsychInstance.data.get().filter({save_trial: true}).csv();
}

function saveLocalFallback(filename) {
  try {
    uploadState.fallback_download_attempted = true;
    jsPsychInstance.data.get().filter({save_trial: true}).localSave('csv', filename);
    return true;
  } catch (err) {
    console.error('Local fallback save failed:', err);
    return false;
  }
}

function makeUploadTrial(matrix, filename) {
  if (disableUpload) {
    return {
      type: jsPsychHtmlKeyboardResponse,
      stimulus: `
        <div class="page">
          <h2>Upload disabled for this test</h2>
          <p>DataPipe upload was skipped because the URL contains <code>no_upload=1</code> or <code>upload=0</code>.</p>
          <p>A local CSV backup will be downloaded.</p>
        </div>
      `,
      choices: 'NO_KEYS',
      trial_duration: 1200,
      data: {save_trial: false, trial_phase: 'datapipe_upload_skipped'},
      on_finish: function() {
        uploadState = {attempted: false, success: null, response: 'upload_disabled_by_url', fallback_download_attempted: true};
        saveLocalFallback(filename);
      }
    };
  }

  return {
    type: jsPsychPipe,
    action: 'save',
    experiment_id: DATAPIPE_EXPERIMENT_ID,
    filename: filename,
    data_string: () => getResultDataCSV(),
    wait_message: `
      <div class="page">
        <h2>მონაცემები იგზავნება...</h2>
        <p>გთხოვთ, არ დახუროთ ეს გვერდი.</p>
      </div>
    `,
    data: {
      save_trial: false,
      trial_phase: 'datapipe_upload',
      upload_filename: filename,
      datapipe_experiment_id: DATAPIPE_EXPERIMENT_ID
    },
    on_finish: function(data) {
      // plugin-pipe v0.4 stores the DataPipe server reply in `data.result`.
      // Keep `data.response` only as a backwards-compatible fallback.
      const rawUploadResult = data.result ?? data.response ?? null;

      uploadState = {
        attempted: true,
        success: data.success === true,
        response: rawUploadResult,
        error_code: rawUploadResult && rawUploadResult.error ? rawUploadResult.error : null,
        message: rawUploadResult && rawUploadResult.message ? rawUploadResult.message : null,
        fallback_download_attempted: false
      };

      console.log('DataPipe upload result:', {
        jspsych_trial_data: data,
        upload_state: uploadState
      });

      if (!uploadState.success) {
        saveLocalFallback(filename);
      }
    }
  };
}

function makeCompletionTrial(filename) {
  return {
    type: jsPsychHtmlKeyboardResponse,
    stimulus: function() {
      if (uploadState.success === true) {
        return `
          <div class="page">
            <h2>ტესტი დასრულდა</h2>
            <p><strong>მონაცემები წარმატებით აიტვირთა.</strong></p>
            <p>ახლა შეგიძლიათ დახუროთ ეს გვერდი.</p>
            <div class="dev-info">uploaded file: ${escapeHTML(filename)}</div>
          </div>
        `;
      }

      if (disableUpload) {
        return `
          <div class="page">
            <h2>ტესტი დასრულდა</h2>
            <p>Server upload გამორთული იყო ამ test run-ში.</p>
            <p>CSV backup უნდა ჩამოტვირთულიყო ავტომატურად.</p>
            <p><button id="download-backup" class="jspsych-btn">CSV-ის ხელახლა ჩამოტვირთვა</button></p>
            <div class="dev-info">file: ${escapeHTML(filename)}</div>
          </div>
        `;
      }

      return `
        <div class="page">
          <h2>ტესტი დასრულდა, მაგრამ ატვირთვა ვერ დადასტურდა</h2>
          <p>CSV backup-ის ჩამოტვირთვა ავტომატურად ვცადეთ.</p>
          <p>გთხოვთ, დააჭიროთ ქვემოთ მოცემულ ღილაკს და შეინახოთ ფაილი, თუ ავტომატურად არ ჩამოიტვირთა.</p>
          <p><button id="download-backup" class="jspsych-btn">CSV backup-ის ჩამოტვირთვა</button></p>
          <div class="dev-info">
            file: ${escapeHTML(filename)}<br>
            error code: ${escapeHTML(uploadState.error_code ?? 'none')}<br>
            message: ${escapeHTML(uploadState.message ?? 'none')}<br>
            raw upload result: ${escapeHTML(JSON.stringify(uploadState.response))}
          </div>
        </div>
      `;
    },
    choices: 'NO_KEYS',
    response_ends_trial: false,
    data: {save_trial: false, trial_phase: 'completion'},
    on_load: function() {
      const button = document.getElementById('download-backup');
      if (button) {
        button.addEventListener('click', function() {
          saveLocalFallback(filename);
          button.textContent = 'CSV ჩამოიტვირთა ხელახლა';
        });
      }
    }
  };
}

function buildTimeline(events, matrix, selection) {
  const timeline = [];
  const imagesToPreload = collectImageSources(events);
  if (imagesToPreload.length > 0) {
    timeline.push({
      type: jsPsychPreload,
      images: imagesToPreload,
      message: 'იტვირთება სურათები. გთხოვთ, დაელოდოთ...',
      error_message: 'ზოგიერთი სურათი ვერ ჩაიტვირთა. თუ ეს skeleton mode-ია, placeholder-ები მაინც იმუშავებს.',
      continue_after_error: true,
      data: {save_trial: false, trial_phase: 'preload'}
    });
  }

  timeline.push(makeWelcomeTrial(matrix, selection, events));

  const recognitionStore = {};
  let lastBlockId = null;

  events.forEach(event => {
    if (event.block_id !== lastBlockId) {
      timeline.push(blockIntroTrial(event.block_id, event.block_type));
      lastBlockId = event.block_id;
    }

    timeline.push(fixationTrial(event));

    if (event.event_type === 'passive_word_cue') {
      timeline.push(makePassiveWordCueTrial(event));
    } else {
      timeline.push(makeRecognitionTrial(event, recognitionStore));
      timeline.push(makeLabelTrial(event, recognitionStore));
    }
  });

  const uploadFilename = makeResultFilename(matrix);
  timeline.push(makeUploadTrial(matrix, uploadFilename));
  timeline.push(makeCompletionTrial(uploadFilename));
  return timeline;
}

let selectedContext = null;
let jsPsychInstance = null;

async function main() {
  const loadInfo = await loadMatrices();
  selectedContext = chooseMatrix(loadInfo.matrices, loadInfo);
  const matrix = selectedContext.matrix;
  const events = flattenMatrixEvents(matrix);

  if (events.length === 0) {
    selectedContext = {
      ...selectedContext,
      matrix: makePlaceholderMatrix(),
      selection_status: `${selectedContext.selection_status}_empty_events_fallback_placeholder`
    };
  }

  const finalMatrix = selectedContext.matrix;
  const finalEvents = flattenMatrixEvents(finalMatrix);

  jsPsychInstance = initJsPsych({
    show_progress_bar: true,
    auto_update_progress_bar: true,
    on_finish: function() {
      console.log('Experiment finished.', {
        uploadState,
        design_id: finalMatrix.design_id || finalMatrix.matrix_id || 'unknown_design',
        subject_id: subjectId,
        session_id: sessionId
      });
    }
  });

  window.jsPsych = jsPsychInstance;
  window.__BAKO_V2_SELECTED_MATRIX__ = finalMatrix;
  window.__BAKO_V2_EVENTS__ = finalEvents;

  jsPsychInstance.run(buildTimeline(finalEvents, finalMatrix, selectedContext));
}

main();
