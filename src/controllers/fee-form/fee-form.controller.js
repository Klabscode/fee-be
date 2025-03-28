const db = require("../../../utils/sequelize.db");
const commonService = require("../../services/commonService");
const {  jwt, ERRORS, SUCCESS, Op } = require("../../helpers/index.helper");
const { successRes, errorRes } = require("../../middlewares/response.middleware")
const { Login } = require("../../models/login/login.model")
const { Sequelize } = require('sequelize');
//const { Op } = require('sequelize'); // Import Sequelize operators

const bcrypt = require('bcryptjs');
const { where } = require("sequelize");

let file = "feeform.controller";
let Jkey = process.env.JWT_SECRET_KEY;

exports.register = async (req, res) => {
  try {
      console.log('try register');
      console.log(req.body);
      let query = req.body;
      
      // Add date validation
      if (query.formDate) {
          const formDate = new Date(query.formDate);
          if (isNaN(formDate.getTime())) {
              throw new Error('Invalid formDate format');
          }
          // Format the date properly for MySQL
          query.formDate = formDate.toISOString().slice(0, 19).replace('T', ' ');
      }
      
      // Generate feeformSchoolId if not provided
      if (!query.feeformSchoolId) {
          // Get district number
          const districtNumber = query.districtId ? 
              query.districtId.toString().padStart(2, '0') : '00';
          
          // Get school category code
          const categoryCode = query.schoolCategory || 'XX';
          
          // Get current year (last 2 digits)
          const year = new Date().getFullYear().toString().slice(2);
          
          // Get next sequential number
          const latestRecord = await db.feeform.findOne({
              order: [['createdAt', 'DESC']]
          });
          
          let serialNumber = 1;
          if (latestRecord && latestRecord.feeformSchoolId) {
              // Extract the last 4 digits if they exist and increment
              const lastSerialStr = latestRecord.feeformSchoolId.slice(-4);
              if (!isNaN(parseInt(lastSerialStr))) {
                  serialNumber = parseInt(lastSerialStr) + 1;
              }
          }
          
          // Format as 4-digit string with leading zeros
          const serialNumberStr = serialNumber.toString().padStart(3, '0');
          
          // Set the feeformSchoolId
          query.feeformSchoolId = `${districtNumber}${categoryCode}${year}${serialNumberStr}`;
          console.log('Generated feeformSchoolId:', query.feeformSchoolId);
      }
      
      const results = await commonService.insertOne(db.feeform, query);
      console.log(results);
      successRes(res, results, SUCCESS.CREATED);
  } catch (error) {
      console.log('catch', error);
      const message = error.message ? error.message : ERRORS.LISTED;
      errorRes(res, error, message, file);
  }
}

exports.getAllForms = async (req, res) => {
      try {
        const { fromDate, toDate, status, section } = req.query;
        console.log(fromDate, toDate, status);
        const startDate = fromDate ? new Date(fromDate) : null;
        const endDate = toDate ? new Date(toDate) : null;
        console.log(startDate, endDate);
        let where = {}
    
        if(startDate && endDate){
          console.log('date coming ', startDate, endDate);
          where.formDate = {
              [Op.between]: [startDate, endDate]
            }
        }
        if(status){
          console.log('status coming ', status);
          where.status = status;
        }
        // Filter by section if provided
        if (section) {
          console.log('section coming ', section);
        }
        // Fetch all posts
        const posts = await db.feeform.findAll({
          include: [
            {
                model: db.login, // Include the Login model
                as: 'allocatedToSection', // Alias used in the association
                required: false, 
                attributes: ['userName', 'userType', 'id'], // Only select relevant fields
            },
          ],
          order: [['formDate', 'DESC']], // Optionally, order by upload date
          where: where
        });
        successRes(res, posts, SUCCESS.LISTED);
      } catch (error) {
        console.error('Error fetching posts:', error);
        const message = error.message ? error.message : ERRORS.LISTED;
        errorRes(res, error, message, file);
      }

    };

// allocate.controller.js (or wherever your editAllocateForm endpoint is defined)

