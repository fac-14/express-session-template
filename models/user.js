const Sequelize = require('sequelize');
const bcrypt = require('bcrypt');


// create a new Sequelize object - sequelize is an ORM, something cool to google <3 
const sql = new Sequelize('postgres://auth-system:auth123@localhost:5432/auth-system', {
    pool: {
        max: 5,
        min: 0,
        acquire: 30000,
        idle: 10000
    },
});

// set up our table
const user = sql.define('users', {
    username: {
        type: Sequelize.STRING,
        unique: true,
        allowNull: false
    },
    email: {
        type: Sequelize.STRING,
        unique: true,
        allowNull: false
    },
    password: {
        type: Sequelize.STRING,
        allowNull: false
    }
}, {
        hooks: {
            beforeCreate: (user) => {
                bcrypt.hash(user.password, 10, function (err, hash) {
                    user.password = hash;
                });
            }
        },
    }
);

user.prototype.validPassword = function (password) {
    bcrypt.compare(password, this.password, function (err, res) {
        return res;
    });
};

sql.sync()
    .then(() => console.log('users table created'))
    .catch(e => console.log(`this error: ${e}`));

module.exports = { user, sql };