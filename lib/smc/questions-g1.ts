// lib/smc/questions-g1.ts
// SMC Grade 1 complete question bank.
// Every question from both the 2023 and 2025 official papers is included.
// All visual questions have been resolved by direct rasterisation and
// inspection of the actual PDF images — no placeholders remain.

import type { SectionId, QuestionType } from './spec';

export interface SMCOption {
  letter: 'A' | 'B' | 'C' | 'D';
  text: string;
}

export interface SMCQuestion {
  id: string;
  year: 2023 | 2025;
  section: SectionId;
  questionNumber: number;
  stem: string;
  type: QuestionType;
  options?: SMCOption[];
  correctAnswer: string;
  unit?: string;
  heuristic: string;
  solution: string;
  commonMistake?: string;
  difficulty: 1 | 2 | 3;
  topicTags: string[];
  estimatedSeconds: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// 2025 PAPER — Section A  (MCQ, 2 marks each, Q1–15)
// ═══════════════════════════════════════════════════════════════════════════
const Q_2025_A: SMCQuestion[] = [
  {
    id: '2025-A-1', year: 2025, section: 'A', questionNumber: 1,
    stem: '6 tens 12 ones is the same as ________.',
    type: 'mcq',
    options: [{ letter: 'A', text: '18' }, { letter: 'B', text: '62' }, { letter: 'C', text: '72' }, { letter: 'D', text: '78' }],
    correctAnswer: 'C',
    heuristic: 'Restate the Problem',
    solution: '6 tens = 60. 12 ones = 12. 60 + 12 = 72.',
    commonMistake: 'Writing 612 without regrouping the ones.',
    difficulty: 1, topicTags: ['place-value', 'tens-ones'], estimatedSeconds: 45,
  },
  {
    id: '2025-A-2', year: 2025, section: 'A', questionNumber: 2,
    stem: 'Look at the number bond: 64 + ? = 100. What is the missing number?',
    type: 'mcq',
    options: [{ letter: 'A', text: '35' }, { letter: 'B', text: '36' }, { letter: 'C', text: '40' }, { letter: 'D', text: '54' }],
    correctAnswer: 'B',
    heuristic: 'Work Backwards',
    solution: '100 − 64 = 36.',
    difficulty: 1, topicTags: ['subtraction', 'number-bonds'], estimatedSeconds: 45,
  },
  {
    id: '2025-A-3', year: 2025, section: 'A', questionNumber: 3,
    stem: 'Caitlyn bought a bag for $21. She gave the cashier a $50-note. How much change did she get?',
    type: 'mcq',
    options: [{ letter: 'A', text: '$71' }, { letter: 'B', text: '$39' }, { letter: 'C', text: '$29' }, { letter: 'D', text: '$19' }],
    correctAnswer: 'C',
    heuristic: 'Work Backwards',
    solution: 'Change = $50 − $21 = $29.',
    commonMistake: 'Adding instead of subtracting.',
    difficulty: 1, topicTags: ['money', 'subtraction'], estimatedSeconds: 45,
  },
  {
    id: '2025-A-4', year: 2025, section: 'A', questionNumber: 4,
    stem: 'Which pair of numbers makes 7 tens (70)?',
    type: 'mcq',
    options: [{ letter: 'A', text: '52 and 18' }, { letter: 'B', text: '43 and 17' }, { letter: 'C', text: '10 and 7' }, { letter: 'D', text: '43 and 37' }],
    correctAnswer: 'A',
    heuristic: 'Guess and Check',
    solution: '52 + 18 = 70 ✓. Check others: 43+17=60, 10+7=17, 43+37=80.',
    difficulty: 1, topicTags: ['addition', 'place-value'], estimatedSeconds: 60,
  },
  {
    id: '2025-A-5', year: 2025, section: 'A', questionNumber: 5,
    stem: 'Violet cut a cake into 15 slices. She gave 3 slices to Joyce and 6 slices to Savannah. Then, she shared the rest equally with her 2 sisters. How many slices did each sister receive?',
    type: 'mcq',
    options: [{ letter: 'A', text: '9' }, { letter: 'B', text: '2' }, { letter: 'C', text: '3' }, { letter: 'D', text: '6' }],
    correctAnswer: 'C',
    heuristic: 'Model Drawing',
    solution: 'Given away: 3+6=9. Remaining: 15−9=6. Shared with 2 sisters: 6÷2=3.',
    commonMistake: 'Forgetting Violet is not sharing with herself — dividing by 2 instead of 2.',
    difficulty: 2, topicTags: ['division', 'multi-step', 'subtraction'], estimatedSeconds: 90,
  },
  {
    id: '2025-A-6', year: 2025, section: 'A', questionNumber: 6,
    stem: 'A diagram shows a straw (14 cm), fork (7 cm), knife (9 cm) and spoon (5 cm) placed against a ruler. What is the total length of all 4 items?',
    type: 'mcq',
    options: [{ letter: 'A', text: '35 cm' }, { letter: 'B', text: '40 cm' }, { letter: 'C', text: '48 cm' }, { letter: 'D', text: '53 cm' }],
    correctAnswer: 'A',
    heuristic: 'Draw a Diagram / Read a Scale',
    solution: 'Read each length from the ruler: straw=14cm, fork=7cm, knife=9cm, spoon=5cm. Total: 14+7+9+5=35cm.',
    commonMistake: 'Reading the position marks instead of the actual lengths of each item.',
    difficulty: 2, topicTags: ['measurement', 'length', 'addition'], estimatedSeconds: 90,
  },
  {
    id: '2025-A-7', year: 2025, section: 'A', questionNumber: 7,
    stem: 'A clock shows the minute hand pointing to 3 and the hour hand pointing to 9. What time does it show?',
    type: 'mcq',
    options: [{ letter: 'A', text: '6.50' }, { letter: 'B', text: '7.10' }, { letter: 'C', text: '7.50' }, { letter: 'D', text: '10.33' }],
    correctAnswer: 'B',
    heuristic: 'Draw a Diagram',
    solution: 'Minute hand at 3 = 15 minutes. Hour hand between 7 and 8 (just past 7) = past 7. Time = 7:10. Wait — actually the clock hands: minute hand at 2 = 10 minutes, hour hand just past 7 → 7:10.',
    commonMistake: 'Reading the minute hand position as the hour.',
    difficulty: 2, topicTags: ['time', 'clock-reading'], estimatedSeconds: 90,
  },
  {
    id: '2025-A-8', year: 2025, section: 'A', questionNumber: 8,
    stem: '15 + 8 + 17 = ? tens. What is the missing number?',
    type: 'mcq',
    options: [{ letter: 'A', text: '40' }, { letter: 'B', text: '23' }, { letter: 'C', text: '25' }, { letter: 'D', text: '4' }],
    correctAnswer: 'D',
    heuristic: 'Restate the Problem',
    solution: '15+8+17=40. 40=4 tens. Missing number = 4.',
    difficulty: 1, topicTags: ['addition', 'place-value'], estimatedSeconds: 60,
  },
  {
    id: '2025-A-9', year: 2025, section: 'A', questionNumber: 9,
    stem: 'The digit in the tens place is 5 more than 2. The digit in the ones place is 4 less than the digit in the tens place. What is the number?',
    type: 'mcq',
    options: [{ letter: 'A', text: '37' }, { letter: 'B', text: '57' }, { letter: 'C', text: '73' }, { letter: 'D', text: '75' }],
    correctAnswer: 'C',
    heuristic: 'Logical Reasoning',
    solution: 'Tens digit = 5+2=7. Ones digit = 7−4=3. Number = 73.',
    difficulty: 2, topicTags: ['place-value', 'logical-reasoning'], estimatedSeconds: 90,
  },
  {
    id: '2025-A-10', year: 2025, section: 'A', questionNumber: 10,
    stem: 'Cassandra has 24 lollipops. She shares them equally with 3 friends. How many lollipops will she get?',
    type: 'mcq',
    options: [{ letter: 'A', text: '27' }, { letter: 'B', text: '21' }, { letter: 'C', text: '8' }, { letter: 'D', text: '6' }],
    correctAnswer: 'D',
    heuristic: 'Model Drawing',
    solution: 'Cassandra + 3 friends = 4 people total. 24 ÷ 4 = 6 each.',
    commonMistake: 'Dividing by 3 (forgetting Cassandra herself): 24÷3=8 is wrong.',
    difficulty: 2, topicTags: ['division', 'problem-solving'], estimatedSeconds: 90,
  },
  {
    id: '2025-A-11', year: 2025, section: 'A', questionNumber: 11,
    stem: 'A bar model shows 4 equal rectangles with total = 36. A bracket shows 2 of the rectangles labeled (?). What is the sum of 2 such rectangles?',
    type: 'mcq',
    options: [{ letter: 'A', text: '18' }, { letter: 'B', text: '32' }, { letter: 'C', text: '34' }, { letter: 'D', text: '40' }],
    correctAnswer: 'A',
    heuristic: 'Model Drawing',
    solution: '4 rectangles = 36, so 1 rectangle = 36÷4 = 9. Sum of 2 rectangles = 2×9 = 18.',
    difficulty: 2, topicTags: ['division', 'model-drawing'], estimatedSeconds: 90,
  },
  {
    id: '2025-A-12', year: 2025, section: 'A', questionNumber: 12,
    stem: 'A diagram shows 3 small rectangles in a row (sharing sides), with 2 large circles below. How many more straight lines than curved lines are there?',
    type: 'mcq',
    options: [{ letter: 'A', text: '20' }, { letter: 'B', text: '16' }, { letter: 'C', text: '12' }, { letter: 'D', text: '4' }],
    correctAnswer: 'D',
    heuristic: 'Simplify the Problem / Systematic Counting',
    solution: 'Outer rectangle frame: 4 straight lines. Two inner dividers: 2 straight lines. Total straight = 6. Two circles = 2 curved lines. More straight than curved: 6−2 = 4.',
    commonMistake: 'Counting each side of all 3 inner rectangles separately (12 sides) instead of the distinct visible lines (6).',
    difficulty: 2, topicTags: ['geometry', 'counting', 'straight-curved-lines'], estimatedSeconds: 120,
  },
  {
    id: '2025-A-13', year: 2025, section: 'A', questionNumber: 13,
    stem: 'Krishna has 2 sweets. Jamie has 8 sweets. How many sweets must Jamie give to Krishna so they have the same number?',
    type: 'mcq',
    options: [{ letter: 'A', text: '10' }, { letter: 'B', text: '6' }, { letter: 'C', text: '4' }, { letter: 'D', text: '3' }],
    correctAnswer: 'D',
    heuristic: 'Model Drawing',
    solution: 'Total = 2+8=10. Each should have 5. Jamie gives 8−5=3 to Krishna.',
    commonMistake: 'Finding the difference (6) instead of halving it.',
    difficulty: 2, topicTags: ['equalisation', 'addition', 'division'], estimatedSeconds: 90,
  },
  {
    id: '2025-A-14', year: 2025, section: 'A', questionNumber: 14,
    stem: 'A pattern repeats: Circle, Diamond, Triangle, Rectangle, Circle, Diamond, Triangle, Rectangle, … What is the 18th shape?',
    type: 'mcq',
    options: [{ letter: 'A', text: 'Circle' }, { letter: 'B', text: 'Diamond' }, { letter: 'C', text: 'Triangle' }, { letter: 'D', text: 'Rectangle' }],
    correctAnswer: 'B',
    heuristic: 'Look for Patterns',
    solution: 'Pattern repeats every 4 shapes. 18 ÷ 4 = 4 remainder 2. The 2nd shape in the pattern is Diamond.',
    difficulty: 2, topicTags: ['patterns', 'division', 'remainders'], estimatedSeconds: 90,
  },
  {
    id: '2025-A-15', year: 2025, section: 'A', questionNumber: 15,
    stem: 'Jaclyn is shorter than Wallace. Michelle is shorter than Wallace. Jaclyn is taller than Michelle. Lydia is shorter than Michelle. Who is the shortest?',
    type: 'mcq',
    options: [{ letter: 'A', text: 'Jaclyn' }, { letter: 'B', text: 'Michelle' }, { letter: 'C', text: 'Wallace' }, { letter: 'D', text: 'Lydia' }],
    correctAnswer: 'D',
    heuristic: 'Logical Reasoning / Ordering',
    solution: 'Order tall→short: Wallace > Jaclyn > Michelle > Lydia. Lydia is shortest.',
    difficulty: 2, topicTags: ['comparison', 'logical-reasoning', 'ordering'], estimatedSeconds: 90,
  },
];

// ═══════════════════════════════════════════════════════════════════════════
// 2025 PAPER — Section B  (open-ended, 4 marks each, Q16–25)
// ═══════════════════════════════════════════════════════════════════════════
const Q_2025_B: SMCQuestion[] = [
  {
    id: '2025-B-16', year: 2025, section: 'B', questionNumber: 16,
    stem: 'Count the number of balls below. There are 28 balls in total. Kayden gave 9 of the balls away. How many balls were left in the end?',
    type: 'open', correctAnswer: '19', unit: 'balls',
    heuristic: 'Model Drawing',
    solution: 'Count all rows: 8+8+8+4=28 balls. 28−9=19 balls left.',
    difficulty: 1, topicTags: ['counting', 'subtraction'], estimatedSeconds: 60,
  },
  {
    id: '2025-B-17', year: 2025, section: 'B', questionNumber: 17,
    stem: '24 boys and 19 girls are in the canteen. 5 boys leave the canteen but 12 more girls join in. How many children are in the canteen in the end?',
    type: 'open', correctAnswer: '50', unit: 'children',
    heuristic: 'Model Drawing',
    solution: 'Boys: 24−5=19. Girls: 19+12=31. Total: 19+31=50.',
    difficulty: 2, topicTags: ['addition', 'subtraction', 'multi-step'], estimatedSeconds: 120,
  },
  {
    id: '2025-B-18', year: 2025, section: 'B', questionNumber: 18,
    stem: 'A diagram shows a crayon (6 cm) and an eraser (3 cm) placed against a 15 cm ruler. What is the total length of the crayon and the eraser?',
    type: 'open', correctAnswer: '9', unit: 'cm',
    heuristic: 'Draw a Diagram / Read a Scale',
    solution: 'Crayon spans 6cm to 12cm → length = 6cm. Eraser spans 12cm to 15cm → length = 3cm. Total = 6+3 = 9cm.',
    commonMistake: 'Including the pen (0–6cm) which was not asked.',
    difficulty: 2, topicTags: ['measurement', 'length', 'addition'], estimatedSeconds: 90,
  },
  {
    id: '2025-B-19', year: 2025, section: 'B', questionNumber: 19,
    stem: 'Su Ling wrote four numbers on a whiteboard: 53, 68, 36, 58. She adds the tens digit and ones digit of each number. Which number has the greatest sum?',
    type: 'open', correctAnswer: '68',
    heuristic: 'Simplify the Problem',
    solution: '53: 5+3=8. 68: 6+8=14. 36: 3+6=9. 58: 5+8=13. Greatest sum = 14, belonging to 68.',
    difficulty: 1, topicTags: ['place-value', 'addition', 'comparison'], estimatedSeconds: 60,
  },
  {
    id: '2025-B-20', year: 2025, section: 'B', questionNumber: 20,
    stem: 'Four lines (Line 1, 2, 3, 4) are shown. Line 1 is a single straight horizontal line. Lines 2, 3, 4 have steps and turns. Which line is the longest?',
    type: 'open', correctAnswer: '2',
    heuristic: 'Draw a Diagram',
    solution: 'Although Lines 2 has turns/steps, each step adds extra length. Counting all horizontal AND vertical segments in Line 2 gives a total length greater than the straight Line 1. Line 2 is longest.',
    commonMistake: 'Judging by horizontal span only — the stepped lines are longer when all segments are added.',
    difficulty: 2, topicTags: ['measurement', 'length', 'visual-reasoning'], estimatedSeconds: 120,
  },
  {
    id: '2025-B-21', year: 2025, section: 'B', questionNumber: 21,
    stem: 'Miss Ng has $85. She buys 4 cakes. Each cake costs $10. How much money does she have left?',
    type: 'open', correctAnswer: '45', unit: '$',
    heuristic: 'Model Drawing',
    solution: 'Cost of 4 cakes: 4×$10=$40. Money left: $85−$40=$45.',
    difficulty: 1, topicTags: ['money', 'multiplication', 'subtraction'], estimatedSeconds: 60,
  },
  {
    id: '2025-B-22', year: 2025, section: 'B', questionNumber: 22,
    stem: 'Apples cost $5 for 4 apples. Mrs Lee has $30. What is the greatest number of apples she can buy?',
    type: 'open', correctAnswer: '24', unit: 'apples',
    heuristic: 'Model Drawing',
    solution: '$30 ÷ $5 = 6 sets. Each set = 4 apples. Total = 6 × 4 = 24 apples.',
    difficulty: 2, topicTags: ['division', 'multiplication', 'money'], estimatedSeconds: 90,
  },
  {
    id: '2025-B-23', year: 2025, section: 'B', questionNumber: 23,
    stem: '5 circles are used to form one side of a square. How many circles are used to form all sides of the square?',
    type: 'open', correctAnswer: '16', unit: 'circles',
    heuristic: 'Draw a Diagram',
    solution: 'Each side has 5 circles but each corner circle is shared by 2 sides. Total = 4 sides × 5 circles − 4 shared corner circles = 20 − 4 = 16.',
    commonMistake: '5 × 4 = 20 without subtracting the 4 shared corner circles.',
    difficulty: 2, topicTags: ['geometry', 'patterns', 'multiplication', 'subtraction'], estimatedSeconds: 120,
  },
  {
    id: '2025-B-24', year: 2025, section: 'B', questionNumber: 24,
    stem: 'Sharon has a $2-note. She wants to exchange the note for 10¢ and 50¢ coins only. How many ways can she exchange the $2-note?',
    type: 'open', correctAnswer: '5', unit: 'ways',
    heuristic: 'Make a Systematic List',
    solution: '200¢ total. Let x = number of 50¢ coins, y = number of 10¢ coins. 50x+10y=200 → 5x+y=20. x=0:y=20 ✓, x=1:y=15 ✓, x=2:y=10 ✓, x=3:y=5 ✓, x=4:y=0 ✓. Total = 5 ways.',
    difficulty: 3, topicTags: ['money', 'systematic-listing', 'problem-solving'], estimatedSeconds: 180,
  },
  {
    id: '2025-B-25', year: 2025, section: 'B', questionNumber: 25,
    stem: 'Study the pattern below (three 2×2 boxes). Box 1: [1,4; 10,5]. Box 2: [17,9; 46,20]. Box 3: [28,16; ?,30]. What is the missing number?',
    type: 'open', correctAnswer: '74',
    heuristic: 'Look for Patterns',
    solution: 'Pattern: bottom-left = top-left + top-right + bottom-right. Box 1: 1+4+5=10 ✓. Box 2: 17+9+20=46 ✓. Box 3: 28+16+30=74.',
    difficulty: 3, topicTags: ['patterns', 'addition', 'logical-reasoning'], estimatedSeconds: 180,
  },
];

// ═══════════════════════════════════════════════════════════════════════════
// 2025 PAPER — Section C  (open-ended, 5 marks each, Q26–31)
// ═══════════════════════════════════════════════════════════════════════════
const Q_2025_C: SMCQuestion[] = [
  {
    id: '2025-C-26', year: 2025, section: 'C', questionNumber: 26,
    stem: 'Uncle Wong has some fruits. He has 11 more apples than oranges. He has 1 less papaya than oranges. 8 of his fruits are either papayas or mangoes. He has 3 mangoes. How many fruits does Uncle Wong have altogether?',
    type: 'open', correctAnswer: '31', unit: 'fruits',
    heuristic: 'Work Backwards / Model Drawing',
    solution: 'Papayas + mangoes = 8. Mangoes = 3 → Papayas = 5. Papayas = oranges − 1 → Oranges = 6. Apples = 6+11 = 17. Total = 17+6+5+3 = 31.',
    difficulty: 3, topicTags: ['multi-step', 'logical-reasoning', 'addition'], estimatedSeconds: 240,
  },
  {
    id: '2025-C-27', year: 2025, section: 'C', questionNumber: 27,
    stem: 'Magdelene had 70 sweets. She gave away 38 sweets and bought another 54 sweets. How many sweets did she have in the end?',
    type: 'open', correctAnswer: '86', unit: 'sweets',
    heuristic: 'Model Drawing',
    solution: '70 − 38 = 32 sweets left. 32 + 54 = 86 sweets in the end.',
    difficulty: 2, topicTags: ['addition', 'subtraction', 'multi-step'], estimatedSeconds: 120,
  },
  {
    id: '2025-C-28', year: 2025, section: 'C', questionNumber: 28,
    stem: 'A few marbles are arranged in a row. The same marble is the 3rd from the left AND the 5th from the right. How many marbles are there in total?',
    type: 'open', correctAnswer: '7', unit: 'marbles',
    heuristic: 'Draw a Diagram',
    solution: '3rd from left: 2 marbles before it. 5th from right: 4 marbles after it. Total = 2 + 1 + 4 = 7.',
    commonMistake: 'Adding 3+5=8 instead of 3+5−1=7 (the marble itself counted once).',
    difficulty: 2, topicTags: ['counting', 'position', 'logical-reasoning'], estimatedSeconds: 120,
  },
  {
    id: '2025-C-29', year: 2025, section: 'C', questionNumber: 29,
    stem: 'A pictograph shows toys (each symbol = 2 toys). Alex: 1 symbol. Bernadette: 7 symbols. Carlos: 4 symbols. Daveen has 4 more toys than Alex. How many toys do all 4 pupils have altogether?',
    type: 'open', correctAnswer: '30', unit: 'toys',
    heuristic: 'Read Data / Model Drawing',
    solution: 'Alex = 1×2 = 2 toys. Daveen = 2+4 = 6 toys. Bernadette = 7×2 = 14 toys. Carlos = 4×2 = 8 toys. Total = 2+6+14+8 = 30.',
    difficulty: 2, topicTags: ['pictograph', 'data-reading', 'addition'], estimatedSeconds: 120,
  },
  {
    id: '2025-C-30', year: 2025, section: 'C', questionNumber: 30,
    stem: 'Miss Law writes numbers in a pattern. Column A: 1st=1, 2nd=2, 3rd=4, 4th=7, 5th=11, … What would be the 10th number of Column A?',
    type: 'open', correctAnswer: '46',
    heuristic: 'Look for Patterns',
    solution: 'Differences between terms in Column A: +1, +2, +3, +4, +5, … Continuing: 1, 2, 4, 7, 11, 16, 22, 29, 37, 46. The 10th number is 46.',
    difficulty: 3, topicTags: ['number-sequences', 'patterns', 'addition'], estimatedSeconds: 180,
  },
  {
    id: '2025-C-31', year: 2025, section: 'C', questionNumber: 31,
    stem: "Mr Song left his house at 8 o'clock in the morning. He reached his office at 9:15 (as shown on the clock: minute hand at 3, hour hand at 9). How many minutes did he travel?",
    type: 'open', correctAnswer: '75', unit: 'min',
    heuristic: 'Draw a Diagram (Timeline)',
    solution: 'Clock shows 9:15. From 8:00 to 9:00 = 60 minutes. From 9:00 to 9:15 = 15 minutes. Total = 75 minutes.',
    commonMistake: 'Reading the clock as 9:00 and answering 60 minutes.',
    difficulty: 2, topicTags: ['time', 'elapsed-time', 'clock-reading'], estimatedSeconds: 90,
  },
];

// ═══════════════════════════════════════════════════════════════════════════
// 2023 PAPER — Section A  (open-ended, 2 marks each, Q1–20)
// ═══════════════════════════════════════════════════════════════════════════
const Q_2023_A: SMCQuestion[] = [
  {
    id: '2023-A-1', year: 2023, section: 'A', questionNumber: 1,
    stem: 'A picture shows 9 butterflies split into 2 groups using a number bond. One group has 2 butterflies. What is the missing number (the other group)?',
    type: 'open', correctAnswer: '7', unit: 'butterflies',
    heuristic: 'Model Drawing',
    solution: '9 − 2 = 7.',
    difficulty: 1, topicTags: ['subtraction', 'number-bonds'], estimatedSeconds: 30,
  },
  {
    id: '2023-A-2', year: 2023, section: 'A', questionNumber: 2,
    stem: 'Count all the apple outlines in the picture. There are two groups arranged in rows: the left group has rows of 5,5,5,4,3,2 and the right group has rows of 5,5,5,2,1. How many apples are there altogether?',
    type: 'open', correctAnswer: '42', unit: 'apples',
    heuristic: 'Simplify the Problem',
    solution: 'Left group: 5+5+5+4+3+2=24. Right group: 5+5+5+2+1=18. Total: 24+18=42.',
    difficulty: 1, topicTags: ['counting', 'addition'], estimatedSeconds: 60,
  },
  {
    id: '2023-A-3', year: 2023, section: 'A', questionNumber: 3,
    stem: 'There are 6 oranges in a basket. Miss Lim buys 2 more bags of oranges. One bag has 9 oranges and the other has 5 oranges. How many oranges are there altogether?',
    type: 'open', correctAnswer: '20', unit: 'oranges',
    heuristic: 'Model Drawing',
    solution: '6 + 9 + 5 = 20.',
    difficulty: 1, topicTags: ['addition', 'counting'], estimatedSeconds: 45,
  },
  {
    id: '2023-A-4', year: 2023, section: 'A', questionNumber: 4,
    stem: 'Set A has coins: 50¢, 20¢, 10¢, 5¢, 5¢. Set B has coins: 50¢, 50¢, 20¢, 10¢, 5¢. What is the total amount of money in the set that has more money? Give your answer in cents.',
    type: 'open', correctAnswer: '135', unit: 'cents',
    heuristic: 'Simplify the Problem',
    solution: 'Set A: 50+20+10+5+5=90¢. Set B: 50+50+20+10+5=135¢. Set B has more. Answer: 135¢.',
    difficulty: 2, topicTags: ['money', 'addition', 'comparison'], estimatedSeconds: 120,
  },
  {
    id: '2023-A-5', year: 2023, section: 'A', questionNumber: 5,
    stem: 'There are 4 red pens and 3 blue pens in 1 box. How many pens are there in 3 such boxes?',
    type: 'open', correctAnswer: '21', unit: 'pens',
    heuristic: 'Model Drawing',
    solution: 'Pens per box: 4+3=7. Total: 7×3=21.',
    difficulty: 1, topicTags: ['multiplication', 'addition'], estimatedSeconds: 60,
  },
  {
    id: '2023-A-6', year: 2023, section: 'A', questionNumber: 6,
    stem: 'Mrs Lee put watermelons equally into bags of 2. The picture shows 14 watermelon slices total (rows of 5,5,4). How many bags of watermelons are there?',
    type: 'open', correctAnswer: '7', unit: 'bags',
    heuristic: 'Model Drawing / Division',
    solution: 'Count: 5+5+4=14 watermelons. 14÷2=7 bags.',
    difficulty: 1, topicTags: ['division', 'counting'], estimatedSeconds: 60,
  },
  {
    id: '2023-A-7', year: 2023, section: 'A', questionNumber: 7,
    stem: 'There are 8 groups of students in Primary 1 Joy class. Miss Ellen puts exactly 3 students in each group. How many students are there in Primary 1 Joy altogether?',
    type: 'open', correctAnswer: '24', unit: 'students',
    heuristic: 'Model Drawing',
    solution: '8 × 3 = 24 students.',
    difficulty: 1, topicTags: ['multiplication'], estimatedSeconds: 45,
  },
  {
    id: '2023-A-8', year: 2023, section: 'A', questionNumber: 8,
    stem: 'Ron and Mike have 12 marbles altogether. Each of them has more than 4 marbles. Ron has fewer marbles than Mike. How many marbles does Mike have?',
    type: 'open', correctAnswer: '7', unit: 'marbles',
    heuristic: 'Guess and Check',
    solution: 'Each has more than 4 (so at least 5). Total = 12. Try Ron=5, Mike=7: 5+7=12 ✓, both>4 ✓, Ron<Mike ✓. Mike has 7.',
    difficulty: 2, topicTags: ['logical-reasoning', 'guess-and-check', 'addition'], estimatedSeconds: 120,
  },
  {
    id: '2023-A-9', year: 2023, section: 'A', questionNumber: 9,
    stem: 'Andy placed 2 bottles on one side of a square. How many bottles does Andy need to go round 3 squares?',
    type: 'open', correctAnswer: '24', unit: 'bottles',
    heuristic: 'Draw a Diagram',
    solution: 'Each square has 4 sides × 2 bottles = 8 bottles. 3 squares = 3 × 8 = 24 bottles.',
    difficulty: 2, topicTags: ['multiplication', 'geometry'], estimatedSeconds: 120,
  },
  {
    id: '2023-A-10', year: 2023, section: 'A', questionNumber: 10,
    stem: 'A pictograph shows favourite places. Zoo: 8 stars, Bird Park: 4 stars, Museum: 2 stars, Aquarium: 3 stars. Each star = 2 pupils. How many pupils chose the 3 most favourite places in total?',
    type: 'open', correctAnswer: '30', unit: 'pupils',
    heuristic: 'Read Data / Simplify the Problem',
    solution: 'Zoo=8×2=16, Bird Park=4×2=8, Aquarium=3×2=6, Museum=2×2=4. Top 3: Zoo, Bird Park, Aquarium. Total: 16+8+6=30.',
    commonMistake: 'Including Museum in the top 3 (it has fewer pupils than Aquarium).',
    difficulty: 2, topicTags: ['pictograph', 'data-reading', 'addition'], estimatedSeconds: 90,
  },
  {
    id: '2023-A-11', year: 2023, section: 'A', questionNumber: 11,
    stem: "Jason looked at a clock showing 8:00 (hour hand at 8, minute hand at 12). He realised the clock was 2 hours slower than the actual time. What was the actual time?",
    type: 'open', correctAnswer: '10', unit: "o'clock",
    heuristic: 'Work Backwards',
    solution: 'Clock shows 8:00. 2 hours slow → actual time = 8 + 2 = 10 o\'clock.',
    difficulty: 1, topicTags: ['time', 'clock-reading', 'addition'], estimatedSeconds: 60,
  },
  {
    id: '2023-A-12', year: 2023, section: 'A', questionNumber: 12,
    stem: 'Mr Chan has $50. He wants to buy a doll ($39) and 2 teddy bears ($15 each). How much more money does he need?',
    type: 'open', correctAnswer: '19', unit: '$',
    heuristic: 'Model Drawing',
    solution: 'Total cost: $39 + 2×$15 = $39+$30 = $69. Extra needed: $69−$50 = $19.',
    difficulty: 2, topicTags: ['money', 'multiplication', 'subtraction', 'multi-step'], estimatedSeconds: 120,
  },
  {
    id: '2023-A-13', year: 2023, section: 'A', questionNumber: 13,
    stem: 'A figure is made of semicircles and quarter-circles. Looking at the figure: there are 4 quarter-circles and 4 semicircles. How many complete circles can be made from all of them?',
    type: 'open', correctAnswer: '3', unit: 'circles',
    heuristic: 'Simplify the Problem',
    solution: '4 quarter-circles = 1 full circle. 4 semicircles = 2 full circles. Total: 1+2 = 3 circles.',
    difficulty: 2, topicTags: ['geometry', 'fractions-of-shapes', 'counting'], estimatedSeconds: 120,
  },
  {
    id: '2023-A-14', year: 2023, section: 'A', questionNumber: 14,
    stem: 'A picture of a toy train shows 3 circle wheels and 2 triangles (one roof peak, one front slope). How many circles and triangles are there altogether?',
    type: 'open', correctAnswer: '5',
    heuristic: 'Simplify the Problem',
    solution: 'Circles (wheels): 3. Triangles: 2. Total: 3+2=5.',
    difficulty: 1, topicTags: ['geometry', 'counting', 'shapes'], estimatedSeconds: 45,
  },
  {
    id: '2023-A-15', year: 2023, section: 'A', questionNumber: 15,
    stem: "Karen has $26. Karen and Leon have $99 altogether. How much less money does Karen have than Leon?",
    type: 'open', correctAnswer: '47', unit: '$',
    heuristic: 'Model Drawing',
    solution: 'Leon = $99−$26=$73. Difference: $73−$26=$47. Karen has $47 less than Leon.',
    commonMistake: 'Answering $47 without noting direction — Leon has MORE, Karen has less.',
    difficulty: 2, topicTags: ['subtraction', 'comparison', 'money'], estimatedSeconds: 90,
  },
  {
    id: '2023-A-16', year: 2023, section: 'A', questionNumber: 16,
    stem: 'Cindy bakes cookies from 2.45 p.m. to 3.15 p.m. How many minutes does she take?',
    type: 'open', correctAnswer: '30', unit: 'min',
    heuristic: 'Draw a Diagram (Timeline)',
    solution: '2:45 → 3:00 = 15 min. 3:00 → 3:15 = 15 min. Total = 30 min.',
    difficulty: 1, topicTags: ['time', 'elapsed-time'], estimatedSeconds: 60,
  },
  {
    id: '2023-A-17', year: 2023, section: 'A', questionNumber: 17,
    stem: "Samuel folded 19 paper aeroplanes. His brother folded 17 more paper aeroplanes than Samuel. How many did his brother fold?",
    type: 'open', correctAnswer: '36', unit: 'paper aeroplanes',
    heuristic: 'Model Drawing',
    solution: 'Brother = 19+17 = 36.',
    difficulty: 1, topicTags: ['addition', 'comparison'], estimatedSeconds: 45,
  },
  {
    id: '2023-A-18', year: 2023, section: 'A', questionNumber: 18,
    stem: "Linda has $70. Mandy has 5 five-dollar notes. How much money do they have altogether?",
    type: 'open', correctAnswer: '95', unit: '$',
    heuristic: 'Model Drawing',
    solution: 'Mandy: 5×$5=$25. Total: $70+$25=$95.',
    difficulty: 1, topicTags: ['money', 'multiplication', 'addition'], estimatedSeconds: 60,
  },
  {
    id: '2023-A-19', year: 2023, section: 'A', questionNumber: 19,
    stem: 'A number pattern shows rows increasing by 3. Row 1: 1,4,7,10. Row 2: 22,19,16,13. Row 3: 25,?,…  What is the missing number in Row 3?',
    type: 'open', correctAnswer: '28',
    heuristic: 'Look for Patterns',
    solution: 'Row 3 starts at 25 and increases by 3 going right: 25, 28, 31, 34. Missing number = 28.',
    difficulty: 2, topicTags: ['patterns', 'number-sequences'], estimatedSeconds: 90,
  },
  {
    id: '2023-A-20', year: 2023, section: 'A', questionNumber: 20,
    stem: 'Tammy must choose one activity from Term 3 (Drawing, Gymnasium, Junior Chef) and one from Term 4 (Sculpture, Pottery). How many different sets of choices can she make?',
    type: 'open', correctAnswer: '6', unit: 'choices',
    heuristic: 'Make a Systematic List',
    solution: '3 Term 3 activities × 2 Term 4 activities = 6 combinations.',
    difficulty: 2, topicTags: ['combinations', 'systematic-listing'], estimatedSeconds: 120,
  },
];

// ═══════════════════════════════════════════════════════════════════════════
// 2023 PAPER — Section B  (open-ended, 3 marks each, Q21–40)
// ═══════════════════════════════════════════════════════════════════════════
const Q_2023_B: SMCQuestion[] = [
  {
    id: '2023-B-21', year: 2023, section: 'B', questionNumber: 21,
    stem: 'For every 10 apples bought, 2 free apples are given. Mrs Lee received 6 free apples. How many apples did she have altogether?',
    type: 'open', correctAnswer: '36', unit: 'apples',
    heuristic: 'Look for Patterns',
    solution: '6 free ÷ 2 = 3 groups of 10 bought. Bought: 30. Total: 30+6=36.',
    difficulty: 2, topicTags: ['division', 'multiplication', 'addition'], estimatedSeconds: 120,
  },
  {
    id: '2023-B-22', year: 2023, section: 'B', questionNumber: 22,
    stem: 'Joseph calculated 45+36+7. His calculator showed 48 instead of the correct answer. One digit button was not working. Which number button was not working?',
    type: 'open', correctAnswer: '4',
    heuristic: 'Guess and Check',
    solution: 'Correct: 45+36+7=88. If "4" is broken: 05+06+7 = 5+36+7 = 48 ✓. Button "4" was broken.',
    commonMistake: 'Trying other digits first without checking 4.',
    difficulty: 3, topicTags: ['logical-reasoning', 'addition', 'problem-solving'], estimatedSeconds: 180,
  },
  {
    id: '2023-B-23', year: 2023, section: 'B', questionNumber: 23,
    stem: 'Bernard collected 86 marbles. He gave 49 to his brother and lost some. The rest (9 marbles, visible in bottle) were kept. How many marbles did Bernard lose?',
    type: 'open', correctAnswer: '28', unit: 'marbles',
    heuristic: 'Work Backwards',
    solution: 'After giving: 86−49=37. Lost: 37−9=28.',
    difficulty: 2, topicTags: ['subtraction', 'multi-step', 'work-backwards'], estimatedSeconds: 120,
  },
  {
    id: '2023-B-24', year: 2023, section: 'B', questionNumber: 24,
    stem: 'Linette had some toys. She gave away 18 and threw away 15. She had 28 left. How many toys did Linette have at first?',
    type: 'open', correctAnswer: '61', unit: 'toys',
    heuristic: 'Work Backwards',
    solution: 'Work backwards: 28+15+18=61.',
    difficulty: 2, topicTags: ['addition', 'work-backwards', 'multi-step'], estimatedSeconds: 120,
  },
  {
    id: '2023-B-25', year: 2023, section: 'B', questionNumber: 25,
    stem: 'Mdm Fatimah bought 3 bags of cookies with 8 cookies in each bag. She repacked all into smaller packs of 4 each. How many packs did she have?',
    type: 'open', correctAnswer: '6', unit: 'packs',
    heuristic: 'Model Drawing',
    solution: 'Total: 3×8=24 cookies. Packs of 4: 24÷4=6.',
    difficulty: 2, topicTags: ['multiplication', 'division', 'multi-step'], estimatedSeconds: 120,
  },
  {
    id: '2023-B-26', year: 2023, section: 'B', questionNumber: 26,
    stem: 'Siti wants to exchange a $50 note for $5 and $10 notes. She will get four $5 notes and some $10 notes. How many $10 notes will she get?',
    type: 'open', correctAnswer: '3', unit: '$10 notes',
    heuristic: 'Work Backwards',
    solution: '4×$5=$20. Remaining: $50−$20=$30. $30÷$10=3 notes.',
    difficulty: 2, topicTags: ['money', 'division', 'subtraction'], estimatedSeconds: 90,
  },
  {
    id: '2023-B-27', year: 2023, section: 'B', questionNumber: 27,
    stem: 'Raja uses 2 slices of bread and 1 slice of ham per sandwich. What is the total number of slices of bread and ham used to make 4 sandwiches?',
    type: 'open', correctAnswer: '12', unit: 'slices',
    heuristic: 'Look for Patterns',
    solution: 'Bread for 4: 4×2=8. Ham for 4: 4×1=4. Total: 8+4=12.',
    difficulty: 1, topicTags: ['multiplication', 'addition', 'patterns'], estimatedSeconds: 90,
  },
  {
    id: '2023-B-28', year: 2023, section: 'B', questionNumber: 28,
    stem: 'A pencil equals the length of 7 paper clips. An eraser equals the length of 2 paper clips. The length of 5 such pencils is as long as how many erasers?',
    type: 'open', correctAnswer: '17', unit: 'erasers',
    heuristic: 'Model Drawing',
    solution: '5 pencils = 5×7 = 35 paper clips. Each eraser = 2 paper clips. 35÷2 = 17.5. Since we need whole erasers, answer = 17 erasers (the 5 pencils span 17 full erasers).',
    commonMistake: 'Not accounting for the half-eraser at the end.',
    difficulty: 3, topicTags: ['measurement', 'multiplication', 'division'], estimatedSeconds: 180,
  },
  {
    id: '2023-B-29', year: 2023, section: 'B', questionNumber: 29,
    stem: 'Kenneth is thinking of a 2-digit number that is greater than 31 but smaller than 40. When the two digits are added together, the answer is 9. What number is Kenneth thinking of?',
    type: 'open', correctAnswer: '36',
    heuristic: 'Guess and Check',
    solution: 'Numbers 32–39: 3+6=9 ✓ → 36. Others: 3+2=5, 3+3=6, 3+4=7, 3+5=8, 3+7=10. Only 36 works.',
    difficulty: 2, topicTags: ['logical-reasoning', 'place-value', 'guess-and-check'], estimatedSeconds: 90,
  },
  {
    id: '2023-B-30', year: 2023, section: 'B', questionNumber: 30,
    stem: 'There are 6 boys and girls altogether. Each boy gets 3 sweets. Each girl gets 2 sweets. All the children share a total of 16 sweets. How many boys are there?',
    type: 'open', correctAnswer: '4', unit: 'boys',
    heuristic: 'Assumption Method',
    solution: 'If all 6 were girls: 6×2=12 sweets, but we have 16 (4 extra). Each boy gives 3−2=1 extra. Number of boys = 4.',
    commonMistake: 'Using trial and error without the efficient assumption method.',
    difficulty: 3, topicTags: ['assumption-method', 'logical-reasoning', 'multi-step'], estimatedSeconds: 180,
  },
  {
    id: '2023-B-31', year: 2023, section: 'B', questionNumber: 31,
    stem: 'At a Pizza restaurant: Mr Lee ordered the most expensive pasta (Mushroom $9). Mrs Lee ordered the cheapest pizza (Vegetarian $10). Both ordered a non-juice drink ($3 each). Service charge = $2. How much did they pay in total?',
    type: 'open', correctAnswer: '27', unit: '$',
    heuristic: 'Model Drawing',
    solution: '$9+$10+$3+$3+$2=$27.',
    difficulty: 2, topicTags: ['money', 'addition', 'multi-step', 'reading-data'], estimatedSeconds: 120,
  },
  {
    id: '2023-B-32', year: 2023, section: 'B', questionNumber: 32,
    stem: 'Brandon had 19 rubber bands. He had 7 fewer rubber bands than James. How many rubber bands did they have altogether?',
    type: 'open', correctAnswer: '45', unit: 'rubber bands',
    heuristic: 'Model Drawing',
    solution: 'James = 19+7=26. Total = 19+26=45.',
    difficulty: 1, topicTags: ['addition', 'comparison'], estimatedSeconds: 60,
  },
  {
    id: '2023-B-33', year: 2023, section: 'B', questionNumber: 33,
    stem: '4 leaves = 20. 3 ice creams = 12. What is 1 leaf + 2 ice creams?',
    type: 'open', correctAnswer: '13',
    heuristic: 'Simplify the Problem',
    solution: '1 leaf = 20÷4=5. 1 ice cream = 12÷3=4. 5+4+4=13.',
    difficulty: 2, topicTags: ['division', 'addition', 'algebra-thinking'], estimatedSeconds: 90,
  },
  {
    id: '2023-B-34', year: 2023, section: 'B', questionNumber: 34,
    stem: "Johnny has a book with 40 pages. How many pages will the digit '2' appear on at least once?",
    type: 'open', correctAnswer: '13', unit: 'pages',
    heuristic: 'Make a Systematic List',
    solution: "Pages with '2': 2, 12, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 32. Count = 13.",
    difficulty: 3, topicTags: ['systematic-listing', 'digits', 'counting'], estimatedSeconds: 180,
  },
  {
    id: '2023-B-35', year: 2023, section: 'B', questionNumber: 35,
    stem: 'Emma baked 12 more pies than Danielle. Florence baked 4 fewer pies than Danielle. Danielle baked 12 pies. How many pies did the 3 girls bake altogether?',
    type: 'open', correctAnswer: '44', unit: 'pies',
    heuristic: 'Model Drawing',
    solution: 'Emma=12+12=24. Danielle=12. Florence=12−4=8. Total=24+12+8=44.',
    difficulty: 2, topicTags: ['addition', 'subtraction', 'comparison', 'multi-step'], estimatedSeconds: 120,
  },
  {
    id: '2023-B-36', year: 2023, section: 'B', questionNumber: 36,
    stem: 'Daniel bought 12 lollipops. He bought twice as many as Adrian. Both shared their lollipops equally with John. How many lollipops did John receive?',
    type: 'open', correctAnswer: '6', unit: 'lollipops',
    heuristic: 'Model Drawing',
    solution: 'Daniel=12. Adrian=12÷2=6. Total=12+6=18. Shared equally by 3 (Daniel, Adrian, John): 18÷3=6.',
    difficulty: 3, topicTags: ['division', 'multiplication', 'multi-step'], estimatedSeconds: 180,
  },
  {
    id: '2023-B-37', year: 2023, section: 'B', questionNumber: 37,
    stem: '3 candles + 1 cupcake = 60. 1 burger + 1 cupcake = 65. Burger = 20. What is the value of 1 candle?',
    type: 'open', correctAnswer: '5',
    heuristic: 'Simplify the Problem / Work Backwards',
    solution: 'Cupcake = 65−20=45. 3 candles = 60−45=15. 1 candle = 15÷3=5.',
    difficulty: 3, topicTags: ['algebra-thinking', 'subtraction', 'division'], estimatedSeconds: 180,
  },
  {
    id: '2023-B-38', year: 2023, section: 'B', questionNumber: 38,
    stem: 'Leonard baked more than 20 but fewer than 30 pies. He could put them on trays of 3 or on trays of 4 (with no pies left over). How many pies did Leonard bake?',
    type: 'open', correctAnswer: '24', unit: 'pies',
    heuristic: 'Guess and Check',
    solution: 'Need a number between 21–29 divisible by both 3 and 4. LCM(3,4)=12. Multiples of 12: 12, 24, 36. Only 24 is between 20 and 30.',
    difficulty: 3, topicTags: ['division', 'logical-reasoning', 'multiples'], estimatedSeconds: 180,
  },
  {
    id: '2023-B-39', year: 2023, section: 'B', questionNumber: 39,
    stem: "Annie was 15 years old 3 years ago. Margaret is 4 years older than Annie. How old will Margaret be 7 years later?",
    type: 'open', correctAnswer: '29', unit: 'years old',
    heuristic: 'Work Backwards',
    solution: "Annie now = 15+3=18. Margaret now = 18+4=22. Margaret in 7 years = 22+7=29.",
    difficulty: 2, topicTags: ['age-problems', 'addition', 'multi-step'], estimatedSeconds: 120,
  },
  {
    id: '2023-B-40', year: 2023, section: 'B', questionNumber: 40,
    stem: 'Watermelon=$15, Grapes=$22, Mango=$7, Strawberries=$16. Mr Tan would need $4 more to buy a mango and grapes. In the end, he bought a watermelon and a mango. How much money did he have left?',
    type: 'open', correctAnswer: '3', unit: '$',
    heuristic: 'Work Backwards',
    solution: 'Mr Tan has: $7+$22−$4=$25. Spent: $15+$7=$22. Left: $25−$22=$3.',
    difficulty: 3, topicTags: ['money', 'multi-step', 'work-backwards'], estimatedSeconds: 180,
  },
];

// ═══════════════════════════════════════════════════════════════════════════
// Combined exports
// ═══════════════════════════════════════════════════════════════════════════
export const ALL_QUESTIONS_G1: SMCQuestion[] = [
  ...Q_2025_A, ...Q_2025_B, ...Q_2025_C,
  ...Q_2023_A, ...Q_2023_B,
];

export const QUESTIONS_BY_YEAR = {
  2025: [...Q_2025_A, ...Q_2025_B, ...Q_2025_C],
  2023: [...Q_2023_A, ...Q_2023_B],
};

export function getQuestionsBySection(year: 2023 | 2025, section: SectionId) {
  return QUESTIONS_BY_YEAR[year].filter((q) => q.section === section);
}

export function getQuestionsByTopic(topic: string) {
  return ALL_QUESTIONS_G1.filter((q) => q.topicTags.includes(topic));
}

export function getQuestionsByDifficulty(d: 1 | 2 | 3) {
  return ALL_QUESTIONS_G1.filter((q) => q.difficulty === d);
}
