// etc script+
/*    testing    */
// load the schema in terminal
psql lene - h 127.0.0.1 - d test - f schema.sql


// test
COPY questions(id, product_id, body, date_written, asker_name, asker_email, reported, helpful)
FROM '/Users/lene/Dropbox/HackReactor/SDC/QA/Data/questionsTest.csv'
DELIMITER ','
CSV HEADER;


// load the schema in terminal
psql lene - h 127.0.0.1 - d qa - f schema.sql

/*    loading all data   */

// questions full
COPY questions(id, product_id, body, date_written, asker_name, asker_email, reported, helpful)
FROM '/Users/lene/Dropbox/HackReactor/SDC/QA/Data/questions.csv'
DELIMITER ','
CSV HEADER;


// answers full
COPY answers(id, questions_id, body, date_written, answerer_name, answerer_email, reported, helpful)
FROM '/Users/lene/Dropbox/HackReactor/SDC/QA/Data/answers.csv'
DELIMITER ','
CSV HEADER;


//photos full
COPY answer_photos(id, answers_id, url)
FROM '/Users/lene/Dropbox/HackReactor/SDC/QA/Data/answers_photos.csv'
DELIMITER ','
CSV HEADER;


// insert new question example
INSERT INTO questions(id, product_id, body, date_written, asker_name, asker_email, reported, helpful) VALUES(DEFAULT, 66642, 'is this a good price?', 1613888219613, 'kitty', 'cat@cat.com', 'f', 0);

// hierarchical queries
// fetches the normalized representation of a question query
SELECT
questions.id AS question_id,
  answers.id AS answer_id,
    answer_photos.id AS photo_id
FROM questions
LEFT JOIN answers ON answers.questions_id = questions.id
LEFT JOIN answer_photos ON answer_photos.answers_id = questions.id
WHERE product_id = 66642;

/* ===== RESULTS ===== */
/*
question_id | answer_id | photo_id
-------------+-----------+----------
      234324 |    [NULL] |   [NULL]
      234328 |    457342 |    70324
      234325 |    457339 |   [NULL]
      234325 |    457338 |   [NULL]
      234325 |    457337 |   [NULL]
      234327 |    457341 |    70323
      234329 |    457343 |   [NULL]
      234326 |    457340 |   [NULL]

      (timing:) Time: 2466.694 ms (00:02.467)
*/

// fetch the json object of a question query using nested sub-queries
SELECT row_to_json(questionsResults)
  FROM(
    SELECT
        questions.id as question_id,
        questions.body as question_body,
        to_char(to_timestamp(date_written/1000), 'YYYY-MM-DD"T"HH24:MI:SS:MS"Z"') as question_date,
        questions.asker_name,
        questions.helpful as question_helpfulness,
        questions.reported,
    (
      SELECT jsonb_agg(nested_answers)
            FROM(
        SELECT
          answers.id,
          answers.body,
          to_char(to_timestamp(date_written/1000), 'YYYY-MM-DD"T"HH24:MI:SS:MS"Z"') as date,
          answers.answerer_name,
          answers.helpful as helpfulness,
        (
          SELECT json_agg(nested_photos)
                 FROM(
            SELECT
               answer_photos.id,
              answer_photos.url
                   FROM answer_photos
                   where answer_photos.answers_id = answers.id
          ) AS nested_photos
      ) AS photos
              FROM answers
              WHERE answers.questions_id = questions.id AND answers.reported = 'f'
  ) AS nested_answers
          ) AS answers
      FROM questions
      WHERE questions.product_id = 66642 AND questions.reported = 'f'
  ) AS questionsResults;

// alternative query using Common Table Expressions:

