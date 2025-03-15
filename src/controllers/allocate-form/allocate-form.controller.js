const db = require("../../../utils/sequelize.db");
const commonService = require("../../services/commonService");
const {  jwt, ERRORS, SUCCESS, Op } = require("../../helpers/index.helper");
const { successRes, errorRes } = require("../../middlewares/response.middleware")
const { Login } = require("../../models/login/login.model")
const { Sequelize } = require('sequelize');

const bcrypt = require('bcryptjs');
const { where } = require("sequelize");

let file = "allocateform.controller";
let Jkey = process.env.JWT_SECRET_KEY;

exports.register = async (req, res) => {
    try {
        console.log('try register');
        console.log(req.body);
        let query = req.body;
        const results = await commonService.insertOne(db.allocateform, query);
        console.log(results);
        successRes(res, results, SUCCESS.CREATED);
    } catch (error) {
        console.log('catch', error);
        const message = error.message ? error.message : ERRORS.LISTED;
        errorRes(res, error, message, file);
    }
    }

    exports.editAllocateForm = async (req, res) => {
      try {
              let query = {};
              // let student;
              // let inputQuery;
              query.body = req.body;
              console.log('query.body ', query.body);
              // Step 1: Check if `id` is provided and fetch the student
              if (req.query.feeformId && req.query.allocatedTo) {
                  query.where = { feeformId: req.query.feeformId,
                    allocatedTo: req.query.allocatedTo
                   };
                  console.log('query ', query);
                  const updateResult = await commonService.update(db.allocateform, query);
                  console.log('allocateform update success');
                  successRes(res, updateResult, SUCCESS.UPDATED);
              } else {
                  throw 'Please provide valid inputs';
              }
      } catch (error) {
          // res.status(500).json({ message: error.message });
          console.log('Error updating allocateform:', error);
          const message = error.message ? error.message : ERRORS.GENERIC;
          errorRes(res, null, "Error updating allocateform:", ERRORS.UPDATED);
      }
  }
exports.editAllocateForm = async (req, res) => {
  try {
    const { feeformId, allocatedTo } = req.query;
    
    if (!feeformId || !allocatedTo) {
      throw new Error('Missing required parameters: feeformId and allocatedTo');
    }
    
    const payload = req.body;
    console.log('Received payload:', payload);
    
    // Update allocateform table
    await db.allocateform.update(
      payload,
      { 
        where: { 
          feeformId: feeformId,
          allocatedTo: allocatedTo 
        } 
      }
    );
    
    // If account7 is "Completed", also update the status in the feeform table
    if (payload.account7 === "Completed") {
      // Update the feeform table with status "Completed"
      await db.feeform.update(
        { 
          status: "Completed" // Set feeform status to "Completed"
        },
        { 
          where: { 
            id: feeformId 
          } 
        }
      );
      
      console.log(`FeeForm (id: ${feeformId}) status updated to "Completed"`);
    }
    
    // Fetch updated records to return in response
    const updatedAllocateForm = await db.allocateform.findOne({
      where: { 
        feeformId: feeformId,
        allocatedTo: allocatedTo 
      }
    });
    
    const updatedFeeForm = await db.feeform.findOne({
      where: { 
        id: feeformId 
      }
    });
    
    successRes(res, {
      allocateform: updatedAllocateForm,
      feeform: updatedFeeForm,
      message: "Successfully updated both records"
    }, SUCCESS.UPDATED);
    
  } catch (error) {
    console.error('Error updating records:', error);
    const message = error.message ? error.message : ERRORS.UPDATED;
    errorRes(res, error, message, file);
  }
};
exports.getAllocatedFormByFeeForm = async (req, res) => {
      try {
        let where = {}
    
        if(req.query.feeformId && req.query.allocatedTo){
          where.feeformId = req.query.feeformId;
          where.allocatedTo = req.query.allocatedTo;
        }
        else
          throw 'Pls provide valid inputs';

        // Fetch all posts
        const posts = await db.allocateform.findOne({
          include: [
            {
                model: db.login, // Include the Login model
                as: 'allocatedToSection', // Alias used in the association
                required: false, 
                attributes: ['userName', 'userType', 'id'], // Only select relevant fields
            },
            {
              model: db.feeform, // Include the Login model
              as: 'feeformReference', // Alias used in the association
              required: false, 
              attributes: ['id', 'allocatedTo', 'status', 'formDate'], // Only select relevant fields
          },
          ],
          where: where
        });
        successRes(res, posts, SUCCESS.LISTED);
      } catch (error) {
        console.error('Error fetching posts:', error);
        const message = error.message ? error.message : ERRORS.LISTED;
        errorRes(res, error, message, file);
      }

    };

    exports.getAllocatedFormsByAllocatedTo = async (req, res) => {
      try {
        let where = {}
        if(req.query.status){
          console.log('status coming ', req.query.status);
          where.status = req.query.status;
        }
        const { allocatedTo } = req.query;
    
        if(allocatedTo){
          where.allocatedTo = allocatedTo;
        }
        if (!allocatedTo) {
          return res.status(400).json({ message: 'allocatedTo is required' });
        }
    
        // Fetch posts where allocatedTo matches the given user ID
        const posts = await db.allocateform.findAll({
          include: [
            {
              model: db.login, // Include the Login model
              as: 'allocatedToSection', // Alias used in the association
              required: false, 
              attributes: ['userName', 'userType', 'id'], // Only select relevant fields
            },
            {
            model: db.feeform, // Include the Login model
            as: 'feeformReference', // Alias used in the association
            required: false, 
            attributes: ['id', 'allocatedTo', 'status', 'formDate'], // Only select relevant fields
            },
          ],
          where: where,
        });
        successRes(res, posts, SUCCESS.LISTED);
      } catch (error) {
        console.error('Error fetching allocatedForm by allocatedTo:', error);
        const message = error.message ? error.message : ERRORS.LISTED;
        errorRes(res, error, message, file);
      }
};

exports.updateFile = async (req, res) => {
  try {
          let query = {};
          query.body = req.body;
          if (req.file) {
            query.body.filepath = req.file.path;
            console.log('Uploaded file path:', req.file.path);
          } else {
            throw new Error('Photo upload failed: No Photo uploaded');
          }
          
          console.log('query.body ', query.body);
          // Step 1: Check if `id` is provided and fetch the student
          if (req.query.id ) {
              query.where = { id: req.query.id };
              console.log('query ', query);
              const updateResult = await commonService.update(db.allocateform, query);
              console.log('Student updated with login id and approval status');
              successRes(res, updateResult, SUCCESS.UPDATED);
          } else {
              throw 'Please provide valid inputs';
          }
  } catch (error) {
      console.log('Error updating Student:', error);
      const message = error.message ? error.message : ERRORS.GENERIC;
      errorRes(res, null, "Error updating Student:", ERRORS.UPDATED);
  }
}