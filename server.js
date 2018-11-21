const express = require('express');
const app = express();
const mysql = require('mysql');
const fs = require('fs');
const bodyParser = require('body-parser');
const session = require('express-session');
const nodemailer = require('nodemailer');
const md5 = require('md5');
const stream = require('stream');
const ejs = require('ejs');

/**
 * DATABASE CONNECTION
 */


const bagodb = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "",
    database: "bagodb"
});

bagodb.connect(function (error) {
    if (error) throw error;
    console.log("Connected");
});

/**
 * NODE MAILER
 */

const mailer = nodemailer.createTransport({
    host: "smtp-mail.outlook.com",
    secureConnection: false,
    port: 587,
    tls: {
        ciphers: 'SSLv3'
    },
    auth: {
        user: 'analistamarketing@bago.com.py',
        pass: 'maildeNico2018'
    }
});

/**
 * PORT
 */

app.listen(80, function () {
    console.log("Listening on port " + 80);
});

/**
 * SET, USE & CUSTOM FUNCTIONS
 */

app.set('view engine', 'ejs');
app.use(express.static(__dirname + '/public'));
app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(bodyParser.json());
app.use(session({
    secret: 'somessecretstuff',
    resave: false,
    saveUninitialized: false
}));
app.use(function (req, res, next) {
    if (!req.session.signedIn) {
        req.session.signedIn = false;
    }
    if (!req.session.isadmin) {
        req.session.isadmin = false;
    }
    next();
});

function sendVerificationEmail(name, email, hash, password) {

    var ejsFile = ejs.compile(fs.readFileSync('views/users/verificationemail.ejs').toString());
    var html = ejsFile({
        name: name,
        email: email,
        hash: hash,
        password: password
    });
    var mailOptions = {
        from: 'analistamarketing@bago.com.py',
        to: email,
        subject: 'SIG BAGO: Please Verify E-mail',
        html: html,
    };
    mailer.sendMail(mailOptions, function (error, info) {
        if (error) {
            console.log(error);
        }
    });
}

function sendResetPassword(name, email, hash) {
    var ejsFile = ejs.compile(fs.readFileSync('views/resetpassword.ejs').toString());
    var html = ejsFile({
        name: name,
        email: email,
        hash: hash,
    });
    var mailOptions = {
        from: 'analistamarketing@bago.com.py',
        to: email,
        subject: 'SIG BAGO: Reset Password',
        html: html,
    };
    mailer.sendMail(mailOptions, function (error, info) {
        if (error) {
            console.log(error);
        }
    });
}


/**
 * REQUEST LISTENERS
 */

//LOGIN: GET
app.get('/login', function (req, res) {

    if (req.session.signedIn) {
        res.redirect('/');
    } else {
        res.render('users/login', {
            message: "",
            email: ""
        });
    }
});

//LOGIN: POST
app.post('/login', function (req, res) {
    var email = "";
    if (req.body.user.email) {
        email = req.body.user.email;
    }
    var givenPassword = req.body.user.password;

    bagodb.query('SELECT * FROM sig_users WHERE email  = ' + '"' + req.body.user.email + '"', function (error, result) {
        if (error) throw error;

        //If no result with the given e-mail is found, then INCORRECT USER. Else proceed...
        if (result == "") {
            return res.render('users/login', {
                message: "Usuario incorrecto",
                email: ""
            });

            //check if given password matches the result. If not, INCORRECT PASSWORD...
        } else if (md5(givenPassword) == result[0].password) {

            //check if the E-mail is already verified. If not, E-MAIL IS NOT VERIFIED...
            if (result[0].verified == 0) {
                res.render('users/login', {
                    message: `Su E-mail no está verificado. <a href="/signin/resendemail?email=${email}">Click aquí para reenviar mail de verificación</a>`,
                    email: ""
                });

                /**
                 * If it is, check if account is approved, then
                 * SIGNED IN = TRUE and IS ADMIN = VALUE IN DATABSE
                 */

            } else if (result[0].allowed == 1) {
                req.session.signedIn = true;
                req.session.isadmin = result[0].isadmin;
                res.redirect('/');

                //If not, USER NOT APPROVED
            } else {
                res.render('users/login', {
                    message: "Su usuario aún no ha sido aprobado",
                    email: ""
                });
            }

            //If password is incorrect, reload the page with pre-loaded E-mail
        } else {
            res.render('users/login', {
                message: "Contraseña Incorrecta",
                email: email
            });
        }
    });
});

