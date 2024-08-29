const port = 5000;

const express = require("express");
const cors = require("cors");
const mysql = require("mysql");
const path = require("path");
const cookieParser = require("cookie-parser");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const multer = require("multer");

const app = express();
app.use(cors());
app.use(express.json());
app.use(cookieParser());
app.use(express.static("/Uploads"));

const database = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "",
    database: "bank_management_system"
});

database.connect((error) => {
    if(error)
    {
        console.log("Error: "+error);
        throw error;
    }
    else
    {
        console.log("database connect...");
    }
});

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "Uploads");
    },
    filename: (req, file, cb) => {
        cb(null, file.fieldname+"_"+Date.now()+path.extname(file.originalname));
    }
});

const upload = multer({storage: storage});

// api for new account of admin:
app.post("/admin/new", upload.single("image"), async(req, res) => {
    const hashPass = await bcrypt.hash(req.body.password, 10);
    const sql = "select * from admin where email=?";
    database.query(sql, [req.body.email], (error, r) => {
        if(error)
        {
            console.log("Error: "+error);
            return res.status(404).json(error);
        }
        else if(r.length===0)
        {
            const sql = "insert into admin (name, email, password, image) values (?)";
            const values = [
                req.body.name,
                req.body.email,
                hashPass,
                req.file.filename
            ];
            database.query(sql, [values], (error, r) => {
                if(error)
                {
                    console.log("Error: "+error);
                    return res.status(404).json(error);
                }
                res.status(201).json({message: `Welcome ${req.body.name}.`});
            });
        }
        else
        {
            res.status(400).json({message: "email already existed"});
        }
    });
});

// api for admin login:
app.post("/admin/login", (req, res) => {
    const sql = "select * from admin where email=?";
    database.query(sql, [req.body.email], (error, r) => {
        if(error)
        {
            console.log("Error: "+error);
            return res.status(404).json(error);
        }
        else if(r.length===0)
        {
            return res.status(400).json({message: "wrong email."});
        }
        const admin = r[0];
        bcrypt.compare(req.body.password, admin.password, (error, isMatch) => {
            if(error)
            {
                console.log("Error: "+error);
                return res.status(404).json(error);
            }
            else if(!isMatch)
            {
                return res.status(400).json({message: "wrong password"});
            }
            const token = jwt.sign({id: admin.id}, "key", {expiresIn: "1d"});
            res.cookie("token", token);
            res.status(201).json({message: `Hello ${admin.name},`});
        });
    });
});

// api for view profile:
app.get("/admin/profile/:token", async(req, res) => {
    const decode = await jwt.verify(req.params.token, "key");
    const sql = "select * from admin where id=?";
    database.query(sql, [decode.id], (error, r) => {
        if(error)
        {
            console.log("Error: "+error);
            return res.status(404).json(error);
        }
        res.status(201).json({data: r});
    });
});

// api for create new branch:
app.post("/create-branch/:token", async(req, res) => {
    const decode = await jwt.verify(req.params.token, "key");
    const sql = "select * from admin where id=?";
    database.query(sql, [decode.id], (error, r) => {
        if(error)
        {
            console.log("Error: "+error);
            return res.status(404).json(error);
        }
        else if(r.length != 0)
        {
            const sql = "insert into branches (name, city, assets) values (?)";
            const values = [
                req.body.name,
                req.body.city,
                req.body.assets
            ];
            database.query(sql, [values], (error, r) => {
                if(error)
                {
                    console.log("Error: "+error);
                    return res.status(404).json(error);
                }
                res.status(201).json({message: "branch creation successful."});
            });
        }
    });
});

// api for get a single branch by id:
app.get("/branch/:name", (req, res) => {
    const sql = "select * from branches where name=?";
    database.query(sql, [req.params.name], (error, r) => {
        if(error)
        {
            console.log("Error: "+error);
            return res.status(404).json(error);
        }
        else if(r.length===0)
        {
            return res.status(400).json({message: "branch not found"});
        }
        res.status(201).json({data: r});
    });
});

