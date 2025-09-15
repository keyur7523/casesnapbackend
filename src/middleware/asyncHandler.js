const asyncHandler = fn => (req, res, next) =>
    Promise.resolve(fn(req, res, next)).catch(next);

// Async handler to handle errors
module.exports = asyncHandler;