//LOGOUT
app.get('/logout', function (req, res) {
    //Change SIGNED IN to FALSE.
    req.session.signedIn = false;
    res.redirect('login');
});

//SIGNIN: GET
app.get('/signin', function (req, res) {

    //If user is SIGNED IN, redirect to index, else proceed...
    if (req.session.signedIn) {
        res.redirect('/');
    } else {
        res.render('users/signin', {
            message: ""
        });
    }
});

//SIGNIN: POST
app.post('/signin', function (req, res) {

    //Check if given mail already exists in DATABASE...
    bagodb.query(`SELECT DISTINCT email FROM sig_users WHERE email = '${req.body.user.email}'`, function (error, result) {
        if (error) throw error;

        //If result is not empty, thus, it does exists, reload page with message...
        if (result != "") {
            return res.render('users/signin', {
                message: "An account with this E-mail already exists"
            });

        //If result is empty,
        } else {

            //Check if a Request with given E-mail was already registered...
            bagodb.query(`SELECT DISTINCT email FROM sig_users_requests WHERE email = "${req.body.user.email}"`, function (error, result) {
                if (error) throw error;

                /**
                 * If result is not empty, and no user was found in the previous query, then the request was probably
                 * rejected or the user was deleted by an admin.
                 */

                if (result != "") {
                    res.render('users/signin', {
                        message: "Sorry, this account has been rejected or deleted"
                    });
  
                } else {

                    //First, check if the two passwords match...
                    if (req.body.user.password == req.body.user.confirmpassword) {
                        var name = req.body.user.name;
                        var email = req.body.user.email;
                        //Encrypt the password with md5
                        var password = md5(req.body.user.password);
                        //Generate a random hash by encrypting a random number
                        //Hash is always to remain unkown to the user
                        var randomNum = Math.floor(Math.random() * 1000);
                        var hash = md5(randomNum);

                        //Insert request into USERS and USERS REQUESTS
                        var insertUserSql = `INSERT INTO sig_users (name, email, password, hash) VALUES ("${name}", "${email}", "${password}", "${hash}")`;
                        var insertRequestSql = `INSERT INTO sig_users_requests (name, email) VALUES ("${name}", "${email}")`;

                        //Query
                        bagodb.query(insertUserSql, function (error, result) {
                            if (error) throw error;
                            //Send verification mail with CUSTOM FUNCTION

                            sendVerificationEmail(name, email, hash, password);

                            //QUERY and proceed...
                            bagodb.query(insertRequestSql, function (error, result) {
                                if (error) throw error;
                            });

                            //Render notify.ejs with a message...
                            res.render('users/notify', {
                                message1: `HI ${name.toUpperCase()}, YOUR REQUEST IS ALMOST READY`,
                                message2: `Please verify your E-mail Adress. 
                                <a href="/signin/resendemail?email=${email}">Click here to send verification E-mail again</a>`
                            });
                        });

                    //If passwords don't match...
                    } else {
                        res.render('users/signin', {
                            message: "Passwords don't match"
                        });
                    }
                }
            });
        }
    });
});

//Page to resend verification E-mail
app.get('/signin/resendemail', function (req, res) {
    var email = "";
    if (req.query.email) {
        email = req.query.email;
    }
    res.render('users/resendemail', {
        email: email,
        message: ""
    });
});

//Send the verification E-mail again
app.post('/signin/resendemail', function (req, res) {
    var email = req.body.user.email;
    var password = md5(req.body.user.password);
    var sql = `SELECT * FROM sig_users WHERE email = "${email}" AND password = "${password}"`;
    //Get al necessary data from QUERY
    bagodb.query(sql, function (error, result) {
        if (error) throw error;
        if (result == "") {
            res.render('users/resendemail', {
                email: "",
                message: "E-mail not found"
            });
        } else {
            //Add missing data to CUSTOM FUNCTION and exectue...
            var name = result[0].name;
            var hash = result[0].hash;
            sendVerificationEmail(name, email, hash, password);
            res.redirect('/');
        }
    });
});

