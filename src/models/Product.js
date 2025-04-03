import mongoose from 'mongoose';
import { UUID } from 'bson';

const productSchema = new mongoose.Schema(
  {
    _id: {
      type: 'object',
      value: { type: 'Binary' },
      default: () => new UUID(),
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      required: true,
      trim: true,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    stock: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
  },
  { timestamps: true, _id: false }
);

// Create indexes for common queries
productSchema.index({ category: 1 });
productSchema.index({ name: 1 });

const Product = mongoose.model('Product', productSchema);
export default Product;
