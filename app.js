// ──────────────────────────────────────────────────────
//  English Learning System – Core Data & Logic (v2 with auto-grading)
// ──────────────────────────────────────────────────────

const VOCAB_BANK = [
  { word: "exercise",   pos: "v.",    meaning: "運動" },
  { word: "delicious",  pos: "adj.",  meaning: "美味的" },
  { word: "neighbor",   pos: "n.",    meaning: "鄰居" },
  { word: "library",    pos: "n.",    meaning: "圖書館" },
  { word: "experience", pos: "n.",    meaning: "經驗" },
  { word: "study",      pos: "v.",    meaning: "學習" },
  { word: "kitchen",    pos: "n.",    meaning: "廚房" },
  { word: "sometimes",  pos: "adv.",  meaning: "有時候" },
  { word: "beautiful",  pos: "adj.",  meaning: "美麗的" },
  { word: "travel",     pos: "v.",    meaning: "旅行" },
  { word: "breakfast",  pos: "n.",    meaning: "早餐" },
  { word: "friendly",   pos: "adj.",  meaning: "友善的" },
];

const TENSES         = ["現在簡單式", "現在進行式"];
const SENTENCE_TYPES = ["肯定句", "否定句", "疑問句"];
const SUBJECTS       = ["I", "You", "He", "She", "They", "My brother", "The cat", "We"];
const THIRD_PERSON   = ["He", "She", "My brother", "The cat"];

// ──────────────────────────────────────────────────────
//  State
// ──────────────────────────────────────────────────────
let state = {
  questionNumber: 1,
  score: 0,
  streak: 0,
  totalAnswered: 0,
  current: null,
  wordStats: {},
};
VOCAB_BANK.forEach(v => { state.wordStats[v.word] = 0; });

// ──────────────────────────────────────────────────────
//  Utility helpers
// ──────────────────────────────────────────────────────
function randFrom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}
function isThirdPerson(subj) { return THIRD_PERSON.includes(subj); }
function getBeVerb(subj) {
  if (subj === "I") return "am";
  if (isThirdPerson(subj)) return "is";
  return "are";
}

// Returns all acceptable surface forms of a vocab word
function getWordVariants(word, pos) {
  const v = [word];
  if (pos === "v.") {
    // +s / +es  (3rd person simple)
    if (word.endsWith("y") && !"aeiou".includes(word[word.length - 2])) {
      v.push(word.slice(0, -1) + "ies");   // study → studies
    } else if (/([sshch|x|z])$/.test(word)) {
      v.push(word + "es");
    } else {
      v.push(word + "s");                   // travel → travels
    }
    // -ing
    if (word.endsWith("ie")) {
      v.push(word.slice(0, -2) + "ying");  // die → dying
    } else if (word.endsWith("e") && !word.endsWith("ee")) {
      v.push(word.slice(0, -1) + "ing");   // exercise → exercising
    } else if (/[aeiou][^aeiou]$/.test(word) && word.length < 6) {
      // short CVC: double final consonant  (run → running) — not needed for our list, but safe
      v.push(word + word.slice(-1) + "ing");
      v.push(word + "ing");
    } else {
      v.push(word + "ing");                 // study → studying
    }
  }
  return v.map(x => x.toLowerCase());
}

function wordPresentInSentence(sentence, vocab) {
  const sl = sentence.toLowerCase();
  const variants = getWordVariants(vocab.word, vocab.pos);
  return variants.some(variant => {
    const re = new RegExp(`\\b${variant}\\b`);
    return re.test(sl);
  });
}

