require('dotenv').config()
const express =  require("express"),
      mysql = require("mysql"),
      q = require("q"),
      bodyParser = require("body-parser");

      querystring = require('querystring');
      path = require('path');
      hbs = require('express-handlebars');
      request = require('request');     

var app = express();
const resources = ['public','images'];
const NODE_PORT = process.env.PORT;
const API_URL = "/api";

//Configure express to use handlebars as the rendering engine
app.engine('hbs', hbs());
app.set('view engine', 'hbs');
app.set('views', path.join(__dirname, 'my-views'));

//sql
const sqlFindAllGroceries = "SELECT * FROM books";


/**
 * Query Pool
 * .env
 * DB_HOST="localhost"
 * DB_PORT=3306
 * user=root
 * password=xxxxxxxx
 * database=grocery
 * 4
 */
console.log("DB USER : " + process.env.DB_USER);
console.log("DB NAME : " + process.env.DB_NAME);
var pool = mysql.createPool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    connectionLimit: process.env.DB_CONLIMIT
    //debug: true
})

var makeQuery = (sql, pool)=>{
    console.log("SQL: ",sql);
    
    return  (args)=>{
        var defer = q.defer();
        pool.getConnection((err, connection)=>{
            if(err){
                defer.reject(err);
                return;
            }
            console.log("ARG: ",args);
            connection.query(sql, args || [], (err, results)=>{
                connection.release();
                if(err){
                    defer.reject(err);
                    return;
                }
                //console.log(">>> Result: "+ results);
                defer.resolve(results); 
            })
        });
        return defer.promise;
    }
}

//makeQuery executes
var findAllGroceries = makeQuery(sqlFindAllGroceries, pool);

/**?
 * body-parser for json format
 */
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

/**
 * route
 */
app.get(API_URL+"/all", (req, res)=>{
    var Id = req.params;
    console.log("All",Id);   
    findAllGroceries([Id]).then((results)=>{
        console.log("All Result",results);
        res.json(results);
    }).catch((error)=>{
        console.log(error);
        res.status(500).json(error);
    });
});


//index
app.get(['/', '/index'], (req, resp) => {
      resp.status(200).type('text/html');
      resp.render('index');
  });
  
  for (let r of resources) {
      console.info(`Addding ${r} as static resource`)
      app.use(express.static(path.join(__dirname, r)));
  }
  
  app.listen(NODE_PORT, ()=>{
      console.log(`Listening to server at ${NODE_PORT}`)
  })