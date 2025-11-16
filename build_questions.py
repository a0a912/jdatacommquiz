#!/usr/bin/env python3
import json
import re
from pathlib import Path

QUIZ_DIR = Path("quiz_txts")
OUTPUT_FILE = Path("questions.json")


def extract_module(source_name: str) -> str:
    """
    Try to extract a module like MD1, MD2, MD9 from the filename/stem.

    Matches things like:
      MD1 TB ...
      MD 1 TB ...
      mod 9 tb ...
      Mod10 ...
    """
    m = re.search(r"(?:md|mod)\s*0?(\d+)", source_name, flags=re.IGNORECASE)
    if m:
        num = int(m.group(1))
        return f"MD{num}"
    return "Other"


def extract_difficulty(source_name: str) -> str:
    """
    Very simple difficulty heuristic from filename: Hard / Medium / Easy / Unknown.
    """
    lower = source_name.lower()
    if "hard" in lower:
        return "Hard"
    if "medium" in lower or "med " in lower or " tb med" in lower:
        return "Medium"
    if "easy" in lower:
        return "Easy"
    return "Unknown"


def parse_quiz_text(text: str, source_name: str):
    """
    Parse one quiz .txt into a list of question dicts.

    Format (your current one):

    Q1. Question text...
       A. Option text...
       B. Option text...
       C. Option text...
       D. Option text...

       Answer: C
       Explanation: Explanation text...
    """
    questions = []

    module = extract_module(source_name)
    difficulty = extract_difficulty(source_name)

    text = text.replace("\r\n", "\n").strip()
    if not text:
        return questions

    # Split on blank lines before Q<n>.
    blocks = re.split(r"\n\s*\n(?=Q\d+\.)", text)

    for block in blocks:
        lines = [l.strip() for l in block.split("\n") if l.strip()]
        if not lines:
            continue

        idx = 0

        # ---- Question line ----
        q_line = lines[idx]
        idx += 1

        m = re.match(r"^Q(\d+)\.\s*(.*)$", q_line, re.IGNORECASE)
        if m:
            qnum = int(m.group(1))
            question_text = m.group(2)
        else:
            qnum = None
            question_text = q_line

        # Question may wrap onto extra lines
        while (
            idx < len(lines)
            and not re.match(r"^[A-D]\.", lines[idx], re.IGNORECASE)
            and not lines[idx].lower().startswith("answer:")
        ):
            question_text += " " + lines[idx]
            idx += 1

        # ---- Options ----
        options = []
        while idx < len(lines) and re.match(r"^[A-D]\.", lines[idx], re.IGNORECASE):
            line = lines[idx]
            idx += 1
            m = re.match(r"^([A-D])\.\s*(.*)$", line, re.IGNORECASE)
            if not m:
                continue
            letter = m.group(1).upper()
            text_part = m.group(2)

            # Option text can wrap too
            while (
                idx < len(lines)
                and not re.match(r"^[A-D]\.", lines[idx], re.IGNORECASE)
                and not lines[idx].lower().startswith("answer:")
                and not lines[idx].lower().startswith("explanation:")
            ):
                text_part += " " + lines[idx]
                idx += 1

            options.append({"letter": letter, "text": text_part})

        # ---- Answer ----
        answer_letter = None
        for i in range(idx, len(lines)):
            m = re.match(r"^answer:\s*([A-D])", lines[i], re.IGNORECASE)
            if m:
                answer_letter = m.group(1).upper()
                idx = i + 1
                break

        # ---- Explanation ----
        explanation = ""
        explanation_started = False
        for i in range(idx, len(lines)):
            line = lines[i]
            if line.lower().startswith("explanation:"):
                explanation_started = True
                explanation = re.sub(
                    r"^explanation:\s*", "", line, flags=re.IGNORECASE
                )
            elif explanation_started:
                explanation += " " + line

        if not options or not answer_letter:
            # skip malformed block
            continue

        answer_options = [
            {
                "text": opt["text"],
                "isCorrect": opt["letter"] == answer_letter,
                # same explanation for all choices (fine for your format)
                "rationale": explanation,
            }
            for opt in options
        ]

        q_obj = {
            "question": question_text,
            "hint": "",
            "answerOptions": answer_options,
            "source": source_name,
            "module": module,
            "difficulty": difficulty,
        }
        if qnum is not None:
            q_obj["questionNumber"] = qnum

        questions.append(q_obj)

    return questions


def main():
    all_questions = []

    for path in sorted(QUIZ_DIR.glob("*.txt")):
        text = path.read_text(encoding="utf-8")
        source_name = path.stem  # filename without .txt
        qs = parse_quiz_text(text, source_name=source_name)
        print(f"{path.name}: {len(qs)} questions parsed")
        all_questions.extend(qs)

    print(f"Total questions: {len(all_questions)}")
    OUTPUT_FILE.write_text(
        json.dumps(all_questions, indent=2, ensure_ascii=False),
        encoding="utf-8",
    )
    print(f"Wrote {OUTPUT_FILE.resolve()}")


if __name__ == "__main__":
    main()
