import Customer from '../../models/Customer.js';
import Order from '../../models/Order.js';
import logger from '../../utils/logger.js';
import { safeUUID } from '../../utils/helper.js';

const customerResolvers = {
  Query: {
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
        // Input validation 
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
    }
  }
};

export default customerResolvers;