// MAIN JAVASCRIPT FILE - Controls all the flashcard behavior

// VARIABLES TO TRACK STATE
let currentCategory = null; // Which category is selected
let currentCards = []; // Array of cards in current category
let currentCardIndex = 0; // Which card we're on (starts at 0)
let isFlipped = false; // Is the card showing the back?
let isMultiSelectMode = false; // Is multi-select mode active?
let selectedCategories = []; // Array of selected category names

const memorizedCategories = [
  "Chapter 60.2 (Insurance Exclusive to Foreign Workers)",
];

const categoryDisplayNames = {
  grammarRules: "Grammar Rules (Ch. 1-60)",
};

function getCategoryLabel(categoryName) {
  return categoryDisplayNames[categoryName] || categoryName;
}

// GET REFERENCES TO HTML ELEMENTS
const categoryContainer = document.getElementById("category-container");
const categoryButtonsDiv = document.getElementById("category-buttons");
const flashcardArea = document.getElementById("flashcard-area");
const flashcard = document.getElementById("flashcard");
const cardContent = flashcard.querySelector(".card-content");
const prevBtn = document.getElementById("prev-btn");
const nextBtn = document.getElementById("next-btn");
const cardCounter = document.getElementById("card-counter");
const backToCategoriesBtn = document.getElementById("back-to-categories");
const shuffleBtn = document.getElementById("shuffle-btn");
const multiSelectToggle = document.getElementById("multi-select-toggle");
const selectAllBtn = document.getElementById("select-all-btn");
const startMultiBtn = document.getElementById("start-multi-btn");
const currentCategoryDisplay = document.getElementById(
  "current-category-display",
);

// SHUFFLE FUNCTION - Randomizes an array
function shuffleArray(array) {
  const shuffled = [...array];

  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return shuffled;
}

// STEP 1: CREATE CATEGORY BUTTONS WHEN PAGE LOADS
function createCategoryButtons() {
  // Check if flashcardData exists
  if (typeof flashcardData === "undefined") {
    categoryButtonsDiv.innerHTML =
      '<p class="no-results">No flashcard data loaded. Please check your data file.</p>';
    return;
  }

  for (let categoryName in flashcardData) {
    const button = document.createElement("button");
    button.className = "category-btn";
    button.textContent = getCategoryLabel(categoryName);
    button.dataset.category = categoryName;

    if (memorizedCategories.includes(categoryName)) {
      button.classList.add("memorized");
    }

    button.addEventListener("click", function () {
      if (isMultiSelectMode) {
        toggleCategorySelection(button, categoryName);
      } else {
        loadCategory(categoryName);
      }
    });

    categoryButtonsDiv.appendChild(button);
  }
  renderHardWords(); // Show hard words on load
}

// TOGGLE CATEGORY SELECTION IN MULTI-SELECT MODE
function toggleCategorySelection(button, categoryName) {
  const index = selectedCategories.indexOf(categoryName);

  if (index > -1) {
    // Remove from selection
    selectedCategories.splice(index, 1);
    button.classList.remove("selected");
  } else {
    // Add to selection
    selectedCategories.push(categoryName);
    button.classList.add("selected");
  }

  // Update start button visibility
  if (selectedCategories.length > 0) {
    startMultiBtn.classList.remove("hidden");
    startMultiBtn.textContent = `Start Selected Categories (${selectedCategories.length}) →`;
  } else {
    startMultiBtn.classList.add("hidden");
  }
}

// MULTI-SELECT MODE TOGGLE
multiSelectToggle.addEventListener("click", function () {
  isMultiSelectMode = !isMultiSelectMode;

  if (isMultiSelectMode) {
    multiSelectToggle.textContent = "📖 Single Select Mode";
    multiSelectToggle.classList.add("active");
    selectAllBtn.classList.remove("hidden");

    // Clear any existing selections
    selectedCategories = [];
    const allButtons = categoryButtonsDiv.querySelectorAll(".category-btn");
    allButtons.forEach((btn) => btn.classList.remove("selected"));
  } else {
    multiSelectToggle.textContent = "📚 Multi-Select Mode";
    multiSelectToggle.classList.remove("active");
    selectAllBtn.classList.add("hidden");
    startMultiBtn.classList.add("hidden");

    // Clear selections
    selectedCategories = [];
    const allButtons = categoryButtonsDiv.querySelectorAll(".category-btn");
    allButtons.forEach((btn) => btn.classList.remove("selected"));
  }
});

