// ──────────────────────────────────────────────────────
//  English Learning System – Core Data & Logic
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

const TENSES = ["現在簡單式", "現在進行式"];
const SENTENCE_TYPES = ["肯定句", "否定句", "疑問句"];
const SUBJECTS = ["I", "You", "He", "She", "They", "My brother", "The cat", "We"];

// 3rd person singular subjects
const THIRD_PERSON = ["He", "She", "My brother", "The cat"];

// ──────────────────────────────────────────────────────
//  State
// ──────────────────────────────────────────────────────
let state = {
  questionNumber: 1,
  score: 0,
  streak: 0,
  totalAnswered: 0,
  current: null,              // current quiz params
  evalDone: false,
  wordStats: {},              // { word: count }
};

// Init word stats
VOCAB_BANK.forEach(v => { state.wordStats[v.word] = 0; });

// ──────────────────────────────────────────────────────
//  Utility
// ──────────────────────────────────────────────────────
function randFrom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function showToast(msg, duration = 2500) {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), duration);
}

function animateStatVal(elId) {
  const el = document.getElementById(elId);
  el.classList.remove("score-anim");
  void el.offsetWidth; // reflow
  el.classList.add("score-anim");
}

// ──────────────────────────────────────────────────────
//  Grammar Logic (mirror of Python logic)
// ──────────────────────────────────────────────────────
function isThirdPerson(subj) {
  return THIRD_PERSON.includes(subj);
}

function getBeVerb(subj) {
  if (subj === "I") return "am";
  if (isThirdPerson(subj)) return "is";
  return "are";
}

function buildHints(vocab, tense, stype, subj) {
  const hints = [];
  const tp = isThirdPerson(subj);

  if (tense === "現在簡單式") {
    if (stype === "肯定句") {
      if (tp) {
        hints.push(`主詞「${subj}」為第三人稱單數，動詞記得加 <strong>-s</strong> 或 <strong>-es</strong>。`);
      } else {
        hints.push(`主詞「${subj}」不是第三人稱單數，動詞用原形即可。`);
      }
    } else if (stype === "否定句") {
      const aux = tp ? "doesn't" : "don't";
      hints.push(`否定句需使用助動詞 <strong style="color:#818cf8;">${aux}</strong> + <strong>原形動詞</strong>。`);
      hints.push(`否定句格式：<em>${subj} ${aux} ${vocab.word} ...</em>`);
    } else if (stype === "疑問句") {
      const aux = tp ? "Does" : "Do";
      hints.push(`疑問句以助動詞 <strong style="color:#818cf8;">${aux}</strong> 開頭，後面接主詞與原形動詞。`);
      hints.push(`問句格式：<em>${aux} ${subj.toLowerCase()} ${vocab.word} ...?</em>`);
    }
    if (vocab.pos === "v.") {
      hints.push(`「<strong style="color:#6366f1;">${vocab.word}</strong>」是動詞，可直接用在句中。`);
    } else {
      hints.push(`「<strong style="color:#6366f1;">${vocab.word}</strong>」是${vocab.pos.replace(".", "")}，記得搭配動詞使用。`);
    }
  } else if (tense === "現在進行式") {
    const be = getBeVerb(subj);
    hints.push(`現在進行式公式：<strong style="color:#06b6d4;">[be + V-ing]</strong>`);
    hints.push(`主詞「${subj}」應使用 be 動詞：<strong style="color:#06b6d4;">${be}</strong>`);
    if (stype === "否定句") {
      hints.push(`否定句：<em>${subj} ${be} <strong>not</strong> ${vocab.pos === "v." ? vocab.word : "..."}ing ...</em>`);
    } else if (stype === "疑問句") {
      hints.push(`疑問句：把 be 動詞移到句首<em>：<strong>${be.charAt(0).toUpperCase() + be.slice(1)}</strong> ${subj.toLowerCase()} ${vocab.pos === "v." ? vocab.word : "..."}ing ...?</em>`);
    }
    if (vocab.pos !== "v.") {
      hints.push(`「<strong style="color:#6366f1;">${vocab.word}</strong>」是{${vocab.pos.replace(".", "")}}，搭配動詞 -ing 使用。`);
    }
  }

  return hints;
}

