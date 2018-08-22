// https://www.codementor.io/mayowa.a/how-to-build-a-simple-session-based-authentication-system-with-nodejs-from-scratch-6vn67mcy3

const express = require("express");

// load middleware
const exphbs = require("express-handlebars");
const compression = require("compression");
const helmet = require("helmet");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const session = require("express-session");
const SequelizeStore = require("connect-session-sequelize")(session.Store);
const morgan = require("morgan");

// load our models
const { user, sql } = require("./models/user");

// start spinning up our server
const app = express(); // create an instance of express

app.engine(
  "hbs",
  exphbs({
    extname: "hbs",
    defaultLayout: "main"
  })
);

app.set("port", process.env.PORT || 8000);
app.set("view engine", "hbs");

app.use(compression());
app.use(helmet());
app.use(morgan("dev"));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(
  session({
    // this sets a session
    key: "user_sid",
    secret: process.env.SECRET,
    store: new SequelizeStore({
      // storing our sessions in a database via SequelizeStore middleware
      db: sql
    }),
    resave: false,
    saveUninitialized: false,
    cookie: {
      expires: 300000 // milliseconds (so 5 minutes) - this timeout is the same for storage and user cookie
    }
  })
);

// reset cookie if session expires
app.use((req, res, next) => {
  if (req.cookies.user_sid && !req.session.user) {
    res.clearCookie("user_sid");
  }
  next();
});

// create a function to check that sessions are valid & redirect to dashboard if true
const sessionChecker = (req, res, next) => {
  if (req.session.user && req.cookies.user_sid) {
    res.redirect("/dashboard");
  } else {
    next();
  }
};

// start with the home route :)
app.get("/", sessionChecker, (req, res) => {
  res.redirect("/login");
});

// signup route checks for logged in session first on GET and signs up a new user on POST
app
  .route("/signup")
  .get(sessionChecker, (req, res) => {
    res.render("signup");
  })
  .post((req, res) => {
    user
      .create({
        username: req.body.username,
        email: req.body.email,
        password: req.body.password
      })
      .then(user => {
        req.session.user = user.dataValues;
        res.redirect("/dashboard");
      })
      .catch(error => {
        res.redirect("/signup");
      });
  });

// presents login screen on GET (following a session check) and checks login on POST
app
  .route("/login")
  .get(sessionChecker, (req, res) => {
    res.render("login");
  })
  .post((req, res) => {
    const { username, password } = req.body;
    user.findOne({ where: { username } }).then(u => {
      console.log(u.dataValues);
      if (!u || !u.validPassword(password)) {
        res.redirect("/login");
      } else {
        req.session.user = u.dataValues;
        res.redirect("/dashboard");
      }
    });
  });

// dashboard will load if users are logged in, redirect to login if not
app.get("/dashboard", (req, res) => {
  if (req.session.user && req.cookies.user_sid) {
    res.render("dashboard");
  } else {
    res.redirect("/login");
  }
});

// destroys session, cookie and redirects to home if logged in, redirects to login if not
app.get("/logout", (req, res) => {
  if (req.session.user && req.cookies.user_sid) {
    res.clearCookie("user_sid");
    res.redirect("/");
  } else {
    res.redirect("/login");
  }
});

app.use((req, res, next) => {
  res.status(404).send("404 pal");
});

module.exports = app;