// api for get all branch:
app.get("/all-branch", (req, res) => {
    const sql = "select * from branches";
    database.query(sql, (error, r) => {
        if(error)
        {
            console.log("Error: "+error);
            return res.status(404).json(error);
        }
        res.status(201).json({data: r});
    });
});

// api for update branch:
app.post("/update-branch/:id/:token", async(req, res) => {
    const decode = await jwt.verify(req.params.token, "key");
    const sql = "select * from admin where id=?";
    database.query(sql, [decode.id], (error, r) => {
        if(error)
        {
            console.log("Error: "+error);
            return res.status(404).json(error);
        }
        else if(r.length != 0)
        {
            const sql = "update branches set city=?, assets=? where id=?";
            const values = [
                req.body.city,
                req.body.assets
            ];
            database.query(sql, [...values, req.params.id], (error, r) => {
                if(error)
                {
                    console.log("Error: "+error);
                    return res.status(404).json(error);
                }
                res.status(201).json({message: "branch update successful."});
            });
        }
    });
});

// api for delete branches:
app.delete("/delete-branch/:id", (req, res) => {
    const sql = "delete from branches where id=?";
    database.query(sql, [req.params.id], (error, r) => {
        if(error)
        {
            console.log("Error: "+error);
            return res.status(404).json(error);
        }
        res.status(201).json({message: "branch delete successful."});
    });
});

// api for new employee:
app.post("/new-employee/:token", async(req, res) => {
    const hashPass = await bcrypt.hash(req.body.password, 10);
    const decode = await jwt.verify(req.params.token, "key");
    const sql = "select * from admin where id=?";
    database.query(sql, [decode.id], (error, r) => {
        if(error)
        {
            console.log("Error: "+error);
            return res.status(404).json(error);
        }
        else if(r.length != 0)
        {
            const sql = "insert into employees (name, phoneNumber, managerId, startDate, password) values (?)";
            const values = [
                req.body.name,
                req.body.phoneNumber,
                req.body.managerId,
                req.body.startDate,
                hashPass
            ];
            database.query(sql, [values], (error, r) => {
                if(error)
                {
                    console.log("Error: "+error);
                    return res.status(404).json(error);
                }
                res.status(201).json({message: `welcome ${req.body.name}.`});
            });
        }
    });
});

// api for get a single employee details:
app.get("/employee/:id", (req, res) => {
    const sql = "select * from employees where id=?";
    database.query(sql, [req.params.id], (error, r) => {
        if(error)
        {
            console.log("Error: "+error);
            return res.status(404).json(error);
        }
        else if(r.length===0)
        {
            return res.status(400).json({message: "employee not found"});
        }
        res.status(201).json({data: r});
    });
});

// api for get manager by his/her id:
app.get("/manager/:id", (req, res) => {
    const sql = "select * from employees where id=?";
    database.query(sql, [req.params.id], (error, r) => {
        if(error)
        {
            console.log("Error: "+error);
            return res.status(404).json(error);
        }
        else if(r.length===0)
        {
            return res.status(400).json({message: "employee not found"});
        }
        res.status(201).json({data: r});
    });
});

// api for get all employees:
app.get("/all-employees", (req, res) => {
    const sql = "select * from employees";
    database.query(sql, (error, r) => {
        if(error)
        {
            console.log("Error: "+error);
            return res.status(404).json(error);
        }
        res.status(201).json({data: r});
    });
});