//PASSWORD RECOVERY: GET
app.get('/login/passwordrecovery', function (req, res) {
    if (req.session.signedIn) {
        res.redirect('/');
    } else {
        res.render('users/passwordrec/passwordrecovery', {
            email: "",
            message: ""
        });
    }
});

//PASSWORD RECOVERY: POST
app.post('/login/passwordrecovery', function (req, res) {
    var email = req.body.user.email;
    var sql = `SELECT * FROM sig_users WHERE email = "${email}"`;
    //GET ALL INFO FROM E-MAIL
    bagodb.query(sql, function (error, result) {
        if (error) throw error;
        if (result == "") {
            res.redirect('/login/passwordrecovery');
        } else {
            var name = result[0].name;
            var hash = result[0].hash;
            sendResetPassword(name, email, hash);
            res.render('users/notify', {
                message1: "RECOVERY E-MAIL SENT",
                message2: "Change your password"
            });
        }
    });
});

//SET NEW PASSWORD: GET
app.get('/login/setnewpassword', function (req, res) {
    //Receive variables from GET Link
    var name = req.query.name;
    var email = req.query.email;
    var hash = req.query.hash;

    //Query the results from given E-MAIL
    var sql = `SELECT * FROM sig_users WHERE email = "${email}"`;
    bagodb.query(sql, function (error, result) {
        if (error) throw error;
        if (result == "") {
            res.render('users/notify', {
                message1: "ERROR 404",
                message2: "ERROR 404"
            });
        } else {
            if (result[0].name == name && result[0].email == email && result[0].hash == hash) {
                res.cookie('name', name, {expire: 60000, httpOnly: false});
                res.cookie('email', email, {expire: 60000, httpOnly: false});
                res.render('setnewpassword', {
                    message: "",
                });
            } else {
                res.render('users/notify', {
                    message1: "ERROR 404",
                    message2: "ERROR 404"
                });
            }
        }
    });
});

app.post('/login/setnewpassword', function (req, res) {

    console.log(req.cookies);
    res.end();

});


//VERIFY E-mail
app.get('/verifyemail', function (req, res) {
    //Receive variables from the GET Link
    var name = req.query.name;
    var email = req.query.email;
    var password = req.query.password;
    var hash = req.query.hash;

    //Query result from given E-EMAIL...
    var sql = `SELECT * FROM sig_users WHERE email = "${email}"`;
    bagodb.query(sql, function (error, result) {
        if (error) throw error;
        //If result is empty: ERROR
        if (result == "") {
            res.render('users/notify', {
                message1: "ERROR 404",
                message2: "ERROR 404",
            });
        } else {
            //If not empty, check if all values from GET Link match the Results'
            if (result[0].name == name && result[0].email == email && result[0].password == password && result[0].hash == hash) {

                //Change VERIFIED to 1 in DATABASE
                var verifySql = `UPDATE sig_users SET verified = 1 WHERE email = "${email}"`;

                //QUERY and proceed to notify
                bagodb.query(verifySql, function (error, result) {
                    if (error) throw error;
                    res.render('users/notify', {
                        message1: "YOUR E-MAIL IS NOW VERIFIED",
                        message2: '<a href="/login">Proceed to Log In Page</a>'
                    })
                });

                //Because the correct HASH was visibile to the user, generate a new one...
                var randomNum = Math.floor(Math.random() * 1000);
                var newHash = md5(randomNum);
                var updateHashSql = `UPDATE sig_users SET hash = "${newHash}" WHERE email = "${email}"`
                bagodb.query(updateHashSql, function (error, result) {
                    if (error) throw error;
                });

            // If data does not match: ERROR
            } else {
                res.render('users/notify', {
                    message1: "ERROR 404",
                    message2: "ERROR 404"
                });
            }
        }
    })
});

// ALL FOLLOWING GET AND POST FUNCTIONS CHECK IF SIGNED IN = TRUE AND IF IS ADMIN = TRUE
// THE HEADER DISPLAYS THE ADMIN DASHBOARD BUTTON IF ADMIN, AND THE PAGE IS EXCLUSIVE FOR ADMINS