// ──────────────────────────────────────────────────────
//  Grammar checking engine (returns array of check objects)
//  Each check: { label, pass: true/false, note }
// ──────────────────────────────────────────────────────
function runGrammarChecks(input, vocab, tense, stype, subj) {
  const checks = [];
  const sl     = input.trim().toLowerCase();
  const tp     = isThirdPerson(subj);
  const be     = getBeVerb(subj);

  // ── 1. Minimum length ─────────────────────────────
  const wordCount = sl.split(/\s+/).filter(Boolean).length;
  checks.push({
    label: "句子長度",
    pass:  wordCount >= 3,
    note:  wordCount >= 3
      ? `句子共 ${wordCount} 個單字，長度合格。`
      : `句子太短（${wordCount} 個單字），至少需要 3 個單字。`,
  });

  // ── 2. Vocabulary word used ────────────────────────
  const hasWord = wordPresentInSentence(input, vocab);
  checks.push({
    label: `單字「${vocab.word}」`,
    pass:  hasWord,
    note:  hasWord
      ? `正確使用了單字「${vocab.word}」（或其變化形）。`
      : `句子中找不到單字「${vocab.word}」或其變化形，請確認拼字是否正確。`,
  });

  // ── 3. Tense-specific checks ───────────────────────
  if (tense === "現在簡單式") {

    if (stype === "肯定句") {
      // 3a. No negative auxiliaries
      const hasNeg = /(don't|doesn't|do not|does not|isn't|aren't|am not|is not|are not)/i.test(input);
      checks.push({
        label: "無否定助動詞",
        pass:  !hasNeg,
        note:  !hasNeg
          ? "正確！肯定句中沒有多餘的否定助動詞。"
          : "肯定句中不應出現 don't / doesn't / not 等否定詞。",
      });

      // 3b. 3rd person singular → verb+s/es  (only for verbs)
      if (vocab.pos === "v.") {
        if (tp) {
          const variants3ps = getWordVariants(vocab.word, vocab.pos).filter(v =>
            v !== vocab.word.toLowerCase() && !v.endsWith("ing")
          );
          const has3ps = variants3ps.some(v => new RegExp(`\\b${v}\\b`).test(sl));
          checks.push({
            label: "第三人稱單數動詞變化",
            pass:  has3ps,
            note:  has3ps
              ? `主詞「${subj}」是第三人稱單數，正確使用了動詞 +s/-es 變化。`
              : `主詞「${subj}」是第三人稱單數，動詞「${vocab.word}」需要加 -s 或 -es（如：${variants3ps[0]}）。`,
          });
        } else {
          // Non-3ps: verb should NOT have -s (except the word itself ending in s)
          // Just check the base form appears
          const hasBase = new RegExp(`\\b${vocab.word.toLowerCase()}\\b`).test(sl);
          checks.push({
            label: "動詞原形",
            pass:  hasBase,
            note:  hasBase
              ? `主詞「${subj}」不是第三人稱單數，正確使用動詞原形「${vocab.word}」。`
              : `主詞「${subj}」不是第三人稱單數，動詞應使用原形「${vocab.word}」。`,
          });
        }
      }

      // 3c. Punctuation: should end with .
      const goodPunct = !input.trim().endsWith("?");
      checks.push({
        label: "標點符號",
        pass:  goodPunct,
        note:  goodPunct
          ? "標點符號正確（肯定句以句號結尾）。"
          : "肯定句應以句號 (.) 結尾，不是問號 (?)。",
      });

    } else if (stype === "否定句") {
      // 3a. Correct auxiliary: don't / doesn't
      const correctAux = tp ? "doesn't" : "don't";
      const wrongAux   = tp ? "don't"   : "doesn't";
      const hasCorrect = new RegExp(`\\b${correctAux}\\b`, "i").test(input) ||
                         new RegExp(`\\b${correctAux.replace("'", " not ")}\\b`, "i").test(input);
      const hasWrong   = new RegExp(`\\b${wrongAux}\\b`, "i").test(input);

      checks.push({
        label: `否定助動詞「${correctAux}」`,
        pass:  hasCorrect && !hasWrong,
        note:  hasCorrect && !hasWrong
          ? `正確使用否定助動詞「${correctAux}」。`
          : hasWrong
            ? `應使用「${correctAux}」，不是「${wrongAux}」（主詞「${subj}」${tp ? "是" : "不是"}第三人稱單數）。`
            : `否定句需要助動詞「${correctAux}」+ 原形動詞。格式：${subj} ${correctAux} ${vocab.word} ...`,
      });

      // 3b. Punctuation
      const goodPunct = !input.trim().endsWith("?");
      checks.push({
        label: "標點符號",
        pass:  goodPunct,
        note:  goodPunct
          ? "標點符號正確（否定句以句號結尾）。"
          : "否定句應以句號 (.) 結尾，不是問號 (?)。",
      });

    } else { // 疑問句
      // 3a. Starts with Do / Does
      const correctAux = tp ? "Does" : "Do";
      const wrongAux   = tp ? "Do"   : "Does";
      const startsCorrect = new RegExp(`^${correctAux}\\b`, "i").test(input.trim());
      const startsWrong   = new RegExp(`^${wrongAux}\\b`, "i").test(input.trim());

      checks.push({
        label: `疑問助動詞「${correctAux}」開頭`,
        pass:  startsCorrect,
        note:  startsCorrect
          ? `正確以「${correctAux}」開頭的疑問句。`
          : startsWrong
            ? `應以「${correctAux}」開頭，不是「${wrongAux}」（主詞「${subj}」${tp ? "是" : "不是"}第三人稱單數）。`
            : `疑問句格式：${correctAux} ${subj.toLowerCase()} ${vocab.word} ...?`,
      });

      // 3b. Ends with ?
      const hasQ = input.trim().endsWith("?");
      checks.push({
        label: "問號結尾",
        pass:  hasQ,
        note:  hasQ
          ? "正確使用問號 (?) 結尾。"
          : "疑問句應以問號 (?) 結尾。",
      });
    }

  } else { // 現在進行式

    // 3a. Correct be verb
    const hasCorrectBe = new RegExp(`\\b${be}\\b`, "i").test(input);
    const wrongBes     = ["am", "is", "are"].filter(b => b !== be);
    const hasWrongBe   = wrongBes.some(b => new RegExp(`\\b${b}\\b`, "i").test(input));

    checks.push({
      label: `Be 動詞「${be}」`,
      pass:  hasCorrectBe,
      note:  hasCorrectBe
        ? `正確使用 Be 動詞「${be}」（主詞：${subj}）。`
        : hasWrongBe
          ? `主詞「${subj}」應使用「${be}」，不是「${wrongBes.find(b => new RegExp(`\\b${b}\\b`,"i").test(input))}」。`
          : `現在進行式需要 Be 動詞「${be}」。格式：${subj} ${be} V-ing`,
    });

    // 3b. V-ing present
    const hasIng = /\b\w+ing\b/.test(sl);
    checks.push({
      label: "V-ing 動詞形式",
      pass:  hasIng,
      note:  hasIng
        ? "正確包含了 V-ing 形式的動詞。"
        : "現在進行式需要 V-ing 形式的動詞（例如：studying、exercising）。",
    });

    if (stype === "否定句") {
      // 3c. Contains "not" or "n't"
      const hasNot = /(not|n't)/i.test(input);
      checks.push({
        label: "否定詞「not」",
        pass:  hasNot,
        note:  hasNot
          ? "正確包含否定詞「not」（或縮寫 isn't / aren't）。"
          : `否定句需要在 Be 動詞後加「not」，例如：${subj} ${be} not V-ing`,
      });

      const goodPunct = !input.trim().endsWith("?");
      checks.push({
        label: "標點符號",
        pass:  goodPunct,
        note:  goodPunct ? "標點符號正確。" : "否定句應以句號 (.) 結尾。",
      });

    } else if (stype === "疑問句") {
      // 3c. Starts with be verb (capitalized)
      const beUp = be.charAt(0).toUpperCase() + be.slice(1);
      const startsWithBe = new RegExp(`^${beUp}\\b`).test(input.trim()) ||
                           new RegExp(`^${be}\\b`, "i").test(input.trim());

      checks.push({
        label: `以「${beUp}」開頭`,
        pass:  startsWithBe,
        note:  startsWithBe
          ? `正確以「${beUp}」開頭的進行式疑問句。`
          : `進行式疑問句應以 Be 動詞「${beUp}」開頭（把 Be 動詞移到句首）。`,
      });

      const hasQ = input.trim().endsWith("?");
      checks.push({
        label: "問號結尾",
        pass:  hasQ,
        note:  hasQ ? "正確使用問號 (?) 結尾。" : "疑問句應以問號 (?) 結尾。",
      });

    } else { // 肯定句
      const hasNeg = /(not|n't)/i.test(input);
      checks.push({
        label: "無否定詞",
        pass:  !hasNeg,
        note:  !hasNeg
          ? "正確！肯定句中沒有多餘的否定詞。"
          : "肯定句中不應出現「not」。",
      });

      const goodPunct = !input.trim().endsWith("?");
      checks.push({
        label: "標點符號",
        pass:  goodPunct,
        note:  goodPunct ? "標點符號正確。" : "肯定句應以句號 (.) 結尾。",
      });
    }
  }

  return checks;
}

// ──────────────────────────────────────────────────────
//  Example structure builder
// ──────────────────────────────────────────────────────
function buildExampleStructure(vocab, tense, stype, subj) {
  const tp     = isThirdPerson(subj);
  const be     = getBeVerb(subj);
  const isVerb = vocab.pos === "v.";

  if (tense === "現在簡單式") {
    if (stype === "肯定句") {
      let v = vocab.word;
      if (isVerb && tp) {
        v = vocab.word.endsWith("y") && !"aeiou".includes(vocab.word[vocab.word.length-2])
          ? vocab.word.slice(0,-1) + "ies"
          : vocab.word + "s";
      }
      return isVerb
        ? `${subj} ${v} [地點 / 時間] .`
        : `${subj} [動詞] ${vocab.word} [補充] .`;
    } else if (stype === "否定句") {
      const aux = tp ? "doesn't" : "don't";
      return isVerb
        ? `${subj} ${aux} ${vocab.word} [地點 / 時間] .`
        : `${subj} ${aux} [動詞] ${vocab.word} .`;
    } else {
      const aux = tp ? "Does" : "Do";
      return isVerb
        ? `${aux} ${subj.toLowerCase()} ${vocab.word} [地點 / 時間] ?`
        : `${aux} ${subj.toLowerCase()} [動詞] ${vocab.word} ?`;
    }
  } else {
    const beUp = be.charAt(0).toUpperCase() + be.slice(1);
    if (stype === "肯定句") {
      return isVerb
        ? `${subj} ${be} ${vocab.word}ing [地點 / 時間] .`
        : `${subj} ${be} [動詞]ing [補充 ${vocab.word}] .`;
    } else if (stype === "否定句") {
      return isVerb
        ? `${subj} ${be} not ${vocab.word}ing [地點 / 時間] .`
        : `${subj} ${be} not [動詞]ing [補充 ${vocab.word}] .`;
    } else {
      return isVerb
        ? `${beUp} ${subj.toLowerCase()} ${vocab.word}ing [地點 / 時間] ?`
        : `${beUp} ${subj.toLowerCase()} [動詞]ing [補充 ${vocab.word}] ?`;
    }
  }
}

// Grammar hints (shown before submission)
function buildHints(vocab, tense, stype, subj) {
  const hints = [];
  const tp    = isThirdPerson(subj);
  const be    = getBeVerb(subj);

  if (tense === "現在簡單式") {
    if (stype === "肯定句" && tp && vocab.pos === "v.") {
      hints.push(`主詞「${subj}」為第三人稱單數，動詞記得加 <strong>-s</strong> 或 <strong>-es</strong>。`);
    } else if (stype === "否定句") {
      const aux = tp ? "doesn't" : "don't";
      hints.push(`否定句格式：<strong>${subj} ${aux} ${vocab.word} ...</strong>`);
    } else if (stype === "疑問句") {
      const aux = tp ? "Does" : "Do";
      hints.push(`疑問句格式：<strong>${aux} ${subj.toLowerCase()} ${vocab.word} ...?</strong>`);
    }
    if (vocab.pos !== "v.") {
      hints.push(`「<strong style="color:#6366f1;">${vocab.word}</strong>」是${vocab.pos.replace(".","")}，記得搭配動詞使用。`);
    }
  } else {
    hints.push(`進行式公式：<strong style="color:#06b6d4;">${subj} ${be} [V-ing]</strong>`);
    if (stype === "否定句") hints.push(`否定：<strong>${subj} ${be} not [V-ing] ...</strong>`);
    if (stype === "疑問句") {
      const beUp = be.charAt(0).toUpperCase() + be.slice(1);
      hints.push(`疑問：<strong>${beUp} ${subj.toLowerCase()} [V-ing] ...?</strong>`);
    }
  }
  return hints;
}

// ──────────────────────────────────────────────────────
//  UI helpers
// ──────────────────────────────────────────────────────
function renderVocabList(activeWord = null) {
  document.getElementById("vocab-list").innerHTML = VOCAB_BANK.map(v => `
    <div class="vocab-item ${v.word === activeWord ? "active-word" : ""}">
      <span class="vocab-word">${v.word}</span>
      <span class="vocab-pos">${v.pos}</span>
      <span class="vocab-meaning">${v.meaning}</span>
    </div>
  `).join("");
  document.getElementById("vocab-count").textContent = `${VOCAB_BANK.length} 個單字`;
}

function renderProgressGrid() {
  document.getElementById("progress-grid").innerHTML = VOCAB_BANK.map(v => {
    const cnt = state.wordStats[v.word] || 0;
    return `
      <div class="progress-cell ${cnt > 0 ? "done" : ""}">
        <div class="progress-word">${v.word}</div>
        <div class="progress-count">練習 ${cnt} 次</div>
        <div class="progress-dot"></div>
      </div>
    `;
  }).join("");
}

function updateHeaderStats() {
  document.getElementById("score-display").textContent  = state.score;
  document.getElementById("streak-display").textContent = state.streak;
  document.getElementById("total-display").textContent  = state.totalAnswered;
}

function showToast(msg, duration = 2800) {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), duration);
}