// allocateform.controller.js


    exports.getAllFormsBySection = async (req, res) => {
      try {
        const { fromDate, toDate, status, section } = req.query;
        console.log(fromDate, toDate, status);
        const startDate = fromDate ? new Date(fromDate) : null;
        const endDate = toDate ? new Date(toDate) : null;
        console.log(startDate, endDate);
        let where = {}
    
        if(startDate && endDate){
          console.log('date coming ', startDate, endDate);
          where.formDate = {
              [Op.between]: [startDate, endDate]
            }
        }
        if(status){
          console.log('status coming ', status);
          where.status = status;
        }
        // Filter by section if provided
        if (section) {
          where.allocatedTo = section;
        }
        else
          throw 'Pls provide section id';
        // Fetch all posts
        const posts = await db.feeform.findAll({
          include: [
            {
                model: db.login, // Include the Login model
                as: 'allocatedToSection', // Alias used in the association
                required: false, 
                attributes: ['userName', 'userType', 'id'], // Only select relevant fields
                //where: section ? { userName: section } : {},
            },
          ],
          order: [['formDate', 'DESC']], // Optionally, order by upload date
          where: where
        });
        successRes(res, posts, SUCCESS.LISTED);
      } catch (error) {
        console.error('Error fetching posts:', error);
        const message = error.message ? error.message : ERRORS.LISTED;
        errorRes(res, error, message, file);
      }

    };

    exports.getPendingForms = async (req, res) => {
      try {
        console.log('try', req)
        const { fromDate, toDate, status, section } = req.query;
        console.log(fromDate, toDate, status);
        const startDate = fromDate ? new Date(fromDate) : null;
        const endDate = toDate ? new Date(toDate) : null;
        console.log(startDate, endDate);
        let where = {}
        where.status = 'Pending';

        if(startDate && endDate){
          console.log('date coming ', startDate, endDate);
          where.formDate = {
              [Op.between]: [startDate, endDate]
            }
        }

        // Fetch all posts
        const posts = await db.feeform.findAll({
          include: [
            {
                model: db.login, // Include the Login model
                as: 'allocatedToSection', // Alias used in the association
                required: false, 
                attributes: ['userName', 'userType', 'id'], // Only select relevant fields
            },
          ],
          order: [['formDate', 'DESC']], // Optionally, order by upload date
          where: where
        });
        successRes(res, posts, SUCCESS.LISTED);
      } catch (error) {
        console.error('Error fetching posts:', error);
        const message = error.message ? error.message : ERRORS.LISTED;
        errorRes(res, error, message, file);
      }

    };

    exports.getFormById = async (req, res) => {
      try {

        let where = {}

        if(req.query.id){
          console.log('id coming ', req.query.id);
          where.id = req.query.id
        }
        else  
          throw 'Pls provide id';

        // Fetch all posts
        const posts = await db.feeform.findOne({
          include: [
            {
                model: db.login, // Include the Login model
                as: 'allocatedToSection', // Alias used in the association
                required: false, 
                attributes: ['userName', 'userType', 'id'], // Only select relevant fields
            },
          ],
          order: [['formDate', 'DESC']], // Optionally, order by upload date
          where: where
        });
        successRes(res, posts, SUCCESS.LISTED);
      } catch (error) {
        console.error('Error fetching posts:', error);
        const message = error.message ? error.message : ERRORS.LISTED;
        errorRes(res, error, message, file);
      }

    };


    exports.allocateFeeForm = async (req, res) => {
      try {
              let query = {};
              // let student;
              // let inputQuery;
              query.body = req.body;
              query.body.status = "Allocated"
              console.log('query.body ', query.body);
              // Step 1: Check if `id` is provided and fetch the student
              if (req.query.id && req.body.allocatedTo) {
                  query.where = { id: req.query.id };
                  console.log('query ', query);
                  const updateResult = await commonService.update(db.feeform, query);
                  console.log('Student updated with login id and approval status');
                  successRes(res, updateResult, SUCCESS.UPDATED);
              } else {
                  throw 'Please provide valid inputs';
              }
      } catch (error) {
          // res.status(500).json({ message: error.message });
          console.log('Error updating Student:', error);
          const message = error.message ? error.message : ERRORS.GENERIC;
          errorRes(res, null, "Error updating Student:", ERRORS.UPDATED);
      }
  }

  exports.getDistricts = async (req, res) => {
    try {
      let where = {}
      const districts = await db.district.findAll();
      successRes(res, districts, SUCCESS.LISTED);
    } catch (error) {
      console.error('Error fetching districts:', error);
      const message = error.message ? error.message : ERRORS.LISTED;
      errorRes(res, error, message, file);
    }

  };
    
  exports.getSchoolType = async (req, res) => {
    try {
      let where = {}
      const school = await db.school.findAll();
      successRes(res, school, SUCCESS.LISTED);
    } catch (error) {
      console.error('Error fetching school:', error);
      const message = error.message ? error.message : ERRORS.LISTED;
      errorRes(res, error, message, file);
    }

  };

  exports.getAllFormsByFilter = async (req, res) => {
    try {
      const { fromDate, toDate, status, section } = req.query;
      console.log(fromDate, toDate, status);
      const startDate = fromDate ? new Date(fromDate) : null;
      const endDate = toDate ? new Date(toDate) : null;
      console.log(startDate, endDate);
      let where = {}
  
      if(startDate && endDate){
        console.log('date coming ', startDate, endDate);
        where.formDate = {
            [Op.between]: [startDate, endDate]
          }
      }
      if(status){
        console.log('status coming ', status);
        where.status = status;
      }
      // Filter by section if provided
      if (section) {
        where.allocatedTo = section;
      }
      // else
      //   throw 'Pls provide section id';
      // Fetch all posts
      const posts = await db.feeform.findAll({
        include: [
          {
              model: db.login, // Include the Login model
              as: 'allocatedToSection', // Alias used in the association
              required: false, 
              attributes: ['userName', 'userType', 'id'], // Only select relevant fields
              //where: section ? { userName: section } : {},
          },
          {
            model: db.allocateform, // Include the AllocateForm model
            as: 'allocateformReference', // Alias for the associated AllocateForm
            required: false, // Ensure it's joined
            attributes: [
              'feeformId', // Include the relevant fields
              'allocatedTo',
              'proposedFeeLkg',
              'previousOrderFeeLkg',
              'proposedFeeUkg',
              'previousOrderFeeUkg',
              'proposedFeeFirst',
              'previousOrderFeeFirst',
              'proposedFeeSecond',
              'previousOrderFeeSecond',
              'proposedFeeThird',
              'previousOrderFeeThird',
              'proposedFeeFour',
              'previousOrderFeeFour',
              'proposedFeeFive',
              'previousOrderFeeFive',
              'proposedFeeSix',
              'previousOrderFeeSix',
              'proposedFeeSeven',
              'previousOrderFeeSeven',
              'proposedFeeEight',
              'previousOrderFeeEight',
              'proposedFeeNine',
              'previousOrderFeeNine',
              'proposedFeeTen',
              'previousOrderFeeTen',
              'proposedFeeEleven',
              'previousOrderFeeEleven',
              'proposedFeeTwelve',
              'previousOrderFeeTwelve',
              'status'
              // Include other fields from AllocateForm as needed
            ],
          },
        ],
        order: [['formDate', 'DESC']], // Optionally, order by upload date
        where: where
      });
      successRes(res, posts, SUCCESS.LISTED);
    } catch (error) {
      console.error('Error fetching posts:', error);
      const message = error.message ? error.message : ERRORS.LISTED;
      errorRes(res, error, message, file);
    }

  };

