const fs = require('fs');
const server = require('../../server');
const Report = require('./reportClass');

module.exports = class LongReport extends Report{
    constructor(name = "String", queryName = "String", requiresAccount = true, initialFilter = "Default", initialValue = "Default") {
        super(name, queryName, requiresAccount);
        this.initialFilter = initialFilter;
        this.initialValue = initialValue;
    }

    setFilerList(filterList = {}) {
        this.filterList = filterList;
    }

    handleRequest() {

        var app = this.app;
        var bagodb = this.bagodb;
        var query = this.query;
        var name = this.name;
        var requiresAccount = this.requiresAccount
        var filter = this.initialFilter;
        var value = this.initialValue;
        var filterList = this.filterList;
        var filterQueries = {};
        var filterResults = {};

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

            for(var list in filterList) {
                filterQueries[list] = fs.readFileSync(`queries/${filterList[list]}`).toString();
            }

            function queryAndWait(query, callback) {
                bagodb.query(query, function(error, result) {
                    if (error) throw error;
                    filterResults[qu] = JSON.stringify(result);
                });
            }

            for(var qu in filterQueries) {
                bagodb.query(filterQueries[qu], function(error, result) {
                    if (error) throw error;
                    filterResults[qu] = JSON.stringify(result);
                });
            }

            if (isAllowed(req.session.signedIn)) {
                //Show Report

                var whereFilter = `WHERE ${filter} = "${value}"`;
                //Default query... it can be changed through POST request with AJAX
                var queryA = `${query} ${whereFilter}`;
                bagodb.query(queryA, function(error, result) {
                    var renderArgs = {
                        queryResult: JSON.stringify(result),
                        admindashboard: req.session.isadmin
                    }

                    for (var r in filterResults) {
                        renderArgs[r] = JSON.stringify(filterResults[r]);
                    }

                    if (error) throw error;
                    res.render(
                        `reports/${name}.ejs`, renderArgs
                    );
                });
            } else {
                res.redirect('login');
            }
        });

    }
}