function animateVal(elId) {
  const el = document.getElementById(elId);
  el.classList.remove("score-anim");
  void el.offsetWidth;
  el.classList.add("score-anim");
}

// ──────────────────────────────────────────────────────
//  Quiz generation
// ──────────────────────────────────────────────────────
function generateQuiz() {
  const vocab = randFrom(VOCAB_BANK);
  const tense = randFrom(TENSES);
  const stype = randFrom(SENTENCE_TYPES);
  const subj  = randFrom(SUBJECTS);
  state.current = { vocab, tense, stype, subj };

  document.getElementById("disp-word").textContent    = vocab.word;
  document.getElementById("disp-pos").textContent     = vocab.pos;
  document.getElementById("disp-meaning").textContent = vocab.meaning;
  document.getElementById("disp-subj").textContent    = subj;
  document.getElementById("disp-tense").textContent   = tense;
  document.getElementById("disp-type").textContent    = stype;
  document.getElementById("question-number").textContent = `第 ${state.questionNumber} 題`;

  const hints = buildHints(vocab, tense, stype, subj);
  document.getElementById("hint-list").innerHTML =
    hints.map(h => `<li>${h}</li>`).join("");

  document.getElementById("sentence-input").value = "";
  document.getElementById("feedback-card").style.display = "none";
  document.getElementById("quiz-card").style.display     = "block";

  renderVocabList(vocab.word);
  renderProgressGrid();
  updateHeaderStats();

  setTimeout(() => {
    document.getElementById("quiz-card").scrollIntoView({ behavior: "smooth", block: "start" });
  }, 100);
}

