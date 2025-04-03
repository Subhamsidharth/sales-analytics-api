const typeDefs = `#graphql
  type Product {
    _id: ID!
    name: String!
    category: String!
    price: Float!
    stock: Int!
  }

  type TopProduct {
    productId: ID!
    name: String!
    totalSold: Int!
  }

  extend type Query {
    getProduct(id: ID!): Product
    getAllProducts: [Product!]!
    getTopSellingProducts(limit: Int!): [TopProduct!]!
  }
`;

export default typeDefs;