// SELECT ALL BUTTON
selectAllBtn.addEventListener("click", function () {
  const allButtons = categoryButtonsDiv.querySelectorAll(".category-btn");
  const memorizedSelected = selectedCategories.filter((c) =>
    memorizedCategories.includes(c),
  );
  const allMemorizedSelected =
    memorizedSelected.length === memorizedCategories.length;

  if (allMemorizedSelected) {
    // Deselect all
    selectedCategories = [];
    allButtons.forEach((btn) => btn.classList.remove("selected"));
    startMultiBtn.classList.add("hidden");
    selectAllBtn.textContent = "✓ Select All";
  } else {
    // Select only memorized categories
    selectedCategories = [];
    allButtons.forEach((btn) => {
      const categoryName = btn.dataset.category;
      if (
        memorizedCategories.includes(categoryName) &&
        btn.style.display !== "none"
      ) {
        selectedCategories.push(categoryName);
        btn.classList.add("selected");
      } else {
        btn.classList.remove("selected");
      }
    });
    startMultiBtn.classList.remove("hidden");
    startMultiBtn.textContent = `Start Selected Categories (${selectedCategories.length}) →`;
    selectAllBtn.textContent = "✗ Deselect All";
  }
});

// START MULTI-CATEGORY SESSION
startMultiBtn.addEventListener("click", function () {
  if (selectedCategories.length === 0) return;

  loadMultipleCategories(selectedCategories);
});

// ===== SIMPLE MATH GENERATORS =====
const SINO_DIGITS = ["영", "일", "이", "삼", "사", "오", "육", "칠", "팔", "구"];

// Number -> Sino-Korean in Hangul (0 to 100). Example: 25 -> "이십오"
function sinoKorean(n) {
  if (n === 100) return "백";
  if (n === 0) return SINO_DIGITS[0];

  const tens = Math.floor(n / 10);
  const ones = n % 10;

  let result = "";
  if (tens > 0) result += (tens === 1 ? "" : SINO_DIGITS[tens]) + "십";
  if (ones > 0) result += SINO_DIGITS[ones];
  return result;
}

// Picks 은 or 는 depending on whether the last syllable ends in a consonant
function eunNeun(word) {
  const code = word.charCodeAt(word.length - 1) - 0xac00;
  return code >= 0 && code % 28 !== 0 ? "은" : "는";
}

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Builds one flashcard from a math problem
function buildMathCard({ a, b, answer, word, symbol }) {
  const aKo = sinoKorean(a);
  const bKo = sinoKorean(b);
  const ansKo = sinoKorean(answer);
  const particle = eunNeun(bKo);

  return {
    korean: `${a} ${word} ${b}${particle}?`, // front: digits, like your book
    spokenKorean: `${aKo} ${word} ${bKo}${particle}?`, // back: the question in Hangul (only this is spoken automatically)
    meaning: `${a} ${symbol} ${b} = ${answer}`,
    answers: [{ korean: `${ansKo}입니다.` }], // shown on the back, spoken only when you press Play Answer
  };
}

// Makes 5 different problems using the given problem-maker
function generateMathCards(makeProblem, count = 5) {
  const cards = [];
  const seen = new Set();
  let attempts = 0;

  while (cards.length < count && attempts < 500) {
    attempts++;
    const problem = makeProblem();
    const key = `${problem.a}|${problem.b}`;
    if (seen.has(key)) continue; // no repeated problems
    seen.add(key);
    cards.push(buildMathCard(problem));
  }

  return cards;
}

// Addition: answer is at most 30
function generateAdditionCards() {
  return generateMathCards(() => {
    const a = randInt(1, 29);
    const b = randInt(1, 30 - a);
    return { a, b, answer: a + b, word: "더하기", symbol: "+" };
  });
}