exports.getAllFormsByStatusFeeform = async (req, res) => {
try {
  const { fromDate, toDate, section, status } = req.query;
  console.log(fromDate, toDate, section);
  let where = {};
  
  // Parsing date range
  const startDate = fromDate ? new Date(fromDate) : null;
  const endDate = toDate ? new Date(toDate) : null;
  console.log(startDate, endDate);

  // Construct where clause
  if(status){
    where = { 
      status: status  // Filter FeeForm by status 'Allocated'
    };
  }
  else
    throw 'Pls provide status';

  // Add additional filters if date range is provided
  if (startDate && endDate) {
    console.log('date coming ', startDate, endDate);
    where.formDate = {
      [Op.between]: [startDate, endDate]
    };
  }

  // Filter by section if provided
  if (section) {
    where.allocatedTo = section;
  }

  // Fetch FeeForm records with associated AllocateForm, filtered by both status
  const posts = await db.feeform.findAll({
    include: [
      {
        model: db.login, // Include the Login model for 'allocatedToSection'
        as: 'allocatedToSection', // Alias used in the association
        required: false,
        attributes: ['userName', 'userType', 'id'], // Only select relevant fields
      },
      {
        model: db.allocateform, // Include the AllocateForm model
        as: 'allocateformReference', // Alias for the associated AllocateForm
        required: false, // Ensure it's joined, but can be null
        // where: {
        //   status: 'Approved', // Filter AllocateForm by status 'Approved'
        // },
        attributes: [
          'feeformId', // Include the relevant fields
              'allocatedTo',
              'proposedFeeLkg',
              'previousOrderFeeLkg',
              'proposedFeeUkg',
              'previousOrderFeeUkg',
              'proposedFeeFirst',
              'previousOrderFeeFirst',
              'proposedFeeSecond',
              'previousOrderFeeSecond',
              'proposedFeeThird',
              'previousOrderFeeThird',
              'proposedFeeFour',
              'previousOrderFeeFour',
              'proposedFeeFive',
              'previousOrderFeeFive',
              'proposedFeeSix',
              'previousOrderFeeSix',
              'proposedFeeSeven',
              'previousOrderFeeSeven',
              'proposedFeeEight',
              'previousOrderFeeEight',
              'proposedFeeNine',
              'previousOrderFeeNine',
              'proposedFeeTen',
              'previousOrderFeeTen',
              'proposedFeeEleven',
              'previousOrderFeeEleven',
              'proposedFeeTwelve',
              'previousOrderFeeTwelve',
              'status'
          // Include any other relevant fields from AllocateForm
        ],
      },
    ],
    order: [['formDate', 'DESC']], // Optionally, order by upload date
    where: where
  });

  // Send success response with the fetched records
  successRes(res, posts, SUCCESS.LISTED); 
} catch (error) {
  console.error('Error fetching posts:', error);
  const message = error.message || ERRORS.LISTED;
  errorRes(res, error, message, file); // Send error response
}
};

