const { DataTypes } = require('sequelize');
const db = require('../config/database');

const User = db.define('users', {
    nama_lengkap: {
        type: DataTypes.STRING,
        allowNull: false
    },
    username: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    password: {
        type: DataTypes.STRING,
        allowNull: false
    },
    role: {
    type: DataTypes.ENUM('admin', 'guru', 'siswa', 'pengawas'),
    defaultValue: 'siswa'
    },
    kelas: {
        type: DataTypes.STRING,
        allowNull: true
    }
}, {
    freezeTableName: true
});

User.prototype.toJSON = function () {
  var values = Object.assign({}, this.get());
  delete values.password;
  return values;
}

module.exports = User;