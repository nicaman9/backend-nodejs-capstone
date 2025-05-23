const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const router = express.Router();
const connectToDatabase = require('../models/db');
const logger = require('../logger');

// Define the upload directory path
const directoryPath = 'public/images';

// Set up storage for uploaded files
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, directoryPath); // Specify the upload directory
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname); // Use the original file name
  },
});

const upload = multer({ storage: storage });

// Get all secondChanceItems
router.get('/', async (req, res, next) => {
  logger.info('/ called');
  try {
    const db = await connectToDatabase();
    const collection = db.collection('secondChanceItems');
    const secondChanceItems = await collection.find({}).toArray();
    res.json(secondChanceItems);
  } catch (e) {
    logger.error('Oops, something went wrong', e);
    next(e);
  }
});

// Add a new item
router.post('/', upload.single('image'), async (req, res, next) => {
  try {
    const db = await connectToDatabase();
    const collection = db.collection('secondChanceItems');
    const newItem = {
      name: req.body.name,
      description: req.body.description,
      price: parseFloat(req.body.price),
      imageUrl: req.file ? `/images/${req.file.filename}` : null,
    };
    const result = await collection.insertOne(newItem);
    res.status(201).json(result.ops[0]);
  } catch (e) {
    logger.error('Error adding new item', e);
    next(e);
  }
});

// Get a single secondChanceItem by ID
router.get('/:id', async (req, res, next) => {
  try {
    const db = await connectToDatabase();
    const collection = db.collection('secondChanceItems');
    const item = await collection.findOne({ _id: new ObjectId(req.params.id) });
    if (!item) {
      return res.status(404).json({ message: 'secondChanceItem not found' });
    }
    res.json(item);
  } catch (e) {
    logger.error('Error fetching item by ID', e);
    next(e);
  }
});

// Update an existing item
router.put('/:id', upload.single('image'), async (req, res, next) => {
  try {
    const db = await connectToDatabase();
    const collection = db.collection('secondChanceItems');
    const updatedItem = {
      name: req.body.name,
      description: req.body.description,
      price: parseFloat(req.body.price),
      imageUrl: req.file ? `/images/${req.file.filename}` : null,
    };
    const result = await collection.updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: updatedItem }
    );
    if (result.matchedCount === 0) {
      return res.status(404).json({ message: 'Item not found' });
    }
    res.json({ message: 'Item updated successfully' });
  } catch (e) {
    logger.error('Error updating item', e);
    next(e);
  }
});

// Delete an existing item
router.delete('/:id', async (req, res, next) => {
  try {
    const db = await connectToDatabase();
    const collection = db.collection('secondChanceItems');
    const result = await collection.deleteOne({ _id: new ObjectId(req.params.id) });
    if (result.deletedCount === 0) {
      return res.status(404).json({ message: 'Item not found' });
    }
    res.json({ message: 'Item deleted successfully' });
  } catch (e) {
    logger.error('Error deleting item', e);
    next(e);
  }
});

module.exports = router;
