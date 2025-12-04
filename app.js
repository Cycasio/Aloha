const state = {
  title: '新作品',
  tempo: 90,
  timeSignature: '4/4',
  resolution: 2, // cells per beat
  measures: []
};

const STRINGS = ['G', 'C', 'E', 'A'];
const tabContainer = document.getElementById('tabContainer');
const exportPreview = document.getElementById('exportPreview');

function parseTimeSig(sig) {
  const [top, bottom] = sig.split('/').map(Number);
  return { top, bottom };
}

function columnCount() {
  const { top } = parseTimeSig(state.timeSignature);
  return top * state.resolution;
}

function createEmptyMeasure(index) {
  const cols = columnCount();
  return {
    id: crypto.randomUUID(),
    name: `小節 ${index + 1}`,
    chords: Array.from({ length: cols }, () => ''),
    frets: STRINGS.map(() => Array.from({ length: cols }, () => ''))
  };
}

function ensureMeasureShape(measure) {
  const cols = columnCount();
  const adjustRow = (row) => {
    if (row.length > cols) return row.slice(0, cols);
    if (row.length < cols) return row.concat(Array.from({ length: cols - row.length }, () => ''));
    return row;
  };
  measure.chords = adjustRow(measure.chords);
  measure.frets = measure.frets.map(adjustRow);
}

function updateSongMeta() {
  document.getElementById('songTitle').textContent = state.title || '新作品';
  const resolutionLabel = { 1: '四分切分', 2: '八分切分', 4: '十六分切分' }[state.resolution] || '';
  document.getElementById('songMeta').textContent = `Tempo ${state.tempo} · ${state.timeSignature} · ${resolutionLabel}`;
}

function renderTab() {
  tabContainer.innerHTML = '';
  state.measures.forEach((measure, measureIndex) => {
    ensureMeasureShape(measure);
    const template = document.getElementById('measureTemplate');
    const clone = template.content.firstElementChild.cloneNode(true);

    const titleInput = clone.querySelector('.measure__title');
    titleInput.value = measure.name;
    titleInput.dataset.measureId = measure.id;

    const chordRow = clone.querySelector('.chord-row');
    chordRow.dataset.measureId = measure.id;
    chordRow.innerHTML = '';
    measure.chords.forEach((chord, chordIndex) => {
      const input = document.createElement('input');
      input.placeholder = 'C';
      input.value = chord;
      input.dataset.measureId = measure.id;
      input.dataset.chordIndex = chordIndex;
      chordRow.appendChild(input);
    });

    const stringsContainer = clone.querySelector('.strings');
    const stringRows = stringsContainer.querySelectorAll('.string');
    stringRows.forEach((rowEl, stringIndex) => {
      rowEl.dataset.measureId = measure.id;
      rowEl.innerHTML = '';
      measure.frets[stringIndex].forEach((fret, beatIndex) => {
        const cell = document.createElement('div');
        cell.className = 'cell';
        cell.contentEditable = true;
        cell.dataset.measureId = measure.id;
        cell.dataset.stringIndex = stringIndex;
        cell.dataset.beatIndex = beatIndex;
        cell.textContent = fret || '-';
        rowEl.appendChild(cell);
      });
    });

    clone.querySelectorAll('.icon-btn').forEach((btn) => {
      btn.dataset.measureId = measure.id;
    });

    tabContainer.appendChild(clone);
  });
  updateSongMeta();
}

function exportText() {
  const lines = [];
  lines.push(`# ${state.title || '未命名作品'}`);
  lines.push(`Tempo ${state.tempo} | ${state.timeSignature} | 切分: ${['四分','八分','十六分'][Math.log2(state.resolution)] ?? ''}`);
  lines.push('');

  state.measures.forEach((measure, i) => {
    lines.push(`小節 ${i + 1}: ${measure.name}`);

    // chord row
    if (measure.chords.some(Boolean)) {
      const chordLine = measure.chords.map((c) => c.padEnd(3, ' ')).join('|');
      lines.push(`Chords |${chordLine}|`);
    }

    STRINGS.forEach((stringName, stringIndex) => {
      const row = measure.frets[stringIndex]
        .map((cell) => (cell === '' ? '-' : cell))
        .join('-');
      lines.push(`${stringName}|${row}`);
    });
    lines.push('');
  });

  exportPreview.value = lines.join('\n');
}

