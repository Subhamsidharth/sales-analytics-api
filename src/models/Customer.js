import mongoose from 'mongoose';

const customerSchema = new mongoose.Schema({
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
    timestamps: true
});

// Create indexes
customerSchema.index({ email: 1 }, { unique: true });

const Customer = mongoose.model('Customer', customerSchema);

export default Customer;