//INDEX: GET
app.get('/', function (req, res) {
    if (req.session.signedIn) {
        res.render('index', {
            admindashboard: req.session.isadmin
        });
    } else {
        res.redirect('login');
    }
});


//VENTAS: GET
app.get('/ventas', function (req, res) {

    if (req.session.signedIn) {
        var sqlSales = fs.readFileSync('queries/sales.sql').toString();

        bagodb.query(sqlSales, function (error, sqlSalesQ) {
            if (error) throw error;
            sqlSales = JSON.stringify(sqlSalesQ);
            res.render(
                'reports/ventas.ejs', {
                    sqlSales: sqlSales,
                    admindashboard: req.session.isadmin
                }
            );
        });
    } else {
        res.redirect('login');
    }
});

//CLOSEUP: GET
app.get('/closeup', function (req, res) {

    if (req.session.signedIn) {
        var sqlCloseup = fs.readFileSync('queries/closeup.sql').toString();
        bagodb.query(sqlCloseup, function (error, sqlCloseupQ) {
            if (error) throw error;
            sqlCloseup = JSON.stringify(sqlCloseupQ);
            res.render(
                'reports/closeup.ejs', {
                    sqlCloseup: sqlCloseup,
                    admindashboard: req.session.isadmin
                }
            );
        });
    } else {
        res.redirect('login');
    }
});

//CLOSEUP-MEDICOS: GET
app.get('/closeup-medicos', function (req, res) {

    if (req.session.signedIn) {
        var whereFilter = 'WHERE desc_labo = "Bago"';
        //Default query... it can be changed through POST request with AJAX
        var sqlCloseupMedicos = fs.readFileSync('queries/closeup-medicos.sql').toString() + ` ${whereFilter}`;

        //Check distinct values to print as Filtering Options...
        var ATCOptions = fs.readFileSync('queries/atcoptions.sql').toString();
        var LabOptions = fs.readFileSync('queries/laboptions.sql').toString();
        
        //Query the previous SQLs and render...
        bagodb.query(LabOptions, function (error, LabOptionsQ) {
            if (error) throw error;
            bagodb.query(ATCOptions, function (error, ATCOptionsQ) {
                if (error) throw error;
                bagodb.query(sqlCloseupMedicos, function (error, sqlCloseupMedicosQ) {
                    if (error) throw error;
                    sqlCloseupMedicos = JSON.stringify(sqlCloseupMedicosQ);
                    ATCOptions = JSON.stringify(ATCOptionsQ);
                    LabOptions = JSON.stringify(LabOptionsQ);
                    res.render(
                        'reports/closeup-medicos.ejs', {
                            sqlCloseupMedicos: sqlCloseupMedicos,
                            ATCOptions: ATCOptions,
                            LabOptions: LabOptions,
                            admindashboard: req.session.isadmin
                        }
                    );
                });
            });
        });
    } else {
        res.redirect('login');
    }
});

//CLOSEUP-MEDICOS: POST
app.post('/closeup-medicos', function (req, res) {
    if (req.session.signedIn) {

        //RECEIVE which field will be filtered and it's value...

        var whereFilter = `WHERE ${req.body.filter} = "${req.body.isEqualTo}"`;

        //Query the same SQL as the GET but change the last filter...
        var sqlCloseupMedicos = fs.readFileSync('queries/closeup-medicos.sql').toString() + ` ${whereFilter}`;

        //Query and SEND info, do not render...
        bagodb.query(sqlCloseupMedicos, function (error, sqlCloseupMedicosQ) {
            if (error) throw error;
            sqlCloseupMedicos = JSON.stringify(sqlCloseupMedicosQ);
            res.send(sqlCloseupMedicos);
            res.end();
        });
    }
});

//IMS: GET
app.get('/ims', function (req, res) {

    if (req.session.signedIn) {
        var sqlIms = fs.readFileSync('queries/ims.sql').toString();
        bagodb.query(sqlIms, function (error, sqlImsQ) {
            if (error) throw error;
            sqlIms = JSON.stringify(sqlImsQ);
            res.render('reports/ims.ejs', {
                sqlIms: sqlIms,
                admindashboard: req.session.isadmin
            });
        });
    } else {
        res.redirect('login');
    }
});