// ──────────────────────────────────────────────────────
//  Submit & grade
// ──────────────────────────────────────────────────────
function submitAnswer() {
  const input = document.getElementById("sentence-input").value.trim();
  if (!input) {
    showToast("⚠️ 請先輸入你的英文句子！");
    document.getElementById("sentence-input").focus();
    return;
  }

  const { vocab, tense, stype, subj } = state.current;
  const checks  = runGrammarChecks(input, vocab, tense, stype, subj);
  const allPass = checks.every(c => c.pass);
  const passCount = checks.filter(c => c.pass).length;

  // ── Verdict banner ──────────────────────────────────
  const verdictBanner = document.getElementById("verdict-banner");
  const verdictEmoji  = document.getElementById("verdict-emoji");
  const verdictTitle  = document.getElementById("verdict-title");
  const verdictSub    = document.getElementById("verdict-sub");
  const verdictScore  = document.getElementById("verdict-score");

  verdictBanner.className = "verdict-banner " + (allPass ? "verdict-correct" : "verdict-wrong");

  if (allPass) {
    verdictEmoji.textContent = "🎉";
    verdictTitle.textContent = "答對了！";
    verdictSub.textContent   = `全部 ${checks.length} 項語法檢查通過`;
    verdictScore.textContent = "+10";
    verdictScore.style.display = "block";
    state.score += 10;
    state.streak++;
    showToast(`🎉 完美！+10 分${state.streak >= 3 ? "  🔥 連勝 " + state.streak + " 題！" : ""}`);
    animateVal("score-display");
    animateVal("streak-display");
  } else {
    verdictEmoji.textContent = "❌";
    verdictTitle.textContent = "需要修正";
    verdictSub.textContent   = `${passCount} / ${checks.length} 項通過，請看下方說明`;
    verdictScore.style.display = "none";
    state.streak = 0;
    animateVal("streak-display");
    showToast(`📖 有 ${checks.length - passCount} 項需要修正，加油！`);
  }

  // ── Per-check list ──────────────────────────────────
  document.getElementById("check-list").innerHTML = checks.map(c => `
    <li class="check-item ${c.pass ? "check-pass" : "check-fail"}">
      <span class="check-icon">${c.pass ? "✅" : "❌"}</span>
      <div class="check-content">
        <span class="check-label">${c.label}</span>
        <span class="check-note">${c.note}</span>
      </div>
    </li>
  `).join("");

  // ── User sentence & example ─────────────────────────
  document.getElementById("user-sentence-disp").textContent = input;
  document.getElementById("example-structure").textContent  =
    buildExampleStructure(vocab, tense, stype, subj);

  // Update stats
  state.wordStats[vocab.word] = (state.wordStats[vocab.word] || 0) + 1;
  state.totalAnswered++;
  state.questionNumber++;
  updateHeaderStats();
  animateVal("total-display");
  renderProgressGrid();

  // Show feedback card
  document.getElementById("feedback-card").style.display = "block";
  setTimeout(() => {
    document.getElementById("feedback-card").scrollIntoView({ behavior: "smooth", block: "start" });
  }, 120);
}

