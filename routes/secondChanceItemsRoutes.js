const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const router = express.Router();
const connectToDatabase = require('../models/db');
const logger = require('../logger');
const { ObjectId } = require('mongodb');

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
        imageUrl: req.file ? `/images/${req.file.filename}` : null, // path to the uploaded image
      };
  
      const lastItemQuery = await collection.find().sort({ 'id': -1 }).limit(1);
      await lastItemQuery.forEach(item => {
        newItem.id = (parseInt(item.id) + 1).toString();
      });
  
      const date_added = Math.floor(new Date().getTime() / 1000);
      newItem.date_added = date_added;
  
      const result = await collection.insertOne(newItem);
      res.status(201).json(result.ops[0]); // Return the newly added item
    } catch (e) {
      logger.error('Error adding new item', e);
      next(e); // Call the error handler middleware
    }
  });

// Get a single secondChanceItem by ID
router.get('/:id', async (req, res, next) => {
    try {
      // Step 1: Connect to the database
      const db = await connectToDatabase();
      
      // Step 2: Access the 'secondChanceItems' collection
      const collection = db.collection('secondChanceItems');
      
      // Step 3: Find the item by ID
      const secondChanceItem = await collection.findOne({ id: req.params.id });
      
      // Step 4: Check if the item was found, if not, return 404
      if (!secondChanceItem) {
        return res.status(404).json({ message: 'secondChanceItem not found' });
      }
  
      // Return the item as a JSON response
      res.json(secondChanceItem);
    } catch (e) {
      // Log the error and pass it to the next middleware
      logger.error('Error fetching item by ID', e);
      next(e);
    }
  });

// Update an existing item by ID
router.put('/:id', async (req, res, next) => {
    try {
      // Step 1: Connect to the database
      const db = await connectToDatabase();
      
      // Step 2: Access the 'secondChanceItems' collection
      const collection = db.collection('secondChanceItems');
  
      // Step 3: Check if the item exists
      const secondChanceItem = await collection.findOne({ id: req.params.id });
      if (!secondChanceItem) {
        logger.error('secondChanceItem not found');
        return res.status(404).json({ error: 'secondChanceItem not found' });
      }
  
      // Step 4: Update the item attributes
      secondChanceItem.category = req.body.category;
      secondChanceItem.condition = req.body.condition;
      secondChanceItem.age_days = req.body.age_days;
      secondChanceItem.description = req.body.description;
      secondChanceItem.age_years = Number((secondChanceItem.age_days / 365).toFixed(1)); // Calculate age in years
      secondChanceItem.updatedAt = new Date(); // Set the update timestamp
  
      // Step 5: Update the item in the database
      const updateResult = await collection.findOneAndUpdate(
        { id: req.params.id },
        { $set: secondChanceItem },
        { returnDocument: 'after' }
      );
  
      // Step 6: Send a confirmation response
      if (updateResult.value) {
        res.json({ uploaded: 'success' });
      } else {
        res.json({ uploaded: 'failed' });
      }
  
    } catch (e) {
      // Log the error and pass it to the next middleware
      logger.error('Error updating item', e);
      next(e);
    }
  });

// Delete an existing item by ID
router.delete('/:id', async (req, res, next) => {
    try {
      // Step 1: Connect to the database
      const db = await connectToDatabase();
  
      // Step 2: Access the 'secondChanceItems' collection
      const collection = db.collection('secondChanceItems');
  
      // Step 3: Check if the item exists by ID
      const secondChanceItem = await collection.findOne({ id: req.params.id });
      if (!secondChanceItem) {
        logger.error('secondChanceItem not found');
        return res.status(404).json({ error: 'secondChanceItem not found' });
      }
  
      // Step 4: Delete the item
      await collection.deleteOne({ id: req.params.id });
  
      // Step 5: Send a confirmation response
      res.json({ deleted: 'success' });
  
    } catch (e) {
      // Log the error and pass it to the next middleware
      logger.error('Error deleting item', e);
      next(e);
    }
  });

module.exports = router;
