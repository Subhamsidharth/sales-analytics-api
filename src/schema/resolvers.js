import mongoose from 'mongoose';
import Customer from '../models/Customer.js';
import Product from '../models/Product.js';
import Order from '../models/Order.js';
import logger from '../utils/logger.js';
import { v4 as uuidv4 } from 'uuid';
import { UUID } from 'bson';

const resolvers = {
  Query: {
    // Customer queries
    getCustomer: async (_, { id }) => {
      return await Customer.findOne({ _id: new UUID(id) });
    },

    getAllCustomers: async () => {
      return await Customer.find();
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

    // getSalesAnalytics: async (_, { startDate, endDate }) => {
    //   try {
    //     // Convert string dates to Date objects
    //     const start = new Date(startDate);
    //     const end = new Date(endDate);

    //     logger.info(`Analyzing sales from ${start} to ${end}`);

    //     // Step 1: Get total revenue and order count
    //     const overallStats = await Order.aggregate([
    //       {
    //         $match: {
    //           status: "completed",
    //           orderDate: {
    //             $gte: start.toISOString().slice(0, 23), // Trim to milliseconds
    //             $lte: end.toISOString().slice(0, 23)
    //           }
    //         }
    //       },
    //       {
    //         $group: {
    //           _id: null,
    //           totalRevenue: { $sum: "$totalAmount" },
    //           completedOrders: { $sum: 1 }
    //         }
    //       }
    //     ]);
    //     // Step 2: Get category breakdown
    //     const categoryStats = await Order.aggregate([
    //       {
    //         $match: {
    //           status: "completed",
    //           orderDate: {
    //             $gte: start.toISOString().slice(0, 23), // Trim to milliseconds
    //             $lte: end.toISOString().slice(0, 23)
    //           }
    //         }
    //       },
    //       { $unwind: "$products" },
    //       {
    //         $project: {
    //           productId: "$products.productId",
    //           revenue: { $multiply: ["$products.quantity", "$products.priceAtPurchase"] }
    //         }
    //       }
    //     ]);

    //     // Log the raw results for debugging
    //     logger.info(`Found ${categoryStats.length} product entries in orders`);
    //     if (categoryStats.length > 0) {
    //       logger.info(`Sample product ID: ${categoryStats[0].productId}`);
    //     }

    //     // Get all products for manual joining
    //     const allProducts = await Product.find();
    //     const productMap = new Map();

    //     allProducts.forEach(product => {
    //       // Store both string and binary ID versions for matching
    //       const stringId = product._id.toString();
    //       productMap.set(stringId, product);

    //       // Also try storing without dashes if that's how they're represented in orders
    //       const noDashesId = stringId.replace(/-/g, '');
    //       productMap.set(noDashesId, product);
    //     });

    //     logger.info(`Loaded ${allProducts.length} products for mapping`);

    //     // Manually build category revenue
    //     const categoryRevenue = {};
    //     let matchCount = 0;

    //     for (const item of categoryStats) {
    //       const product = productMap.get(item.productId);
    //       if (product) {
    //         matchCount++;
    //         const category = product.category || 'Uncategorized';
    //         categoryRevenue[category] = (categoryRevenue[category] || 0) + item.revenue;
    //       }
    //     }

    //     logger.info(`Matched ${matchCount} products with categories`);

    //     // Format category breakdown
    //     const categoryBreakdown = Object.entries(categoryRevenue).map(([category, revenue]) => ({
    //       category,
    //       revenue: Number(revenue.toFixed(2))
    //     })).sort((a, b) => b.revenue - a.revenue);

    //     // Final response
    //     return {
    //       totalRevenue: overallStats.length > 0 ? overallStats[0].totalRevenue : 0,
    //       completedOrders: overallStats.length > 0 ? overallStats[0].completedOrders : 0,
    //       categoryBreakdown
    //     };
    //   } catch (error) {
    //     logger.error(`Error in getSalesAnalytics: ${error.message}`);
    //     throw new Error(`Failed to analyze sales data: ${error.message}`);
    //   }
    // }

    getSalesAnalytics: async (_, { startDate, endDate }) => {
      try {
        // Convert string dates to Date objects
        const start = new Date(startDate);
        const end = new Date(endDate);

        // Validate date inputs
        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
          throw new Error('Invalid date format. Please use ISO format (YYYY-MM-DDTHH:mm:ssZ)');
        }

        logger.info(`Analyzing sales from ${startDate} to ${endDate}`);
        logger.info(`Parsed dates - Start: ${start.toISOString()}, End: ${end.toISOString()}`);

        // Based on debug information, try a corrected aggregation
        const correctedResult = await Order.aggregate([
          // Filter orders with completed status
          {
            $match: {
              status: "completed",
              orderDate: {
                $gte: start.toISOString().slice(0, 23), // Trim to milliseconds
                $lte: end.toISOString().slice(0, 23)
              }
            }
          },

          // Calculate overall statistics
          {
            $facet: {
              // Total stats
              "overall": [
                {
                  $group: {
                    _id: null,
                    totalRevenue: { $sum: "$totalAmount" },
                    completedOrders: { $sum: 1 }
                  }
                }
              ],

              // For category breakdown
              "products": [
                // Unwind the products array
                { $unwind: "$products" },

                // Calculate revenue per product
                {
                  $project: {
                    productId: "$products.productId",
                    productRevenue: {
                      $multiply: ["$products.quantity", "$products.priceAtPurchase"]
                    }
                  }
                },

                // Join with the products collection
                {
                  $lookup: {
                    from: "products",
                    let: { productId: "$productId" },
                    pipeline: [
                      {
                        $match: {
                          $expr: {
                            $eq: [
                              { $toString: "$_id" },
                              "$$productId"
                            ]
                          }
                        }
                      }
                    ],
                    as: "productDetails"
                  }
                },

                // Filter out products that didn't match
                {
                  $match: {
                    "productDetails.0": { $exists: true }
                  }
                },

                // Extract the matched product
                {
                  $addFields: {
                    productDetail: { $arrayElemAt: ["$productDetails", 0] }
                  }
                },

                // Group by category
                {
                  $group: {
                    _id: "$productDetail.category",
                    revenue: { $sum: "$productRevenue" }
                  }
                },

                // Format output
                {
                  $project: {
                    _id: 0,
                    category: "$_id",
                    revenue: { $round: ["$revenue", 2] }
                  }
                },

                // Sort by revenue
                { $sort: { revenue: -1 } }
              ]
            }
          },

          // Final output format
          {
            $project: {
              totalRevenue: {
                $ifNull: [{ $arrayElemAt: ["$overall.totalRevenue", 0] }, 0]
              },
              completedOrders: {
                $ifNull: [{ $arrayElemAt: ["$overall.completedOrders", 0] }, 0]
              },
              categoryBreakdown: {
                $ifNull: ["$products", []]
              }
            }
          }
        ]);

        logger.info(`Corrected aggregation results: ${JSON.stringify(correctedResult)}`);

        // Handle case with no results
        if (!correctedResult.length) {
          return {
            totalRevenue: 0,
            completedOrders: 0,
            categoryBreakdown: []
          };
        }

        return correctedResult[0];
      } catch (error) {
        logger.error(`Error in getSalesAnalytics: ${error.message}`);
        throw new Error(`Failed to analyze sales data: ${error.message}`);
      }
    }
  },

  Mutation: {
    placeOrder: async (_, { input }) => {
      const { customerId, products } = input;
      const session = await mongoose.startSession();

      try {
        return await session.withTransaction(async () => {
          // Step 1: Verify customer exists
          const customer = await Customer.findOne({ _id: new UUID(customerId) }).session(session);
          if (!customer) throw new Error(`Customer ${customerId} not found`);

          // Step 2: Process products & Validate stock
          const orderProducts = [];
          let totalAmount = 0;

          for (const item of products) {
            const product = await Product.findOneAndUpdate(
              { _id: new UUID(item.productId), stock: { $gte: item.quantity } }, // Ensure stock is available
              { $inc: { stock: -item.quantity } },
              { session, new: true } // Returns updated document
            );

            if (!product) throw new Error(`Insufficient stock or product not found: ${item.productId}`);

            orderProducts.push({
              productId: product._id,
              quantity: item.quantity,
              priceAtPurchase: product.price
            });

            totalAmount += product.price * item.quantity;
          }

          // Step 3: Create Order
          const order = new Order({
            _id: uuidv4(),
            customerId,
            products: orderProducts,
            totalAmount,
            status: 'pending',
            orderDate: new Date().toISOString()
          });

          await order.save({ session });

          return order; // This will be returned when the transaction commits
        });
      } catch (error) {
        logger.error(`Order failed: ${error.message}`);
        throw new Error(`Order processing failed: ${error.message}`);
      } finally {
        session.endSession();
      }
    }
  }
};

export default resolvers;