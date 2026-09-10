# -*- coding: utf-8 -*-
"""
Wave 5 — MATRICES, 50 Golden Bank questions, all newly authored.

EVERY MATRIX IS WRITTEN OUT AS ROWS IN THE STEM. This bank carries no images, so a matrix appears
as "the rows [1 2 3] and [4 5 6]" and nothing depends on a drawn layout. That constraint is not a
loss here: reading a shape off a written row is the same skill as reading it off a drawn one, and
it rules out items that measure whether a student can parse a picture.

NO STEM IN THE SHAPE FAMILY USES A SQUARE MATRIX. A 3 by 3 cannot distinguish the right answer
from the reversed one, so a family built on square examples reports every student as competent at
the one thing it exists to measure.

THE TWO INDEX CONVENTIONS ARE TREATED AS A REAL CLASH RATHER THAN A SLIP. Graphics libraries
address a grid across-then-down and matrix libraries address it down-then-across, and students
meet both in the same year. Every stem states which convention is in force, and one item is built
entirely on translating between them.

THE ARITHMETIC IS TWO-BY-TWO AND SINGLE-DIGIT THROUGHOUT. What is being measured in the product
families is the pairing rule — a whole row against a whole column — and the most attractive wrong
answer is always the entrywise product, which is an operation that exists and is not this one.

THE LAST FAMILY USES NEITHER THE WORD MATRIX NOR TRANSPOSE NOR DIMENSION. Seeing that a seating
plan and a timetable have this structure is the measurement; naming it would give it away.
"""

Q = []


def q(qid, family, difficulty, prompt, correct, distractors, explanation,
      provenance='AUTHORED', source='', evidence=None, mode=None, hinge=None):
    assert len(distractors) == 3, qid
    it = {'id': qid, 'family': family, 'difficulty': difficulty, 'prompt': prompt,
          'correct': correct, 'distractors': list(distractors), 'explanation': explanation,
          'provenance': provenance, 'source': source}
    if evidence:
        it['evidence'] = evidence
    if mode:
        it['mode'] = mode
    if hinge:
        it['hinge'] = hinge
    Q.append(it)


# =========================================================================
# MX_FAM01_DIMENSION_READING — D1 x4, D2 x1
# =========================================================================
q('GB_MX_001', 'MX_FAM01_DIMENSION_READING', 'D1',
  'A matrix has the rows [1 2 3] and [4 5 6]. What are its dimensions?',
  '2 by 3',
  ['3 by 2', '6 by 1', '2 by 2'],
  'There are two rows and three entries in each, so it is 2 by 3. Quoting the two counts the '
  'other way round describes a different shape entirely.')

q('GB_MX_002', 'MX_FAM01_DIMENSION_READING', 'D1',
  'A table of results has 3 rows and 5 columns. Written as dimensions in the usual order, what '
  'is it?',
  '3 by 5',
  ['5 by 3', '15 by 1', '3 by 3'],
  'Rows are quoted first, so 3 rows and 5 columns is 3 by 5. The total of fifteen entries is a '
  'consequence of the shape rather than the shape itself.')

q('GB_MX_003', 'MX_FAM01_DIMENSION_READING', 'D1',
  'When dimensions are quoted, which count is given first?',
  'The number of rows',
  ['The number of columns', 'The larger of the two counts', 'The total number of entries'],
  'Rows come first by convention, always. Quoting the larger first would make the notation '
  'depend on the values, which would leave it unable to describe a shape at all.')

q('GB_MX_004', 'MX_FAM01_DIMENSION_READING', 'D1',
  'A matrix has 4 rows and 2 columns. How many entries does it hold altogether?',
  '8',
  ['6', '4', '2'],
  'Every row has an entry in every column, so the total is four times two, which is 8. Adding '
  'the two counts gives 6 and describes nothing.')

q('GB_MX_005', 'MX_FAM01_DIMENSION_READING', 'D2',
  'A student describes the matrix with rows [1 2 3 4] and [5 6 7 8] as 4 by 2. What has gone '
  'wrong?',
  'The two counts have been given in the wrong order; the matrix is 2 by 4',
  ['Nothing; 4 by 2 is the right description',
   'The total number of entries should have been quoted instead',
   'A matrix that is not square has no dimensions to quote'],
  'There are two rows of four entries each, so the description is exactly reversed. Both numbers '
  'are right and neither is in the right place.')

