const errorHandler = (err, req, res, next) => {
  let statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  let message = err.message || "Server Error";

  // Mongoose bad ObjectId
  if (err.name === "CastError") { message = "Resource not found"; statusCode = 404; }
  // Mongoose duplicate key
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    message = `${field} already exists`; statusCode = 400;
  }
  // Mongoose validation
  if (err.name === "ValidationError") {
    message = Object.values(err.errors).map(e => e.message).join(", ");
    statusCode = 400;
  }

  console.error(`❌ ${statusCode}: ${message}`);
  res.status(statusCode).json({ success: false, message });
};

module.exports = errorHandler;