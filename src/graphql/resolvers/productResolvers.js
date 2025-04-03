import mongoose from 'mongoose';
import Product from '../../models/Product.js';
import Order from '../../models/Order.js';
import logger from '../../utils/logger.js';
import { safeUUID } from '../../utils/helper.js';

const productResolvers = {
  Query: {
    getProduct: async (_, { id }) => {
      try {
        // Handle both string and UUID formats
        const product = await Product.findOne({ 
          _id: mongoose.Types.ObjectId.isValid(id) ? id : safeUUID(id) 
        });
        
        if (!product) {
          throw new Error(`Product not found: ${id}`);
        }
        
        return product;
      } catch (error) {
        logger.error(`Product lookup failed: ${error.message}`);
        throw new Error(`Failed to retrieve product: ${error.message}`);
      }
    },

    getAllProducts: async () => {
      try {
        return await Product.find({});
      } catch (error) {
        logger.error(`Failed to fetch products: ${error.message}`);
        throw new Error(`Failed to retrieve products: ${error.message}`);
      }
    },

    getTopSellingProducts: async (_, { limit = 10 }) => {
      try {
        // Sanity check on limit
        const safeLimit = Math.max(1, Math.min(limit || 10, 100));
        
        logger.info(`Fetching top ${safeLimit} selling products`);
        
        return await Order.aggregate([
          // Only consider completed orders
          { $match: { status: "completed" } },
          
          // Break out individual products from the array
          { $unwind: "$products" },
          
          // Join with products collection to get names
          {
            $lookup: {
              from: "products",
              let: { productId: "$products.productId" },
              pipeline: [
                {
                  $match: {
                    $expr: { $eq: [{ $toString: "$_id" }, "$$productId"] }
                  }
                }
              ],
              as: "productDetails"
            }
          },
          
          // Extract the matched product details
          { $unwind: "$productDetails" },
          
          // Group and sum quantities by product
          {
            $group: {
              _id: "$products.productId",
              name: { $first: "$productDetails.name" },
              totalSold: { $sum: "$products.quantity" }
            }
          },
          
          // Sort by total sold (descending)
          { $sort: { totalSold: -1 } },
          
          // Limit to requested number
          { $limit: safeLimit },
          
          // Format for output
          {
            $project: {
              productId: "$_id",
              name: 1,
              totalSold: 1,
              _id: 0
            }
          }
        ]);
      } catch (error) {
        logger.error(`Error fetching top products: ${error.message}`);
        throw new Error(`Failed to retrieve top selling products: ${error.message}`);
      }
    }
  }
};

export default productResolvers;