// Subtraction: first number is at most 30, never negative, answer can be 0
function generateSubtractionCards() {
  return generateMathCards(() => {
    const a = randInt(1, 30);
    const b = randInt(1, a);
    return { a, b, answer: a - b, word: "빼기", symbol: "-" };
  });
}

// Multiplication: single digits only (0-9)
function generateMultiplicationCards() {
  return generateMathCards(() => {
    const a = randInt(0, 9);
    const b = randInt(0, 9);
    return { a, b, answer: a * b, word: "곱하기", symbol: "×" };
  });
}

// Division: always a whole number, dividend at most 100, divisor 2-10
function generateDivisionCards() {
  return generateMathCards(() => {
    const b = randInt(2, 10);
    const answer = randInt(0, Math.floor(100 / b));
    return { a: b * answer, b, answer, word: "나누기", symbol: "÷" };
  });
}

// Categories that make new cards every time they are opened
const generatedCategories = {
  "Simple Math - Addition (더하기)": generateAdditionCards,
  "Simple Math - Subtraction (빼기)": generateSubtractionCards,
  "Simple Math - Multiplication (곱하기)": generateMultiplicationCards,
  "Simple Math - Division (나누기)": generateDivisionCards,
};

// Gets the cards for a category (generated or regular, in original order)
function getCategoryCards(categoryName) {
  const generator = generatedCategories[categoryName];
  return generator ? generator() : [...(flashcardData[categoryName] || [])];
}

// STEP 2: LOAD A CATEGORY
function loadCategory(categoryName) {
  currentCategory = categoryName;

  // Generated categories make new cards; regular ones keep their original order
  currentCards = getCategoryCards(categoryName);

  currentCardIndex = 0;
  isFlipped = false;

  // Display current category
  currentCategoryDisplay.innerHTML = `<div class="category-label">Category: ${getCategoryLabel(categoryName)}</div>`;

  categoryContainer.classList.add("hidden");
  flashcardArea.classList.remove("hidden");

  displayCard();
}

// LOAD MULTIPLE CATEGORIES
function loadMultipleCategories(categories) {
  currentCategory = "Multiple Categories";
  currentCards = [];

  // Combine all cards from selected categories
  categories.forEach((categoryName) => {
    const categorizedCards = getCategoryCards(categoryName).map((card) => ({
      ...card,
      sourceCategory: getCategoryLabel(categoryName),
    }));
    currentCards = currentCards.concat(categorizedCards);
  });

  // Shuffle combined cards
  // currentCards = shuffleArray(currentCards);

  currentCardIndex = 0;
  isFlipped = false;

  // Display selected categories
  const categoryList = categories.map(getCategoryLabel).join(", ");
  currentCategoryDisplay.innerHTML = `
        <div class="category-label">
            <strong>Combined Categories (${categories.length}):</strong><br>
            <small>${categoryList}</small>
        </div>
    `;

  categoryContainer.classList.add("hidden");
  flashcardArea.classList.remove("hidden");

  displayCard();
}