# =========================================================================
# MX_FAM02_ENTRY_INDEXING — D1 x3, D2 x1
# =========================================================================
q('GB_MX_006', 'MX_FAM02_ENTRY_INDEXING', 'D1',
  'A matrix has the rows [1 2 3], [4 5 6] and [7 8 9], with rows and columns counted from 1. '
  'What is the entry at row 2, column 3?',
  '6',
  ['8', '5', '2'],
  'The second row is [4 5 6] and its third entry is 6. Taking row 3, column 2 instead would give '
  '8, which is the position with the two counts exchanged.')

q('GB_MX_007', 'MX_FAM02_ENTRY_INDEXING', 'D1',
  'An entry is described as being at row 1, column 2. Which of these describes the same '
  'position?',
  'The second entry along the top row',
  ['The first entry of the second row',
   'The second entry of the second column',
   'The entry where the two counts happen to be equal'],
  'Row 1 places it on the top row and column 2 places it second along. Reading the counts the '
  'other way round lands on a different entry unless the matrix happens to be symmetric.')

q('GB_MX_008', 'MX_FAM02_ENTRY_INDEXING', 'D1',
  'When an entry is located by two counts, which is applied first?',
  'The row',
  ['The column', 'Whichever of the two is smaller', 'Either, since it makes no difference'],
  'The row is always taken first. It matters because the two counts generally point at different '
  'entries, so the order is what makes the address mean anything.')

q('GB_MX_009', 'MX_FAM02_ENTRY_INDEXING', 'D2',
  'A matrix has the rows [2 9] and [4 7], with counting starting at 1 on both sides. A developer '
  'asks for row 1, column 2 and the system returns 4. What has happened?',
  'The two counts are being exchanged, so row 2, column 1 was returned',
  ['The counting is starting at 0 rather than 1',
   'The matrix has been stored with its rows in the wrong order',
   'Nothing; the entry at row 1, column 2 really is 4'],
  'Row 1, column 2 holds 9, and 4 sits at row 2, column 1. Counting from 0 would have returned 7 '
  'instead, so that explanation does not fit what was seen.')

# =========================================================================
# MX_FAM03_SPECIAL_RECOGNITION — D1 x3, D2 x1
# =========================================================================
q('GB_MX_010', 'MX_FAM03_SPECIAL_RECOGNITION', 'D1',
  'A matrix has the rows [1 0] and [0 1]. What is it called?',
  'An identity matrix',
  ['A zero matrix', 'A matrix of all ones', 'A square of no particular name'],
  'An identity matrix is exactly this: ones down the diagonal and zeros everywhere else. A grid '
  'of nothing but zeros would have no ones in it at all.')

q('GB_MX_011', 'MX_FAM03_SPECIAL_RECOGNITION', 'D1',
  'A matrix has the rows [1 1] and [1 1]. Is it an identity matrix?',
  'No; an identity has ones on the diagonal and zeros elsewhere',
  ['Yes, because every one of its entries is 1',
   'Yes, because it is square and contains only ones',
   'No, because it is not square'],
  'Being full of ones is not the same as being an identity, which needs zeros off the diagonal. '
  'The matrix is square, so that is not what disqualifies it.')

q('GB_MX_012', 'MX_FAM03_SPECIAL_RECOGNITION', 'D1',
  'What makes a matrix square?',
  'Having as many rows as columns',
  ['Having every entry the same', 'Having an even number of entries',
   'Having ones along its diagonal'],
  'Squareness is purely about the two counts matching. What the entries happen to be has nothing '
  'to do with it.')

q('GB_MX_013', 'MX_FAM03_SPECIAL_RECOGNITION', 'D2',
  'A matrix has the rows [5 0] and [0 3]. A student calls it an identity because everything off '
  'the diagonal is zero. What is wrong?',
  'An identity needs ones on the diagonal, and these are 5 and 3; this is a diagonal matrix',
  ['Nothing; zeros off the diagonal are what make an identity',
   'It is a zero matrix rather than an identity',
   'It is not square, so neither name applies to it'],
  'Half the definition has been met and half has not. The name for a matrix with zeros off the '
  'diagonal and anything on it is diagonal, and identity is the special case where those '
  'entries are all 1.')

