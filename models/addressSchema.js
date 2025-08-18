const mongoose = require("mongoose");
const { Schema } = mongoose;

const addressSchema = new Schema({
    userId: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    address: [
        {
            addressType: {
                type: String,
                enum: ["home", "work", "other"], 
                required: true
            },
            name: {
                type: String,
                required: true
            },
            phone: {
                type: String,
                required: true
            },
            email: {
                type: String
            },
            landMark: {
                type: String,
                required: true
            },
            city: {
                type: String,
                required: true
            },
            state: {
                type: String,
                required: true
            },
            pincode: {
                type: String,
                required: true
            },
            country: {
                type: String,
                required: true
            }
        }
    ]
}, { timestamps: true });

const Address = mongoose.model("Address", addressSchema);
module.exports = Address;
