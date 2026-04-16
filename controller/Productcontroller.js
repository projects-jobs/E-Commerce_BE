const Product = require("../model/Product");

const getProducts = async (req, res, next) => {
  try {
    const { keyword, category, minPrice, maxPrice, sort, page = 1, limit = 12, featured } = req.query;
    const query = { isActive: true };

    if (keyword)            query.name = { $regex: keyword, $options: "i" };
    if (category && category !== "All") query.category = category;
    if (featured === "true") query.featured = true;
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = Number(minPrice);
      if (maxPrice) query.price.$lte = Number(maxPrice);
    }

    const sortMap = { "price-asc": { price: 1 }, "price-desc": { price: -1 }, "newest": { createdAt: -1 }, "rating": { rating: -1 }, "popular": { sold: -1 } };
    const total    = await Product.countDocuments(query);
    const products = await Product.find(query).sort(sortMap[sort] || { createdAt: -1 })
      .skip((page - 1) * limit).limit(Number(limit));

    res.json({ success: true, products, total, pages: Math.ceil(total / limit), page: Number(page) });
  } catch (err) { next(err); }
};

const getProduct = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id).populate("reviews.user", "name avatar");
    if (!product || !product.isActive)
      return res.status(404).json({ success: false, message: "Product not found" });
    res.json({ success: true, product });
  } catch (err) { next(err); }
};

const createProduct = async (req, res, next) => {
  try {
    const product = await Product.create(req.body);
    res.status(201).json({ success: true, product });
  } catch (err) { next(err); }
};

const updateProduct = async (req, res, next) => {
  try {
    const product = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!product) return res.status(404).json({ success: false, message: "Product not found" });
    res.json({ success: true, product });
  } catch (err) { next(err); }
};

const deleteProduct = async (req, res, next) => {
  try {
    await Product.findByIdAndUpdate(req.params.id, { isActive: false });
    res.json({ success: true, message: "Product deleted" });
  } catch (err) { next(err); }
};

const addReview = async (req, res, next) => {
  try {
    const { rating, comment } = req.body;
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ success: false, message: "Product not found" });
    if (product.reviews.some(r => r.user.toString() === req.user._id.toString()))
      return res.status(400).json({ success: false, message: "Already reviewed" });

    product.reviews.push({ user: req.user._id, name: req.user.name, rating: Number(rating), comment });
    product.calcRating();
    await product.save();
    res.status(201).json({ success: true, message: "Review added" });
  } catch (err) { next(err); }
};

const adminGetProducts = async (req, res, next) => {
  try {
    const products = await Product.find({}).sort({ createdAt: -1 });
    res.json({ success: true, products });
  } catch (err) { next(err); }
};

module.exports = { getProducts, getProduct, createProduct, updateProduct, deleteProduct, addReview, adminGetProducts };