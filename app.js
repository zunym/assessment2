require('dotenv').config()
const express =  require("express"),
      mysql = require("mysql"),
      bodyParser = require("body-parser");

      querystring = require('querystring');
      path = require('path');
      hbs = require('express-handlebars');
      request = require('request'); 

var app = express();
const API_URL = "/api/books/search";

const resources = [ 'images', 'public' ];
const images = [ 
    'ella_the_rose_fairy.jpg',
    'harry-potter-p-stone.jpg',
    'no_book_cover.jpg',
    'the_haunted_tower.jpg'];
    
//Configure express to use handlebars as the rendering engine
app.engine('hbs', hbs());
app.set('view engine', 'hbs');
app.set('views', path.join(__dirname, 'my-views'));

app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());

//db
var pool = mysql.createPool({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      connectionLimit: process.env.DB_CONLIMIT
      //debug: true
  })

//sql
const findAllBooks = "SELECT id, title, cover_thumbnail, author_firstname, author_lastname FROM books LIMIT ? OFFSET ?";
const findOneBook = "SELECT * FROM books WHERE id = ?";
const searchBookByTitle = "SELECT * FROM books WHERE title LIKE ?";
const searchBookByName = "SELECT * FROM books WHERE (author_lastname LIKE ?) OR (author_firstname LIKE ?)";
const searchBooksByCriteria = "SELECT * FROM books WHERE (author_lastname LIKE ?) OR (author_firstname LIKE ?) OR (title LIKE ?)";

console.log("DB USER : " + process.env.DB_USER);
console.log("DB NAME : " + process.env.DB_NAME);

//promise to query
var makeQuery = function (sql, pool) {

    return function (args) {
        var sqlPromise = new Promise((resolve, reject)=>{
            pool.getConnection(function (err, conn) {
                if (err) {
                    reject(err);
                    return;
                }
                conn.query(sql, args || [], function (err, results) {
                    conn.release();
                    if (err) {
                        reject(err);
                        return;
                    }
                    resolve(results);
                });
            });
        })
        
        return sqlPromise;
    }
};

var findAll = makeQuery(findAllBooks, pool);
var findOne = makeQuery(findOneBook, pool);
var searchByName = makeQuery(searchBookByName, pool);
var searchByTitle = makeQuery(searchBookByTitle, pool);
var searchBooks = makeQuery(searchBooksByCriteria, pool);


//Search fields using queries: & Author
//http://localhost:3000/api/books/author?name=Eamon //Meadows
  app.get(API_URL+"/author", function (req, res) {
    var auId = req.query.name;
    console.log(auId);
    searchByName(['%'+auId+'%', '%'+auId+'%'])
          .then(function (results) {
              console.log(results)
              res.status(200).json(results);
          })
          .catch(function (err) {
              res.status(500).end();
          });
  });

  //Search fields using queries: Title
  app.get(API_URL+"/title", function (req, res) {
    var Ti = req.query.title;
    console.log("All",Ti);
    searchByTitle(['%'+Ti+'%', '%'+Ti+'%'])
          .then(function (results) {
              console.log(results)
              res.status(200).json(results);
          })
          .catch(function (err) {
              res.status(500).end();
          });
  });

  //Search fields using queries: Title & Author
  //http://localhost:3000/api/books/both?name=Eamon&title='Only a Game'
  app.get(API_URL+"/both", function (req, res) {
    var Id = req.query.name;
    var Ti = req.query.title;
    console.log("All",Id);
    console.log("All",Ti);
    searchBooks(['%'+Id+'%', '%'+Id+'%', '%'+Ti+'%'])
          .then(function (results) {
              console.log(results)
              res.status(200).json(results);
          })
          .catch(function (err) {
              res.status(500).end();
          });
  });

  app.get(API_URL+"/allbooks", function (req, res) {
    var limit = parseInt(req.query.limit) || 10;
    var offset = parseInt(req.query.offset) || 0;
    findAll([limit, offset])
        .then(function (results) {
            res.status(200).json(results);
        })
        .catch(function (err) {
            res.status(500).end();
        });
});

app.get(API_URL+"/books/:bookId", function (req, res) {
      var limit = parseInt(req.query.limit) || 20;
      var offset = parseInt(req.query.offset) || 0;
    var Id = req.params.bookId;
    //console.log(">>>>Name",Id);
    findOne([Id])
          .then(function (results) {
              res.status(200).json(results);
          })
          .catch(function (err) {
              res.status(500).end();
          });
  });


app.get(['/', '/index'], (req, resp) => {
      resp.status(200).type('text/html');
      resp.render('index');
  });

//Define our routes
// GET /image -> text/html
app.get('/images', (req, resp) => {
    resp.status(200);
    resp.type('image/jpg');
    resp.sendfile(path.join(__dirname, 'images', imageFile));
});


//Serves from public the dist directory
app.use(express.static(__dirname + "/../src/app"));
console.log("Current base path: ",__dirname);

for (let res of resources) {
    console.info(`Adding ${res} to static`)
    app.use(express.static(path.join(__dirname, res)));
}

app.listen(3000, function () {
    console.info("App server started on port 3000");
});