exports.getAllFormsByStatusAllocateForm = async (req, res) => {
  try {
    const { fromDate, toDate, section, status } = req.query;
    console.log(fromDate, toDate, section);
    let where = {};
    
    // Parsing date range
    const startDate = fromDate ? new Date(fromDate) : null;
    const endDate = toDate ? new Date(toDate) : null;
    console.log(startDate, endDate);
    if(!status)
      throw 'Pls provide status';
  
    // Add additional filters if date range is provided
    if (startDate && endDate) {
      console.log('date coming ', startDate, endDate);
      where.formDate = {
        [Op.between]: [startDate, endDate]
      };
    }
  
    // Filter by section if provided
    if (section) {
      where.allocatedTo = section;
    } 
  
    // Fetch FeeForm records with associated AllocateForm, filtered by both status
    const posts = await db.feeform.findAll({
      include: [
        {
          model: db.login, // Include the Login model for 'allocatedToSection'
          as: 'allocatedToSection', // Alias used in the association
          required: false,
          attributes: ['userName', 'userType', 'id'], // Only select relevant fields
        },
        {
          model: db.allocateform, // Include the AllocateForm model
          as: 'allocateformReference', // Alias for the associated AllocateForm
          required: false, // Ensure it's joined, but can be null
          where: {
            status: 'Completed', // Filter AllocateForm by status 'Approved'
          },
          attributes: [
            'feeformId', // Include the relevant fields
              'allocatedTo',
              'proposedFeeLkg',
              'previousOrderFeeLkg',
              'proposedFeeUkg',
              'previousOrderFeeUkg',
              'proposedFeeFirst',
              'previousOrderFeeFirst',
              'proposedFeeSecond',
              'previousOrderFeeSecond',
              'proposedFeeThird',
              'previousOrderFeeThird',
              'proposedFeeFour',
              'previousOrderFeeFour',
              'proposedFeeFive',
              'previousOrderFeeFive',
              'proposedFeeSix',
              'previousOrderFeeSix',
              'proposedFeeSeven',
              'previousOrderFeeSeven',
              'proposedFeeEight',
              'previousOrderFeeEight',
              'proposedFeeNine',
              'previousOrderFeeNine',
              'proposedFeeTen',
              'previousOrderFeeTen',
              'proposedFeeEleven',
              'previousOrderFeeEleven',
              'proposedFeeTwelve',
              'previousOrderFeeTwelve',
              'status'
            // Include any other relevant fields from AllocateForm
          ],
        },
      ],
      order: [['formDate', 'DESC']], // Optionally, order by upload date
      where: where
    });
  
    // Send success response with the fetched records
    successRes(res, posts, SUCCESS.LISTED); 
  } catch (error) {
    console.error('Error fetching posts:', error);
    const message = error.message || ERRORS.LISTED;
    errorRes(res, error, message, file); // Send error response
  }
  };

  exports.getFeeFormByFeeformId = async (req, res) => {
    try {

      let where = {}

      if(req.query.feeformId){
        console.log('id coming ', req.query.feeformId);
        where.id = req.query.feeformId
      }
      else  
        throw 'Pls provide feeformId';

      // Fetch all posts
      const posts = await db.feeform.findOne({
        where: where
      });

      // Check if the post exists
      if (!posts) {
        throw new Error('No records found for the given feeformId');
      }
      successRes(res, posts, SUCCESS.LISTED);
    } catch (error) {
      console.error('Error fetching posts:', error);
      const message = error.message ? error.message : ERRORS.LISTED;
      errorRes(res, error, message, file);
    }

  };

  
  exports.allFormsCountAdmin = async (req, res) => {
    try {

      // Fetch all posts
      const posts = await db.feeform.findAll({});
      successRes(res, posts.length, SUCCESS.LISTED);
    } catch (error) {
      console.error('Error fetching posts:', error);
      const message = error.message ? error.message : ERRORS.LISTED;
      errorRes(res, error, message, file);
    }

  };

  exports.allFormsCountSection = async (req, res) => {
    try {
      const { section } = req.query;
      let where = {}
      // Filter by section if provided
      if (section) {
        where.allocatedTo = section;
      }
      else
        throw 'Pls provide section id';
      // Fetch all posts
      const posts = await db.feeform.findAll({
        where: where
      });
      successRes(res, posts.length, SUCCESS.LISTED);
    } catch (error) {
      console.error('Error fetching posts:', error);
      const message = error.message ? error.message : ERRORS.LISTED;
      errorRes(res, error, message, file);
    }

  };

  
  exports.recentFormsAdmin = async (req, res) => {
    try {

      // Fetch all posts
      const posts = await db.feeform.findAll({
        limit: 5, // Limit to 5 records
        order: [['formDate', 'DESC']] // Order by the createdAt field in descending order (most recent first)
      });
      successRes(res, posts, SUCCESS.LISTED);
    } catch (error) {
      console.error('Error fetching posts:', error);
      const message = error.message ? error.message : ERRORS.LISTED;
      errorRes(res, error, message, file);
    }

  };

  exports.recentFormsSection = async (req, res) => {
    try {
      const { section } = req.query;
      let where = {}
      // Filter by section if provided
      if (section) {
        where.allocatedTo = section;
      }
      else
        throw 'Pls provide section id';
      // Fetch all posts
      const posts = await db.feeform.findAll({
        where: where,
        limit: 5, // Limit to 5 records
        order: [['formDate', 'DESC']] // Order by the createdAt field in descending order (most recent first)
      });
      successRes(res, posts, SUCCESS.LISTED);
    } catch (error) {
      console.error('Error fetching posts:', error);
      const message = error.message ? error.message : ERRORS.LISTED;
      errorRes(res, error, message, file);
    }

  };