function buildExampleStructure(vocab, tense, stype, subj) {
  const tp = isThirdPerson(subj);
  const be = getBeVerb(subj);
  const isVerb = vocab.pos === "v.";

  if (tense === "現在簡單式") {
    if (stype === "肯定句") {
      if (isVerb) {
        const v = tp ? (vocab.word.endsWith("y") ? vocab.word.slice(0,-1) + "ies" : vocab.word + "s") : vocab.word;
        return `${subj} ${v} [地點/時間] .`;
      } else {
        return `${subj} [動詞] ${vocab.word} [補充] .`;
      }
    } else if (stype === "否定句") {
      const aux = tp ? "doesn't" : "don't";
      return isVerb ? `${subj} ${aux} ${vocab.word} [地點/時間] .` : `${subj} ${aux} [動詞] ${vocab.word} .`;
    } else {
      const aux = tp ? "Does" : "Do";
      return isVerb ? `${aux} ${subj.toLowerCase()} ${vocab.word} [地點/時間] ?` : `${aux} ${subj.toLowerCase()} [動詞] ${vocab.word} ?`;
    }
  } else {
    if (stype === "肯定句") {
      return isVerb ? `${subj} ${be} ${vocab.word}ing [地點/時間] .` : `${subj} ${be} [動詞]ing [介紹 ${vocab.word}] .`;
    } else if (stype === "否定句") {
      return isVerb ? `${subj} ${be} not ${vocab.word}ing [地點/時間] .` : `${subj} ${be} not [動詞]ing [介紹 ${vocab.word}] .`;
    } else {
      const beUp = be.charAt(0).toUpperCase() + be.slice(1);
      return isVerb ? `${beUp} ${subj.toLowerCase()} ${vocab.word}ing [地點/時間] ?` : `${beUp} ${subj.toLowerCase()} [動詞]ing [介紹 ${vocab.word}] ?`;
    }
  }
}

// ──────────────────────────────────────────────────────
//  UI Rendering
// ──────────────────────────────────────────────────────
function renderVocabList(activeWord = null) {
  const container = document.getElementById("vocab-list");
  container.innerHTML = VOCAB_BANK.map(v => `
    <div class="vocab-item ${v.word === activeWord ? "active-word" : ""}">
      <span class="vocab-word">${v.word}</span>
      <span class="vocab-pos">${v.pos}</span>
      <span class="vocab-meaning">${v.meaning}</span>
    </div>
  `).join("");

  document.getElementById("vocab-count").textContent = `${VOCAB_BANK.length} 個單字`;
}

function renderProgressGrid() {
  const container = document.getElementById("progress-grid");
  container.innerHTML = VOCAB_BANK.map(v => {
    const cnt = state.wordStats[v.word] || 0;
    return `
      <div class="progress-cell ${cnt > 0 ? "done" : ""}">
        <div class="progress-word">${v.word}</div>
        <div class="progress-count">已練習 ${cnt} 次</div>
        <div class="progress-dot"></div>
      </div>
    `;
  }).join("");
}

function updateHeaderStats() {
  document.getElementById("score-display").textContent = state.score;
  document.getElementById("streak-display").textContent = state.streak;
  document.getElementById("total-display").textContent = state.totalAnswered;
}

// ──────────────────────────────────────────────────────
//  Quiz Generation
// ──────────────────────────────────────────────────────
function generateQuiz() {
  const vocab  = randFrom(VOCAB_BANK);
  const tense  = randFrom(TENSES);
  const stype  = randFrom(SENTENCE_TYPES);
  const subj   = randFrom(SUBJECTS);

  state.current = { vocab, tense, stype, subj };

  // Update display
  document.getElementById("disp-word").textContent     = vocab.word;
  document.getElementById("disp-pos").textContent      = vocab.pos;
  document.getElementById("disp-meaning").textContent  = vocab.meaning;
  document.getElementById("disp-subj").textContent     = subj;
  document.getElementById("disp-tense").textContent    = tense;
  document.getElementById("disp-type").textContent     = stype;
  document.getElementById("question-number").textContent = `第 ${state.questionNumber} 題`;

  // Hints
  const hints = buildHints(vocab, tense, stype, subj);
  const hintList = document.getElementById("hint-list");
  hintList.innerHTML = hints.map(h => `<li>${h}</li>`).join("");

  // Clear input & hide feedback
  document.getElementById("sentence-input").value = "";
  document.getElementById("feedback-card").style.display = "none";
  document.getElementById("quiz-card").style.display = "block";

  // Reset eval state
  state.evalDone = false;
  document.getElementById("eval-correct").classList.remove("selected");
  document.getElementById("eval-wrong").classList.remove("selected");
  document.getElementById("next-btn").style.display = "none";

  // Update sidebars
  renderVocabList(vocab.word);
  renderProgressGrid();
  updateHeaderStats();

  // Scroll to quiz area
  setTimeout(() => {
    document.getElementById("quiz-card").scrollIntoView({ behavior: "smooth", block: "start" });
  }, 100);
}

