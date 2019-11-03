const hbs = require('express-handlebars')
const express = require('express')
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');


const PORT = parseInt(process.argv[2] || process.env.APP_PORT || 3000);

const app = express();

const db = { };

app.engine('hbs', hbs())
app.set('view engine', 'hbs')
app.set('views', __dirname + '/views');

app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: true }));

app.get(['/', '/index.html'], (req, resp, next) => {
    if ('customer_name' in req.cookies) {
        const name = req.cookies.customer_name;
        console.log(name);
        const cart = db[name] || [];
        resp.status(200)
        if (cart.length > 0)
            resp.render('cart_server', { 
                name: name,
                cart: db[name],
                layout: false
            })
        else
            resp.render('welcome', { 
                name: req.cookies.customer_name, 
                layout: false
            })
        return;
    }
    resp.cookie('customer_name', "anon", 
        { httpOnly: true, maxAge: 1000 * 60 * 60  });

    next();
})

app.post('/cart', (req, resp) => {
    const name = req.body.name;
    const toAdd = req.body.toAdd;
    const cart = db[name] || [];
    cart.push(toAdd);

    resp.status(200)
    resp.type('text/html')
    resp.render('cart_server', { 
        name: name,
        cart: cart,
        layout: false
    })
});

app.get('/cart', (req, resp) => {

    console.info('customer_name: ', req.cookies['customer_name']);

    const name = req.query.name;
    let cart = [];
    if (name in db)
        cart = db[name];
    else
        db[name] = [];

    resp.cookie('customer_name', name, { httpOnly: true, maxAge: 1000 * 60 * 60  });

    resp.status(200)
    resp.type('text/html')
    resp.render('cart_server', { 
        name: name,
        cart: cart,
        layout: false
    })
})

app.get(/.*/, express.static(__dirname + '/public'));

app.listen(PORT, () => {
    console.info('Application started at %s on port %d',
        new Date(), PORT);
});
