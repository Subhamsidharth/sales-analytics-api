import mongoose from 'mongoose';
import Customer from '../../models/Customer.js';
import Product from '../../models/Product.js';
import Order from '../../models/Order.js';
import logger from '../../utils/logger.js';
import { v4 as uuidv4 } from 'uuid';
import { safeUUID } from '../../utils/helper.js';

const orderResolvers = {
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

export default orderResolvers;