//ADMINDASHBOARD: GET
//EXCLUSIVE FOR ADMINS
app.get('/admindashboard', function (req, res) {
    if (req.session.signedIn && req.session.isadmin) {

        //Query existing and verified users, not admins...
        bagodb.query('SELECT name, email FROM bagodb.sig_users WHERE allowed = 1 AND isadmin = 0', function (error, usersQ) {
            if (error) throw error;
            //Query pending requests that have been verified
            bagodb.query('SELECT name, email FROM bagodb.sig_users WHERE allowed = 0 AND verified = 1', function (error, requestsQ) {
                if (error) throw error;
                //Query all requests from USERS REQUESTS
                
                /**
                 * Note, if this throws values that are not in either of the previous ones, it is
                 * because the E-mail was not verified yet...
                 */

                bagodb.query('SELECT name, email, status FROM sig_users_requests', function (error, requestsStatusQ) {
                    if (error) throw error;
                    res.render('admindashboard.ejs', {
                        usersQ: JSON.stringify(usersQ),
                        requestsQ: JSON.stringify(requestsQ),
                        requestsStatusQ: JSON.stringify(requestsStatusQ),
                        admindashboard: req.session.isadmin
                    });
                })
            });
        });
    } else {
        res.redirect('/');
    }
});

//ACCEPT USER REQUEST
//ONLY POST AND EXCLUSIVE FOR ADMINS

app.post('/acceptUserRequest', function (req, res) {
    if (req.session.signedIn && req.session.isadmin) {
        email = req.body.email;

        //Change ALLOWED to 1 and in USERS REQUESTS change STATUS to ACCEPTED
        bagodb.query(`UPDATE sig_users SET allowed = 1 WHERE email = "${email}"`, function (error, result) {
            if (error) throw error;
            bagodb.query(`UPDATE sig_users_requests SET status = "Accepted" WHERE email = "${email}"`, function (error, result) {
                if (error) throw error;
                res.redirect('/admindashboard');
            });
        });
    } else {
        console.log("Not an Admin");
        res.end();
    }
});

//REJECT USER REQUEST
//ONLY POST AND EXCLUSIVE FOR ADMINS

app.post('/rejectUserRequest', function (req, res) {
    if (req.session.signedIn && req.session.isadmin) {
        email = req.body.email;

        //DELETE user from USERS but keep the REQUEST REGISTERED
        /**
         * This E-mail will not be able to request an account again unless
         * the registered request is deleted
         */

        bagodb.query(`DELETE FROM sig_users WHERE email = "${email}"`, function (error, result) {
            if (error) throw error;
            bagodb.query(`UPDATE sig_users_requests SET status = "Rejected" WHERE email = "${email}"`, function (error, result) {
                if (error) throw error;
                res.redirect('/admindashboard');
            });
        });
    } else {
        console.log("Not an Admin");
        res.end();
    }
});

//DELETE USER
//ONLY POST AND EXCLUSIVE FOR ADMINS

app.post('/deleteUser', function (req, res) {
    if (req.session.signedIn && req.session.isadmin) {
        email = req.body.email;

        //DELETE user buy KEEP the REQUEST REGISTERED
         /**
         * This E-mail will not be able to request an account again unless
         * the registered request is deleted
         */
        bagodb.query(`DELETE FROM sig_users WHERE email = "${email}"`, function (error, result) {
            if (error) throw error;
            bagodb.query(`UPDATE sig_users_requests SET status = "Deleted" WHERE email = "${email}"`, function (error, result) {
                if (error) throw error;
                res.redirect('/admindashboard');
            });
        });
    } else {
        console.log("Not an Admin");
        res.end();
    }
});

//ONLY POST AND EXCLUSIVE FOR ADMINS

app.post('/deleteRequest', function (req, res) {
    if (req.session.signedIn && req.session.isadmin) {
        email = req.body.email;
        //DELETE USER AND REQUEST
        //This E-mail may request an account again...
        bagodb.query(`DELETE FROM sig_users WHERE email = "${email}"`, function (error, result) {
            if (error) throw error;
            bagodb.query(`DELETE FROM sig_users_requests WHERE email = "${email}"`, function (error, result) {
                if (error) throw error;
                res.redirect('/admindashboard');
            });
        });
    } else {
        console.log("Not an Admin");
        res.end();
    }
});