// STEP 3: DISPLAY A CARD
function displayCard() {
  const card = currentCards[currentCardIndex];

  if (isFlipped) {
    // Show BACK of card
    const spokenText = card.spokenKorean || card.korean;

    // Vocabulary breakdown (Reading Practice)
    let breakdownHTML = "";
    if (card.breakdown && card.breakdown.length > 0) {
      breakdownHTML = '<div class="breakdown-section">';
      breakdownHTML += "<h3>Vocabulary Breakdown:</h3>";
      breakdownHTML += '<div class="breakdown-list">';

      card.breakdown.forEach((item) => {
        breakdownHTML += '<div class="breakdown-item">';
        breakdownHTML += `<div class="breakdown-word"><strong>${item.word}</strong></div>`;

        if (item.dictForm !== item.word) {
          breakdownHTML += `<div class="breakdown-dict">Dictionary form: ${item.dictForm}</div>`;
        }

        breakdownHTML += `<div class="breakdown-role">${item.role}</div>`;
        breakdownHTML += `<div class="breakdown-meaning">${item.meaning}</div>`;

        if (item.conjugation) {
          breakdownHTML += `<div class="breakdown-conjugation">${item.conjugation}</div>`;
        }

        if (item.explanation) {
          breakdownHTML += `<div class="breakdown-explanation">${item.explanation}</div>`;
        }

        breakdownHTML += "</div>";
      });

      breakdownHTML += "</div></div>";
    }

    // Grammar usage
    let usageHTML = "";
    if (card.usage) {
      usageHTML = `
        <div class="usage-section">
          <h3>Usage:</h3>
          <div class="usage-text">${card.usage}</div>
        </div>
      `;
    }

    // Answers: supports the new "answers" list and the old single "answer" field
    const answers =
      card.answers ||
      (card.answer
        ? [
            {
              korean: card.answer,
              romanization: card.answerRomanization,
              meaning: card.answerMeaning,
            },
          ]
        : []);

    let answerHTML = "";
    if (answers.length > 0) {
      answerHTML = `
        <div class="answer-section">
          <h3>${answers.length > 1 ? "Sample Answers:" : "Sample Answer:"}</h3>
          ${answers
            .map(
              (a) => `
            <div class="answer-item">
              <div class="answer-korean">${a.korean}</div>
              ${a.romanization ? `<div class="answer-romanization">${a.romanization}</div>` : ""}
              ${a.meaning ? `<div class="answer-meaning">${a.meaning}</div>` : ""}
              <button class="replay-btn">🔊 Play Answer</button>
            </div>`,
            )
            .join("")}
        </div>
      `;
    }

    // Badges
    let chapterBadgeHTML = "";
    if (card.chapter !== undefined && card.title) {
      chapterBadgeHTML = `<div class="source-category">Ch. ${card.chapter} — ${card.title}</div>`;
    }

    let sourceCategoryHTML = "";
    if (card.sourceCategory) {
      sourceCategoryHTML = `<div class="source-category">From: ${card.sourceCategory}</div>`;
    }

    cardContent.innerHTML = `
      <div class="card-back">
        ${sourceCategoryHTML}
        ${chapterBadgeHTML}
        <div class="korean">${spokenText}</div>
        ${card.romanization ? `<div class="romanization">${card.romanization}</div>` : ""}
        ${card.meaning ? `<div class="meaning">${card.meaning}</div>` : ""}
        ${usageHTML}
        ${answerHTML}
        ${breakdownHTML}
        <button class="mark-hard-btn" id="mark-hard-btn">🔴 Mark as Hard</button>
      </div>
    `;

    // "Mark as Hard" button
    const markHardBtn = document.getElementById("mark-hard-btn");
    if (markHardBtn) {
      const hardWords = getHardWords();
      const alreadyHard = hardWords.some(
        (w) => w.korean === spokenText || w.korean === card.korean,
      );
      if (alreadyHard) {
        markHardBtn.textContent = "✓ Marked as Hard";
        markHardBtn.disabled = true;
      }
      markHardBtn.addEventListener("click", function (e) {
        e.stopPropagation(); // Don't flip the card
        markAsHard(card);
        this.textContent = "✓ Marked as Hard";
        this.disabled = true;
      });
    }

    // "Play Answer" buttons - the ONLY way answers get spoken (never automatic)
    cardContent.querySelectorAll(".replay-btn").forEach((btn, i) => {
      btn.addEventListener("click", function (e) {
        e.stopPropagation(); // Don't flip the card
        stopAutoPlay(); // don't let auto play talk over the answer
        speakKorean(answers[i].korean.replace(/_+/g, " ")); // skip blanks
      });
    });

    // Speak the question only
    const runId = autoPlayRunId;
    speakKorean(
      spokenText,
      isAutoPlaying ? () => onAutoPlaySpeechEnd(runId) : null,
    );
  } else {
    // Show FRONT of card
    cardContent.innerHTML = `
      <div class="card-front">${card.korean}</div>
    `;
  }

  cardCounter.textContent = `${currentCardIndex + 1} / ${currentCards.length}`;
  updateNavigationButtons();
}

// SPEECH SYNTHESIS FUNCTION
// SPEECH SYNTHESIS FUNCTION
let speakTimer = null;

