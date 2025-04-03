const typeDefs = `#graphql
  type OrderProduct {
    productId: ID!
    quantity: Int!
    priceAtPurchase: Float!
  }

  type Order {
    _id: ID!
    customerId: ID!
    products: [OrderProduct!]!
    totalAmount: Float!
    orderDate: String!
    status: String!
  }

  input OrderProductInput {
    productId: ID!
    quantity: Int!
  }

  input PlaceOrderInput {
    customerId: ID!
    products: [OrderProductInput!]!
  }

  extend type Mutation {
    placeOrder(input: PlaceOrderInput!): Order
  }
`;

export default typeDefs;