# =========================================================================
# MX_FAM04_ADDITION — D2 x1, D3 x1
# =========================================================================
q('GB_MX_014', 'MX_FAM04_ADDITION', 'D2',
  'Add the matrix with rows [1 2] and [3 4] to the matrix with rows [5 6] and [7 8].',
  'Rows [6 8] and [10 12]',
  ['Rows [6 8] and [10 11]', 'Rows [4 4] and [4 4]', 'Rows [6 10] and [8 12]'],
  'Entries in matching positions are added, giving [6 8] on top and [10 12] below. Pairing '
  'entries across the two rows instead produces the last option.')

q('GB_MX_015', 'MX_FAM04_ADDITION', 'D3',
  'A matrix with rows [3 1 4] and [1 5 9] is to be added to a matrix with rows [2 6] and [5 3]. '
  'What is the result?',
  'Undefined, because the two do not have the same dimensions',
  ['Rows [5 7 4] and [6 8 9]', 'Rows [5 7] and [6 8]', 'Rows [2 6] and [5 3]'],
  'Addition needs an entry in the second matrix for every entry in the first, and a 2 by 3 has '
  'positions a 2 by 2 does not. Padding or truncating to force an answer invents data.')

# =========================================================================
# MX_FAM05_SCALAR_MULTIPLY — D2 x1, D3 x1
# =========================================================================
q('GB_MX_016', 'MX_FAM05_SCALAR_MULTIPLY', 'D2',
  'Multiply the matrix with rows [1 2] and [3 4] by the number 3.',
  'Rows [3 6] and [9 12]',
  ['Rows [3 2] and [3 4]', 'Rows [4 5] and [6 7]', 'Rows [3 6] and [3 12]'],
  'Every entry is multiplied, so the result is rows [3 6] and [9 12]. Multiplying only the first '
  'column, or adding 3 to each entry, are the two ways this usually goes wrong.')

q('GB_MX_017', 'MX_FAM05_SCALAR_MULTIPLY', 'D3',
  'A matrix with rows [2 0] and [1 5] is multiplied by the number 0. What is the result?',
  'Rows [0 0] and [0 0], with the shape unchanged',
  ['The single value 0', 'Rows [2 0] and [1 5]', 'Undefined'],
  'Each entry becomes zero and the shape is untouched, so a 2 by 2 stays a 2 by 2. Collapsing to '
  'a single value would lose the shape, which this operation never does.')

# =========================================================================
# MX_FAM06_TRANSPOSE — D2 x1, D3 x1, D4 x1
# =========================================================================
q('GB_MX_018', 'MX_FAM06_TRANSPOSE', 'D2',
  'What is the transpose of the matrix with rows [2 7 1] and [9 4 6]?',
  'Rows [2 9], [7 4] and [1 6]',
  ['Rows [1 7 2] and [6 4 9]', 'Rows [9 4 6] and [2 7 1]', 'Rows [2 7 1] and [9 4 6]'],
  'Each row becomes a column, so the result has three rows of two entries: [2 9], [7 4] and '
  '[1 6]. Reversing the entries inside each row leaves the shape alone and is a different '
  'operation altogether.')

q('GB_MX_019', 'MX_FAM06_TRANSPOSE', 'D3',
  'A matrix is 5 by 2. What are the dimensions of its transpose?',
  '2 by 5',
  ['5 by 2', '5 by 5', '2 by 2'],
  'The two counts exchange, so 5 by 2 becomes 2 by 5. The shape is unchanged only when the '
  'matrix was square to begin with.')

q('GB_MX_020', 'MX_FAM06_TRANSPOSE', 'D4',
  'A student transposes the matrix with rows [1 2] and [3 4] and writes rows [2 1] and [4 3]. '
  'Transposing turns each row into a column, whereas the answer written keeps both rows and '
  'merely reverses the order within each. What is the transpose?',
  'Rows [1 3] and [2 4]',
  ['Rows [2 1] and [4 3]', 'Rows [3 4] and [1 2]', 'Rows [4 3] and [2 1]'],
  'The first row [1 2] becomes the first column, giving rows [1 3] and [2 4]. A square matrix '
  'hides the shape change, which is why the wrong operation survives here undetected.',
  evidence='Transposing turns each row into a column')

# =========================================================================
# MX_FAM07_PRODUCT_SHAPE — D2 x1, D3 x1, D4 x1
# =========================================================================
q('GB_MX_021', 'MX_FAM07_PRODUCT_SHAPE', 'D2',
  'A 2 by 3 matrix multiplies a 3 by 4 matrix. What are the dimensions of the product?',
  '2 by 4',
  ['3 by 3', '2 by 3', '4 by 2'],
  'The inner counts, both 3, agree so the product exists, and the outer counts give the result, '
  'which is 2 by 4. The inner counts never appear in the answer.')

