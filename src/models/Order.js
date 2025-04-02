import mongoose from 'mongoose';

const orderSchema = new mongoose.Schema({
  _id: {             //UUID string for order ID
    type: String,
    required: true
  },
  customerId: {
    type: String,
    ref: 'Customer',
    required: true
  },
  products: [{
    productId: {
      type: String,
      ref: 'Product',
      required: true
    },
    quantity: {
      type: Number,
      required: true,
      min: 1
    },
    priceAtPurchase: {
      type: Number,
      required: true,
      min: 0
    }
  }],
  totalAmount: {
    type: Number,
    required: true,
    min: 0
  },
  orderDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  status: {
    type: String,
    required: true,
    enum: ['pending', 'completed', 'canceled'],
    default: 'pending'
  }
}, {
  timestamps: true,
  _id: false
});

orderSchema.index({ customerId: 1 });
orderSchema.index({ orderDate: 1 });
orderSchema.index({ status: 1 });
orderSchema.index({ 'products.productId': 1 });

const Order = mongoose.model('Order', orderSchema);

export default Order;