// api for update employee:
app.put("/update-employee/:id/:token", async(req, res) => {
    const hashPass = await bcrypt.hash(req.body.password, 10);
    const decode = await jwt.verify(req.params.token, "key");
    const sql = "select * from admin where id=?";
    database.query(sql, [decode.id], (error, r) => {
        if(error)
        {
            console.log("Error: "+error);
            return res.status(404).json(error);
        }
        else if(r.length != 0)
        {
            const sql = "update employees set name=?, managerId=?, password=? where id=?";
            const values = [
                req.body.name,
                req.body.managerId,
                hashPass
            ];
            database.query(sql, [...values, req.params.id], (error, r) => {
                if(error)
                {
                    console.log("Error: "+error);
                    return res.status(404).json(error);
                }
                res.status(201).json({message: "employee update successful."});
            });
        }
    });
});

// api for delete employee account:
app.delete("/delete-employee/:id", (req, res) => {
    const sql = "delete from employees where id=?";
    database.query(sql, [req.params.id], (error, r) => {
        if(error)
        {
            console.log("Error: "+error);
            return res.status(404).json(error);
        }
        res.status(201).json({message: "employee account delete successful."});
    });
});

// api for create new customer account:
app.post("/customer/signup", async(req, res) => {
    const hashPass = await bcrypt.hash(req.body.password, 10);
    const sql = "insert into customers (name, email, street, city, password) values (?)";
    const values = [
        req.body.name,
        req.body.email,
        req.body.street,
        req.body.city,
        hashPass
    ];
    database.query(sql, [values], (error, r) => {
        if(error)
        {
            console.log("Error: "+error);
            return res.status(404).json(error);
        }
        res.status(201).json({message: `welcome ${req.body.name}.`});
    });
});

// api for customer login:
app.post("/customer/login", (req, res) => {
    const sql = "select * from customers where email=?";
    database.query(sql, [req.body.email], (error, r) => {
        if(error)
        {
            console.log("Error: "+error);
            return res.status(404).json(error);
        }
        else if(r.length===0)
        {
            return res.status(400).json({message: "wrong email."});
        }
        const customer = r[0];
        bcrypt.compare(req.body.password, customer.password, (error, isMatch) => {
            if(error)
            {
                console.log("Error: "+error);
                return res.status(404).json(error);
            }
            else if(!isMatch)
            {
                return res.status(400).json({message: "wrong password"});
            }
            const token = jwt.sign({id: customer.id}, "key", {expiresIn: "1d"});
            res.cookie("token", token);
            res.status(201).json({message: `Hello ${customer.name},`});
        });
    });
});

// api for customer view profile:
app.get("/customer/profile/:token", async(req, res) => {
    const decode = await jwt.verify(req.params.token, "key");
    const sql = "select * from customers where id=?";
    database.query(sql, [decode.id], (error, r) => {
        if(error)
        {
            console.log("Error: "+error);
            return res.status(404).json(error);
        }
        res.status(201).json({data: r});
    });
});

// api for update profile of customer:
app.put("/update/customer-profile/:token", async(req, res) => {
    const decode = await jwt.verify(req.params.token, "key");
    const sql = "update customers set name=?, street=?, city=? where id=?";
    const values = [
        req.body.name,
        req.body.street,
        req.body.city
    ];
    database.query(sql, [...values, decode.id], (error, r) => {
        if(error)
        {
            console.log("Error: "+error);
            return res.status(404).json(error);
        }
        res.status(201).json({message: "update successful."});
    });
});

// api for change password of customer:
app.put("/customer/change-password", async(req, res) => {
    const hashPass = await bcrypt.hash(req.body.password, 10);
    const sql = "update customers set password=? where email=?";
    database.query(sql, [...hashPass, req.body.email], (error, r) => {
        if(error)
        {
            console.log("Error: "+error);
            return res.status(404).json(error);
        }
        else if(r.length === 0)
        {
            return res.status(400).json({message: "email not found."});
        }
        res.status(201).json({message: "change password successful."});
    });
});

// api for delete customer account:
app.delete("/customer/delete/:token", async(req, res) => {
    const decode = await jwt.verify(req.params.token, "key");
    const sql = "delete from customers where id=?";
    database.query(sql, [decode.id], (error, r) => {
        if(error)
        {
            console.log("Error: "+error);
            return res.status(404).json(error);
        }
        res.status(201).json({message: "account delete successful."});
    });
});

