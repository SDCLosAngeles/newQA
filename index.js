require('dotenv').config();
const express = require('express');
const axios = require('axios');
const bodyParser = require('body-parser');
const app = express();
// const port = process.env.PORT;

const db = require('./queries');

app.use(express.json());

// example request
app.get('/', (request, response) => {
  response.json({info: 'Node.js, Express, and Postgres API'})
});

//simple request, no params
// app.get('/qa/questions', db.getQuestions);


const apiUrl = '';

// GET /qa/questions retrieves a list of questions for a product
// parameters: product_id, page, count
// does not include any reported questions
// results include answers
// status: 200 ok
//  for example .get(`/qa/questions/?product_id=66642&count=100`)

app.get('/qa/questions/', (req, res) => {
  // const targetUrl = apiUrl + req.url;
  // how to add page count parameter?
  const params = req.query.product_id;
  // const headers = { Authorization: api_token };
  // console.log('get request qa qu', req.url, params);
  db.getAll(params, (err, results) => {
   if(err) {
     throw err;
   }
   res.status(200).json(results);
  });
});


// GET /qa/questions/:question_id/answers >>>> NOT USED IN FEC MARS
// app.get('/qa/answers/', (req, res) => {
//   const params = req.query.question_id;
//   console.log('get request qa ans:', params);
//   db.getAnswers(params, (err, results) => {
//     if(err) {
//       throw err;
//     }
//     res.status(200).json(results.rows);
//   })
// })


// POST /qa/questions
// Add a Question - Adds a question for the given product
// body parameters: body, name, email, product_id
// status: 201 created
app.post('/qa/questions', (req, res) => {
  const body = req.body;
  db.postQuestion(body, (err, results) => {
    if(err) {
      throw err;
    }
    res.status(201).end();
  })
})



// POST /qa/questions/:question_id/answers
// Adds an answer for the given question
// parameter: question_id
// body params: body, name, email, photos (array of text urls)
// status: 201 created
app.post('/qa/questions/:question_id/answers', (req, res) => {
  const param = req.params.question_id;
  const body = req.body;
  // console.log('post add answer param:', param);
  db.postAnswer(param, body, (err, results) => {
    if(err) {
      throw err;
    }
    res.status(201).end();
  })
 res.end();
})


// PUT /qa/questions/:question_id/helpful
// Mark Question as Helpful
// Updates a question to show it was found helpful.
// params: question_id
// status: 204 no content
app.put('/qa/questions/:question_id/helpful', (req, res) => {
  const param = req.params.question_id;
  // console.log('put vote question helpful param:', param);
  db.upvoteQuestion(param, (err, results) => {
    if(err) {
      throw err;
    }
    res.status(204).end();
  })
//  res.end();
});


// PUT /qa/questions/:question_id/report
// Report Question
// Updates a question to show it was reported. Note, this action does not delete the question, but the question will not be returned in the above GET request.
// params: question_id
// status: 204 no content
app.put('/qa/questions/:question_id/report', (req, res) => {
  const param = req.params.question_id;
  // console.log('put report question param:', param);
  db.reportQuestion(param, (err, results) => {
    if (err) {
      throw err;
    }
    res.sendStatus(204);
  });
  // res.end();
});

// PUT /qa/answers/:answer_id/helpful
// Mark Answer as Helpful
// Updates an answer to show it was found helpful.
// Params: answer_id
// status: 204 no content
app.put('/qa/answers/:answer_id/helpful', (req, res) => {
  const param = req.params.answer_id;
  // console.log('put vote answer helpful param:', param);
  db.upvoteAnswer(param, (err, results) => {
    if(err) {
      throw err;
    }
    res.status(204).end();
  })
//  res.end();
});


// PUT /qa/answers/:answer_id/report
// Report Answer
// Updates an answer to show it has been reported. Note, this action does not delete the answer, but the answer will not be returned in the above GET request.
// status: 204 no content
app.put('/qa/answers/:answer_id/report', (req, res) => {
  const param = req.params.answer_id;
  // console.log('put report answer param:', param);
  db.reportAnswer(param, (err, results) => {
    if (err) {
      throw err;
    }
    res.sendStatus(204);
  });
  // res.end();
});



app.listen(process.env.PORT, () => {
  console.log(`App running on port ${process.env.PORT}.`)
});