WITH  answer_photos as (
    SELECT
      answer_photos.id,
      answer_photos.url
    FROM answer_photos
    GROUP BY answer_photos.id
    order by answer_photos.id
), answers AS (
    SELECT
    answers.id,
    answers.body,
    to_char(to_timestamp(date_written/1000), 'YYYY-MM-DD"T"HH24:MI:SS:MS"Z"') as date,
    answers.answerer_name,
    answers.helpful as helpfulness,
      json_agg(answer_photos) as photos
    FROM answers
    LEFT JOIN answer_photos ON answer_photos.answers_id = answers.id
    GROUP BY answers.id
    order by answers.id
), questions AS (
    SELECT
      questions.id as question_id,
      questions.body as question_body,
      to_char(to_timestamp(date_written/1000), 'YYYY-MM-DD"T"HH24:MI:SS:MS"Z"') as question_date,
      questions.asker_name,
      questions.helpful as question_helpfulness,
      questions.reported,
      json_agg(answers) as answers
    FROM questions
    LEFT JOIN answers ON answers.questions_id = question.id
    group by question.id
    order by question.id
)
SELECT row_to_json(questions)
FROM questions
WHERE questions.product_id=66642;
// >>> ERROR:  42P01: missing FROM-clause entry for table "answer_photos"
// LINE 17:     LEFT JOIN photos ON answer_photos.answers_id = answers.i...
//LOCATION:  errorMissingRTE, parse_relation.c:3545

/* ===================  TESTING =================== */

// DESCRIBING THE DATA
// Query: number of distinct products
select count(product_id) from (select distinct product_id from questions) as prods;

 count
--------
 899855
(1 row)

Time: 2590.196 ms (00:02.590)

// number of distinct question
select count(id) from (select distinct id from questions) as qs;
  count
---------
 3518965
(1 row)

Time: 875.631 ms
// same query, using max()
select max(id) from questions;
   max
---------
 3518965
(1 row)

Time: 2.703 ms

// number of distinct answers
select max(id) from answers;
   max
---------
 6879308
(1 row)

Time: 8.835 ms

// numbe of distinct photos in answer_photos
select max(id) from answer_photos;
   max
---------
 2063760
(1 row)

Time: 9.771 ms

// see number of questions per product_id
  // limit to 20
  select product_id,  count(id) from questions group by product_id order by count(id) desc limit 100;
  Time: 1609.888 ms (00:01.610)
 product_id | count
------------+-------
     315198 |    17
     549982 |    16
     487742 |    16
     724743 |    16
     568398 |    16
     249985 |    16
      93436 |    16
     924034 |    15
     435452 |    15
      63741 |    15
     692684 |    15
     504218 |    15
     144793 |    15
     188712 |    15
     225271 |    15
     109031 |    15
     754596 |    15
     340697 |    15
     295214 |    15
      44360 |    15
     344762 |    15
     911463 |    15
      99306 |    15
     617017 |    15
     416199 |    15
     478060 |    15
     921709 |    15
     959080 |    15
     828145 |    15
     623802 |    15
     241939 |    15
     637259 |    15
     728803 |    15
     775983 |    15
      57457 |    15
     940989 |    15
     961011 |    15
          3 |    15
     298477 |    15
      94105 |    15
     845036 |    15
     249112 |    15
     754227 |    15
     517958 |    14
     506975 |    14
     528179 |    14
     497682 |    14
     479030 |    14
     500855 |    14
     532471 |    14
     416728 |    14
      40860 |    14
     418273 |    14
     403075 |    14
     466238 |    14
      13912 |    14
     481653 |    14
     397772 |    14
      14406 |    14
     379739 |    14
     509984 |    14
     511362 |    14
     398321 |    14
     119844 |    14
     374783 |    14
     398353 |    14
     440669 |    14
     538358 |    14
     329091 |    14
     318395 |    14
     343837 |    14
     300972 |    14
      87682 |    14
     302309 |    14
     268200 |    14
     263478 |    14
     287910 |    14
     253468 |    14
     253282 |    14
     255856 |    14
      27564 |    14
     257411 |    14
     260625 |    14
      27514 |    14
      78920 |    14
      80570 |    14
     290604 |    14
     350259 |    14
     229530 |    14
      11004 |    14
     225422 |    14
     231091 |    14
     225350 |    14
     336042 |    14
     234214 |    14
     189466 |    14
     203703 |    14
      36565 |    14
     110106 |    14
       3164 |    14

/* =============== CREATING INDEXES ============= */
CREATE INDEX questions_product_id_question_id_idx
ON questions (product_id, id);
=> Time: 6459.407 ms (00:06.459)

CREATE INDEX answers_questions_id_answer_id_idx
ON answers (questions_id, id);
=> Time: 9906.281 ms (00:09.906)

CREATE INDEX answer_photos_answers_id_photo_id_idx
ON answer_photos (answers_id, id);
=> Time: 1873.786 ms (00:01.874)