// api for get all customers account:
app.get("/customers", (req, res) => {
    const sql = "select * from customers";
    database.query(sql, (error, r) => {
        if(error)
        {
            console.log("Error: "+error);
            return res.status(404).json(error);
        }
        res.status(201).json({data: r});
    });
});

// api for get a single customer:
app.get("/customer/:id", (req, res) => {
    const sql = "select * from customers where id=?";
    database.query(sql, [req.params.id], (error, r) => {
        if(error)
        {
            console.log("Error: "+error);
            return res.status(404).json(error);
        }
        res.status(201).json({data: r});
    });
});

// api for create new account:
app.post("/new-account/:token", async(req, res) => {
    const decode = await jwt.verify(req.params.token, "key");
    const sql = "select * from admin where id=?";
    database.query(sql, [decode.id], (error, r) => {
        if(error)
        {
            console.log("Error: "+error);
            return res.status(404).json(error);
        }
        else if(r.length > 0)
        {
            const sql = "insert into accounts (balance, lastAccessed) values (?)";
            const values = [
                req.body.balance,
                req.body.lastAccessed
            ];
            database.query(sql, [values], (error, r) => {
                if(error)
                {
                    console.log("Error: "+error);
                    return res.status(404).json(error);
                }
                res.status(201).json({message: "new account create successful."});
            });
        }
    });
});

// api for get a single account:
app.get("/account/:id", (req, res) => {
    const sql = "select * from accounts where id=?";
    database.query(sql, [req.params.id], (error, r) => {
        if(error)
        {
            console.log("Error: "+error);
            return res.status(404).json(error);
        }
        else if(r.length > 0)
        {
            return res.status(201).json({data: r});
        }
        res.status(201).json({message: "account not found."});
    });
});

// api for get all accounts:
app.get("/accounts", (req, res) => {
    const sql = "select * from accounts";
    database.query(sql, (error, r) => {
        if(error)
        {
            console.log("Error: "+error);
            return res.status(404).json(error);
        }
        else if(r.length > 0)
        {
            return res.status(201).json({data: r});
        }
        res.status(201).json({message: "account not found."});
    });
});

// api for update accounts:
app.put("/update-account/:id/:token", async(req, res) => {
    const decode = await jwt.verify(req.params.token, "key");
    const sql = "select * from admin where id=?";
    database.query(sql, [decode.id], (error, r) => {
        if(error)
        {
            console.log("Error: "+error);
            return res.status(404).json(error);
        }
        else if(r.length > 0)
        {
            const sql = "update accounts set balance=?, lastAccessed=? where id=?";
            const values = [
                req.body.balance,
                req.body.lastAccessed
            ];
            database.query(sql, [...values, req.params.id], (error, r) => {
                if(error)
                {
                    console.log("Error: "+error);
                    return res.status(404).json(error);
                }
                res.status(201).json({message: "account update successful."});
            });
        }
    });
});

// api for delete account:
app.delete("/account/delete/:id", (req, res) => {
    const sql = "delete from accounts where id=?";
    database.query(sql, [req.params.id], (error, r) => {
        if(error)
        {
            console.log("Error: "+error);
            return res.status(404).json(error);
        }
        else if(r.length===0)
        {
            return res.status(404).json({message: "account not found."});
        }
        res.status(200).json({message: "account delete successful."});
    });
});

// api for create new customer account:
app.post("/new-customer-account/:token", async(req, res) => {
    const decode = await jwt.verify(req.params.token, "key");
    const sql = "select * from admin where id=?";
    database.query(sql, [decode.id], (error, r) => {
        if(error)
        {
            console.log("Error: "+error);
            return res.status(404).json(error);
        }
        else if(r.length > 0)
        {
            const sql = "insert into customer_accounts (customerId, accountNumber) values (?)";
            const values = [
                req.body.customerId,
                req.body.accountNumber
            ];
            database.query(sql, [values], (error, r) => {
                if(error)
                {
                    console.log("Error: "+error);
                    return res.status(404).json(error);
                }
                res.status(201).json({message: "customer account create successful."});
            });
        }
    });
});