q('GB_MX_022', 'MX_FAM07_PRODUCT_SHAPE', 'D3',
  'A 3 by 2 matrix is to multiply another 3 by 2 matrix, in that order. Is the product defined?',
  'No, because the inner counts of 2 and 3 do not agree',
  ['Yes, and the product is 3 by 2', 'Yes, and the product is 2 by 3',
   'Yes, and the product is 3 by 3'],
  'The columns of the first must match the rows of the second, and 2 does not match 3. Identical '
  'shapes are neither necessary nor sufficient for a product to exist.')

q('GB_MX_023', 'MX_FAM07_PRODUCT_SHAPE', 'D4',
  'A team holds a 4 by 3 matrix and a 3 by 4 matrix, and finds that one order yields a 4 by 4 '
  'result and the other a 3 by 3 result. The inner counts agree in both orders here, which is '
  'why both products exist and have different shapes. Which order yields the 3 by 3 result?',
  'The 3 by 4 matrix multiplying the 4 by 3 matrix',
  ['The 4 by 3 matrix multiplying the 3 by 4 matrix',
   'Neither; only one of the two products exists',
   'Both, since the two products are equal to each other'],
  'The outer counts of the 3 by 4 and the 4 by 3, taken in that order, are 3 and 3. The same two '
  'matrices in the other order give 4 and 4, which is a different matrix of a different size.',
  evidence='The inner counts agree in both orders here')

# =========================================================================
# MX_FAM08_PRODUCT_ENTRY — D2 x1, D3 x1, D4 x1
# =========================================================================
q('GB_MX_024', 'MX_FAM08_PRODUCT_ENTRY', 'D2',
  'Matrix R has the rows [1 0] and [2 1]. Matrix S has the rows [3 4] and [5 6]. In the product '
  'R times S, what is the entry at row 1, column 1?',
  '3',
  ['4', '8', '1'],
  'The first row of R is [1 0] and the first column of S is [3 5]; combining them gives one '
  'times 3 plus nought times 5, which is 3. Multiplying the entries at that position alone would '
  'have given the same first factor and dropped the rest.')

q('GB_MX_025', 'MX_FAM08_PRODUCT_ENTRY', 'D3',
  'Two matrices are multiplied. The first holds the rows [2 0] and [1 3]; the second holds the '
  'rows [4 1] and [5 2]. Which combination yields the result entry at row 2, column 2, and what '
  'does it come to?',
  'The second row against the second column, giving 7',
  ['The second row against the second row, giving 11',
   'The two entries sitting at that position multiplied together, giving 6',
   'The first row against the second column, giving 2'],
  'A result entry pairs a whole row of one with a whole column of the other, so [1 3] against '
  '[1 2] gives one plus six. Pairing row with row, or taking the entries already at that '
  'position, are the two shortcuts that produce a plausible wrong number.')

q('GB_MX_026', 'MX_FAM08_PRODUCT_ENTRY', 'D4',
  'Matrix P has the rows [1 2] and [3 4], and matrix Q has the rows [5 6] and [7 8]. A student '
  'computes the entry of P times Q at row 1, column 1 as 5, by multiplying the two entries '
  'sitting in that position. An entry of a product is built from a whole row of the first and a '
  'whole column of the second, not from the two entries at that position. What is the correct '
  'value?',
  '19',
  ['5', '6', '11'],
  'The first row [1 2] against the first column [5 7] gives five plus fourteen, which is 19. The '
  'entrywise product is a real operation and simply is not this one.',
  evidence='built from a whole row of the first and a whole column of the second')

# =========================================================================
# MX_FAM09_ORDER_MATTERS — D2 x1, D3 x1, D4 x1
# =========================================================================
q('GB_MX_027', 'MX_FAM09_ORDER_MATTERS', 'D2',
  'For two square matrices A and B of the same size, is A times B always equal to B times A?',
  'No; the two products generally differ',
  ['Yes, exactly as in ordinary arithmetic',
   'Yes, provided the two are the same size',
   'Only when every entry is a whole number'],
  'Order changes the result in general, which is one of the sharpest differences from ordinary '
  'arithmetic. Being the same size makes both products exist and does not make them equal.')