function setCellValue(measureId, stringIndex, beatIndex, value) {
  const measure = state.measures.find((m) => m.id === measureId);
  if (!measure) return;
  const safeValue = value === '-' ? '' : value === '' ? '0' : value;
  measure.frets[stringIndex][beatIndex] = safeValue;
}

function duplicateMeasure(measureId) {
  const index = state.measures.findIndex((m) => m.id === measureId);
  if (index === -1) return;
  const target = structuredClone(state.measures[index]);
  target.id = crypto.randomUUID();
  target.name = `${target.name} (複製)`;
  state.measures.splice(index + 1, 0, target);
  renderTab();
}

function deleteMeasure(measureId) {
  if (state.measures.length <= 1) return;
  state.measures = state.measures.filter((m) => m.id !== measureId);
  renderTab();
}

function wireEvents() {
  document.getElementById('titleInput').addEventListener('input', (e) => {
    state.title = e.target.value;
    updateSongMeta();
  });

  document.getElementById('tempoInput').addEventListener('input', (e) => {
    state.tempo = Number(e.target.value) || 0;
    updateSongMeta();
  });

  document.getElementById('timeSignature').addEventListener('change', (e) => {
    state.timeSignature = e.target.value;
    state.measures.forEach(ensureMeasureShape);
    renderTab();
  });

  document.getElementById('resolution').addEventListener('change', (e) => {
    state.resolution = Number(e.target.value);
    state.measures.forEach(ensureMeasureShape);
    renderTab();
  });

  document.getElementById('addMeasure').addEventListener('click', () => {
    state.measures.push(createEmptyMeasure(state.measures.length));
    renderTab();
  });

  document.getElementById('clearSong').addEventListener('click', () => {
    if (!confirm('確定要清空全部小節嗎？')) return;
    state.measures = [createEmptyMeasure(0)];
    state.title = '新作品';
    state.tempo = 90;
    state.timeSignature = '4/4';
    state.resolution = 2;
    document.getElementById('titleInput').value = state.title;
    document.getElementById('tempoInput').value = state.tempo;
    document.getElementById('timeSignature').value = state.timeSignature;
    document.getElementById('resolution').value = state.resolution;
    renderTab();
  });

  document.getElementById('exportTab').addEventListener('click', exportText);

  tabContainer.addEventListener('input', (event) => {
    const target = event.target;
    if (target.classList.contains('measure__title')) {
      const measure = state.measures.find((m) => m.id === target.dataset.measureId);
      if (measure) measure.name = target.value;
    }

    if (target.parentElement?.classList.contains('chord-row')) {
      const measure = state.measures.find((m) => m.id === target.dataset.measureId);
      if (measure) {
        measure.chords[target.dataset.chordIndex] = target.value.trim();
      }
    }

    if (target.classList.contains('cell')) {
      const { measureId, stringIndex, beatIndex } = target.dataset;
      const value = target.textContent.replace(/\D/g, '') || target.textContent.trim();
      const sanitized = value === '-' ? '-' : value.slice(0, 2);
      target.textContent = sanitized || '-';
      setCellValue(measureId, Number(stringIndex), Number(beatIndex), sanitized.replace(/[^0-9-]/g, ''));
      const range = document.createRange();
      range.selectNodeContents(target);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
    }
  });

  tabContainer.addEventListener('blur', (event) => {
    const target = event.target;
    if (target.classList.contains('cell')) {
      const { measureId, stringIndex, beatIndex } = target.dataset;
      const value = target.textContent.trim();
      const normalized = value === '-' ? '' : value === '' ? '0' : value;
      target.textContent = normalized || '-';
      setCellValue(measureId, Number(stringIndex), Number(beatIndex), normalized);
    }
  }, true);

  tabContainer.addEventListener('click', (event) => {
    const button = event.target.closest('.icon-btn');
    if (!button) return;
    const { action } = button.dataset;
    const measureId = button.dataset.measureId;
    if (action === 'duplicate') duplicateMeasure(measureId);
    if (action === 'delete') deleteMeasure(measureId);
  });
}

function init() {
  state.measures.push(createEmptyMeasure(0));
  renderTab();
  wireEvents();
}

init();