// api for get all customers accounts:
app.get("/customers-accounts", (req, res) => {
    const sql = "select * from customer_accounts";
    database.query(sql, (error, r) => {
        if(error)
        {
            console.log("Error: "+error);
            return res.status(404).json(error);
        }
        else if(r.length > 0)
        {
            res.status(201).json({data: r});
        }
    });
});

// api for get a single customer account:
app.get("/customer-account/:id", (req, res) => {
    const sql = "select * from customer_accounts where id=?";
    database.query(sql, [req.params.id], (error, r) => {
        if(error)
        {
            console.log("Error: "+error);
            return res.status(404).json(error);
        }
        else if(r.length > 0)
        {
            res.status(201).json({data: r});
        }
    });
});

// api for delete customer account:
app.delete("/delete-customer-account/:id/:token", async(req, res) => {
    const decode = await jwt.verify(req.params.token, "key");
    const sql = "select * from admin where id=?";
    database.query(sql, [decode.id], (error, r) => {
        if(error)
        {
            console.log("Error: "+error);
            return res.status(404).json(error);
        }
        else if(r.length > 0)
        {
            const sql = "delete from customer_accounts where id=?";
            database.query(sql, [req.params.id], (error, r) => {
                if(error)
                {
                    console.log("Error: "+error);
                    return res.status(404).json(error);
                }
                res.status(201).json({message: "customer account delete successful."});
            });
        }
    });
});

// api for create new loan:
app.post("/new-loan/:token", async(req, res) => {
    const decode = await jwt.verify(req.params.token, "key");
    const sql = "select * from admin where id=?";
    database.query(sql, [decode.id], (error, r) => {
        if(error)
        {
            console.log("Error: "+error);
            return res.status(404).json(error);
        }
        else if(r.length > 0)
        {
            const sql = "insert into loans (branchId, amount) values (?)";
            const values = [
                req.body.branchId,
                req.body.amount
            ];
            database.query(sql, [values], (error, r) => {
                if(error)
                {
                    console.log("Error: "+error);
                    return res.status(404).json(error);
                }
                res.status(201).json({message: "new loan create successful."});
            });
        }
    });
});

// api for get a single loan:
app.get("/loan/:id", (req, res) => {
    const sql = "select * from loans where id=?";
    database.query(sql, [req.params.id], (error, r) => {
        if(error)
        {
            console.log("Error: "+error);
            return res.status(404).json(error);
        }
        else if(r.length > 0)
        {
            return res.status(201).json({data: r});
        }
        res.status(201).json({message: "loan not found."});
    });
});

// api for get all loans:
app.get("/loans", (req, res) => {
    const sql = "select * from loans";
    database.query(sql, (error, r) => {
        if(error)
        {
            console.log("Error: "+error);
            return res.status(404).json(error);
        }
        else if(r.length > 0)
        {
            return res.status(201).json({data: r});
        }
        res.status(201).json({message: "loans not found."});
    });
});

// api for update loans:
app.put("/update-loans/:id/:token", async(req, res) => {
    const decode = await jwt.verify(req.params.token, "key");
    const sql = "select * from admin where id=?";
    database.query(sql, [decode.id], (error, r) => {
        if(error)
        {
            console.log("Error: "+error);
            return res.status(404).json(error);
        }
        else if(r.length > 0)
        {
            const sql = "update loans set branchId=?, amount=? where id=?";
            const values = [
                req.body.branchId,
                req.body.amount
            ];
            database.query(sql, [...values, req.params.id], (error, r) => {
                if(error)
                {
                    console.log("Error: "+error);
                    return res.status(404).json(error);
                }
                res.status(201).json({message: "loan update successful."});
            });
        }
    });
});

