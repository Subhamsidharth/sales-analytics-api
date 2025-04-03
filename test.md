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
