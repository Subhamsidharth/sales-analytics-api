import mongoose from 'mongoose';
import Customer from '../models/Customer.js';
import Product from '../models/Product.js';
import Order from '../models/Order.js';
import logger from '../utils/logger.js';
import { v4 as uuidv4 } from 'uuid';
import { UUID } from 'bson';

// Helper function for safe UUID conversion
const safeUUID = (id) => {
  try {
    return new UUID(id);
  } catch (err) {
    logger.warn(`Invalid UUID format: ${id}`);
    throw new Error(`Invalid UUID format: ${id}`);
  }
};

const resolvers = {
  Query: {
    // Customer queries
    getCustomer: async (_, { id }) => {
      try {
        return await Customer.findOne({ _id: safeUUID(id) });
      } catch (error) {
        logger.error(`Failed to fetch customer: ${error.message}`);
        throw new Error(`Customer lookup failed: ${error.message}`);
      }
    },

    getAllCustomers: async () => {
      try {
        return await Customer.find();
      } catch (error) {
        logger.error(`Failed to fetch customers: ${error.message}`);
        throw new Error(`Failed to retrieve customers`);
      }
    },

    getCustomerSpending: async (_, { customerId }) => {
      try {
        // Make sure we have a valid ID before proceeding
        if (!customerId) {
          throw new Error('Customer ID is required');
        }
        
        logger.info(`Calculating spending for customer: ${customerId}`);

        const result = await Order.aggregate([
          // Match only completed orders for this customer
          {
            $match: {
              customerId: safeUUID(customerId),
              status: "completed"
            }
          },
          // Group and calculate metrics
          {
            $group: {
              _id: "$customerId",
              totalSpent: { $sum: "$totalAmount" },
              orderCount: { $sum: 1 },
              lastOrderDate: { $max: "$orderDate" }
            }
          },
          // Format the output
          {
            $project: {
              _id: 0,
              customerId: "$_id",
              totalSpent: { $round: ["$totalSpent", 2] }, // Round to 2 decimal places
              averageOrderValue: {
                $round: [
                  { $cond: [
                    { $eq: ["$orderCount", 0] },
                    0,
                    { $divide: ["$totalSpent", "$orderCount"] }
                  ]}, 
                  2
                ]
              },
              lastOrderDate: 1
            }
          }
        ]);

        // If no orders found, return default structure
        return result[0] || {
          customerId,
          totalSpent: 0,
          averageOrderValue: 0,
          lastOrderDate: null
        };
      } catch (error) {
        logger.error(`Error in getCustomerSpending: ${error.message}`);
        throw new Error(`Failed to process customer spending data: ${error.message}`);
      }
    },

    // Product queries
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
    },

    getSalesAnalytics: async (_, { startDate, endDate }) => {
      try {
        // Parse and validate dates
        const start = new Date(startDate);
        const end = new Date(endDate);

        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
          throw new Error('Invalid date format. Please use ISO format (YYYY-MM-DDTHH:mm:ssZ)');
        }
        
        // Add one day to end date to make it inclusive
        end.setDate(end.getDate() + 1);
        
        logger.info(`Analyzing sales from ${start.toISOString()} to ${end.toISOString()}`);

        const results = await Order.aggregate([
          // Match orders in the date range and with completed status
          {
            $match: {
              status: "completed",
              orderDate: {
                $gte: start.toISOString(),
                $lt: end.toISOString()
              }
            }
          },
          
          // Use facet to run multiple aggregation pipelines in one go
          {
            $facet: {
              // Calculate overall statistics
              "summary": [
                {
                  $group: {
                    _id: null,
                    totalRevenue: { $sum: "$totalAmount" },
                    completedOrders: { $sum: 1 }
                  }
                }
              ],
              
              // Calculate category breakdown
              "categories": [
                // Unwind the products array
                { $unwind: "$products" },
                
                // Calculate revenue per product
                {
                  $project: {
                    productId: "$products.productId",
                    // Calculate product revenue based on quantity and price at purchase
                    revenue: { $multiply: ["$products.quantity", "$products.priceAtPurchase"] }
                  }
                },
                
                // Join with products collection to get category
                {
                  $lookup: {
                    from: "products",
                    let: { productId: "$productId" },
                    pipeline: [
                      {
                        $match: {
                          $expr: { $eq: [{ $toString: "$_id" }, "$$productId"] }
                        }
                      }
                    ],
                    as: "productInfo"
                  }
                },
                
                // Filter out products that didn't match
                { $match: { "productInfo.0": { $exists: true } } },
                
                // Extract product details
                { $addFields: { product: { $arrayElemAt: ["$productInfo", 0] } } },
                
                // Group by category
                {
                  $group: {
                    _id: "$product.category",
                    revenue: { $sum: "$revenue" }
                  }
                },
                
                // Format output
                {
                  $project: {
                    _id: 0,
                    category: { $ifNull: ["$_id", "Uncategorized"] },
                    revenue: { $round: ["$revenue", 2] }
                  }
                },
                
                // Sort by revenue (highest first)
                { $sort: { revenue: -1 } }
              ]
            }
          },
          
          // Combine results into final format
          {
            $project: {
              totalRevenue: {
                $ifNull: [{ $round: [{ $arrayElemAt: ["$summary.totalRevenue", 0] }, 2] }, 0]
              },
              completedOrders: {
                $ifNull: [{ $arrayElemAt: ["$summary.completedOrders", 0] }, 0]
              },
              categoryBreakdown: {
                $ifNull: ["$categories", []]
              }
            }
          }
        ]);
        
        // Handle case with no results
        if (!results.length) {
          return {
            totalRevenue: 0,
            completedOrders: 0,
            categoryBreakdown: []
          };
        }

        return results[0];
      } catch (error) {
        logger.error(`Error in getSalesAnalytics: ${error.stack}`);
        throw new Error(`Failed to analyze sales data: ${error.message}`);
      }
    }
  },

  Mutation: {
    placeOrder: async (_, { input }) => {
      const { customerId, products } = input;
      const session = await mongoose.startSession();
      
      try {
        // Run everything in a transaction for atomicity
        return await session.withTransaction(async () => {
          // Step 1: Find the customer
          const customer = await Customer.findOne({ _id: safeUUID(customerId) }).session(session);
          if (!customer) {
            throw new Error(`Customer not found: ${customerId}`);
          }
          
          // Log order attempt
          logger.info(`Processing order for customer: ${customer.name} (${customerId})`);

          // Step 2: Process each product
          const orderProducts = [];
          let totalAmount = 0;
          
          // Track any stock issues
          const stockIssues = [];

          for (const item of products) {
            // Basic validation
            if (!item.productId || !item.quantity || item.quantity <= 0) {
              throw new Error(`Invalid product data: ${JSON.stringify(item)}`);
            }
            
            // Update stock and get product in one go
            const product = await Product.findOneAndUpdate(
              { 
                _id: safeUUID(item.productId), 
                stock: { $gte: item.quantity } 
              },
              { $inc: { stock: -item.quantity } },
              { session, new: true } 
            );
            
            // Handle stock issues
            if (!product) {
              // Check if it's out of stock or not found
              const exists = await Product.findOne({ _id: safeUUID(item.productId) }).session(session);
              
              if (exists) {
                stockIssues.push(`${exists.name} (insufficient stock: ${exists.stock} available)`);
              } else {
                stockIssues.push(`Product not found: ${item.productId}`);
              }
              continue;
            }
            
            // All good, add to order
            orderProducts.push({
              productId: item.productId,
              quantity: item.quantity,
              priceAtPurchase: product.price
            });
            
            totalAmount += product.price * item.quantity;
          }
          
          // Fail order if any product had issues
          if (stockIssues.length > 0) {
            throw new Error(`Order failed due to inventory issues: ${stockIssues.join(', ')}`);
          }
          
          // Create order ID
          const orderId = uuidv4();
          
          // Step 3: Create the order
          const order = new Order({
            _id: orderId,
            customerId: customerId,
            products: orderProducts,
            totalAmount: parseFloat(totalAmount.toFixed(2)), // Round to 2 decimal places
            status: 'pending',
            orderDate: new Date().toISOString()
          });
          
          // Save to DB
          await order.save({ session });
          
          logger.info(`Order created successfully: ${orderId}, Total: $${totalAmount.toFixed(2)}`);
          
          return order;
        });
      } catch (error) {
        logger.error(`Order failed: ${error.stack}`);
        throw new Error(`Order processing failed: ${error.message}`);
      } finally {
        session.endSession();
      }
    }
  }
};

export default resolvers;