// api for delete loan:
app.delete("/loan/delete/:id", (req, res) => {
    const sql = "delete from loans where id=?";
    database.query(sql, [req.params.id], (error, r) => {
        if(error)
        {
            console.log("Error: "+error);
            return res.status(404).json(error);
        }
        else if(r.length===0)
        {
            return res.status(404).json({message: "loan not found."});
        }
        res.status(200).json({message: "loan delete successful."});
    });
});

// api for create new loan customer account:
app.post("/new-loan-customer-account/:token", async(req, res) => {
    const decode = await jwt.verify(req.params.token, "key");
    const sql = "select * from admin where id=?";
    database.query(sql, [decode.id], (error, r) => {
        if(error)
        {
            console.log("Error: "+error);
            return res.status(404).json(error);
        }
        else if(r.length > 0)
        {
            const sql = "insert into loan_customers (loanNumber, customerId) values (?)";
            const values = [
                req.body.loanNumber,
                req.body.customerId
            ];
            database.query(sql, [values], (error, r) => {
                if(error)
                {
                    console.log("Error: "+error);
                    return res.status(404).json(error);
                }
                res.status(201).json({message: "loan customer account create successful."});
            });
        }
    });
});

// api for get all loan customers accounts:
app.get("/loan-customers-accounts", (req, res) => {
    const sql = "select * from loan_customers";
    database.query(sql, (error, r) => {
        if(error)
        {
            console.log("Error: "+error);
            return res.status(404).json(error);
        }
        else if(r.length > 0)
        {
            res.status(201).json({data: r});
        }
    });
});

// api for get a single loan customer account:
app.get("/loan-customer-account/:id", (req, res) => {
    const sql = "select * from loan_customers where id=?";
    database.query(sql, [req.params.id], (error, r) => {
        if(error)
        {
            console.log("Error: "+error);
            return res.status(404).json(error);
        }
        else if(r.length > 0)
        {
            res.status(201).json({data: r});
        }
    });
});

// api for delete customer account:
app.delete("/delete-loan-customer-account/:id/:token", async(req, res) => {
    const decode = await jwt.verify(req.params.token, "key");
    const sql = "select * from admin where id=?";
    database.query(sql, [decode.id], (error, r) => {
        if(error)
        {
            console.log("Error: "+error);
            return res.status(404).json(error);
        }
        else if(r.length > 0)
        {
            const sql = "delete from loan_customers where id=?";
            database.query(sql, [req.params.id], (error, r) => {
                if(error)
                {
                    console.log("Error: "+error);
                    return res.status(404).json(error);
                }
                res.status(201).json({message: "loan customer account delete successful."});
            });
        }
    });
});

// create new payments:
app.post("/make-payment", (req, res) => {
    const sql = "insert into payments (loanNumber, paymentDate, amount) values(?)";
    const values = [
        req.body.loanNumber,
        req.body.paymentDate,
        req.body.amount
    ];
    database.query(sql, [values], (error, r) => {
        if(error)
        {
            console.log("Error: "+error);
            return res.status(404).json(error);
        }
        res.status(201).json({message: "payment successful."});
    });
});

// api for get a single payment:
app.get("/payment/:id", (req, res) => {
    const sql = "select * from payments where id=?";
    database.query(sql, [req.params.id], (error, r) => {
        if(error)
        {
            console.log("Error: "+error);
            return res.status(404).json(error);
        }
        else if(r.length > 0)
        {
            res.status(201).json({data: r});
        }
    });
});

// api for all payments:
app.get("/payments", (req, res) => {
    const sql = "select * from payments";
    database.query(sql, (error, r) => {
        if(error)
        {
            console.log("Error: "+error);
            return res.status(404).json(error);
        }
        else if(r.length > 0)
        {
            res.status(201).json({data: r});
        }
    });
});

app.listen(port, "0.0.0.0", () => {
    console.log("server running...");
});