q('GB_MX_028', 'MX_FAM09_ORDER_MATTERS', 'D3',
  'A 2 by 5 matrix and a 5 by 2 matrix are multiplied in both orders. What is true?',
  'Both products exist, and they have different dimensions',
  ['Only one of the two products exists', 'Both exist and are equal to each other',
   'Neither of the two products exists'],
  'Taken one way the outer counts give 2 by 2 and the other way 5 by 5. Two matrices of '
  'different sizes cannot be equal, so the order matters here before any entry is computed.')

q('GB_MX_029', 'MX_FAM09_ORDER_MATTERS', 'D4',
  'A team computes A times B and B times A for two square matrices of the same size and gets '
  'different results. They suspect an arithmetic error, since both products have the same '
  'dimensions. Having the same dimensions makes both products defined and says nothing about '
  'whether they are equal. What should they conclude?',
  'Nothing is wrong; the order genuinely changes the result',
  ['One of the two computations must contain an error',
   'The two matrices cannot have been square after all',
   'The two results should be averaged to get the true product'],
  'Differing results are the expected outcome rather than a symptom. Equal shapes are what makes '
  'the two comparable at all, and comparability is not equality.',
  evidence='Having the same dimensions makes both products defined and says nothing about '
           'whether they are equal')

# =========================================================================
# MX_FAM10_GRID_ADDRESSING — D2 x1, D3 x1, D4 x1
# =========================================================================
q('GB_MX_030', 'MX_FAM10_GRID_ADDRESSING', 'D2',
  'An image is held as a grid addressed row then column, both counted from 1. A pixel is '
  'described as being at row 3, column 7. How far down and how far across does it sit?',
  'Three down and seven across',
  ['Seven down and three across',
   'Three across and seven down, since the across count comes first',
   'It cannot be told without knowing the size of the image'],
  'Rows run down and columns run across, and the row count is quoted first. The size of the '
  'image would only matter if the question were whether the position exists.')

q('GB_MX_031', 'MX_FAM10_GRID_ADDRESSING', 'D3',
  'A graphics library addresses pixels as a pair with the across count first, and a matrix '
  'library addresses the same grid row first, with rows running down. The point written as (2, '
  '5) in the graphics library sits where in matrix terms?',
  'Row 5, column 2',
  ['Row 2, column 5', 'Row 5, column 5', 'Row 2, column 2'],
  'The graphics pair is two across and five down, and the matrix address quotes the down count '
  'first, giving row 5, column 2. The two conventions are both standard, which is exactly why '
  'the translation has to be made deliberately.')

q('GB_MX_032', 'MX_FAM10_GRID_ADDRESSING', 'D4',
  'A board is held as a grid addressed row then column, counted from 1. A program asks for row '
  '2, column 4 of a board with 3 rows and 5 columns and gets an error. Both row 2 and column 4 '
  'lie inside a board of that shape, so neither count is out of range as written. What is the '
  'most likely cause?',
  'The two counts are being exchanged, and row 4 lies outside a board of 3 rows',
  ['The board has been stored with its rows and columns the right way round',
   'The program is counting from 0, which puts column 4 outside the board',
   'The board is empty and has no entries to return'],
  'Exchanging the counts asks for row 4 of a board that has three rows, which is out of range '
  'and produces exactly the error seen. Counting from 0 would place column 4 at the fifth '
  'column, which is still inside.',
  evidence='Both row 2 and column 4 lie inside a board of that shape')

# =========================================================================
# MX_FAM11_UNDEFINED_DIAGNOSIS — D3 x1, D4 x1
# =========================================================================
q('GB_MX_033', 'MX_FAM11_UNDEFINED_DIAGNOSIS', 'D3',
  'An attempt to add a 2 by 3 matrix to a 3 by 2 matrix fails. Which requirement has not been '
  'met?',
  'Addition needs the two matrices to have identical dimensions',
  ['Addition needs the inner counts to agree',
   'Addition needs both matrices to be square',
   'Addition needs the entries to be whole numbers'],
  'Adding works position by position, so every position must exist in both. The rule about inner '
  'counts belongs to multiplication and is being borrowed here from the wrong operation.')

