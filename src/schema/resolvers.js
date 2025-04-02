import mongoose from 'mongoose';
import Customer from '../models/Customer.js';
import Product from '../models/Product.js';
import Order from '../models/Order.js';
import logger from '../utils/logger.js';

const resolvers = {
  Query: {
    // Customer queries
    getCustomer: async (_, { id }) => {
      return await Customer.findById(id);
    },
    
    getAllCustomers: async () => {
      return await Customer.find({});
    },
    
    getCustomerSpending: async (_, { customerId }) => {
      try {
        const customerId0 = new mongoose.Types.ObjectId(customerId);
        
        const result = await Order.aggregate([
          { $match: { customerId: customerId0 } },
          { $group: {
              _id: "$customerId",
              totalSpent: { $sum: "$totalAmount" },
              orderCount: { $sum: 1 },
              lastOrderDate: { $max: "$orderDate" }
            }
          },
          { $project: {
              _id: 0,
              customerId: { $toString: "$_id" },
              totalSpent: 1,
              averageOrderValue: { $divide: ["$totalSpent", "$orderCount"] },
              lastOrderDate: 1
            }
          }
        ]);
        
        if (result.length === 0) {
          return {
            customerId,
            totalSpent: 0,
            averageOrderValue: 0,
            lastOrderDate: null
          };
        }
        
        return result[0];
      } catch (error) {
        logger.error(`Error in getCustomerSpending: ${error.message}`);
        throw new Error(`Failed to get customer spending: ${error.message}`);
      }
    },
    
    // Product queries
    getProduct: async (_, { id }) => {
      return await Product.findById(id);
    },
    
    getAllProducts: async () => {
      return await Product.find({});
    },
    
    getTopSellingProducts: async (_, { limit }) => {
      try {
        const result = await Order.aggregate([
          { $unwind: "$products" },
          { $group: {
              _id: "$products.productId",
              totalSold: { $sum: "$products.quantity" }
            }
          },
          { $sort: { totalSold: -1 } },
          { $limit: limit },
          { $lookup: {
              from: "products",
              localField: "_id",
              foreignField: "_id",
              as: "productDetails"
            }
          },
          { $unwind: "$productDetails" },
          { $project: {
              productId: { $toString: "$_id" },
              name: "$productDetails.name",
              totalSold: 1,
              _id: 0
            }
          }
        ]);
        
        return result;
      } catch (error) {
        logger.error(`Error in getTopSellingProducts: ${error.message}`);
        throw new Error(`Failed to get top selling products: ${error.message}`);
      }
    },
    
    // Order queries
    getOrder: async (_, { id }) => {
      return await Order.findById(id);
    },
    
    getCustomerOrders: async (_, { customerId, page = 1, limit = 10 }) => {
      const skip = (page - 1) * limit;
      return await Order.find({ customerId })
        .sort({ orderDate: -1 })
        .skip(skip)
        .limit(limit);
    },
    
    // Analytics queries
    getSalesAnalytics: async (_, { startDate, endDate }) => {
      try {
        const start = new Date(startDate);
        const end = new Date(endDate);
        
        // Validate dates
        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
          throw new Error('Invalid date format. Use ISO format (YYYY-MM-DD)');
        }
        
        // Get total revenue and completed orders
        const revenueAndOrders = await Order.aggregate([
          { $match: {
              orderDate: { $gte: start, $lte: end },
              status: "completed"
            }
          },
          { $group: {
              _id: null,
              totalRevenue: { $sum: "$totalAmount" },
              completedOrders: { $sum: 1 }
            }
          },
          { $project: {
              _id: 0,
              totalRevenue: 1,
              completedOrders: 1
            }
          }
        ]);
        
        // Get category breakdown
        const categoryBreakdown = await Order.aggregate([
          { $match: {
              orderDate: { $gte: start, $lte: end },
              status: "completed"
            }
          },
          { $unwind: "$products" },
          { $lookup: {
              from: "products",
              localField: "products.productId",
              foreignField: "_id",
              as: "productDetails"
            }
          },
          { $unwind: "$productDetails" },
          { $group: {
              _id: "$productDetails.category",
              revenue: {
                $sum: { $multiply: ["$products.quantity", "$products.priceAtPurchase"] }
              }
            }
          },
          { $project: {
              _id: 0,
              category: "$_id",
              revenue: 1
            }
          },
          { $sort: { revenue: -1 } }
        ]);
        
        let result = {
          totalRevenue: 0,
          completedOrders: 0,
          categoryBreakdown: categoryBreakdown || []
        };
        
        if (revenueAndOrders.length > 0) {
          result.totalRevenue = revenueAndOrders[0].totalRevenue;
          result.completedOrders = revenueAndOrders[0].completedOrders;
        }
        
        return result;
      } catch (error) {
        logger.error(`Error in getSalesAnalytics: ${error.message}`);
        throw new Error(`Failed to get sales analytics: ${error.message}`);
      }
    }
  },
  
  Mutation: {
    placeOrder: async (_, { input }) => {
      const { customerId, products } = input;
      
      // Start a session for transaction
      const session = await mongoose.startSession();
      session.startTransaction();
      
      try {
        // Verify customer exists
        const customer = await Customer.findById(customerId);
        if (!customer) {
          throw new Error(`Customer with ID ${customerId} not found`);
        }
        
        // Process products and calculate total
        const orderProducts = [];
        let totalAmount = 0;
        
        for (const item of products) {
          const product = await Product.findById(item.productId);
          if (!product) {
            throw new Error(`Product with ID ${item.productId} not found`);
          }
          
          // Check if enough stock
          if (product.stock < item.quantity) {
            throw new Error(`Not enough stock for product: ${product.name}`);
          }
          
          // Update stock
          await Product.findByIdAndUpdate(
            item.productId,
            { $inc: { stock: -item.quantity } },
            { session }
          );
          
          // Add to order products
          orderProducts.push({
            productId: item.productId,
            quantity: item.quantity,
            priceAtPurchase: product.price
          });
          
          totalAmount += product.price * item.quantity;
        }
        
        // Create order
        const order = new Order({
          customerId,
          products: orderProducts,
          totalAmount,
          orderDate: new Date(),
          status: 'pending'
        });
        
        await order.save({ session });
        await session.commitTransaction();
        
        return order;
      } catch (error) {
        await session.abortTransaction();
        logger.error(`Error in placeOrder: ${error.message}`);
        throw new Error(`Failed to place order: ${error.message}`);
      } finally {
        session.endSession();
      }
    }
  }
};

export default resolvers;