function speakKorean(text, onEnd) {
  if (!text) return;

  const synth = window.speechSynthesis;
  clearTimeout(speakTimer);
  synth.cancel(); // Cancel any ongoing speech

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "ko-KR";
  utterance.rate = 0.8; // Slightly slower for learning

  if (onEnd) {
    utterance.onend = onEnd;
    utterance.onerror = onEnd; // don't get stuck if speech fails
  }

  // Small delay: Chrome can drop speech called right after cancel()
  speakTimer = setTimeout(() => synth.speak(utterance), 100);
}

// HARD WORDS SYSTEM
function getHardWords() {
  const stored = localStorage.getItem("hardWords");
  return stored ? JSON.parse(stored) : [];
}

function saveHardWords(words) {
  localStorage.setItem("hardWords", JSON.stringify(words));
}

function markAsHard(card) {
  const hardWords = getHardWords();
  // Avoid duplicates based on korean text
  const alreadyAdded = hardWords.some((w) => w.korean === card.korean);
  if (!alreadyAdded) {
    // Store only the core fields
    hardWords.push({
      korean: card.korean,
      romanization: card.romanization,
      meaning: card.meaning,
    });
    saveHardWords(hardWords);
  }
  renderHardWords();
}

function removeFromHard(korean) {
  let hardWords = getHardWords();
  hardWords = hardWords.filter((w) => w.korean !== korean);
  saveHardWords(hardWords);
  renderHardWords();
}

function renderHardWords() {
  const hardWords = getHardWords();
  const container = document.getElementById("hard-words-section");
  const list = document.getElementById("hard-words-list");
  const copyBtn = document.getElementById("copy-hard-words-btn");
  const clearBtn = document.getElementById("clear-hard-words-btn");

  if (hardWords.length === 0) {
    container.classList.add("hidden");
    return;
  }

  container.classList.remove("hidden");
  list.innerHTML = "";

  hardWords.forEach((word) => {
    const item = document.createElement("div");
    item.className = "hard-word-item";
    item.innerHTML = `
            <span class="hard-word-korean">${word.korean}</span>
            <span class="hard-word-details">${word.romanization ? word.romanization + " — " : ""}${word.meaning}</span>
            <button class="remove-hard-btn" data-korean="${word.korean}" title="Remove">✕</button>
        `;
    item
      .querySelector(".remove-hard-btn")
      .addEventListener("click", function () {
        removeFromHard(this.dataset.korean);
      });
    list.appendChild(item);
  });

  // Build the copyable JS format
  const jsLines = hardWords
    .map(
      (w) =>
        `        { korean: "${w.korean}", ${w.romanization ? `romanization: "${w.romanization}", ` : ""}meaning: "${w.meaning}" },`,
    )
    .join("\n");
  document.getElementById("hard-words-code").textContent = jsLines;
}

// Copy to clipboard
document
  .getElementById("copy-hard-words-btn")
  .addEventListener("click", function () {
    const code = document.getElementById("hard-words-code").textContent;
    navigator.clipboard.writeText(code).then(() => {
      this.textContent = "✓ Copied!";
      setTimeout(() => (this.textContent = "📋 Copy JS"), 2000);
    });
  });

document
  .getElementById("clear-hard-words-btn")
  .addEventListener("click", function () {
    if (confirm("Clear all hard words?")) {
      localStorage.removeItem("hardWords");
      renderHardWords();
    }
  });

// STEP 4: UPDATE NAVIGATION BUTTONS
function updateNavigationButtons() {
  if (currentCardIndex === 0) {
    prevBtn.disabled = true;
  } else {
    prevBtn.disabled = false;
  }

  if (currentCardIndex === currentCards.length - 1) {
    nextBtn.disabled = true;
  } else {
    nextBtn.disabled = false;
  }
}

// STEP 5: FLIP CARD (when clicked)
flashcard.addEventListener("click", function () {
  stopAutoPlay();
  isFlipped = !isFlipped;
  displayCard();
});

// STEP 6: PREVIOUS BUTTON
prevBtn.addEventListener("click", function () {
  stopAutoPlay();
  if (currentCardIndex > 0) {
    currentCardIndex--;
    isFlipped = false;
    displayCard();
  }
});

