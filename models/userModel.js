const boolean = require('@hapi/joi/lib/types/boolean');
const mongooes = require('mongoose');

const userSchema = new mongooes.Schema({
    name: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        required: true,
    },
    password: {
        type: String,
        required: true,
    },
    isDoctor:{
        type:Boolean,
        default: false,
    },
    isAdmin:{
       type: Boolean,
        default: false,
    },
    seenNotification:{
        type:Array,
        default:[],

    },
    unseenNotification:{
        type:Array,
        default:[],

    },
}, {
    timestamps: true
}
);

const userModel = mongooes.model('users', userSchema);
module.exports = userModel;