q('GB_MX_034', 'MX_FAM11_UNDEFINED_DIAGNOSIS', 'D4',
  'An attempt to multiply a 2 by 3 matrix by another 2 by 3 matrix fails, and a colleague '
  'objects that the shapes are identical so it ought to have worked. Multiplication requires the '
  'columns of the first to match the rows of the second, which is 3 against 2 here, and '
  'identical shapes do not guarantee that. Which requirement has not been met?',
  'The columns of the first must equal the rows of the second',
  ['The two matrices must have identical dimensions',
   'Both matrices must be square before they can be multiplied',
   'The entries of the two must be of the same kind'],
  'Identical shapes are what addition wants and are close to irrelevant to multiplication. Here '
  'they actively guarantee failure, since 3 and 2 can never agree.',
  evidence='the columns of the first to match the rows of the second, which is 3 against 2 here')

# =========================================================================
# MX_FAM12_INDEX_SWAP_DIAGNOSIS — D3 x1, D4 x1
# =========================================================================
q('GB_MX_035', 'MX_FAM12_INDEX_SWAP_DIAGNOSIS', 'D3',
  'A lookup into a square grid holding 1 to 9 in order, three to a line, is meant to return the '
  'top-right entry and returns the bottom-left one instead. What has happened?',
  'The two counts were exchanged, turning row 1, column 3 into row 3, column 1',
  ['The counting began at 0 rather than at 1',
   'The grid was filled a column at a time rather than a line at a time',
   'The lookup asked for the wrong entry to begin with'],
  'Top-right is row 1, column 3 and bottom-left is row 3, column 1, which is that address with '
  'its two counts swapped. What comes back is a real entry from the wrong place, so nothing '
  'about the output looks broken.')

q('GB_MX_036', 'MX_FAM12_INDEX_SWAP_DIAGNOSIS', 'D4',
  'A grid has the rows [2 9 4], [7 5 3] and [6 1 8], addressed row then column from 1. A program '
  'asks for row 2, column 3 and prints 1. The entry at row 2, column 3 is 3, and the value 1 '
  'sits at row 3, column 2, which is exactly the position with the two counts exchanged. What '
  'has happened?',
  'The row and column counts are being exchanged',
  ['The program is counting from 0 rather than from 1',
   'The rows of the grid have been stored in reverse order',
   'The grid has been populated with the wrong values'],
  'The observed value sits precisely at the exchanged position, which rules the alternatives '
  'out. Counting from 0 would have returned 8, and reversed rows would have returned 1 from a '
  'different place.',
  evidence='the value 1 sits at row 3, column 2, which is exactly the position with the two '
           'counts exchanged')

# =========================================================================
# MX_FAM13_STRUCTURAL_REASONING — D3 x1, D4 x1, D5 x3
# =========================================================================
q('GB_MX_037', 'MX_FAM13_STRUCTURAL_REASONING', 'D3',
  'A 3 by 3 identity matrix multiplies a 3 by 3 matrix M. What is the result?',
  'M itself, unchanged',
  ['The identity matrix', 'A matrix of all ones', 'A 3 by 3 matrix of zeros'],
  'The identity is built so that multiplying by it changes nothing, which is where its name '
  'comes from. No entry of M needs to be computed to know this.')

q('GB_MX_038', 'MX_FAM13_STRUCTURAL_REASONING', 'D4',
  'A 4 by 3 matrix is multiplied by a 3 by 3 matrix of zeros. Every entry of a product is built '
  'by combining a row with a column, and every column of the second matrix here holds nothing '
  'but zeros. What is the result?',
  'A 4 by 3 matrix of zeros',
  ['A 3 by 3 matrix of zeros', 'A single zero', 'Undefined'],
  'Each combination has a zero in every term, so every entry comes to zero, and the outer counts '
  'give the shape as 4 by 3. The shape follows from the two matrices regardless of what the '
  'entries turn out to be.',
  evidence='every column of the second matrix here holds nothing but zeros')

q('GB_MX_039', 'MX_FAM13_STRUCTURAL_REASONING', 'D5',
  'A team wants the shape of the product of a 6 by 2 matrix and a 2 by 6 matrix, in that order, '
  'without computing a single entry. The outer counts give the shape of the result and the inner '
  'ones only decide whether it exists at all. What is the shape?',
  '6 by 6',
  ['2 by 2', '6 by 2', '2 by 6'],
  'The outer counts are 6 and 6, so the product is 6 by 6 — larger than either matrix that went '
  'into it. Taken in the other order the same two would give 2 by 2, which is much smaller.',
  mode='EDGE',
  hinge='The outer counts give the shape of the result and the inner ones only decide whether it '
        'exists at all')