// STEP 7: NEXT BUTTON
nextBtn.addEventListener("click", function () {
  stopAutoPlay();
  if (currentCardIndex < currentCards.length - 1) {
    currentCardIndex++;
    isFlipped = false;
    displayCard();
  }
});

// STEP 8: BACK TO CATEGORIES BUTTON
backToCategoriesBtn.addEventListener("click", function () {
  stopAutoPlay();
  // Stop any ongoing speech
  window.speechSynthesis.cancel();

  flashcardArea.classList.add("hidden");
  categoryContainer.classList.remove("hidden");

  currentCategory = null;
  currentCards = [];
  currentCardIndex = 0;
  isFlipped = false;
});

// STEP 9: SHUFFLE BUTTON
shuffleBtn.addEventListener("click", function () {
  stopAutoPlay();
  currentCards = shuffleArray(currentCards);
  currentCardIndex = 0;
  isFlipped = false;
  displayCard();
});

// AUTO PLAY
const autoPlayBtn = document.getElementById("autoplay-btn");
const autoPlayTimerDisplay = document.getElementById("autoplay-timer");
let countdownInterval = null;
let isAutoPlaying = false;

// Shows a live countdown like "Next card in 3s"
function startCountdown(seconds, label) {
  stopCountdown();
  const endTime = Date.now() + seconds * 1000;
  autoPlayTimerDisplay.classList.remove("hidden");

  function update() {
    const remaining = Math.max(0, Math.ceil((endTime - Date.now()) / 1000));
    autoPlayTimerDisplay.textContent = `⏱ ${label} ${remaining}s`;
  }

  update();
  countdownInterval = setInterval(update, 100);
}

function stopCountdown() {
  clearInterval(countdownInterval);
  countdownInterval = null;
}

function hideTimerDisplay() {
  stopCountdown();
  autoPlayTimerDisplay.classList.add("hidden");
}
let autoPlayTimer = null;
let autoPlayRunId = 0; // lets us ignore stale speech callbacks
let autoPlayInterval = 4; // seconds to wait after each card is spoken (user can change it)

// Ask the user for the interval. Returns the number of seconds, or null if cancelled/invalid.
function askAutoPlayInterval() {
  const input = prompt(
    "How many seconds should the gap be between flashcards?\n(The wait starts after each card is spoken.)",
    autoPlayInterval,
  );

  if (input === null) return null; // user pressed Cancel

  const seconds = parseFloat(input);
  if (isNaN(seconds) || seconds < 0) {
    alert("Please enter a valid number of seconds (for example 4).");
    return null;
  }

  return seconds;
}

function startAutoPlay() {
  if (currentCards.length === 0) return;

  // Ask for the interval first. Cancel = don't start.
  const seconds = askAutoPlayInterval();
  if (seconds === null) return;
  autoPlayInterval = seconds;

  isAutoPlaying = true;
  autoPlayRunId++;
  autoPlayBtn.textContent = "⏸ Stop Auto Play";

  // Wait 2 seconds, then play the current card (this first wait stays fixed)
  startCountdown(2, "Starting in");
  autoPlayTimer = setTimeout(autoPlayCurrentCard, 2000);
}

function stopAutoPlay(cancelSpeech = false) {
  isAutoPlaying = false;
  autoPlayRunId++;
  clearTimeout(autoPlayTimer);
  autoPlayTimer = null;
  autoPlayBtn.textContent = "▶ Auto Play";
  hideTimerDisplay();

  if (cancelSpeech) {
    window.speechSynthesis.cancel();
  }
}

function autoPlayCurrentCard() {
  if (!isAutoPlaying) return;

  stopCountdown();
  autoPlayTimerDisplay.classList.remove("hidden");
  autoPlayTimerDisplay.textContent = "🔊 Speaking...";

  isFlipped = true;
  displayCard(); // flips the card and speaks it
}

