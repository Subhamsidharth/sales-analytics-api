import Order from '../../models/Order.js';
import logger from '../../utils/logger.js';
import { validateDate } from '../../utils/helper.js';

const analyticsResolvers = {
  Query: {
    getSalesAnalytics: async (_, { startDate, endDate }) => {
      try {
        const start = validateDate(startDate);
        const end = validateDate(endDate);
        
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
  }
};

export default analyticsResolvers;