// ──────────────────────────────────────────────────────
//  Hint modal
// ──────────────────────────────────────────────────────
function showHintModal() {
  if (!state.current) return;
  const { vocab, tense, stype, subj } = state.current;
  const exStr = buildExampleStructure(vocab, tense, stype, subj);
  const be    = getBeVerb(subj);
  const tp    = isThirdPerson(subj);

  let extra = "";
  if (tense === "現在進行式") {
    extra = `<br><strong style="color:#94a3b8;">本題 Be 動詞：</strong>
    <div class="ex-block">${subj} → <strong>${be}</strong></div>`;
  }

  document.getElementById("modal-body").innerHTML = `
    <p><strong style="color:#818cf8;">參考句型結構：</strong></p>
    <div class="ex-block">${exStr}</div>
    ${extra}
    <br>
    <p style="color:#64748b;font-size:0.78rem;">💡 這只是參考，你可以自由造句！</p>
  `;
  document.getElementById("modal-overlay").style.display = "flex";
}
window.closeModal = () => {
  document.getElementById("modal-overlay").style.display = "none";
};

// ──────────────────────────────────────────────────────
//  Event listeners
// ──────────────────────────────────────────────────────
document.getElementById("start-btn").addEventListener("click", () => {
  document.getElementById("welcome-screen").style.display = "none";
  const qa = document.getElementById("quiz-area");
  qa.style.display       = "flex";
  qa.style.flexDirection = "column";
  generateQuiz();
});

