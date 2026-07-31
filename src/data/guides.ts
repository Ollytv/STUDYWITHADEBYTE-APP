export interface Guide {
  slug: string;
  title: string;
  description: string;
  content: string[]; // paragraphs
}

export const GUIDES: Guide[] = [
  {
    slug: 'how-to-calculate-cgpa-nigeria',
    title: 'How to Calculate Your CGPA in Nigerian Universities',
    description:
      'A step-by-step breakdown of GPA and CGPA calculation under the Nigerian 5-point and 4-point grading scales, with a worked example.',
    content: [
      'Most Nigerian universities and polytechnics grade coursework on either a 5-point or 4-point scale. Before you can calculate your CGPA, you need to know which scale your institution uses — this is usually stated in your student handbook, and it changes the grade points attached to each letter grade.',
      'On the common 5-point scale: A = 5 points, B = 4 points, C = 3 points, D = 2 points, E = 1 point, F = 0 points. On the 4-point scale, A = 4.0, B = 3.0 (or 3.5 for B+), C = 2.0, D = 1.0, F = 0.0. Always confirm your institution\'s exact breakdown before relying on any calculator, including this app\'s.',
      'Step 1: For each course, multiply the grade point by the course\'s credit unit to get the "quality points" for that course. A course worth 3 units with a B (4 points) gives you 12 quality points.',
      'Step 2: Add up the quality points for every course you took in the semester. Separately, add up the credit units for every course that semester.',
      'Step 3: Divide total quality points by total credit units. That result is your GPA for that semester.',
      'Step 4: To get your CGPA, repeat the process across every semester you\'ve completed — sum all quality points across all semesters, sum all credit units across all semesters, and divide. CGPA is cumulative, not an average of your semester GPAs, so a semester with more credit units carries more weight.',
      'Worked example (5-point scale): Semester 1 — 18 total units, 72 quality points → GPA = 4.00. Semester 2 — 20 total units, 76 quality points → GPA = 3.80. CGPA after two semesters = (72 + 76) / (18 + 20) = 148 / 38 = 3.89, not the simple average of 4.00 and 3.80.',
      'A common mistake is averaging semester GPAs directly instead of recalculating from total quality points and total units — this gives a wrong CGPA whenever your credit load differs between semesters.',
    ],
  },
  {
    slug: 'active-recall-for-coding',
    title: 'Active Recall for Coding Students: A Practical Method',
    description:
      'Why re-reading notes and re-watching tutorials doesn\'t build real programming skill, and how to use active recall to actually retain what you learn.',
    content: [
      'Most students studying programming default to passive review: re-reading textbook chapters, re-watching a tutorial, or scrolling back through lecture slides. This feels productive because the material feels familiar the second time — but familiarity is not the same as being able to produce the answer from memory, which is what an exam or a coding interview actually demands.',
      'Active recall flips this: instead of reviewing material, you force yourself to reproduce it from memory first, then check where you were wrong. For programming specifically, this means closing your notes and trying to write a function from scratch, explain what a piece of code does line by line, or answer "what would this loop output" before running it.',
      'A simple routine: after learning a new concept (say, recursion), close the material and write down, from memory, what the concept is, when you\'d use it, and a short example. Only then compare against your notes. The gap between what you wrote and what\'s correct tells you exactly what to review — which is far more efficient than re-reading everything.',
      'For exam prep specifically, past questions work better than notes for this reason: they force recall under conditions similar to the actual test, rather than passive recognition.',
      'Spacing matters as much as the recall itself. Reviewing the same topic once a day for four days beats cramming it for the same total time in one sitting, because each retrieval attempt after a gap strengthens memory more than reviewing something still fresh in your mind.',
      'A practical weekly loop: learn a new topic, attempt a recall exercise on it the next day, again after three days, and again after a week. If you consistently get it right without looking, you\'ve moved it to long-term memory and can space it out further.',
    ],
  },
  {
    slug: 'python-loops-made-easy',
    title: 'Python Loops Made Easy: For, While, and When to Use Each',
    description:
      'A clear, beginner-friendly explanation of for loops and while loops in Python, with common mistakes to avoid.',
    content: [
      'A loop lets you repeat a block of code without writing it out multiple times. Python has two loop types: `for` loops, which repeat a fixed number of times or over a known sequence, and `while` loops, which repeat as long as a condition stays true.',
      'Use a `for` loop when you know what you\'re iterating over — a list of students, a range of numbers, the characters in a string. Example: `for student in students: print(student)` runs once per item in the list, in order, and stops automatically when the list is exhausted.',
      '`range(n)` is commonly paired with `for` when you need a fixed count rather than an existing list: `for i in range(5): print(i)` prints 0 through 4. A frequent beginner mistake is expecting `range(5)` to include 5 — it doesn\'t; it stops one before the given number.',
      'Use a `while` loop when you don\'t know in advance how many repetitions you need — only the condition that should stop it. Example: `while attempts < 3: attempts += 1` keeps running until the condition becomes false. The most common bug here is forgetting to update the variable inside the loop (like `attempts += 1`), which creates an infinite loop that never stops.',
      '`break` exits a loop immediately, useful when you find what you\'re looking for and don\'t need to keep checking. `continue` skips the rest of the current iteration and moves to the next one, useful for skipping items that don\'t meet a condition without exiting the whole loop.',
      'A good rule of thumb: if you can say "for each item in this collection," reach for `for`. If you can only say "keep going until this becomes true," reach for `while`.',
    ],
  },
];