// ──────────────────────────────────────────────────────
//  Submit Handler
// ──────────────────────────────────────────────────────
function submitAnswer() {
  const input = document.getElementById("sentence-input").value.trim();
  if (!input) {
    showToast("⚠️ 請先輸入你的英文句子！");
    document.getElementById("sentence-input").focus();
    return;
  }

  const { vocab, tense, stype, subj } = state.current;

  // Show feedback card
  document.getElementById("user-sentence-disp").textContent = input;
  document.getElementById("feedback-icon").textContent = "🔍";
  document.getElementById("feedback-title").textContent = "系統 AI 分析";

  // Feedback hints
  const hints = buildHints(vocab, tense, stype, subj);
  const fbHints = document.getElementById("feedback-hints");
  fbHints.innerHTML = hints.map(h => `<li>${h}</li>`).join("");

  // Example structure
  const exStr = buildExampleStructure(vocab, tense, stype, subj);
  document.getElementById("example-structure").textContent = exStr;

  // Show next btn hidden until self-eval
  document.getElementById("next-btn").style.display = "none";

  // Update word stats
  state.wordStats[vocab.word] = (state.wordStats[vocab.word] || 0) + 1;
  state.totalAnswered++;
  state.questionNumber++;
  updateHeaderStats();
  animateStatVal("total-display");

  // Show feedback
  document.getElementById("feedback-card").style.display = "block";
  setTimeout(() => {
    document.getElementById("feedback-card").scrollIntoView({ behavior: "smooth", block: "start" });
  }, 100);
}

// ──────────────────────────────────────────────────────
//  Self Evaluation
// ──────────────────────────────────────────────────────
window.selfEval = function(correct) {
  if (state.evalDone) return;
  state.evalDone = true;

  if (correct) {
    state.score += 10;
    state.streak++;
    document.getElementById("eval-correct").classList.add("selected");
    document.getElementById("feedback-icon").textContent = "🎉";
    showToast(`🎉 太棒了！+10分 ${state.streak >= 3 ? "🔥 連勝 " + state.streak + " 題！" : ""}`);
    animateStatVal("score-display");
    animateStatVal("streak-display");
  } else {
    state.streak = 0;
    document.getElementById("eval-wrong").classList.add("selected");
    document.getElementById("feedback-icon").textContent = "📖";
    showToast("沒關係！看看語法提示，再接再厲！");
    animateStatVal("streak-display");
  }

  updateHeaderStats();
  document.getElementById("next-btn").style.display = "flex";
  setTimeout(() => {
    document.getElementById("next-btn").scrollIntoView({ behavior: "smooth", block: "center" });
  }, 200);
};

// ──────────────────────────────────────────────────────
//  Hint Modal
// ──────────────────────────────────────────────────────
function showHintModal() {
  if (!state.current) return;
  const { vocab, tense, stype, subj } = state.current;
  const exStr = buildExampleStructure(vocab, tense, stype, subj);

  const be = getBeVerb(subj);
  const tp = isThirdPerson(subj);

  let extraExamples = "";
  if (tense === "現在簡單式" && stype === "肯定句") {
    extraExamples = `
      <br><strong style="color:#94a3b8;">完整例句：</strong><br>
      <div class="ex-block">${subj} ${vocab.pos === "v." ? vocab.word + (tp ? "s" : "") : "has"} a nice ${vocab.word}.</div>
    `;
  } else if (tense === "現在進行式") {
    const beNeg = `${be} not`;
    extraExamples = `
      <br><strong style="color:#94a3b8;">be 動詞對照：</strong><br>
      I → <strong>am</strong> &nbsp;|&nbsp; He/She/It → <strong>is</strong> &nbsp;|&nbsp; You/We/They → <strong>are</strong>
      <br><br><strong style="color:#94a3b8;">本題 be 動詞：</strong><br>
      <div class="ex-block">${subj} <strong>${be}</strong> ...ing</div>
    `;
  }

  const body = `
    <p><strong style="color:#818cf8;">參考句型結構：</strong></p>
    <div class="ex-block">${exStr}</div>
    ${extraExamples}
    <br>
    <p style="color:#64748b;font-size:0.78rem;">💡 這只是參考結構，你可以自由造句！</p>
  `;

  document.getElementById("modal-body").innerHTML = body;
  document.getElementById("modal-overlay").style.display = "flex";
}

window.closeModal = function() {
  document.getElementById("modal-overlay").style.display = "none";
};

// Close modal on overlay click
document.getElementById("modal-overlay").addEventListener("click", function(e) {
  if (e.target === this) closeModal();
});

// ──────────────────────────────────────────────────────
//  Event Listeners
// ──────────────────────────────────────────────────────
document.getElementById("start-btn").addEventListener("click", function() {
  document.getElementById("welcome-screen").style.display = "none";
  document.getElementById("quiz-area").style.display = "flex";
  document.getElementById("quiz-area").style.flexDirection = "column";
  generateQuiz();
});

document.getElementById("submit-btn").addEventListener("click", submitAnswer);

document.getElementById("sentence-input").addEventListener("keydown", function(e) {
  if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
    e.preventDefault();
    submitAnswer();
  }
});

document.getElementById("hint-btn").addEventListener("click", showHintModal);

document.getElementById("next-btn").addEventListener("click", function() {
  generateQuiz();
  window.scrollTo({ top: 0, behavior: "smooth" });
});

// ──────────────────────────────────────────────────────
//  Init
// ──────────────────────────────────────────────────────
(function init() {
  renderVocabList();
  renderProgressGrid();
  updateHeaderStats();
})();