document.getElementById("submit-btn").addEventListener("click", submitAnswer);

document.getElementById("sentence-input").addEventListener("keydown", e => {
  if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
    e.preventDefault();
    submitAnswer();
  }
});

document.getElementById("hint-btn").addEventListener("click", showHintModal);

document.getElementById("modal-overlay").addEventListener("click", function(e) {
  if (e.target === this) closeModal();
});

document.getElementById("next-btn").addEventListener("click", () => {
  generateQuiz();
  window.scrollTo({ top: 0, behavior: "smooth" });
});

document.getElementById("retry-btn").addEventListener("click", () => {
  // Restore same question, hide feedback, clear input
  document.getElementById("feedback-card").style.display = "none";
  document.getElementById("sentence-input").value = "";
  document.getElementById("quiz-card").style.display = "block";
  // Roll back counters (retry doesn't count as a new question)
  state.totalAnswered = Math.max(0, state.totalAnswered - 1);
  state.questionNumber = Math.max(1, state.questionNumber - 1);
  state.wordStats[state.current.vocab.word] = Math.max(0, (state.wordStats[state.current.vocab.word] || 1) - 1);
  updateHeaderStats();
  document.getElementById("sentence-input").focus();
});

// ──────────────────────────────────────────────────────
//  Init
// ──────────────────────────────────────────────────────
(function init() {
  renderVocabList();
  renderProgressGrid();
  updateHeaderStats();
})();
