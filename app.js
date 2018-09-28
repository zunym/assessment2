//Step 1: load path and express
require('dotenv').config();
const express = require("express");
    path = require("path");
    mysql = require("mysql");
    bodyParser = require("body-parser");

    querystring = require('querystring');
    path = require('path');
    hbs = require('express-handlebars');
    request = require('request'); 
    var cors = require('cors')

const resources = [ 'images' ];
const images = [ 
    'ella_the_rose_fairy.jpg',
    'harry-potter-p-stone.jpg',
    'no_book_cover.jpg',
    'the_haunted_tower.jpg'];
    
const API_URI = "/api";

//Configure a connection pool to the database
console.log("process.env.DB_PORT => ", process.env.DB_PORT);

//Configure express to use handlebars as the rendering engine
app.engine('hbs', hbs());
app.set('view engine', 'hbs');
app.set('views', path.join(__dirname, 'my-views'));

//Q2a :  Default list , limit 10 offset 0 ASC product name
const sqlFindDefaultBooks = "SELECT cover_thumbnail,title, concat(author_firstname,' ',author_lastname) as name  FROM books ORDER BY title ASC LIMIT ? OFFSET ?";
//Find by id
const sqlFindOneBook = "SELECT *  FROM books WHERE id=?";
//Find books queries
const sqlFindAllBooks = "SELECT cover_thumbnail,title, concat(author_firstname,' ',author_lastname) as name FROM books WHERE (title LIKE ?) || (author_firstname LIKE ?) || ( author_lastname LIKE ?) ORDER BY title ASC LIMIT ? OFFSET ?"
// Find books sort by title ASC
const sqlFindAllBooksTitleAsc = "SELECT cover_thumbnail,title, concat(author_firstname,' ',author_lastname) as name FROM books WHERE (title LIKE ?) || (author_firstname LIKE ?) || ( author_lastname LIKE ?) ORDER BY title ASC LIMIT ? OFFSET ?"
// Find books sort by title DESC
const sqlFindAllBooksTitleDesc = "SELECT cover_thumbnail,title, concat(author_firstname,' ',author_lastname) as name FROM books WHERE (title LIKE ?) || (author_firstname LIKE ?) || ( author_lastname LIKE ?) ORDER BY title DESC LIMIT ? OFFSET ?"
// Find books sort by author ASC, sort last name , followed by first name
const sqlFindAllBooksNameAsc = "SELECT cover_thumbnail,title, concat(author_firstname,' ',author_lastname) as name FROM books WHERE (title LIKE ?) || (author_firstname LIKE ?) || ( author_lastname LIKE ?) ORDER BY author_lastname ASC, author_firstname ASC  LIMIT ? OFFSET ?"
// Find books sort by author desc, sort last name , followed by first name
const sqlFindAllBooksNameDesc = "SELECT cover_thumbnail,title, concat(author_firstname,' ',author_lastname) as name FROM books WHERE (title LIKE ?) || (author_firstname LIKE ?) || ( author_lastname LIKE ?) ORDER BY author_lastname DESC, author_firstname DESC  LIMIT ? OFFSET ?"




const pool = mysql.createPool({
    host: process.env.DB_HOST, //"localhost",
    port: process.env.DB_PORT, //3306,
    user: process.env.DB_USER, //"root",
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME, //"derby",
    connectionLimit: process.env.DB_CONLIMIT //4
    // debug: true
});

var makeQuery = (sql, pool) => {
    console.log("makeQuery sql", sql);

    return (args) => {
        let queryPromsie = new Promise((resolve, reject) => {
            pool.getConnection((err, connection) => {
                if (err) {
                    reject(err);
                    return;
                }
                console.log(args);

                connection.query(sql, args || [], (err, results) => {
                    connection.release();
                    if (err) {
                        reject(err);
                        return;
                    }
                    console.log(">>> " + results);
                    resolve(results);
                })
            });
        });
        return queryPromsie;
    }
}

// Books query variables
var findDefaultBooks = makeQuery(sqlFindDefaultBooks, pool);
var findOneBookById = makeQuery(sqlFindOneBook, pool);
var findAllBooks = makeQuery(sqlFindAllBooks, pool);
var findAllBooksTitleAsc = makeQuery(sqlFindAllBooksTitleAsc, pool);
var findAllBooksTitleDesc = makeQuery(sqlFindAllBooksTitleDesc, pool);
var findAllBooksNameAsc = makeQuery(sqlFindAllBooksNameAsc, pool);
var findAllBooksNameDesc = makeQuery(sqlFindAllBooksNameDesc, pool);


//Step 2: create an instance of the application
const app = express();
app.use(cors());

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());


