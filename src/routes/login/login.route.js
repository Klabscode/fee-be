module.exports = (app) => {
    const value = require("../../controllers/login/login.controller");
    console.log("Controller functions:", Object.keys(value));
    const { joi, cache } = require("../../helpers/index.helper");
    const {  jwt, ERRORS, SUCCESS, Op } = require("../../helpers/index.helper");
    app.use(function(req, res, next) {
    res.header(
      "Access-Control-Allow-Headers",
      "x-access-token, Origin, Content-Type, Accept"
    );
    next();
  });
  app.get(
    "/getPendingUsers",
    [jwt.verifyToken],
    value.getPendingUsers  // Make sure this function exists in your controller
)

app.post(
    "/updateUserStatus",
    [jwt.verifyToken],
    value.updateUserStatus  // Make sure this function exists in your controller
)
  app.post(
    "/register",
    // [jwt.verifyToken],
    value.loginRegister
  );

  app.route("/login")
    .post(value.login)

    app.get(
      "/getLoginUserTypes",
      value.getAllUserTypes
    )

    app.get(
      "/getUserNamesByUserType",
      value.getUserNamesByUserType
    )
    
}