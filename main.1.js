const hbs = require('express-handlebars')
const express = require('express')
const mysql = require('mysql')
const bodyParser = require('body-parser');

const config = require('./config.json');

const SQL_SELECT_EMPLOYEE = "select * from employees limit ? offset ?";
const SQL_SELECT_EMPLOYEE_BY_EMPNO = "select * from employees where emp_no = ?";

const empPool = mysql.createPool(config.employees)
//const playPool = mysql.createPool(config.playstore)

const PORT = parseInt(process.argv[2] || process.env.APP_PORT || 3000);

const app = express();

const db = { };

app.engine('hbs', hbs())
app.set('view engine', 'hbs')
app.set('views', __dirname + '/views');''

app.use(bodyParser.urlencoded());

app.get('/employee/:empId', (req, resp) => {
    const empId = parseInt(req.params.empId);
    empPool.getConnection((err, conn) => {
        conn.query(SQL_SELECT_EMPLOYEE_BY_EMPNO, [ empId ],
            (err, result) => {
                conn.release();
                if (result.length <= 0) {
                    resp.status(404);
                    resp.send("Not found");
                    return;
                }
                console.log('Result: %s %d ', empId, result[0].emp_no);
                console.log(result[0]);
                resp.status(200);
                console.log(result[0].emp_no + " " + typeof(result[0].emp_no) + " " + typeof(result[0]));
                //resp.send(result[0]);
                resp.send(`To Display: ${result[0].emp_no.toString()}, ${result[0].hire_date}, ${result[0]}`);  
            }
        )
    })
})

app.get('/employees', (req, resp) => {
    const limit = parseInt(req.query.limit) || 10;
    const offset = parseInt(req.query.offset) || 0;
    empPool.getConnection((err, conn) => {
        console.error('Error: ', err)
        conn.query(SQL_SELECT_EMPLOYEE, [ limit, offset ],
            (err, result) => {
                conn.release();
                console.error('Error: ', err);
                resp.format({
                    'text/html': () => {
                            resp.status(200);
                            resp.type('text/html');
                            resp.render('employees', { 
                                employees: result, 
                                next_offset: (offset + limit), 
                                prev_offset: (offset - limit), //beware of conrner cases
                                layout: false
                            }
                        );
                    },
                    'application/json': () => {
                        let empUrls = result
                                //.filter(r => (r.emp_no % 2) == 0)
                                .map(r => `/employee/${r.emp_no}`)
                        //for (let r of result) 
                            //empUrls.push(`/employee/${r.emp_no}`);
                        resp.status(200);
                        resp.type('application/json')
                        resp.jsons(empUrls);
                    },
                    'default': () => { resp.status(417).end(); }
                })
            }
        )
    })
})

app.post('/cart', (req, resp) => {
    const name = req.body.name;
    const toAdd = req.body.toAdd;
    const cart = JSON.parse(req.body.cart);
    cart.push(toAdd);

    resp.status(200)
    resp.type('text/html')
    resp.render('cart', { 
        name: name,
        cart: JSON.stringify(cart),
        items: cart,
        layout: false
    })
});

app.get('/cart', (req, resp) => {
    const name = req.query.name;
    let cart = [];
    if (req.query.cart)
        cart = JSON.parse(req.query.cart);

    resp.status(200)
    resp.type('text/html')
    resp.render('cart', { 
        name: name,
        cart: JSON.stringify(cart),
        layout: false
    })
})

app.get('/healthz', (req, resp) => {
    resp.status(200).end();
})

app.get(/.*/, express.static(__dirname + '/public'));

empPool.getConnection((err, conn) => {
    if (err) {
        console.error('Error: ', err);
        process.exit(-1);
        return;
    }
    console.info('Pinging database...')
    conn.ping(err => {
        conn.release();
        if (err) {
            console.error('Cannot ping database: ', err);
            process.exit(-1);
            return;
        }
        app.listen(PORT, () => {
            console.info('Application started at %s on port %d',
                new Date(), PORT);
        });
    })
})
