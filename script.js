// script.js

document.addEventListener('DOMContentLoaded', () => {
    const questionTextEl  = document.getElementById('question-text');
    const questionHintEl  = document.getElementById('question-hint');
    const questionMetaEl  = document.getElementById('question-meta');
    const answerOptionsEl = document.getElementById('answer-options');
    const feedbackEl      = document.getElementById('feedback');
    const nextBtn         = document.getElementById('next-btn');
    const moduleSelectEl  = document.getElementById('module-select');

    let allQuestions = [];
    let shuffledQuestions = [];
    let currentQuestionIndex = 0;
    let activeModule = ""; // "" means "all modules"

    // 1. Fetch all questions from the generated JSON file
    fetch('questions.json')
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            allQuestions = data;
            if (!allQuestions.length) {
                throw new Error('No questions found in questions.json');
            }
            setupModulePicker();
            startQuiz();
        })
        .catch(error => {
            console.error("Error fetching questions:", error);
            questionTextEl.textContent = "Failed to load quiz. Please try again.";
        });

    // Build the module dropdown from the data
    function setupModulePicker() {
        const modulesSet = new Set();

        allQuestions.forEach(q => {
            if (q.module) {
                modulesSet.add(q.module);
            }
        });

        const modules = Array.from(modulesSet).sort((a, b) => {
            // Sort by numeric part if it's of the form MD<n>
            const re = /^MD(\d+)$/;
            const ma = a.match(re);
            const mb = b.match(re);
            if (ma && mb) {
                return parseInt(ma[1], 10) - parseInt(mb[1], 10);
            }
            // fallback to normal string sort
            return a.localeCompare(b);
        });

        // Clear existing (keep "All modules" as first option)
        moduleSelectEl.innerHTML = '<option value="">All modules</option>';

        modules.forEach(m => {
            const opt = document.createElement('option');
            opt.value = m;
            opt.textContent = m;
            moduleSelectEl.appendChild(opt);
        });

        moduleSelectEl.addEventListener('change', () => {
            activeModule = moduleSelectEl.value; // "" or "MD1", "MD2", ...
            startQuiz();
        });
    }

    function startQuiz() {
        // Filter by module if one is active
        let pool = allQuestions;
        if (activeModule) {
            pool = allQuestions.filter(q => q.module === activeModule);
        }

        if (!pool.length) {
            questionTextEl.textContent = "No questions available for this module.";
            questionHintEl.textContent = "";
            answerOptionsEl.innerHTML = "";
            feedbackEl.className = 'feedback-hidden';
            nextBtn.classList.add('next-btn-hidden');
            return;
        }

        shuffledQuestions = [...pool].sort(() => Math.random() - 0.5);
        currentQuestionIndex = 0;
        loadQuestion();
    }

    function loadQuestion() {
        // Reset UI
        feedbackEl.className = 'feedback-hidden';
        nextBtn.classList.add('next-btn-hidden');
        answerOptionsEl.innerHTML = '';

        const q = shuffledQuestions[currentQuestionIndex];

        questionTextEl.textContent = q.question;
        // Show which module / file this question came from
if (q.module || q.source) {
    // Example: "Question from module MD9 – MD9 TB Hard.txt"
    const modulePart = q.module ? `module ${q.module}` : '';
    const sourcePart = q.source ? ` – ${q.source}` : '';
    questionMetaEl.textContent = `Question from ${modulePart}${sourcePart}`.trim();
    questionMetaEl.style.display = 'block';
} else {
    questionMetaEl.textContent = '';
    questionMetaEl.style.display = 'none';
}


        if (q.hint && q.hint.trim()) {
            questionHintEl.textContent = `Hint: ${q.hint}`;
            questionHintEl.style.display = 'block';
        } else {
            questionHintEl.textContent = '';
            questionHintEl.style.display = 'none';
        }

        q.answerOptions.forEach(option => {
            const btn = document.createElement('button');
            btn.textContent = option.text;
            btn.classList.add('answer-btn');

            btn.dataset.correct   = option.isCorrect;
            btn.dataset.rationale = option.rationale || '';

            btn.addEventListener('click', selectAnswer);
            answerOptionsEl.appendChild(btn);
        });
    }

    function selectAnswer(e) {
        const selectedBtn = e.target;
        const isCorrect   = selectedBtn.dataset.correct === 'true';
        const rationale   = selectedBtn.dataset.rationale || '';

        // Disable all buttons, show the correct one
        Array.from(answerOptionsEl.children).forEach(btn => {
            btn.disabled = true;
            if (btn.dataset.correct === 'true') {
                btn.classList.add('correct');
            }
        });

        // Show feedback
        feedbackEl.classList.remove('feedback-hidden');
        feedbackEl.className = ''; // clear old classes
        if (isCorrect) {
            selectedBtn.classList.add('correct');
            feedbackEl.classList.add('correct');
            feedbackEl.textContent = `✅ Correct! ${rationale}`;
        } else {
            selectedBtn.classList.add('incorrect');
            feedbackEl.classList.add('incorrect');
            feedbackEl.textContent = `❌ Not quite. ${rationale}`;
        }

        nextBtn.classList.remove('next-btn-hidden');
    }

    nextBtn.addEventListener('click', () => {
        currentQuestionIndex++;
        if (currentQuestionIndex < shuffledQuestions.length) {
            loadQuestion();
        } else {
            alert("Quiz complete for this module! Restarting...");
            startQuiz();
        }
    });
});
