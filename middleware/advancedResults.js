const ErrorResponse = require('../utils/errorResponse');

const advancedResults = (model, populate) => {
  return async (req, res, next) => {
    // Copiar a query string
    const reqQuery = { ...req.query };

    // Campos para remover da query string
    const removeFields = ['select', 'sort', 'page', 'limit', 'search'];

    // Remover campos da query string
    removeFields.forEach((param) => delete reqQuery[param]);

    // Criar string de query
    let queryStr = JSON.stringify(reqQuery);

    // Criar operadores ($gt, $gte, $lt, $lte, $in)
    queryStr = queryStr.replace(
      /\b(gt|gte|lt|lte|in)\b/g,
      (match) => `$${match}`
    );

    // Encontrar recursos
    let query = model.find(JSON.parse(queryStr));

    // Seleção de campos
    if (req.query.select) {
      const fields = req.query.select.split(',').join(' ');
      query = query.select(fields);
    }

    // Ordenação
    if (req.query.sort) {
      const sortBy = req.query.sort.split(',').join(' ');
      query = query.sort(sortBy);
    } else {
      query = query.sort('-createdAt');
    }

    // Paginação
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 25;
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const total = await model.countDocuments(JSON.parse(queryStr));

    query = query.skip(startIndex).limit(limit);

    // Populate se especificado
    if (populate) {
      if (Array.isArray(populate)) {
        populate.forEach((p) => {
          query = query.populate(p);
        });
      } else {
        query = query.populate(populate);
      }
    }


    // Busca por texto
    if (req.query.search) {
      const searchQuery = {
        $or: [
          { name: { $regex: req.query.search, $options: 'i' } },
          { description: { $regex: req.query.search, $options: 'i' } },
          { 'tags': { $in: [new RegExp(req.query.search, 'i')] } },
        ],
      };

      // Se já houver uma query, adicionar a busca como um $and
      if (Object.keys(reqQuery).length > 0) {
        query.and([searchQuery]);
      } else {
        query.find(searchQuery);
      }

      // Atualizar a contagem total
      const countQuery = model.find(searchQuery).countDocuments();
      total = await countQuery;
    }

    // Executar a query
    const results = await query;

    // Resultado da paginação
    const pagination = {};

    if (endIndex < total) {
      pagination.next = {
        page: page + 1,
        limit,
      };
    }

    if (startIndex > 0) {
      pagination.prev = {
        page: page - 1,
        limit,
      };
    }


    res.advancedResults = {
      success: true,
      count: results.length,
      pagination,
      data: results,
    };

    next();
  };
};

module.exports = advancedResults;
