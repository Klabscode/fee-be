const jwt = require("jsonwebtoken");
const { ERRORS } = require("../helpers/httpMessages.helper");
let { commonErrorRes } = require("../middlewares/response.middleware");
var unless = require('express-unless');
const db = require("../../utils/sequelize.db"); // Make sure this path is correct for your project

let Jkey = process.env.JWT_SECRET_KEY;

const verifyToken = async (req, res, next) => {
    try {
        let bearerToken = req.headers['authorization'];
        console.log('bearerToken:', bearerToken);
        
        if (!bearerToken) throw ERRORS.INVALID_TOKEN;
        
        await jwt.verify(bearerToken, Jkey, async (err, user) => {
            if (err) {
                console.log('JWT verification error:', err);
                return commonErrorRes(res, { statusCode: 401, message: ERRORS.INVALID_TOKEN });
            }
            
            console.log('Decoded JWT:', user);
            req['user'] = user.data;
            console.log('req.user set to:', req['user']);
            
            // Skip checks for Admin and Report users
            if (req.user && req.user.userType !== 'Admin' && req.user.userType !== 'Report') {
                try {
                    // Find the user in the database
                    const userData = await db.login.findOne({
                        where: {
                            userName: req.user.userName,
                            userType: req.user.userType
                        }
                    });
                    
                    if (!userData) {
                        return commonErrorRes(res, { statusCode: 401, message: "User not found" });
                    }
                    
                    // Check if session is active
                    if (!userData.sessionActive) {
                        return commonErrorRes(res, { 
                            statusCode: 401, 
                            message: "Your session has expired. Please login again." 
                        });
                    }
                    
                    // Check if it's a new day
                    const lastLogin = userData.lastLoginDate ? new Date(userData.lastLoginDate) : null;
                    const today = new Date();
                    
                    if (lastLogin && (
                        lastLogin.getDate() !== today.getDate() || 
                        lastLogin.getMonth() !== today.getMonth() ||
                        lastLogin.getFullYear() !== today.getFullYear()
                    )) {
                        // It's a new day - reset session
                        await db.login.update(
                            { sessionActive: false },
                            { where: { id: userData.id } }
                        );
                        
                        return commonErrorRes(res, { 
                            statusCode: 401, 
                            message: "Your session has expired. Please login again for today." 
                        });
                    }
                    
                    // Check if it's after the cutoff time (6:30 PM)
                    const currentHour = today.getHours();
                    const currentMinute = today.getMinutes();
                    
                    if ((currentHour > 18) || (currentHour === 18 && currentMinute >= 0)) {
                        // After 6:30 PM - disable session
                        await db.login.update(
                            { sessionActive: false },
                            { where: { id: userData.id } }
                        );
                        
                        return commonErrorRes(res, { 
                            statusCode: 401, 
                            message: "Your session has expired for today. Please login tomorrow." 
                        });
                    }
                } catch (dbError) {
                    console.error('Database error in session check:', dbError);
                    // Continue execution even if session check fails
                    // This is to prevent users from being locked out due to DB errors
                }
            }
            
            next();
        });
    } catch (error) {
        console.log('JWT middleware error:', error);
        return commonErrorRes(res, { statusCode: 401, message: ERRORS.INVALID_TOKEN });
    }
}

const createToken = async (data, expire) => {
    try {
        console.log('create success');
        return (expire) ? jwt.sign(data, Jkey.toString(), { expiresIn: expire.toString() }) : jwt.sign(data, Jkey.toString())
    } catch (error) {
        console.log('create failed', error);
        throw { message: ERRORS.INVALID_TOKEN };
    }
}

verifyToken.unless = unless;

module.exports = { verifyToken, createToken }