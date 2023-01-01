//Gabrielius Savickis - G00385942
/* DCWA Project*/
const express = require('express')
const bodyParser = require("body-parser");
const cors = require('cors');
const mysql = require('promise-mysql');
const app = express();
const { check, validationResult } = require('express-validator');
const MongoClient = require('mongodb').MongoClient;

app.set('view engine', 'ejs')
var pool;

//parse application
app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())
app.use(cors());

//Connection to mysql
mysql.createPool({
    connectionLimit: 3,
    host: "localhost",
    user: "root",
    password: "",
    database: 'proj2022'
})
    .then(p => {
        pool = p
    }).catch(e => {
        console.log("pool error:" + e)
    });

// Home Page
app.get('/', (req, res) => {
    res.render("home", { errors: undefined });
});

// Employee List Page
app.get('/employees', (req, res) => {
    pool.query("select * from employee").then((d) => {
        res.render("employees", { employees: d })
    }).catch((error) => {
        res.send(error)
    })
});

// Edit Employee Page
app.get('/employees/edit/:eid',
    (req, res) => {
        pool.query("SELECT * FROM employee e WHERE e.eid = '" + req.params.eid + "'").then((d) => {
            res.render("editEmployee", { e: d[0], errors: undefined })
        }).catch((error) => {
            res.send(error)
        })
    }
);

// Edit Requirements
/*
• EID is not editable.
• Name should be a minimum of 5 characters.
• Role should be Manager or Employee.
• Salary should be > 0
*/
app.post('/employees/edit/:eid',
    [check("name").isLength({ min: 5 }).withMessage("Employee Name must be 5 characters long")],
    [check("role").isIn(["Manager", "Employee"]).withMessage("Role can be either Manager or Employer")],
    [check("salary").isFloat({ gt: 0 }).withMessage("Salary must be > 0")],
    (req, res) => {
        const errors = validationResult(req)
        let data = {};
        data.eid = req.params.eid;
        data.role = req.body.role;
        data.salary = req.body.salary;
        data.ename = req.body.name;
        // If data is incorrect stays on editEmployee page, otherwise UPDATE data to table and redirect to employees page
        if (!errors.isEmpty()) {
            res.render("editEmployee", { e: data, errors: errors.errors })
        }
        else {
            pool.query(`UPDATE employee SET ename='${req.body.name}', role='${req.body.role}', salary='${req.body.salary}' WHERE eid = '${req.params.eid}'`).then((d) => {
                res.redirect("/employees")
            }).catch((error) => {
                res.send(error)
            })
        }
    }
);

// Deptartments page
app.get('/departments', (req, res) => {
    pool.query("SELECT dept.did,dept.dname,loc.county,dept.budget FROM dept JOIN location AS loc ON loc.lid = dept.lid").then((d) => {
        res.render("departments", { departments: d })
    }).catch((error) => {
        res.send(error)
    })
});

// Delete department page
app.get('/departments/delete/:did', (req, res) => {
    pool.query(`DELETE FROM dept WHERE did = '${req.params.did}';`).then((d) => {
        res.redirect("/departments")
    }).catch(() => {
        //status 400 specifies HTTP bad request error
        res.status(400).send(
            `<div>
                <h1>Error Message</h1>
                <h2>${req.params.did} has Employees and cannot be deleted</h2>
                <a href="/departments">Home</a>
            </div>`)
    })
});

/* MongoDB */
const url = 'mongodb+srv://Gabi:dcwa@clusterdcwa.dzyr67o.mongodb.net/test';
const dbName = 'employeesDB'
const colName = 'employees'
var employeesDB
var employees

// Connection to MongoDB
MongoClient.connect(url, { useNewUrlParser: true })
    .then((client) => {
        employeesDB = client.db(dbName)
        employees = employeesDB.collection(colName)
    })
    .catch((error) => {
        console.log(error)
    });

// function to retreive employees and add to array
function getEmployees() {
    return new Promise((resolve, reject) => {
        var array = employees.find()
        array.toArray()
            .then((documents) => {
                resolve(documents)
            })
            .catch((error) => {
                reject(error)
            })
    })
}

// MongoDB Employees page
app.get('/employeesMongoDB', (req, res) => {
    getEmployees()
        .then((documents) => {
            res.render('employeesMongo', { employees: documents })
        })
        .catch((error) => {
            res.send(error)
        })
});


//function to add Employee
function addEmployee(_id, phone, email) {
    return new Promise((resolve, reject) => {
        employees.insertOne({ "_id": _id, "phone": phone, "email": email })
            .then((result) => {
                resolve(result)
            })
            .catch((error) => {
                reject(error)
            })
    })
}

// Add Employee (MongoDB) page
app.get('/addEmployee', (req, res) => {
    res.render("addEmployee")
});

app.post('/addEmployee', (req, res) => {
    addEmployee(req.body._id, req.body.phone, req.body.email)
        .then((result) => {
            res.redirect("/employeesMongoDB")
        })
        .catch((error) => {
            res.send(error)
        })
});

console.log("Working")

// Listening to port 3000
app.listen(3000, () => {
    console.log("Listening on port 3000")
});