q('GB_MX_040', 'MX_FAM13_STRUCTURAL_REASONING', 'D5',
  'An identity matrix is said to leave a matrix unchanged. A team tries to multiply a 3 by 3 '
  'identity by a 2 by 4 matrix and the operation fails. Leaving a matrix unchanged only applies '
  'when the identity has a size the shapes allow, and 3 against 2 does not. What is needed to '
  'leave the 2 by 4 matrix unchanged from the left?',
  'A 2 by 2 identity',
  ['A 4 by 4 identity', 'A 3 by 3 identity',
   'No identity can leave a matrix that is not square unchanged'],
  'Multiplying from the left needs the identity columns to match the 2 rows, so A 2 by 2 identity '
  'is the one that fits. An identity sized to the 4 would do the same job from the right, which '
  'is a different operation.',
  mode='TRANSFER', hinge='only applies when the identity has a size the shapes allow')

q('GB_MX_041', 'MX_FAM13_STRUCTURAL_REASONING', 'D5',
  'Two matrices are multiplied and the result is all zeros, though neither of the two held only '
  'zeros. A team concludes that one of them must secretly have been a zero matrix. A product '
  'entry combines a whole row with a whole column, and such a combination can come to zero '
  'without either of them being all zeros. Is the conclusion right?',
  'No; a product of two matrices that are not zero can still be all zeros',
  ['Yes, one of the two must have been a zero matrix',
   'Yes, unless the two matrices were not square',
   'No, but only when the two matrices are the same size'],
  'Terms in a combination can cancel, so an entry reaches zero without every term being zero. '
  'Ordinary numbers do not behave this way, which is why the conclusion feels safe and is not.',
  mode='EDGE', hinge='such a combination can come to zero without either of them being all zeros')

# =========================================================================
# MX_FAM14_REPRESENTATION_CHOICE — D4 x1, D5 x4
# =========================================================================
q('GB_MX_042', 'MX_FAM14_REPRESENTATION_CHOICE', 'D4',
  'A team must hold exam marks for 30 students across 5 subjects, where every student sits every '
  'subject and every mark is a number. Every student has a mark in every subject, so the data is '
  'genuinely rectangular with no gaps. Is a matrix an appropriate representation?',
  'Yes, because the data is rectangular and uniformly typed',
  ['No, because students and subjects are different kinds of thing',
   'No, because 30 by 5 is too large to hold this way',
   'Yes, but only if every mark is a whole number'],
  'Rows and columns standing for different kinds of thing is the normal case rather than an '
  'objection. What matters is that every position exists and every entry is the same kind of '
  'value.',
  evidence='the data is genuinely rectangular with no gaps')

q('GB_MX_043', 'MX_FAM14_REPRESENTATION_CHOICE', 'D5',
  'A team must hold, for each of 200 customers, the orders that customer placed. Customers have '
  'between zero and several hundred orders each. Padding every customer out to the largest count '
  'would build a rectangle mostly full of entries standing for no order at all. Is a matrix '
  'appropriate?',
  'No, because the data is ragged and padding would invent orders that do not exist',
  ['Yes, once every customer has been padded to the same length',
   'Yes, because 200 rows is a perfectly manageable size',
   'No, because orders are not numbers'],
  'Padding is a real technique and it changes what the data says, which is the objection here '
  'rather than the size. Anything later counting entries would count the padding too.',
  mode='TRADEOFF', hinge='a rectangle mostly full of entries standing for no order at all')

q('GB_MX_044', 'MX_FAM14_REPRESENTATION_CHOICE', 'D5',
  'A grid of 1,000 by 1,000 cells is almost entirely zero, with about 3,000 cells holding a '
  'value. Storing it in full means holding a million entries in order to record three thousand '
  'facts. Which representation fits better?',
  'A list of the positions that hold a value, together with those values',
  ['The full grid, since addressing by row and column is simpler',
   'The full grid, since a million entries is not a large number',
   'A list of every position, whether it holds a value or not'],
  'The list records what is there and infers the rest, which is a saving of more than two '
  'hundred to one. Listing every position saves nothing at all and loses the direct addressing '
  'as well.',
  mode='TRANSFER', hinge='holding a million entries in order to record three thousand facts')

