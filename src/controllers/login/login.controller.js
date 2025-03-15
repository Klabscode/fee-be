const db = require("../../../utils/sequelize.db");
const commonService = require("../../services/commonService");
const {  jwt, ERRORS, SUCCESS, Op } = require("../../helpers/index.helper");
const { successRes, errorRes } = require("../../middlewares/response.middleware")
const axios = require('axios');
const bcrypt = require('bcryptjs');
const { Sequelize } = require('sequelize'); 

let file = "login.controller";
let Jkey = process.env.JWT_SECRET_KEY;
 
exports.loginRegister = async (req, res) => {
    try {
        let userType = req.body.userType;
        let userName = req.body.userName;
        let password = req.body.password;
        
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Set status based on userType - Admin and Report get auto-approved
        const status = (userType.toLowerCase() === 'admin' || userType === 'Report') 
          ? 'approved' 
          : 'pending';
        
        inputQuery = { 
            userType: userType, 
            userName: userName, 
            password: hashedPassword,
            status: status 
        };
        
        const login = new db.login(inputQuery);
        await login.save();
        
        // Include status in response
        res.status(201).json({ 
            message: 'Login registered successfully', 
            status: status 
        });
    } catch (error) {
        // Error handling remains the same
        if(error.name == 'SequelizeUniqueConstraintError'){
            res.status(500).json({ error: 'UserName already registered' });
        }
        else
            res.status(500).json({ error: 'Login Registration failed' });
    }
  }
exports.getAllUserTypes = async (req, res) => {
  try {
    // You might want to fetch distinct user types from your database
    const userTypes = await db.login.findAll({
      attributes: [[Sequelize.fn('DISTINCT', Sequelize.col('userType')), 'userType']],
      raw: true
    });
    
    // Extract just the userType values from the result
    const userTypeList = userTypes.map(item => item.userType);
    
    successRes(res, userTypeList, SUCCESS.LISTED);
  } catch (error) {
    const message = error.message ? error.message : ERRORS.LISTED;
    errorRes(res, error, message, file);
  }
};
exports.login = async (req, res) => {
    try {
        let query = {};
        query.where = {
            userType: req.body.userType,
            userName: req.body.userName
        };
        
        let user;
        if (req.body.userType && req.body.userName && req.body.password) {
            user = await commonService.findOne(db.login, query);
        }
        
        if (!user) {
            return res.status(401).json({ error: 'User Not Found' });
        }
        
        const passwordMatch = await bcrypt.compare(req.body.password, user.password);
        
        if (!passwordMatch) {
            return res.status(401).json({ error: 'Password Wrong' });
        }
        
        // Skip status check for Admin and Report users
        if (user.userType !== 'Admin' && user.userType !== 'Report') {
            // For rejected users, allow login but return a special status
            if (user.status === 'rejected') {
                // Update the status to pending to allow them another chance
                await db.login.update(
                    { status: 'pending' },
                    { where: { id: user.id } }
                );
                
                user.status = 'pending'; // Update local object as well
                
                // Notify the user their status has been changed to pending
                return res.status(200).json({
                    message: 'Your account has been resubmitted for approval',
                    status: 'pending'
                });
            }
            
            // Check status for pending users
            if (user.status === 'pending') {
                return res.status(403).json({ error: 'Your account is pending approval' });
            }
            
            // Check current time for non-admin/non-report users
            const now = new Date();
            const currentHour = now.getHours();
            const currentMinute = now.getMinutes();
            
            if ((currentHour > 18) || (currentHour === 18 && currentMinute >= 0)) {
                return res.status(403).json({ error: 'Login is not available after 6:30 PM. Please try again tomorrow.' });
            }
            
            // Update session status and login date for regular users
            await db.login.update(
                { 
                    sessionActive: true,
                    lastLoginDate: new Date()
                },
                { where: { id: user.id } }
            );
        } else {
            // For Admin and Report users, just update lastLoginDate without time restrictions
            await db.login.update(
                { lastLoginDate: new Date() },
                { where: { id: user.id } }
            );
        }
        
        // Proceed with normal login for all authenticated users
        let jwt_input = {
            data: {
                userName: user.userName,
                userType: user.userType
            }
        }
        
        const expire = process.env.EXPIRE;
        const token = await jwt.createToken(jwt_input, expire);
        
        const output = {
            data: user,
            token: token,
        }
        
        res.status(200).json({output});
    } catch (error) {
        res.status(500).json({ error: 'Login failed' });
    }
}
  exports.getPendingUsers = async (req, res) => {
  try {
      console.log('req.user in controller:', req.user);  // See what's available
      
      if (!req.user || req.user.userType !== 'Admin') {
          console.log('Auth check failed:', req.user ? req.user.userType : 'user undefined');
          return res.status(403).json({ error: 'Unauthorized access' });
      }
      // Find all pending users
      const pendingUsers = await db.login.findAll({
          attributes: ['id', 'userName', 'userType', 'createdAt'],
          where: {
              status: 'pending'
          },
          raw: true
      });
      
      successRes(res, pendingUsers, SUCCESS.LISTED);
  } catch (error) {
      const message = error.message ? error.message : ERRORS.LISTED;
      errorRes(res, error, message, file);
  }
};

exports.updateUserStatus = async (req, res) => {
  try {
      // First, check if req.user exists before trying to access userType
      if (!req.user || req.user.userType !== 'Admin') {
          return res.status(403).json({ error: 'Unauthorized access' });
      }
      
      const { userId, status } = req.body;
      
      // Validate status
      if (status !== 'approved' && status !== 'rejected') {
          return res.status(400).json({ error: 'Invalid status' });
      }
      
      // Update user status
      const updated = await db.login.update(
          { status: status },
          { where: { id: userId } }
      );
      
      if (updated[0] === 0) {
          return res.status(404).json({ error: 'User not found' });
      }
      
      successRes(res, { message: `User ${status}` }, SUCCESS.UPDATED);
  } catch (error) {
      const message = error.message ? error.message : ERRORS.UPDATED;
      errorRes(res, error, message, file);
  }
};
exports.getUserNamesByUserType = async (req, res) => {
        try {
          // Extract the selected userType from the query parameters
          const { userType } = req.query;
      
          // Check if userType is provided in the query
          if (!userType) {
            return res.status(400).json({ message: 'userType is required' });
          }
      
          // Fetch the list of userNames based on the selected userType
          const userNames = await db.login.findAll({
            //attributes: ['userName', 'shortName'], // We only need the userName column
            attributes: ['userName', 'id'],
            where: {
              userType: userType // Filter by the selected userType
            },
            raw: true // Return plain objects, not Sequelize model instances
          });
      
          // If no userNames are found, return an empty array
          const userNameList = userNames.map(item => item);
      
          // Return the list of userNames
          
          successRes(res, userNameList, SUCCESS.LISTED);
        } catch (error) {
          console.error('Error:', error);
          const message = error.message ? error.message : ERRORS.LISTED;
          errorRes(res, error, message, file);
        }
      };
      