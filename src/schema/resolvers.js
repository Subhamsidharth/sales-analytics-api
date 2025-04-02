import mongoose from 'mongoose';
import Customer from '../models/Customer.js';
import Product from '../models/Product.js';
import Order from '../models/Order.js';
import logger from '../utils/logger.js';
import { v4 as uuidv4 } from 'uuid';
import { UUID } from 'bson';
import { Types } from "mongoose";

const resolvers = {
  Query: {
    // Customer queries
    getCustomer: async (_, { id }) => {
      return await Customer.findOne({ _id: id });
    },

    getAllCustomers: async () => {
      return await Customer.find({});
    },

    getCustomerSpending: async (_, { customerId }) => {
      try {
        // Debug: Log the incoming customerId
        logger.info(`Processing spending for customer: ${customerId}`);

        const result = await Order.aggregate([
          {
            $match: {
              customerId: new UUID(customerId),
              status: "completed"    // Only count completed orders
            }
          },
          {
            $group: {
              _id: "$customerId",
              totalSpent: { $sum: "$totalAmount" },
              orderCount: { $sum: 1 },
              lastOrderDate: { $max: "$orderDate" }
            }
          },
          {
            $project: {
              _id: 0,
              customerId: "$_id",
              totalSpent: 1,
              averageOrderValue: {
                $cond: [
                  { $eq: ["$orderCount", 0] },
                  0,
                  { $divide: ["$totalSpent", "$orderCount"] }
                ]
              },
              lastOrderDate: 1
            }
          }
        ]);

        return result[0] || {
          customerId,
          totalSpent: 0,
          averageOrderValue: 0,
          lastOrderDate: null
        };
      } catch (error) {
        logger.error(`Error in getCustomerSpending: ${error.message}`);
        throw new Error(`Failed to process customer spending data`);
      }
    },

    // Product queries
    getProduct: async (_, { id }) => {
      return await Product.findOne({ _id: id });
    },

    getAllProducts: async () => {
      return await Product.find({});
    },

    // Get All top selling Products with their respective categories
    //   getTopSellingProducts: async (_, { limit }) => {
    //     try {
    //       // 1. Get all completed orders
    //       const orders = await Order.find({ status: 'completed' }).lean();

    //       // 2. Process products and aggregate quantities
    //       const productSales = {};

    //       for (const order of orders) {
    //         try {
    //           // Enhanced cleaning for malformed JSON
    //           const cleanedProducts = order.products
    //             .replace(/'/g, '"') // Replace single quotes
    //             .replace(/\\"/g, '') // Remove escaped quotes
    //             .replace(/^\[/, '') // Remove opening bracket
    //             .replace(/\]$/, '') // Remove closing bracket
    //             .replace(/\s/g, ''); // Remove whitespace

    //           // Split into individual product entries
    //           const productStrings = cleanedProducts.split(/},{/);

    //           // Parse each product separately
    //           const products = productStrings.map(str => {
    //             try {
    //               // Add missing braces for complete JSON objects
    //               const jsonStr = str.startsWith('{') ? str : `{${str}`;
    //               const finalStr = jsonStr.endsWith('}') ? jsonStr : `${jsonStr}}`;
    //               return JSON.parse(finalStr);
    //             } catch (parseError) {
    //               logger.warn(`Error parsing product in order ${order._id}: ${parseError.message}`);
    //               return null;
    //             }
    //           }).filter(Boolean); // Remove null entries

    //           // Aggregate valid products
    //           products.forEach(product => {
    //             if (product.productId && product.quantity) {
    //               productSales[product.productId] =
    //                 (productSales[product.productId] || 0) + product.quantity;
    //             }
    //           });
    //         } catch (error) {
    //           logger.error(`Error processing order ${order._id}: ${error.message}`);
    //         }
    //       }

    //       // 3. Get product names (using proper UUID conversion)
    //       const products = await Product.find({});
    //       const productMap = new Map(
    //         products.map(p => [p._id.toString(), p.name])
    //       );

    //       // 4. Prepare sorted results
    //       const results = Object.entries(productSales)
    //         .map(([productId, totalSold]) => ({
    //           productId,
    //           name: productMap.get(productId) || 'Unknown Product',
    //           totalSold
    //         }))
    //         .sort((a, b) => b.totalSold - a.totalSold)
    //         .slice(0, limit);

    //       return results;
    //     } catch (error) {
    //       logger.error(`Error in getTopSellingProducts: ${error.message}`);
    //       return [];
    //     }
    //   }
    // },

    // After changes the format in DB
    getTopSellingProducts: async (_, { limit }) => {
      return Order.aggregate([
        // 1. Filter completed orders
        { $match: { status: "completed" } },

        // 2. Break out individual products
        { $unwind: "$products" },

        // 3. Join with products collection
        {
          $lookup: {
            from: "products",
            let: { productId: "$products.productId" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $eq: [
                      { $toString: "$_id" }, // Convert binary UUID to string
                      "$$productId"          // Compare with order's productId
                    ]
                  }
                }
              }
            ],
            as: "productDetails"
          }
        },

        // 4. Unwind and format
        { $unwind: "$productDetails" },

        // 5. Group and calculate totals
        {
          $group: {
            _id: "$products.productId",
            name: { $first: "$productDetails.name" },
            totalSold: { $sum: "$products.quantity" }
          }
        },

        // 6. Sort and limit
        { $sort: { totalSold: -1 } },
        { $limit: limit },

        // 7. Final projection
        {
          $project: {
            productId: "$_id",
            name: 1,
            totalSold: 1,
            _id: 0
          }
        }
      ]);
    },
  },

  Mutation: {
    placeOrder: async (_, { input }) => {
      const { customerId, products } = input;
      const session = await mongoose.startSession();

      try {
        session.startTransaction();

        // Verify customer exists
        const customer = await Customer.findOne({ _id: customerId }).session(session);
        if (!customer) throw new Error(`Customer ${customerId} not found`);

        // Process products
        const orderProducts = [];
        let totalAmount = 0;

        for (const item of products) {
          const product = await Product.findOne({ _id: item.productId }).session(session);
          if (!product) throw new Error(`Product ${item.productId} not found`);
          if (product.stock < item.quantity) {
            throw new Error(`Insufficient stock for ${product.name}`);
          }

          // Update stock
          await Product.findOneAndUpdate(
            { _id: item.productId },
            { $inc: { stock: -item.quantity } },
            { session }
          );

          orderProducts.push({
            productId: product._id,
            quantity: item.quantity,
            priceAtPurchase: product.price
          });

          totalAmount += product.price * item.quantity;
        }

        // Create order
        const order = new Order({
          _id: uuidv4(),
          customerId,
          products: orderProducts,
          totalAmount,
          status: 'pending'
        });

        await order.save({ session });
        await session.commitTransaction();

        return order;
      } catch (error) {
        await session.abortTransaction();
        logger.error(`Order failed: ${error.message}`);
        throw new Error(`Order processing failed: ${error.message}`);
      } finally {
        session.endSession();
      }
    }
  }
};

export default resolvers;