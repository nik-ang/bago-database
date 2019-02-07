const fs = require('fs');
const server = require('../../server');


module.exports = class Report {
    constructor(name = "String", queryName = "String", requiresAccount = true) {
        this.name = name;
        this.query = fs.readFileSync(`./queries/${queryName}`).toString();
        this.requiresAccount = requiresAccount;
        this.app = server.app;
        this.bagodb = server.bagodb;
    }

    handleRequest() {

        var app = this.app;
        var bagodb = this.bagodb;
        var query = this.query;
        var name = this.name;
        var requiresAccount = this.requiresAccount

        app.get(`/${this.name}`, function(req, res) {

            var isAllowed = function(signedIn) {
                if (requiresAccount) {
                    if (signedIn) {
                        return true;
                    } else {
                        return false;
                    }
                } else {
                    return true;
                }
            }

            if (isAllowed(req.session.signedIn)) {
                //Show Report
                bagodb.query(query, function(error, result) {
                    if (error) throw error;
                    var queryResult = JSON.stringify(result);
                    res.render(
                        `reports/${name}.ejs`, {
                        queryResult: queryResult,
                        admindashboard: req.session.isadmin
                        }
                    );
                });
            } else {
                res.redirect('login');
            }
        });
        
    }
}