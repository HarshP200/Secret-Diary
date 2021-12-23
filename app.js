//jshint esversion:6

require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const date = require(__dirname + "/date.js");
const path = require('path');
const multer = require("multer");

var day = date.getDateAndTime();

const image_name = [];


const storage = multer.diskStorage({
    destination: './public/uploads/',
    filename: function(req, file, cb) {
        image_name.push(file.fieldname + '-' + Date.now() + path.extname(file.originalname));
        cb(null, image_name[image_name.length - 1]);
    }
});


const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5000000
    },
    fileFilter: function(req, file, cb) {
        checkFileType(file, cb);
    }
}).single('myImage');


function checkFileType(file, cb) {

    const filetypes = /jpeg|jpg|png|gif/;

    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());

    const mimetype = filetypes.test(file.mimetype);

    if (mimetype && extname) {
        return cb(null, true);
    } else {
        cb('Error: Images Only!');
    }
}


mongoose.connect("mongodb://localhost:27017/PersonalDiaries", {
    useNewUrlParser: true,
    useUnifiedTopology: true
});


const storySchema = {
    title: String,
    content: String,
    image: String
};

const story1 = mongoose.model("tempStory", storySchema);

const StoryListSchema = {
    name: String,
    diary_data: [storySchema]
};


const List = mongoose.model("Diary_contents", StoryListSchema);


const app = express();

app.use(express.static('public'));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: true }));

app.use(session({
    secret: process.env.SECRET,
    resave: false,
    saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());


const userSchema = new mongoose.Schema({
    email: String,
    password: String
});

userSchema.plugin(passportLocalMongoose);


const User = new mongoose.model("User", userSchema);


passport.use(User.createStrategy());

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());



app.get('/', function(req, res) {
    if (req.isAuthenticated()) {
        res.redirect("/home");
    } else {
        res.render("start");
    }
});


app.get('/login', function(req, res) {
    if (req.isAuthenticated()) {
        res.redirect("/home");
    } else {
        res.render("login");
    }
});

app.get('/register', function(req, res) {
    if (req.isAuthenticated()) {
        res.redirect("/home");
    } else {
        res.render("register");
    }
});

app.get('/logout', function(req, res) {
    req.logout();
    res.redirect('/');
});



app.get('/home', function(req, res) {

    if (!req.isAuthenticated()) {
        res.redirect("/login");
    } else {
        day = date.getDateAndTime();
        res.render('home', {
            day: day
        });
    }
});

app.get('/diary', function(req, res) {

    if (!req.isAuthenticated()) {
        res.redirect("/login");
    } else {

        day = date.getDateAndTime();

        List.findOne({
            name: req.user.username
        }, function(err, result) {

            if (err) {
                res.render('home'), {
                    day: day,
                    msg: err
                }
            }

            if (!result) {
                res.render('home', {
                    day: day,
                    msg: "Nothing in the Diary"
                });
            } else {
                res.render('diary', {
                    stories: result.diary_data
                });


            }

        });
    }
});



app.post('/register', function(req, res) {

    User.register({ username: req.body.username }, req.body.password, function(err, user) {
        if (err) {
            console.log(err);
            res.redirect('/register');
        } else {
            passport.authenticate("local")(req, res, function() {
                res.redirect('/login');
            });
        }
    });

});


app.post('/login', function(req, res) {

    const user = new User({
        username: req.body.username,
        password: req.body.password
    });

    req.login(user, function(err) {
        if (err) {
            console.log(err);
        } else {
            passport.authenticate("local")(req, res, function() {
                res.redirect('/home');
            });
        }
    });

});


app.post('/home', (req, res) => {

    const user_name = req.user.username;

    upload(req, res, (err) => {
        day = date.getDateAndTime();
        if (err) {
            res.render('home', {
                day: day,
                msg: err
            });
        } else {

            if (req.file == undefined) {


                if (req.body.todays_secret == "") {
                    res.render('home', {
                        day: day,
                        msg: "Empty Input"
                    });
                } else {

                    List.findOne({
                        name: user_name
                    }, function(err, result) {
                        if (err) {
                            res.render('home', {
                                day: day,
                                msg: err
                            });
                        }

                        const story = new story1({
                            title: day,
                            content: req.body.todays_secret
                        });

                        if (!result) {

                            const list = new List({
                                name: user_name,
                                diary_data: story
                            });
                            list.save(function(err) {
                                if (!err) {
                                    res.render('home', {
                                        day: day,
                                        msg: "Diary Updated"
                                    });
                                } else {
                                    res.render('home', {
                                        day: day,
                                        msg: err
                                    });
                                }
                            });
                        } else {

                            result.diary_data.push(story);
                            result.save();
                            res.render('home', {
                                day: day,
                                msg: "Diary Updated"
                            });

                        }
                    });

                }


            } else {


                List.findOne({
                    name: user_name
                }, function(err, result) {
                    if (err) {
                        res.render('home', {
                            day: day,
                            msg: err
                        });
                    }
                    const story = new story1({
                        title: day,
                        content: req.body.todays_secret,
                        image: image_name[image_name.length - 1]
                    });
                    if (!result) {

                        const list = new List({
                            name: user_name,
                            diary_data: story
                        });

                        List.save(function(err) {
                            if (!err) {
                                res.render('home', {
                                    day: day,
                                    msg: "Diary and Image Updated"
                                });
                            } else {
                                res.render('home', {
                                    day: day,
                                    msg: err
                                });
                            }
                        });
                    } else {
                        result.diary_data.push(story);
                        result.save();
                        res.render('home', {
                            day: day,
                            msg: "Diary and Image Updated"
                        });
                    }
                });

            }
        }
    });


});


app.listen(process.env.PORT || 3000, function() {
    console.log("Server started on port 3000");
});