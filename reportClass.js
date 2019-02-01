class Report {
    constructor(application, name, queryName, requiresAccount = true, requieresAdmin = false) {
        this.app = application;
        this.name = name;
        this.query = fs.readFileSync(`queries/${queryName}`).toString();
        this.report();
    }

    report() {
        app.get(`/${this.name}`, function(req, res) {
            if (this.requiresAccount) {
                if (this.requieresAdmin) {
                    if (req.session.isadmin && req.session.signedIn) {
                        //render report
                        server.bagodb.query(this.query, function(error, result) {
                            if (error) throw error;
                            result = JSON.stringify(result);
                            res.render(`reports/${this.name}`, {
                                result: result,
                                admindashboard: req.session.isadmin
                            });
                        });
                    } else { 
                        res.redirect('login');
                    }
                } else {
                    if (req.session.signedIn) {
                        //render report
                        bagodb.query(this.query, function(error, result) {
                            if (error) throw error;
                            result = JSON.stringify(result);
                            res.render(`reports/${this.name}`, {
                                result: result,
                                admindashboard: req.session.isadmin
                            });
                        });
                    } else {
                        res.redirect('login');
                    }
                }
            } else {
                //render report
                bagodb.query(this.query, function(error, result) {
                    if (error) throw error;
                    result = JSON.stringify(result);
                    res.render(`reports/${this.name}`, {
                        result: result,
                        admindashboard: req.session.isadmin
                    });
                });
            }
        });
    }
};