// requirement 2, question 1 Search fields using parameters: book id
app.get(API_URI + "/books/:bookId", (req, res) => {
    console.log("/books/:bookId params !");
    let bookId = req.params.bookId;
    console.log(bookId);
    findOneBookById([parseInt(bookId)]).then((results) => {
        console.log(results);
        res.json(results);
    }).catch((error) => {
        res.status(500).json(error);
    })
})

app.get(API_URI + '/books', (req, resp) => {
    console.log("/books query");

    // since author firstname may contain empty strings, forced to use special character '³' 
    // Assume author and title may contain empty data
    if (typeof (req.query.author) === 'undefined') {
        req.query.author = '³';
    }
    if (typeof (req.query.title) === 'undefined') {
        req.query.title = '³';
    }
    if (typeof (req.query.limit) === 'undefined') {
        req.query.limit = '10';
    }
    if (typeof (req.query.sortType) === 'undefined') {
        req.query.sortType = 'none';
    }
    if (typeof (req.query.offset) === 'undefined') {
        req.query.offset = '0';
    }

    if (  
        (req.query.author == '³') &&
        (req.query.title == '³') 
    ) {
        // R1Q2a, default endpoint http://localhost:3000/api/books
        // http://localhost:3000/api/books?limit=10&offset=10
        // http://localhost:3000/api/books
        console.log("Empty query");
        console.log("Here");
        findDefaultBooks([parseInt(req.query.limit),parseInt(req.query.offset)]).then((results) => {
            resp.json(results);
        }).catch((error) => {
            console.log(error);
            resp.status(500).json(error);
        });
    } else {
        console.log("Query for title or/and author query");
        //1.Search fields using queries: Title & Autho
        //  http://localhost:3000/api/books?title=adv&limit=10&offset=0
        //  http://localhost:3000/api/books?author=wil&limit=10&offset=0
        //  http://localhost:3000/api/books?title=adv&author=wil&limit=10&offset=0

        console.log(req.query);

        var title_keyword = req.query.title;
        var author_keyword = req.query.author;

        console.log(title_keyword);
        console.log(author_keyword);
        //console.log(orderBy);
        // Array contains [ <title>, <firstname>, <lastname>,  <limit>, <offset>]
        //   if title keyword, then [ keyword, '', '', limit, offset]
        //   if author keyword, then [ '', keyword, keyword, limit, offset]
        //   if both , then [ keyword, keyword, keyword, limit, offset]
        // since author firstname may contain empty strings, forced to use special character '³' 
        let finalCriteriaFromType = ['%', '%', '%', parseInt(req.query.limit), parseInt(req.query.offset)];
        finalCriteriaFromType = ['%' + title_keyword + '%', '%' + author_keyword + '%', '%' + author_keyword + '%', parseInt(req.query.limit), parseInt(req.query.offset)];
        if (req.query.sortType == 'none') {
            findAllBooks(finalCriteriaFromType)
                .then((results) => {
                    console.log(results);
                    resp.json(results);
                }).catch((error) => {
                    resp.status(500).json(error);
                });
        } else if (req.query.sortType == 'titleAsc') {
            // http://localhost:3000/api/books?title=adv&author=wil&limit=10&offset=0&sortType=titleAsc
            console.log("sort title asc");
            findAllBooksTitleAsc(finalCriteriaFromType)
                .then((results) => {
                    console.log(results);
                    resp.json(results);
                }).catch((error) => {
                    resp.status(500).json(error);
                });
        } else if (req.query.sortType == 'titleDesc') {
            // http://localhost:3000/api/books?title=adv&author=wil&limit=10&offset=0&sortType=titleDesc
            console.log("sort title desc");
            findAllBooksTitleDesc(finalCriteriaFromType)
                .then((results) => {
                    console.log(results);
                    resp.json(results);
                }).catch((error) => {
                    resp.status(500).json(error);
                });
        } else if (req.query.sortType == 'authorAsc') {
            // http://localhost:3000/api/books?title=adv&author=wil&limit=10&offset=0&sortType=authorAsc
            // sort by first name then followed by last name
            console.log("sort author asc");
            findAllBooksNameAsc(finalCriteriaFromType)
                .then((results) => {
                    console.log(results);
                    resp.json(results);
                }).catch((error) => {
                    resp.status(500).json(error);
                });
        } else if (req.query.sortType == 'authorDesc') {
            // http://localhost:3000/api/books?title=adv&author=wil&limit=10&offset=0&sortType=authorDesc
            // sort by first name then followed by last name
            console.log("sort author DESC");
            findAllBooksNameDesc(finalCriteriaFromType)
                .then((results) => {
                    console.log(results);
                    resp.json(results);
                }).catch((error) => {
                    resp.status(500).json(error);
                });
        }




    }

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

//Step 4: start the server
const PORT = parseInt(process.argv[2]) || parseInt(process.env.APP_PORT) || 3000;

app.listen(PORT, () => {
    console.info(`Application started on port ${PORT} at ${new Date()}`);
}
);