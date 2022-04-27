const Pool = require('pg').Pool;
const pool = new Pool({
  user: process.env.USER,
  host: '127.0.0.1',
  database: 'qa',
  port: 5432,
})

// so far, not considering page count and reported status
const getAll = (product_id, callback) => {
  const text = `SELECT row_to_json(questionsResults)
  FROM(
    SELECT
        questions.id as question_id,
        questions.body as question_body,
        to_char(to_timestamp(date_written/1000), 'YYYY-MM-DD"T"HH24:MI:SS:MS"Z"') as question_date,
        questions.asker_name,
        questions.helpful as question_helpfulness,
        questions.reported,
    (
      SELECT json_agg(nested_answers)
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
      WHERE questions.product_id = ${product_id} AND questions.reported = 'f'
  ) AS questionsResults;`

  pool.query(text, (err, results) => {
    if (err) {
      throw err;
    }
    // formatting results
    const resObj = {
      product_id: product_id,
      resultsArr:[]
    }
    // console.log('results rows', results.rows);
    var aggAnswersObj = {};
    results.rows.forEach((item) => {
      // console.log('answers: ', item.row_to_json.answers);
      var answersArr = item.row_to_json.answers;
      if ( answersArr ) {
        answersArr.forEach((answerObj) => {
          var prop = parseInt(answerObj.id, 10);
          var newAnswerObj = {};
          // newAnswerObj[prop] = answerObj;
          aggAnswersObj[prop] = answerObj;
          // console.log('=== newAnswerObj', newAnswerObj);
        });
      }
      item.row_to_json.answers = aggAnswersObj;
      resObj.resultsArr.push(item.row_to_json)
    });
    // console.log(resObj.resultsArr);
    callback(err, resObj);
  });
}

const getAnswers = (question_id, callback) => {
  pool.query(`SELECT * FROM answers WHERE questions_id=${question_id}`, (err, results) => {
    if (err) {
      throw err;
    }
    callback(err, results);
  })
}

// body parameters: body, name, email, product_id
const postQuestion = (reqBody, callback) => {
  // console.log('post q req body', reqBody);
  let last = 1;
  pool.query('SELECT max(id) FROM questions;', (err, res) => {
    if (err) { throw err; }
    last = res.rows[0].max;
    // console.log('last id in questions: ', last);
    const body = reqBody.body;
    const name = reqBody.name;
    const email = reqBody.email;
    const product_id = reqBody.product_id;
    const timestamp = Date.now();
    const reported = 'f';
    const helpful = 0;
    const values = [last + 1, product_id, body, timestamp, name, email, reported, helpful];
    const text = 'INSERT INTO questions(id, product_id, body, date_written, asker_name, asker_email, reported, helpful) VALUES ( $1, $2, $3, $4, $5, $6, $7, $8 ) RETURNING id;';
    pool.query(text, values, (err, results) => {
      if (err) {
        throw err;
      }
      // console.log('question inserted with id ', results.rows[0].id);
      callback(err, results);
    });
  });
}

const postPhotos = (photosArray, answer_id) => {
  let last = 1;
  pool.query('SELECT max(id) FROM answer_photos;', (err, res) => {
    if (err) { throw err; }
    last = res.rows[0].max;
    // console.log('last id in Answer_Photos: ', last);
    const textPhoto = 'INSERT INTO answer_photos (id, url, answers_id) VALUES( $1, $2, $3) RETURNING id;';
    for (var i = 0; i < photosArray.length; i++) {
      var values = [last + 1, photosArray[i], answer_id];
      pool.query(textPhoto, values, (err, results) => {
        if (err) {
          throw err;
        }
        // console.log('photo inserted with id ', results.rows[0].id);
        last = results.rows[0].id;
      });
    }
  });
}


// parameter: question_id
// body params: body, name, email, photos (array of text urls)
const postAnswer = (param, reqBody, callback) => {
  const question_id = param;
  const body = reqBody.body;
  const timestamp = Date.now();
  const name = reqBody.name;
  const email = reqBody.email;
  const reported = 'f';
  const helpful = 0;

  let last = 1;
  pool.query(`SELECT max(id) FROM answers; `, (err, res) => {
    if (err) {
      throw err;
    }
    last = res.rows[0].max;
    // console.log('last id in answers', last);
    const values = [last + 1, body, timestamp, name, email, reported, helpful, question_id];
    // console.log('values in query', values);
    const text = 'INSERT INTO answers (id, body, date_written, answerer_name, answerer_email, reported, helpful, questions_id) VALUES ( $1, $2, $3, $4, $5, $6, $7, $8 ) RETURNING id;';
    const photos = reqBody.photos;

    pool.query(text, values, (err, results) => {
      if (err) {
        throw err;
      }
      const answer_id = results.rows[0].id;

      postPhotos(photos, answer_id);
      callback(err, results);
    });
  });



}

const upvoteQuestion = (param, callback) => {
  const question_id = param;
  pool.query(`SELECT helpful FROM questions WHERE id=${question_id};`, (err, results) => {
    if (err) {
      throw err;
    }
    const currentTally = results.rows[0].helpful;
    // console.log(currentTally);
    pool.query(`UPDATE questions SET helpful=${currentTally + 1} WHERE id=${question_id} RETURNING helpful;`, (err, results) => {
      if (err) {
        throw err;
      }
      // console.log(results);
      callback(err, results);
    });
  });
}

const reportQuestion = (param, callback) => {
  const question_id = param;
  pool.query(`UPDATE questions SET reported='t' WHERE id=${question_id};`, (err, results) => {
    if (err) {
      throw err;
    }
    callback(err, results);
  });
}

const upvoteAnswer = (param, callback) => {
  const answer_id = param;
  pool.query(`SELECT helpful FROM answers WHERE id=${answer_id};`, (err, results) => {
    if (err) {
      throw err;
    }
    const currentTally = results.rows[0].helpful;
    // console.log(currentTally);
    pool.query(`UPDATE answers SET helpful=${currentTally + 1} WHERE id=${answer_id} RETURNING helpful;`, (err, results) => {
      if (err) {
        throw err;
      }
      // console.log(results);
      callback(err, results);
    });
  });
}

const reportAnswer = (param, callback) => {
  const answer_id = param;
  pool.query(`UPDATE answers SET reported='t' WHERE id=${answer_id};`, (err, results) => {
    if (err) {
      throw err;
    }
    callback(err, results);
  });
}

module.exports = {
  getAll,
  getAnswers,
  postQuestion,
  postAnswer,
  postPhotos,
  upvoteQuestion,
  reportQuestion,
  upvoteAnswer,
  reportAnswer,
}
