import { SeedBook, ALL_YEARS } from '../types';

/**
 * Aptitude and Reasoning: the quantitative, logical and verbal sections of
 * mass-recruiter placement tests (TCS NQT, Infosys, Wipro, Accenture, Cognizant).
 */
const book: SeedBook = {
  slug: 'aptitude',
  title: 'Aptitude and Reasoning',
  kind: 'topic',
  subject: 'Aptitude',
  description: `Placement-test aptitude solved step by step: percentages, ratios, time and work, profit and interest, logical reasoning, verbal ability and data interpretation, with shortcuts.`,
  color: '#b45309',
  emblem: '🧮',
  audience: 'all',
  stages: ALL_YEARS,
  tracks: [],
  order: 20,
  chapters: [
    {
      title: 'Numbers, percentages and ratios',
      questions: [
        {
          q: `The price of a phone is first increased by 20% and then decreased by 20%. What is the net change in its price?

A. No change
B. 4% increase
C. 4% decrease
D. 2% decrease`,
          a: `**C. 4% decrease**

**Step by step**
1. Take the original price as ₹100.
2. After a 20% increase: 100 + 20 = ₹120.
3. After a 20% decrease on 120: 20% of 120 = 24, so 120 − 24 = ₹96.
4. The price moved from ₹100 to ₹96, a **4% decrease**.

The two 20% changes do not cancel because the decrease is calculated on a bigger base (120) than the increase (100).

**Shortcut**
For two successive changes of x% and y%, the net change is x + y + (xy / 100).
Here x = +20, y = −20: 20 − 20 + (20 × −20) / 100 = −4, so a 4% decrease. Whenever a value goes up and down by the same x%, the result is always a loss of x²/100 %.`,
          d: 'easy',
          at: 'TCS NQT, Infosys',
          tip: `Successive changes: net = x + y + xy/100. Equal rise and fall of x% always gives a loss of x²/100 %.`,
        },
        {
          q: `If A : B = 2 : 3 and B : C = 4 : 5, find A : B : C.

A. 2 : 3 : 5
B. 8 : 12 : 15
C. 6 : 9 : 10
D. 8 : 12 : 10`,
          a: `**B. 8 : 12 : 15**

**Step by step**
1. B appears in both ratios, but with different values (3 in the first, 4 in the second). Make B the same in both.
2. The LCM of 3 and 4 is 12.
3. Multiply A : B = 2 : 3 by 4 → **8 : 12**.
4. Multiply B : C = 4 : 5 by 3 → **12 : 15**.
5. Now B is 12 in both, so A : B : C = **8 : 12 : 15**.

**Check:** 8 : 12 simplifies to 2 : 3 and 12 : 15 simplifies to 4 : 5. Both given ratios hold.

**Shortcut**
For A : B = a : b and B : C = c : d, write A : B : C = (a × c) : (b × c) : (b × d) = (2 × 4) : (3 × 4) : (3 × 5) = 8 : 12 : 15.`,
          d: 'easy',
          at: 'Wipro, Cognizant',
          tip: `A:B = a:b, B:C = c:d → A:B:C = ac : bc : bd.`,
        },
        {
          q: `What is the unit digit of 7^95?

A. 1
B. 3
C. 7
D. 9`,
          a: `**B. 3**

**Step by step**
1. Unit digits of powers of 7 repeat in a cycle of 4:
   - 7^1 → 7
   - 7^2 = 49 → 9
   - 7^3 = 343 → 3
   - 7^4 = 2401 → 1
   - 7^5 → 7 again, and so on.
2. Divide the exponent by 4: 95 ÷ 4 = 23 remainder **3**.
3. A remainder of 3 means the unit digit equals that of 7^3, which is **3**.

**Note:** if the remainder is 0, use the 4th term of the cycle (here 1), not the 0th.

**Shortcut**
Digits 2, 3, 7 and 8 have a cycle of 4; digits 4 and 9 have a cycle of 2; digits 0, 1, 5 and 6 always repeat themselves. Find exponent mod 4 and read the answer from the cycle.`,
          d: 'easy',
          at: 'TCS NQT, Accenture',
          tip: `Cycle of 7: 7, 9, 3, 1. Use exponent mod 4; remainder 0 means the 4th term.`,
        },
        {
          q: `Ravi's salary is 25% more than Shyam's salary. By what percentage is Shyam's salary less than Ravi's?

A. 25%
B. 20%
C. 22.5%
D. 15%`,
          a: `**B. 20%**

**Step by step**
1. Let Shyam's salary be ₹100.
2. Ravi earns 25% more: ₹125.
3. The difference is ₹25.
4. "Less than Ravi's" means the base is Ravi's salary: 25 / 125 × 100 = **20%**.

The trap is option A. The percentage depends on which salary is the base. Comparing with Shyam gives 25%; comparing with Ravi gives 20%.

**Shortcut**
If A is r% more than B, then B is (r / (100 + r)) × 100 % less than A.
Here: 25 / 125 × 100 = 20%.
Likewise, if A is r% less than B, then B is (r / (100 − r)) × 100 % more than A.`,
          d: 'medium',
          at: 'Infosys, Wipro',
          tip: `A is r% more than B → B is r/(100+r) × 100 % less than A.`,
        },
        {
          q: `The HCF of two numbers is 12 and their LCM is 360. If one of the numbers is 72, find the other.

A. 48
B. 60
C. 90
D. 120`,
          a: `**B. 60**

**Step by step**
1. For any two numbers: first number × second number = HCF × LCM.
2. 72 × x = 12 × 360 = 4320.
3. x = 4320 / 72 = **60**.

**Verify**
- 72 = 2³ × 3², 60 = 2² × 3 × 5.
- HCF takes the lowest powers of common primes: 2² × 3 = 12. ✔
- LCM takes the highest powers of all primes: 2³ × 3² × 5 = 360. ✔

**Shortcut**
Divide first to keep numbers small: 360 / 72 = 5, then 5 × 12 = 60.

Remember the product rule works only for **two** numbers, not three or more.`,
          d: 'medium',
          at: 'TCS NQT, Cognizant',
          tip: `For two numbers only: product of the numbers = HCF × LCM.`,
        },
        {
          q: `In what ratio must rice costing ₹40 per kg be mixed with rice costing ₹60 per kg so that the mixture costs ₹52 per kg?

A. 3 : 2
B. 2 : 3
C. 1 : 2
D. 4 : 3`,
          a: `**B. 2 : 3**

**Step by step (alligation)**
1. Write the cheaper price (40) and the dearer price (60), with the mean price (52) in the middle.
2. Cross-subtract:
   - Cheaper share = dearer − mean = 60 − 52 = **8**
   - Dearer share = mean − cheaper = 52 − 40 = **12**
3. Cheaper : Dearer = 8 : 12 = **2 : 3**.

**Verify**
Take 2 kg at ₹40 and 3 kg at ₹60. Cost = 80 + 180 = ₹260 for 5 kg, which is ₹52 per kg. ✔

**Algebra method**
Let x kg of the ₹40 rice be mixed with 1 kg of the ₹60 rice: 40x + 60 = 52(x + 1) → 8 = 12x → x = 2/3, giving 2 : 3.

**Shortcut:** alligation gives the ratio in one line and works for any two-ingredient mixture (prices, concentrations, speeds).`,
          d: 'medium',
          at: 'Accenture, Wipro',
          tip: `Alligation: cheaper : dearer = (dearer − mean) : (mean − cheaper).`,
        },
        {
          q: `A container holds 40 litres of pure milk. 4 litres are taken out and replaced with water. This process is done 3 times in total. How much milk is left in the container?

A. 28 litres
B. 29.16 litres
C. 30 litres
D. 32.4 litres`,
          a: `**B. 29.16 litres**

**Step by step**
1. Each time, 4 out of 40 litres (one-tenth) of the current mixture is removed, so the milk left is multiplied by 36/40 = 0.9.
2. After the 1st operation: 40 × 0.9 = 36 litres of milk.
3. After the 2nd: 36 × 0.9 = 32.4 litres.
4. After the 3rd: 32.4 × 0.9 = **29.16 litres**.

The total volume stays 40 litres throughout; only the milk share falls.

**Formula**
Milk left = initial quantity × (1 − removed / total)^n
= 40 × (1 − 4/40)³ = 40 × 0.729 = 29.16 litres.

The trap is option A (subtracting 4 litres three times). That is wrong because after the first replacement you remove a mixture, not pure milk.`,
          d: 'hard',
          at: 'TCS NQT, Infosys',
          tip: `Repeated replacement: left = initial × (1 − x/total)^n.`,
        },
        {
          q: `Find the smallest number which, when divided by 6, 7 and 8, leaves remainders 4, 5 and 6 respectively.

A. 166
B. 168
C. 170
D. 334`,
          a: `**A. 166**

**Step by step**
1. Look at the gap between each divisor and its remainder:
   - 6 − 4 = 2
   - 7 − 5 = 2
   - 8 − 6 = 2
2. The gap is the same (2) every time. So if we add 2 to the number, it becomes exactly divisible by 6, 7 and 8.
3. The smallest number divisible by all three is LCM(6, 7, 8) = **168**.
4. The required number = 168 − 2 = **166**.

**Verify**
- 166 ÷ 6 = 27 remainder 4 ✔
- 166 ÷ 7 = 23 remainder 5 ✔
- 166 ÷ 8 = 20 remainder 6 ✔

**Shortcut**
If (divisor − remainder) is constant = k, the answer is LCM − k. If the remainder itself is constant = r, the answer is LCM + r.`,
          d: 'hard',
          at: 'Cognizant, Accenture',
          tip: `Constant (divisor − remainder) = k → LCM − k. Constant remainder r → LCM + r.`,
        },
      ],
    },
    {
      title: 'Time, speed, work and distance',
      questions: [
        {
          q: `A train 150 m long passes a telegraph pole in 15 seconds. What is its speed in km/h?

A. 30 km/h
B. 36 km/h
C. 40 km/h
D. 54 km/h`,
          a: `**B. 36 km/h**

**Step by step**
1. To pass a pole (a point), the train covers only its own length: 150 m.
2. Speed = distance / time = 150 / 15 = 10 m/s.
3. Convert m/s to km/h by multiplying by 18/5: 10 × 18/5 = **36 km/h**.

**Remember what distance to use**
- Passing a pole, a person or a tree: train length only.
- Passing a platform or bridge: train length + platform length.
- Two trains crossing: sum of both lengths, with relative speed.

**Shortcut**
km/h → m/s: multiply by 5/18. m/s → km/h: multiply by 18/5 (that is, × 3.6).`,
          d: 'easy',
          at: 'TCS NQT, Wipro',
          tip: `m/s × 18/5 = km/h. Passing a pole: distance = train length.`,
        },
        {
          q: `A can complete a piece of work in 10 days and B can complete it in 15 days. In how many days can they finish it working together?

A. 5 days
B. 6 days
C. 8 days
D. 12.5 days`,
          a: `**B. 6 days**

**Step by step (fraction method)**
1. A's one-day work = 1/10. B's one-day work = 1/15.
2. Together in one day: 1/10 + 1/15 = 3/30 + 2/30 = 5/30 = 1/6.
3. They finish 1/6 of the work per day, so the full work takes **6 days**.

**LCM (units) method**
1. Take total work = LCM(10, 15) = 30 units.
2. A does 30/10 = 3 units/day; B does 30/15 = 2 units/day.
3. Together: 5 units/day → 30 / 5 = 6 days.

**Shortcut**
For two people: time together = (a × b) / (a + b) = (10 × 15) / 25 = 150 / 25 = 6 days.`,
          d: 'easy',
          at: 'Infosys, Cognizant',
          tip: `Two workers together: ab / (a + b) days.`,
        },
        {
          q: `A car goes from city X to city Y at 60 km/h and returns along the same road at 40 km/h. What is its average speed for the whole journey?

A. 50 km/h
B. 48 km/h
C. 45 km/h
D. 52 km/h`,
          a: `**B. 48 km/h**

**Step by step**
1. Average speed = total distance / total time (never the simple average of speeds).
2. Assume the distance is 120 km (the LCM of 60 and 40, to avoid fractions).
3. Time going = 120 / 60 = 2 h. Time returning = 120 / 40 = 3 h.
4. Total distance = 240 km, total time = 5 h.
5. Average speed = 240 / 5 = **48 km/h**.

The trap is option A (the plain average of 60 and 40). The car spends more time at the slower speed, so the average is pulled below 50.

**Shortcut**
When equal distances are covered at speeds x and y: average speed = 2xy / (x + y) = (2 × 60 × 40) / 100 = 48 km/h.`,
          d: 'easy',
          at: 'TCS NQT, Accenture',
          tip: `Equal distances at x and y: average speed = 2xy / (x + y).`,
        },
        {
          q: `Two trains, 120 m and 180 m long, run on parallel tracks in opposite directions at 40 km/h and 50 km/h. How long do they take to cross each other completely?

A. 10 seconds
B. 12 seconds
C. 15 seconds
D. 18 seconds`,
          a: `**B. 12 seconds**

**Step by step**
1. In opposite directions, speeds add: relative speed = 40 + 50 = 90 km/h.
2. Convert to m/s: 90 × 5/18 = 25 m/s.
3. To cross completely, the trains together must cover the sum of their lengths: 120 + 180 = 300 m.
4. Time = 300 / 25 = **12 seconds**.

**Same direction?**
If they ran the same way, the relative speed would be 50 − 40 = 10 km/h = 25/9 m/s, and the time would be 300 ÷ 25/9 = 108 seconds.

**Shortcut**
Opposite directions → add speeds; same direction → subtract speeds. Distance is always the sum of both lengths.`,
          d: 'medium',
          at: 'Wipro, Infosys',
          tip: `Crossing trains: time = (L1 + L2) / relative speed. Opposite: add speeds; same: subtract.`,
        },
        {
          q: `Pipe A can fill a tank in 12 hours and pipe B can fill it in 15 hours. Pipe C can empty the full tank in 20 hours. If all three pipes are opened together on an empty tank, how long will it take to fill?

A. 8 hours
B. 10 hours
C. 12 hours
D. 15 hours`,
          a: `**B. 10 hours**

**Step by step**
1. Take tank capacity = LCM(12, 15, 20) = 60 units.
2. A fills 60/12 = 5 units/hour.
3. B fills 60/15 = 4 units/hour.
4. C empties 60/20 = 3 units/hour.
5. Net filling per hour = 5 + 4 − 3 = 6 units.
6. Time to fill 60 units = 60 / 6 = **10 hours**.

**Fraction method**
1/12 + 1/15 − 1/20 = 5/60 + 4/60 − 3/60 = 6/60 = 1/10 → 10 hours.

**Shortcut**
Filling pipes are positive work, emptying pipes (leaks) are negative work. Using an LCM capacity turns every pipe into a whole number of units per hour.`,
          d: 'medium',
          at: 'TCS NQT, Cognizant',
          tip: `Use capacity = LCM of times. Inlets add units, outlets subtract.`,
        },
        {
          q: `A boat's speed in still water is 15 km/h and the speed of the stream is 3 km/h. The boat goes 36 km downstream and comes back to the starting point. What is the total time taken?

A. 4 hours
B. 4.5 hours
C. 5 hours
D. 6 hours`,
          a: `**C. 5 hours**

**Step by step**
1. Downstream speed = boat + stream = 15 + 3 = 18 km/h.
2. Upstream speed = boat − stream = 15 − 3 = 12 km/h.
3. Time downstream = 36 / 18 = 2 hours.
4. Time upstream = 36 / 12 = 3 hours.
5. Total time = 2 + 3 = **5 hours**.

**Reverse formulas (also asked often)**
- Boat speed in still water = (downstream + upstream) / 2
- Stream speed = (downstream − upstream) / 2

Check: (18 + 12) / 2 = 15 and (18 − 12) / 2 = 3. ✔

**Shortcut:** the stream helps going down and hurts coming back, so the return trip always takes longer.`,
          d: 'medium',
          at: 'Accenture, Wipro',
          tip: `Downstream = b + s, upstream = b − s; b = (D + U)/2, s = (D − U)/2.`,
        },
        {
          q: `A and B together can finish a work in 12 days, B and C together in 15 days, and C and A together in 20 days. In how many days can A alone finish the work?

A. 24 days
B. 30 days
C. 40 days
D. 60 days`,
          a: `**B. 30 days**

**Step by step**
1. Take total work = LCM(12, 15, 20) = 60 units.
2. A + B = 60/12 = 5 units/day.
3. B + C = 60/15 = 4 units/day.
4. C + A = 60/20 = 3 units/day.
5. Add all three: 2(A + B + C) = 12 → A + B + C = 6 units/day.
6. A alone = (A + B + C) − (B + C) = 6 − 4 = 2 units/day.
7. A alone takes 60 / 2 = **30 days**.

**Bonus (from the same numbers)**
- B = 6 − 3 = 3 units/day → 20 days.
- C = 6 − 5 = 1 unit/day → 60 days.

**Shortcut**
Add the pair rates and halve to get the trio rate, then subtract the pair that excludes the person you want.`,
          d: 'hard',
          at: 'Infosys, TCS NQT',
          tip: `Sum of pair rates = 2 × (A + B + C). Then A = trio − (B + C).`,
        },
        {
          q: `A man walking at 5 km/h reaches the railway station 7 minutes late. If he walks at 6 km/h, he reaches 5 minutes early. How far is the station from his house?

A. 5 km
B. 6 km
C. 7.5 km
D. 8 km`,
          a: `**B. 6 km**

**Step by step**
1. The difference in arrival times is 7 minutes late vs 5 minutes early = 12 minutes = 12/60 = 1/5 hour.
2. Let the distance be d km.
   - Time at 5 km/h = d/5 hours.
   - Time at 6 km/h = d/6 hours.
3. d/5 − d/6 = 1/5
4. (6d − 5d) / 30 = 1/5 → d / 30 = 1/5 → d = **6 km**.

**Verify**
- At 5 km/h: 6/5 h = 72 minutes.
- At 6 km/h: 6/6 h = 60 minutes.
- Difference = 12 minutes ✔ (the correct time is 65 minutes).

**Shortcut**
Distance = (product of speeds / difference of speeds) × time difference = (30 / 1) × (1/5) = 6 km.`,
          d: 'hard',
          at: 'TCS NQT, Cognizant',
          tip: `Late/early problems: d = (S1 × S2 / (S2 − S1)) × total time difference in hours.`,
        },
      ],
    },
    {
      title: 'Profit, loss and interest',
      questions: [
        {
          q: `A shopkeeper buys an article for ₹800 and sells it for ₹1,000. What is his profit percentage?

A. 20%
B. 25%
C. 22%
D. 18%`,
          a: `**B. 25%**

**Step by step**
1. Profit = selling price − cost price = 1000 − 800 = ₹200.
2. Profit % is always calculated on the **cost price**: 200 / 800 × 100 = **25%**.

The trap is option A: 200 / 1000 × 100 = 20%, which wrongly uses the selling price as the base.

**Related formulas**
- SP = CP × (100 + profit%) / 100
- CP = SP × 100 / (100 + profit%)
- For a loss, replace (100 + profit%) with (100 − loss%).

**Shortcut:** profit and loss percentages are on CP; discount percentages are on the marked price.`,
          d: 'easy',
          at: 'Wipro, Accenture',
          tip: `Profit % = profit / CP × 100. Always on cost price.`,
        },
        {
          q: `What is the simple interest on ₹5,000 at 8% per annum for 3 years?

A. ₹1,000
B. ₹1,200
C. ₹1,250
D. ₹1,300`,
          a: `**B. ₹1,200**

**Step by step**
1. Simple interest formula: SI = (P × R × T) / 100.
2. P = ₹5,000, R = 8%, T = 3 years.
3. SI = (5000 × 8 × 3) / 100 = 120000 / 100 = **₹1,200**.
4. The amount after 3 years = 5000 + 1200 = ₹6,200.

**Why it is "simple"**
Interest is earned only on the original principal, so it is the same every year: 8% of 5000 = ₹400 per year, × 3 years = ₹1,200.

**Shortcut**
Total SI % over the period = R × T = 24%, and 24% of 5000 = ₹1,200.`,
          d: 'easy',
          at: 'TCS NQT, Infosys',
          tip: `SI = PRT/100. Interest is the same every year.`,
        },
        {
          q: `The marked price of a shirt is ₹1,200. The shop gives a discount of 15%. What does the customer pay?

A. ₹1,000
B. ₹1,020
C. ₹1,080
D. ₹1,050`,
          a: `**B. ₹1,020**

**Step by step**
1. Discount is always calculated on the **marked price** (MP).
2. Discount = 15% of 1200 = 0.15 × 1200 = ₹180.
3. Selling price = 1200 − 180 = **₹1,020**.

**Shortcut**
SP = MP × (100 − discount%) / 100 = 1200 × 85/100 = ₹1,020.

**Quick mental maths:** 10% of 1200 is 120 and 5% is 60, so 15% is 180.

**Successive discounts**
Two discounts of a% and b% are not the same as (a + b)%. For example, 10% then 5% equals a single discount of 10 + 5 − (10 × 5)/100 = 14.5%.`,
          d: 'easy',
          at: 'Cognizant, Wipro',
          tip: `SP = MP × (100 − d)/100. Discount is on the marked price.`,
        },
        {
          q: `Find the compound interest on ₹10,000 at 10% per annum for 2 years, compounded annually.

A. ₹2,000
B. ₹2,100
C. ₹2,200
D. ₹2,050`,
          a: `**B. ₹2,100**

**Step by step**
1. Amount A = P × (1 + R/100)^T = 10000 × (1.1)² = 10000 × 1.21 = ₹12,100.
2. CI = A − P = 12100 − 10000 = **₹2,100**.

**Year-by-year view**
- Year 1 interest: 10% of 10000 = ₹1,000 → balance ₹11,000.
- Year 2 interest: 10% of 11000 = ₹1,100 → balance ₹12,100.
- Total CI = 1000 + 1100 = ₹2,100.

Simple interest would be only ₹2,000; the extra ₹100 is interest earned on the first year's interest.

**Shortcut**
Effective rate for 2 years at r% = 2r + r²/100 = 20 + 1 = 21%, and 21% of 10000 = ₹2,100.`,
          d: 'medium',
          at: 'TCS NQT, Accenture',
          tip: `2-year CI rate = 2r + r²/100 %. At 10% that is 21%.`,
        },
        {
          q: `The difference between compound interest and simple interest on a sum for 2 years at 10% per annum is ₹50. Find the sum.

A. ₹4,000
B. ₹5,000
C. ₹5,500
D. ₹6,000`,
          a: `**B. ₹5,000**

**Step by step**
1. For 2 years, CI − SI = P × (R/100)².
2. 50 = P × (10/100)² = P × 0.01.
3. P = 50 / 0.01 = **₹5,000**.

**Verify**
- SI for 2 years = 5000 × 10 × 2 / 100 = ₹1,000.
- CI = 5000 × 1.21 − 5000 = ₹1,050.
- Difference = ₹50 ✔

**Why the formula works**
The only difference in 2 years is the interest earned in year 2 on year 1's interest: (P × R/100) × R/100.

**For 3 years:** CI − SI = P × (R/100)² × (3 + R/100).`,
          d: 'medium',
          at: 'Infosys, Cognizant',
          tip: `2 years: CI − SI = P(R/100)². 3 years: P(R/100)²(3 + R/100).`,
        },
        {
          q: `A shopkeeper marks his goods 40% above the cost price and then allows a discount of 20%. What is his profit percentage?

A. 20%
B. 12%
C. 15%
D. 10%`,
          a: `**B. 12%**

**Step by step**
1. Let CP = ₹100.
2. Marked price = 100 + 40% = ₹140.
3. Discount of 20% on MP: 20% of 140 = ₹28.
4. Selling price = 140 − 28 = ₹112.
5. Profit = 112 − 100 = ₹12 → **12%**.

The trap is option A (40 − 20 = 20). The discount is taken on the larger marked price, so it eats more than 20 rupees.

**Shortcut**
Net effect = m − d − (m × d)/100 = 40 − 20 − (40 × 20)/100 = 20 − 8 = 12%.
Or simply multiply factors: 1.4 × 0.8 = 1.12 → 12% profit.`,
          d: 'medium',
          at: 'Wipro, TCS NQT',
          tip: `Markup m% then discount d%: profit = m − d − md/100 %. Or multiply 1.4 × 0.8.`,
        },
        {
          q: `A dishonest shopkeeper claims to sell rice at a loss of 10%, but he uses a weight of 800 g in place of 1 kg. What is his actual gain or loss percentage?

A. 10% loss
B. 12.5% gain
C. 8% gain
D. 11.11% gain`,
          a: `**B. 12.5% gain**

**Step by step**
1. Let the cost price of 1 kg be ₹100, so 1 g costs ₹0.10.
2. He "sells 1 kg" at a 10% loss, so he charges ₹90.
3. But he actually hands over only 800 g, which cost him 800 × 0.10 = ₹80.
4. He receives ₹90 for goods worth ₹80.
5. Gain = 90 − 80 = ₹10 on a cost of ₹80 → 10/80 × 100 = **12.5% gain**.

**Shortcut**
Gain % = (SP factor × true weight / false weight − 1) × 100
= (0.9 × 1000 / 800 − 1) × 100 = (1.125 − 1) × 100 = 12.5%.

**Simpler case:** if he sold at cost price with the 800 g weight, the gain would be 200/800 = 25%.`,
          d: 'hard',
          at: 'TCS NQT, Infosys',
          tip: `False weight: gain % = (SP/CP × true wt / false wt − 1) × 100.`,
        },
        {
          q: `A starts a business with ₹20,000. After 6 months, B joins with ₹30,000. At the end of the year the profit is ₹28,000. What is B's share?

A. ₹14,000
B. ₹16,000
C. ₹12,000
D. ₹16,800`,
          a: `**C. ₹12,000**

**Step by step**
1. In a partnership, profit is shared in the ratio of capital × time.
2. A: ₹20,000 for 12 months → 20000 × 12 = 2,40,000.
3. B: ₹30,000 for 6 months (joins after 6 months) → 30000 × 6 = 1,80,000.
4. Ratio A : B = 240000 : 180000 = **4 : 3**.
5. B's share = 3/7 × 28000 = **₹12,000**. (A gets ₹16,000.)

**Check:** 16000 + 12000 = 28000 ✔

Option D is the trap of sharing only by capital (2 : 3 gives B ₹16,800), forgetting that B's money was in the business for only half the year.

**Shortcut:** cancel common factors first: 20 × 12 : 30 × 6 = 240 : 180 = 4 : 3.`,
          d: 'hard',
          at: 'Accenture, Cognizant',
          tip: `Partnership: profit ratio = capital × months for each partner.`,
        },
      ],
    },
    {
      title: 'Logical reasoning',
      questions: [
        {
          q: `Find the next number in the series: 2, 6, 12, 20, 30, ?

A. 40
B. 42
C. 44
D. 36`,
          a: `**B. 42**

**Step by step**
1. Look at the differences between consecutive terms:
   6 − 2 = 4, 12 − 6 = 6, 20 − 12 = 8, 30 − 20 = 10.
2. The differences increase by 2 each time (4, 6, 8, 10), so the next difference is 12.
3. Next term = 30 + 12 = **42**.

**Another view (pattern of products)**
- 2 = 1 × 2
- 6 = 2 × 3
- 12 = 3 × 4
- 20 = 4 × 5
- 30 = 5 × 6
- next = 6 × 7 = 42 ✔

**Shortcut:** when differences form an arithmetic progression, the series is quadratic. Often it is n(n + 1), n², or n² ± a constant.`,
          d: 'easy',
          at: 'TCS NQT, Wipro',
          tip: `First check differences; then check n², n³, n(n+1) patterns.`,
        },
        {
          q: `In a certain code language, CAT is written as DBU. How is DOG written in that code?

A. EPH
B. CNF
C. EPF
D. FQI`,
          a: `**A. EPH**

**Step by step**
1. Compare CAT with DBU letter by letter:
   - C → D (+1)
   - A → B (+1)
   - T → U (+1)
2. Every letter moves one step forward in the alphabet.
3. Apply the same rule to DOG:
   - D → E
   - O → P
   - G → H
4. DOG is coded as **EPH**.

**Tip for coding questions**
Memorise letter positions (A = 1 … Z = 26). The word **EJOTY** helps: E = 5, J = 10, O = 15, T = 20, Y = 25. Check for +n, −n, reverse order (A ↔ Z, position 27 − n), or alternating shifts.`,
          d: 'easy',
          at: 'Cognizant, Infosys',
          tip: `EJOTY = 5, 10, 15, 20, 25. Opposite letter = 27 − position.`,
        },
        {
          q: `Pointing to a man, Riya says, "He is the son of my grandfather's only son." How is the man related to Riya?

A. Cousin
B. Uncle
C. Brother
D. Father`,
          a: `**C. Brother**

**Step by step**
1. "My grandfather's only son": Riya's grandfather has only one son. That son must be Riya's **father** (otherwise Riya could not be the grandfather's grandchild through a son).
2. "Son of my father" means the man is Riya's father's son.
3. A father's son, other than oneself, is one's **brother**. Since Riya is speaking about another person, the man is her brother.

**Why not cousin?**
A cousin would be the child of an uncle or aunt. The word "only son" rules out a paternal uncle.

**Shortcut**
Solve from the end of the sentence inward ("my grandfather's only son" = father) and draw a small family tree: + for male, − for female, vertical lines for generations.`,
          d: 'easy',
          at: 'Wipro, Accenture',
          tip: `Decode from the innermost phrase outward and sketch a family tree.`,
        },
        {
          q: `Ravi walks 10 km towards North. He turns right and walks 6 km. He then turns right again and walks 18 km. How far is he from his starting point, and in which direction?

A. 10 km, South-East
B. 8 km, South
C. 14 km, South-East
D. 10 km, North-East`,
          a: `**A. 10 km, South-East**

**Step by step**
1. Start at the origin (0, 0), facing North.
2. Walk 10 km North → (0, 10).
3. Turn right while facing North → now facing **East**. Walk 6 km → (6, 10).
4. Turn right while facing East → now facing **South**. Walk 18 km → (6, 10 − 18) = (6, −8).
5. Final position: 6 km East and 8 km South of the start.
6. Straight-line distance = √(6² + 8²) = √(36 + 64) = √100 = **10 km**.
7. East and South together → **South-East**.

**Shortcut**
Track net North–South and net East–West separately, then use Pythagoras. Remember the 3-4-5 triangle family (6-8-10, 9-12-15, 5-12-13) to skip square roots.`,
          d: 'medium',
          at: 'TCS NQT, Cognizant',
          tip: `Net N–S and net E–W, then √(x² + y²). Right turn from North = East.`,
        },
        {
          q: `Find the next number: 3, 5, 9, 17, 33, ?

A. 49
B. 63
C. 65
D. 66`,
          a: `**C. 65**

**Step by step**
1. Differences: 5 − 3 = 2, 9 − 5 = 4, 17 − 9 = 8, 33 − 17 = 16.
2. The differences double every time: 2, 4, 8, 16 → next is 32.
3. Next term = 33 + 32 = **65**.

**Another view**
Each term = previous × 2 − 1:
- 3 × 2 − 1 = 5
- 5 × 2 − 1 = 9
- 9 × 2 − 1 = 17
- 17 × 2 − 1 = 33
- 33 × 2 − 1 = 65 ✔

Also, each term is 2^n + 1: 2 + 1, 4 + 1, 8 + 1, 16 + 1, 32 + 1, 64 + 1.

**Shortcut:** if the differences grow very fast, test a multiply-and-add rule (×2 ± k, ×3 ± k) before anything else.`,
          d: 'medium',
          at: 'Infosys, Wipro',
          tip: `Fast-growing series: try "× 2 ± k" or powers of 2 ± k.`,
        },
        {
          q: `Statements:
1. All pens are books.
2. Some books are tables.

Conclusions:
I. Some pens are tables.
II. Some tables are books.

A. Only I follows
B. Only II follows
C. Both I and II follow
D. Neither follows`,
          a: `**B. Only II follows**

**Step by step**
1. **Conclusion II:** "Some books are tables" is given. "Some" statements can be reversed, so "Some tables are books" is definitely true. **II follows.**
2. **Conclusion I:** The pens circle lies fully inside the books circle. The tables circle overlaps books, but it can overlap the part of books that has no pens. Nothing forces any pen to be a table. **I does not follow.**

**Venn diagram check**
Draw a big "books" circle with a small "pens" circle inside it. Draw "tables" overlapping only the outer part of "books". Both statements are satisfied, yet no pen is a table, so I is not certain.

**Rules to remember**
- All A are B → Some B are A (valid); All B are A (invalid).
- Some A are B ↔ Some B are A (valid).
- All + Some (in that order) gives no definite conclusion between the end terms.`,
          d: 'medium',
          at: 'Accenture, Cognizant',
          tip: `"Some" reverses freely. "All" reverses only to "some". All + Some → no definite conclusion.`,
        },
        {
          q: `Five friends A, B, C, D and E sit in a row facing North.
- C sits exactly in the middle.
- A sits to the immediate right of C.
- B sits at one of the ends.
- E is not an immediate neighbour of C.

Who sits to the immediate left of C?

A. A
B. B
C. D
D. E`,
          a: `**C. D**

**Step by step**
1. Number the seats 1 to 5 from left to right. Facing North, "right" means a higher seat number.
2. C is in the middle → C = seat 3.
3. A is immediately right of C → A = seat 4.
4. E is not next to C, so E cannot be in seat 2 or seat 4. E must be in seat 1 or seat 5.
5. B is at an end, so B is also in seat 1 or seat 5.
6. B and E therefore take seats 1 and 5 (in some order), leaving seat 2 for **D**.
7. Seat 2 is the immediate left of C → **D**.

Whichever way B and E are arranged at the ends, D is always in seat 2, so the answer is certain.

**Shortcut**
Place the fixed clues first (middle, immediate neighbours), then use the "not" clues to eliminate seats. Note directions: facing North, your right is East; facing South, left and right flip.`,
          d: 'hard',
          at: 'TCS NQT, Infosys',
          tip: `Fix definite positions first, then use negative clues to eliminate.`,
        },
        {
          q: `What day of the week was 15 August 1947?

A. Thursday
B. Friday
C. Saturday
D. Sunday`,
          a: `**B. Friday**

**Step by step (odd days method)**
Count the odd days (days left over after full weeks) up to 15 August 1947. Sunday = 0, Monday = 1, … Saturday = 6.

1. **First 1600 years:** 0 odd days.
2. **1601–1900 (300 years):** 100 years give 5 odd days, so 300 years give 15 → 15 mod 7 = **1**.
3. **1901–1946 (46 years):** 11 leap years (1904 to 1944) and 35 ordinary years → 11 × 2 + 35 × 1 = 57 → 57 mod 7 = **1**.
4. **1 Jan to 15 Aug 1947:** Jan 31 (3), Feb 28 (0), Mar 31 (3), Apr 30 (2), May 31 (3), Jun 30 (2), Jul 31 (3), Aug 15 (1) → 17 → 17 mod 7 = **3**.
5. **Total:** 0 + 1 + 1 + 3 = 5 → day 5 = **Friday**.

**Remember**
100 years = 5 odd days, 200 = 3, 300 = 1, 400 = 0. Ordinary year = 1 odd day, leap year = 2.`,
          d: 'hard',
          at: 'Cognizant, Wipro',
          tip: `100 yrs = 5 odd days, 200 = 3, 300 = 1, 400 = 0. Ordinary year 1, leap year 2.`,
        },
      ],
    },
    {
      title: 'Verbal ability and data interpretation',
      questions: [
        {
          q: `Choose the word most similar in meaning to **ABUNDANT**.

A. Scarce
B. Plentiful
C. Rare
D. Meagre`,
          a: `**B. Plentiful**

**Explanation**
"Abundant" means existing in large quantities, more than enough. Example: *India has abundant sunlight, which makes solar power attractive.*

**Checking each option**
- **Scarce**: in short supply, the opposite of abundant.
- **Plentiful**: available in large amounts, the same meaning. ✔
- **Rare**: not found often, close to the opposite.
- **Meagre**: very small in amount, the opposite.

**Strategy for synonym questions**
1. Make a quick sentence with the given word.
2. Replace it with each option and see which keeps the meaning.
3. Eliminate antonyms first; the setters usually include two or three.

Related words worth knowing: ample, copious, profuse (synonyms); sparse, insufficient (antonyms).`,
          d: 'easy',
          at: 'Accenture, Cognizant',
          tip: `Put the word in a sentence, swap in each option, and eliminate the antonyms first.`,
        },
        {
          q: `Choose the word opposite in meaning to **TRANSPARENT**.

A. Clear
B. Opaque
C. Visible
D. Lucid`,
          a: `**B. Opaque**

**Explanation**
"Transparent" means allowing light to pass through so that objects behind can be seen clearly (like glass). Figuratively it also means open and honest, as in *a transparent hiring process*.

"Opaque" means not allowing light to pass through, impossible to see through (like a wooden door). Figuratively it means hard to understand or not open.

**Checking each option**
- **Clear**: a synonym.
- **Opaque**: the antonym. ✔
- **Visible**: related to being seen, not an opposite.
- **Lucid**: clear and easy to understand, a synonym.

**Tip**
Watch for words that sit in between: "translucent" lets some light through but you cannot see clearly. It is neither the synonym nor the true antonym.`,
          d: 'easy',
          at: 'Wipro, TCS NQT',
          tip: `Transparent ↔ opaque; translucent sits in between.`,
        },
        {
          q: `Identify the part of the sentence that contains an error:

"Each of the students (A) / have submitted (B) / the assignment (C) / on time. (D)"`,
          a: `**B. "have submitted" — it should be "has submitted"**

**Explanation**
1. The subject of the sentence is **"Each"**, not "students".
2. "Each", "every", "either", "neither", "everyone" and "anyone" are singular and take a **singular verb**.
3. "of the students" is only a phrase describing "each"; it does not change the number of the subject.
4. Correct sentence: *Each of the students **has submitted** the assignment on time.*

**Common traps in subject–verb agreement**
- "One of the boys **is** absent." (subject: one)
- "Neither of them **was** ready." (subject: neither)
- "The team **is** playing well." (collective noun as one unit)
- "Either Ram or his friends **are** coming." (with either/or, the verb agrees with the nearer subject)

**Shortcut:** cover the "of …" phrase with your finger and read the sentence again: "Each have submitted" sounds wrong immediately.`,
          d: 'easy',
          at: 'Infosys, Accenture',
          tip: `Each/every/either/neither + of + plural noun still takes a singular verb.`,
        },
        {
          q: `Fill in the blank with the correct preposition:

"She has been working in this company ___ 2019."

A. for
B. since
C. from
D. by`,
          a: `**B. since**

**Explanation**
- **Since** is used with a **point in time** (a date, year, day or event): since 2019, since Monday, since morning.
- **For** is used with a **period of time** (a duration): for five years, for three months, for two hours.

"2019" is a point in time, so the answer is **since**.

**Why not "from"?**
"From" usually needs an end point or a different tense: *She worked here from 2019 to 2022.* With the present perfect continuous ("has been working"), which describes an action that started in the past and is still going on, the natural choice is "since".

**Quick test**
If you can ask "how long?" and answer with a duration, use **for**. If you answer with a starting point, use **since**.
- She has worked here **for** five years.
- She has worked here **since** 2019.`,
          d: 'easy',
          at: 'Cognizant, Wipro',
          tip: `Since + point in time (2019). For + duration (five years).`,
        },
        {
          q: `Annual sales of a company (in ₹ lakh) are:
- 2019: 120
- 2020: 150
- 2021: 135
- 2022: 180
- 2023: 216

What is the percentage increase in sales from 2022 to 2023, and what are the average annual sales over the five years?

A. 20% and ₹160.2 lakh
B. 36% and ₹160.2 lakh
C. 20% and ₹150 lakh
D. 18% and ₹162 lakh`,
          a: `**A. 20% and ₹160.2 lakh**

**Step by step**

**Percentage increase 2022 → 2023**
1. Increase = 216 − 180 = 36.
2. Base is the earlier year (2022): 36 / 180 × 100 = **20%**.

**Average sales**
1. Total = 120 + 150 + 135 + 180 + 216 = 801.
2. Average = 801 / 5 = **₹160.2 lakh**.

**Watch the base**
Percentage change always uses the older value as the base. Using 216 as the base would give 16.67%, which is wrong.

**Extra checks the test may ask**
- The only year with a fall: 2021 (150 → 135, a 10% drop).
- Highest growth: 2022 (45/135 = 33.3%), ahead of 2020 (30/120 = 25%).

**Shortcut:** 36/180 = 1/5 = 20%. Know the common fractions: 1/8 = 12.5%, 1/6 = 16.67%, 1/3 = 33.33%.`,
          d: 'medium',
          at: 'TCS NQT, Infosys',
          tip: `% change = (new − old) / old × 100. Learn fraction-percent pairs (1/6 = 16.67%).`,
        },
        {
          q: `A family's monthly budget of ₹40,000 is split as shown in a pie chart:
- Rent: 30%
- Food: 25%
- Transport: 10%
- Savings: 20%
- Others: 15%

How much more is spent on rent than on transport, and what is the central angle of the Food sector?

A. ₹8,000 and 90°
B. ₹6,000 and 90°
C. ₹8,000 and 75°
D. ₹12,000 and 100°`,
          a: `**A. ₹8,000 and 90°**

**Step by step**

**Rent vs transport**
1. Rent = 30% of 40000 = ₹12,000.
2. Transport = 10% of 40000 = ₹4,000.
3. Difference = 12000 − 4000 = **₹8,000**.
   (Faster: the difference in percentage is 20%, and 20% of 40000 = ₹8,000.)

**Central angle of Food**
1. A full circle is 360°, which represents 100%.
2. Each 1% = 3.6°.
3. Food = 25% → 25 × 3.6 = **90°**.

**Check:** all sectors add to 100% (30 + 25 + 10 + 20 + 15) and to 360° (108 + 90 + 36 + 72 + 54).

**Shortcut**
Subtract percentages before converting to money, and remember 1% = 3.6° in any pie chart.`,
          d: 'medium',
          at: 'Accenture, Cognizant',
          tip: `Pie charts: 1% = 3.6°. Subtract percentages first, convert to money once.`,
        },
        {
          q: `Arrange the sentences to form a meaningful paragraph:

P. However, the habit of reading has declined among young people.
Q. Books have long been considered a great source of knowledge.
R. Experts blame the rise of short-form videos on social media.
S. As a result, attention spans are shrinking.

A. QPRS
B. PQRS
C. QRPS
D. RQPS`,
          a: `**A. QPRS**

**Step by step**
1. **Find the opening sentence.** It should introduce the topic without referring back to anything. Q ("Books have long been considered…") is a general statement, so it opens. P starts with "However" and S with "As a result", so neither can open.
2. **What contrasts with Q?** P: "However, the habit of reading has declined…" sets up the problem. → Q P
3. **Why has it declined?** R gives the cause: "Experts blame the rise of short-form videos…" → Q P R
4. **What is the consequence?** S: "As a result, attention spans are shrinking." → Q P R S

**Strategy for para jumbles**
- Opening sentence: introduces a subject, has no pronoun pointing back (he, it, this) and no linking word (however, therefore).
- Look for pairs joined by connectors: however (contrast), as a result (effect), for example (illustration).
- Fix one strong pair, then check the options; usually only one option contains it.`,
          d: 'medium',
          at: 'Wipro, TCS NQT',
          tip: `Opener has no connector or back-pointing pronoun. Lock one strong pair, then check options.`,
        },
        {
          q: `In a class of 60 students, 40% are girls. 75% of the girls and 50% of the boys passed an exam. What percentage of the whole class passed?

A. 55%
B. 60%
C. 62.5%
D. 65%`,
          a: `**B. 60%**

**Step by step**
1. Girls = 40% of 60 = 24. Boys = 60 − 24 = 36.
2. Girls who passed = 75% of 24 = 18.
3. Boys who passed = 50% of 36 = 18.
4. Total passed = 18 + 18 = 36.
5. Pass percentage = 36 / 60 × 100 = **60%**.

**Why not 62.5%?**
62.5% is the simple average of 75% and 50%. That would be right only if there were equal numbers of girls and boys. Here there are more boys, so the overall rate is pulled towards the boys' 50%.

**Shortcut (weighted average)**
Overall % = (share of girls × girls' %) + (share of boys × boys' %)
= 0.4 × 75 + 0.6 × 50 = 30 + 30 = 60%.

This works even when the class size is not given.`,
          d: 'medium',
          at: 'Infosys, Cognizant',
          tip: `Overall % is a weighted average: Σ (group share × group %), not a simple average.`,
        },
      ],
    },
  ],
};

export default book;
