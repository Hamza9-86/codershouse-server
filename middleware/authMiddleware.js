const jwt = require("jsonwebtoken");

exports.authMiddleware = async (req,res,next) => {
    try {
        const accessToken = req.cookies.accessToken;
        //console.log("token" , accessToken);
        
        if(!accessToken){
            return res.status(401).json({
                success:false,
                message:"Token Invalid"
            })
        }
        try {
            const decode = jwt.verify(accessToken, process.env.ACCESS_SECRET);
            //console.log(decode);
            req.user = decode;
          } catch (err) {
            //verification - issue
            return res.status(401).json({
              success: false,
              message: `token is invalid ${err.message}`,
              
            });
          }
          next();
    } catch (error) {
        return res.status(500).json({
            success:false,
            message:`error in middleware ${error.message}`
        })
    }
}