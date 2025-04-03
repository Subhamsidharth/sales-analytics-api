const typeDefs = `#graphql
  type Customer {
    _id: ID!
    name: String!
    email: String!
    age: Int
    location: String
    gender: String
  }

  type CustomerSpending {
    customerId: ID!
    totalSpent: Float!
    averageOrderValue: Float!
    lastOrderDate: String
  }

  extend type Query {
    getCustomer(id: ID!): Customer
    getAllCustomers: [Customer!]!
    getCustomerSpending(customerId: ID!): CustomerSpending!
  }
`;

export default typeDefs;
