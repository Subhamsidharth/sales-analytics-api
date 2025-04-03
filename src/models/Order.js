import mongoose from 'mongoose';
import { UUID } from 'bson';

const orderProductSchema = new mongoose.Schema({
  productId: {
    type: String,
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
    min: 1,
  },
  priceAtPurchase: {
    type: Number,
    required: true,
    min: 0,
  },
});

const orderSchema = new mongoose.Schema(
  {
    _id: {
      type: 'object',
      value: { type: 'Binary' },
      default: () => new UUID(),
    },
    customerId: {
      type: 'object',
      value: { type: 'Binary' },
      required: true,
    },
    products: {
      type: [orderProductSchema],
      required: true,
      validate: [(arr) => arr.length > 0, 'Order must contain at least one product'],
    },
    totalAmount: {
      type: Number,
      required: true,
    },
    orderDate: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      required: true,
      enum: ['pending', 'completed', 'canceled'],
      default: 'pending',
    },
  },
  {
    timestamps: true,
    _id: false,
  }
);

// Create indexes for frequently queried fields
orderSchema.index({ customerId: 1 });
orderSchema.index({ orderDate: 1 });
orderSchema.index({ status: 1 });

const Order = mongoose.model('Order', orderSchema);
export default Order;