q('GB_MX_045', 'MX_FAM14_REPRESENTATION_CHOICE', 'D5',
  'A team holds a table with a row per student and a column per subject. One student did not sit '
  'one subject, and the gap is filled with 0. A mark of 0 and a subject not sat are different '
  'facts, and every later average will treat the two the same way. What is the problem?',
  'The filler is indistinguishable from a real mark and will corrupt every summary computed from '
  'the table',
  ['Nothing; 0 is the natural value for an entry that is missing',
   'The table should have been turned on its side instead',
   'The student should be removed from the table altogether'],
  'A rectangle demands a value in every position, and the only honest values here are outside '
  'the range of marks. Recording absence needs somewhere to record it, which this shape does not '
  'provide.',
  mode='EDGE', hinge='A mark of 0 and a subject not sat are different facts')

q('GB_MX_046', 'MX_FAM14_REPRESENTATION_CHOICE', 'D5',
  'The same data can be held with students as rows and subjects as columns, or the other way '
  'round, and the two hold identical information. Almost every report walks all subjects for one '
  'student at a time, and rows are stored contiguously. Which layout fits?',
  'Students as rows, so that one report reads a single contiguous row',
  ['Subjects as rows, because there are fewer subjects than students',
   'Either, since the two hold identical information',
   'Both, stored twice so that each report gets the layout it prefers'],
  'Identical information is exactly why correctness cannot decide it, and the access pattern '
  'can. Storing both would settle it at the cost of keeping two copies in step.',
  mode='TRADEOFF', hinge='Almost every report walks all subjects for one student at a time')

# =========================================================================
# MX_FAM15_GRID_TRANSFER — D4 x1, D5 x3
# =========================================================================
q('GB_MX_047', 'MX_FAM15_GRID_TRANSFER', 'D4',
  'A seating plan is written out as a grid of rows and seats. A teacher wants, for each seat '
  'number, the list of pupils sitting in that seat across all the rows. The information wanted '
  'runs down the grid rather than across it, so it has to be read column by column instead of '
  'row by row. What operation gives it?',
  'Turning the grid on its side, so that its columns become rows',
  ['Reversing the order of the rows',
   'Reversing the order of the pupils within each row',
   'Sorting the pupils by name'],
  'The values are all present and are grouped the wrong way for the question. Turning the grid '
  'regroups them without changing a single one.',
  evidence='The information wanted runs down the grid rather than across it')

q('GB_MX_048', 'MX_FAM15_GRID_TRANSFER', 'D5',
  'A spreadsheet holds monthly sales with months along the top and shops down the side. A report '
  'is wanted with months down the side and shops along the top, holding exactly the same '
  'numbers. No value may change, only where it sits. What is being asked for?',
  'Each row of the original becoming a column of the report',
  ['The rows of the original being sorted into a different order',
   'The values being totalled by month',
   'The report holding one row for every individual value'],
  'Nothing is added, removed or combined, so this is a regrouping rather than a calculation. '
  'Sorting rearranges whole rows and would leave months along the top.',
  mode='TRANSFER', hinge='No value may change, only where it sits')

q('GB_MX_049', 'MX_FAM15_GRID_TRANSFER', 'D5',
  'A grid has the same number of rows as seats, and a team notices that turning one particular '
  'grid on its side leaves it looking exactly as it did. They conclude that turning a grid on '
  'its side never changes anything when the two counts are equal. Equal counts keep the shape '
  'the same and say nothing about where the individual values end up. Is the conclusion right?',
  'No; the shape is preserved but the values still move, unless the grid happens to be symmetric',
  ['Yes; when the two counts are equal nothing changes',
   'Yes, provided the values are numbers rather than names',
   'No; the shape changes as well as the values'],
  'The one grid they looked at was symmetric, which is a property of its values rather than of '
  'its shape. A square grid with different values will move them and keep its outline.',
  mode='EDGE',
  hinge='Equal counts keep the shape the same and say nothing about where the individual values '
        'end up')

q('GB_MX_050', 'MX_FAM15_GRID_TRANSFER', 'D5',
  'A weekly timetable is held as a grid of days and periods, and can be stored one day at a time '
  'or one period at a time. Almost every question asked of it is what happens on a given day, '
  'and whichever way it is stored, reading across the other direction is far slower. How should '
  'it be stored?',
  'One day at a time, so that the common question reads what is stored together',
  ['One period at a time, since there are fewer periods than days',
   'Either way, since the same information is held in both',
   'Both ways at once, so that every question is fast'],
  'The two hold the same facts, so the access pattern is the only thing left to decide it. '
  'Holding both is a real option and pays for it by having two copies to keep in agreement.',
  mode='TRADEOFF', hinge='reading across the other direction is far slower')