function onAutoPlaySpeechEnd(runId) {
  // Ignore if autoplay was stopped or restarted since this card started
  if (!isAutoPlaying || runId !== autoPlayRunId) return;

  // Last card? We're done.
  if (currentCardIndex >= currentCards.length - 1) {
    stopAutoPlay();
    return;
  }

  // Wait the user's chosen interval after speaking, then play the next card
  startCountdown(autoPlayInterval, "Next card in");
  autoPlayTimer = setTimeout(function () {
    if (!isAutoPlaying) return;
    currentCardIndex++;
    autoPlayCurrentCard();
  }, autoPlayInterval * 1000);
}

autoPlayBtn.addEventListener("click", function () {
  if (isAutoPlaying) {
    stopAutoPlay(true);
  } else {
    startAutoPlay();
  }
});

// RUN THIS WHEN PAGE LOADS
createCategoryButtons();

// SEARCH FEATURE
const categorySearch = document.getElementById("category-search");

categorySearch.addEventListener("input", function () {
  const query = this.value.toLowerCase().trim();
  const buttons = categoryButtonsDiv.querySelectorAll(".category-btn");
  let visibleCount = 0;

  buttons.forEach(function (btn) {
    if (btn.textContent.toLowerCase().includes(query)) {
      btn.style.display = "";
      visibleCount++;
    } else {
      btn.style.display = "none";
    }
  });

  // Remove old no-results message if any
  const existing = categoryButtonsDiv.querySelector(".no-results");
  if (existing) existing.remove();

  if (visibleCount === 0) {
    const msg = document.createElement("p");
    msg.className = "no-results";
    msg.textContent = "No categories found.";
    categoryButtonsDiv.appendChild(msg);
  }
});

// DARK MODE TOGGLE
const darkModeToggle = document.getElementById("dark-mode-toggle");

// Check if user has a saved preference
if (localStorage.getItem("darkMode") === "enabled") {
  document.body.classList.add("dark-mode");
  darkModeToggle.textContent = "☀️ Light Mode";
}

darkModeToggle.addEventListener("click", function () {
  document.body.classList.toggle("dark-mode");

  if (document.body.classList.contains("dark-mode")) {
    darkModeToggle.textContent = "☀️ Light Mode";
    localStorage.setItem("darkMode", "enabled");
  } else {
    darkModeToggle.textContent = "🌙 Dark Mode";
    localStorage.setItem("darkMode", "disabled");
  }
});

// HIDE CONTENT TOGGLE
const hideContentToggle = document.getElementById("hide-content-toggle");

function applyHideContent(hidden) {
  flashcard.classList.toggle("content-hidden", hidden);
  hideContentToggle.textContent = hidden
    ? "👁 Show Content"
    : "🙈 Hide Content";
}

// Restore the saved preference
applyHideContent(localStorage.getItem("hideContent") === "enabled");

hideContentToggle.addEventListener("click", function () {
  const hidden = !flashcard.classList.contains("content-hidden");
  applyHideContent(hidden);
  localStorage.setItem("hideContent", hidden ? "enabled" : "disabled");
});

// KEYBOARD NAVIGATION
document.addEventListener("keydown", function (e) {
  // Only respond when the flashcard area is actually showing
  if (flashcardArea.classList.contains("hidden")) return;

  // Don't hijack arrow keys while typing in the search box
  if (document.activeElement.tagName === "INPUT") return;

  if (e.key === "ArrowRight") {
    e.preventDefault();
    nextBtn.click(); // same action as clicking Next
  } else if (e.key === "ArrowLeft") {
    e.preventDefault();
    prevBtn.click(); // same action as clicking Previous
  } else if (e.key === "ArrowDown") {
    e.preventDefault();
    flashcard.click(); // same action as clicking the card to flip it
  }
  // else if (e.key === 'ArrowUp') {
  //     e.preventDefault();
  //     shuffleBtn.click(); // same action as clicking Shuffle
  // }
  else if (e.key === " " || e.key === "Spacebar") {
    e.preventDefault(); // stop page from scrolling

    const markHardBtn = document.getElementById("mark-hard-btn");
    if (markHardBtn && !markHardBtn.disabled) {
      markHardBtn.click(); // same action as clicking "Mark as Hard"
    }
  }
});
