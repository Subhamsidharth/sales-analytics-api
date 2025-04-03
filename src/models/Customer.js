import mongoose from 'mongoose';
import { UUID } from 'bson';

const customerSchema = new mongoose.Schema({
    _id: {
        type: 'object',
        value: { type: 'Binary' },
        default: () => new UUID()
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        trim: true,
        lowercase: true
    },
    age: {
        type: Number,
        required: true
    },
    location: {
        type: String,
        required: true
    },
    gender: {
        type: String,
        required: true,
        enum: ['Male', 'Female', 'Other']
    }
}, {
    timestamps: true,
    _id: false
});

// Create index on email for faster lookups
customerSchema.index({ email: 1 }, { unique: true });

const Customer = mongoose.model('Customer', customerSchema);
export default Customer;